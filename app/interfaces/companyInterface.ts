export default interface CompanyInfo {
	id?: string;
	tenantName?: string;
	tenantID?: string;
	accessToken?: string;
	refreshToken?: string;
	accessTokenUTCDate?: Date;
	customerLastSync?: Date;
	role?: {
		status: string | boolean;
	};
	createdAt?: Date;
	updatedAt?: Date;
}
