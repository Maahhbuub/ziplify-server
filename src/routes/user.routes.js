import express from 'express';
const router = express.Router();

// middleware
import catchAsync from "../utils/catchAsync";
import { validateRequest } from '../middlewares/validation.middleware';
import { updateProfileSchema, changePasswordSchema, deleteAccountSchema } from '../validations/user.validation';
import { protect } from '../middlewares/auth.middleware';
import { getMe, updateMyProfile, changeMyPassword, deleteMyAccount } from '../controllers/user.controller';

router.route('/me')
    .get(protect, catchAsync(getMe));
router.route('/profile')
    .patch(validateRequest(updateProfileSchema), protect, catchAsync(updateMyProfile));
router.route('/change-password')
    .post(validateRequest(changePasswordSchema), protect, catchAsync(changeMyPassword));
router.route('/account')
    .delete(validateRequest(deleteAccountSchema), protect, catchAsync(deleteMyAccount));

export default router;