import Moment from 'moment-timezone';
import config from '../../config';
import { supportedQBOCurrencies } from '../constants/data';
import { prisma } from '../client/prisma';
import { QBOModules, SyncLogsStatus } from '../enum';
import {
	AccountInterface,
	QuickBooksChartOfAccount,
} from '../interfaces/quickbooksInterfaces';
import axios from 'axios';
import { employeeRepository } from '../repositories';

/* eslint-disable @typescript-eslint/no-var-requires */
const QuickBooks = require('node-quickbooks');

class QuickbooksClient {
	async getCompanyInfo(
		accessToken: string,
		realmId: string,
		refreshToken: string
	): Promise<any> {
		return new Promise((resolve, reject) => {
			const qbo = new QuickBooks(
				config.quickbooksClientId,
				config.quickbooksClientSecret,
				accessToken,
				true,
				realmId,
				config.quickbooksEnvironment == 'sandbox' ? true : false,
				true,
				null,
				'2.0',
				refreshToken
			);
			qbo.getCompanyInfo(realmId, async function (err: any, response: any) {
				if (err) {
					reject(err);
				} else {
					resolve(response);
				}
			});
		});
	}

	async GetUserinfo(accessToken: string) {
		const response = await axios.get(config.quickbooksUserInfoUri, {
			headers: {
				Authorization: 'Bearer ' + accessToken,
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		});
		return response.data;
	}

	async getEmployees(
		accessToken: string,
		realmId: string,
		refreshToken: string
	) {
		return new Promise((resolve, reject) => {
			const qbo = new QuickBooks(
				config.quickbooksClientId,
				config.quickbooksClientSecret,
				accessToken,
				true,
				realmId,
				config.quickbooksEnvironment == 'sandbox' ? true : false,
				true,
				null,
				'2.0',
				refreshToken
			);

			qbo.findEmployees(
				[{ field: 'Active', value: [true, false], operator: 'IN' }],
				// [{ field: 'fetchAll', value: true }],
				async function (err: any, response: any) {
					if (err) {
						reject(err);
					} else {
						resolve(response);
					}
				}
			);
		});
	}

	async getAllAccounts(
		accessToken: string,
		realmId: string,
		refreshToken: string
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				qbo.findAccounts(
					[
						{
							field: 'AccountType',
							value: [
								'Expense',
								'Other Expense',
								'Cost of Goods Sold',
								'Other Current Liability',
								'Long Term Liability',
							],
							operator: 'IN',
						},
						{ field: 'fetchAll', value: true },
						{ field: 'asc', value: 'Name' },
					],
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async getAllClasses(
		accessToken: string,
		realmId: string,
		refreshToken: string
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				qbo.findClasses(
					[
						{ field: 'fetchAll', value: true },
						{ field: 'Active', value: true },
						{ field: 'asc', value: 'Name' },
					],
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async getAllCustomers(
		accessToken: string,
		realmId: string,
		refreshToken: string
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.findCustomers(
					[
						{ field: 'fetchAll', value: true },
						{ field: 'asc', value: 'GivenName' },
						{ field: 'Active', value: true },
					],
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async getAllTimeActivities(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		companyId: string,
		offset: number = 0
	) {
		const start = Date.now();
		try {
			const timeActivityData: any = new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				qbo.findTimeActivities(
					[
						// { field: 'TxnDate', value: '2014-12-01', operator: '>' },
						// { field: 'TxnDate', value: '2014-12-03', operator: '<' },
						// { field: 'limit', value: 5 },
						// { field: 'fetchAll', value: true },
						{ desc: 'MetaData.LastUpdatedTime' },
						{ limit: 1000 },
						{ field: 'offset', value: offset + 1 },
					],
					async function (err: any, timeActivities: any) {
						if (err) {
							reject(err);
						} else {
							resolve(timeActivities);
						}
					}
				);
			});

			const duration = Date.now() - start;
			await prisma.syncLogs.create({
				data: {
					moduleName: QBOModules.TIME_ACTIVITY,
					status: SyncLogsStatus.SUCCESS,
					message: `New ${
						timeActivityData?.QueryResponse?.TimeActivity?.length
							? timeActivityData?.QueryResponse?.TimeActivity?.length
							: 0
					} time activities synced successfully in ${
						Number(duration) / 1000
					} seconds. pageNo ${offset / 10 + 1} pageSize: ${1000}`,
					companyId: companyId,
				},
			});
			return timeActivityData;
		} catch (error: any) {
			let customErrorMessage = 'Error while syncing time activities';

			if (
				error &&
				error?.Fault &&
				error.Fault?.Error &&
				error.Fault.Error.length
			) {
				customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;
			}
			await prisma.syncLogs.create({
				data: {
					moduleName: QBOModules.EMPLOYEE,
					status: SyncLogsStatus.FAILURE,
					message: customErrorMessage,
					companyId: companyId,
				},
			});
			throw error;
		}
	}

	// Get employees by last sync date
	async getEmployeesByLastSync(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		lastSyncDate: Date,
		companyId: string
	) {
		const start = Date.now();
		try {
			const employeeData: any = await new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.findEmployees(
					[
						{ field: 'Active', value: [true, false], operator: 'IN' },
						{
							field: 'MetaData.LastUpdatedTime',
							value: Moment(lastSyncDate).tz('America/Los_Angeles').format(),
							operator: '>=',
						},
						// { field: 'fetchAll', value: true },
					],
					async function (err: any, timeActivities: any) {
						if (err) {
							reject(err);
						} else {
							resolve(timeActivities);
						}
					}
				);
			});

			const duration = Date.now() - start;
			await prisma.syncLogs.create({
				data: {
					moduleName: QBOModules.EMPLOYEE,
					status: SyncLogsStatus.SUCCESS,
					message: `New ${
						employeeData?.QueryResponse?.Employee?.length
							? employeeData?.QueryResponse?.Employee?.length
							: 0
					} employees synced successfully in ${
						Number(duration) / 1000
					} seconds.`,
					companyId: companyId,
				},
			});
			return employeeData;
		} catch (error: any) {
			let customErrorMessage = 'Error while posting journal in QuickBooks';

			if (
				error &&
				error?.Fault &&
				error.Fault?.Error &&
				error.Fault.Error.length
			) {
				customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;
			}
			await prisma.syncLogs.create({
				data: {
					moduleName: QBOModules.EMPLOYEE,
					status: SyncLogsStatus.FAILURE,
					message: customErrorMessage,
					companyId: companyId,
				},
			});
			throw error;
		}
	}

	// Get time activities by last sync date
	async getTimeActivitiesByLastSync(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		lastSyncDate: Date,
		companyId: string,
		startDate: string,
		endDate: string,
		offset: number = 0
	) {
		const start = Date.now();
		try {
			const timeActivityData: any = await new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				const query: any = [
					// { field: 'fetchAll', value: true },
					{ desc: 'TxnDate' },
					{ limit: 1000 },
					{ field: 'offset', value: offset + 1 },
				];

				// if(lastSyncDate) {
				// 	query.push(
				// 		{
				// 			field: 'MetaData.LastUpdatedTime',
				// 			value: Moment(lastSyncDate).tz('America/Los_Angeles').format(),
				// 			operator: '>=',
				// 		}
				// 	)
				// }

				if (startDate && endDate) {
					query.push({
						field: 'TxnDate',
						value: startDate,
						operator: '>=',
					});

					query.push({
						field: 'TxnDate',
						value: endDate,
						operator: '<=',
					});
				}

				qbo.findTimeActivities(
					query,
					async function (err: any, timeActivities: any) {
						if (err) {
							reject(err);
						} else {
							resolve(timeActivities);
						}
					}
				);
			});

			const duration = Date.now() - start;
			if (timeActivityData?.QueryResponse?.TimeActivity?.length) {
				await prisma.syncLogs.create({
					data: {
						moduleName: QBOModules.TIME_ACTIVITY,
						status: SyncLogsStatus.SUCCESS,
						message: `New ${
							timeActivityData?.QueryResponse?.TimeActivity?.length
								? timeActivityData?.QueryResponse?.TimeActivity?.length
								: 0
						} time activities synced successfully in ${
							Number(duration) / 1000
						} seconds. pageNo ${offset / 1000 + 1} pageSize: ${1000}`,
						companyId: companyId,
					},
				});
			}
			return timeActivityData;
		} catch (error: any) {
			let customErrorMessage = 'Error while syncing time activities';

			if (
				error &&
				error?.Fault &&
				error.Fault?.Error &&
				error.Fault.Error.length
			) {
				customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;
			}
			await prisma.syncLogs.create({
				data: {
					moduleName: QBOModules.EMPLOYEE,
					status: SyncLogsStatus.FAILURE,
					message: customErrorMessage,
					companyId: companyId,
				},
			});
			throw error;
		}
	}

	// Get closing date
	async getClosingDate(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		companyId: string,
		query: any
	) {
		try {
			const date = await new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.getPreferences(async function (err: any, response: any) {
					if (err) {
						reject(err);
					} else {
						const date = response?.AccountingInfoPrefs?.BookCloseDate;
						resolve(date);
					}
				});
			});

			if (query.syncLogs) {
				const start = Date.now();
				const duration = Date.now() - start;
				await prisma.syncLogs.create({
					data: {
						moduleName: QBOModules.CLOSING_DATE,
						status: SyncLogsStatus.SUCCESS,
						message: `New book closing date ${date} synced successfully in ${
							Number(duration) / 1000
						} seconds.`,
						companyId: companyId,
					},
				});
			}
			return date;
		} catch (err) {
			throw err;
		}
	}

	async createJournalEntry(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		journalData: any
	) {
		try {
			return new Promise((resolve, reject) => {
				// const qbo = new QuickBooks(
				// 	config.quickbooksClientId,
				// 	config.quickbooksClientSecret,
				// 	accessToken,
				// 	true,
				// 	realmId,
				// 	config.quickbooksEnvironment == 'sandbox' ? true : false,
				// 	true,
				// 	null,
				// 	'2.0',
				// 	refreshToken
				// );

				// qbo.createJournalEntry(
				// 	journalData,
				// 	async function (err: any, response: any) {
				// 		if (err) {
				// 			reject(err);
				// 		} else {
				// 			resolve(response);
				// 		}
				// 	}
				// );

				const baseURL =
					config.quickbooksEnvironment === 'sandbox'
						? 'https://sandbox-quickbooks.api.intuit.com/v3/company/'
						: 'https://quickbooks.api.intuit.com/v3/company/';

				// Construct the full URL for the request
				const url = `${baseURL}${realmId}/journalentry?minorversion=73&include=allowautodocnum`;

				axios
					.post(url, journalData, {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
					})
					.then((response) => {
						resolve(response?.data?.JournalEntry);
					})
					.catch((error) => {
						reject(error.response ? error.response.data : error.message);
					});
			});
		} catch (err) {
			throw err;
		}
	}

	async updateJournalEntry(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		journalData: any
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.updateJournalEntry(
					journalData,
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async getJournal(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		journalId: string
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				qbo.getJournalEntry(
					journalId,
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async uploadFile(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		fileName: string,
		fileType: string,
		fileData: any,
		entityName: string,
		entityId: string
	) {
		try {
			return new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.upload(
					fileName,
					fileType,
					fileData,
					entityName,
					entityId,
					async function (err: any, response: any) {
						if (err) {
							reject(err);
						} else {
							resolve(response);
						}
					}
				);
			});
		} catch (err) {
			throw err;
		}
	}

	async createChartOfAccount(
		accessToken: string,
		realmId: string,
		refreshToken: string,
		accountData: AccountInterface
	) {
		try {
			const {
				accountName,
				currencyValue,
				accountType,
				accountNum,
				detailType,
			} = accountData;

			const currency = supportedQBOCurrencies.find(
				(singleCurrency: any) => singleCurrency.value === currencyValue
			);

			const data: QuickBooksChartOfAccount = {
				Name: accountName,
				AccountType: accountType,
				CurrencyRef: {
					value: currency?.value,
					name: currency?.name,
				},
			};

			if (accountNum) {
				data['AcctNum'] = accountData.accountNum;
			}

			if (detailType) {
				data['SubAccount'] = true;
				data['AccountSubType'] = detailType;
			}

			const account = await new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment == 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);
				qbo.createAccount(data, async function (err: any, response: any) {
					if (err) {
						reject(err);
					} else {
						resolve(response);
					}
				});
			});
			return account;
		} catch (err) {
			throw err;
		}
	}

	async createEmployee(
		accessToken: string,
		companyId: string,
		realmId: string,
		refreshToken: string,
		employeeData: any
	) {
		try {
			const { employeeName } = employeeData;

			const data: any = {
				GivenName: employeeName,
				FamilyName: employeeName,
				DisplayName: employeeName,
			};
			const listOfFields = await prisma.field.findMany({
				where: {
					companyId,
				},
			});
			const employee = await new Promise((resolve, reject) => {
				const qbo = new QuickBooks(
					config.quickbooksClientId,
					config.quickbooksClientSecret,
					accessToken,
					true,
					realmId,
					config.quickbooksEnvironment === 'sandbox' ? true : false,
					true,
					null,
					'2.0',
					refreshToken
				);

				qbo.createEmployee(data, async function (err: any, response: any) {
					if (err) {
						if (err?.response?.data?.Fault?.Error?.Detail) {
							resolve(err.response);
						}
						reject(err);
					} else {
						await prisma.employee.create({
							data: {
								employeeId: response?.Id,
								fullName: response?.DisplayName,
								active: true,
								company: { connect: { id: companyId } },
							},
						});

						const employeeData: any = {
							employeeId: response?.Id,
							fullName: response?.DisplayName?.replace(' (deleted)', ''),
							email: response?.PrimaryEmailAddr?.Address ?? '',
							phone: response?.PrimaryPhone?.FreeFormNumber ?? '',
							active: response?.Active,
							companyId: companyId,
						};

						// Update or create employee in db
						await employeeRepository.updateOrCreateEmployee(
							response?.Id,
							companyId,
							employeeData,
							listOfFields
						);

						resolve(response);
					}
				});
			});

			return employee;
		} catch (err: any) {
			throw err;
		}
	}
}

export default new QuickbooksClient();
