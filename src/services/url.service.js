import { encode } from "../utils/base62.js";
import { prisma } from "../lib/prisma.ts";

const createUrl = async ({ longUrl }) => {
    const created = await prisma.url.create({  // get id using long url
        data: { longUrl, shortCode: "" }
    });
    const shortCode = encode(Number(created.id));

    const update = await prisma.url.update({ // update after creating the short code
        where: { id: created.id },
        data: { shortCode },
    });

    return { shortCode: update.shortCode };
}

const findUrl = async ({ shortCode }) => {
    const url = await prisma.url.findUnique({ where: { shortCode } });

    // update click count
    await prisma.url.update({
        where: { shortCode },
        data: { clickCount: { increment: 1 } }
    });

    return { longUrl: url.longUrl };
}

export { createUrl, findUrl };