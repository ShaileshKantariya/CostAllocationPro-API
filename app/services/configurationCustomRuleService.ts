import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import { hasText } from '../utils/utils';

class ConfigurationCustomRuleService {
	async getRulesList(query: any) {
		if (!query.companyId) {
			throw new CustomError(400, 'CompanyId required');
		}

		if (!query.payPeriodId) {
			throw new CustomError(400, 'PayPeriod Id required');
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

		const content = await prisma.configurationCustomRules.findMany({
			where: {
				companyId: query.companyId,
				payPeriodId: query.payPeriodId,
				...filterCondition,
				...searchCondition,
			},
			orderBy: {
				priority: 'asc',
			},
		});

		const count = await prisma.configurationCustomRules.count({
			where: {
				companyId: query.companyId,
				payPeriodId: query.payPeriodId,
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
			payPeriodId: data.payPeriodId,
			id: {
				not: id,
			},
		};

		if (!id) {
			delete searchQuery.id;
		}

		const checkExistsRule = await prisma.configurationCustomRules.findFirst({
			where: searchQuery,
		});

		if (checkExistsRule && checkExistsRule.id) {
			throw new CustomError(400, 'Custom rule already exists with same name');
		}

		this.validateCriteriaJson(data.criteria);

		if (id) {
			data.updatedBy = userId;
			return await prisma.configurationCustomRules.update({
				where: {
					id,
				},
				data,
			});
		}

		const allRules = await prisma.configurationCustomRules.findMany({
			where: {
				companyId: data.companyId,
				payPeriodId: data.payPeriodId,
			},
		});

		return prisma.configurationCustomRules.create({
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
	}

	async getCustomRuleById(id: string, companyId: string) {
		const data = await prisma.configurationCustomRules.findFirst({
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

	async updatePriority(data: any, companyId: string, payPeriodId: string) {
		if (!data.length) {
			return;
		}

		await Promise.all(
			data.map(async (rule: any) => {
				await prisma.configurationCustomRules.updateMany({
					where: {
						id: rule.id,
						companyId,
						payPeriodId,
					},
					data: {
						priority: Number(rule.priority),
					},
				});
			})
		);
	}

	async deleteCustomRuleById(
		id: string,
		companyId: string,
	) {
		const rule = await prisma.configurationCustomRules.findUniqueOrThrow({
			where: {
				id: id,
			},
		});

		await prisma.configurationCustomRules.deleteMany({
			where: {
				id,
				companyId,
				payPeriodId: rule.payPeriodId
			},
		});

		await prisma.configurationCustomRules.updateMany({
			where: {
				companyId,
				payPeriodId: rule.payPeriodId,
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
}

export default new ConfigurationCustomRuleService();
