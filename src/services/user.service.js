import { prisma } from '../lib/prisma'
import bcrypt from "bcrypt";

const updateProfile = async (userId, { name }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { name },
    });
    return updated;
};

const changePassword = async (userId, currentRefreshToken, { currentPassword, newPassword }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const isCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCorrect) {
        const error = new Error("Current password is incorrect");
        error.statusCode = 401;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    await prisma.session.deleteMany({
        where: {
            userId,
            refreshToken: { not: currentRefreshToken },
        },
    });
};

const deleteAccount = async (userId, password) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const isCorrect = await bcrypt.compare(password, user.password);
    if (!isCorrect) {
        const error = new Error("Incorrect password");
        error.statusCode = 401;
        throw error;
    }

    await prisma.user.delete({ where: { id: userId } });
};

export { updateProfile, changePassword, deleteAccount };