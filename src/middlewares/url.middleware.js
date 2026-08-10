import { rateLimit } from 'express-rate-limit'

const shortenLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many links created from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ipv6Subnet: 56,
});

const redirectLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Too many requests, Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    ipv6Subnet: 56,
});

export { shortenLimit, redirectLimit };