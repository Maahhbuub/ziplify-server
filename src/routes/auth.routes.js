import express from 'express';
const router = express.Router();

// validation
import { createUserSchema, loginUserSchema } from "../validations/user.validation.js";
import { validateRequest } from "../middlewares/validation.middleware.js";

// middleware
import catchAsync from '../utils/catchAsync.js';
import { protect } from '../middlewares/auth.middleware.js';

// controller
import { register, login, refreshAccessToken, getMe, logout, verifyUserEmail, resendVerification } from '../controllers/auth.controller.js';

router.route('/me').get(protect, catchAsync(getMe));
router.route('/register').post(validateRequest(createUserSchema), catchAsync(register));
router.route('/login').post(validateRequest(loginUserSchema), catchAsync(login));
router.route('/refresh-token').post(catchAsync(refreshAccessToken));
router.route('/logout').post(protect, catchAsync(logout));
router.route('/verify-email').get(catchAsync(verifyUserEmail));
router.route('/resend-verification').post(catchAsync(resendVerification));

export default router;