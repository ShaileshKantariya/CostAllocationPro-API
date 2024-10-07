import { prisma } from '../client/prisma';
import { IJournalListQuery } from '../interfaces/journalInterface';
import { hasText } from '../utils/utils';

class JournalRepository {
	async getAllJournals(timeSheetData: IJournalListQuery) {
		const {
			companyId,
			offset,
			limit,
			searchCondition,
			filterConditions,
			sortCondition,
			payPeriodFilter,
			year,
		} = timeSheetData;

		let startDateOfYear = new Date();
		let endDateOfYear = new Date();
		if (hasText(year)) {
			startDateOfYear = new Date(`${Number(year)}-01-01T00:00:00.000Z`);
			endDateOfYear = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
		}

		const query = {
			companyId: companyId,
			...payPeriodFilter,
			...searchCondition,
			...filterConditions,

			date: {
				gte: startDateOfYear,
				lt: endDateOfYear,
			},
		};

		if (!hasText(year)) {
			delete query['date'];
		}

		const journals = await prisma.journal.findMany({
			where: query,
			skip: offset,
			take: limit,
			...sortCondition,
			include: {
				createdBy: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
				payPeriod: true,
			},
		});

		const countQuery = {
			companyId: companyId,
			...payPeriodFilter,
			...searchCondition,
			...filterConditions,

			date: {
				gte: startDateOfYear,
				lt: endDateOfYear,
			},
		};

		if (!hasText(year)) {
			delete countQuery['date'];
		}

		const count = await prisma.journal.count({
			where: countQuery,
		});

		return { journals, count };
	}
}

export default new JournalRepository();
