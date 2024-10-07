/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import config from '../../config';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import {
	companyRoleRepository,
	roleRepository,
	subscriptionRepository,
	userRepository,
} from '../repositories';
import tokenRepository from '../repositories/tokenRepository';
import authServices from '../services/authServices';
import { CustomError } from '../models/customError';
import {
	checkTokens,
	generateAccessToken,
	generateRefreshToken,
	verifyAccessToken,
} from '../helpers/tokenHelper';
import { CompanyInfo } from '../interfaces';
import { logger } from '../utils/logger';
import { prisma } from '../client/prisma';
import { getAddNewSubscriptionEmail } from '../helpers/emailTemplateHelper';
import sendEmail from '../helpers/emailHelper';
import employeeServices from '../services/employeeServices';
import timeActivityServices from '../services/timeActivityServices';
import quickbooksServices from '../services/quickbooksServices';

class AuthController {
	// Register User
	async register(req: Request, res: Response, next: NextFunction) {
		try {
			const { data } = req.body;

			if (!data) {
				throw new CustomError(400, 'Data can not be empty');
			}

			const subscriptionData = data.subscription;

			const customer = data?.subscription?.customer;

			const firstName = customer?.first_name;
			const lastName = customer?.last_name;
			const email = customer?.email?.toLowerCase();
			const customerId = customer?.customer_id;
			let companyAdminRole;

			// Check if company admin role exists
			companyAdminRole = await roleRepository.checkAdmin('Company Admin');

			if (!companyAdminRole) {
				companyAdminRole = await roleRepository.createRole(
					'Company Admin',
					'All company permissions granted',
					false,
					true
				);
			}

			// Check if admin role exists
			const isAdminExist = await roleRepository.checkAdmin('admin');

			if (!isAdminExist) {
				await roleRepository.createRole(
					'Admin',
					'All permissions granted',
					true,
					false
				);
			}

			// If email already exists

			const isExist = await userRepository.getByEmail(email);
			if (isExist) {
				const userSubscription = {
					zohoSubscriptionId: subscriptionData.subscription_id,
					zohoProductId: subscriptionData.product_id,
					zohoSubscriptionPlan: subscriptionData.plan,
					createdTime: subscriptionData.created_time,
					status: subscriptionData.status,
					addons: subscriptionData.addons,
					expiresAt: subscriptionData.expires_at,
					zohoCustomerId: subscriptionData.customer.customer_id,
					userId: isExist.id,
				};

				// const companyData = await prisma.companyRole.findFirst({
				// 	where: {
				// 		userId: isExist.id,
				// 		roleId: companyAdminRole.id,
				// 	},
				// });

				// if (companyData) {
				// }
				
				const checkExistingSubscription = await prisma.subscription.findFirst({
					where: {
						zohoSubscriptionId: userSubscription.zohoSubscriptionId
					}
				});
				
				if(checkExistingSubscription) {
					return {
						success: true
					};
				}

				const subscription = await prisma.subscription.create({
					data: userSubscription
				})

				await prisma.user.update({
					where: {
						id: isExist.id
					},
					data: {
						customerId: customerId
					}
				})

				let companyIdWithoutSubscription;

				isExist.companies.forEach((company) => {
					if (!company.company?.Subscription.length) {
						companyIdWithoutSubscription = company.company?.id as string;
					}
				})

				if (!companyIdWithoutSubscription) {
					const url = `${process.env.REACT_APP_BASE_URL}?openDrawer=true&drawerSelection=Integrations`;

					const fullName =
						firstName || lastName ? firstName + ' ' + lastName : 'User';

					const emailContent = getAddNewSubscriptionEmail({ fullName, url });

					const mailOptions = {
						from: config.smtpEmail,
						to: email,
						subject: 'Your CostAllocation Pro Subscription Update',
						html: emailContent,
					};

					await sendEmail(mailOptions);
				} else {
					await prisma.subscription.update({
						where: {
							id: subscription.id
						},
						data: {
							companyId: companyIdWithoutSubscription
						}
					});
	
					const authResponse = await quickbooksServices.getAccessToken(companyIdWithoutSubscription as unknown as string);
	
					if (authResponse?.accessToken && authResponse.refreshToken && authResponse.tenantID) {
						employeeServices.syncEmployeeFirstTime({
							accessToken: authResponse.accessToken,
							refreshToken: authResponse.refreshToken,
							tenantId: authResponse.tenantID,
							companyId: authResponse.id,
						});
	
						timeActivityServices.lambdaSyncFunction({
							accessToken: authResponse.accessToken,
							refreshToken: authResponse.refreshToken,
							tenantId: authResponse.tenantID,
							companyId: authResponse.id,
						});
					}
				}
				// throw new CustomError(400, 'Email already exists');
			}

			// Create new user
			if (!isExist) {
				const user = await authServices.register(
					firstName,
					lastName,
					email,
					customerId,
					data.subscription
				);
				await companyRoleRepository.create(user?.id, companyAdminRole?.id);
			}

			// TEMP Until we not create the company
			// const companyData = {
			// 	tenantID: Math.random().toString(),
			// 	tenantName: 'Organization 1',
			// };

			// const company = await companyRepository.create(companyData);

			// await companyRepository?.connectCompany(user.id, company?.id);

			// TEMP END Until we not create the company

			// Uncomment code
			// Create new record in companyRole

			return DefaultResponse(
				res,
				201,
				'User registration successful, please check your email for accessing your account'
			);
		} catch (err) {
			logger.error(err);
			next(err);
		}
	}

	// Login User
	async login(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { email, password, machineId, reCaptchaValue } = req.body;

			const isHuman = await authServices.verifyReCaptcha(reCaptchaValue);

			if (!isHuman) {
				throw new CustomError(401, 'You are not human');
			}

			const { accessToken, refreshToken, user, isSuperAdmin } = await authServices.login(
				email?.toLowerCase(),
				password,
				machineId
			);

			// req.session.accessToken = accessToken;
			// req.session.refreshToken = refreshToken;

			const {
				password: userPassword,
				forgotPasswordToken,
				forgotPasswordTokenExpiresAt,
				isVerified,
				companies,
				...finalUser
			} = user;

			return DefaultResponse(res, 200, 'User logged in successfully', {
				...finalUser,
				accessToken,
				refreshToken,
				isSuperAdmin
			});
		} catch (err) {
			next(err);
		}
	}

	// Forgot Password
	async forgotPassword(req: Request, res: Response, next: NextFunction) {
		try {
			checkValidation(req);

			const { email } = req.body;

			await authServices.forgotPassword(email);

			return DefaultResponse(
				res,
				200,
				'Please check your inbox. If you have account with us you got email with reset instruction.'
				// 'Password reset link sent to your email address'
			);
		} catch (err) {
			logger.error('Err: ', err);
			next(err);
		}
	}

	async resendWelcomeEmail(req: RequestExtended, res: Response, next: NextFunction) {
		try {

			if (req.user.id != `${process.env.SUPER_ADMIN_USER_ID}`) {
				throw new CustomError(401, 'Unauthorized you are not allow to perform this action')
			}

			const { userId } = req.body;

			const data = await authServices.resendWelcomeEmail(userId);

			return DefaultResponse(
				res,
				200,
				'Please check your inbox. If you have account with us you got email with reset instruction.',
				data
			);
		} catch (err) {
			logger.error('Err: ', err);
			next(err);
		}
	}

	// Verify Forgot Password Token
	async verifyForgotPasswordToken(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			const { token } = req.query;
			await authServices.verifyForgotPassword(token as string);

			return DefaultResponse(
				res,
				200,
				'Reset Password Token verified successfully'
			);
		} catch (err) {
			next(err);
		}
	}

	// Change Password
	async changePassword(req: Request, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { password } = req.body;
			const { token } = req.params;

			const user = await authServices.changePassword(token, password);

			return DefaultResponse(
				res,
				200,
				'User password changed successfully',
				user
			);
		} catch (err) {
			next(err);
		}
	}

	// Fetch Profile
	async fetchProfile(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const profile = await userRepository.getById(req.user.id);

			if (profile.id === `${process.env.SUPER_ADMIN_USER_ID}`) {

				return DefaultResponse(
					res,
					200,
					'Profile fetched successfully',
					{ ...profile, isSuperAdmin: true }
				);
			}

			const _companies = profile.companies;

			profile.companies = profile?.companies.filter((e) =>
				e.company &&
				e.company.Subscription &&
				e.company.Subscription.length &&
				e.company?.Subscription.every((x) => x.status === 'live' || x.status === 'trial')
			)

			if (!profile.companies.length) {
				if (profile.isSignupViaQuickBooks) {
					profile.companies = _companies;
				}
			}

			// If the user has bought a subscription then there is no company or role assigned to that user
			const user: any = await companyRoleRepository.getRecordWithNullCompanyId(
				req.user.id
			);

			const subscriptionWithNullCompany = await subscriptionRepository.findSubscriptionByUserIdWithNullCompany(
				profile.id
			)

			let profileData: any;
			if (user.length > 0) {
				// Check if the user is companyAdmin
				const isCompanyAdmin = await roleRepository.checkCompanyAdminRole(
					user[0]?.role?.id
				);
				if (isCompanyAdmin) {
					profileData = {
						...profile,
						isFirstCompanyAdmin: true,
					};
				} else {
					profileData = {
						...profile,
						isFirstCompanyAdmin: false,
					};
				}
			} else if (subscriptionWithNullCompany) {
				profileData = {
					...profile,
					isFirstCompanyAdmin: true,
				};
			} else {
				profileData = {
					...profile,
					isFirstCompanyAdmin: false,
				};
			}

			// Check if user is active in any of the company

			if (profile?.companies && profile.companies?.length > 0) {
				const isActiveInAnyCompany =
					await companyRoleRepository.getUserWithRole({
						userId: profile.id,
						companies: profile.companies,
					});

				profileData['isActiveInAnyCompany'] = isActiveInAnyCompany;
			} else {
				profileData['isActiveInAnyCompany'] = false;
			}

			const userByEmail: any = await userRepository.getByEmail(
				profileData?.email
			);

			if (userByEmail?.companies?.length > 0) {
				const isValidForLoginWithRole = userByEmail?.companies?.some(
					(singleCompany: CompanyInfo) => {
						return singleCompany?.role?.status;
					}
				);

				if (!isValidForLoginWithRole) {
					throw new CustomError(
						204,
						'You are not authorized to access the system please contact your administrator.'
					);
				}
			}

			return DefaultResponse(
				res,
				200,
				'Profile fetched successfully',
				profileData
			);
		} catch (err) {
			next(err);
		}
	}

	// Update Profile
	async updateProfile(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const { email, ...data } = req.body;
			if (req?.file?.location) {
				const fileUrl = req.file.location.replace(config.s3BaseUrl, '');
				data.profileImg = fileUrl;
			}
			// Form data giving the null in string
			if (data.profileImg === 'null') {
				data.profileImg = null;
			}
			const profile = await userRepository.update(req.user.id, data);

			if (profile.id === `${process.env.SUPER_ADMIN_USER_ID}`) {

				return DefaultResponse(
					res,
					200,
					'Profile fetched successfully',
					{ ...profile, isSuperAdmin: true }
				);
			}

			const _companies = profile.companies;

			profile.companies = _companies.filter((e) =>
				e.company &&
				e.company.Subscription &&
				e.company.Subscription.length &&
				e.company?.Subscription.every((x) => x.status === 'live' || x.status === 'trial')
			)

			if (!profile.companies.length) {
				if (profile.isSignupViaQuickBooks) {
					profile.companies = _companies;
				}
			}

			// If the user has bought a subscription then there is no company or role assigned to that user
			const user: any = await companyRoleRepository.getRecordWithNullCompanyId(
				req.user.id
			);

			const subscriptionWithNullCompany = await subscriptionRepository.findSubscriptionByUserIdWithNullCompany(
				profile.id
			)

			let profileData;
			if (user.length > 0) {
				// Check if the user is companyAdmin
				const isCompanyAdmin = await roleRepository.checkCompanyAdminRole(
					user[0]?.role?.id
				);
				if (isCompanyAdmin) {
					profileData = {
						...profile,
						isFirstCompanyAdmin: true,
					};
				} else {
					profileData = {
						...profile,
						isFirstCompanyAdmin: false,
					};
				}
			} else if (subscriptionWithNullCompany) {
				profileData = {
					...profile,
					isFirstCompanyAdmin: true,
				};
			} else {
				profileData = {
					...profile,
					isFirstCompanyAdmin: false,
				};
			}

			return DefaultResponse(
				res,
				200,
				'Profile updated successfully',
				profileData
			);
		} catch (err) {
			logger.error(err);
			next(err);
		}
	}

	// Logout

	async logout(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const accessToken = req.accessToken;
			const refreshToken = req.refreshToken;

			const machineId = req.body.machineId;
			const deleted = await tokenRepository.delete(
				req.user.id,
				accessToken,
				refreshToken,
				machineId
			);
			return DefaultResponse(res, 200, 'User logged out successfully');
		} catch (err) {
			next(err);
		}
	}

	// Refresh Token
	async refreshToken(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const { accessToken, refreshToken } = req.body;

			if (!accessToken || !refreshToken) {
				throw new CustomError(401, 'Unauthorized user');
			}

			const verifiedAccessToken: any = await verifyAccessToken(accessToken);

			if (!verifiedAccessToken) {
				throw new CustomError(401, 'Invalid access token');
			}

			const isValid = await checkTokens(
				verifiedAccessToken?.id,
				accessToken,
				refreshToken
			);

			if (!isValid) {
				const error = new CustomError(401, 'Token expired');
				return next(error);
			}

			// Generate new access token
			const newAccessToken = generateAccessToken({
				id: verifiedAccessToken?.id,
				email: verifiedAccessToken?.email,
			});

			// Generate new refresh token
			const newRefreshToken = generateRefreshToken({
				id: verifiedAccessToken?.id,
				email: verifiedAccessToken?.email,
			});

			await tokenRepository?.updateTokens(
				verifiedAccessToken?.id,
				accessToken,
				refreshToken,
				newAccessToken,
				newRefreshToken
			);

			const data = {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			};

			return DefaultResponse(res, 200, 'Refreshed token', data);
		} catch (err) {
			next(err);
		}
	}

	//Update Password
	async changePasswordByAdmin(req: RequestExtended, res: Response, next: NextFunction) {
		try {

			if (req.user.id != process.env.SUPER_ADMIN_USER_ID) {
				throw new CustomError(401, 'Unauthorized')
			}

			const data = await authServices.updatePassword(req.body.userId, req.body.password);

			return DefaultResponse(res, 200, 'Password successfully updated', data);

		} catch (error) {
			next(error);
		}
	}

	async verifyReCaptcha(req: RequestExtended, res: Response, next: NextFunction) {
		try {


			const data = await authServices.verifyReCaptcha(req.body.token);

			// const data = await authServices.updatePassword(req.body.userId, req.body.password);

			return DefaultResponse(res, 200, 'Recaptcha successfully verified', data);

		} catch (error) {
			next(error);
		}
	}

}

export default new AuthController();
