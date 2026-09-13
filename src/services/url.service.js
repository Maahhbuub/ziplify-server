import { encode } from "../utils/base62.js";
import { prisma } from "../lib/prisma.ts";
import redis from "../lib/redisClient.js"

const cacheTime = 900;

const createUrl = async ({ longUrl, userId }) => {
    const created = await prisma.url.create({
        data: { longUrl, shortCode: "", userId: userId ?? null }
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

const getUrls = async (userId) => {
    const urls = await prisma.url.findMany({ where: { userId } });
    return { myUrls: urls };
};

const deleteUrls = async (userId, id) => {
    const url = await prisma.url.findUnique({ where: { id: Number(id) } });
    if (!url) return {
        status: "not-found"
    }
    if (url.userId != userId) return {
        status: "forbidden",
    }

    await prisma.url.delete({ where: { id: Number(id) } });
    await redis.del(url.shortCode);
    return url;
}

const incrementClickCount = async (shortCode) => {
    await prisma.url.update({
        where: { shortCode },
        data: { clickCount: { increment: 1 } }
    });
};

export { createUrl, findUrl, getUrls, deleteUrls };