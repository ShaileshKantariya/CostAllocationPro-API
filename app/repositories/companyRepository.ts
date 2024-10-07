import { prisma } from '../client/prisma';
import { CompanyInfo } from '../interfaces';
import { logger } from '../utils/logger';
import companyRoleRepository from './companyRoleRepository';
import subscriptionRepository from './subscriptionRepository';

class CompanyRepository {
	async getAll() {
		try {
			const companies = await prisma.company.findMany();
			return companies;
		} catch (err) {
			throw err;
		}
	}

	async getUserCompanies(id: string) {
		try {
			const companies = await prisma.user.findFirst({
				where: {
					id: id,
				},
				include: {
					companies: {
						include: {
							company: true,
							role: true,
						},
					},
				},
			});
			return companies;
		} catch (err) {
			throw err;
		}
	}

	async getDetails(id: string) {
		try {
			const company = await prisma.company.findUnique({
				where: {
					id: id,
				},
				include: {
					users: {
						select: {
							user: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
								},
							},
							company: {
								select: {
									id: true,
									tenantName: true,
								},
							},
							role: {
								select: {
									id: true,
									roleName: true,
								},
							},
						},
					},
				},
			});
			return company;
		} catch (err) {
			throw err;
		}
	}

	async create(data: CompanyInfo) {
		try {
			const company = await prisma.company.create({
				data: data,
			});
			return company;
		} catch (err) {
			throw err;
		}
	}

	async connectCompany(userId: string, companyId: string) {
		try {
			const companyAdminRole = await prisma.role.findFirst({
				where: {
					roleName: {
						mode: 'insensitive',
						equals: 'Company Admin',
					},
				},
			});

			// const company = await prisma.companyRole.create({
			// 	data: {
			// 		user: { connect: { id: userId } },
			// 		role: { connect: { id: companyAdminRole?.id } },
			// 		company: { connect: { id: companyId } },
			// 	},
			// });

			const companyRole = await prisma.companyRole.findFirst({
				where: {
					userId: userId,
					roleId: companyAdminRole?.id,
					companyId: {
						equals: null,
					},
				},
			});

			let company;

			if(companyRole) {
				company = await prisma.companyRole.update({
					where: {
						id: companyRole?.id,
					},
					data: {
						company: { connect: { id: companyId } },
					},
				});
			} else {
				company = await companyRoleRepository.create(userId, companyAdminRole?.id as string, companyId);
			}

			const subscriptionData = await subscriptionRepository.findSubscriptionByUserIdWithNullCompany(userId);

			// If found attach the companyId to existing subscription else create new entry for reference only;
			if(subscriptionData) {
				await subscriptionRepository.updateSubscription(subscriptionData.id, { companyId })
			}

			return company;
		} catch (err) {
			throw err;
		}
	}

	async updateCompany(companyId: string, data: any) {
		try {
			const updatedCompany = await prisma.company.update({
				where: {
					id: companyId,
				},
				data: data,
			});
			return updatedCompany;
		} catch (err) {
			logger.error('Err: ', err);
			throw err;
		}
	}

	async updateStatus(companyId: string, status: boolean) {
		try {
			const updatedCompany = await prisma.company.update({
				where: {
					id: companyId,
				},
				data: {
					status: status,
				},
			});
			return updatedCompany;
		} catch (err) {
			throw err;
		}
	}

	async getCompanyByTenantId(tenantId: string) {
		try {
			const companyDetails = await prisma.company.findFirst({
				where: {
					tenantID: tenantId,
				},
			});
			return companyDetails;
		} catch (err) {
			throw err;
		}
	}

	async getAllUsers(companyId: string) {
		const users = await prisma.user.findMany({
			where: {
				companies: {
					some: {
						companyId: companyId,
					},
				},
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
			},
		});
		return users;
	}
}

export default new CompanyRepository();
