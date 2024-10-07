export interface ICustomRuleQuery {
    companyId: string;
    search?: string;
    status?: 'Active' | 'Inactive';
}