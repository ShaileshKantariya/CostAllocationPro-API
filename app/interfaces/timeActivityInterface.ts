export interface getAllTimeActivityInterface {
	companyId?: string;
	search?: string;
	sort?: string;
	page?: number;
	limit?: number;
	classId?: string;
	customerId?: string;
	employeeId?: string;
	offset?: number;
	type?: string;
	filterConditions?: any;
	searchCondition?: any;
	sortCondition?: any;
	startDate?: string;
	endDate?: string;
	dateFilters?: any;
	isOverHours?: any;
	payPeriodId?: string;
	year?: string;
	yearFilter?: any;
	closingDate?: any;
}

export interface updateTimeActivityInterface {
	timeActivityId: string;
	companyId: string;
	hours?: string;
	minute?: string;
	classId?: string;
	className?: string;
	customerId?: string;
	customerName?: string;
}

export interface batchUpdateTimeActivityInterface {
	payPeriodId?: string;
	timeActivityIds: string;
	companyId: string;
	classId?: string;
	className?: string;
	customerId?: string;
	customerName?: string;
	isSelectedAll?: boolean;
	search?: string;
	filterClassId?: string;
	filterCustomerId?: string;
	filterEmployeeId?: string;
}
