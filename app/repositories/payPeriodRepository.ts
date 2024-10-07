import moment from 'moment';
import { prisma } from '../client/prisma';
import { PayPeriodInterface } from '../interfaces/payPeriodInterface';
import { CustomError } from '../models/customError';

class PayPeriodRepository {
	async getAll(payPeriodData: any) {
		const { companyId, dateFilter, offset, limit } = payPeriodData;

		const query: any = {
			where: {
				companyId: companyId,
				...dateFilter,
			},
			skip: offset,
			take: limit,
			orderBy: {
				startDate: 'asc',
			},
		};

		if (!offset) {
			delete query.skip;
		}

		if (!limit) {
			delete query.take;
		}

		const payPeriods = await prisma.payPeriod.findMany(query);
		return payPeriods;
	}

	async getDetails(payPeriodId: string, companyId: string) {
		const payPeriodDetails = await prisma.payPeriod.findUnique({
			where: {
				id: payPeriodId,
			},
		});

		if (payPeriodDetails && payPeriodDetails.companyId != companyId) {
			throw new CustomError(400, 'Invalid PayPeriod');
		}

		return payPeriodDetails;
	}

	async create(payPeriodData: PayPeriodInterface) {
		const payPeriod = await prisma.payPeriod.create({
			data: {
				startDate: moment(payPeriodData.startDate).toISOString(),
				endDate: moment(payPeriodData.endDate).toISOString(),
				company: { connect: { id: payPeriodData.companyId } },
			},
		});

		return payPeriod;
	}

	async isDateInAnyPayPeriod(payPeriodData: any) {
		const { startDate, endDate, companyId } = payPeriodData;

		const allPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: companyId,
			},
		});

		for (const payPeriod of allPayPeriods) {
			if (
				startDate < new Date(payPeriod.endDate).setUTCHours(23, 59, 59, 59) &&
				endDate > new Date(payPeriod.startDate).setUTCHours(0, 0, 0, 0)
			) {
				return { isInPayPeriod: true, payPeriod: payPeriod }; // The date is in a pay period
			}
			// if (
			// 	new Date(payPeriod.startDate).setUTCHours(0, 0, 0, 0) <= startDate && // Check if startDate is less than or equal to the checkDate
			// 	new Date(payPeriod.endDate).setUTCHours(23, 59, 59, 59) >= startDate // Check if endDate is greater than or equal to the checkDate
			// ) {
			// 	return { isInPayPeriod: true, payPeriod: payPeriod }; // The date is in a pay period
			// }
			// if (
			// 	new Date(payPeriod.startDate).setUTCHours(0, 0, 0, 0) <= endDate && // Check if startDate is less than or equal to the checkDate
			// 	new Date(payPeriod.endDate).setUTCHours(23, 59, 59, 59) >= endDate // Check if endDate is greater than or equal to the checkDate
			// ) {
			// 	return { isInPayPeriod: true, payPeriod: payPeriod }; // The date is in a pay period
			// }
		}

		return { isInPayPeriod: false }; // The date is not in any pay period
	}

	async isDateInEditPayPeriod(payPeriodData: any) {
		const { startDate, endDate, companyId, id } = payPeriodData;
		const allPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: companyId,
				NOT: {
					id: id,
				},
			},
		});

		for (const payPeriod of allPayPeriods) {
			if (
				startDate < new Date(payPeriod.endDate).setUTCHours(23, 59, 59, 59) &&
				endDate > new Date(payPeriod.startDate).setUTCHours(0, 0, 0, 0)
			) {
				return { isInPayPeriod: true, payPeriod: payPeriod }; // The date is in a pay period
			}
		}
		return { isInPayPeriod: false };
	}

	async update(payPeriodData: any) {
		const { id, startDate, endDate } = payPeriodData;

		const payPeriod = await prisma.payPeriod.update({
			where: {
				id: id,
			},
			data: {
				startDate: startDate,
				endDate: endDate,
			},
			include: {
				TimeSheets: {
					include: {
						timeActivities: true,
					},
				},
			},
		});

		return payPeriod;
	}

	async getDatesByPayPeriod(payPeriodId: string) {
		const data = await prisma.payPeriod.findUnique({
			where: {
				id: payPeriodId,
			},
		});

		const startDate = data?.startDate;
		const endDate = data?.endDate;

		return {
			startDate,
			endDate,
		};
	}
}

export default new PayPeriodRepository();
