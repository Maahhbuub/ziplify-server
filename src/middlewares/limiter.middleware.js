import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis';
import redis from "../lib/redisClient.js"

const emailKey = (req) => {
    const email = req.body?.email;
    return typeof email === 'string' && email
        ? email.trim().toLowerCase()
        : ipKeyGenerator(req.ip);
};

const redirectKey = (req) => {
    const vercelIp = req.headers['x-vercel-forwarded-for'];
    const ip = typeof vercelIp === 'string' && vercelIp
        ? vercelIp.split(',')[0].trim()
        : req.ip;
    return ipKeyGenerator(ip);
};

const shortenLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:shorten:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const redirectLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:redirect:',
    }),
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: redirectKey,
    message: { success: false, message: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const resendVerificationLimit = rateLimit({ // ip based limiter
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:resend-verification:',
    }),
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5,
    message: { success: false, message: 'Too many verification emails sent' },
    standardHeaders: true,
    legacyHeaders: false,
});

const resendVerificationByEmailLimit = rateLimit({ // email based limiter
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:resend-verification-email:',
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: emailKey,
    message: { success: false, message: 'Too many verification emails sent' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimit = rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args), prefix: 'rl:login:' }),
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true, // only failed attempts count
    message: { success: false, message: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimit = rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redis.call(...args), prefix: 'rl:register:' }),
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many signup attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:forgot-password:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many password reset requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordByEmailLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:forgot-password-email:',
    }),
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: emailKey,
    message: { success: false, message: 'Too many reset emails sent to this address. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export { shortenLimit, redirectLimit, resendVerificationLimit, resendVerificationByEmailLimit, forgotPasswordLimit, forgotPasswordByEmailLimit, loginLimit, registerLimit };
