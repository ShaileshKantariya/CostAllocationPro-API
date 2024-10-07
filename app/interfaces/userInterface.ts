export interface UserInfo {
	id?: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
	phone?: string | null;
	password?: string | null;
	isVerified?: boolean;
	forgotPasswordToken?: string | null;
	forgotPasswordTokenExpiresAt?: string | null;
	status?: string | null;
	profileImg?: string | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	roleId?: string | null;
	companyId?: string | null;
	companies?: any[];
}

export interface AdminUserQuery {
	search?: string;
	startDate?: string;
	endDate?: string;
	page: string;
	limit: string;
	status: string; 
}

export interface UpdateUserInfo {
	firstName?: string;
	lastName?: string;
	phone?: string;
	companyId: string;
	roleId?: string;
	userId: string;
	status?: boolean;
	isChangeStatus?: boolean;
}
