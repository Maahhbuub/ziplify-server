import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma.ts";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";
import { generateToken } from "../utils/generateToken.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.service.js";

const registerUser = async ({ name, email, password }) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        const error = new Error("Email already registered.");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateToken();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            verificationToken,
            verificationTokenExpiresAt,
        },
    });

    await sendVerificationEmail(email, verificationToken);
    return { user };
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

    if (!user.emailVerified) {
        const error = new Error("Please verify your email");
        error.statusCode = 403;
        error.code = "EMAIL_NOT_VERIFIED";
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

const verifyEmail = async (token) => {
    if (!token) {
        const error = new Error("Verification token is required");
        error.statusCode = 400;
        throw error;
    }

    const user = await prisma.user.findUnique({ where: { verificationToken: token } });

    if (!user) {
        const error = new Error("Invalid or already-used verification link");
        error.statusCode = 400;
        throw error;
    }

    if (user.verificationTokenExpiresAt < new Date()) {
        await prisma.user.delete({ where: { id: user.id } });

        const error = new Error("Verification link has expired");
        error.statusCode = 400;
        throw error;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiresAt: null,
        },
    });
};

const resendVerificationEmail = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });

    // don't leak whether the email exists or is already verified
    if (!user || user.emailVerified) return;

    const verificationToken = generateToken();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken, verificationTokenExpiresAt },
    });

    await sendVerificationEmail(email, verificationToken);
};

const requestPasswordReset = async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const resetPasswordToken = generateToken();
    const resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken, resetPasswordExpiresAt }
    });

    await sendPasswordResetEmail(email, resetPasswordToken);
}

const resetPassword = async (token, newPassword) => {
    if (!token) {
        const error = new Error("Reset token is required");
        error.statusCode = 400;
        throw error;
    }

    const user = await prisma.user.findUnique({ where: { resetPasswordToken: token } });
    if (!user) {
        const error = new Error("Invalid reset link");
        error.statusCode = 400;
        throw error;
    }

    if (user.resetPasswordExpiresAt < new Date()) {
        const error = new Error("Reset link has expired");
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpiresAt: null,
            refreshToken: null, // logout from all device
        },
    });
}

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

export {
    registerUser, loginUser, logoutUser, refreshToken,
    verifyEmail, resendVerificationEmail, requestPasswordReset, resetPassword
};