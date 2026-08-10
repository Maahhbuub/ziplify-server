import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis';

import redis from "../lib/redisClient.js"

const shortenLimit = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'rl:shorten:',
    }),
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many links created from this IP, please try again later.',
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

export { shortenLimit, redirectLimit };