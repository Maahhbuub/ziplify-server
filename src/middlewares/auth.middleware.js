import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";

const protect = async (req, res, next) => {
    let accessToken;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        accessToken = req.headers.authorization.split(" ")[1];
    }

    if (!accessToken) {
        return res.status(401).json({
            success: false,
            message: "Access token missing",
        });
    }

    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "User not found",
        });
    }

    req.user = user;
    next();
};

export { protect };