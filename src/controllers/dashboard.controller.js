import { getUrls, deleteUrls } from "../services/url.service"

const getMyUrls = async (req, res) => {
    const { myUrls } = await getUrls(req.user.id);

    return res.status(200).json({
        success: true,
        user: req.user.name,
        message: `You have total ${myUrls.length} links`,
        data: myUrls,
    })
}

const deleteMyUrl = async (req, res) => {
    const { id } = req.params;
    const result = await deleteUrls(req.user.id, id);

    if (result.status === 'not-found') {
        return res.status(404).json({
            success: false,
            message: "Link not found"
        });
    }
    if (result.status === 'forbidden') {
        return res.status(403).json({
            success: false,
            message: "You don't have permission to delete this link",
        });
    }

    return res.status(200).json({
        success: true,
        id: result.id,
        message: "Link deleted successfully",
    })
}

export { getMyUrls, deleteMyUrl };
