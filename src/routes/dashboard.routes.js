import express from "express";
const router = express.Router();

// controllers
import { getMyUrls, deleteMyUrl, updateMyUrl } from "../controllers/dashboard.controller";
import { protect } from "../middlewares/auth.middleware";
import catchAsync from "../utils/catchAsync";
import { validateRequest } from "../middlewares/validation.middleware";
import { updateUrlSchema } from "../validations/url.validation";

router.route("/urls")
    .get(protect, catchAsync(getMyUrls));

router.route("/urls/:id")
    .delete(protect, catchAsync(deleteMyUrl))
    .patch(protect, validateRequest(updateUrlSchema), catchAsync(updateMyUrl));

export default router;