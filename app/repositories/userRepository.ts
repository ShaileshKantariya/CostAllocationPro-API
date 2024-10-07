import { User } from '@prisma/client';
import { prisma } from '../client/prisma';

class UserRepository {
	// Get all users
	async getAll(
		company: string,
		offset?: number,
		limit?: number,
		filterConditions?: any,
		searchCondition?: any,
		sortCondition?: any
	) {
		const sortPosition = sortCondition?.orderBy?.firstName || 'asc';
		try {
			const users = await prisma.companyRole.findMany({
				where: {
					...filterConditions,
					// ...searchCondition,
					user: { ...searchCondition },

					companyId: company,
					NOT: {
						userId: null,
					},
				},
				orderBy: {
					user: {
						firstName: sortPosition || 'asc',
					},
				},
				include: {
					role: true,
					user: {
						select: {
							id: true,
							email: true,
							firstName: true,
							lastName: true,
							phone: true,
							isVerified: true,
							status: true,
						},
					},
				},
				skip: offset,
				take: limit,
			});

			// const res = await prisma.user.findMany({
			// 	where: {
			// 		...filterConditions,
			// 		...searchCondition,
			// 		companies: {
			// 			some: {
			// 				companyId: company,
			// 			},
			// 		},
			// 	},
			// 	skip: offset,
			// 	take: limit,
			// 	include: {
			// 		companies: {
			// 			select: {
			// 				role: {
			// 					select: {
			// 						id: true,
			// 						roleName: true,
			// 						isAdminRole: true,
			// 					},
			// 				},
			// 				company: {
			// 					select: {
			// 						id: true,
			// 						tenantName: true,
			// 					},
			// 				},
			// 			},
			// 		},
			// 	},

			// 	...sortCondition,
			// });
			return users;
		} catch (err) {
			console.log(err);
			throw err;
		}
	}

	async checkAddUserLimit(company: string) {
		const totalNoOfUser = await prisma.companyRole.findMany({
			where: {
				companyId: company,
				userId: {
					not: null,
				},
				status: true,
			},
		});
		// const totalNoOfUser = await prisma.user.findMany({
		// 	where: {
		// 		companies: {
		// 			some: {
		// 				companyId: company,
		// 				userId: {
		// 					not: null,
		// 				},
		// 				status: true,
		// 			},
		// 		},
		// 	},
		// });
		const totalAdminUser = await prisma.companyRole.findMany({
			where: {
				companyId: company,
				status: true,
				userId: {
					not: null,
				},
				role: {
					isAdminRole: true,
				},
			},
		});

		return { totalNoOfUser, totalAdminUser };
	}

	async checkNoOfAdmin(company: string) {
		return await prisma.user.findMany({
			where: {
				companies: {
					some: {
						companyId: company,
						userId: {
							not: null,
						},
					},
				},
			},
		});
	}

	// Get data by id
	async getById(id: string) {
		try {
			const user = await prisma.user.findMany({
				where: {
					id: id,
				},
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					phone: true,
					status: true,
					profileImg: true,
					isVerified: true,
					isSignupViaQuickBooks: true,
					companies: {
						where: {
							NOT: {
								companyId: null,
							},
							status: true,
						},
						select: {
							id: true,
							userId: true,
							companyId: true,
							status: true,
							company: {
								select: {
									id: true,
									tenantID: true,
									tenantName: true,
									accessTokenUTCDate: true,
									customerLastSyncDate: true,
									employeeLastSyncDate: true,
									timeActivitiesLastSyncDate: true,
									classLastSyncDate: true,
									isConnected: true,
									status: true,
									fiscalYear: true,
									configuration: true,
									Subscription: true,
								},
							},
							role: {
								select: {
									id: true,
									roleName: true,
									roleDescription: true,
									isCompanyAdmin: true,
									isAdminRole: true,
									status: true,
									permissions: true,
								},
							},
						},
						orderBy: {
							company: {
								createdAt: 'desc',
							},
						},
					},
				},
			});
			return user[0];
		} catch (err) {
			throw err;
		}
	}

	// Get data by email
	async getByEmail(email: string) {
		try {
			const user = await prisma.user.findFirst({
				where: {
					email: email,
				},
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					phone: true,
					passwordResetDate: true,
					status: true,
					isVerified: true,
					password: true,
					forgotPasswordToken: true,
					forgotPasswordTokenExpiresAt: true,
					isSignupViaQuickBooks: true,
					createdAt: true,
					companies: {
						select: {
							id: true,
							userId: true,
							roleId: true,
							companyId: true,
							status: true,
							company: {
								select: {
									id: true,
									tenantID: true,
									tenantName: true,
									customerLastSyncDate: true,
									classLastSyncDate: true,
									employeeLastSyncDate: true,
									isConnected: true,
									status: true,
									fiscalYear: true,
									createdAt: true,
									Subscription: true,
								},
							},
							role: {
								select: {
									id: true,
									roleName: true,
									roleDescription: true,
									isCompanyAdmin: true,
									isAdminRole: true,
									status: true,
									permissions: true,
								},
							},
						},
					},
				},
			});
			return user;
		} catch (err) {
			throw err;
		}
	}

	// Register a user
	async register(
		firstName: string,
		lastName: string,
		email: string,
		customerId: string
	) {
		try {
			const user = await prisma.user.create({
				data: {
					firstName: firstName,
					lastName: lastName,
					email: email,
					customerId: customerId,
				},
			});
			return user;
		} catch (err) {
			throw err;
		}
	}

	//  Create a new user
	async create(userData: User | any) {
		try {
			const user = await prisma.user.create({
				data: userData,
			});
			return user;
		} catch (err) {
			throw err;
		}
	}

	// Update user
	async update(id: string, data: any) {
		try {
			const user = await prisma.user.update({
				where: { id: id },
				data: data,
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					phone: true,
					isVerified: true,
					profileImg: true,
					passwordResetDate: true,
					isSignupViaQuickBooks: true,
					companies: {
						where: {
							NOT: {
								companyId: null,
							},
						},
						select: {
							id: true,
							userId: true,
							roleId: true,
							companyId: true,
							status: true,
							company: {
								select: {
									id: true,
									tenantName: true,
									tenantID: true,
									accessTokenUTCDate: true,
									customerLastSyncDate: true,
									classLastSyncDate: true,
									isConnected: true,
									status: true,
									fiscalYear: true,
									createdAt: true,
									Subscription: true,
								},
							},
							role: {
								select: {
									id: true,
									roleName: true,
									roleDescription: true,
									isCompanyAdmin: true,
									isAdminRole: true,
									status: true,
								},
							},
						},
					},
				},
				// include: {
				// 	companies: {
				// 		where: {
				// 			NOT: {
				// 				companyId: null,
				// 			},
				// 		},

				// 		include: {
				// 			company: true,
				// 			role: true,
				// 		},
				// 	},
				// },
			});
			return user;
		} catch (err) {
			throw err;
		}
	}

	// Get total count
	async count(company: string, filterConditions: any, searchCondition: any) {
		try {
			const total = await prisma.companyRole.count({
				where: {
					...filterConditions,
					user: { ...searchCondition },
					companyId: company,
					NOT: {
						userId: null,
					},
				},
			});
			return total;
		} catch (err) {
			throw err;
		}
	}
	// async count(company: string, filterConditions: any, searchCondition: any) {
	// 	try {
	// 		const total = await prisma.user.count({
	// 			where: { ...filterConditions, ...searchCondition },
	// 		});
	// 		return total;
	// 	} catch (err) {
	// 		throw err;
	// 	}
	// }

	// Get all admin emails
	async getAllAdminEmails(companyId: string) {
		try {
			const adminEmails = await prisma.companyRole.findMany({
				where: {
					companyId: companyId,
					OR: [
						{
							role: {
								isAdminRole: true,
							},
						},
						{
							role: {
								isCompanyAdmin: true,
							},
						},
					],
				},
				select: {
					user: {
						select: {
							email: true,
							firstName: true,
							lastName: true,
						},
					},
				},
			});

			return adminEmails;
		} catch (err) {
			throw err;
		}
	}
}

export default new UserRepository();
