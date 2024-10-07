/* eslint-disable @typescript-eslint/no-var-requires */
import moment from 'moment';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../client/prisma';
import {
	ICustomerExpenseReportData,
	ICustomerExpenseReportQuery,
	// IDistinctTimeActivityClasses,
	ITimeActivity,
	// ITimeActivitySummaryData,
	ITimeActivitySummaryQuery
} from '../interfaces/reportInterface';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import costAllocationRepository from '../repositories/costAllocationRepository';
import payPeriodRepository from '../repositories/payPeriodRepository';
import {
	generatePayrollSummaryReportPdf,
	generateTimeSummaryReportPdf,
} from '../templates/reportPdf';
import { getFiscalYearDates, hasText, monthNames } from '../utils/utils';
import configurationServices from './configurationServices';
const dataExporter = require('json2csv').Parser;

class ReportService {
	decimalHoursToHHMM(decimalHours: number) {
		const hours = Math.floor(decimalHours);
		const minutes = Math.round((decimalHours - hours) * 60);

		// Ensure leading zeros if needed
		const formattedHours = hours < 10 ? '0' + hours : hours;
		const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

		return formattedHours + ':' + formattedMinutes;
	}

	// async getTimeActivitySummaryReport(query: ITimeActivitySummaryQuery) {
	// 	let subQuery = `SELECT
    //                             e.id AS employeeId,
    //                             e."fullName",
    //                             ta."classId",
    //                             ta."className",
    //                             (ROUND(SUM(ta."minute"::numeric) / 60 + SUM(ta."hours"::numeric), 2)) AS _totalHours,
    //                             TO_CHAR(INTERVAL '1 minute' * (ROUND(SUM(ta."minute"::numeric) + SUM(ta."hours"::numeric) * 60, 0)), 'HH24:MI') AS totalHours
    //                         FROM
    //                             public."Employee" e
    //                         JOIN
    //                             public."TimeActivities" ta ON e.id = ta."employeeId"
    //                         WHERE
    //                             e."companyId" = '${query.companyId}' AND ta."className" IS NOT NULL`;

	// 	if (query.customerId) {
	// 		subQuery += ` AND ta."customerId" = '${query.customerId}'`;
	// 	}

	// 	let timeActivityIds: string[] = [];

	// 	if (query.payPeriodId) {
	// 		const payPeriodData = await prisma.payPeriod.findFirst({
	// 			where: {
	// 				id: query.payPeriodId,
	// 				companyId: query.companyId,
	// 			},
	// 			include: {
	// 				TimeSheets: {
	// 					include: {
	// 						timeActivities: true,
	// 					},
	// 				},
	// 			},
	// 		});

	// 		if (
	// 			payPeriodData &&
	// 			payPeriodData.isJournalPublished &&
	// 			payPeriodData.TimeSheets?.timeActivities.length
	// 		) {
	// 			timeActivityIds = payPeriodData.TimeSheets?.timeActivities.map((e) => {
	// 				return e.id;
	// 			});

	// 			// subQuery += ` AND ta."activityDate" BETWEEN '${moment(payPeriodData.startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss')}' AND '${moment(payPeriodData.endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')}' `
	// 		}
	// 	} else if (query.year) {
	// 		const startDateOfYear = new Date(
	// 			`${Number(query.year)}-01-01T00:00:00.000Z`
	// 		);
	// 		const endDateOfYear = new Date(
	// 			`${Number(query.year) + 1}-01-01T00:00:00.000Z`
	// 		);
	// 		//
	// 		const postedPayPeriods = await prisma.payPeriod.findMany({
	// 			where: {
	// 				companyId: query.companyId,
	// 				isJournalPublished: true,
	// 				OR: [
	// 					{
	// 						startDate: {
	// 							gte: startDateOfYear,
	// 							lt: endDateOfYear,
	// 						},
	// 					},
	// 					{
	// 						endDate: {
	// 							gte: startDateOfYear,
	// 							lt: endDateOfYear,
	// 						},
	// 					},
	// 				],
	// 			},
	// 			include: {
	// 				TimeSheets: {
	// 					include: {
	// 						timeActivities: true,
	// 					},
	// 				},
	// 			},
	// 		});

	// 		if (postedPayPeriods && postedPayPeriods.length) {
	// 			postedPayPeriods.forEach((period) => {
	// 				period.TimeSheets?.timeActivities.forEach((e) => {
	// 					timeActivityIds.push(e.id);
	// 				});
	// 			});
	// 		}
	// 	} else {
	// 		const postedPayPeriods = await prisma.payPeriod.findMany({
	// 			where: {
	// 				companyId: query.companyId,
	// 				isJournalPublished: true,
	// 			},
	// 			include: {
	// 				TimeSheets: {
	// 					include: {
	// 						timeActivities: true,
	// 					},
	// 				},
	// 			},
	// 		});

	// 		if (postedPayPeriods && postedPayPeriods.length) {
	// 			postedPayPeriods.forEach((period) => {
	// 				period.TimeSheets?.timeActivities.forEach((e) => {
	// 					timeActivityIds.push(e.id);
	// 				});
	// 			});
	// 		}
	// 	}

	// 	subQuery += ` AND ta."id" IN ('${timeActivityIds.join("', '")}')`;

	// 	subQuery += ` GROUP BY
    //                             e.id, e."fullName", ta."classId", ta."className"`;

	// 	let rawQuery = `SELECT
    //                     "employeeid",
    //                     "fullName",
    //                     ARRAY_AGG(
    //                         jsonb_build_object(
    //                             'classId', "classId",
    //                             'className', "className",
    //                             'totalHoursNumber', "_totalhours",
    //                             'totalHours', "totalhours"
    //                         )
    //                     ) AS timeActivities,
    //                     TO_CHAR(INTERVAL '1 minute' * (ROUND(SUM("_totalhours") * 60, 0)), 'HH24:MI') AS overallTotalHours,
    //                     SUM("_totalhours") as totalHoursNumber
    //                 FROM
    //                     ( ${subQuery} ) AS Employee`;

	// 	if (hasText(query.search)) {
	// 		rawQuery += ` WHERE "fullName" ILIKE '%${query.search}%'`;
	// 	}

	// 	rawQuery += ` GROUP BY
    //                     employeeid, "fullName"
    //                 ORDER BY
    //                     "fullName" ASC`;

	// 	const data: ITimeActivitySummaryData[] = await prisma.$queryRawUnsafe<
	// 	ITimeActivitySummaryData[]
	// 	>(rawQuery);
	// 	console.log("🚀 ~ ReportService ~ getTimeActivitySummaryReport ~ data:", data)

	// 	const distinctClassNameQuery = `SELECT
	// 										DISTINCT "className"
    //                                 	FROM
	// 										public."TimeActivities"
    //                                 	WHERE
	// 										"className" IS NOT NULL AND
	// 										"companyId" = '${query.companyId}' AND
	// 										"id" IN ('${timeActivityIds.join("', '")}')`;

	// 	const disTinctClassNames: IDistinctTimeActivityClasses[] =
	// 		await prisma.$queryRawUnsafe(distinctClassNameQuery);

	// 	const classNames = disTinctClassNames.map((e) => {
	// 		return e.className;
	// 	});

	// 	const timeActivitySummary: {
	// 		[key: string]: number | string | null | undefined;
	// 	}[] = [];

	// 	let totalHours = 0;
	// 	const totalRow: { [key: string]: number | string | null | undefined } = {};

	// 	data.forEach((entity: ITimeActivitySummaryData) => {
	// 		const obj: { [key: string]: string | number | null | undefined } = {
	// 			id: entity.employeeid,
	// 			name: entity.fullName,
	// 			totalHours: entity.overalltotalhours,
	// 		};

	// 		entity.timeactivities.forEach((activity: ITimeActivity) => {
	// 			obj[activity.className] = activity.totalHours;
	// 			if (totalRow[activity.className]) {
	// 				totalRow[activity.className] =
	// 					Number(Number(totalRow[activity.className]).toFixed(2)) +
	// 					Number(activity.totalHoursNumber.toFixed(2));
	// 			} else {
	// 				totalRow[activity.className] = activity.totalHoursNumber;
	// 			}
	// 		});

	// 		totalHours =
	// 			Number(totalHours.toFixed(2)) +
	// 			Number(entity.totalhoursnumber.toFixed(2));

	// 		timeActivitySummary.push(obj);
	// 	});

	// 	if (timeActivitySummary.length) {
	// 		classNames.forEach((e) => {
	// 			if (totalRow[e]) {
	// 				totalRow[e] = this.decimalHoursToHHMM(Number(totalRow[e]));
	// 			}
	// 		});

	// 		timeActivitySummary.push({
	// 			id: uuidv4(),
	// 			name: 'Total',
	// 			...totalRow,
	// 			totalHours: this.decimalHoursToHHMM(totalHours),
	// 		});
	// 	}

	// 	return { timeActivitySummary, classNames };
	// }

	async getTimeActivitySummaryReport(query: ITimeActivitySummaryQuery) {


		const timeActivityIds: string[] = [];

		if (query.payPeriodId) {
			const payPeriodData = await prisma.payPeriod.findFirst({
				where: {
					id: query.payPeriodId,
					companyId: query.companyId,
				},
				include: {
					TimeSheets: {
						include: {
							timeActivities: true,
						},
					},
				},
			});

			if (
				payPeriodData &&
				payPeriodData.isJournalPublished &&
				payPeriodData.TimeSheets?.timeActivities.length
			) {
				timeActivityIds.push(
					// eslint-disable-next-line no-unsafe-optional-chaining
					...payPeriodData?.TimeSheets?.timeActivities.map((e) => e.id)
				);
			}
		} else if (query.year) {
			const startDateOfYear = new Date(`${Number(query.year)}-01-01T00:00:00.000Z`);
			const endDateOfYear = new Date(`${Number(query.year) + 1}-01-01T00:00:00.000Z`);

			const postedPayPeriods = await prisma.payPeriod.findMany({
				where: {
					companyId: query.companyId,
					isJournalPublished: true,
					OR: [
						{
							startDate: {
								gte: startDateOfYear,
								lt: endDateOfYear,
							},
						},
						{
							endDate: {
								gte: startDateOfYear,
								lt: endDateOfYear,
							},
						},
					],
				},
				include: {
					TimeSheets: {
						include: {
							timeActivities: true,
						},
					},
				},
			});
			if (postedPayPeriods && postedPayPeriods.length) {
			postedPayPeriods.forEach((period) => {
				period.TimeSheets?.timeActivities.forEach((e) => {
					timeActivityIds.push(e.id);
				});
			});
			}
		} else {
			const postedPayPeriods = await prisma.payPeriod.findMany({
				where: {
					companyId: query.companyId,
					isJournalPublished: true,
				},
				include: {
					TimeSheets: {
						include: {
							timeActivities: true,
						},
					},
				},
			});

			if (postedPayPeriods && postedPayPeriods.length) {
			postedPayPeriods.forEach((period) => {
				period.TimeSheets?.timeActivities.forEach((e) => {
					timeActivityIds.push(e.id);
				});
			});
		}
		}

		const employees = await prisma.employee.findMany({
			where: {
				companyId: query.companyId,
				timeActivities: {
					some: {
						className: {
							not: null,
						},
						...(query.customerId && {
							customerId: query.customerId,
						}),
						...(
							// timeActivityIds.length > 0 && 
							{
							id: {
								in: timeActivityIds,
							},
						}),
					},
				},
				
			},
			select: {
				id: true,
				fullName: true,
				timeActivities: {
					where: {
						className: {
							not: null,
						},
						...(query.customerId && {
							customerId: query.customerId,
						}),
						...(
							// timeActivityIds.length > 0 && 
							{
							id: {
								in: timeActivityIds,
							},
						}),
					},
					select: {
						classId: true,
						className: true,
						minute: true,
						hours: true,
					},
				},
			},
			orderBy: {
				fullName: 'asc',
			},
		});

		// let formattedResult = employees
		// 	.filter((employee) => employee.timeActivities.length > 0)
		// 	.map((employee) => {
		// 		const timeActivities = employee.timeActivities.map((ta:any) => {
		// 			const totalMinutes = ta.minute + ta.hours * 60;
		// 			const totalHoursNumber = Math.round((totalMinutes / 60) * 100) / 100;
		// 			const totalHoursFormatted = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(
		// 				totalMinutes % 60
		// 			).padStart(2, '0')}`;

		// 			return {
		// 				classId: ta.classId,
		// 				className: ta.className,
		// 				totalHoursNumber,
		// 				totalHours: totalHoursFormatted,
		// 			};
		// 		});

		// 		const overallTotalMinutes = timeActivities.reduce(
		// 			(sum, ta) => sum + ta.totalHoursNumber * 60,
		// 			0
		// 		);
		// 		const overallTotalHours = `${String(Math.floor(overallTotalMinutes / 60)).padStart(2, '0')}:${String(
		// 			overallTotalMinutes % 60
		// 		).padStart(2, '0')}`;
		// 		const overallTotalHoursNumber = Math.round((overallTotalMinutes / 60) * 100) / 100;

		// 		return {
		// 			employeeid: employee.id,
		// 			fullName: employee.fullName,
		// 			timeActivities,
		// 			overalltotalhours: overallTotalHours,
		// 			totalhoursnumber: overallTotalHoursNumber,
		// 		};
		// 	});
		let formattedResult = employees
			.filter((employee) => employee.timeActivities.length > 0)
			.map((employee) => {
				const timeActivities = employee.timeActivities.map((ta: any) => {
					const totalMinutes = Math.round(ta.hours * 60) + Math.round(ta.minute);
					const totalHoursNumber = (totalMinutes / 60);
					const totalHoursFormatted = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(
						totalMinutes % 60
					).padStart(2, '0')}`;

					return {
						classId: ta.classId,
						className: ta.className,
						totalHoursNumber,
						totalHours: totalHoursFormatted,
					};
				});

				const overallTotalMinutes = timeActivities.reduce(
					(sum, ta) => sum + Math.round(ta.totalHoursNumber * 60),
					0
				);
				const overallTotalHours = `${String(Math.floor((overallTotalMinutes / 60))).padStart(2, '0')}:${String(
					overallTotalMinutes % 60
				).padStart(2, '0')}`;
				const overallTotalHoursNumber = Math.round(((overallTotalMinutes / 60) * 100)) / 100;

				return {
							employeeid: employee.id,
							fullName: employee.fullName,
							timeActivities,
							overalltotalhours: overallTotalHours,
							totalhoursnumber: overallTotalHoursNumber,
						};
			});



		if (query?.search) {
			formattedResult = formattedResult.filter((employee) =>
				employee.fullName.toLowerCase().includes((query.search as string).toLowerCase())
			);
		}


		const disTinctClassNames = await prisma.timeActivities.findMany({
			where: {
				className: {
					not: null,
				},
				companyId: query.companyId,
				id: {
					in: timeActivityIds,
				},
			},
			distinct: ['className'],
			select: {
				className: true,
			},
		});
			const classNames = disTinctClassNames.map((e) => {
				return e.className;
			});

			const timeActivitySummary: {
				[key: string]: number | string | null | undefined;
			}[] = [];

			let totalHours = 0;
			const totalRow: { [key: string]: number | string | null | undefined } = {};

			formattedResult.forEach((entity: any) => {
				const obj: { [key: string]: string | number | null | undefined } = {
					id: entity.employeeid,
					name: entity.fullName,
					totalHours: entity.overalltotalhours,
				};

				entity.timeActivities.forEach((activity: ITimeActivity) => {
					obj[activity.className] = activity.totalHours;
					if (totalRow[activity.className]) {
						totalRow[activity.className] =
							Number(Number(totalRow[activity.className]).toFixed(2)) +
							Number(activity.totalHoursNumber.toFixed(2));
					} else {
						totalRow[activity.className] = activity.totalHoursNumber;
					}
				});

				totalHours =
					Number(totalHours.toFixed(2)) +
					Number(entity.totalhoursnumber.toFixed(2));

				timeActivitySummary.push(obj);
			});

			if (timeActivitySummary.length) {
				classNames?.forEach((e) => {
					if (totalRow[e as string]) {
						totalRow[e as string] = this.decimalHoursToHHMM(Number(totalRow[e as string]));
					}
				});

				timeActivitySummary.push({
					id: uuidv4(),
					name: 'Total',
					...totalRow,
					totalHours: this.decimalHoursToHHMM(totalHours),
				});
			}

			return { timeActivitySummary, classNames };

	}

	async getExpensesByCustomerReport(
		searchParameters: ICustomerExpenseReportQuery
	) {
		const { companyId, year, search } = searchParameters;

		if (!companyId) {
			const error = new CustomError(400, 'Company id is required');
			throw error;
		}

		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			throw new CustomError(400, 'Company not found');
		}

		const fiscalYearDates = getFiscalYearDates(
			monthNames.indexOf(company.fiscalYear as string) + 1,
			monthNames.indexOf(company.fiscalYear as string) + 1,
			year ? Number(year) : undefined
		);
		const startDateOfYear = fiscalYearDates.startDate;
		const endDateOfYear = fiscalYearDates.endDate;

		// const _year = year ? year : new Date().getFullYear();
		// const startDateOfYear = new Date(`${Number(_year)}-01-01T00:00:00.000Z`);
		// const endDateOfYear = new Date(`${Number(_year) + 1}-01-01T00:00:00.000Z`);
		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
				isJournalPublished: true,
				OR: [
					{
						startDate: {
							gte: startDateOfYear,
							lt: endDateOfYear,
						},
					},
					{
						endDate: {
							gte: startDateOfYear,
							lt: endDateOfYear,
						},
					},
				],
			},
		});

		const payPeriodIds = payPeriods.map((e) => {
			return e.id;
		});

		const timeSheets = await prisma.timeSheets.findMany({
			where: {
				companyId,
				payPeriodId: {
					in: payPeriodIds,
				},
			},
		});

		let response: any[] = [];

		let customerSearchCondition: any = {};

		if (hasText(search)) {
			customerSearchCondition = {
				customerName: {
					contains: search,
					mode: 'insensitive',
				},
			};
		}

		for (const timeSheet of timeSheets) {
			const data = {
				companyId,
				payPeriodId: timeSheet.payPeriodId,
				timeSheetId: timeSheet.id,
				searchCondition: customerSearchCondition,
			};

			const costAllocation =
				await costAllocationRepository.getExpensesByCustomer(data);

			response = [...response, ...costAllocation];
		}

		const finalMapping: any = {};

		response.forEach((e: any) => {
			if (finalMapping[e.name]) {
				finalMapping[e.name].value = finalMapping[e.name].value + e.value;
			} else {
				finalMapping[e.name] = e;
			}
		});

		const finalData: ICustomerExpenseReportData[] = [];

		Object.keys(finalMapping)
			.sort()
			.forEach((key) => {
				finalData.push({
					name: key,
					expense: finalMapping[key].value,
					id: finalMapping[key].id,
				});
			});

		return finalData;
	}

	async getTimeActivitySummaryReportPdf(
		data: any,
		query: ITimeActivitySummaryQuery
	) {
		const companyDetails = await companyRepository.getDetails(
			query.companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const filePath = path.join(
			__dirname,
			'..',
			'costAllocationPdfs',
			`${new Date().getUTCDate()}time-summary-report.pdf`
		);
		const htmlContent = await generateTimeSummaryReportPdf(
			data,
			filePath,
			companyDetails.tenantName as string,
			query as unknown as ITimeActivitySummaryQuery
		);
		return htmlContent;
	}

	async getTimeActivitySummaryReportCsv(data: any, query: any) {
		const companyDetails = await companyRepository.getDetails(query.companyId);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const fileHeader: any = [
			'Employee Name',
			...data.classNames,
			'Total Hours',
		];

		const timeActivitySummary: any[] = [];

		data.timeActivitySummary.forEach((timeActivity: any) => {
			const obj: { [key: string]: any } = {
				'Employee Name': timeActivity['name'],
			};

			data.classNames.forEach((e: string) => {
				obj[e] = timeActivity[e] ? timeActivity[e] : '';
			});

			obj['Grand Total'] = timeActivity['totalHours'];
			timeActivitySummary.push(obj);
		});

		const jsonData = new dataExporter({ fileHeader });

		let extraData = `Report Name ,Time Summary Report\n`;

		extraData += `QuickBooks Company's Name ,${companyDetails?.tenantName}\n`;

		if (query.payPeriodId) {
			// Pay period date range
			const { startDate, endDate } =
				await payPeriodRepository.getDatesByPayPeriod(query.payPeriodId);

			extraData += `Pay Period ,${moment(startDate).format(
				'MM/DD/YYYYY'
			)} - ${moment(endDate).format('MM/DD/YYYYY')}\n`;
		}

		extraData += `\n`;

		const csvData = jsonData.parse(timeActivitySummary);
		return extraData + csvData;
	}

	async getAllPublishedPayrollSummary(costAllocationData: any) {
		let payPeriodId = costAllocationData.payPeriodId;
		let isSystemPayPeriod = false;

		if (!payPeriodId) {
			const latestPayPeriodId = await prisma.payPeriod.findFirst({
				where: {
					companyId: costAllocationData?.companyId,
					isJournalPublished: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
			});

			if (latestPayPeriodId) {
				payPeriodId = latestPayPeriodId.id;
				isSystemPayPeriod = true;
			}
		}

		if (!payPeriodId) {
			return { content: [], currentPayPeriodId: null };
		}

		const payPeriodData = await prisma.payPeriod.findFirst({
			where: {
				id: payPeriodId,
				companyId: costAllocationData?.companyId,
				isJournalPublished: true,
			},
		});

		if (!payPeriodData) {
			throw new CustomError(400, 'Invalid PayPeriod');
		}
		// if (costAllocationData?.payPeriodId) {
		// }

		const timeSheetData = await prisma.timeSheets.findFirst({
			where: {
				payPeriodId: payPeriodId,
				companyId: costAllocationData?.companyId,
			},
		});

		if (!timeSheetData) {
			return { content: [], currentPayPeriodId: null };
		}
		const offset =
			(Number(costAllocationData.page) - 1) * Number(costAllocationData.limit);

		const filteredData = [];
		const empFilteredData = [];

		if (costAllocationData?.classId) {
			filteredData.push({ classId: costAllocationData?.classId });
		}
		if (costAllocationData?.customerId) {
			filteredData.push({ customerId: costAllocationData?.customerId });
		}

		if (costAllocationData?.employeeId) {
			empFilteredData.push({
				id: costAllocationData?.employeeId,
			});
		}

		const empFilterConditions =
			empFilteredData?.length > 0
				? {
					AND: empFilteredData,
					// eslint-disable-next-line no-mixed-spaces-and-tabs
				}
				: {};

		const filterConditions =
			filteredData?.length > 0
				? {
					AND: filteredData,
					// eslint-disable-next-line no-mixed-spaces-and-tabs
				}
				: {};

		const searchCondition = costAllocationData.search
			? {
				OR: [
					{
						className: {
							contains: costAllocationData.search as string,
							mode: 'insensitive',
						},
					},
					{
						customerName: {
							contains: costAllocationData.search as string,
							mode: 'insensitive',
						},
					},
					{
						employee: {
							fullName: {
								contains: costAllocationData.search as string,
								mode: 'insensitive',
							},
						},
					},
				],
				// eslint-disable-next-line no-mixed-spaces-and-tabs
			}
			: {};
		// Conditions for sort
		const sortCondition: any = {
			orderBy: [],
		};
		if (costAllocationData.sort) {
			sortCondition.orderBy.push({
				[costAllocationData.sort as string]: costAllocationData.type ?? 'asc',
			});
		}

		sortCondition.orderBy.push({
			id: 'desc',
		});

		costAllocationData.timeSheetId = String(timeSheetData.id);
		const costAllocationRepofilter = {
			companyId: costAllocationData.companyId,
			offset: offset,
			type: costAllocationData.type,
			limit: Number(costAllocationData.limit),
			searchCondition,
			sortCondition,
			filterConditions,
			empFilterConditions,
			classId: String(costAllocationData.classId),
			customerId: String(costAllocationData.customerId),
			employeeId: String(costAllocationData.employeeId),
			isPercentage: costAllocationData.isPercentage,
			payPeriodId: payPeriodId,
			timeSheetId: timeSheetData.id,
		};
		const data = await costAllocationRepository.getCostAllocation(
			costAllocationRepofilter
		);

		const finalData = data.result.filter((e) => e.totalRowEmployeeName);

		const sections = await prisma.configurationSection.findMany({
			where: {
				companyId: costAllocationData.companyId,
				no: {
					gt: 0,
				},
				payPeriodId,
			},
			include: {
				fields: true,
			},
		});

		const withOutTotalFields: string[] = [];

		sections.forEach((section) => {
			section.fields.forEach((field) => {
				if (field.jsonId.startsWith('f')) {
					withOutTotalFields.push(field.id);
				}
			});
		});

		finalData.forEach((e) => {
			e['employee-name'] = e['totalRowEmployeeName'];
			e['total'] = costAllocationRepository.getRowWiseTotal(
				e,
				withOutTotalFields
			);
		});

		const grandTotalRow =
			costAllocationRepository.getGrandTotalRowCostAllocation(finalData);

		if (grandTotalRow) {
			finalData.push({
				...grandTotalRow,
				id: uuidv4(),
			});
		}

		return {
			content: finalData,
			currentPayPeriodId: isSystemPayPeriod ? payPeriodId : null,
		};
	}

	async getPayrollSummaryReportPdf(query: any) {
		const companyDetails = await companyRepository.getDetails(
			query.companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const sections = await configurationServices.getFieldsSection(
			query.companyId,
			query.payPeriodId
		);

		const headers: any = [];

		sections.forEach((section) => {
			if (section.no != 0) {
				section.fields.forEach((field: any) => {
					if (field.isActive && field.jsonId.startsWith('f')) {
						headers.push({ name: field.name, value: field.id });
					}
				});
			}
		});

		const data = await this.getAllPublishedPayrollSummary(
			query as ICustomerExpenseReportQuery
		);

		const filePath = path.join(
			__dirname,
			'..',
			'costAllocationPdfs',
			`${new Date().getUTCDate()}payroll-summary-report.pdf`
		);

		const finalData = await generatePayrollSummaryReportPdf(
			data.content,
			headers,
			filePath,
			companyDetails.tenantName as string,
			query as unknown as ITimeActivitySummaryQuery
		);

		return finalData;
	}

	async getPayrollSummaryReportCsv(data: any, query: any) {
		const companyDetails = await companyRepository.getDetails(query.companyId);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const sections = await configurationServices.getFieldsSection(
			query.companyId,
			query.payPeriodId
		);

		const headers: any = [];

		sections.forEach((section) => {
			if (section.no != 0) {
				section.fields.forEach((field: any) => {
					if (field.isActive && field.jsonId.startsWith('f')) {
						headers.push({ name: field.name, value: field.id });
					}
				});
			}
		});

		const finalDataArr = data.map((singleData: any) => {
			const obj: any = {};
			obj['Employee Name'] = singleData['employee-name'];
			obj['Allocation'] = singleData['allocation'];
			headers.forEach((header: any) => {
				obj[header.name] = singleData[header.value]
					? `$${Number(singleData[header.value]).toFixed(2)}`
					: `$0.00`;
			});
			obj['Total'] = `$${Number(singleData['total']).toFixed(2)}`;
			return obj;
		});

		const fileHeader: any = ['Employee Name', 'Total Hours'];

		const jsonData = new dataExporter({ fileHeader });

		let extraData = `Report Name ,Payroll Summary Report\n`;

		extraData += `QuickBooks Company's Name ,${companyDetails?.tenantName}\n`;

		if (query.payPeriodId) {
			// Pay period date range
			const { startDate, endDate } =
				await payPeriodRepository.getDatesByPayPeriod(query.payPeriodId);

			extraData += `Pay Period ,${moment(startDate).format(
				'MM/DD/YYYYY'
			)} - ${moment(endDate).format('MM/DD/YYYYY')}\n`;
		}

		extraData += `\n`;

		const csvData = jsonData.parse(finalDataArr);
		return extraData + csvData;
	}
}

export default new ReportService();
