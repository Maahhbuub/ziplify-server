import { encode } from "../utils/base62.js";
import { prisma } from "../lib/prisma.ts";
import redis from "../lib/redisClient.js"

const cacheTime = 900;

const createUrl = async ({ longUrl, userId, alias, expiresInDays }) => {
    if (userId && !alias) {
        const existing = await prisma.url.findFirst({
            where: {
                longUrl,
                userId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });

        if (existing) {
            // only touch expiresAt if this request explicitly provided a new value;
            // otherwise leave the existing expiration untouched
            if (expiresInDays) {
                const newExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
                const updated = await prisma.url.update({
                    where: { id: existing.id },
                    data: { expiresAt: newExpiresAt },
                });
                return { status: 'success', url: updated, reused: true };
            }

            return { status: 'success', url: existing, reused: true };
        }
    }

    const expiresAt = (userId && expiresInDays)
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    if (alias) {
        const existingAlias = await prisma.url.findUnique({ where: { shortCode: alias } });
        if (existingAlias) {
            return { status: 'alias_taken' };
        }

        try {
            const created = await prisma.url.create({
                data: { longUrl, shortCode: alias, userId: userId ?? null, expiresAt },
            });
            await redis.set(alias, longUrl, 'EX', cacheTime);
            return { status: 'success', url: created };
        } catch (err) {
            if (err.code === 'P2002') return { status: 'alias_taken' };
            throw err;
        }
    }

    let attempts = 0;
    while (attempts < 3) {
        const created = await prisma.url.create({
            data: { longUrl, shortCode: "", userId: userId ?? null, expiresAt },
        });
        const shortCode = encode(Number(created.id));

        try {
            const updated = await prisma.url.update({
                where: { id: created.id },
                data: { shortCode },
            });
            await redis.set(shortCode, longUrl, 'EX', cacheTime);
            return { status: 'success', url: updated };
        } catch (err) {
            if (err.code === 'P2002') {
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
    const url = await prisma.url.findUnique({ where: { shortCode } });
    return url; // null, or full row including expiresAt
};

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



export { createUrl, findUrl, getUrls, deleteUrl, updateUrl };