import { createUrl, findUrl } from "../services/url.service";
import { prisma } from "../lib/prisma.ts";
import redis from "../lib/redisClient.js"

const cacheTime = 900;

const createShortUrl = async (req, res) => {
    const { longUrl, alias, expiresInDays } = req.body;
    const userId = req.user?.id ?? null;
    const effectiveAlias = userId ? alias : undefined;
    const effectiveExpiresInDays = userId ? expiresInDays : undefined;

    const result = await createUrl({ longUrl, userId, alias: effectiveAlias, expiresInDays: effectiveExpiresInDays });

    if (result.status === 'alias_taken') {
        return res.status(409).json({
            success: false,
            message: "This alias is already taken.",
        });
    }

    return res.status(result.reused ? 200 : 201).json({
        success: true,
        message: result.reused ? "You've already shortened this link" : "Link created successfully",
        code: result.shortCode,
        user: userId,
    });
};

const redirectToUrl = async (req, res) => {
    const { shortCode } = req.params;
    const cachedUrl = await redis.get(shortCode);
    if (cachedUrl) {
        await incrementClickCount(shortCode);
        return res.redirect(302, cachedUrl);
    }

    const url = await findUrl({ shortCode });
    if (!url) {
        return res.redirect(302, `${process.env.CLIENT_URL}/not-found`);
    }
    if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
        return res.redirect(302, `${process.env.CLIENT_URL}/link-expired`);
    }

    await redis.set(shortCode, url.longUrl, 'EX', cacheTime);
    await incrementClickCount(shortCode);
    return res.redirect(302, url.longUrl);
};

const incrementClickCount = async (shortCode) => {
    await prisma.url.update({
        where: { shortCode },
        data: { clickCount: { increment: 1 } }
    });
};

export { createShortUrl, redirectToUrl };