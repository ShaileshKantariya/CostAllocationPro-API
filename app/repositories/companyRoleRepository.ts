import { prisma } from '../client/prisma';

class CompanyRoleRepository {
	async get(user: string, company: any, role: string) {
		try {
			const companyRole = await prisma.companyRole.findFirst({
				where: {
					userId: user,
					roleId: role,
					companyId: company,
				},
				include: {
					company: true,
					role: true,
					user: true,
				},
			});
			return companyRole;
		} catch (err) {
			throw err;
		}
	}

	//  Create A New Company Role Record
	async create(user: string, role: string, company: any = null) {
		try {
			if (company) {
				const companyRole = await prisma.companyRole.create({
					data: {
						user: { connect: { id: user } },
						role: { connect: { id: role } },
						company: { connect: { id: company } },
					},
					include: {
						company: true,
						role: true,
						user: true,
					},
				});
				return companyRole;
			} else {
				const companyRole = await prisma.companyRole.create({
					data: {
						user: { connect: { id: user } },
						role: { connect: { id: role } },
					},
					include: {
						company: true,
						role: true,
						user: true,
					},
				});
				return companyRole;
			}
		} catch (err) {
			throw err;
		}
	}

	// Update role status
	updateStatus = async (companyId: string, roleId: string, status: boolean) => {
		try {
			await prisma.companyRole.updateMany({
				where: {
					companyId,
					roleId,
				},
				data: {
					status,
				},
			});
		} catch (error) {
			throw error;
		}
	};

	// Update user status
	updateUserStatus = async (
		companyId: string,
		roleId: string,
		userId: string,
		status: boolean
	) => {
		try {
			await prisma.companyRole.updateMany({
				where: {
					companyId,
					roleId,
					userId,
				},
				data: {
					status,
				},
			});
		} catch (error) {
			throw error;
		}
	};

	// Check If user exists in the company
	async userExistInCompany(company: string, user: string) {
		try {
			const userExist = await prisma.companyRole.findFirst({
				where: {
					companyId: company,
					userId: user,
				},
			});
			return userExist;
		} catch (err) {
			throw err;
		}
	}

	// Delete user from company
	async deleteUserFromCompany(user: string, company: string) {
		try {
			const deletedUser = await prisma.companyRole.deleteMany({
				where: {
					userId: user,
					companyId: company,
				},
			});
			return deletedUser;
		} catch (err) {
			throw err;
		}
	}

	// Update User role in company
	async updateUserRole(user: string, company: string, role: string) {
		try {
			const updatedUser = await prisma.companyRole.updateMany({
				where: {
					userId: user,
					companyId: company,
				},
				data: {
					roleId: role,
				},
			});
			return updatedUser;
		} catch (err) {
			throw err;
		}
	}

	// Find record with null companyId
	async getRecordWithNullCompanyId(user: string) {
		try {
			const data = await prisma.companyRole.findMany({
				where: {
					userId: user,
					companyId: {
						equals: null,
					},
				},
				include: {
					role: true,
				},
			});
			return data;
		} catch (err) {
			throw err;
		}
	}

	// Find if role exist in company
	async checkCompanyRole(company: string, role: string) {
		try {
			const companyRole = await prisma.companyRole.findMany({
				where: {
					companyId: company,
					roleId: role,
					userId: {
						equals: null,
					},
				},
			});
			if (companyRole?.length > 0) {
				return true;
			} else {
				return false;
			}
		} catch (err) {
			throw err;
		}
	}

	// Update user in companyRole

	async updateUserCompanyRole(user: string, company: string, role: string) {
		try {
			const updatedData = await prisma.companyRole.updateMany({
				where: {
					companyId: company,
					roleId: role,
				},
				data: {
					userId: user,
				},
			});
			return updatedData;
		} catch (err) {
			throw err;
		}
	}

	// Get user with role

	async getUserWithRole(companyRoleData: any) {
		const { userId, companies } = companyRoleData;

		let isActiveInAnyCompany = false;

		for (let i = 0; i < companies.length; i++) {
			const company = companies[i];
			const companyRoleData = await prisma.companyRole.findMany({
				where: {
					userId,
					companyId: company.companyId,
					roleId: company.role.id,
					status: true,
				},
			});

			if (companyRoleData && companyRoleData.length > 0) {
				isActiveInAnyCompany = true;
				break;
			}
		}
		return isActiveInAnyCompany;
	}
}

export default new CompanyRoleRepository();
