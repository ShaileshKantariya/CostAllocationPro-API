export interface EmployeeConfigInterface {
    employeeId: string;
    payPeriodId: string;
    companyId: string;
    directAllocation: EmployeeDirectAllocation[];
    createdBy?: string;
    updatedBy?: string;
    isActive: boolean;
}

export interface EmployeeDirectAllocation {
    allocation: number;
    classId: string;
    className: string;
    customerId: string;
    customerName: string;
}