import { prisma } from '../client/prisma';

class SyncLogRepository {
	async getAllLogs(
		companyId: string,
		offset: number,
		limit: number,
		filterConditions: any,
		dateFilter: any
	) {
		const today = new Date();
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(today.getMonth() - 3);
		const logs = await prisma.syncLogs.findMany({
			where: {
				companyId: companyId,
				...filterConditions,
				...dateFilter,
			},
			skip: offset,
			take: limit,
			orderBy: {
				createdAt: 'desc',
			},
		});

		const count = await prisma.syncLogs.count({
			where: {
				...dateFilter,
				...filterConditions,
				companyId: companyId,
			},
		});

		return { logs, count };
	}
}

export default new SyncLogRepository();
