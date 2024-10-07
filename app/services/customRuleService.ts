import { prisma } from '../client/prisma';
import { ICustomRuleQuery } from '../interfaces/customRuleInterface';
import { CustomError } from '../models/customError';
import { hasText } from '../utils/utils';

class CustomRuleService {
	async getCustomRuleList(query: ICustomRuleQuery) {
		if (!query.companyId) {
			throw new CustomError(400, 'CompanyId required');
		}

		let searchCondition: any = {};

		if (query.search) {
			searchCondition = {
				OR: [
					{
						name: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
					{
						description: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
				],
			};
		}

		let filterCondition: any = {};

		if (query.status) {
			filterCondition = {
				isActive: query.status === 'Active',
			};
		}

		const content = await prisma.customRules.findMany({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const count = await prisma.customRules.count({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
			},
		});

		return { content, count };
	}

	async getSplitCustomRuleList(query: ICustomRuleQuery) {
		if (!query.companyId) {
			throw new CustomError(400, 'CompanyId required');
		}

		let searchCondition: any = {};

		if (query.search) {
			searchCondition = {
				OR: [
					{
						name: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
					{
						description: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
				],
			};
		}

		let filterCondition: any = {};

		if (query.status) {
			filterCondition = {
				isActive: query.status === 'Active',
			};
		}

		const content = await prisma.customRules.findMany({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
				triggerProcess: 'split'
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const count = await prisma.customRules.count({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
			},
		});

		return { content, count };
	}

	async getEditCustomRuleList(query: ICustomRuleQuery) {
		if (!query.companyId) {
			throw new CustomError(400, 'CompanyId required');
		}

		let searchCondition: any = {};

		if (query.search) {
			searchCondition = {
				OR: [
					{
						name: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
					{
						description: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
				],
			};
		}

		let filterCondition: any = {};

		if (query.status) {
			filterCondition = {
				isActive: query.status === 'Active',
			};
		}

		const content = await prisma.customRules.findMany({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
				triggerProcess: 'edit'
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const count = await prisma.customRules.count({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
			},
		});

		return { content, count };
	}

	async getDeleteCustomRuleList(query: ICustomRuleQuery) {
		if (!query.companyId) {
			throw new CustomError(400, 'CompanyId required');
		}

		let searchCondition: any = {};

		if (query.search) {
			searchCondition = {
				OR: [
					{
						name: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
					{
						description: {
							contains: query.search as string,
							mode: 'insensitive',
						},
					},
				],
			};
		}

		let filterCondition: any = {};

		if (query.status) {
			filterCondition = {
				isActive: query.status === 'Active',
			};
		}

		const content = await prisma.customRules.findMany({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
				triggerProcess: 'delete'
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const count = await prisma.customRules.count({
			where: {
				companyId: query.companyId,
				...filterCondition,
				...searchCondition,
			},
		});

		return { content, count };
	}

	async saveCustomRule(data: any, userId: string, id: string | null) {
		if (!data.companyId) {
			throw new CustomError(400, 'Invalid companyId');
		}

		data.updatedBy = userId;
		data.createdBy = userId;

		const searchQuery: any = {
			name: data.name,
			companyId: data.companyId,
			id: {
				not: id,
			},
		};

		if (!id) {
			delete searchQuery.id;
		}

		const checkExistsRule = await prisma.customRules.findFirst({
			where: searchQuery,
		});

		if (checkExistsRule && checkExistsRule.id) {
			throw new CustomError(400, 'Custom rule already exists with same name');
		}

		this.validateCriteriaJson(data.criteria);

		if (id) {
			data.updatedBy = userId;
			return await prisma.customRules.update({
				where: {
					id,
				},
				data,
			});
		}

		const allRules = await prisma.customRules.findMany({
			where: {
				companyId: data.companyId,
				triggerProcess: data.triggerProcess
			},
		});

		return prisma.customRules.create({
			data: {
				...data,
				priority: allRules.length + 1,
			},
		});
	}

	validateCriteriaJson(criteria: any) {
		const operators = ['AND', 'OR'];

		if (!hasText(criteria.employeeId)) {
			throw new CustomError(400, 'Invalid rule criteria');
		}

		if (
			!operators.includes(criteria.operator1) ||
			!operators.includes(criteria.operator2)
		) {
			throw new CustomError(400, 'Invalid rule criteria');
		}

		// if (operators.includes(criteria.operator1)) {
		// 	if (!hasText(criteria.customerId)) {
		// 		throw new CustomError(400, 'Invalid rule criteria');
		// 	}
		// }

		// if (operators.includes(criteria.operator2)) {
		// 	if (!hasText(criteria.classId)) {
		// 		throw new CustomError(400, 'Invalid rule criteria');
		// 	}
		// }

		// if (
		// 	hasText(criteria.employeeId) &&
		// 	hasText(criteria.customerId) &&
		// 	hasText(criteria.classId)
		// ) {
		// 	if (
		// 		!operators.includes(criteria.operator1) &&
		// 		!operators.includes(criteria.operator2)
		// 	) {
		// 		throw new CustomError(400, 'Invalid rule criteria');
		// 	}
		// }

		// if (
		// 	hasText(criteria.employeeId) &&
		// 	!hasText(criteria.customerId) &&
		// 	hasText(criteria.classId)
		// ) {
		// 	if (!operators.includes(criteria.operator2)) {
		// 		throw new CustomError(400, 'Invalid rule criteria');
		// 	}
		// }

		// if (
		// 	hasText(criteria.employeeId) &&
		// 	hasText(criteria.customerId) &&
		// 	!hasText(criteria.classId)
		// ) {
		// 	if (!operators.includes(criteria.operator1)) {
		// 		throw new CustomError(400, 'Invalid rule criteria');
		// 	}
		// }
	}

	async getCustomRuleById(id: string, companyId: string) {
		const data = await prisma.customRules.findFirst({
			where: {
				id,
				companyId,
			},
		});

		if (!data) {
			throw new CustomError(400, 'Invalid Id');
		}

		return data;
	}

	async deleteCustomRuleById(id: string, companyId: string) {
		const rule = await prisma.customRules.findUniqueOrThrow({
			where: {
				id: id,
			},
		});

		await prisma.customRules.deleteMany({
			where: {
				id,
				companyId,
			},
		});

		await prisma.customRules.updateMany({
			where: {
				companyId,
				triggerProcess: rule.triggerProcess,
				priority: {
					gt: rule.priority,
				},
			},
			data: {
				priority: {
					decrement: 1,
				},
			},
		});
	}

	async updatePriority(data: any, companyId: string) {
		if (!data.length) {
			return;
		}

		await Promise.all(
			data.map(async (rule: any) => {
				await prisma.customRules.updateMany({
					where: {
						id: rule.id,
						companyId,
					},
					data: {
						priority: Number(rule.priority),
					},
				});
			})
		);
	}
}

export default new CustomRuleService();
