export interface AuthTokenInterface {
	access_token: string;
	realmId: string;
	refresh_token: string;
}

export interface QuickBooksEmployee {
	Id: string;
	DisplayName: string;
	GivenName: string;
	MiddleName?: string;
	FamilyName: string;
	PrimaryEmailAddr?: {
		Address: string;
	};
	PrimaryPhone?: {
		FreeFormNumber: string;
	};
	PrimaryAddr?: {
		Id?: string;
		CountrySubDivisionCode?: string;
		City?: string;
		PostalCode?: string;
		Line1?: string;
		Line2?: string;
	};
	HireDate?: string;
	EmploymentType?: string;
	SSN?: string;
	BirthDate?: string;
	Gender?: string;
	EmployeeNumber?: string;
	ReleasedDate?: string;
	Released?: boolean;
	PayrollInfo?: {
		PayFrequency?: string;
		Salary?: number;
		HourlyRate?: number;
		HiredDate?: string;
		WorkersCompensationCode?: string;
		WorkersCompensationRate?: number;
	};
	Active?: boolean;
	// Add more properties as needed for your use case
}

export interface AccountInterface {
	accountName: string;
	accountNum?: string;
	parentAccount?: string;
	detailType?:string;
	accountType:
		| 'Income'
		| 'Expense'
		| 'Cost of Goods Sold'
		| 'Other Income'
		| 'Other Expense'
		| 'Bank'
		| 'Credit Card'
		| 'Asset'
		| 'Equity'
		| 'Liability';
	currencyValue: string;
	subAccount?: string;
}
interface QuickBooksCurrencyRef {
	value?: string;
	name?: string;
}

export interface QuickBooksChartOfAccount {
	Name: string;
	AccountType:
		| 'Income'
		| 'Expense'
		| 'Cost of Goods Sold'
		| 'Other Income'
		| 'Other Expense'
		| 'Bank'
		| 'Credit Card'
		| 'Asset'
		| 'Equity'
		| 'Liability';
	SubAccount?: boolean;
	AccountSubType?: string;
	ParentRef?: {
		name: string;
	};
	TaxCodeRef?: {
		value: string;
	};
	AcctNum?: string;
	CurrencyRef?: QuickBooksCurrencyRef;
}
