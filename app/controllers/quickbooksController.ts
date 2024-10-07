/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import config from '../../config';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import crypto from 'crypto';
import { RequestExtended } from '../interfaces/global';
import {
	AccountInterface,
	AuthTokenInterface,
} from '../interfaces/quickbooksInterfaces';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { CustomError } from '../models/customError';
import quickbooksAuthClient from '../quickbooksClient/quickbooksAuthClient';
import quickbooksClient from '../quickbooksClient/quickbooksClient';
import {
	companyRepository,
	companyRoleRepository,
	employeeCostRepository,
	employeeRepository,
	roleRepository,
	userRepository,
} from '../repositories';
import configurationRepository from '../repositories/configurationRepository';
import employeeServices from '../services/employeeServices';
import quickbookServices from '../services/quickbooksServices';
import timeActivityServices from '../services/timeActivityServices';
import { prisma } from '../client/prisma';
import moment from 'moment';
import { sortArray } from '../utils/utils';
import { logger } from '../utils/logger';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { awsConfig } from '../config/aws';
import { machine, userInfo } from 'os';
import authServices from '../services/authServices';
// import axios from 'axios';

// import timeActivityServices from '../services/timeActivityServices';

const client = new LambdaClient(awsConfig);
export const companyValidation = async (companyId: string) => {
	if (!companyId) {
		throw new CustomError(400, 'Company id is required');
	}

	const companyDetails = await companyRepository.getDetails(
		companyId as string
	);
	if (!companyDetails) {
		throw new CustomError(400, 'Company not found');
	}
};

class QuickbooksController {
	// Get Quickbooks Auth URI
	async getQuickbooksAuthUri(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const subId = req?.user?.id;
			// const subId = req.body.subId;
			const qboAuthorizeUrl = await quickbooksAuthClient.authorizeUri(subId);

			return DefaultResponse(
				res,
				200,
				'QuickBooks AuthUri retrieved successfully',
				qboAuthorizeUrl
			);
		} catch (err) {
			logger.error('Err: ', err);
			next(err);
		}
	}

	// Get Quickbooks Auth URI
	async getAppNowQuickbooksAuthUri(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			// const subId = req.body.subId;
			const qboAuthorizeUrl = await quickbooksAuthClient.authorizeUri('');

			return DefaultResponse(
				res,
				200,
				'QuickBooks AuthUri retrieved successfully',
				qboAuthorizeUrl
			);
		} catch (err) {
			logger.error('Err: ', err);
			next(err);
		}
	}

	// Quickbooks callback
	async quickbooksCallback(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Get company id from body - only for reconnecting company
			const companyId = req?.body?.companyId;

			// Fetch URL
			const url = String(req?.body?.url);

			const currentUrl = new URL(req?.body?.url);

			const searchParams = currentUrl?.searchParams;

			const userId = searchParams.get('state')!;

			const authToken: AuthTokenInterface =
				await quickbooksAuthClient.createAuthToken(url);

			const qboUserInfo = await quickbooksClient.GetUserinfo(
				authToken.access_token
			);

			if (!qboUserInfo.emailVerified) {
				throw new CustomError(400, 'QuickBooks email is not verified');
			}

			const qboCompanyInfo = await quickbooksClient.getCompanyInfo(
				authToken.access_token,
				authToken.realmId,
				authToken.refresh_token
			);

			if (qboCompanyInfo['Country'] !== 'US') {
				const error = new CustomError(400, 'Only US company can be connected!');
				throw error;
			}
			let finalCompanyDetails;

			if (companyId != 'undefined' && companyId !== null) {
				// checking is user permitted
				const isPermitted = await checkPermission(req, companyId, {
					permissionName: 'Integrations',
					permission: ['edit'],
				});
				if (!isPermitted) {
					throw new CustomError(403, 'You are not authorized');
				}

				const companyDetails = await companyRepository.getDetails(companyId);

				if (!companyDetails) {
					const error = new CustomError(400, 'Company not found');
					throw error;
				}

				if (companyDetails?.tenantID !== authToken.realmId) {
					const error = new CustomError(401, 'Can not connect this company');
					throw error;
				}

				finalCompanyDetails = await companyRepository.updateCompany(companyId, {
					accessToken: authToken.access_token,
					refreshToken: authToken.refresh_token,
					isConnected: true,
					tenantID: authToken.realmId,
					fiscalYear: qboCompanyInfo?.FiscalYearStartMonth,
				});

				// const syncData = await axios.post(
				// 	'https://vwarjgvafl.execute-api.us-east-1.amazonaws.com/default/cost-allocation-pro-dev-employeeDump',
				// 	{
				// 		accessToken: authToken.access_token,
				// 		refreshToken: authToken.refresh_token,
				// 		tenantID: authToken.realmId,
				// 		companyId: companyId,
				// 		employeeLastSyncDate: companyDetails?.employeeLastSyncDate,
				// 	},
				// 	{
				// 		headers: {
				// 			'x-api-key': 'CRkwakE0jkO3y4uNIBVZ8LeqJfK7rtHaXTR9NkXg',
				// 			'Content-Type': 'application/json',
				// 		},
				// 	}
				// );
			} else {
				// For first time company integration

				// Check if the same company is already connected
				const isAlreadyConnected = await companyRepository.getCompanyByTenantId(
					authToken.realmId
				);

				if (isAlreadyConnected) {
					const getSubscriptionDetails = await prisma.subscription.findFirst({
						where: {
							companyId: isAlreadyConnected.id,
						},
					});

					if (
						getSubscriptionDetails &&
						(getSubscriptionDetails.status === 'live' ||
							getSubscriptionDetails.status === 'trial')
					) {
						throw new CustomError(400, 'Company is already connected');
					}
				}
				const data = {
					tenantID: authToken.realmId,
					tenantName: qboCompanyInfo?.CompanyName,
					accessToken: authToken.access_token,
					refreshToken: authToken.refresh_token,
					accessTokenUTCDate: new Date(),
					isConnected: true,
					fiscalYear: qboCompanyInfo?.FiscalYearStartMonth,
				};
				finalCompanyDetails = await companyRepository.create(data);

				await companyRepository?.connectCompany(
					userId,
					finalCompanyDetails?.id
				);

				// await configurationRepository.createDefaultConfiguration(
				// 	finalCompanyDetails?.id
				// );

				// DO NOT REMOVE THIS CODE

				// LAMBDA FUNCTION CALL

				// const syncData = await axios.post(
				// 	config.employeeSyncLambdaEndpoint,
				// 	{
				// 		accessToken: authToken.access_token,
				// 		refreshToken: authToken.refresh_token,
				// 		tenantID: authToken.realmId,
				// 		companyId: finalCompanyDetails?.id,
				// 	},
				// 	{
				// 		headers: {
				// 			'x-api-key': config.employeeSyncLambdaApiKey,
				// 			'Content-Type': 'application/json',
				// 		},
				// 	}
				// );

				// const syncTimeActivities = await axios.post(
				// 	config.timeactivitySyncLambdaEndpoint,
				// 	{
				// 		accessToken: authToken.access_token,
				// 		refreshToken: authToken.refresh_token,
				// 		tenantID: authToken.realmId,
				// 		companyId: finalCompanyDetails?.id,
				// 	},
				// 	{
				// 		headers: {
				// 			'x-api-key': config.timeactivitySyncLambdaApiKey,
				// 			'Content-Type': 'application/json',
				// 		},
				// 	}
				// );

				// LAMBDA FUNCTION CALL

				// Do not remove API for employee sync
				const syncData = await employeeServices.syncEmployeeFirstTime({
					accessToken: authToken?.access_token,
					refreshToken: authToken?.refresh_token,
					tenantId: authToken?.realmId,
					companyId: finalCompanyDetails?.id,
				});
				// Do not remove API for employee sync

				// Lambda event
				// const input: any = {
				// 	// InvocationRequest
				// 	FunctionName: 'cost-allocation-pro-dev-timeLogsDump',
				// 	InvocationType: 'Event',
				// 	Payload: JSON.stringify({
				// 		accessToken: authToken.access_token,
				// 		refreshToken: authToken.refresh_token,
				// 		tenantID: authToken.realmId,
				// 		companyId: finalCompanyDetails?.id,
				// 	}),
				// };
				// const command = new InvokeCommand(input);
				// await client.send(command);

				// Do not remove API for timeativity sync
				timeActivityServices.lambdaSyncFunction({
					accessToken: authToken?.access_token,
					refreshToken: authToken?.refresh_token,
					tenantId: authToken?.realmId,
					companyId: finalCompanyDetails?.id,
				});
				// Do not remove API for timeativity sync

				// Update employee last sync date
				await prisma.company.update({
					where: {
						id: finalCompanyDetails?.id,
					},
					data: {
						employeeLastSyncDate: moment(new Date())
							.tz('America/Los_Angeles')
							.format(),
					},
				});

				// Update employee last sync date
				await prisma.company.update({
					where: {
						id: finalCompanyDetails?.id,
					},
					data: {
						timeActivitiesLastSyncDate: moment(new Date())
							.tz('America/Los_Angeles')
							.format(),
					},
				});

				//NOTE: Now we will create all default entries when first pay period will be create.

				// const fields = await configurationRepository.initialFieldSectionCreate(
				// 	finalCompanyDetails?.id
				// );

				// const employees = await employeeRepository.getAllEmployeesByCompanyId(
				// 	finalCompanyDetails?.id
				// );
				// const sectionWithFields =
				// 	await configurationRepository.getConfigurationField(
				// 		finalCompanyDetails?.id,
				// 		''
				// 	);
				// const sectionFields = sectionWithFields.reduce(
				// 	(accumulator: any, section) => {
				// 		accumulator.push(...section.fields);
				// 		return accumulator;
				// 	},
				// 	[]
				// );

				// const values = await employeeCostRepository.createInitialValues(
				// 	employees,
				// 	sectionFields,
				// 	finalCompanyDetails?.id
				// );

				// await employeeServices.syncEmployeesByLastSync(companyId);
			}

			return DefaultResponse(
				res,
				200,
				'Company connected successfully',
				finalCompanyDetails
			);
		} catch (err) {
			next(err);
		}
	}

	// Quickbooks callback
	async quickbooksGetAppNowCallback(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			// Get company id from body - only for reconnecting company
			// const companyId = req?.body?.companyId;

			// Fetch URL
			const url = String(req?.body?.url);

			// const currentUrl = new URL(req?.body?.url);

			// const searchParams = currentUrl?.searchParams;

			const machineId = req.body.machineId;

			const authToken: AuthTokenInterface =
				await quickbooksAuthClient.createAuthToken(url);

			const qboUserInfo = await quickbooksClient.GetUserinfo(
				authToken.access_token
			);

			if (!qboUserInfo.emailVerified) {
				throw new CustomError(400, 'QuickBooks email is not verified');
			}

			const qboCompanyInfo = await quickbooksClient.getCompanyInfo(
				authToken.access_token,
				authToken.realmId,
				authToken.refresh_token
			);

			if (qboCompanyInfo['Country'] !== 'US') {
				const error = new CustomError(400, 'Only US company can be connected!');
				throw error;
			}

			const user = await userRepository.getByEmail(qboUserInfo.email);
			if (user && !user.companies.length) {
				const {
					accessToken,
					refreshToken,
					user: userData,
				} = await authServices.ssoLogin(user, machineId);

				return DefaultResponse(res, 200, 'User logged in successfully', {
					id: user.id,
					email: user.email,
					firstName: user?.firstName,
					lastName: user?.lastName,
					phone: user?.phone,
					status: user?.status,
					accessToken,
					refreshToken,
				});
			}

			let companyAdminRole;

			//Create user
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

			let createUserId;

			if (!user) {
				const createUser = await authServices.register(
					'',
					'',
					qboUserInfo.email,
					''
				);

				createUserId = createUser.id;
			} else {
				createUserId = user.id;
			}

			await prisma.user.update({
				where: {
					id: createUserId,
				},
				data: {
					isSignupViaQuickBooks: true,
				},
			});
			await companyRoleRepository.create(createUserId, companyAdminRole?.id);

			const _user = await userRepository.getByEmail(qboUserInfo.email);

			if (!_user) {
				throw new CustomError(400, 'User not registered properly');
			}

			const {
				accessToken,
				refreshToken,
				user: userData,
			} = await authServices.ssoLogin(_user, machineId);

			const userId = _user.id;

			// For first time company integration

			// Check if the same company is already connected
			const isAlreadyConnected = await companyRepository.getCompanyByTenantId(
				authToken.realmId
			);

			if (isAlreadyConnected) {
				const getSubscriptionDetails = await prisma.subscription.findFirst({
					where: {
						companyId: isAlreadyConnected.id,
					},
				});

				if (
					getSubscriptionDetails &&
					(getSubscriptionDetails.status === 'live' ||
						getSubscriptionDetails.status === 'trial')
				) {
					throw new CustomError(400, 'Company is already connected');
				}
			}
			const data = {
				tenantID: authToken.realmId,
				tenantName: qboCompanyInfo?.CompanyName,
				accessToken: authToken.access_token,
				refreshToken: authToken.refresh_token,
				accessTokenUTCDate: new Date(),
				isConnected: true,
				fiscalYear: qboCompanyInfo?.FiscalYearStartMonth,
			};
			const finalCompanyDetails = await companyRepository.create(data);

			await companyRepository?.connectCompany(userId, finalCompanyDetails?.id);

			const getSubscriptionDetails = await prisma.subscription.findFirst({
				where: {
					company: {
						tenantID: authToken.realmId,
					},
				},
			});

			if (getSubscriptionDetails) {
				employeeServices.syncEmployeeFirstTime({
					accessToken: authToken?.access_token,
					refreshToken: authToken?.refresh_token,
					tenantId: authToken?.realmId,
					companyId: finalCompanyDetails?.id,
				});

				timeActivityServices.lambdaSyncFunction({
					accessToken: authToken?.access_token,
					refreshToken: authToken?.refresh_token,
					tenantId: authToken?.realmId,
					companyId: finalCompanyDetails?.id,
				});
			}

			// Do not remove API for timeativity sync

			return DefaultResponse(res, 200, 'User logged in successfully', {
				id: _user.id,
				email: _user.email,
				firstName: _user?.firstName,
				lastName: _user?.lastName,
				phone: _user?.phone,
				status: _user?.status,
				accessToken,
				refreshToken,
				finalCompanyDetails,
			});
		} catch (err) {
			next(err);
		}
	}

	//  Get Quickbooks Auth URI for SSO
	async getQuickbooksSSOAuthUri(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const qboAuthorizeUrl = await quickbooksAuthClient.ssoAuthorizeUri('');
			// const qboAuthorizeUrl = await quickbooksAuthClient.authorizeUri('');

			return DefaultResponse(
				res,
				200,
				'QuickBooks AuthUri retrieved successfully',
				qboAuthorizeUrl
			);
		} catch (err) {
			logger.error('Err: ', err);
			next(err);
		}
	}

	// Get Quickbooks Callback for SSO
	async quickbooksSSOCallback(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Fetch URL
			const url = String(req?.body?.url);

			// const currentUrl = new URL(req?.body?.url);
			const machineId = req.body?.machineId;

			const authToken: AuthTokenInterface =
				await quickbooksAuthClient.ssoCreateAuthToken(url);

			const qboUserInfo = await quickbooksClient.GetUserinfo(
				authToken.access_token
			);

			if (!qboUserInfo.emailVerified) {
				throw new CustomError(400, 'Your QuickBooks email is not verified');
			}

			// Check if user is already in User table

			const user = await userRepository.getByEmail(qboUserInfo.email);

			if (!user) {
				throw new CustomError(
					400,
					'You need to buy zoho subscription to register in CostAllocation Pro.'
				);
			}

			const {
				accessToken,
				refreshToken,
				user: userData,
			} = await authServices.ssoLogin(user, machineId);

			return DefaultResponse(res, 200, 'User logged in successfully', {
				id: user.id,
				email: user.email,
				firstName: user?.firstName,
				lastName: user?.lastName,
				phone: user?.phone,
				status: user?.status,
				accessToken,
				refreshToken,
			});
		} catch (err) {
			next(err);
		}
	}

	async quickBooksCallbackWithSignAndSignUp(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			const data = req.body;
			const url = String(data.url);

			// const currentUrl = new URL(req?.body?.url);
			const machineId = data.machineId;

			const authToken: AuthTokenInterface =
				await quickbooksAuthClient.ssoCreateAuthToken(url);

			const qboUserInfo = await quickbooksClient.GetUserinfo(
				authToken.access_token
			);

			if (!qboUserInfo.emailVerified) {
				throw new CustomError(400, 'Your QuickBooks email is not verified');
			}

			const user = await userRepository.getByEmail(qboUserInfo.email);
			if (user) {
				const {
					accessToken,
					refreshToken,
					user: userData,
				} = await authServices.ssoLogin(user, machineId);

				return DefaultResponse(res, 200, 'User logged in successfully', {
					id: user.id,
					email: user.email,
					firstName: user?.firstName,
					lastName: user?.lastName,
					phone: user?.phone,
					status: user?.status,
					accessToken,
					refreshToken,
				});
			}

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

			const createUser = await authServices.register(
				'',
				'',
				qboUserInfo.email,
				''
			);
			await prisma.user.update({
				where: {
					id: createUser.id,
				},
				data: {
					isSignupViaQuickBooks: true,
				},
			});
			await companyRoleRepository.create(createUser?.id, companyAdminRole?.id);

			const _user = await userRepository.getByEmail(qboUserInfo.email);

			if (!_user) {
				throw new CustomError(400, 'User not registered properly');
			}

			const {
				accessToken,
				refreshToken,
				user: userData,
			} = await authServices.ssoLogin(_user, machineId);

			return DefaultResponse(res, 200, 'User logged in successfully', {
				id: _user.id,
				email: _user.email,
				firstName: _user?.firstName,
				lastName: _user?.lastName,
				phone: _user?.phone,
				status: _user?.status,
				accessToken,
				refreshToken,
			});
		} catch (error) {
			next(error);
		}
	}

	// Disconnect Quickbooks company
	async quickbooksDisconnect(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const companyId = req.body.companyId;

			// checking is user permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Integrations',
				permission: ['delete'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const companyDetails = await companyRepository.getDetails(companyId);
			try {
				await quickbooksAuthClient.revokeToken(
					companyDetails?.refreshToken as string
				);
			} catch (error) {
				logger.error(error);
			}

			await companyRepository.updateCompany(companyId, {
				isConnected: false,
				accessToken: null,
				refreshToken: null,
			});

			return DefaultResponse(
				res,
				200,
				'QuickBooks company disconnected successfully'
			);
		} catch (err) {
			next(err);
		}
	}

	// Update Quickbooks company status - sync On/Off
	async updateCompanyStatus(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const { companyId, status } = req.body;

			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			const updatedCompanyStatus = await companyRepository.updateStatus(
				companyId,
				status
			);

			return DefaultResponse(
				res,
				200,
				'Status updated successfully',
				updatedCompanyStatus
			);
		} catch (err) {
			next(err);
		}
	}

	// Get All Employees
	async getAllQBEmployees(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse = await quickbookServices.getAccessToken(companyId);

			// Get All Employees From Quickbooks
			const allEmployees: any = await quickbooksClient.getEmployees(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			return DefaultResponse(
				res,
				200,
				'All employees fetched ',
				allEmployees?.QueryResponse?.Employee
			);
		} catch (err) {
			next(err);
		}
	}

	async createQBEmployees(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;
			const employeeName = req.body.employeeName;

			// Get access token
			const authResponse = await quickbookServices.getAccessToken(companyId);

			// Get All Employees From Quickbooks
			const employee: any = await quickbooksClient.createEmployee(
				authResponse?.accessToken as string,
				companyId,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string,
				{ employeeName }
			);

			return DefaultResponse(
				res,
				200,
				'employee created successfully',
				employee
			);
		} catch (error: any) {
			let customErrorMessage = 'Error while creating new employee';

			if (
				error &&
				error?.Fault &&
				error.Fault?.Error &&
				error.Fault.Error.length
			) {
				customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;

				const newErr = new CustomError(400, customErrorMessage);

				next(newErr);
			} else {
				next(error);
			}
		}
	}

	// Get All Accounts
	async getAllAccounts(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse = await quickbookServices.getAccessToken(companyId);

			if (authResponse?.status == true) {
				// Get All Accounts From Quickbooks
				const accounts: any = await quickbooksClient.getAllAccounts(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string
				);

				// Accounts with account number
				const finalAccounts = accounts?.QueryResponse?.Account?.map(
					(account: any) => {
						if (account?.AcctNum) {
							return {
								...account,
								Name: `${account?.AcctNum} - ${account?.Name}`,
							};
						} else {
							return account;
						}
					}
				);
				const data = sortArray(finalAccounts, 'asc', 'Name');

				return DefaultResponse(
					res,
					200,
					'All accounts fetched successfully',
					data
				);
			} else {
				return DefaultResponse(res, 200, 'Company status is not active');
			}
		} catch (err) {
			next(err);
		}
	}

	// Get All Customers
	async getAllCustomer(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse = await quickbookServices.getAccessToken(companyId);

			if (authResponse?.status == true) {
				// Get All Customers from Quickbooks
				const customers: any = await quickbooksClient.getAllCustomers(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string
				);

				await prisma.company.update({
					where: {
						id: companyId,
					},
					data: {
						customerLastSyncDate: moment(new Date())
							.tz('America/Los_Angeles')
							.format(),
					},
				});

				return DefaultResponse(
					res,
					200,
					'All customers fetched successfully',
					customers?.QueryResponse?.Customer
				);
			} else {
				return DefaultResponse(res, 200, 'Company status is not active');
			}
		} catch (err) {
			next(err);
		}
	}

	// Get All Classes
	async getAllClasses(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse = await quickbookServices.getAccessToken(companyId);

			if (authResponse?.status == true) {
				// Get All Classes From Quickbooks
				const classes: any = await quickbooksClient.getAllClasses(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string
				);

				const finalClasses = classes?.QueryResponse?.Class?.filter(
					(item: any) => item?.SubClass === true
				);

				await prisma.company.update({
					where: {
						id: companyId,
					},
					data: {
						classLastSyncDate: moment(new Date())
							.tz('America/Los_Angeles')
							.format(),
					},
				});

				return DefaultResponse(
					res,
					200,
					'All classes fetched successfully',
					classes.QueryResponse ? classes.QueryResponse.Class : []
				);
			} else {
				return DefaultResponse(res, 200, 'Company status is not active');
			}
		} catch (err) {
			next(err);
		}
	}

	// Get Company Info
	async getCompanyInfo(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse: any = await quickbookServices.getAccessToken(
				companyId
			);

			// Get Company Details From Quickbooks
			const qboCompanyInfo = await quickbooksClient.getCompanyInfo(
				authResponse.accessToken,
				authResponse.tenantID,
				authResponse.refreshToken
			);

			return DefaultResponse(
				res,
				200,
				'Company details fetched successfully',
				qboCompanyInfo
			);
		} catch (err) {
			next(err);
		}
	}

	// Get All TimeActivities
	async getAllTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;

			// Get access token
			const authResponse: any = await quickbookServices.getAccessToken(
				companyId
			);

			// Get Company Details From Quickbooks
			const qboCompanyInfo = await quickbooksClient.getAllTimeActivities(
				authResponse.accessToken,
				authResponse.tenantID,
				authResponse.refreshToken,
				companyId
			);

			return DefaultResponse(
				res,
				200,
				'Time activities fetched successfully',
				qboCompanyInfo
			);
		} catch (err) {
			next(err);
		}
	}

	// Get Closing date
	async getClosingDateList(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const companyId = req.query.companyId;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(400, 'Company not found');
			}

			// Get access token
			const authResponse: any = await quickbookServices.getAccessToken(
				companyId as string
			);

			const closingDateList = await quickbooksClient.getClosingDate(
				authResponse.accessToken,
				authResponse.tenantID,
				authResponse.refreshToken,
				companyId as string,
				req.query
			);
			return DefaultResponse(
				res,
				200,
				'Closing dates fetched successfully',
				closingDateList
			);
		} catch (err) {
			next(err);
		}
	}

	// Create Chart Of Account
	async createChartOfAccount(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const companyId = req.body.companyId;
			const {
				accountType = 'Expense',
				currencyValue = 'USD',
				accountNum,
				accountName,
				detailType = 'Travel',
			} = req.body;

			checkValidation(req);
			companyValidation(companyId);

			const data: AccountInterface = {
				accountName: accountName,
				accountNum: accountNum,
				detailType: detailType,
				accountType: accountType,
				currencyValue: currencyValue,
			};

			if (!detailType) {
				delete data['detailType'];
			}

			if (!accountNum) {
				delete data['accountNum'];
			}

			// Get access token
			const authResponse: any = await quickbookServices.getAccessToken(
				companyId as string
			);

			const closingDateList = await quickbooksClient.createChartOfAccount(
				authResponse.accessToken,
				authResponse.tenantID,
				authResponse.refreshToken,
				data
			);
			return DefaultResponse(
				res,
				200,
				'Closing dates fetched successfully',
				closingDateList
			);
		} catch (error: any) {
			let customErrorMessage = 'Error while creating new Chart Of Account';

			if (
				error &&
				error?.Fault &&
				error.Fault?.Error &&
				error.Fault.Error.length
			) {
				if (error?.Fault?.Error[0]?.code === '6000') {
					customErrorMessage =
						'Another account is already using this account number. Please use another account number.';
				} else {
					customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;
				}
				const newErr = new CustomError(400, customErrorMessage);

				next(newErr);
			} else {
				next(error);
			}
		}
	}

	async getCustomerOptions(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		// Check validation for company id
		checkValidation(req);

		const companyId = req.body.companyId;

		// Get access token
		const authResponse = await quickbookServices.getAccessToken(companyId);

		if (authResponse?.status == true) {
			// Get All Customers from Quickbooks
			const customers: any = await quickbooksClient.getAllCustomers(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			const formattedCustomers = customers?.QueryResponse?.Customer?.map(
				(customer: any) => {
					return {
						value: customer.Id,
						Id: customer.Id,
						parentId: customer?.ParentRef ? customer?.ParentRef.value : null,
						title: customer.DisplayName,
					};
				}
			);

			let finalCustomers = [];

			if (customers.QueryResponse) {
				finalCustomers = quickbookServices.buildHierarchy(
					formattedCustomers,
					null
				);
			}

			return DefaultResponse(res, 200, 'Customers fetched successfully', [
				{ value: '', title: 'Select Customer', children: [] },
				...finalCustomers,
			]);
		}
	}

	async getClassOptions(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		// Check validation for company id
		checkValidation(req);

		const companyId = req.body.companyId;

		// Get access token
		const authResponse = await quickbookServices.getAccessToken(companyId);

		if (authResponse?.status == true) {
			// Get All Customers from Quickbooks
			const classes: any = await quickbooksClient.getAllClasses(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			const formattedClasses = classes?.QueryResponse?.Class?.map(
				(singleClass: any) => {
					return {
						value: singleClass.Id,
						Id: singleClass.Id,
						parentId: singleClass?.ParentRef
							? singleClass?.ParentRef.value
							: null,
						title: singleClass.FullyQualifiedName,
						disabled: false,
					};
				}
			);

			let finalClasses = [];
			if (classes?.QueryResponse) {
				finalClasses = quickbookServices.buildHierarchy(formattedClasses, null);
			}

			return DefaultResponse(res, 200, 'Classes fetched successfully', [
				{ value: '', title: 'Select Class', children: [] },
				...finalClasses,
			]);
		}
	}

	// Create Chart Of Account
	async quickbooksWebhook(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const webhookPayload = JSON.stringify(req.body);
			const signature = req.get('intuit-signature');

			if (!signature) {
				throw new CustomError(401, 'FORBIDDEN');
			}

			if (!webhookPayload) {
				return DefaultResponse(res, 200, 'success');
			}
			const hash = crypto
				.createHmac(
					'sha256',
					process.env.QUICKBOOKS_WEBHOOK_VERIFY_TOKEN as string
				)
				.update(webhookPayload)
				.digest('base64');
			if (signature === hash) {
				if (
					JSON.parse(webhookPayload)?.eventNotifications[0].dataChangeEvent
						.entities[0].operation === 'Delete' &&
					JSON.parse(webhookPayload)?.eventNotifications[0].dataChangeEvent
						.entities[0].name === 'JournalEntry'
				) {
					const quickbooksCompanyId =
						JSON.parse(webhookPayload)?.eventNotifications[0].realmId;
					const qboJournalTrnId =
						JSON.parse(webhookPayload)?.eventNotifications[0].dataChangeEvent
							.entities[0].id;

					const systemCompanyDetails = await prisma.company.findFirst({
						where: {
							tenantID: quickbooksCompanyId,
						},
					});

					const updateJournalStatus = await prisma.journal.updateMany({
						where: {
							companyId: systemCompanyDetails?.id,
							qboJournalTrnId: qboJournalTrnId,
						},
						data: {
							status: 3,
						},
					});

					return DefaultResponse(
						res,
						200,
						'update  journal data  successfully'
					);
				} else {
					return DefaultResponse(res, 200, 'success');
				}
			}
		} catch (error: any) {
			next(error);
		}
	}
}

export default new QuickbooksController();
