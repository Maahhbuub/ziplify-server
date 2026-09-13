import { createUrl, findUrl } from "../services/url.service";

const createShortUrl = async (req, res) => {
    const { longUrl, alias } = req.body;
    const userId = req.user?.id ?? null;
    const username = req.user?.name ?? null;

    const effectiveAlias = userId ? alias : undefined;
    const result = await createUrl({ longUrl, userId, alias: effectiveAlias });

    if (result.status === 'alias_taken') {
        return res.status(409).json({
            success: false,
            message: "This alias is already taken.",
        });
    }

    return res.status(201).json({
        success: true,
        message: "Link created successfully",
        code: result.shortCode,
        user: username,
    });
}

const redirectToUrl = async (req, res) => {
    const { shortCode } = req.params;

    const url = await findUrl({ shortCode });
    if (!url) {
        return res.redirect(302, `${process.env.CLIENT_URL}/not-found`);
    }
    return res.redirect(302, url.longUrl);
}

export { createShortUrl, redirectToUrl };