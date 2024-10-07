/* eslint-disable camelcase */
import { prisma } from '../client/prisma';

class CustomClassMappingRepository {
	async createCustomClassMapping(data: any) {
		const customClassMapping = await prisma.customClassMapping.upsert({
			where: {
				companyId_payPeriodId: {
					companyId: data.companyId,
					payPeriodId: data.payPeriodId
				},
			},
			create: {
				classMapping: data.classMapping,
				payPeriodId: data.payPeriodId,
				companyId: data.companyId,
				createdBy: data.createdBy,
			},
			update: {
				classMapping: data.classMapping,
				updatedBy: data.updatedBy,
			},
		});

		return customClassMapping;
	}

	async getCustomClassMapping(data: any) {
		const customClassMapping = await prisma.customClassMapping.findMany({
			where: {
				companyId: data.companyId,
				payPeriodId: data.payPeriodId,
			}
		});

		return customClassMapping;
	}

}

export default new CustomClassMappingRepository();
