export enum ResponseStatus {
	Success = 200,
	Created = 201,
	Error = 400,
	Unauthorized = 401,
	Forbidden = 403,
	NoContent = 204,
}

export enum PayPeriodStatus {
	CURRENT = 1,
	POSTED = 2,
}

export enum TimeSheetsStatus {
	PUBLISHED = 'Published',
	DRAFT = 'Draft',
}

export enum QBOModules {
	EMPLOYEE = 'Employee',
	TIME_ACTIVITY = 'Time Activity',
	JOURNAL = 'Journal',
	CLOSING_DATE = 'Book Closing Date',
}

export enum SyncLogsStatus {
	SUCCESS = 1,
	FAILURE = 2,
}
