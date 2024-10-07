import { Request, Response, NextFunction } from 'express';
import syncLogServices from '../services/syncLogServices';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { QuerySyncLogs } from '../interfaces/syncLogsInterface';

class SyncLogController {
	async getSyncLogs(req: Request, res: Response, next: NextFunction) {
		try {
			const { data, count } = await syncLogServices.getSyncLogs(
				req.query as unknown as QuerySyncLogs
			);

			return DefaultResponse(res, 200, 'Sync logs fetched successfully', {
				data,
				count,
			});
		} catch (err) {
			next(err);
		}
	}
}

export default new SyncLogController();
