import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// middleware
import { globalError, invalidRoute } from "./middlewares/error.middleware.js";

// routes
import authRoute from "./routes/auth.routes.js";
import urlRoute from "./routes/url.route.js";

const app = express();

// built-in middlewares
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

// routes
app.use("/auth", authRoute);
app.use("/", urlRoute);

// health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
    });
});

// error handlers
app.use(invalidRoute);
app.use(globalError);

export default app;