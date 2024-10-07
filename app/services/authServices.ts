import config from '../../config';
import sendEmail from '../helpers/emailHelper';
import {
	getChangePasswordTemplate,
	getForgotPasswordTemplate,
	getRegisterEmailTemplate,
} from '../helpers/emailTemplateHelper';
import { comparePassword, hashPassword } from '../helpers/passwordHelper';
import {
	generateAccessToken,
	generateForgotPasswordToken,
	generateRefreshToken,
	verifyForgotPasswordToken,
} from '../helpers/tokenHelper';
import { IZohoSubscription } from '../interfaces/subscriptionInterface';
import { CustomError } from '../models/customError';
import tokenRepository from '../repositories/tokenRepository';
import userRepository from '../repositories/userRepository';
import { subscriptionRepository } from '../repositories';
import { prisma } from '../client/prisma';
import moment from 'moment';

class AuthServices {
	async login(email: string, password: string, machineId: string) {
		try {
			// Check if user exists

			const user = await userRepository.getByEmail(email);

			if (!user) {
				const error = new CustomError(401, 'Invalid credentials');
				throw error;
			}

			if (user.id === `${process.env.SUPER_ADMIN_USER_ID}`) {
				//   Validate Password
				const validPassword = await comparePassword(password, user.password!);

				//   Password not valid
				if (!validPassword) {
					const error = new CustomError(401, 'Invalid credentials');
					throw error;
				}

				const accessToken = generateAccessToken({
					id: user?.id,
					email: email,
					passwordResetDate: user?.passwordResetDate,
				});
				const refreshToken = generateRefreshToken({
					id: user?.id,
					email: email,
					passwordResetDate: user?.passwordResetDate,
				});

				await tokenRepository.create(
					user?.id,
					accessToken,
					refreshToken,
					machineId
				);

				return { accessToken, refreshToken, user, isSuperAdmin: true };
			}

			const _companies = user.companies;

			user.companies = _companies.filter(
				(e) =>
					e.company &&
					e.company.Subscription &&
					e.company.Subscription.length &&
					e.company?.Subscription.every(
						(x) => x.status === 'live' || x.status === 'trial'
					)
			);

			if (!user.companies.length) {
				if (user.isSignupViaQuickBooks) {
					user.companies = _companies;
				}
			}

			// Check if user is verified
			if (!user?.isVerified) {
				const error = new CustomError(401, 'User is not verified');
				throw error;
			}

			//   Validate Password
			const validPassword = await comparePassword(password, user.password!);

			//   Password not valid
			if (!validPassword) {
				const error = new CustomError(401, 'Invalid credentials');
				throw error;
			}

			const isValidForLogin = user?.companies?.some((singleCompany: any) => {
				const permissions = singleCompany?.role?.permissions?.filter(
					(item: any) =>
						item?.all === true ||
						item?.view === true ||
						item?.edit === true ||
						item?.delete === true ||
						item?.add === true
				);
				if (permissions?.length === 0) {
					return false;
				} else {
					return true;
				}
			});

			const isValidForLoginWithRole = user?.companies?.some(
				(singleCompany: any) => {
					return singleCompany?.role?.status;
				}
			);

			const isValidSubscription = user?.companies?.some(
				(singleCompany: any) => {
					const subScription = singleCompany?.company?.Subscription;
					if (subScription && subScription.length) {
						if (
							!subScription[0].status ||
							(subScription[0].status != 'live' &&
								subScription[0].status != 'trial')
						) {
							return false;
						}
					}

					return true;
				}
			);

			const companyAdminSubscription = await prisma.subscription.findFirst({
				where: {
					userId: user.id,
					status: {
						in: ['live', 'trial'],
					},
				},
			});

			const companyAdminRole = await prisma.role.findFirst({
				where: {
					roleName: 'Company Admin',
					status: true,
					isCompanyAdmin: true,
				},
			});

			const companyAdminRoleCompany = await prisma.companyRole.findFirst({
				where: {
					userId: user.id,
					roleId: companyAdminRole?.id,
				},
			});

			if (
				companyAdminSubscription &&
				(!companyAdminSubscription ||
					!companyAdminSubscription.status ||
					(companyAdminSubscription.status != 'live' &&
						companyAdminSubscription.status != 'trial'))
			) {
				throw new CustomError(
					400,
					'You do not have any active subscription currently'
				);
			}

			const now = moment();

			if (
				!isValidSubscription &&
				!companyAdminSubscription &&
				((user.isSignupViaQuickBooks && !user.companies.length) ||
					(user.isSignupViaQuickBooks &&
						user.companies.length &&
						now.diff(moment(user.createdAt)) >= 14))
			) {
				throw new CustomError(
					400,
					'You do not have any active subscription currently'
				);
			}

			if (!isValidForLogin && !companyAdminRoleCompany) {
				throw new CustomError(
					401,
					'You are not authorized to access the system please contact your administrator.'
				);
			}

			if (!isValidForLoginWithRole && !companyAdminRoleCompany) {
				throw new CustomError(
					401,
					'You are not authorized to access the system please contact your administrator.'
				);
			}

			//   Credentials Valid
			const accessToken = generateAccessToken({
				id: user?.id,
				email: email,
				passwordResetDate: user?.passwordResetDate,
			});
			const refreshToken = generateRefreshToken({
				id: user?.id,
				email: email,
				passwordResetDate: user?.passwordResetDate,
			});

			await tokenRepository.create(
				user?.id,
				accessToken,
				refreshToken,
				machineId
			);

			return { accessToken, refreshToken, user, isSuperAdmin: false };
		} catch (err) {
			throw err;
		}
	}

	async ssoLogin(user: any, machineId: string) {
		const isValidForLogin = user?.companies?.some((singleCompany: any) => {
			const permissions = singleCompany?.role?.permissions?.filter(
				(item: any) =>
					item?.all === true ||
					item?.view === true ||
					item?.edit === true ||
					item?.delete === true ||
					item?.add === true
			);
			if (permissions?.length === 0) {
				return false;
			} else {
				return true;
			}
		});

		const isValidForLoginWithRole = user?.companies?.some(
			(singleCompany: any) => {
				return singleCompany?.role?.status;
			}
		);

		const isValidSubscription = user?.companies?.some((singleCompany: any) => {
			const subScription = singleCompany?.company?.Subscription;
			if (subScription && subScription.length) {
				if (
					!subScription[0].status ||
					(subScription[0].status != 'live' &&
						subScription[0].status != 'trial')
				) {
					return false;
				}
			}

			return true;
		});

		const companyAdminSubscription = await prisma.subscription.findFirst({
			where: {
				userId: user.id,
				status: {
					in: ['live', 'trial'],
				},
			},
		});

		const companyAdminRole = await prisma.role.findFirst({
			where: {
				roleName: 'Company Admin',
				status: true,
				isCompanyAdmin: true,
			},
		});

		const companyAdminRoleCompany = await prisma.companyRole.findFirst({
			where: {
				userId: user.id,
				roleId: companyAdminRole?.id,
			},
		});

		if (
			companyAdminSubscription &&
			(!companyAdminSubscription ||
				!companyAdminSubscription.status ||
				(companyAdminSubscription.status != 'live' &&
					companyAdminSubscription.status != 'trial'))
		) {
			throw new CustomError(
				400,
				'You do not have any active subscription currently'
			);
		}

		const now = moment();

		if (
			!isValidSubscription &&
			!companyAdminSubscription &&
			((user.isSignupViaQuickBooks && !user.companies.length) ||
				(user.isSignupViaQuickBooks &&
					user.companies.length &&
					now.diff(moment(user.createdAt)) >= 14))
		) {
			throw new CustomError(
				400,
				'You do not have any active subscription currently'
			);
		}

		if (!isValidForLogin && !companyAdminRoleCompany) {
			throw new CustomError(
				401,
				'You are not authorized to access the system please contact your administrator.'
			);
		}
		if (!isValidForLoginWithRole && !companyAdminRoleCompany) {
			throw new CustomError(
				401,
				'You are not authorized to access the system please contact your administrator.'
			);
		}

		//   Credentials Valid
		const accessToken = generateAccessToken({
			id: user?.id,
			email: user.email,
			passwordResetDate: user?.passwordResetDate,
		});
		const refreshToken = generateRefreshToken({
			id: user?.id,
			email: user.email,
			passwordResetDate: user?.passwordResetDate,
		});

		await tokenRepository.create(
			user?.id,
			accessToken,
			refreshToken,
			machineId
		);

		return { accessToken, refreshToken, user };
	}

	async register(
		firstName: string,
		lastName: string,
		email: string,
		customerId: string,
		subscriptionData?: IZohoSubscription
	) {
		try {
			const user = await userRepository.register(
				firstName,
				lastName,
				email,
				customerId
			);

			// Generate forgot password token
			const forgotPasswordToken = generateForgotPasswordToken(
				{
					id: user?.id,
					email: email,
				},
				true
			);

			// Expire time for token
			const forgotPasswordTokenExpiresAt: string = (
				Date.now() + config.registerUrlExpireTime
			).toString();

			// Store token in the database
			await userRepository.update(user?.id, {
				forgotPasswordToken: forgotPasswordToken,
				forgotPasswordTokenExpiresAt: forgotPasswordTokenExpiresAt,
			});

			if (subscriptionData) {
				const userSubscription = {
					zohoSubscriptionId: subscriptionData.subscription_id,
					zohoProductId: subscriptionData.product_id,
					zohoSubscriptionPlan: subscriptionData.plan,
					createdTime: subscriptionData.created_time,
					status: subscriptionData.status,
					addons: subscriptionData.addons,
					expiresAt: subscriptionData.expires_at,
					zohoCustomerId: subscriptionData.customer.customer_id,
					userId: user.id,
				};

				await subscriptionRepository.createSubscription(userSubscription);
			}

			// Change Password url
			const url = `${config?.changePasswordReactUrl}?token=${forgotPasswordToken}&first=true`;
			// const url = `${config?.reactAppBaseUrl}/change-password?token=${forgotPasswordToken}`;

			const fullName =
				firstName || lastName ? firstName + ' ' + lastName : 'User';

			const emailContent = getRegisterEmailTemplate({ fullName, url });

			const mailOptions = {
				from: config.smtpEmail,
				to: email,
				subject: 'Welcome to CostAllocation Pro!',
				html: emailContent,
			};

			await sendEmail(mailOptions);
			return user;
		} catch (err) {
			throw err;
		}
	}

	async resendWelcomeEmail(userId: string) {
		const user = await prisma.user.findUniqueOrThrow({
			where: {
				id: userId,
			},
		});

		// Generate forgot password token
		const forgotPasswordToken = generateForgotPasswordToken(
			{
				id: user?.id,
				email: user.email,
			},
			true
		);

		// Expire time for token
		const forgotPasswordTokenExpiresAt: string = (
			Date.now() + config.registerUrlExpireTime
		).toString();

		// Store token in the database
		await userRepository.update(user?.id, {
			forgotPasswordToken: forgotPasswordToken,
			forgotPasswordTokenExpiresAt: forgotPasswordTokenExpiresAt,
		});

		// Change Password url
		const url = `${config?.changePasswordReactUrl}?token=${forgotPasswordToken}&first=true`;
		// const url = `${config?.reactAppBaseUrl}/change-password?token=${forgotPasswordToken}`;

		const fullName =
			user.firstName || user.lastName
				? user.firstName + ' ' + user.lastName
				: 'User';

		const emailContent = getRegisterEmailTemplate({ fullName, url });

		const mailOptions = {
			from: config.smtpEmail,
			to: user.email,
			subject: 'Welcome to CostAllocation Pro!',
			html: emailContent,
		};

		await sendEmail(mailOptions);
		return user;
	}

	async forgotPassword(email: string) {
		try {
			const user = await userRepository.getByEmail(email);

			if (!user) {
				return;
				const error = new CustomError(
					400,
					'Please check your inbox. If you have account with us you got email with reset instruction.'
				);
				throw error;
			}

			// Generate forgot password token
			const forgotPasswordToken = await generateForgotPasswordToken({
				id: user?.id,
				email: email,
			});

			// Expires in 1 hour
			const forgotPasswordTokenExpiresAt: string = (
				Date.now() + config.forgotPasswordUrlExpireTime
			).toString();

			// Store token in the database
			await userRepository.update(user?.id, {
				forgotPasswordToken: forgotPasswordToken,
				forgotPasswordTokenExpiresAt: forgotPasswordTokenExpiresAt,
			});

			const fullName =
				user?.firstName || user?.lastName
					? user?.firstName + ' ' + user?.lastName
					: 'User';

			// Verify token url
			const url = `${config?.resetPasswordReactUrl}?token=${forgotPasswordToken}&exp=${forgotPasswordTokenExpiresAt}`;
			// const url = `${config?.reactAppBaseUrl}/reset-password?token=${forgotPasswordToken}&exp=${forgotPasswordTokenExpiresAt}`;

			const emailContent = getForgotPasswordTemplate({
				fullName,
				url,
			});

			// Send the email with the reset token
			const mailOptions = {
				from: config.smtpEmail,
				to: email,
				subject: 'Reset Password - CostAllocation Pro',
				html: emailContent,
				// text: `Please use the following token to reset your password: ${forgotPasswordToken}`,
			};

			await sendEmail(mailOptions);
			return;
		} catch (err) {
			throw err;
		}
	}

	async verifyForgotPassword(token: string) {
		try {
			// If token not exists, send error message
			if (!token) {
				const err = new CustomError(401, 'Token missing');
				throw err;
			}

			const verified: any = verifyForgotPasswordToken(token);

			// If token not valid, send error message
			if (!verified) {
				const err = new CustomError(401, 'Invalid token');
				throw err;
			}

			// Find user by email from verified token
			const user = await userRepository.getByEmail(verified?.email as string);

			// If user not exists, send error message
			if (!user) {
				const err = new CustomError(401, 'Invalid token');
				throw err;
			}

			// If forgotPasswordToken not exists in db, send error message
			if (user.forgotPasswordToken !== token) {
				const err = new CustomError(401, 'Reset token has expired');
				throw err;
			}

			// If token is expired, send error message
			// if (Number(user.forgotPasswordTokenExpiresAt) < Date.now()) {
			// 	const err = new CustomError(401, 'Reset token has expired');
			// 	throw err;
			// }

			// Everything is valid, proceed further
			return true;
		} catch (err) {
			throw err;
		}
	}

	// async changePassword(email: string, password: string) {
	// 	try {
	// 		// Find user by email
	// 		const user = await userRepository.getByEmail(email);

	// 		// User not found
	// 		if (!user) {
	// 			const error = new CustomError(404, 'User not found');
	// 			throw error;
	// 		}

	// 		// Encrypt password
	// 		const hashedPassword = await hashPassword(password);

	// 		// Save password and remove forgot password tokens
	// 		const updatedUser = await userRepository.update(user?.id, {
	// 			password: hashedPassword,
	// 			forgotPasswordToken: null,
	// 			forgotPasswordTokenExpiresAt: null,
	// 		});

	// 		return updatedUser;
	// 	} catch (err) {
	// 		throw err;
	// 	}
	// }

	async changePassword(token: string, password: string) {
		try {
			// If token not exists, send error message
			if (!token) {
				const err = new CustomError(401, 'Token missing');
				throw err;
			}

			const verified: any = await verifyForgotPasswordToken(token);

			// If token not valid, send error message
			if (!verified) {
				const err = new CustomError(401, 'Invalid token');
				throw err;
			}

			// Find user by email from verified token
			const user = await userRepository.getByEmail(verified?.email as string);

			// If user not exists, send error message
			if (!user) {
				const err = new CustomError(401, 'Invalid token');
				throw err;
			}

			// If forgotPasswordToken not exists in db, send error message
			if (user.forgotPasswordToken !== token) {
				const err = new CustomError(401, 'Reset token has expired');
				throw err;
			}

			// If token is expired, send error message
			// if (Number(user.forgotPasswordTokenExpiresAt) < Date.now()) {
			// 	const err = new CustomError(401, 'Reset token has expired');
			// 	throw err;
			// }

			// Check if the new password is the same as the old one
			if (user?.password) {
				const encrypted = await comparePassword(password, user?.password);
				if (encrypted) {
					const error = new CustomError(
						422,
						'New password cannot be same as old password'
					);
					throw error;
				}
			}

			// Encrypt password
			const hashedPassword = await hashPassword(password);

			// Save password and remove forgot password tokens
			const updatedUser = await userRepository.update(user?.id, {
				password: hashedPassword,
				isVerified: true,
				passwordResetDate: new Date(),
				forgotPasswordToken: null,
				forgotPasswordTokenExpiresAt: null,
			});

			return updatedUser;
		} catch (err) {
			throw err;
		}
	}

	async updatePassword(userId: string, password: string) {
		const userData = await prisma.user.findFirst({
			where: {
				id: userId,
			},
		});

		if (!userData) {
			throw new CustomError(400, 'User Not Found');
		}

		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				password: await hashPassword(password),
			},
		});

		// Send the email with the reset token
		const mailOptions = {
			from: config.smtpEmail,
			to: userData.email,
			subject: 'Updated Password - CostAllocation Pro',
			html: getChangePasswordTemplate({
				fullName: userData.firstName + ' ' + userData.lastName,
				password,
			}),
			// text: `Please use the following token to reset your password: ${forgotPasswordToken}`,
		};

		await sendEmail(mailOptions);

		return {
			success: true,
		};
	}

	async verifyReCaptcha(token: string) {
		
		const secretKey = process.env.RECAPTCHA_SECRET_KEY;

		const isHuman = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
			method: "post",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
			},
			body: `secret=${secretKey}&response=${token}`
		})
			.then(res => res.json())
			.then(json => json.success)
			.catch(err => {
				throw new Error(`Error in Google Siteverify API. ${err.message}`)
			})

		if (token === null || !isHuman) {
			throw new CustomError(400, 'You are not human');
		}
		

		return  true
	}
}

export default new AuthServices();
