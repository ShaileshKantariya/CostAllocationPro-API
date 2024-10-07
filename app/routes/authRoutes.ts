import express from 'express';
import { authController } from '../controllers';
import {
	changePasswordValidationRules,
	forgotPasswordValidationRules,
	loginValidationRules,
	reCaptchaValidationRules,
	updateProfileValidationRules,
} from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { updateProfileMiddleware } from '../helpers/multer';

const router = express.Router();

// Login
router.post('/login', loginValidationRules, authController.login);

//verify recaptcha
router.post('/verify-recaptcha', reCaptchaValidationRules,authController.verifyReCaptcha);

// Logout
router.post('/logout', isAuthenticated, authController.logout);

// Register User
router.post('/register', authController.register);

// Forgot password
router.post(
	'/resend-welcome-email',
	isAuthenticated,
	authController.resendWelcomeEmail
);

router.post(
	'/forgot-password',
	forgotPasswordValidationRules,
	authController.forgotPassword
);

// Verify forgot password token
router.post(
	'/verify-forgot-password',
	authController.verifyForgotPasswordToken
);

// Change Password
router.post(
	'/change-password/:token',
	changePasswordValidationRules,
	authController.changePassword
);

// Fetch Profile
router.get('/fetch-profile', isAuthenticated, authController.fetchProfile);

// Update Profile
router.put(
	'/',
	isAuthenticated,
	updateProfileMiddleware.single('profileImg'),
	updateProfileValidationRules,
	authController.updateProfile
);

router.post('/refresh-token', authController.refreshToken);

router.post('/admin/change-password', isAuthenticated, authController.changePasswordByAdmin);

export default router;
