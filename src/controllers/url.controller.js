import { createUrl, findUrl } from "../services/url.service";

const createShortUrl = async (req, res) => {
    const { longUrl } = req.body;
    const userId = req.user?.id ?? null;
    const username = req.user?.name ?? null;
    const { shortCode } = await createUrl({ longUrl, userId });

    return res.status(201).json({
        success: true,
        message: "Link created successfully",
        code: shortCode,
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