export interface PayPeriodInterface {
	id?: string;
	startDate: Date;
	endDate: Date;
	companyId: string;
	copyEmployeeCostValueFromPriorPeriod: boolean;
}
