export interface ITimeActivitySummaryQuery {
	companyId: string;
	payPeriodId?: string;
	search?: string;
	year?: string;
	customerId?: string;
	customerName?: string;
	classId?: string;
	className?: string;
	employeeId?: string;
	employeeName?: string;
}

export interface ICustomerExpenseReportQuery {
	companyId: string;
	search?: string;
	year?: string;
	customerId?: string;
	employeeId?: string;
	classId?: string;
}

export interface ITimeActivitySummaryData {
	employeeid: string;
	fullName: string;
	timeactivities: ITimeActivity[];
	overalltotalhours: string;
	totalhoursnumber: number;
}

export interface ITimeActivity {
	classId: string;
	className: string;
	totalHours: string;
	totalHoursNumber: number;
}

export interface IDistinctTimeActivityClasses {
	className: string;
}

export interface ICustomerExpenseReportData {
	name: string;
	expense: number;
	id: number;
}
