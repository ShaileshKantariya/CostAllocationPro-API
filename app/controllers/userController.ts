import { NextFunction, Request, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { hashPassword } from '../helpers/passwordHelper';
import { UserInfo } from '../interfaces';
import userRepository from '../repositories/userRepository';
import userServices from '../services/userServices';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import companyRoleRepository from '../repositories/companyRoleRepository';
import sendEmail from '../helpers/emailHelper';
import { companyRepository } from '../repositories';
import config from '../../config';
import {
	getAdminEmailOnUserDeleteTemplate,
	getUserEmailOnDeleteTemplate,
} from '../helpers/emailTemplateHelper';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { CustomError } from '../models/customError';
import { AdminUserQuery } from '../interfaces/userInterface';

class UserController {
	// Get All Users
	async getAllUsers(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const {
				page = 1,
				limit = 10,
				search,
				filter,
				type,
				sort,
				company,
			} = req.query;

			if (!company) {
				throw new CustomError(403, 'Company not found');
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, company as string, {
				permissionName: 'Users',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const { users, total } = await userServices.getAllUsers(
				company as string,
				Number(page),
				Number(limit),
				search as string,
				filter as string,
				type as string,
				sort as string
			);

			return DefaultResponse(
				res,
				200,
				'Users fetched successfully',
				users,
				total,
				Number(page)
			);
		} catch (err) {
			next(err);
		}
	}

	// Get User Details
	async getUserDetails(req: Request, res: Response, next: NextFunction) {
		try {
			const id = req.params.id;
			const user = await userServices.getUserById(id);
			return DefaultResponse(
				res,
				200,
				'User details fetched successfully',
				user
			);
		} catch (err) {
			next(err);
		}
	}

	// Create User
	async createUser(req: Request, res: Response, next: NextFunction) {
		try {
			const { password } = req.body;
			const hashedPassword = await hashPassword(password);

			const userData: UserInfo = {
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				email: req.body.email,
				phone: req.body.phone,
				password: hashedPassword,
			};

			const user = await userRepository.create(userData);
			return DefaultResponse(res, 200, 'Users created successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Update User
	async updateUser(req: Request, res: Response, next: NextFunction) {
		try {
			// Check Validation
			const { companyId } = req.body;
			checkValidation(req);

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Users',
				permission: ['edit'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			// Update User
			const user = await userServices.updateUser(req.body);
			return DefaultResponse(res, 200, 'User updated successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Delete User
	async deleteUser(req: Request, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { user, company } = req.body;
			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, company, {
				permissionName: 'Users',
				permission: ['delete'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const adminEmails = await userRepository.getAllAdminEmails(company);

			// const emails = await adminEmails.map((item) => item?.user?.email);

			const companyDetails = await companyRepository.getDetails(company);

			const userDetails = await userRepository.getById(user);

			// let userName: string;

			// if (userDetails?.firstName && userDetails?.lastName) {
			// 	userName = userDetails?.firstName + ' ' + userDetails?.lastName;
			// } else {
			// 	userName = userDetails?.email;
			// }

			const userEmailContent = getUserEmailOnDeleteTemplate({
				firstName: userDetails?.firstName,
				lastName: userDetails?.lastName,
				companyName: companyDetails?.tenantName,
			});

			// Send email to the user who is deleted
			const deletedUserMailOptions = {
				from: config.smtpEmail,
				to: userDetails?.email,
				subject: `Your Access to ${companyDetails?.tenantName} has been Revoked - CostAllocation Pro`,
				html: userEmailContent,
				// text: `Please use the following token to reset your password: ${forgotPasswordToken}`,
			};

			await sendEmail(deletedUserMailOptions);

			await Promise.all(
				adminEmails.map(async (item: any) => {
					let adminUserName;

					if (item?.user?.firstName && item?.user?.lastName) {
						adminUserName = item?.user?.firstName + ' ' + item?.user?.lastName;
					} else {
						adminUserName = item?.user?.email;
					}

					const emailContent = getAdminEmailOnUserDeleteTemplate({
						adminUserName,
						userName: userDetails?.firstName,
						lastName: userDetails?.lastName,
						companyName: companyDetails?.tenantName,
						url: config?.reactAppBaseUrl,
					});

					// Send the email to all the admins
					const mailOptions = {
						from: config.smtpEmail,
						to: item?.user?.email,
						subject: `Access to ${companyDetails?.tenantName} has been Revoked - CostAllocation Pro`,
						html: emailContent,
						// text: `Please use the following token to reset your password: ${forgotPasswordToken}`,
					};

					await sendEmail(mailOptions);
				})
			);

			const deletedUser = await userServices.deleteUser(user, company);
			return DefaultResponse(
				res,
				200,
				'User deleted successfully',
				deletedUser
			);
		} catch (err) {
			next(err);
		}
	}

	// Invite User
	async inviteUser(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const {
				email,
				role,
				company,
				phone,
				firstName = '',
				lastName = '',
			} = req.body;

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, company, {
				permissionName: 'Users',
				permission: ['add'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const user = await userServices.inviteUser(
				req?.user?.id,
				req?.user?.email,
				email,
				role,
				company,
				phone,
				firstName,
				lastName
			);
			return DefaultResponse(res, 200, 'User invited successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Reinvite User
	async reinviteUser(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { userId, companyId, email, role } = req.body;

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Users',
				permission: ['add'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const user = await userServices.reinviteUser(
				req?.user?.id,
				req?.user?.email,
				email,
				companyId,
				userId,
				role
			);
			return DefaultResponse(res, 200, 'User reinvited successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Integrate User
	async integrate(req: Request, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { user, role, company } = req.body;
			const integratedUser = await companyRoleRepository.create(
				user,
				role,
				company
			);
			return DefaultResponse(
				res,
				201,
				'User Integrated Successfully',
				integratedUser
			);
		} catch (err) {
			next(err);
		}
	}

	// Admin User
	async getAllCompanyAdminUser(req: RequestExtended, res: Response, next: NextFunction) {
		try {

			if (req.user.id != `${process.env.SUPER_ADMIN_USER_ID}`) {
				throw new CustomError(401, 'Unauthorized you are not allow to access this api')
			}

			const users = await userServices.getAllCompanyAdminUser(req.query as unknown as AdminUserQuery);

			return DefaultResponse(
				res,
				200,
				'Users fetched Successfully',
				{...users}
			);
		} catch (err) {
			next(err);
		}
	}
}

export default new UserController();
