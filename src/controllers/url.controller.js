import { createUrl, findUrl } from "../services/url.service";

const createShortUrl = async (req, res) => {
    const { longUrl } = req.body;
    const { shortCode } = await createUrl({ longUrl });

    return res.status(201).json({
        success: true,
        message: "Short code created successfully",
        code: shortCode,
    });
}

const redirectToUrl = async (req, res) => {
    const { shortCode } = req.params;

    const { longUrl } = await findUrl({ shortCode });
    return res.redirect(302, longUrl);
}

export { createShortUrl, redirectToUrl };