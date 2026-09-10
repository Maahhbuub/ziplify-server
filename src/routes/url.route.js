import express from 'express';
const router = express.Router();

// middleware
import catchAsync from '../utils/catchAsync';
import { shortenLimit, redirectLimit } from '../middlewares/url.middleware';
import { optionalAuth } from '../middlewares/auth.middleware'

// controller
import { createShortUrl, redirectToUrl } from '../controllers/url.controller';

router.route("/").post(shortenLimit, optionalAuth, catchAsync(createShortUrl));

router.route("/:shortCode").get(redirectLimit, catchAsync(redirectToUrl));

export default router;