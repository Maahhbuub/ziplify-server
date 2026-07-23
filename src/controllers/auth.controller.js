import { registerUser, loginUser, logoutUser, refreshToken } from "../services/auth.service.js";
import { sendTokenCookies, clearTokenCookies } from '../utils/tokenCookies.js';

const register = async (req, res) => {
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await registerUser({ name, email, password });

    sendTokenCookies(res, refreshToken);
    return res.status(201).json({
        success: true,
        message: "Registration successful",
        accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser({ email, password });

    sendTokenCookies(res, refreshToken);
    return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    });
};

const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
};

const logout = async (req, res) => {
    await logoutUser(req.cookies.refreshToken);

    clearTokenCookies(res);
    return res.status(200).json({
        success: true,
        message: "Logout successful",
    });
};

const refreshAccessToken = async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
        return res.status(401).json({
            success: false,
            message: "Refresh token missing",
        });
    }

    const { accessToken } = await refreshToken(incomingRefreshToken);
    return res.status(200).json({
        success: true,
        message: "Access token refreshed",
        accessToken,
    });
};

export { register, login, getMe, logout, refreshAccessToken };