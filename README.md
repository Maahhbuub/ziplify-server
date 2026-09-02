# Ziplify — Full-Stack URL Shortener

## Overview

Ziplify is a production-deployed URL shortener built to explore real-world system design concerns: efficient ID generation, cache-aside architecture, distributed rate limiting, and cross-service deployment. The project is split into two independently deployed services — a React frontend on Vercel and a Node.js/Express backend on Render — connected via edge rewrites so short links resolve seamlessly under a single custom domain.

---

## Architecture

**Frontend — Vercel**
- React + Vite, CSS Modules, `lucide-react`, `react-hot-toast`
- `vercel.json` rewrites:
  - short-code-shaped paths → proxied to Render backend
  - everything else → SPA fallback to `index.html`

**Backend — Render**
- Express + javascript (run via `tsx`)
- `POST /` — shorten a URL
- `GET /:shortCode` — look up and 302 redirect

**Data layer**
- **PostgreSQL (Neon)** via Prisma ORM — `urls` table, `BIGSERIAL` auto-increment id
- **Redis (Redis Cloud)** via `ioredis` — short URL cache + rate limit counters

**Request flow**
1. User visits `https://ziplify.vercel.app/ab21`
2. Vercel's rewrite matches the short-code pattern and proxies the request to the Render backend
3. Render checks Redis first (cache-aside); on a miss, queries Postgres via Prisma and populates Redis
4. Render responds with a `302` redirect to the long URL
5. On invalid codes, Render redirects to `/not-found` — a path deliberately excluded from the short-code rewrite pattern, so it falls through to the SPA fallback and renders React's actual 404 page instead of looping back through the proxy

**Why two separate repos and deployments, not a monorepo:**
- Independent deploy pipelines — a frontend styling change doesn't trigger a backend redeploy, and vice versa
- Different release cadences — UI iterates faster than core API logic
- Cleaner scaling path — the backend could serve multiple frontends (web, extension, CLI) without restructuring
- Trade-off: no shared type contracts between frontend/backend, which caused a real bug during development (see Issues Resolved)

---

## Tech Stack

**Frontend**
- React + Vite
- CSS Modules (no Tailwind — deliberate choice for scoped, framework-free styling)
- `lucide-react` for icons
- `react-hot-toast` for notifications
- `react-router-dom` for client-side routing
- Axios for API calls

**Backend**
- Node.js + Express
- TypeScript (mixed with JS, run via `tsx` at runtime rather than a compiled build step)
- Prisma ORM
- `ioredis` for Redis client
- `express-rate-limit` + `rate-limit-redis` for distributed rate limiting
- `zod` for validation
- `cors`, `cookie-parser`, `jsonwebtoken`, `bcrypt` (auth-ready, if extended)

**Data layer**
- **PostgreSQL** — hosted on Neon
- **Redis** — hosted on Redis Cloud

**Deployment**
- **Frontend:** Vercel
- **Backend:** Render

---

## Core Design Decisions

### 1. Short code generation: Base62 encoding of a Postgres auto-increment ID

The project went through several iterations before settling on this approach:

| Approach considered | Why it was rejected / accepted |
|---|---|
| Hash the URL (MD5/SHA256), truncate | Requires collision handling (check + retry), adds complexity for no real benefit at this scale |
| Random string generation (nanoid) + collision check | Simple, but requires a DB read before every write to confirm uniqueness |
| MongoDB with manual counter collection | Works, but the counter is a single point of write contention requiring manual atomic `$inc` handling |
| **Postgres `BIGSERIAL` + Base62 encoding (chosen)** | Postgres sequences are atomic and gap-tolerant by default — no manual counter needed, no collision risk, one clean encode step |

The project initially started with MongoDB, then pivoted to PostgreSQL specifically because `BIGSERIAL` eliminates the need for a hand-rolled, atomically-incremented counter document — a good example of recognizing that the database choice should follow the access pattern, not the other way around.

```js
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length; // 62

function encode(num) {
    if (num === 0) return ALPHABET[0];
    let result = '';
    while (num > 0) {
        result = ALPHABET[num % BASE] + result;
        num = Math.floor(num / BASE);
    }
    return result;
}
```

**Known trade-off:** sequential IDs are technically enumerable/predictable. Acceptable for this project's scope; a production system handling sensitive links might XOR or bit-shuffle the sequence before encoding.

**Scaling trade-off (interview talking point):** a single auto-increment counter is a write bottleneck at extreme scale. The standard fix is batch ID allocation (app servers reserve ranges of IDs at once) or sharded counters — the same class of problem Twitter's Snowflake ID system solves.

### 2. Cache-aside pattern for the redirect hot path

Reads (redirects) vastly outnumber writes (shortens) in any URL shortener, so the redirect path is the one worth optimizing:

```js
const { shortCode } = req.params;

const cachedUrl = await redis.get(shortCode);
if (cachedUrl) {
    incrementClickAsync(shortCode);
    return res.redirect(302, cachedUrl);
}

const url = await findUrl({ shortCode });
if (!url) {
    return res.redirect(302, `${process.env.CLIENT_URL}/not-found`);
}

await redis.set(shortCode, url.longUrl, { EX: 3600 });
incrementClickAsync(shortCode);
return res.redirect(302, url.longUrl);
```

- Cache-miss path populates Redis for next time
- Click count increments are fire-and-forget (don't block the redirect on a write)
- Cache invalidation follows the standard "delete on write" rule — any update/delete to a URL clears its Redis key rather than trying to update it in place

### 3. Distributed rate limiting

Two independent limiters, both backed by Redis (not in-memory) so limits hold correctly across multiple server instances rather than resetting per-instance:

```js
const shortenLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:shorten:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 20,
});

const redirectLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:redirect:',
    }),
    windowMs: 1 * 60 * 1000,
    max: 100,
    ipv6Subnet: 56,
});
```

- Separate prefixes per route for clean debugging (`redis-cli KEYS rl:shorten:*`)
- Different limits reflect different usage patterns — shortening is a deliberate low-frequency action, redirects are frequent and bursty
- Algorithm: **fixed window counter** — simple and cheap, with a known trade-off (boundary bursts: a client can send up to 2x the limit across a window boundary). Sliding window or token bucket would smooth this out at added complexity; fixed window is an acceptable choice at this scale.

### 4. Single-domain UX via Vercel rewrites

The frontend (Vercel) and backend (Render) are fully separate deployments, but short links needed to appear on one domain rather than exposing the Render URL to end users.

```json
{
  "rewrites": [
    { "source": "/([a-zA-Z0-9]{1,7})", "destination": "https://shortener-server.onrender.com/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- First rule: any path matching the short-code shape gets transparently proxied to the Render backend, which performs the actual 302 redirect
- Second rule: SPA fallback — anything else (app routes, invalid short codes redirected to `/not-found`) falls through to `index.html` so React Router can take over client-side
- Order matters — Vercel evaluates rewrites top-to-bottom, first match wins

**Known constraint:** the short-code regex would also match any future short-named frontend route (e.g. `/about`). Not an issue at current scope (only `/` exists), but would need explicit exclusion rules if more pages are added later.

---

## Performance

Measured using `autocannon`, comparing cache-miss (first hit, cold from Postgres) vs. cache-hit (second hit, served from Redis) on freshly created, never-before-cached short codes — averaged across three independent trials to control for noise:

| Trial | Cache Miss | Cache Hit |
|---|---|---|
| 1 | 685 ms | 377 ms |
| 2 | 680 ms | 373 ms |
| 3 | 682 ms | 378 ms |
| **Average** | **682.3 ms** | **376 ms** |

**Result: ~45% latency reduction** (682.3ms → 376ms) from Redis caching.

**Methodology notes:**
- Tests were run against the backend running locally but pointed at the real production databases (Neon + Redis Cloud), to isolate database/cache latency from Render's free-tier hosting overhead (single-worker concurrency limits, cold starts)
- Each trial used a brand-new short code with no prior cache entry, guaranteeing a genuine cache miss on first hit
- Low variance across trials (within 5ms) supports that this is a real, repeatable effect rather than noise

**Honest caveat, worth stating in interviews:** even the cache-hit path (376ms) is dominated by network round-trip to a remote Redis Cloud instance, not Redis's own processing time (which is sub-millisecond). Colocating the app server and Redis instance in the same region would reduce this further — a natural "how would you optimize this more" answer.

---

## Deployment

| Layer | Provider | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to `main`; env vars baked in at build time |
| Backend | Render | Free tier — single worker (`WEB_CONCURRENCY=1`), cold starts after ~15 min idle |
| Database | Neon (PostgreSQL) | Connection pooled via `-pooler` endpoint, `sslmode=verify-full` |
| Cache | Redis Cloud | Free tier, 30MB |

**Environment variable strategy:** all cross-service URLs (`CLIENT_URL`, `DATABASE_URL`, `REDIS_URL`, `VITE_API_URL`, `VITE_API_BASE_URL`) are environment-specific — same variable name, different value per environment (local Docker/`.env` vs. Render/Vercel dashboards) — so no code changes are needed when moving between dev and production.


## Possible Future Improvements

- Custom short domain instead of relying on the Vercel/Render split
- Click analytics dashboard (referrer, timestamp, geo — `clickCount` already tracked)
- Custom aliases and link expiration UI
- Auth (JWT dependencies already present, not yet wired up)
- Sliding-window or token-bucket rate limiting to smooth boundary bursts
- Shared type contract (OpenAPI spec or shared package) between frontend and backend to prevent the field-mismatch class of bug
- Batch ID allocation if traffic ever approached a scale where the single Postgres sequence became a write bottleneck