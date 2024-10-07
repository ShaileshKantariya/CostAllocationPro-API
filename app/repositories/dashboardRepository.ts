import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import { getFiscalYearDates, monthNames } from '../utils/utils';
import companyRepository from './companyRepository';

class DashboardRepository {
	async getSalaryExpenseByMonth(companyId: string, year: string) {

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

		const journals = await prisma.journal.findMany({
			where: {
				companyId: companyId,
				date: {
					gte: startDateOfYear,
					lte: endDateOfYear,
				},
			},
			orderBy: {
				date: 'asc',
			},
		});
		return journals;
	}
}

export default new DashboardRepository();
