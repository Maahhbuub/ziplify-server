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

const loginUser = async ({ email, password, userAgent }) => {
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
        const error = new Error("Please verify your email before logging in");
        error.statusCode = 403;
        error.code = "EMAIL_NOT_VERIFIED";
        throw error;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.session.create({
        data: {
            refreshToken,
            userId: user.id,
            userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
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
        },
    });

    // logout from all devices
    await prisma.session.deleteMany({ where: { userId: user.id } });
};

const logoutUser = async (refreshToken) => {
    if (!refreshToken) return;
    await prisma.session.deleteMany({ where: { refreshToken } });
};

const refreshToken = async (incomingRefreshToken) => {
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const session = await prisma.session.findUnique({ where: { refreshToken: incomingRefreshToken } });

    if (!session || session.userId !== decoded.id) {
        const error = new Error("Invalid refresh token");
        error.statusCode = 401;
        throw error;
    }

    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } }); // clean up expired session
        const error = new Error("Session expired, please log in again");
        error.statusCode = 401;
        throw error;
    }

    const accessToken = generateAccessToken(decoded.id);
    return { accessToken };
};

export {
    registerUser, loginUser, logoutUser, refreshToken,
    verifyEmail, resendVerificationEmail, requestPasswordReset, resetPassword
};