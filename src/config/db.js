import { prisma } from "../lib/prisma.ts";

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("PostgreSQL connected via Prisma");
    } catch (error) {
        console.error("Prisma connection failed:", error.message);
        process.exit(1);
    }
};

export default connectDB;