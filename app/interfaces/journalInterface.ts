export interface IJournalEntriesQuery {
    payPeriodId: string,
    companyId: string,
    timeSheetId?: string
}

export interface IJournalCreateEntity {
    date: Date,
    notes?: string,
    status: EJournalStatus,
    amount: string,
    qboJournalNo: number,
    qboJournalTrnId?: string,
    payPeriodId: string,
    createdById: string,
    companyId: string,
    dateString?: string
}

export interface IJournalListQuery {
    companyId: string;
    payPeriodId?: string;
    page?: number;
    limit?: number;
    search?: string;
    offset?: number;
    status?: number;
    type?: string;
    sort?: string;
    sortCondition?: any;
    filterConditions?: any;
    searchCondition?: any;
    payPeriodFilter?: any;
    year ?: string
}

export enum EJournalStatus {
    PUBLISHED = 1,
    DRAFT = 2
}