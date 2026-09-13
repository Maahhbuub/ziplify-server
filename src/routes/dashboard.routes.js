import express from "express";
const router = express.Router();

// controllers
import { getMyUrls, deleteMyUrl } from "../controllers/dashboard.controller";
import { protect } from "../middlewares/auth.middleware";
import catchAsync from "../utils/catchAsync";

router.route("/urls")
    .get(protect, catchAsync(getMyUrls));

router.route("/urls/:id")
    .delete(protect, catchAsync(deleteMyUrl));

export default router;