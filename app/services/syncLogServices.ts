import moment from 'moment';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import syncLogRepository from '../repositories/syncLogRepository';
import { QuerySyncLogs } from '../interfaces/syncLogsInterface';

class SyncLogService {
	async getSyncLogs(query: QuerySyncLogs) {
		const { companyId, page = 1, limit = 10, filter, fromDate, toDate } = query;

		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		const offset = (Number(page) - 1) * Number(limit);

		// Conditions for filtering
		const filterConditions: Record<string, any> = filter
			? { moduleName: filter }
			: {};

		let dateFilter = {};

		if (fromDate && toDate) {
			const startDate = moment(fromDate).startOf('day').toISOString();
			const endDate = moment(toDate).endOf('day').toISOString();
			dateFilter = {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			};
		} else {
			dateFilter = {
				createdAt: {
					gte: moment(new Date())
						.add(-3, 'months')
						.startOf('day')
						.toISOString(),
					lte: moment(new Date()).endOf('day').toISOString(),
				},
			};
		}

		const { logs, count } = await syncLogRepository.getAllLogs(
			companyId,
			offset,
			Number(limit),
			filterConditions,
			dateFilter
		);

		const data = logs.map((singleLog: any) => {
			return {
				id: singleLog?.id,
				date: singleLog.createdAt,
				time: singleLog.createdAt,
				module: singleLog?.moduleName,
				status: singleLog?.status,
				message: singleLog?.message,
			};
		});

		return { data, count };
	}
}

export default new SyncLogService();
