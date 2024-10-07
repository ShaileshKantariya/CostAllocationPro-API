import { prisma } from '../client/prisma';
import { DefaultPermissions, DefaultAdminPermissions } from '../constants/data';
import { logger } from '../utils/logger';

// type SortCondition = {
// 	orderBy: {
// 		[key: string]: 'asc' | 'desc';
// 	};
// };
class RoleRepositories {
	async getDetails(id: string) {
		try {
			const role = await prisma.role.findFirst({
				where: {
					id: id,
				},
				include: {
					permissions: true,
				},
			});
			return role;
		} catch (err) {
			throw err;
		}
	}
	async checkCompanyAndRole(roleId: string, companyId: string) {
		try {
			const isValid = await prisma.company.findFirst({
				where: {
					id: companyId,
					users: {
						some: {
							roleId: roleId,
						},
					},
				},
			});

			return isValid;
		} catch (err) {
			throw err;
		}
	}

	checkIsUsersInRole = async (roleId: string, companyId: string) => {
		try {
			const users = await prisma.companyRole.count({
				where: {
					roleId: roleId,
					companyId: companyId,
					userId: {
						not: null,
					},
				},
			});
			return users;
		} catch (error) {
			throw error;
		}
	};
	async isSameNameRole(companyId: string, roleName: string, roleId = '') {
		try {
			const isExistingRole = await prisma.role.findFirst({
				where: {
					id: {
						not: roleId,
					},
					roleName: {
						mode: 'insensitive',
						equals: roleName,
					},
					users: {
						some: {
							company: { id: companyId },
						},
					},
				},
			});

			if (isExistingRole) {
				return true;
			} else {
				return false;
			}
		} catch (error) {
			throw error;
		}
	}

	// For create the role
	createRole = async (
		roleName: string,
		roleDescription: string,
		isAdminRole: boolean = false,
		isCompanyAdmin: boolean = false
	) => {
		try {
			const role = await prisma.role.create({
				data: {
					roleName,
					roleDescription,
					isAdminRole,
					isCompanyAdmin,
					permissions: {
						createMany: {
							data:
								isCompanyAdmin || isAdminRole
									? DefaultAdminPermissions
									: DefaultPermissions,
						},
					},
				},
			});

			return role;
		} catch (error) {
			throw error;
		}
	};

	combineRoleCompany = async (companyId: string, roleId: string) => {
		const companyRole = await prisma.companyRole.create({
			data: {
				company: { connect: { id: companyId } },
				role: { connect: { id: roleId } },
			},
		});
		return companyRole;
	};

	// Check ROle By Name
	checkAdmin = async (roleName: string) => {
		try {
			const role = await prisma.role.findFirst({
				where: {
					roleName: {
						equals: roleName,
						mode: 'insensitive',
					},
				},
			});

			return role;
		} catch (err) {
			throw err;
		}
	};

	// For get all the roles of some organization
	getAllRole = async (
		sortCondition: string = 'asc',
		search: string = '',
		page: number,
		company: string,
		offset?: number,
		limit?: number,
		filterConditions?: any
	) => {
		const searchRegex = new RegExp(search, 'ig');
		try {
			const roles = await prisma.role.findMany({
				where: {
					isCompanyAdmin: false,
					isAdminRole: false,
					OR: [
						{
							roleName: {
								mode: 'insensitive',
								contains: search,
							},
						},
						{
							roleDescription: {
								mode: 'insensitive',
								contains: search,
							},
						},
					],
					...filterConditions,
					users: {
						some: {
							companyId: company,
						},
					},
				},
				skip: offset,
				take: limit,
				orderBy: {
					roleName: sortCondition as any,
				},
			});

			const rolesList = roles?.map((singleRole) => singleRole);
			if (page === 1) {
				if (searchRegex.test('admin') || search === '') {
					const adminRole: any = await prisma.role.findFirst({
						where: {
							...filterConditions,
							roleName: {
								mode: 'insensitive',
								equals: 'admin',
							},

							isAdminRole: true,
						},
					});
					if (adminRole) {
						if (sortCondition === 'asc') {
							return [adminRole, ...rolesList];
						} else {
							return [...rolesList, adminRole];
						}
					} else {
						return [...rolesList];
					}
				}
				return [...rolesList];
			} else {
				return rolesList;
			}
		} catch (error) {
			logger.error(error);
			throw error;
		}
	};

	// For update the role
	updateRole = async ({ roleId, data }: any) => {
		try {
			await prisma.role.update({
				where: {
					id: roleId,
				},
				data: data,
			});
		} catch (error) {
			throw error;
		}
	};

	// For delete the role from company role table
	deleteCompanyRole = async (id: string) => {
		try {
			await prisma.companyRole.deleteMany({
				where: {
					roleId: id,
				},
			});
		} catch (error) {
			throw error;
		}
	};

	// For delete the role from role table
	deleteRole = async (id: string) => {
		try {
			// TEMP code
			await prisma.invitations.deleteMany({
				where: {
					roleId: id,
				},
			});

			await prisma.role.deleteMany({
				where: {
					id,
				},
			});
		} catch (error) {
			throw error;
		}
	};

	// Get total count
	async count(search: any, company: string) {
		try {
			const total = await prisma.role.count({
				where: {
					isCompanyAdmin: false,
					isAdminRole: false,
					users: {
						some: {
							companyId: company,
						},
					},
					OR: [
						{
							roleName: {
								mode: 'insensitive',
								contains: search,
							},
						},
						{
							roleDescription: {
								mode: 'insensitive',
								contains: search,
							},
						},
					],
				},
			});
			// Removing company admin role count
			return total + 1;
		} catch (err) {
			throw err;
		}
	}

	// Check if user exist in the company
	async userExist(userId: string, companyId: string) {
		try {
			const user = await prisma.companyRole.findMany({
				where: {
					userId: userId,
					companyId: companyId,
				},
			});
			return user;
		} catch (err) {
			throw err;
		}
	}

	// Check company admin role by id
	async checkCompanyAdminRole(roleId: string) {
		try {
			const isCompanyAdmin = await prisma.role.findUnique({
				where: {
					id: roleId,
				},
			});
			return isCompanyAdmin;
		} catch (err) {
			throw err;
		}
	}
}

export default new RoleRepositories();
