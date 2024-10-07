/* eslint-disable no-mixed-spaces-and-tabs */
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import axios from 'axios';
import moment from 'moment';
import { prisma } from '../client/prisma';
import { awsConfig } from '../config/aws';
import { getTotalMinutes, minutesToHoursAndMinutes } from '../helpers/global';
import {
	EmailTimeSheetInterface,
	GetTimeSheetInterface,
	PdfTimeSheetInterface,
	TimeSheetInterface,
	ValidateTimeSheetInterface,
} from '../interfaces/timeSheetInterface';
import { CustomError } from '../models/customError';
import {
	companyRepository,
	employeeRepository,
	userRepository,
} from '../repositories';
import payPeriodRepository from '../repositories/payPeriodRepository';
import timeSheetRepository from '../repositories/timeSheetRepository';
import { generatePdf } from '../templates/timeSheetPdf';
import timeActivityServices from './timeActivityServices';
import { sortArray } from '../utils/utils';

const sqs = new SQSClient(awsConfig);

class TimeSheetServices {
	// Get all time sheets
	async getAllTimeSheets(timeSheetData: GetTimeSheetInterface) {
		const {
			companyId,
			payPeriodId,
			page,
			limit,
			search,
			createdBy,
			type,
			sort,
		} = timeSheetData;

		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		// Offset set
		const offset = (Number(page) - 1) * Number(limit);

		// Filter Conditions

		let filterConditions = {};

		if (createdBy) {
			filterConditions = {
				createdBy: {
					id: createdBy,
				},
			};
		}

		let payPeriodFilter = {};

		if (payPeriodId) {
			payPeriodFilter = {
				payPeriodId: payPeriodId,
			};
		}

		// Conditions for searching
		const searchCondition = search
			? {
				OR: [
					{
						name: { contains: search as string, mode: 'insensitive' },
					},
					{
						notes: { contains: search as string, mode: 'insensitive' },
					},
				],
			}
			: {};

		const orderByArray: any = [];

		if (sort === 'createdByName') {
			orderByArray.push({
				createdBy: {
					firstName: type ? type : 'desc',
				},
			});
		}

		if (sort === 'status') {
			orderByArray.push({
				status: type ? type : 'desc',
			});
		}

		orderByArray.push({
			submittedOn: 'desc',
		});

		const sortCondition = {
			orderBy: orderByArray,
		};

		const data = {
			companyId,
			offset: offset,
			limit: limit,
			filterConditions: filterConditions,
			searchCondition: searchCondition,
			sortCondition: sortCondition,
			payPeriodFilter: payPeriodFilter,
		};

		const { timeSheets, count } = await timeSheetRepository.getAllTimeSheets(
			data
		);

		timeSheets.forEach((singleTimeSheet: any) => {
			let approvedHours = 0;
			singleTimeSheet.timeActivities.forEach((singleTimeActivity: any) => {
				approvedHours += singleTimeActivity.hours
					? Number(singleTimeActivity.hours) * 60 +
					Number(singleTimeActivity.minute)
					: Number(singleTimeActivity.minute);
			});

			const formattedHours = minutesToHoursAndMinutes(approvedHours);
			singleTimeSheet['approvedHours'] = formattedHours;
			singleTimeSheet['createdByName'] =
				singleTimeSheet?.createdBy?.firstName +
				' ' +
				singleTimeSheet?.createdBy?.lastName;
			delete singleTimeSheet.timeActivities;
		});

		return { timeSheets, count };
	}

	async createTimeSheet(timeSheetData: TimeSheetInterface) {
		const { companyId, payPeriodId } = timeSheetData;

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const payPeriodDetails = await payPeriodRepository.getDetails(
			payPeriodId as string,
			companyId
		);

		if (!payPeriodDetails) {
			throw new CustomError(400, 'Pay period not found');
		}

		const timeActivities =
			await timeActivityServices.getAllTimeActivitiesServices({
				companyId: companyId,
				payPeriodId: payPeriodId,
			});

		// timeSheetData['timeActivities'] =
		// 	timeActivities.timeActivitiesWithHours.map(
		// 		(singleActivity: any) => singleActivity.id
		// 	);

		const allEmployees = await prisma.employee.findMany({
			where: {
				companyId,
				active: true
			},
			include: {
				EmployeeDirectAllocationConfig: {
					where: {
						payPeriodId,
						isActive: true
					}
				}
			}
		});

		const allEmployeeIds = allEmployees.map((e) => e.id);

		const foundEmployeesActivityOrConfig: string[] = [];

		allEmployees.forEach((emp) => {
			if (emp.EmployeeDirectAllocationConfig.length && !foundEmployeesActivityOrConfig.includes(emp.id)) {
				foundEmployeesActivityOrConfig.push(emp.id);
			}
		})

		const configuration = await prisma.configuration.findFirst({
			where: {
				payPeriodId,
				companyId,
			},
		});

		timeSheetData['timeActivities'] =
		timeActivities.timeActivitiesWithHours.filter((singleActivity: any) => {
			if (
					singleActivity.SplitTimeActivities &&
					singleActivity.SplitTimeActivities.length
				) {
					if (
						// !(
							singleActivity.SplitTimeActivities.length ===
							singleActivity.SplitTimeActivities.filter(
								(e: any) =>
									(!configuration?.isClassRequiredForJournal ||
										e.classId) &&
									(!configuration?.isCustomerRequiredForJournal ||
										e.customerId) &&
									(Number(e.hours) || Number(e.minute))
							).length
						// )
					) {
						if (
							!foundEmployeesActivityOrConfig.includes(
								singleActivity.employeeId
							)
						) {
							foundEmployeesActivityOrConfig.push(singleActivity.employeeId);
						}
						return singleActivity.id;
					}
				}

				if (
					(!configuration?.isClassRequiredForJournal ||
						singleActivity.classId) &&
					(!configuration?.isCustomerRequiredForJournal ||
						singleActivity.customerId) &&
					(Number(singleActivity.hours) || Number(singleActivity.minute)) &&
					!singleActivity.SplitTimeActivities.length
				) {
					if (
						!foundEmployeesActivityOrConfig.includes(singleActivity.employeeId)
					) {
						foundEmployeesActivityOrConfig.push(singleActivity.employeeId);
					}
					return singleActivity.id;
				}
			});


		// if (!name) {
		// 	const startDate = moment(payPeriodDetails.startDate).format('MM-DD-YYYY');
		// 	const endDate = moment(payPeriodDetails.endDate).format('MM-DD-YYYY');
		// 	timeSheetData['name'] = `Timesheet (${startDate} - ${endDate})`;
		// }

		timeSheetData['allTimeActivities'] = timeActivities.timeActivitiesWithHours;

		const timeSheet = await timeSheetRepository.createTimeSheet(timeSheetData);

		const notFoundEmployeesName: string[] = [];

		const notFoundEmployeesId: string[] = [];

		allEmployeeIds.forEach((e) => {
			if (!foundEmployeesActivityOrConfig.includes(e)) {
				notFoundEmployeesId.push(e);
			}
		});

		if (notFoundEmployeesId.length) {
			notFoundEmployeesId.forEach((e) => {
				const empData = allEmployees.find((x) => x.id === e);
				if (empData) {
					notFoundEmployeesName.push(empData.fullName);
				}
			});
		}

		return { timeSheet, notFoundEmployeesName };
	}

	async validateTimeSheet(timeSheetData: ValidateTimeSheetInterface) {
		const { companyId, payPeriodId } = timeSheetData;

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const payPeriodDetails = await payPeriodRepository.getDetails(
			payPeriodId as string,
			companyId
		);

		if (!payPeriodDetails) {
			throw new CustomError(400, 'Pay period not found');
		}

		const configuration = await prisma.configuration.findFirst({
			where: {
				payPeriodId,
				companyId
			}
		})

		const timeActivities =
			await timeActivityServices.getAllTimeActivitiesServices({
				companyId: companyId,
				payPeriodId: payPeriodId,
			});

		const validActivities = timeActivities.timeActivitiesWithHours.filter(
			(singleActivity: any) => {
				if (
					singleActivity.SplitTimeActivities &&
					singleActivity.SplitTimeActivities.length
				) {
					if (
						singleActivity.SplitTimeActivities.every(
							(e: any) =>
								(!configuration?.isCustomerRequiredForJournal ||
									e.customerId) &&
								(!configuration?.isClassRequiredForJournal || e.classId)
						)
					) {
						return singleActivity.id;
					}
				}

				if (
					(!configuration?.isCustomerRequiredForJournal ||
						singleActivity.customerId) &&
					(!configuration?.isClassRequiredForJournal ||
						singleActivity.classId) &&
					!singleActivity.SplitTimeActivities.length
				) {
					return singleActivity.id;
				}
			}
		);

		return {
			isValid: validActivities.length === timeActivities.timeActivitiesWithHours.length
		}
	}

	// Email time sheets
	async emailTimeSheet(timeSheetData: EmailTimeSheetInterface) {
		try {
			const { timeSheetId, employeeList, companyId, userId } = timeSheetData;

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(400, 'Company not found');
			}

			const timeSheetDetails = await timeSheetRepository.getTimeSheetDetails(
				timeSheetId
			);
			if (!timeSheetDetails) {
				throw new CustomError(400, 'Time sheet not found');
			}

			const loggedInUser = await userRepository.getById(userId!);

			const fullName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;

			await Promise.all(
				employeeList.map(async (singleEmployee: string) => {
					const data = {
						employeeId: singleEmployee,
						companyId: companyId,
						payPeriodId: timeSheetDetails.payPeriodId,
					};

					const { timeActivitiesWithHours: allTimeLogs } =
						await timeActivityServices.getAllTimeActivitiesServices(data);

					const customerIds: any = [];

					const { startDate, endDate } =
						await payPeriodRepository.getDatesByPayPeriod(
							timeSheetDetails.payPeriodId
						);

					let approvedHours = 0;
					allTimeLogs.forEach((singleTimeActivity: any) => {
						if (!customerIds.includes(singleTimeActivity.customerId)) {
							customerIds.push(singleTimeActivity.customerId);
						}
						approvedHours += getTotalMinutes(
							singleTimeActivity.hours,
							singleTimeActivity.minute
						);
					});

					const formattedHours = minutesToHoursAndMinutes(approvedHours);

					const uniqueCustomers: any = [];
					customerIds.forEach((singleCustomer: string) => {
						let customerMinutes = 0;
						const customerObject: any = {};
						let customerName = '';

						allTimeLogs.forEach((singleTimeActivity: any) => {
							if (singleTimeActivity.customerId === singleCustomer) {
								customerMinutes += getTotalMinutes(
									singleTimeActivity.hours,
									singleTimeActivity.minute
								);
								customerName = singleTimeActivity.customerName;
							}
						});

						customerObject['customerName'] = customerName;
						customerObject['hours'] = minutesToHoursAndMinutes(customerMinutes);
						uniqueCustomers.push(customerObject);
					});

					const pdfData = {
						allTimeLogs,
						startDate: startDate,
						endDate: endDate,
						employeeId: singleEmployee,
						totalHours: formattedHours.split(':')[0],
						totalMinutes: formattedHours.split(':')[1],
						timeSheetId
					};

					const employeeDetails = await employeeRepository.getEmployeeDetails(
						singleEmployee
					);

					const queueData = new SendMessageCommand({
						QueueUrl: `${process.env.QUEUE_URL}`,
						MessageBody: JSON.stringify({
							pdfData: pdfData,
							singleEmployee: employeeDetails,
							customers: uniqueCustomers,
							userName: fullName,
							companyDetails,
						}),
					});

					await sqs.send(queueData);
				})
			);
		} catch (err) {
			throw err;
		}
	}

	async getTimeSheetByPayPeriod(payPeriodId: string, companyId: string) {
		const timeSheetData = await prisma.timeSheets.findUnique({
			where: {
				payPeriodId,
			},
		});

		if (timeSheetData && timeSheetData.companyId != companyId) {
			throw new CustomError(400, 'Can not access timesheet');
		}

		return timeSheetData;
	}

	async getTimeSheetWiseEmployees(timeSheetId: string, companyId: string) {
		if (!timeSheetId) {
			throw new CustomError(400, 'Time Sheet id is required');
		}
		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const timeSheetDetails = await timeSheetRepository.getTimeSheetDetails(
			timeSheetId as string
		);

		if (!timeSheetDetails) {
			throw new CustomError(400, 'Time sheet not found');
		}

		const timeSheet = await timeSheetRepository.getEmployees(
			timeSheetId,
			companyId
		);

		const employeeIds: any = [];
		const newEmployees: any = [];

		timeSheet?.timeActivities.forEach((singleActivity: any) => {
			if (!employeeIds.includes(singleActivity.employee.id)) {
				employeeIds.push(singleActivity.employee.id);
			}
		});

		employeeIds.forEach((singleId: string) => {
			let minutes = 0;
			const objectEmp: any = {};
			const newArr = timeSheet?.timeActivities.filter(
				(singleActivity: any) => singleActivity.employee.id == singleId
			);

			newArr?.forEach((singleItem: any) => {
				minutes =
					(singleItem.hours
						? Number(singleItem.hours) * 60 + Number(singleItem.minute)
						: Number(singleItem.minute)) + Number(minutes);
				objectEmp['employeeId'] = singleItem.employee.id;
				objectEmp['employeeName'] = singleItem.employee.fullName;
				objectEmp['email'] = singleItem.employee.email;
			});

			// Convert minutes to hours

			const finalHours = minutesToHoursAndMinutes(minutes);
			objectEmp['approvedHours'] = finalHours;
			newEmployees.push(objectEmp);
		});

		// timeSheet &&
		// 	timeSheet.timeActivities.map((singleActivity: any) => {
		// 		let minutes = 0;
		// 		if (singleActivity.hours) {
		// 			minutes =
		// 				Number(singleActivity.hours) * 60 + Number(singleActivity.minute);
		// 		} else {
		// 			minutes = Number(singleActivity.minute);
		// 		}

		// 		if (object[singleActivity.employee.id]) {
		// 			object[singleActivity.employee.id] += Number(minutes);
		// 		} else {
		// 			object[singleActivity.employee.id] = minutes;
		// 		}
		// 	});

		const finalData = sortArray(newEmployees, 'asc', 'employeeName');

		return finalData;
	}

	async exportTimeSheetPdf(timeSheetData: PdfTimeSheetInterface) {
		const { timeSheetId, employeeId, companyId } = timeSheetData;

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const timeSheetDetails = await timeSheetRepository.getTimeSheetDetails(
			timeSheetId
		);
		if (!timeSheetDetails) {
			throw new CustomError(400, 'Time sheet not found');
		}

		const employeeDetails = await employeeRepository.getEmployeeDetails(
			employeeId
		);
		if (!employeeDetails) {
			throw new CustomError(400, 'Employee not found');
		}

		const data = {
			employeeId: employeeId,
			companyId: companyId,
			payPeriodId: timeSheetDetails.payPeriodId,
		};

		// Get time logs for employee
		const { timeActivitiesWithHours: allTimeLogs } =
			await timeActivityServices.getAllTimeActivitiesServices(data);

		const customerIds: any = [];

		const { startDate, endDate } =
			await payPeriodRepository.getDatesByPayPeriod(
				timeSheetDetails.payPeriodId
			);

		let approvedHours = 0;
		allTimeLogs.forEach((singleTimeActivity: any) => {
			if (singleTimeActivity.timeSheetId === timeSheetId) {
				if (
					singleTimeActivity.SplitTimeActivities &&
					singleTimeActivity.SplitTimeActivities.length > 0
				) {
					singleTimeActivity.SplitTimeActivities.forEach((timeActivity: any) => {
						if (!customerIds.includes(timeActivity.customerId)) {
							customerIds.push(timeActivity.customerId);
						}
						approvedHours += getTotalMinutes(
							timeActivity.hours,
							timeActivity.minute
						);
					});
				} else {
					if (!customerIds.includes(singleTimeActivity.customerId)) {
						customerIds.push(singleTimeActivity.customerId);
					}
					approvedHours += getTotalMinutes(
						singleTimeActivity.hours,
						singleTimeActivity.minute
					);
				}
			}
		});
		const formattedHours = minutesToHoursAndMinutes(approvedHours);

		const uniqueCustomers: any = [];
		customerIds.forEach((singleCustomer: string) => {
			let customerMinutes = 0;
			const customerObject: any = {};
			let customerName = '';

			allTimeLogs.forEach((singleTimeActivity: any) => {
				if (
					singleTimeActivity.SplitTimeActivities &&
					singleTimeActivity.SplitTimeActivities.length > 0
				) {
					singleTimeActivity.SplitTimeActivities.forEach(
						(timeActivity: any) => {
							if (timeActivity.customerId === singleCustomer) {
								customerMinutes += getTotalMinutes(
									timeActivity.hours,
									timeActivity.minute
								);
								customerName = timeActivity.customerName;
							}
						}
					);
				} else {
					if (singleTimeActivity.customerId === singleCustomer) {
						customerMinutes += getTotalMinutes(
							singleTimeActivity.hours,
							singleTimeActivity.minute
						);
						customerName = singleTimeActivity.customerName;
					}
				}
			});

			customerObject['customerName'] = customerName;
			customerObject['hours'] = minutesToHoursAndMinutes(customerMinutes);
			uniqueCustomers.push(customerObject);
		});

		const pdfData = {
			allTimeLogs,
			startDate: startDate,
			endDate: endDate,
			employeeId: employeeId,
			totalHours: formattedHours.split(':')[0],
			totalMinutes: formattedHours.split(':')[1],
			timeSheetId
		};

		const pdfHTML = generatePdf(
			pdfData,
			employeeDetails,
			uniqueCustomers,
			companyDetails.tenantName as string
		);

		const response = await axios.post(
			'https://pdf.satvasolutions.com/api/ConvertHtmlToPdf',
			{
				FileName: `${employeeDetails?.fullName}_${moment(
					pdfData.startDate
				).format('MM/DD/YYYY')} - ${moment(pdfData.endDate).format(
					'MM/DD/YYYY'
				)}.pdf`,
				HtmlData: [btoa(pdfHTML)],
			}
		);

		return response;
	}
}

export default new TimeSheetServices();
