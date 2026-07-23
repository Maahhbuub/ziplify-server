import express from 'express';
const router = express.Router();

// middleware
import catchAsync from '../utils/catchAsync';

// controller
import { createShortUrl, redirectToUrl } from '../controllers/url.controller';

router.route("/")
    .post(catchAsync(createShortUrl));

router.route("/:shortCode")
    .get(catchAsync(redirectToUrl));

export default router;