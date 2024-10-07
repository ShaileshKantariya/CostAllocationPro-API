import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import { prisma } from '../client/prisma';

import dashboardRepository from '../repositories/dashboardRepository';
import costAllocationRepository from '../repositories/costAllocationRepository';
import moment from 'moment';
import { ITotalEmployeeHours } from '../interfaces/dashboardInterface';
import { getFiscalYearDates, monthNames } from '../utils/utils';

class DashboardServices {
	async getSalaryExpenseByMonthService(companyId: string, year: string) {
		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const journals = await dashboardRepository.getSalaryExpenseByMonth(
			companyId,
			year
		);

		const labels: any = [];
		const data: any = [];

		const obj: any = {};

		journals.forEach((singleJournal: any) => {
			const month = new Date(singleJournal?.date).getMonth() + 1;
			if (obj[month]) {
				obj[month] = Number(obj[month]) + Number(singleJournal?.amount);
			} else {
				obj[month] = Number(singleJournal?.amount);
			}
		});

		Object.entries(obj).forEach((singleData: any) => {
			const currentYear = year || new Date().getFullYear();

			labels.push(`${singleData[0]}-${currentYear}`);
			data.push(Number(Number(singleData[1]).toFixed(2)));
		});

		const number = Math.max(...data);
		const nearest1000 = Math.ceil(number / 1000) * 1000;
		const max = nearest1000 > number ? nearest1000 : nearest1000 + 1000;
		return { data, labels, max };
	}

	async getExpensesByCustomer(companyId: string, currentYear: string) {
		if (!companyId) {
			const error = new CustomError(400, 'Company id is required');
			throw error;
		}

		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			throw new CustomError(400, 'Company not found');
		}

		const fiscalYearDates = getFiscalYearDates(monthNames.indexOf(company.fiscalYear as string) + 1, monthNames.indexOf(company.fiscalYear as string) + 1, currentYear ? Number(currentYear) : undefined)
		const startDateOfYear = fiscalYearDates.startDate;
		const endDateOfYear = fiscalYearDates.endDate;
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

		for (const timeSheet of timeSheets) {
			const data = {
				companyId,
				payPeriodId: timeSheet.payPeriodId,
				timeSheetId: timeSheet.id,
				searchCondition: {}
			};

			const costAllocation =
				await costAllocationRepository.getExpensesByCustomer(data);

			response = [...response, ...costAllocation];
		}

		const finalMapping: any = {};

		response.forEach((e: any) => {
			if (finalMapping[e.name]) {
				finalMapping[e.name] = finalMapping[e.name] + e.value;
			} else {
				finalMapping[e.name] = e.value;
			}
		});

		const labels: string[] = [];
		const values: number[] = [];

		Object.keys(finalMapping)
			.sort()
			.forEach((key) => {
				labels.push(key);
				values.push(finalMapping[key]);
			});

		return { labels, values };
	}

	async getSalaryExpenseByPayPeriod(companyId: string, year: string) {
		if (!companyId) {
			const error = new CustomError(400, 'Company id is required');
			throw error;
		}

		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			throw new CustomError(400, 'Company not found');
		}

		const fiscalYearDates = getFiscalYearDates(monthNames.indexOf(company.fiscalYear as string) + 1, monthNames.indexOf(company.fiscalYear as string) + 1, year ? Number(year) : undefined)
		const startDateOfYear = fiscalYearDates.startDate;
		const endDateOfYear = fiscalYearDates.endDate;

		const currentYearPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
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

		const payPeriodIds = currentYearPayPeriods.map((payPeriod) => {
			return payPeriod.id;
		});

		const journalData = await prisma.journal.findMany({
			where: {
				companyId,
				payPeriodId: {
					in: payPeriodIds,
				},
			},
			include: {
				payPeriod: true,
			},
			orderBy: {
				payPeriod: {
					endDate: 'asc',
				},
			},
		});

		const labels: any = [];
		const data: any = [];

		journalData.forEach((journal: any) => {
			data.push(journal?.amount);
			labels.push(moment(journal?.payPeriod?.endDate).format('MM/DD/YYYY'));
		});

		const number = Math.max(...data);
		const nearest1000 = Math.ceil(number / 1000) * 1000;
		const max = nearest1000 > number ? nearest1000 : nearest1000 + 1000;
		return { data, labels, max };
	}

	async getAllJournalsWithPayPeriod(companyId: string) {
		// const currentYear = year ? year : new Date().getFullYear();

		// const startDateOfYear = new Date(
		// 	`${Number(currentYear)}-01-01T00:00:00.000Z`
		// );
		// const endDateOfYear = new Date(
		// 	`${Number(currentYear) + 1}-01-01T00:00:00.000Z`
		// );

		const currentYearPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
			},
			include: {
				Journal: true
			},
			orderBy: {
				endDate: 'desc'
			},
			take: 10
		});

		// const payPeriodIds = currentYearPayPeriods.map((payPeriod) => {
		// 	return payPeriod.id;
		// });

		// const journalData = await prisma.journal.findMany({
		// 	where: {
		// 		companyId,
		// 		payPeriodId: {
		// 			in: payPeriodIds,
		// 		},
		// 	},
		// 	include: {
		// 		payPeriod: true,
		// 	},
		// 	orderBy: {
		// 		payPeriod: {
		// 			endDate: 'desc',
		// 		},
		// 	},
		// });

		const graphData: any[] = [];

		if (currentYearPayPeriods && currentYearPayPeriods.length) {
			currentYearPayPeriods.forEach((currentYearPayPeriod) => {
				graphData.push({
					payPeriodId: currentYearPayPeriod.id,
					payPeriodName: `${moment(currentYearPayPeriod.startDate).format(
						'MM/DD/YYYY'
					)} - ${moment(currentYearPayPeriod.endDate).format('MM/DD/YYYY')}`,
					amount: currentYearPayPeriod.Journal?.amount,
					status: currentYearPayPeriod.Journal?.status,
					isJournalPublished: currentYearPayPeriod.isJournalPublished,
					payPeriodStartDate: currentYearPayPeriod.startDate,
					payPeriodEndDate: currentYearPayPeriod.endDate
				});
			});
		}

		// if (journalData && journalData.length) {
		// 	journalData.forEach((journal) => {
		// 		graphData.push({
		// 			payPeriodId: journal.payPeriodId,
		// 			payPeriodName: `${moment(journal.payPeriod.startDate).format(
		// 				'MM/DD/YYYY'
		// 			)} - ${moment(journal.payPeriod.endDate).format('MM/DD/YYYY')}`,
		// 			amount: journal.amount,
		// 			status: journal.status,
		// 		});
		// 	});
		// }

		return graphData;
	}

	async getEmployeeHoursGraphData(companyId: string, userId: string, year: string) {
		const companyRoleData = await prisma.companyRole.findFirst({
			where: {
				userId,
				companyId,
			},
		});

		if (!companyRoleData) {
			throw new CustomError(
				400,
				'You are not allow to access this company data'
			);
		}

		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			throw new CustomError(400, 'Company not found');
		} 

		const fiscalYearDates = getFiscalYearDates(monthNames.indexOf(company.fiscalYear as string) + 1, monthNames.indexOf(company.fiscalYear as string) + 1, year ? Number(year) : undefined)
		const startDateOfYear = moment(fiscalYearDates.startDate).format('YYYY-MM-DD');
		const endDateOfYear = moment(fiscalYearDates.endDate).format('YYYY-MM-DD');

		const query = `SELECT 
						ta."employeeId" as employeeId,
						e."fullName" as employeeName,
						(ROUND(sum(ta."minute"::numeric) / 60 + sum(ta."hours"::numeric), 2)) as totalHours
						FROM public."TimeActivities" ta 
						inner join public."Employee" e on ta."employeeId" = e."id"
						where ta."activityDate" BETWEEN '${startDateOfYear}' AND '${endDateOfYear}' AND ta."companyId" = '${companyId}'
						group by ta."employeeId", e."fullName"
						order by e."fullName" asc`;

		const graphData: ITotalEmployeeHours[] = await prisma.$queryRawUnsafe(
			query
		);

		const labels: string[] = [];

		const data: number[] = [];

		graphData.forEach((singleObj) => {
			labels.push(singleObj.employeename);
			data.push(singleObj.totalhours);
		});

		return { data, labels };
	}
}

export default new DashboardServices();
