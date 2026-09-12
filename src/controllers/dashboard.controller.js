import { getUrls } from "../services/url.service"

const getMyUrls = async (req, res) => {
    const { myUrls } = await getUrls(req.user.id);

    return res.status(200).json({
        success: true,
        user: req.user.name,
        message: `You have total ${myUrls.length} links`,
        data: myUrls,
    })
}

export { getMyUrls };
