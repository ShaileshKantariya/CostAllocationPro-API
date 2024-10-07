import express from 'express';
import { userController } from '../controllers';
import {
	deleteUserFromCompanyRules,
	inviteUserValidationRules,
	reinviteUserValidationRules,
	updateUserByAdminValidation,
} from '../helpers/validators';
const router = express.Router();

// Get All Users
router.get('/', userController.getAllUsers);

// Get all admin users
router.get('/admins', userController.getAllCompanyAdminUser);

// Get User Details By Id
router.get('/:id', userController.getUserDetails);

// Create New User (Temporary Api)
router.post('/', userController.createUser);

// Update User by Id
router.put('/', updateUserByAdminValidation, userController.updateUser);

// Invite New User
router.post(
	'/invite-user',
	inviteUserValidationRules,
	userController.inviteUser
);

// Reinvite New User
router.post(
	'/reinvite-user',
	reinviteUserValidationRules,
	userController.reinviteUser
);

// Delete User From Particular Company
router.delete('/', deleteUserFromCompanyRules, userController.deleteUser);

// Integrate user with company (Temporary Api)
router.post('/integrate', userController.integrate);

export default router;
