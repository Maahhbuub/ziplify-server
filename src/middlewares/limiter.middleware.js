import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis';

import redis from "../lib/redisClient.js"

const shortenLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:shorten:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many request',
    standardHeaders: true,
    legacyHeaders: false,
});

const redirectLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:redirect:',
    }),
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Too many requests, Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    ipv6Subnet: 56,
});

const resendVerificationLimit = rateLimit({ // ip based limiter
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:resend-verification:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: 'Too many verification emails sent' },
    standardHeaders: true,
    legacyHeaders: false,
});

const resendVerificationByEmailLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:resend-verification-email:',
    }),
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => {
        const email = req.body?.email?.toLowerCase();
        return email || ipKeyGenerator(req.ip); // normalize IP fallback through their helper
    },
    message: { success: false, message: 'Too many verification emails sent' },
    standardHeaders: true,
    legacyHeaders: false,
});

export { shortenLimit, redirectLimit, resendVerificationLimit, resendVerificationByEmailLimit };
