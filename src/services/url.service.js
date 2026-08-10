import { encode } from "../utils/base62.js";
import { prisma } from "../lib/prisma.ts";
import redis from "../lib/redisClient.js"

const cacheTime = 3600;

const createUrl = async ({ longUrl }) => {
    const created = await prisma.url.create({
        data: { longUrl, shortCode: "" }
    });
    const shortCode = encode(Number(created.id));

    const update = await prisma.url.update({
        where: { id: created.id },
        data: { shortCode },
    });

    await redis.set(shortCode, longUrl, 'EX', cacheTime);
    return { shortCode: update.shortCode };
}

const findUrl = async ({ shortCode }) => {
    const cache = await redis.get(shortCode);
    if (cache) {
        await incrementClickCount(shortCode);
        return { longUrl: cache };
    }

    const url = await prisma.url.findUnique({ where: { shortCode } });
    if (!url) return null;

    await redis.set(shortCode, url.longUrl, 'EX', cacheTime);
    await incrementClickCount(shortCode);

    return { longUrl: url.longUrl };
}


const incrementClickCount = async (shortCode) => {
    await prisma.url.update({
        where: { shortCode },
        data: { clickCount: { increment: 1 } }
    });
};

export { createUrl, findUrl };