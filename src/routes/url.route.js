import express from 'express';
const router = express.Router();

// middleware
import catchAsync from '../utils/catchAsync';
import { shortenLimit, redirectLimit } from '../middlewares/limiter.middleware';
import { optionalAuth } from '../middlewares/auth.middleware'
import { validateRequest } from '../middlewares/validation.middleware';
import { createUrlSchema } from '../validations/url.validation';

// controller
import { createShortUrl, redirectToUrl } from '../controllers/url.controller';

router.route("/").post(shortenLimit, optionalAuth, validateRequest(createUrlSchema), catchAsync(createShortUrl));
router.route("/:shortCode").get(redirectLimit, catchAsync(redirectToUrl));

export default router;