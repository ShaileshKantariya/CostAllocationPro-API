/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-var-requires */
import moment from 'moment';
import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import costAllocationRepository from '../repositories/costAllocationRepository';
import payPeriodRepository from '../repositories/payPeriodRepository';
import timeSheetRepository from '../repositories/timeSheetRepository';
import path from 'path';
const dataExporter = require('json2csv').Parser;

class CostAllocationServices {
	async getCostAllocationData(costAllocationData: any) {
		if (costAllocationData?.payPeriodId) {
			const payPeriodData = await prisma.payPeriod.findFirst({
				where: {
					id: costAllocationData?.payPeriodId,
					companyId: costAllocationData?.companyId,
				},
			});

			if (!payPeriodData) {
				throw new CustomError(400, 'Invalid PayPeriod');
			}
		}

		const timeSheetData = await prisma.timeSheets.findFirst({
			where: {
				payPeriodId: costAllocationData?.payPeriodId,
				companyId: costAllocationData?.companyId,
			},
		});

		if (!timeSheetData) {
			return { result: [], employeeRowSpanMapping: {} };
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
			payPeriodId: costAllocationData.payPeriodId,
			timeSheetId: timeSheetData.id,
		};
		const data = await costAllocationRepository.getCostAllocation(
			costAllocationRepofilter
		);
		return data;
	}

	async getCostAllocationDataGrandTotal(costAllocationData: any) {
		if (costAllocationData?.payPeriodId) {
			const payPeriodData = await prisma.payPeriod.findFirst({
				where: {
					id: costAllocationData?.payPeriodId,
					companyId: costAllocationData?.companyId,
				},
			});

			if (!payPeriodData) {
				throw new CustomError(400, 'Invalid PayPeriod');
			}
		}

		const timeSheetData = await prisma.timeSheets.findFirst({
			where: {
				payPeriodId: costAllocationData?.payPeriodId,
				companyId: costAllocationData?.companyId,
			},
		});

		if (!timeSheetData) {
			return null;
		}

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
			offset: null,
			type: costAllocationData.type,
			limit: null,
			searchCondition,
			sortCondition,
			filterConditions,
			empFilterConditions,
			classId: String(costAllocationData.classId),
			customerId: String(costAllocationData.customerId),
			employeeId: String(costAllocationData.employeeId),
			isPercentage: costAllocationData.isPercentage,
			payPeriodId: costAllocationData.payPeriodId,
			timeSheetId: timeSheetData.id,
		};
		const data = await costAllocationRepository.getCostAllocation(
			costAllocationRepofilter
		);

		const totalRowMapping =
			costAllocationRepository.getGrandTotalRowCostAllocation(
				data.result.filter((e) => e['employee-name'] === 'Total')
			);
		return totalRowMapping;
	}

	async exportCostAllocationCSV(costAllocationData: any) {
		const { companyId, payPeriodId } = costAllocationData;

		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}
		if (!payPeriodId) {
			throw new CustomError(400, 'Pay period id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const payPeriodDetails = await payPeriodRepository.getDetails(
			payPeriodId,
			companyId
		);

		if (!payPeriodDetails) {
			throw new CustomError(400, 'Invalid Pay Period');
		}

		const timeSheet = await timeSheetRepository.getTimeSheetByPayPeriod(
			payPeriodId
		);

		if (!timeSheet) {
			throw new CustomError(
				400,
				'No cost allocation available for this pay period'
			);
		}

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
							fullName: {
								mode: 'insensitive',
								contains: costAllocationData.search as string,
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

		const data = {
			companyId: costAllocationData.companyId,
			type: costAllocationData.type,
			searchCondition,
			sortCondition,
			filterConditions,
			empFilterConditions,
			classId: String(costAllocationData.classId),
			customerId: String(costAllocationData.customerId),
			employeeId: String(costAllocationData.employeeId),
			isPercentage: costAllocationData.isPercentage,
			payPeriodId: costAllocationData.payPeriodId,
			timeSheetId: timeSheet && timeSheet.id,
		};

		const costAllocation = await costAllocationRepository.getCostAllocation(
			data
		);

		const totalRowMapping =
			costAllocationRepository.getGrandTotalRowCostAllocation(
				costAllocation.result.filter((e) => e['employee-name'] === 'Total')
			);

		if (totalRowMapping) {
			costAllocation.result = [...costAllocation.result, totalRowMapping];
		}

		const sectionWiseFields = await prisma.configurationSection.findMany({
			where: {
				companyId: companyId as string,
				no: {
					gt: 0,
				},
				payPeriodId
			},
			include: {
				fields: {
					orderBy: {
						jsonId: 'asc',
					},
					where: {
						isActive: true,
						payPeriodId
					}
				},
			},
			orderBy: {
				no: 'asc',
			},
		});

		const finalFieldMapping: any = {
			'employee-name': 'Employee Name',
			'customer-name': 'Customer Name',
			'class-name': 'Class Name',
			'total-hours': 'Total Hours',
			allocation: 'Allocation',
		};

		sectionWiseFields.forEach((singleSection: any) => {
			singleSection.fields.forEach((singleField: any) => {
				finalFieldMapping[singleField.id] = singleField.name;
			});
		});

		finalFieldMapping['indirect-allocation'] = 'Indirect Allocation';

		const finalDataArr: any[] = [];

		costAllocation.result.forEach((singleAllocation: any) => {
			const obj: any = {};
			Object.keys(finalFieldMapping).forEach((key: any) => {
				if (
					singleAllocation[key] != undefined &&
					singleAllocation[key] != null
				) {
					obj[finalFieldMapping[key]] =
						typeof singleAllocation[key] === 'number'
							? `$ ${Number(singleAllocation[key]).toFixed(4)}`
							: singleAllocation[key];
				}
			});
			finalDataArr.push(obj);
		});

		const costAllocationDataArr = JSON.parse(JSON.stringify(finalDataArr));

		const fileHeader: any = [
			'Activity Date',
			'Employee Name',
			'Customer',
			'Class',
			'Hours',
		];

		const jsonData = new dataExporter({ fileHeader });

		const csvData = jsonData.parse(costAllocationDataArr);

		// Pay period date range
		const { startDate, endDate } =
			await payPeriodRepository.getDatesByPayPeriod(payPeriodId);

		const extraData =
			`Report Name ,Cost Allocations\n` +
			`Period ,${moment(startDate).format('MM/DD/YYYYY')} - ${moment(
				endDate
			).format('MM/DD/YYYYY')}\n` +
			`QuickBooks Company's Name ,${companyDetails?.tenantName}\n` +
			`\n`;

		return extraData + csvData;
	}

	async exportCostAllocationPDF(costAllocationData: any) {
		const { companyId, payPeriodId } = costAllocationData;

		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}
		if (!payPeriodId) {
			throw new CustomError(400, 'Pay period id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);

		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const payPeriodDetails = await payPeriodRepository.getDetails(
			payPeriodId,
			companyId
		);

		if (!payPeriodDetails) {
			throw new CustomError(400, 'Invalid Pay Period');
		}

		const timeSheet = await timeSheetRepository.getTimeSheetByPayPeriod(
			payPeriodId
		);

		if (!timeSheet) {
			throw new CustomError(
				400,
				'No cost allocation available for this pay period'
			);
		}

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

		const data = {
			companyId: costAllocationData.companyId,
			type: costAllocationData.type,
			searchCondition,
			sortCondition,
			filterConditions,
			empFilterConditions,
			classId: String(costAllocationData.classId),
			customerId: String(costAllocationData.customerId),
			employeeId: String(costAllocationData.employeeId),
			isPercentage: costAllocationData.isPercentage,
			payPeriodId: costAllocationData.payPeriodId,
			timeSheetId: timeSheet && timeSheet.id,
		};

		const costAllocation = await costAllocationRepository.getCostAllocation(
			data
		);

		const totalRowMapping =
			costAllocationRepository.getGrandTotalRowCostAllocation(
				costAllocation.result.filter((e) => e['employee-name'] === 'Total')
			);

		if (totalRowMapping) {
			costAllocation.result = [...costAllocation.result, totalRowMapping];
		}

		const sectionWiseFields = await prisma.configurationSection.findMany({
			where: {
				companyId: companyId as string,
				no: {
					gt: 0,
				},
				payPeriodId
			},
			include: {
				fields: {
					where: {
						isActive: true,
						payPeriodId
					},
					orderBy: {
						jsonId: 'asc',
					},
				},
			},
			orderBy: {
				no: 'asc',
			},
		});

		let salaryExpenseAccounts = 0;
		let fringeExpense = 0;
		let payrollTaxesExpense = 0;

		sectionWiseFields.forEach((singleField: any) => {
			if (singleField['sectionName'] === 'Salary Expense Accounts') {
				salaryExpenseAccounts = singleField.fields.length;
			} else if (singleField['sectionName'] === 'Fringe expense') {
				fringeExpense = singleField.fields.length;
			} else if (singleField['sectionName'] === 'Payroll Taxes Expense') {
				payrollTaxesExpense = singleField.fields.length;
			}
		});

		const counts = {
			salaryExpenseAccounts,
			fringeExpense,
			payrollTaxesExpense,
		};

		const finalFieldMapping: any = {
			'employee-name': 'Employee Name',
			'customer-name': 'Customer Name',
			'class-name': 'Class Name',
			'total-hours': 'Total Hours',
			allocation: 'Allocation',
		};

		sectionWiseFields.forEach((singleSection: any) => {
			singleSection.fields.forEach((singleField: any) => {
				finalFieldMapping[singleField.id] = singleField.name;
			});
		});

		finalFieldMapping['indirect-allocation'] = 'Indirect Allocation';

		const finalDataArr: any[] = [];

		costAllocation.result.forEach((singleAllocation: any) => {
			const obj: any = {};
			Object.keys(finalFieldMapping).forEach((key: any) => {
				if (
					singleAllocation[key] != undefined &&
					singleAllocation[key] != null
				) {
					obj[finalFieldMapping[key]] =
						typeof singleAllocation[key] === 'number'
							? `$ ${Number(singleAllocation[key]).toFixed(
									key === 'allocation' ? 4 : 2
							  )}`
							: singleAllocation[key];
				}
			});
			finalDataArr.push(obj);
		});

		const filePath = path.join(
			__dirname,
			'..',
			'costAllocationPdfs',
			`${new Date().getUTCDate()}CostAllocation.pdf`
		);

		const companyName = companyDetails?.tenantName;
		return { finalDataArr, counts, filePath, companyName };
	}

	async getCostAllocationDifference(payPeriodId: string, companyId: string) {
		return costAllocationRepository.getCostAllocationDifference(payPeriodId, companyId);
	}
}
export default new CostAllocationServices();
