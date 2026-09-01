// import { Redis } from 'ioredis';
// const redis = new Redis();

// export default redis;

import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis Client Error', err));

export default redis;