# Ziplify — Full-Stack URL Shortener

**Live:** https://ziplify.vercel.app

---

## Overview

Ziplify is a production-deployed URL shortener built to explore real-world system design concerns: efficient ID generation, cache-aside architecture, distributed rate limiting, authentication and session management, and cross-service deployment. What began as a simple shorten/redirect service grew into a full product — accounts, email verification, password reset, custom aliases, link expiration, and a dashboard for managing owned links — while keeping the original public shortening flow fully backward-compatible for anonymous users throughout.

The project is split into two independently deployed services — a React frontend on Vercel and a Node.js/Express backend on Railway — connected via edge rewrites so short links resolve seamlessly under a single custom domain.

The dashboard now spans several pages (link management, profile, analytics), all nested under `/my-dashboard/*`.

---

## Architecture

**Frontend — Vercel**
- React + Vite, CSS Modules (no Tailwind — deliberate choice for scoped, framework-free styling), `lucide-react`, `react-hot-toast`, `react-router-dom`
- Route layout split into three layouts — `MainLayout` (public shortener pages), `AuthLayout` (login/signup/forgot-password/verify-email/reset-password), `DashboardLayout` (`/my-dashboard`, `/my-dashboard/my-links`, `/my-dashboard/profile`, `/my-dashboard/analytics`) — each wrapping its child routes via `<Outlet />`
- `GuestRoute` / `PrivateRoute` wrappers gate auth-only and guest-only pages
- `vercel.json` rewrites:
  - short-code-shaped paths → proxied to the Railway backend
  - every dashboard route lives under the `/my-dashboard/*` prefix (renamed from a bare `/dashboard`), and `/not-found`/`/link-expired` already contain a hyphen — so none of the current app routes can match the short-code pattern, no exclusion list required
  - everything else → SPA fallback to `index.html`

**Backend — Railway** (migrated from Render)
- Express + JavaScript (ESM, `"type": "module"`), run via `tsx` at runtime
- Layered structure: routes → controllers → services, with services kept `req`/`res`-agnostic so they stay unit-testable in isolation
- Key endpoints:
  - `POST /` — shorten a URL (public, optionally attaches the logged-in user)
  - `GET /:shortCode` — look up and 302 redirect, or redirect to `/not-found` / `/link-expired`
  - `POST /auth/register`, `/login`, `/logout`, `/refresh-token`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`
  - `GET /dashboard/urls`, `PATCH /dashboard/urls/:id`, `DELETE /dashboard/urls/:id` — protected, ownership-checked (API path is unrelated to the frontend's `/my-dashboard` route naming — no collision risk between the two)

**Data layer**
- **PostgreSQL (Neon)** via Prisma ORM — `User`, `Session`, `Url` models
- **Redis (Redis Cloud)** via `ioredis` — short URL cache, rate-limit counters

**Email — Resend**
- Transactional email for account verification and password reset links

**Request flow (shorten + redirect)**
1. User visits `ziplify.vercel.app/ab21`
2. Vercel's rewrite matches the short-code pattern (excluding known app routes) and proxies to the Railway backend
3. Backend checks Redis first (cache-aside); on a miss, queries Postgres via Prisma and populates Redis
4. Backend checks `expiresAt`; if expired, redirects to `/link-expired` instead of the destination
5. Otherwise responds with a `302` redirect to the long URL

---

## Data Model

```
User
├── id, name, email (unique), password (bcrypt hash)
├── emailVerified, verificationToken (unique), verificationTokenExpiresAt
├── resetPasswordToken (unique), resetPasswordExpiresAt
├── urls        → Url[]   (one-to-many, links this user owns)
└── sessions    → Session[]  (one-to-many, one row per logged-in device)

Session
├── id, refreshToken (unique)
├── userId → User
├── userAgent, createdAt, expiresAt
└── index on userId

Url
├── id, shortCode (unique), longUrl, expiresAt (nullable), clickCount
├── userId (nullable) → User
├── index on longUrl (dedupe lookups)
└── index on userId (dashboard "my links" queries)
```

---

## Core Design Decisions

### 1. Short code generation: Base62 encoding of a Postgres auto-increment ID

Iterated through several approaches before settling here:

| Approach considered | Why it was rejected / accepted |
|---|---|
| Hash the URL, truncate | Needs collision handling for no real benefit at this scale |
| Random string + collision check | Requires a DB read before every write |
| MongoDB with manual counter collection | Works, but the counter is a single point of write contention requiring hand-rolled atomic `$inc` |
| **Postgres `BIGSERIAL` + Base62 (chosen)** | Sequences are atomic and effectively gap-tolerant by default — no manual counter, no collision risk on the auto-generated path |

**Known trade-off:** sequential IDs are technically enumerable. Acceptable at this project's scope.

**Scaling trade-off:** a single auto-increment counter is a write bottleneck at extreme scale — the standard fix is batch ID allocation or sharded counters (the same class of problem Twitter's Snowflake solves).

### 2. Custom aliases, and the collision bug they exposed

Logged-in users can request a specific alias (`ziplify.vercel.app/my-brand`) instead of an auto-generated code. This surfaced a real bug worth keeping as a case study: a custom alias like `"123"` can collide with a *future* auto-generated Base62 code, since both draw from the same character set and namespace.

The original implementation didn't handle this — a collision left an **orphaned row with an empty `shortCode`** in Postgres and **permanently burned an auto-increment ID**, since the `update` step failed after the `create` step had already succeeded. The fix: catch the unique-constraint violation (Prisma error `P2002`), delete the orphaned row, and retry with a fresh ID:

```js
try {
    const updated = await prisma.url.update({ where: { id: created.id }, data: { shortCode } });
    // ...
} catch (err) {
    if (err.code === 'P2002') {
        await prisma.url.delete({ where: { id: created.id } });
        attempts++;
        continue; // retry with the next auto-increment id
    }
    throw err;
}
```

Aliases are restricted to alphanumeric characters, 3–20 length, and checked against a reserved-word list (`dashboard`, `login`, `auth`, etc.) so a claimed alias can never shadow a real application route.

### 3. Per-user link deduplication, scoped correctly

If a logged-in user shortens a URL they've already shortened, they get their existing short code back rather than a duplicate row — but only when they *didn't* request a specific custom alias. Requesting an alias always creates a new link, since an explicit alias signals distinct intent (e.g., two campaigns pointing at the same destination). Anonymous users are never deduplicated, since there's no stable identity to scope the check to. Expired links are excluded from the match, so re-shortening a URL whose previous link has lapsed correctly creates a fresh one.

If the new shorten request includes an expiration and matches an existing link, that link's expiration is updated to the new value — but only when explicitly provided; omitting it leaves the existing expiration untouched rather than silently clearing it.

### 4. Cache-aside pattern for the redirect hot path

```js
const cachedUrl = await redis.get(shortCode);
if (cachedUrl) {
    incrementClickAsync(shortCode);
    return res.redirect(302, cachedUrl);
}

const url = await findUrl({ shortCode }); // pure DB lookup, no side effects

if (!url) return res.redirect(302, `${CLIENT_URL}/not-found`);
if (url.expiresAt && url.expiresAt < new Date()) return res.redirect(302, `${CLIENT_URL}/link-expired`);

await redis.set(shortCode, url.longUrl, 'EX', cacheTime);
incrementClickAsync(shortCode);
return res.redirect(302, url.longUrl);
```

**Known limitation, accepted deliberately:** the Redis TTL isn't currently capped to `expiresAt`, so an already-expired link could theoretically still be served from a warm cache for up to `cacheTime` seconds after its real expiration, until that cache key naturally falls out. The redirect route's DB path always enforces expiration correctly; only the cache-hit window has this gap. Flagged as a deferred fix, not an oversight.

### 5. Multi-device sessions

The original design stored a single `refreshToken` directly on `User`, which meant logging in on a second device silently invalidated the first device's session (each login overwrote the one shared field). Fixed by extracting sessions into their own model — one `Session` row per device/login, each with its own `refreshToken`, `userAgent`, and `expiresAt`. This makes "log out this device" (`deleteMany({ where: { refreshToken } })`) and "log out everywhere" (`deleteMany({ where: { userId } })`, used on password reset) both correct, explicit operations instead of overloading a single field.

### 6. Mandatory email verification

Registration creates the account and sends a verification email but issues no tokens — the account is unusable until verified. Login checks `emailVerified` and throws a distinct `403` with `error.code = "EMAIL_NOT_VERIFIED"` so the frontend can offer a "resend verification" action instead of a generic failure. The `protect` middleware independently re-checks `emailVerified` on every authenticated request as defense in depth, not just at login time.

Verification and password-reset tokens are generated with `crypto.randomBytes(32)` — cryptographically unguessable, unlike the sequential Base62 short codes, since these tokens directly grant account access or identity confirmation. Both are single-use (cleared on success) and time-limited (24h for verification, 30 minutes for password reset — shorter, since a reset token is higher-stakes if intercepted).

Resend-verification and forgot-password endpoints never reveal whether an email exists in the system — both respond identically regardless, to prevent account enumeration.

### 7. Distributed rate limiting

Redis-backed (not in-memory) so limits hold correctly across multiple server instances. Separate limiters per concern:

| Limiter | Window | Max | Key |
|---|---|---|---|
| Shorten | 15 min | 20 | IP |
| Redirect | 1 min | 100 | IP (IPv6-subnet aware) |
| Resend verification | 15 min | 5 | IP |
| Resend verification | 1 hour | 3 | Email (normalized lowercase) |
| Forgot password | 15 min | 5 | IP |
| Forgot password | 1 hour | 3 | Email |

Email-keyed limiters use `express-rate-limit`'s `ipKeyGenerator` helper for the IP fallback case, required for correct IPv6 handling — using a raw `req.ip` string directly is flagged by the library itself as unsafe (multiple textual representations of the same IPv6 address could otherwise bypass the limit).

**Algorithm:** fixed window counter — simple and cheap, with a known boundary-burst trade-off (a client can send up to ~2x the limit across a window boundary). Acceptable at this scale; sliding window or token bucket would close the gap at added complexity.

### 8. Single-domain UX via Vercel rewrites, and the collision it caused twice

```json
{
  "rewrites": [
    { "source": "/([a-zA-Z0-9]{1,10})", "destination": "https://ziplify-server-production.up.railway.app/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This bit twice in practice: once when `/login` (5 chars) was first added, and again when the short-code length cap was widened to 10 and a bare `/dashboard` (9 chars) started colliding — both times manifesting specifically on a hard refresh or direct URL visit (client-side `<Link>` navigation never hits Vercel's rewrite layer at all, only a fresh HTTP request does, which is why the bug was invisible during normal in-app navigation and only appeared on refresh).

Two structural fixes closed this permanently, rather than patching it with a growing per-route exclusion list:
1. **Every dashboard route was renamed under a multi-segment prefix** — `/dashboard` → `/my-dashboard`, with all sub-pages (`my-links`, `profile`, `analytics`) nested under it. A path containing a `/` can never match the single-segment short-code regex, regardless of length.
2. **Custom aliases were restricted to alphanumeric characters only** (no hyphens) — so any route name containing a hyphen, like `/not-found` and `/link-expired`, is also structurally guaranteed to never collide with a short code.

With both in place, no current or reasonably-named future route needs an explicit exclusion rule in `vercel.json` at all.

---

## Performance

Measured with `autocannon`, comparing cache-miss vs. cache-hit latency on freshly created, never-cached short codes, averaged across five independent trials — tested with the backend running locally but pointed at the real production databases (Neon + Redis Cloud), specifically to isolate database/cache latency from hosting-tier noise (initially Render's free-tier single-worker queueing and cold starts; later a genuine Postgres/backend region mismatch that was independently found and fixed, roughly halving both numbers once corrected).

| Trial | Cache Miss | Cache Hit |
|---|---|---|
| 1 | 300 ms | 179 ms |
| 2 | 281 ms | 178 ms |
| 3 | 286 ms | 173 ms |
| 4 | 285 ms | 176 ms |
| 5 | 279 ms | 172 ms |
| **Average** | **286.2 ms** | **175.6 ms** |

**Result: ~39% latency reduction** from Redis caching.

**Honest caveat:** even the cache-hit path is dominated by network round-trip to a remote Redis Cloud instance, not Redis's own processing time (sub-millisecond). Both the miss and hit paths still pay the same free-tier Neon/Redis Cloud network tax — the relative improvement is the meaningful, controlled result; the absolute numbers would differ on dedicated infrastructure.

---

## Deployment

| Layer | Provider | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push; env vars baked in at build time |
| Backend | Railway (migrated from Render) | |
| Database | Neon (PostgreSQL) | Connection pooled, `sslmode=verify-full` |
| Cache | Redis Cloud | Free tier, 30MB |
| Email | Resend | Sandbox mode sends only to the account owner's own address until a domain is verified |

All cross-service URLs (`CLIENT_URL`, `DATABASE_URL`, `REDIS_URL`, `VITE_API_URL`, `VITE_API_BASE_URL`, `RESEND_API_KEY`) are environment-specific — same variable name, different value per environment — so no code changes are needed moving between local dev and production.

---

## Issues Resolved During Development

Kept as a running log, since working through these is arguably more representative of engineering skill than the fact that the happy path works:

1. **CORS origin mismatch (trailing slash)** — `Access-Control-Allow-Origin` didn't match the browser's actual origin because `CLIENT_URL` had a trailing slash. CORS requires an exact string match; no normalization applied.
2. **`tsx: not found` in production** — was in `devDependencies`; Railway/Render's production install skips those. Moved to `dependencies`, since a couple of files (the Prisma client wrapper, config) are `.ts` even though the majority of the codebase is plain JavaScript — switching to plain `node` broke module resolution on those files.
3. **Wrong platform start command** — dashboard-level start command settings override `package.json` defaults and had to be set explicitly.
4. **Invalid redirect status code** — `res.redirect(404, url)` doesn't work; browsers only auto-follow 3xx codes.
5. **Infinite redirect loop** — routing a "not found" fallback to a path that itself matched the short-code rewrite pattern caused it to loop indefinitely. Fixed by using a path containing a non-alphanumeric character.
6. **Vercel platform 404 vs. React 404** — needed an explicit SPA-fallback rewrite (`/(.*) → /index.html`) or client-side routes 404'd at the platform level before React ever loaded.
7. **`/login`, then later `/dashboard`, silently proxied to the backend** — both were short/alphanumeric enough to match the short-code rewrite pattern, and both broke specifically on refresh, not on in-app navigation. Root-caused twice before two structural fixes were applied: renaming every dashboard route under the multi-segment `/my-dashboard/*` prefix, and restricting custom aliases to alphanumeric-only so hyphenated route names are also immune.
8. **Custom alias / auto-generated code collision** — see Design Decision #2 above; left an orphaned DB row and burned a sequence value before the retry-on-conflict fix.
9. **Database/backend region mismatch** — Neon and the backend host were in different regions, roughly doubling both cache-hit and cache-miss latency until identified via repeated load testing and corrected.
10. **Single shared `refreshToken` field broke multi-device login** — logging in on a second device silently logged out the first, since every login overwrote the same field. Fixed by extracting sessions into their own model (Design Decision #5).
11. **`express-rate-limit` IPv6 key-generator validation error** — a custom `keyGenerator` using raw `req.ip` as a fallback was rejected by the library itself; fixed using its `ipKeyGenerator` helper to normalize IPv6 addresses correctly.
12. **Service functions reaching into `req` directly** — occurred twice (`optionalAuth`'s original draft, then `loginUser` reading `req.headers['user-agent']` directly) — `req`/`res` belong to controllers only; services must receive plain arguments so they stay testable in isolation.
13. **`throw Error` instead of `throw error`** — a one-character typo that discarded the custom error's `message`/`statusCode`/`code` entirely, surfacing as a cryptic `[Function: Error] { stackTraceLimit: 10 }` log instead of a readable error.

---

## Possible Future Improvements

- Automated test suite (unit tests for Base62 encode/decode, alias-collision retry, dedupe-with-expiration logic; integration tests for the auth flow) and a CI pipeline running them on every push — the most commonly-missing piece for a portfolio project at this stage
- Cap the Redis TTL to `expiresAt` so an expired link can never be served from a stale cache entry, closing the deferred gap from Design Decision #4
- "Manage devices" endpoints (`GET /auth/sessions`, `DELETE /auth/sessions/:id`) — natural now that sessions are their own table
- Structured logging (e.g. `pino`) with request IDs, replacing `console.log(err)`
- `helmet` and a full CORS/security audit
- A `/health` endpoint wired to a free uptime monitor
- Click analytics dashboard (referrer, timestamp, geo) — would need a separate `Click` table for per-event logging beyond the current aggregate `clickCount`
- Batch ID allocation if traffic ever approached a scale where the single Postgres sequence became a write bottleneck