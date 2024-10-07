/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-mixed-spaces-and-tabs */

import moment from 'moment-timezone';
import { prisma } from '../client/prisma';
import {
	batchUpdateTimeActivityInterface,
	getAllTimeActivityInterface,
	updateTimeActivityInterface,
} from '../interfaces/timeActivityInterface';
import { CustomError } from '../models/customError';
import quickbooksClient from '../quickbooksClient/quickbooksClient';
import { companyRepository, employeeRepository } from '../repositories';
import timeActivityRepository from '../repositories/timeActivityRepository';
import quickbooksServices from './quickbooksServices';
import payPeriodRepository from '../repositories/payPeriodRepository';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { hasText } from '../utils/utils';

interface QuickbooksTimeActivityInterface {
	accessToken: string;
	tenantID: string;
	refreshToken: string;
	companyId: string;
}

class TimeActivityService {
	// Get all time activities
	async getAllTimeActivitiesServices(timeActivityData: any) {
		const {
			companyId,
			search,
			sort,
			page,
			limit,
			type,
			classId,
			customerId,
			employeeId,
			isOverHours,
			payPeriodId,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			year,
			closingDate,
		} = timeActivityData;

		let dateFilters = {};

		if (payPeriodId) {
			// Get pay period details
			const payPeriodData = await payPeriodRepository.getDetails(
				payPeriodId,
				companyId as string
			);

			if (!payPeriodData) {
				throw new CustomError(404, 'Pay period not found');
			}

			const payPeriodStartDate = payPeriodData?.startDate;
			const payPeriodEndDate = payPeriodData?.endDate;

			let startDate: any;
			let endDate: any;

			if (payPeriodStartDate && payPeriodEndDate) {
				// Format start date
				startDate = moment(payPeriodStartDate).startOf('day').toISOString();
				// startDate = newStart.toISOString();

				// Format end date
				endDate = moment(payPeriodEndDate).endOf('day').toISOString();
				// endDate = newEnd.toISOString();
			}

			if (startDate && endDate) {
				dateFilters = {
					activityDate: {
						gte: startDate,
						lte: endDate,
					},
				};
			} else {
				dateFilters = {};
			}
		}
		// Offset set
		const offset = (Number(page) - 1) * Number(limit);

		// Set filter conditions
		const filteredData = [];

		if (classId) {
			filteredData.push({ classId: classId });
		}
		if (customerId) {
			filteredData.push({ customerId: customerId });
		}
		if (employeeId) {
			filteredData.push({
				employee: {
					id: employeeId,
				},
			});
		}

		// if (year) {
		// 	filteredData.push(
		// 		{
		// 			activityDate: {
		// 				gte: new Date(`${Number(year)}-01-01T00:00:00Z`), // Start of the year
		// 			},
		// 		},
		// 		{
		// 			activityDate: {
		// 				lt: new Date(`${Number(year) + 1}-01-01T00:00:00Z`), // Start of the next year
		// 			},
		// 		}
		// 	);
		// }

		const filterConditions =
			filteredData?.length > 0
				? {
						AND: filteredData,
				  }
				: {};

		// Conditions for searching
		const searchCondition = search
			? {
					OR: [
						{
							className: { contains: search as string, mode: 'insensitive' },
						},
						{
							customerName: { contains: search as string, mode: 'insensitive' },
						},
						{
							employee: {
								fullName: { contains: search as string, mode: 'insensitive' },
							},
						},
					],
			  }
			: {};

		// Conditions for sort
		const sortCondition: any = sort
			? {
					orderBy: [
						{
							[sort as string]: type ?? 'asc',
						},
						{
							id: 'asc',
						},
					],
			  }
			: {
					orderBy: [
						{
							activityDate: 'desc',
						},
						{
							id: 'asc',
						},
					],
			  };

		if (sort === 'employee') {
			sortCondition['orderBy'] = [
				{
					employee: {
						fullName: type,
					},
				},
				{ id: 'asc' },
			];
		}

		// Check if company exists or not
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		const timeActivitiesWithHours: any[] = [];

		const timeActivities: any =
			await timeActivityRepository.getAllTimeActivities({
				companyId: companyId,
				offset: offset,
				limit: limit,
				filterConditions: filterConditions,
				searchCondition: searchCondition,
				sortCondition: sortCondition,
				dateFilters: dateFilters,
			});

		// const calActivitiesWithHours =
		// 	await this.calculateTimeActivitiesWithHours(timeActivities);
		timeActivities.forEach((activity: any) => {
			let isAccountClosed = false;
			if (activity.timeSheet) {
				if (activity.timeSheet.payPeriod && closingDate) {
					if (
						dayjs(activity.timeSheet.payPeriod.endDate) <
						dayjs(closingDate as string).endOf('day')
					) {
						isAccountClosed = true;
					}
				}
			}
			timeActivitiesWithHours.push({ ...activity, isAccountClosed });
		});

		const timeActivitiesCount =
			await timeActivityRepository.getAllTimeActivitiesCount({
				companyId: companyId,
				filterConditions: filterConditions,
				searchCondition: searchCondition,
				sortCondition: sortCondition,
				dateFilters: dateFilters,
			});

		return { timeActivitiesWithHours, timeActivitiesCount };
		// return { timeActivitiesWithHours, timeActivitiesCount, timeActivities };
	}

	async applyCustomRules(payPeriodId: string, companyId: string) {
		const payPeriodData = await payPeriodRepository.getDetails(
			payPeriodId,
			companyId as string
		);

		if (!payPeriodData) {
			throw new CustomError(404, 'Pay period not found');
		}

		const payPeriodStartDate = payPeriodData?.startDate;
		const payPeriodEndDate = payPeriodData?.endDate;

		let startDate: any;
		let endDate: any;

		if (payPeriodStartDate && payPeriodEndDate) {
			// Format start date
			startDate = moment(payPeriodStartDate).startOf('date').toISOString();
			// startDate = newStart.toISOString();

			// Format end date
			endDate = moment(payPeriodEndDate).endOf('date').toISOString();
			// endDate = newEnd.toISOString();
		}

		if (!startDate || !endDate) {
			throw new CustomError(400, 'Dates not found');
		}

		const activities = await prisma.timeActivities.findMany({
			where: {
				companyId,
				activityDate: {
					gte: new Date(startDate),
					lte: new Date(endDate),
				},
			},
		});

		const editCustomRules = await prisma.customRules.findMany({
			where: {
				companyId,
				isActive: true,
				triggerProcess: 'edit',
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const splitCustomRules = await prisma.customRules.findMany({
			where: {
				companyId,
				isActive: true,
				triggerProcess: 'split',
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const deleteCustomRules = await prisma.customRules.findMany({
			where: {
				companyId,
				isActive: true,
				triggerProcess: 'delete',
			},
			orderBy: {
				priority: 'asc',
			},
		});

		if (activities && activities.length) {
			for (const activity of activities) {
				if (editCustomRules && editCustomRules.length) {
					await this.applyEditCustomRules(activity, editCustomRules);
				}

				if (splitCustomRules && splitCustomRules.length) {
					await this.applySplitCustomRules(activity, splitCustomRules);
				}

				if (deleteCustomRules && deleteCustomRules.length) {
					await this.applyDeleteCustomRules(activity, deleteCustomRules);
				}
			}
		}
	}

	async syncTimeActivities(companyId: string) {
		const companyDetails = await companyRepository.getDetails(companyId);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		// Get access token for quickbooks
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		// If company exists - sync time activities by last sync
		if (companyDetails) {
			const timeActivities: any = await this.syncTimeActivityFirstTime({
				accessToken: authResponse?.accessToken as string,
				refreshToken: authResponse?.refreshToken as string,
				tenantID: authResponse?.tenantID as string,
				companyId: companyId as string,
			});

			if (
				timeActivities &&
				timeActivities?.QueryResponse?.TimeActivity?.length > 0
			) {
				// Filtered vendors, fetching employees only
				const filteredTimeActivities =
					timeActivities?.QueryResponse?.TimeActivity?.filter(
						(timeActivity: any) => timeActivity?.EmployeeRef
					);

				for (const timeActivity of filteredTimeActivities) {
					const data: any = {
						timeActivityId: timeActivity?.Id,
						classId: timeActivity?.ClassRef?.value || null,
						className: timeActivity?.ClassRef?.name || null,
						customerId: timeActivity?.CustomerRef?.value || null,
						customerName: timeActivity?.CustomerRef?.name || null,
						hours: timeActivity?.Hours?.toString() || '0',
						minute: timeActivity?.Minutes?.toString() || '0',
						activityDate: timeActivity?.TxnDate,
						employeeId: timeActivity?.EmployeeRef?.value,
					};

					// update or create time activity

					return await timeActivityRepository.updateOrCreateTimeActivity(
						timeActivity?.Id,
						companyId,
						data
					);
				}

				// await Promise.all(
				// 	filteredTimeActivities?.map(async (timeActivity: any) => {
				// 		const data: any = {
				// 			timeActivityId: timeActivity?.Id,
				// 			classId: timeActivity?.ClassRef?.value || null,
				// 			className: timeActivity?.ClassRef?.name || null,
				// 			customerId: timeActivity?.CustomerRef?.value || null,
				// 			customerName: timeActivity?.CustomerRef?.name || null,
				// 			hours: timeActivity?.Hours?.toString() || '0',
				// 			minute: timeActivity?.Minutes?.toString() || '0',
				// 			activityDate: timeActivity?.TxnDate,
				// 			employeeId: timeActivity?.EmployeeRef?.value,
				// 		};

				// 		// update or create time activity

				// 		const data2 = await timeActivityRepository.updateOrCreateTimeActivity(
				// 			timeActivity?.Id,
				// 			companyId,
				// 			data
				// 		);
				// 	})
				// );
				return timeActivities?.QueryResponse?.TimeActivity;
				// console.log('My time activities: ', timeActivities);
			} else {
				// Else - sync time activities for the first time

				await this.syncTimeActivityFirstTime({
					accessToken: authResponse?.accessToken as string,
					refreshToken: authResponse?.refreshToken as string,
					tenantID: authResponse?.tenantID as string,
					companyId: companyId as string,
				});
			}
		}
	}

	async lambdaSyncFunction(timeActivityData: any) {
		const {
			accessToken,
			tenantId,
			refreshToken,
			companyId,
			timeActivityLastSyncDate,
		} = timeActivityData;

		if (timeActivityLastSyncDate) {
			// Last sync exists

			console.log('TIME Activity Last Sync exist');
		} else {
			// Last sync does not exist - time activity sync for the first time

			// Find all time activities from quickbooks

			const date = new Date();

			const timeActivityArr = [];

			let errorCount = 0;

			for (let pageNo = 1; ; pageNo++) {
				try {
					const offset = 1000 * (pageNo - 1);

					const timeActivities: any =
						await quickbooksClient.getAllTimeActivities(
							accessToken,
							tenantId,
							refreshToken,
							companyId,
							offset
						);

					const allClasses: any = await quickbooksClient.getAllClasses(
						accessToken,
						tenantId,
						refreshToken
					);

					logger.info(JSON.stringify(timeActivities?.QueryResponse));

					if (
						timeActivities &&
						timeActivities?.QueryResponse?.TimeActivity?.length > 0
					) {
						// Filtered vendors, fetching employees only
						const filteredEmployees =
							timeActivities?.QueryResponse?.TimeActivity?.filter(
								(timeActivity: any) => timeActivity?.EmployeeRef
							);
						// const timeActivityArr = [];
						for (let i = 0; i < filteredEmployees.length; i++) {
							const timeActivity = filteredEmployees[i];
							let hours: any = 0;
							let minutes: any = 0;
							if (
								timeActivity?.Hours !== null &&
								timeActivity?.Hours !== undefined &&
								timeActivity?.Minutes !== null &&
								timeActivity?.Minutes !== undefined
							) {
								hours = timeActivity?.Hours.toString().padStart(2, '0');
								minutes = timeActivity?.Minutes.toString().padStart(2, '0');
							} else if (
								timeActivity?.Hours == 0 &&
								timeActivity?.Minutes == 0
							) {
								hours = timeActivity?.Hours.toString().padStart(2, '0');
								minutes = timeActivity?.Minutes.toString().padStart(2, '0');
							} else if (
								hasText(timeActivity?.StartTime) &&
								hasText(timeActivity?.EndTime)
							) {
								const start: any = new Date(timeActivity?.StartTime);
								const end: any = new Date(timeActivity?.EndTime);

								const breakHours = timeActivity?.BreakHours || 0; // Example break hours
								const breakMinutes = timeActivity?.BreakMinutes || 0; // Example break minutes

								// Calculate the total time duration in milliseconds
								let totalTimeInMillis: any = end - start;

								// If the start date is greater than end date
								if (start > end) {
									const nextDay: any = new Date(start);
									nextDay.setDate(nextDay.getDate() + 1);
									totalTimeInMillis += nextDay - start;
								}

								// Calculate the break time in milliseconds
								const breakTimeInMillis =
									(breakHours * 60 + breakMinutes) * 60 * 1000;

								// Calculate the effective work duration
								const effectiveTimeInMillis =
									totalTimeInMillis - breakTimeInMillis;

								// Calculate hours and minutes from milliseconds
								const effectiveHours = Math.floor(
									effectiveTimeInMillis / (60 * 60 * 1000)
								);
								const effectiveMinutes = Math.floor(
									(effectiveTimeInMillis % (60 * 60 * 1000)) / (60 * 1000)
								);

								hours = effectiveHours;
								minutes = effectiveMinutes;
							}

							const classObj = allClasses?.QueryResponse?.Class?.find(
								(singleClass: any) =>
									singleClass?.Id === timeActivity?.ClassRef?.value
							);

							const data: any = {
								timeActivityId: timeActivity?.Id,
								classId: timeActivity?.ClassRef?.value || null,
								className: classObj?.FullyQualifiedName || null,
								// className: timeActivity?.ClassRef?.name || null,
								customerId: timeActivity?.CustomerRef?.value || null,
								customerName: timeActivity?.CustomerRef?.name || null,
								hours: hours?.toString()?.padStart(2, '0') || '00',
								minute: minutes?.toString()?.padStart(2, '0') || '00',
								// hours: timeActivity?.Hours?.toString() || '0',
								// minute: timeActivity?.Minutes?.toString() || '0',
								activityDate: timeActivity?.TxnDate,
								employeeId: timeActivity?.EmployeeRef?.value,
								companyId: companyId,
							};

							try {
								// Update or create timeActivity in db
								const result =
									await timeActivityRepository.createTimeActivitySync(
										data,
										companyId
									);
								timeActivityArr.push(result);
							} catch (err) {
								logger.error(
									`Time activity syncing error : ${JSON.stringify(err)}`
								);
							}
						}

						// await prisma.company.update({
						// 	where: {
						// 		id: companyId,
						// 	},
						// 	data: {
						// 		timeActivitiesLastSyncDate: moment(new Date())
						// 			.tz('America/Los_Angeles')
						// 			.format(),
						// 	},
						// });
					} else {
						break;
					}
				} catch (error) {
					logger.error(
						`Time activity syncing error with pageNo ${pageNo} : ${JSON.stringify(
							error
						)}`
					);
					errorCount = errorCount + 1;
					if (errorCount === 5) {
						throw error;
					}
				}
			}

			await prisma.company.update({
				where: {
					id: companyId,
				},
				data: {
					timeActivitiesLastSyncDate: moment(date)
						.tz('America/Los_Angeles')
						.format(),
				},
			});
		}
	}

	async syncTimeActivityFirstTime(
		timeActivityData: QuickbooksTimeActivityInterface
	) {
		const { accessToken, refreshToken, tenantID, companyId } = timeActivityData;

		// Find all time activities from quickbooks
		const timeActivities = await quickbooksClient.getAllTimeActivities(
			accessToken,
			tenantID,
			refreshToken,
			companyId
		);

		return timeActivities;

		// Dump all time activities in db
	}

	async syncTimeActivityByLastSync(
		companyId: string,
		startDate: string,
		endDate: string,
		payPeriodId: string
	) {
		try {
			// Check if company exists or not
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Get access token
			const authResponse = await quickbooksServices.getAccessToken(companyId);

			// LAMBDA FUNCTION CALL

			// const syncData = await axios.post(
			// 	config.employeeSyncLambdaEndpoint,
			// 	{
			// 		accessToken: authResponse?.accessToken,
			// 		refreshToken: authResponse?.refreshToken,
			// 		tenantID: authResponse?.tenantID,
			// 		companyId: companyId,
			// 		employeeLastSyncDate: companyDetails?.employeeLastSyncDate,
			// 	},
			// 	{
			// 		headers: {
			// 			'x-api-key': config.employeeSyncLambdaApiKey,
			// 			'Content-Type': 'application/json',
			// 		},
			// 	}
			// );

			// return syncData?.data;

			const allEmployees = await prisma.employee.findMany({
				where: {
					companyId,
					active: true,
				},
				include: {
					EmployeeDirectAllocationConfig: {
						where: {
							payPeriodId,
							isActive: true,
						},
					},
				},
			});

			const allEmployeeIds = allEmployees.map((e) => e.id);

			const foundEmployeesActivityOrConfig: string[] = [];

			allEmployees.forEach((emp) => {
				if (
					emp.EmployeeDirectAllocationConfig.length &&
					!foundEmployeesActivityOrConfig.includes(emp.id)
				) {
					foundEmployeesActivityOrConfig.push(emp.id);
				}
			});

			const timeActivityArr = [];

			let errorCount = 0;

			for (let pageNo = 1; ; pageNo++) {
				try {
					const offset = 1000 * (pageNo - 1);

					const newTimeActivities: any =
						await quickbooksClient?.getTimeActivitiesByLastSync(
							authResponse?.accessToken as string,
							authResponse?.tenantID as string,
							authResponse?.refreshToken as string,
							companyDetails?.timeActivitiesLastSyncDate as Date,
							companyId as string,
							startDate,
							endDate,
							offset
						);

					logger.info(JSON.stringify(newTimeActivities?.QueryResponse));

					// If new records found

					// const timeActivityArr = [];
					if (
						newTimeActivities &&
						newTimeActivities?.QueryResponse?.TimeActivity?.length > 0
					) {
						// Filtered time activities who has employee ref
						const filteredTimeActivities =
							newTimeActivities?.QueryResponse?.TimeActivity?.filter(
								(timeActivity: any) => timeActivity?.EmployeeRef
							);

						const editCustomRules = await prisma.customRules.findMany({
							where: {
								companyId,
								isActive: true,
								triggerProcess: 'edit',
							},
							orderBy: {
								priority: 'asc',
							},
						});

						const splitCustomRules = await prisma.customRules.findMany({
							where: {
								companyId,
								isActive: true,
								triggerProcess: 'split',
							},
							orderBy: {
								priority: 'asc',
							},
						});

						const deleteCustomRules = await prisma.customRules.findMany({
							where: {
								companyId,
								isActive: true,
								triggerProcess: 'delete',
							},
							orderBy: {
								priority: 'asc',
							},
						});

						for (let i = 0; i < filteredTimeActivities.length; i++) {
							const timeActivity = filteredTimeActivities[i];
							let hours = '0';
							let minutes = '0';

							if (
								timeActivity?.Hours !== null &&
								timeActivity?.Hours !== undefined &&
								timeActivity?.Minutes !== null &&
								timeActivity?.Minutes !== undefined
							) {
								hours = timeActivity?.Hours.toString().padStart(2, '0');
								minutes = timeActivity?.Minutes.toString().padStart(2, '0');
							} else if (
								timeActivity?.Hours == 0 &&
								timeActivity?.Minutes == 0
							) {
								hours = timeActivity?.Hours.toString().padStart(2, '0');
								minutes = timeActivity?.Minutes.toString().padStart(2, '0');
							} else {
								const start: any = new Date(timeActivity?.StartTime);
								const end: any = new Date(timeActivity?.EndTime);
								const breakHours = timeActivity?.BreakHours || 0;
								const breakMinutes = timeActivity?.BreakMinutes || 0;

								let totalTimeInMillis = end - start;

								if (start > end) {
									const nextDay: any = new Date(start);
									nextDay.setDate(nextDay.getDate() + 1);
									totalTimeInMillis += nextDay - start;
								}

								const breakTimeInMillis =
									(breakHours * 60 + breakMinutes) * 60 * 1000;
								const effectiveTimeInMillis =
									totalTimeInMillis - breakTimeInMillis;

								const effectiveHours = Math.floor(
									effectiveTimeInMillis / (60 * 60 * 1000)
								);
								const effectiveMinutes = Math.floor(
									(effectiveTimeInMillis % (60 * 60 * 1000)) / (60 * 1000)
								);

								hours = effectiveHours.toString().padStart(2, '0');
								minutes = effectiveMinutes.toString().padStart(2, '0');
							}

							const timeActivityData = {
								timeActivityId: timeActivity?.Id,
								classId: timeActivity?.ClassRef?.value || null,
								className: timeActivity?.ClassRef?.name || null,
								customerId: timeActivity?.CustomerRef?.value || null,
								customerName: timeActivity?.CustomerRef?.name || null,
								hours: String(hours),
								minute: String(minutes),
								activityDate: timeActivity?.TxnDate,
								employeeId: timeActivity?.EmployeeRef?.value,
							};

							try {
								const employeeData = allEmployees.find(
									(e) => e.employeeId === timeActivityData?.employeeId
								);
								// Update or create timeActivity in db
								if (employeeData) {
									if (
										!foundEmployeesActivityOrConfig.includes(employeeData.id)
									) {
										foundEmployeesActivityOrConfig.push(employeeData.id);
									}
									const result =
										await timeActivityRepository.updateOrCreateTimeActivity(
											timeActivity?.Id,
											companyId,
											timeActivityData
										);

									if (
										result &&
										result.id &&
										!employeeData.EmployeeDirectAllocationConfig.length
									) {
										if (editCustomRules && editCustomRules.length) {
											await this.applyEditCustomRules(result, editCustomRules);
										}

										if (splitCustomRules && splitCustomRules.length) {
											await this.applySplitCustomRules(
												result,
												splitCustomRules
											);
										}

										if (deleteCustomRules && deleteCustomRules.length) {
											await this.applyDeleteCustomRules(
												result,
												deleteCustomRules
											);
										}
									}
									timeActivityArr.push(result);
								}
							} catch (err) {
								logger.error(`Time activity syncing error : ${err}`);
							}
						}
					} else {
						break;
					}
				} catch (error) {
					logger.error(
						`Time activity syncing error with pageNo ${pageNo} : ${JSON.stringify(
							error
						)}`
					);
					errorCount = errorCount + 1;
					if (errorCount === 5) {
						throw error;
					}
				}
			}
			// Update time activity last sync date
			await prisma.company.update({
				where: {
					id: companyId,
				},
				data: {
					timeActivitiesLastSyncDate: moment(new Date())
						.tz('America/Los_Angeles')
						.format(),
				},
			});

			const notFoundEmployeesId: string[] = [];

			allEmployeeIds.forEach((e) => {
				if (!foundEmployeesActivityOrConfig.includes(e)) {
					notFoundEmployeesId.push(e);
				}
			});

			const notFoundEmployeesName: string[] = [];

			if (notFoundEmployeesId.length) {
				notFoundEmployeesId.forEach((e) => {
					const empData = allEmployees.find((x) => x.id === e);
					if (empData) {
						notFoundEmployeesName.push(empData.fullName);
					}
				});
			}

			return { timeActivityArr, notFoundEmployeesName };
		} catch (err) {
			throw err;
		}
	}

	async applyEditCustomRules(timeActivity: any, customRules: any[]) {
		const ruleData = this.matchCustomRule(timeActivity, customRules);

		if (ruleData) {
			await this.updateTimeActivitiesBasedOnRuleMatch(timeActivity, ruleData);
		}
	}

	async applySplitCustomRules(timeActivity: any, customRules: any[]) {
		const ruleData = this.matchCustomRule(timeActivity, customRules);

		if (ruleData) {
			await this.createSplitActivitiesBasedOnRuleMatch(timeActivity, ruleData);
		}
	}

	async applyDeleteCustomRules(timeActivity: any, customRules: any[]) {
		const ruleData = this.matchCustomRule(timeActivity, customRules);

		if (ruleData) {
			await this.deleteTimeActivitiesBasedOnRuleMatch(timeActivity, ruleData);
		}
	}

	matchCustomRule(timeActivity: any, customRules: any[]) {
		let matchedRule: any = null;

		for (const rule of customRules) {
			if (rule.isActive) {
				if (
					rule.criteria.operator1 === 'AND' &&
					rule.criteria.operator2 === 'AND'
				) {
					if (
						this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(rule.criteria.classId, timeActivity.classId)
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'OR' &&
					rule.criteria.operator2 === 'OR'
				) {
					if (
						(this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) ||
							this.matchCriteria(
								rule.criteria.customerId,
								timeActivity.customerId
							)) &&
						(this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) ||
							this.matchCriteria(rule.criteria.classId, timeActivity.classId))
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'AND' &&
					rule.criteria.operator2 === 'OR'
				) {
					if (
						this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						(this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) ||
							this.matchCriteria(rule.criteria.classId, timeActivity.classId))
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'OR' &&
					rule.criteria.operator2 === 'AND'
				) {
					if (
						(this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) ||
							this.matchCriteria(
								rule.criteria.customerId,
								timeActivity.customerId
							)) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(rule.criteria.classId, timeActivity.classId)
					) {
						matchedRule = rule;
						break;
					}
				}
				// if (hasText(rule.criteria.employeeId) && hasText(rule.criteria.classId) && hasText(rule.criteria.customerId)) {
				// }

				// if (hasText(rule.criteria.employeeId) && hasText(rule.criteria.classId) && !hasText(rule.criteria.customerId)) {
				// 	if (rule.criteria.operator2 === 'AND' && (this.matchCriteria(rule.criteria.employeeId, timeActivity.employeeId) && this.matchCriteria(rule.criteria.classId, timeActivity.classId))) {
				// 		matchedRule = rule;
				// 		break;
				// 	}

				// 	if (rule.criteria.operator2 === 'OR' && (this.matchCriteria(rule.criteria.employeeId, timeActivity.employeeId) || this.matchCriteria(rule.criteria.classId, timeActivity.classId))) {
				// 		matchedRule = rule;
				// 		break;
				// 	}
				// }

				// if (hasText(rule.criteria.employeeId) && !hasText(rule.criteria.classId) && hasText(rule.criteria.customerId)) {
				// 	if (rule.criteria.operator1 === 'AND' && (this.matchCriteria(rule.criteria.employeeId, timeActivity.employeeId) && this.matchCriteria(rule.criteria.customerId, timeActivity.customerId))) {
				// 		matchedRule = rule;
				// 		break;
				// 	}

				// 	if (rule.criteria.operator1 === 'OR' && (this.matchCriteria(rule.criteria.employeeId, timeActivity.employeeId) || this.matchCriteria(rule.criteria.customerId, timeActivity.customerId))) {
				// 		matchedRule = rule;
				// 		break;
				// 	}
				// }

				// if (hasText(rule.criteria.employeeId) && !hasText(rule.criteria.customerId) && !hasText(rule.criteria.classId)) {
				// 	if (this.matchCriteria(rule.criteria.employeeId, timeActivity.employeeId)) {
				// 		matchedRule = rule;
				// 		break;
				// 	}
				// }
			}
		}

		return matchedRule;
	}

	matchCriteria(criteria: any, value: any) {
		if (criteria === 'ANY') {
			return hasText(value);
		}

		if (!hasText(criteria)) {
			return !hasText(value);
		}

		return criteria === value;
	}

	async createSplitActivitiesBasedOnRuleMatch(
		timeActivity: any,
		ruleData: any
	) {
		const hoursMinutesData = this.divideTimeAsPerPercentage(
			Number(timeActivity.hours),
			Number(timeActivity.minute),
			ruleData.actions
		);

		if (timeActivity.id) {
			await prisma.splitTimeActivities.deleteMany({
				where: {
					timeActivityId: timeActivity.id,
				},
			});
		}

		for (let index = 0; index < ruleData?.actions?.length; index++) {
			const action = ruleData?.actions[index];

			const actualTimeLog = this.minToHours(hoursMinutesData[index]);

			await prisma.splitTimeActivities.create({
				data: {
					timeActivity: { connect: { id: timeActivity.id } },
					classId: action?.classId || timeActivity?.classId,
					className: action?.className || timeActivity?.className,
					customerId: action?.customerId || timeActivity?.customerId,
					customerName: action?.customerName || timeActivity?.customerName,
					hours: actualTimeLog.split(':')[0],
					minute: actualTimeLog.split(':')[1],
					activityDate: timeActivity?.activityDate,
					employee: { connect: { id: timeActivity?.employeeId } },
					isAutoSplit: true,
					isClassReadOnly: hasText(action.classId),
					isCustomerReadOnly: hasText(action.customerId),
					customRuleId: ruleData?.id,
				},
			});
		}

		return hoursMinutesData;
	}

	async updateTimeActivitiesBasedOnRuleMatch(timeActivity: any, ruleData: any) {
		if (timeActivity.id) {
			await prisma.splitTimeActivities.deleteMany({
				where: {
					timeActivityId: timeActivity.id,
				},
			});
		}

		if (ruleData.actions && ruleData.actions.length) {
			const action = ruleData.actions[0];

			await prisma.timeActivities.update({
				where: {
					id: timeActivity.id,
				},
				data: {
					classId: action?.classId || timeActivity?.classId,
					className: action?.className || timeActivity?.className,
					customerId: action?.customerId || timeActivity?.customerId,
					customerName: action?.customerName || timeActivity?.customerName,
					customRuleId: ruleData.id,
					isCustomRuleApplied: true,
				},
			});
		}
	}

	async deleteTimeActivitiesBasedOnRuleMatch(timeActivity: any, ruleData: any) {
		if (timeActivity.id) {
			await prisma.splitTimeActivities.deleteMany({
				where: {
					timeActivityId: timeActivity.id,
				},
			});
		}

		await prisma.timeActivities.update({
			where: {
				id: timeActivity.id,
			},
			data: {
				hours: '00',
				minute: '00',
				customRuleId: ruleData.id,
				isCustomRuleApplied: true,
			},
		});
	}

	divideTimeAsPerPercentage(hours: any, minutes: any, actions: any[]) {
		const minutesContribute: any = {};

		// Convert hours and minutes to total minutes
		const totalMinutes = hours * 60 + minutes;
		let totalMinutesContributed = 0;

		for (let i = 0; i < actions.length; i++) {
			const action = actions[i];

			minutesContribute[i] = Math.round(
				(totalMinutes * Number(action.hours)) / 100
			);

			totalMinutesContributed = totalMinutesContributed + minutesContribute[i];
		}

		const diff = totalMinutes - totalMinutesContributed;

		if (diff && diff > 0) {
			minutesContribute[actions.length - 1] =
				minutesContribute[actions.length - 1] + diff;
		} else if (diff && diff < 0) {
			minutesContribute[actions.length - 1] =
				minutesContribute[actions.length - 1] - Math.abs(diff);
		}

		return minutesContribute;
	}

	minToHours(totalMinutes: number) {
		const totalHours = Math.floor(totalMinutes / 60);
		const remainingMinutes = totalMinutes % 60;

		return `${totalHours.toString().padStart(2, '0')}:${remainingMinutes
			.toString()
			.padStart(2, '0')}`;
	}

	// Update hours for time activity in DB
	async updateTimeActivity(timeActivityData: updateTimeActivityInterface) {
		const {
			companyId,
			timeActivityId,
			hours,
			minute,
			classId,
			className,
			customerId,
			customerName,
		} = timeActivityData;

		// Check if company exists or not
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		// Update time logs
		const updated = await timeActivityRepository.updateTimeActivity({
			timeActivityId: timeActivityId,
			companyId: companyId,
			hours: hours,
			minute: minute,
			classId: classId,
			className: className,
			customerId: customerId,
			customerName: customerName,
		});
		return updated;
	}

	// Batch update time activities
	async updateBatchTimeActivity(
		timeActivityData: batchUpdateTimeActivityInterface,
		searchParams: any
	) {
		const {
			classId,
			className,
			customerId,
			customerName,
			isSelectedAll,
			timeActivityIds,
		} = timeActivityData;

		if ((customerId && !customerName) || (!customerId && customerName)) {
			throw new CustomError(400, 'Customer id and name both are required.');
		}

		if ((classId && !className) || (!classId && className)) {
			throw new CustomError(400, 'Class id and name both are required.');
		}

		// if (!classId && !customerId) {
		// 	throw new CustomError(400, 'Either class id or customer id is required.');
		// }

		if (!searchParams.payPeriodId) {
			throw new CustomError(400, 'Pay Period is required.');
		}

		// Check if company exists or not
		const companyDetails = await companyRepository.getDetails(
			searchParams.companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		if (isSelectedAll) {
			const timeActivities = await this.getAllTimeActivitiesServices(
				searchParams
			);

			const updated = await prisma.timeActivities.updateMany({
				where: {
					id: {
						in: timeActivities.timeActivitiesWithHours.map((t) => t.id),
					},
					companyId: searchParams.companyId,
				},
				data: {
					classId,
					className,
					customerId,
					customerName,
				},
			});

			return updated;
		} else {
			const updated = await prisma.timeActivities.updateMany({
				where: {
					id: {
						in: timeActivityIds,
					},
					companyId: searchParams.companyId,
				},
				data: {
					classId,
					className,
					customerId,
					customerName,
				},
			});
			return updated;
		}
	}

	// Create a new time activity in DB
	async createTimeActivity(createTimeActivityData: any) {
		const { companyId, employeeId } = createTimeActivityData;

		// Check if company exists or not
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		if (employeeId) {
			// Check if employee found
			const employeeDetails = await employeeRepository.getEmployeeDetails(
				employeeId as string
			);
			if (!employeeDetails) {
				throw new CustomError(404, 'Employee not found');
			}
		}

		const createdTimeActivity = await timeActivityRepository.createTimeActivity(
			createTimeActivityData
		);
		return createdTimeActivity;
	}

	// Delete time activity from DB
	async deleteTimeActivity(timeActivityData: updateTimeActivityInterface) {
		const { companyId, timeActivityId } = timeActivityData;

		// Check if company exists or not
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		// Deleted time logs
		const deleted = await timeActivityRepository.deleteTimeActivity({
			timeActivityId: timeActivityId,
			companyId: companyId,
		});
		return deleted;
	}

	// Export Time Activity
	async exportTimeActivity(
		companyId: string,
		search: string,
		classId: string,
		customerId: string,
		employeeId: string,
		payPeriodId: string,
		sort: string,
		type: string
	) {
		let dateFilters = {};
		let payPeriodData;
		if (payPeriodId) {
			// Get pay period details
			payPeriodData = await payPeriodRepository.getDetails(
				payPeriodId!,
				companyId
			);

			if (!payPeriodData) {
				throw new CustomError(404, 'Pay period not found');
			}

			const payPeriodStartDate = payPeriodData?.startDate;
			const payPeriodEndDate = payPeriodData?.endDate;

			let startDate = '';
			let endDate = '';

			if (payPeriodStartDate && payPeriodEndDate) {
				// Format start date
				startDate = moment(payPeriodStartDate).startOf('date').toISOString();
				// startDate = newStart.toISOString();

				// Format end date
				endDate = moment(payPeriodEndDate).endOf('date').toISOString();
				// endDate = newEnd.toISOString();
			}

			if (startDate && endDate) {
				if (startDate === endDate) {
					dateFilters = {
						activityDate: {
							equals: startDate,
						},
					};
				} else {
					dateFilters = {
						activityDate: {
							gte: startDate,
							lte: endDate,
						},
					};
				}
			} else {
				dateFilters = {};
			}
		}

		// Check If company exists
		const companyDetails = await companyRepository.getDetails(companyId);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		// Set filter conditions
		const filteredData = [];

		if (classId) {
			filteredData.push({ classId: classId });
		}
		if (customerId) {
			filteredData.push({ customerId: customerId });
		}
		if (employeeId) {
			filteredData.push({
				employee: {
					id: employeeId,
				},
			});
		}
		const filterConditions =
			filteredData?.length > 0
				? {
						AND: filteredData,
				  }
				: {};

		// Conditions for searching
		const searchCondition = search
			? {
					OR: [
						{
							className: { contains: search as string, mode: 'insensitive' },
						},
						{
							customerName: { contains: search as string, mode: 'insensitive' },
						},
						{
							employee: {
								fullName: { contains: search as string, mode: 'insensitive' },
							},
						},
					],
			  }
			: {};

		const sortCondition: any = sort
			? {
					orderBy: [
						{
							[sort as string]: type ?? 'asc',
						},
						{
							id: 'asc',
						},
					],
			  }
			: {
					orderBy: [
						{
							activityDate: 'desc',
						},
						{
							id: 'asc',
						},
					],
			  };

		if (sort === 'employee') {
			sortCondition['orderBy'] = [
				{
					employee: {
						fullName: type,
					},
				},
				{ id: 'asc' },
			];
		}

		const getAllActivities =
			await timeActivityRepository.getAllTimeActivityForExport({
				companyId: companyId,
				filterConditions: filterConditions,
				searchCondition: searchCondition,
				sortCondition: sortCondition,
				dateFilters: dateFilters,
			});

		const timeActivities: any = [];

		getAllActivities?.forEach((singleTimeActivity: any) => {
			if (
				singleTimeActivity.SplitTimeActivities &&
				singleTimeActivity.SplitTimeActivities.length > 0
			) {
				singleTimeActivity.SplitTimeActivities.forEach((singleSplit: any) => {
					const object = {
						'Activity Date': moment(singleSplit.activityDate).format(
							'MM/DD/YYYY'
						),
						'Employee Name': singleSplit?.employee?.fullName,
						Customer: singleSplit?.customerName
							? singleSplit?.customerName
							: 'NA',
						Class: singleSplit?.className ? singleSplit?.className : 'NA',
						Hours: `${singleSplit?.hours}:${singleSplit?.minute}`,
					};
					timeActivities.push(object);
				});
			} else {
				const object = {
					'Activity Date': moment(singleTimeActivity.activityDate).format(
						'MM/DD/YYYY'
					),
					'Employee Name': singleTimeActivity?.employee?.fullName,
					Customer: singleTimeActivity?.customerName
						? singleTimeActivity?.customerName
						: 'NA',
					Class: singleTimeActivity?.className
						? singleTimeActivity?.className
						: 'NA',
					Hours: `${singleTimeActivity?.hours}:${singleTimeActivity?.minute}`,
				};
				timeActivities.push(object);
			}
		});

		return { timeActivities, companyDetails, payPeriodData };
	}

	async calculateTimeActivitiesWithHours(timeActivities: any) {
		const finalData = await Promise.all(
			await timeActivities?.map(async (singleActivity: any) => {
				const field = await prisma.field.findFirst({
					where: {
						companyId: singleActivity?.companyId as string,
						name: 'Maximum allocate hours per year',
					},
				});
				const data = {
					employeeId: singleActivity?.employeeId,
					companyId: singleActivity?.companyId,
					year: new Date(singleActivity.activityDate).getFullYear(),
					fieldId: field?.id,
				};
				const employeeTotalHours =
					await timeActivityRepository.getEmployeeHours(data);

				let actualHours = 0;
				let actualMinutes = 0;

				const employeeHours =
					await timeActivityRepository.getTimeActivityByEmployee({
						companyId: singleActivity?.companyId,
						employeeId: singleActivity?.employeeId,
						year: new Date(singleActivity.activityDate).getFullYear(),
					});

				employeeHours?.map((singleEmpHours: any) => {
					actualHours += Number(singleEmpHours?.hours);
					actualMinutes += Number(singleEmpHours?.minute);
				});

				if (actualMinutes > 60) {
					const additionalHours = Math.floor(actualMinutes / 60);
					actualHours += additionalHours;
					actualMinutes %= 60;
				}

				const employeeFinalHours = {
					actualHours: actualHours,
					actualMinutes: actualMinutes,
					totalHours: Number(employeeTotalHours?.value?.split(':')[0]),
					totalMinutes: Number(employeeTotalHours?.value?.split(':')[1]),
				};

				return employeeFinalHours;
			})
		);

		const timeActivitiesWithHours = timeActivities?.map(
			(singleActivity: any, index: number) => {
				const totalHours = finalData[index]?.totalHours;
				const totalMinutes = finalData[index]?.totalMinutes;

				const actualHours = finalData[index]?.actualHours;
				const actualMinutes = finalData[index]?.actualMinutes;

				//  Calculate total time in minutes
				const totalTimeInMinutes = totalHours * 60 + totalMinutes;
				const actualTimeInMinutes = actualHours * 60 + actualMinutes;

				//  Calculate the difference in minutes
				let timeDifferenceInMinutes = totalTimeInMinutes - actualTimeInMinutes;

				// Take the absolute value of the result for further calculations
				timeDifferenceInMinutes = Math.abs(timeDifferenceInMinutes);

				//  Calculate hours and minutes from the difference
				const hoursDifference = Math.floor(
					Number(timeDifferenceInMinutes) / 60
				);
				const minutesDifference = Number(timeDifferenceInMinutes) % 60;

				const data = {
					...singleActivity,
					isOver: actualTimeInMinutes > totalTimeInMinutes ? true : false,
					totalHours: totalHours,
					totalMinutes: totalMinutes,
					actualHours: actualHours,
					actualMinutes: actualMinutes,
					overHours: hoursDifference,
					overMinutes: minutesDifference,
				};

				return data;
			}
		);

		return timeActivitiesWithHours;
	}

	async bulkCreateTimeActivities(bulkCreateTimeActivityData: any) {
		const { companyId, activities } = bulkCreateTimeActivityData;

		// Step 1: Check if company exists
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		const createdActivities: any[] = [];
		const errors: any[] = [];

		// Step 2: Extract all employee IDs from the activities
		const employeeIds = activities
			.map((activity: any) => activity.employeeId)
			.filter((id: string) => !!id); // Filter out undefined or null IDs

		let employeeDetailsMap: Record<string, any> = {};
		if (employeeIds.length > 0) {
			// Step 3: Fetch all employee details in bulk
			const employees = await employeeRepository.getEmployeesByIds(employeeIds);
			employeeDetailsMap = employees.reduce((map: any, employee: any) => {
				map[employee.id] = employee;
				return map;
			}, {});
		}

		// Step 4: Prepare activities for creation
		const activitiesToCreate = activities
			.map((activity: any) => {
				const { employeeId } = activity;

				if (employeeId && !employeeDetailsMap[employeeId]) {
					errors.push({ activity, error: 'Employee not found' });
					return null; // Skip this activity
				}

				return {
					...activity,
					companyId,
					employeeId: employeeId || null, // Assign null if no employeeId
				};
			})
			.filter((activity: any) => activity !== null); // Filter out null entries

		// Step 5: Bulk create the activities using createMany
		if (activitiesToCreate.length > 0) {
			try {
				await timeActivityRepository.createBulkTimeActivities(
					companyId,
					activitiesToCreate
				);
				createdActivities.push(...activitiesToCreate);
			} catch (err: any) {
				errors.push({ error: err.message });
			}
		}

		// Step 6: Return created activities and errors
		return { createdActivities, errors };
	}

	async bulkDeleteTimeActivities(timeActivityData: any) {
		const { timeActivityIds, companyId, payPeriodId } = timeActivityData;

		if (!timeActivityIds && !payPeriodId) {
			throw new CustomError(
				400,
				'Either timeActivityIds or payPeriodId must be provided'
			);
		}

		if (timeActivityIds && timeActivityIds.length > 0) {
			return await timeActivityRepository.deleteTimeActivitiesByIds(
				timeActivityIds,
				companyId
			);
		}

		if (payPeriodId) {
			return await timeActivityRepository.deleteTimeActivitiesByPayPeriod(
				payPeriodId,
				companyId
			);
		}

		throw new CustomError(400, 'Invalid delete criteria');
	}

	createOrUpdateTimelogMappingHistory = async (
		companyId: string,
		mappingData: any
	) => {
		// Check if a record with the given companyId already exists
		const existingRecord =
			await timeActivityRepository.findMappingHistoryByCompanyId(companyId);

		if (existingRecord) {
			// If it exists, update the existing record with the new mappingData
			return await timeActivityRepository.updateTimelogMappingHistory(
				existingRecord.id,
				mappingData
			);
		} else {
			// If it does not exist, create a new record
			return await timeActivityRepository.createTimelogMappingHistory(
				companyId,
				mappingData
			);
		}
	};

	getTimelogMappingHistory = async (companyId: string) => {
		if (companyId) {
			// If companyId is provided, fetch history for that company
			return await timeActivityRepository.findMappingHistoryByCompanyId(
				companyId
			);
		} else {
			// Otherwise, fetch all timelog mapping histories
			return await timeActivityRepository.findAllMappingHistory();
		}
	};
}

export default new TimeActivityService();
