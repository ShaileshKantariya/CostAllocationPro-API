import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';

class CompanyService {
	async getCompanyUsers(companyId: string) {
		if (!companyId) {
			const error = new CustomError(400, 'Company id is required');
			throw error;
		}

		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			const error = new CustomError(400, 'Company not found');
			throw error;
		}

		const users = await companyRepository.getAllUsers(companyId);

		const finalData = users.map((singleUser: any) => {
			return {
				id: singleUser.id,
				fullName: `${singleUser.firstName} ${singleUser.lastName}`,
			};
		});

		return finalData;
	}
}

export default new CompanyService();
