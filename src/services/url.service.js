import { encode } from "../utils/base62.js";
import { prisma } from "../lib/prisma.ts";
import redis from "../lib/redisClient.js"

const cacheTime = 900;

const createUrl = async ({ longUrl, userId, alias }) => {
    if (alias) {
        const existing = await prisma.url.findUnique({ where: { shortCode: alias } });
        if (existing) {
            return { status: 'alias_taken' };
        }

        //custom alias - collision safe
        try {
            const created = await prisma.url.create({
                data: { longUrl, shortCode: alias, userId: userId ?? null },
            });
            await redis.set(alias, longUrl, 'EX', cacheTime);
            return { status: 'success', shortCode: created.shortCode };
        } catch (err) {
            if (err.code === 'P2002') {
                return { status: 'alias_taken' };
            }
            throw err;
        }
    }

    // auto-generated flow — collision-safe
    let attempts = 0;
    while (attempts < 5) {
        const created = await prisma.url.create({
            data: { longUrl, shortCode: "", userId: userId ?? null },
        });
        const shortCode = encode(Number(created.id));

        try {
            const updated = await prisma.url.update({
                where: { id: created.id },
                data: { shortCode },
            });
            await redis.set(shortCode, longUrl, 'EX', cacheTime);
            return { status: 'success', shortCode: updated.shortCode };
        } catch (err) {
            if (err.code === 'P2002') {
                // if already claimed by a custom alias — clean up and retry
                await prisma.url.delete({ where: { id: created.id } });
                attempts++;
                continue;
            }
            throw err;
        }
    }

    throw new Error('Failed to generate a unique short code');
};

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

const deleteUrl = async (userId, id) => {
    const url = await prisma.url.findUnique({ where: { id: Number(id) } });
    if (!url) return {
        status: "not_found"
    }
    if (url.userId !== userId) return {
        status: "forbidden",
    }

    await prisma.url.delete({ where: { id: Number(id) } });
    await redis.del(url.shortCode);
    return url;
}

const updateUrl = async (id, userId, longUrl) => {
    const url = await prisma.url.findUnique({ where: { id: Number(id) } });
    if (!url) return {
        status: "not_found"
    }
    if (userId !== url.userId) return {
        status: "forbidden"
    }

    const updated = await prisma.url.update({
        where: { id: Number(id) },
        data: { longUrl }
    });

    await redis.set(updated.shortCode, updated.longUrl, 'EX', cacheTime);
    return updated;
}

const incrementClickCount = async (shortCode) => {
    await prisma.url.update({
        where: { shortCode },
        data: { clickCount: { increment: 1 } }
    });
};

export { createUrl, findUrl, getUrls, deleteUrl, updateUrl };