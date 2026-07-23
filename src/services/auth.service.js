import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma.ts";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";

const registerUser = async ({ name, email, password }) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        const error = new Error("Email is already registered.");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
    });

    return { user, accessToken, refreshToken };
};

const logoutUser = async (refreshToken) => {
    if (!refreshToken) return;

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    await prisma.user.update({
        where: { id: decoded.id },
        data: { refreshToken: null },
    });
};

const refreshToken = async (refreshToken) => {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 401;
        throw error;
    }

    if (user.refreshToken !== refreshToken) {
        const error = new Error("Invalid refresh token");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(user.id);
    return { accessToken };
};

export { registerUser, loginUser, logoutUser, refreshToken };
