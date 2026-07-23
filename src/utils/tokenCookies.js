const isProduction = process.env.NODE_ENV === "production";

const refreshTokenCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const sendTokenCookies = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};

const clearTokenCookies = (res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });
};

export { sendTokenCookies, clearTokenCookies };