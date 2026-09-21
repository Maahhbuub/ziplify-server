import { changePassword, updateProfile, deleteAccount } from '../services/user.service'
import { clearTokenCookies } from '../utils/tokenCookies';

const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
};

const updateMyProfile = async (req, res) => {
    const { name } = req.body;
    const updated = await updateProfile(req.user.id, { name });

    return res.status(200).json({
        success: true,
        message: "Name updated successfully",
        user: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
        }
    });
}

const changeMyPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const currentRefreshToken = req.cookies.refreshToken;

    await changePassword(req.user.id, currentRefreshToken, { currentPassword, newPassword });
    return res.status(200).json({
        success: true,
        message: "Password changed successfully",
    });
}

const deleteMyAccount = async (req, res) => {
    const { password } = req.body;
    await deleteAccount(req.user.id, password);

    clearTokenCookies(res);
    return res.status(200).json({
        success: true,
        message: "Account deleted successfully",
    });
};

export { getMe, updateMyProfile, changeMyPassword, deleteMyAccount };