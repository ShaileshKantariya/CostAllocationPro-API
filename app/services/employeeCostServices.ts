/* eslint-disable no-mixed-spaces-and-tabs */
import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import {
	companyRepository,
	employeeCostRepository,
	employeeRepository,
} from '../repositories';
import payPeriodRepository from '../repositories/payPeriodRepository';
import { hasText, removeCommaAndDollar } from '../utils/utils';
class EmployeeCostService {
	async getMonthlyCost(
		companyId: string,
		date: string,
		page: number,
		limit: number,
		search: string,
		type: string,
		sort: string,
		payPeriodId: string,
		includeInactive: boolean
	) {
		try {
			// Offset
			const offset = (Number(page) - 1) * Number(limit);

			const company = await companyRepository.getDetails(companyId);
			if (!company) {
				const error = new CustomError(404, 'Company not found');
				throw error;
			}

			// Conditions for search
			const searchCondition = search
				? {
					OR: [
						{
							fullName: {
								mode: 'insensitive',
								contains: search as string,
							},
						},
					],
				}
				: {};

			// Conditions for sort
			const sortCondition = {
				orderBy: {
					fullName: sort ? sort : 'asc',
				},
			};

			// Check which method is activate in company configuration - Hourly Or Percentage

			// const configurations =
			// 	await configurationRepository.getCompanyConfiguration(companyId);

			const isPercentage = true;

			// if (configurations?.payrollMethod === 'Hours') {
			// 	isPercentage = false;
			// } else {
			// 	isPercentage = true;
			// }

			let employeesMonthlyCost = [];

			if (payPeriodId) {
				employeesMonthlyCost = await employeeCostRepository.getMonthlyCost(
					companyId,
					date,
					offset,
					limit,
					searchCondition,
					sortCondition,
					isPercentage,
					payPeriodId,
					includeInactive
				);
			} else {
				employeesMonthlyCost = await employeeCostRepository.getEmployees(
					companyId,
					offset,
					limit,
					searchCondition,
					sortCondition
				);
			}

			const count = await employeeCostRepository.count(
				companyId,
				searchCondition,
				includeInactive
			);
			return { employees: employeesMonthlyCost, count };
		} catch (error) {
			throw error;
		}
	}

	async getMonthlyCostV2(
		companyId: string,
		date: string,
		page: number,
		limit: number,
		search: string,
		type: string,
		sort: string,
		payPeriodId: string,
		systemPayPeriodId: boolean,
		includeInactive: boolean,
		showEmployeeWithAllocationConfig: boolean,
		notIncludedEmployeeIds?: string[]
	) {
		try {
			// Offset
			const offset = (Number(page) - 1) * Number(limit);

			const company = await companyRepository.getDetails(companyId);
			if (!company) {
				const error = new CustomError(404, 'Company not found');
				throw error;
			}

			// Conditions for search
			const searchCondition = search
				? {
					OR: [
						{
							fullName: {
								mode: 'insensitive',
								contains: search as string,
							},
						},
					],
				}
				: {};

			// Conditions for sort
			const sortCondition = {
				orderBy: {
					fullName: sort ? sort : 'asc',
				},
			};

			// Check which method is activate in company configuration - Hourly Or Percentage

			// const configurations =
			// 	await configurationRepository.getCompanyConfiguration(companyId);

			const isPercentage = true;

			// if (configurations?.payrollMethod === 'Hours') {
			// 	isPercentage = false;
			// } else {
			// 	isPercentage = true;
			// }

			let employeesMonthlyCost: any[] = [];

			if (payPeriodId) {
				employeesMonthlyCost = await employeeCostRepository.getMonthlyCost(
					companyId,
					date,
					offset,
					limit,
					searchCondition,
					sortCondition,
					isPercentage,
					payPeriodId,
					includeInactive,
					showEmployeeWithAllocationConfig,
					notIncludedEmployeeIds
				);
			} else {
				employeesMonthlyCost = await employeeCostRepository.getEmployees(
					companyId,
					offset,
					limit,
					searchCondition,
					sortCondition
				);
			}

			const employeeCostMappingData: any[] = [];

			if (employeesMonthlyCost.length) {
				employeesMonthlyCost.forEach((singleEmployeeData: any) => {
					const obj: any = {};

					obj['hasEmployeeDirectAllocationConfig'] = singleEmployeeData?.EmployeeDirectAllocationConfig?.filter((e: any) => e.isActive).length ? true : false
					obj['employeeId'] = singleEmployeeData.id;
					obj['employeeName'] = singleEmployeeData.fullName;
					obj['totalLaborBurden'] = '0.00';
					if (singleEmployeeData && singleEmployeeData?.employeeCostField) {
						singleEmployeeData.employeeCostField.forEach(
							(singleFieldObj: any) => {
								if (singleFieldObj && singleFieldObj.field) {
									obj[singleFieldObj.field.id] =
										singleFieldObj.costValue[0].value;
									obj[`value_${singleFieldObj.field.id}`] =
										singleFieldObj.costValue[0].id;
									obj[`section_${singleFieldObj.field.id}`] =
										singleFieldObj.field.configurationSectionId;
								}
							}
						);
					}
					obj['status'] = singleEmployeeData?.active;
					employeeCostMappingData.push(obj);
				});
			}

			const count = await employeeCostRepository.count(
				companyId,
				searchCondition,
				includeInactive,
				payPeriodId,
				showEmployeeWithAllocationConfig,
				notIncludedEmployeeIds
			);
			return {
				employees: employeeCostMappingData,
				count,
				payPeriodId: systemPayPeriodId ? payPeriodId : null,
			};
		} catch (error) {
			throw error;
		}
	}

	async getMonthlyCostTotal(
		companyId: string,
		payPeriodId: string,
		search: string,
		includeInactive?: boolean,
		showEmployeeWithAllocationConfig?: boolean
	) {
		const company = await companyRepository.getDetails(companyId);
		if (!company) {
			const error = new CustomError(404, 'Company not found');
			throw error;
		}

		const payPeriod = await payPeriodRepository.getDetails(
			payPeriodId,
			companyId
		);
		if (!payPeriod) {
			const error = new CustomError(404, 'Pay period not found');
			throw error;
		}

		const employeesMonthlyCost =
			await employeeCostRepository.getMonthlyCostTotal(
				companyId,
				payPeriodId,
				search,
				includeInactive,
				showEmployeeWithAllocationConfig
			);

		const obj: any = {
			employeeName: 'Total',
			status: true,
		};

		const companyFields = await prisma.field.findMany({
			where: {
				companyId,
				jsonId: 't1',
				payPeriodId
			},
		});

		const totalFields: any[] = [];

		companyFields.forEach((e) => {
			if (!totalFields.includes(e.id)) {
				totalFields.push(e.id);
			}
		});

		employeesMonthlyCost.forEach((singleEmployeeData: any) => {
			singleEmployeeData.employeeCostField.forEach((singleFieldObj: any) => {
				if (singleEmployeeData && singleEmployeeData?.employeeCostField) {
					if (obj[singleFieldObj.field.id]) {
						obj[singleFieldObj.field.id] += Number(
							singleFieldObj.costValue[0].value
						);
					} else {
						obj[singleFieldObj.field.id] = Number(
							singleFieldObj.costValue[0].value
						);
					}
				}
			});
		});

		let total = 0;

		Object.keys(obj).forEach((key: string) => {
			if (totalFields.includes(key)) {
				total += obj[key];
			}
		});

		obj['totalLaborBurden'] = total;

		return obj;
	}

	async getMonthlyCostExport(
		companyId: string,
		date: string,
		search: string,
		type: string,
		sort: string,
		isPercentage: boolean,
		payPeriodId: string,
		includeInactive: boolean
	) {
		try {
			const company = await companyRepository.getDetails(companyId);
			if (!company) {
				const error = new CustomError(404, 'Company not found');
				throw error;
			}
			let payPeriodData;
			if (payPeriodId) {
				// Get pay period details
				payPeriodData = await payPeriodRepository.getDetails(
					payPeriodId,
					companyId
				);

				if (!payPeriodData) {
					throw new CustomError(404, 'Pay period not found');
				}
			}

			// Conditions for search
			const searchCondition = search
				? {
					OR: [
						{
							fullName: {
								mode: 'insensitive',
								contains: search as string,
							},
						},
					],
				}
				: {};

			// Conditions for sort
			const sortCondition = {
				orderBy: {
					fullName: sort ? sort : 'asc',
				},
			};

			const employeesMonthlyCost =
				await employeeCostRepository.getMonthlyCostExport(
					companyId,
					date,
					searchCondition,
					sortCondition,
					isPercentage,
					includeInactive,
					payPeriodId
				);
			const count = await employeeCostRepository.count(
				companyId,
				searchCondition
			);
			return { employees: employeesMonthlyCost, count, company, payPeriodData };
		} catch (error) {
			throw error;
		}
	}

	async exportEmployeeCostSampleCsv(payPeriodId: string, companyId: string) {

		const payPeriodData = await prisma.payPeriod.findFirst({
			where: {
				companyId,
				id: payPeriodId,
			}
		});

		if (!payPeriodData) {
			throw new CustomError(400, 'Pay period not found');
		}

		const notIncludeSection = await prisma.configurationSection.findFirst({
			where: {
				companyId,
				no: 0,
				payPeriodId: payPeriodId,
			}
		})

		const employeeCostData = await prisma.employee.findMany({
			where: {
				active: true,
				companyId
			},
			include: {
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
							jsonId: {
								not: 't1'
							},
							configurationSectionId: {
								not: notIncludeSection?.id
							}
						},
						payPeriodId
					},
					include: {
						field: { include: { configurationSection: true } },
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
								employeeCostField: {
									field: {
										jsonId: {
											not: 't1'
										},
										configurationSectionId: {
											not: notIncludeSection?.id
										}
									}
								}
							},
						},
					},
					orderBy: [
						{
							field: {
								configurationSection: {
									no: 'asc'
								}
							}
						},
						{
							field: {
								priority: 'asc'
							}
						}
					]
				}
			},
			orderBy: {
				fullName: 'asc'
			}
		});

		const csvData: any[] = [];

		// const totalCol: any = {
		// 	Employee: 'Total'
		// };

		employeeCostData.forEach((emp) => {
			const obj: any = {
				Employee: emp.fullName
			}

			emp.employeeCostField.forEach((empField) => {

				if (empField.field?.name) {
					obj[empField.field.name] = empField.costValue[0].value;

					// if(totalCol[empField.field.name]) {
					// 	totalCol[empField.field.name] = Number(totalCol[empField.field.name]) + Number(empField.costValue[0].value)
					// } else {
					// 	totalCol[empField.field.name] = Number(empField.costValue[0].value);
					// }

				}

			})

			csvData.push(obj);
		});

		// csvData.push(totalCol);

		return csvData;

	}

	async importCsvEmployeeConstValue(payPeriodId: string, companyId: string, employeeCostData: any[]) {

		const configurationSections = await prisma.configurationSection.findMany({
			where: {
				payPeriodId,
				companyId,
				no: {
					in: [1, 2, 3]
				}
			},
			include: {
				fields: {
					where: {
						isActive: true
					}
				}
			}
		})

		const sectionWiseFieldsMapping: any = {};

		const sectionWiseTotalFieldName: any = {};

		configurationSections.forEach((section) => {

			if (section.fields && section.fields.length) {
				sectionWiseFieldsMapping[section.no] = section.fields.filter((e) => e.jsonId.startsWith('f')).map((e) => e.name);
				sectionWiseTotalFieldName[section.no] = section.fields.find((e) => e.jsonId == 't1')?.name;
			}

		});

		for (const empCost of employeeCostData) {


			for (const key in sectionWiseFieldsMapping) {

				if (sectionWiseFieldsMapping[key]) {

					let total = 0;

					for (const field of sectionWiseFieldsMapping[key]) {
						if(hasText(empCost[field])) {
								const value = removeCommaAndDollar(empCost[field]);
		
								if(value && !isNaN(Number(value))) {
									total = Number(total.toFixed(2)) + Number(Number(value).toFixed(2))
								}
		
								await prisma.employeeCostValue.updateMany({
									where: {
										employeeCostField: {
											employee: {
												fullName: empCost['Employee'],
												companyId
											},
											payPeriodId,
											companyId,
											field: {
												name: field,
												payPeriodId,
												companyId,
												configurationSection: {
													no: Number(key)
												}
											}
										}
									},
									data: {
										value: Number(value).toFixed(2)
									}
								})
							}
		
							await prisma.employeeCostValue.updateMany({
								where: {
									employeeCostField: {
										employee: {
											fullName: empCost['Employee'],
											companyId
										},
										payPeriodId,
										companyId,
										field: {
											name: sectionWiseTotalFieldName[key],
											payPeriodId,
											companyId,
											configurationSection: {
												no: Number(key)
											}
										}
									}
								},
								data: {
									value: Number(total).toFixed(2)
								}
							})
						}

				}

			}

		}

		return {
			success: true
		}

	}

	// For create the monthly time cost data
	async createMonthlyCost(companyId: string, payPeriodId: string) {
		try {
			const company = await companyRepository.getDetails(companyId);

			if (!company) {
				const error = new CustomError(404, 'Company not found');
				throw error;
			}

			// Check if pay period exists
			const payPeriod = await payPeriodRepository.getDetails(
				payPeriodId,
				companyId
			);

			if (!payPeriod) {
				throw new CustomError(404, 'Pay period not found');
			}

			// const isValueExist = await employeeCostRepository.isMonthlyValueCreated(
			// 	companyId,
			// 	date
			// );

			// if (isValueExist) {
			// 	return;
			// }

			// await employeeCostRepository.createMonth(companyId, date);

			const employees = await employeeRepository.getAllEmployeesByCompanyId(
				companyId
			);
			if (employees.length === 0) {
				const error = new CustomError(404, 'No employee found in this company');
				throw error;
			}
			const createdMonthlyCosts =
				await employeeCostRepository.createMonthlyCost(
					employees,
					companyId,
					payPeriodId
				);

			return createdMonthlyCosts;
		} catch (error) {
			throw error;
		}
	}
	async updateMonthlyCost(
		employeeCostValueID: string,
		value: string,
		paPeriodId: string,
		isCalculatorValue: boolean
	) {
		try {
			const updatedEmployeeCostValue = employeeCostRepository.updateMonthlyCost(
				employeeCostValueID,
				value,
				paPeriodId,
				isCalculatorValue
			);
			return updatedEmployeeCostValue;
		} catch (error) {
			throw error;
		}
	}
}

export default new EmployeeCostService();
