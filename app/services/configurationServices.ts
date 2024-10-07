import { prisma } from '../client/prisma';
import { sectionWiseTotalFieldName } from '../constants/data';
import { CustomError } from '../models/customError';
import {
	companyRepository,
	employeeCostRepository,
	// employeeCostRepository,
	employeeRepository,
} from '../repositories';
import configurationRepository from '../repositories/configurationRepository';
// import employeeServices from './employeeServices';
class ConfigurationService {
	// For get sections with fields
	async getFieldsSection(companyId: string, payPeriodId: string) {
		try {
			const sections = await configurationRepository.getConfigurationField(
				companyId,
				payPeriodId
			);

			return sections;
		} catch (error) {
			throw error;
		}
	}
	// For create field with section
	async createField(companyId: string, sectionId: string, payPeriodId: string, data: any) {
		try {
			const company = await companyRepository.getDetails(companyId);
			if (!company) {
				const error = new CustomError(404, 'Company not found');
				throw error;
			}
			const createdField = await configurationRepository.createField(
				companyId,
				sectionId,
				payPeriodId,
				data
			);

			// Get all employees by companyId
			const employeeList = await prisma.employee.findMany({
				where: {
					companyId
				},
				orderBy: {
					fullName: 'asc'
				}
			})

			// Employee Cost Field
			// const listOfMonths = await employeeCostRepository.getMonthsByCompanyId(
			// 	companyId
			// );

			// Get list of all pay periods
			// const listOfPayPeriods = await payPeriodServices.getAllPayPeriods({
			// 	companyId: companyId,
			// });

			await employeeCostRepository.createNewEmployeeCostAndField(
				employeeList,
				createdField?.id,
				companyId,
				payPeriodId
			);

			const findTotalField = await prisma.field.findFirst({
				where: {
					companyId,
					configurationSectionId: sectionId,
					jsonId: 't1',
					payPeriodId
				}
			});

			if(!findTotalField) {

				const sectionData = await prisma.configurationSection.findFirst({
					where: {
						id: sectionId,
						companyId,
						payPeriodId
					}
				});

				if(sectionData) {
					const createTotalField = await prisma.field.create({
						data: {
							companyId,
							payPeriodId,
							configurationSectionId: sectionId,
							jsonId: 't1',
							name: sectionWiseTotalFieldName[sectionData.no as keyof typeof sectionWiseTotalFieldName] as string,
							type: 'Monthly',
							priority: 1000
						}
					});

					await employeeCostRepository.createNewEmployeeCostAndField(
						employeeList,
						createTotalField?.id,
						companyId,
						payPeriodId
					);
				}

			}

			return createdField;
		} catch (error) {
			throw error;
		}
	}
	// For delete field
	async deleteField(fieldId: string, companyId: string, payPeriodId: string) {
		try {
			// const deletedField =
			await configurationRepository.deleteConfigurationField(
				fieldId,
				companyId,
				payPeriodId
			);

			// Get all employee list
			const employees = await employeeRepository.getAllEmployeesByCompanyId(
				companyId
			);

			// return deletedField;
			return employees;
		} catch (error) {
			throw error;
		}
	}
	// For update field with section
	async updateField(fieldId: string, fieldName: string) {
		try {
			const editedField = await configurationRepository.editConfigurationField(
				fieldId,
				fieldName
			);
			return editedField;
		} catch (error) {
			throw error;
		}
	}
}
export default new ConfigurationService();
