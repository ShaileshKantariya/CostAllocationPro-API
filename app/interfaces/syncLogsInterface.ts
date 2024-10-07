import { QBOModules } from '../enum';

export interface QuerySyncLogs {
	companyId: string;
	page: number;
	limit: number;
	filter?: QBOModules;
	fromDate?: Date;
	toDate?: Date;
}
