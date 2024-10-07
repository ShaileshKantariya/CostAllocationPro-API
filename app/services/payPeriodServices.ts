import moment from 'moment';
import { prisma } from '../client/prisma';
import { PayPeriodInterface } from '../interfaces/payPeriodInterface';
import { CustomError } from '../models/customError';
import {
	companyRepository,
	// employeeCostRepository,
	// employeeRepository,
} from '../repositories';
import payPeriodRepository from '../repositories/payPeriodRepository';
import timeSheetRepository from '../repositories/timeSheetRepository';
import timeActivityServices from './timeActivityServices';
import { DefaultConfigurationSettings, sections } from '../constants/data';

class payPeriodServices {
	async getAllPayPeriods(payPeriodData: any) {
		const companyId = payPeriodData.companyId;

		const { page, limit, year } = payPeriodData;

		let offset;

		if (page && limit) {
			offset = (Number(page) - 1) * Number(limit);
		}
		// Check If company exists
		const companyDetails = await companyRepository.getDetails(companyId);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		let dateFilter = {};

		if (year) {
			const startDateOfYear = new Date(`${Number(year)}-01-01T00:00:00.000Z`);
			const endDateOfYear = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
			dateFilter = {
				OR: [
					{
						startDate: {
							gte: startDateOfYear,
							lt: endDateOfYear,
						},
					},
					{
						endDate: {
							gte: startDateOfYear,
							lt: endDateOfYear,
						},
					},
				],
			};
		}

		const data = {
			offset: offset,
			limit: limit,
			companyId: companyId,
			dateFilter: dateFilter,
		};

		const payPeriods = await payPeriodRepository.getAll(data);
		return payPeriods;
	}

	async count(payPeriodData: any) {
		const { companyId } = payPeriodData;
		const payPeriodCount = await prisma.payPeriod.count({
			where: {
				companyId: companyId,
			},
		});
		return payPeriodCount;
	}

	async createNewPayPeriod(payPeriodData: PayPeriodInterface) {
		const { companyId, startDate, endDate, copyEmployeeCostValueFromPriorPeriod } = payPeriodData;

		// Check If company exists
		const companyDetails = await companyRepository.getDetails(companyId);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		// if (
		// 	endDate > closingDate ||
		// 	moment(endDate).format('MM/DD/YYYY') ===
		// 		moment(closingDate).format('MM/DD/YYYY')
		// ) {
		// 	throw new CustomError(
		// 		400,
		// 		'Pay period must be greater than closing date'
		// 	);
		// }

		if (endDate < startDate) {
			throw new CustomError(400, 'Start date must be before end date');
		}

		const { isInPayPeriod } = await payPeriodRepository.isDateInAnyPayPeriod(
			payPeriodData
		);

		if (isInPayPeriod) {
			throw new CustomError(400, 'Dates are already in pay period');
		}

		const payPeriod = await payPeriodRepository.create(payPeriodData);

		// Create employee cost value for this pay period

		// const employees = await employeeRepository.getAllEmployeesByCompanyId(
		// 	companyId
		// );
		// if (employees.length === 0) {
		// 	const error = new CustomError(404, 'No employee found in this company');
		// 	throw error;
		// }

		const allPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
				id: {
					not: payPeriod.id,
				},
			},
			orderBy: { createdAt: 'desc' }
		});

		if (allPayPeriods && allPayPeriods.length) {

			const lastPayPeriodId = allPayPeriods[0].id;

			await this.createNewConfigurationWithLastPayPeriod(companyId, lastPayPeriodId, payPeriod.id, copyEmployeeCostValueFromPriorPeriod);

			const lastPayPeriodEmployeeConfiguration = await prisma.employeeDirectAllocationConfig.findMany({
				where: {
					payPeriodId: lastPayPeriodId
				}
			});

			if (lastPayPeriodEmployeeConfiguration?.length) {
				const newPayPeriodConfiguration = lastPayPeriodEmployeeConfiguration.map((e) => {
					return {
						companyId: e.companyId,
						payPeriodId: payPeriod.id,
						allocation: Number(e.allocation),
						classId: e.classId,
						customerId: e.customerId,
						className: e.className,
						customerName: e.customerName,
						isActive: e.isActive,
						employeeId: e.employeeId,
						createdBy: e.createdBy,
						updatedBy: e.updatedBy,
					}
				})

				await prisma.employeeDirectAllocationConfig.createMany({
					data: newPayPeriodConfiguration
				})
			}

		} else {
			await this.createNewConfigurationWithDefault(companyId, payPeriod.id);
		}

		// await employeeCostRepository.createMonthlyCost(
		// 	employees,
		// 	companyId,
		// 	payPeriod.id
		// );

		return payPeriod;
	}

	async createNewConfigurationWithLastPayPeriod(companyId: string, lastPayPeriodId: string, newPayPeriodId: string, copyEmployeeCostValueFromPriorPeriod: boolean) {

		const configuration = await prisma.configuration.findFirst({
			where: {
				companyId,
				payPeriodId: lastPayPeriodId
			}
		});

		const customConfigurationRules = await prisma.configurationCustomRules.findMany({
			where: {
				companyId,
				payPeriodId: lastPayPeriodId
			}
		})

		const configurationSection = await prisma.configurationSection.findMany({
			where: {
				companyId,
				payPeriodId: lastPayPeriodId
			}
		});

		const fields = await prisma.field.findMany({
			where: {
				companyId,
				payPeriodId: lastPayPeriodId,
				configurationSectionId: {
					in: configurationSection.map((e) => {
						return e.id
					})
				}
			}
		});

		const employeeCostFields = await prisma.employeeCostField.findMany({
			where: {
				companyId,
				payPeriodId: lastPayPeriodId,
				fieldId: {
					in: fields.map((e) => {
						return e.id
					})
				}
			}
		});

		if (configuration) {

			await prisma.configuration.create({
				data: {
					companyId,
					payPeriodId: newPayPeriodId,
					settings: configuration.settings!,
					indirectExpenseRate: configuration.indirectExpenseRate,
					payrollMethod: configuration.payrollMethod,
					decimalToFixedPercentage: configuration.decimalToFixedPercentage,
					decimalToFixedAmount: configuration.decimalToFixedAmount,
					isClassRequiredForJournal: configuration.isClassRequiredForJournal,
					isCustomerRequiredForJournal: configuration.isCustomerRequiredForJournal
				}
			});

			for (const oldSection of configurationSection) {

				const newSection = await prisma.configurationSection.create({
					data: {
						companyId,
						payPeriodId: newPayPeriodId,
						sectionName: oldSection.sectionName,
						no: oldSection.no,
					}
				});


				const oldFieldData = fields.filter((e) => e.configurationSectionId === oldSection.id && e.companyId === companyId);

				if (oldFieldData.length) {

					for (const oldField of oldFieldData) {

						const newField = await prisma.field.create({
							data: {
								companyId,
								payPeriodId: newPayPeriodId,
								configurationSectionId: newSection.id,
								jsonId: oldField.jsonId,
								type: oldField.type,
								name: oldField.name,
								isActive: oldField.isActive,
								priority: oldField.priority
							}
						});

						const oldEmployeeCostFields = employeeCostFields.filter((e) => e.fieldId === oldField.id);

						for (const oldEmployeeCostField of oldEmployeeCostFields) {

							const newEmployeeCostField = await prisma.employeeCostField.create({
								data: {
									companyId,
									payPeriodId: newPayPeriodId,
									fieldId: newField.id,
									employeeId: oldEmployeeCostField.employeeId
								}
							});

							const oldEmployeeCostFieldValue = await prisma.employeeCostValue.findFirst({
								where: {
									employeeFieldId: oldEmployeeCostField.id,
									payPeriodId: lastPayPeriodId,
								}
							});

							let value: string | null = '0.00';

							if (newEmployeeCostField.employeeId) {

								if (oldEmployeeCostFieldValue && copyEmployeeCostValueFromPriorPeriod) {
									value = oldEmployeeCostFieldValue.value;
								}

								await prisma.employeeCostValue.create({
									data: {
										employee: { connect: { id: newEmployeeCostField.employeeId } },
										employeeCostField: {
											connect: { id: newEmployeeCostField.id },
										},
										payPeriod: { connect: { id: newPayPeriodId } },
										isPercentage: true,
										value,
									},
								});
							}

						}

					}

				}

			}
		}
		if (customConfigurationRules) {
			for (const customConfigurationRule of customConfigurationRules) {
				await prisma.configurationCustomRules.create({
					data: {
						companyId,
						payPeriodId: newPayPeriodId,
						priority: customConfigurationRule.priority,
						name: customConfigurationRule.name,
						isActive: customConfigurationRule.isActive,
						description: customConfigurationRule.description,
						actions: customConfigurationRule.actions as any,
						criteria: customConfigurationRule.criteria as any,

					}
				})
			}
		}

	}

	async createNewConfigurationWithDefault(companyId: string, payPeriodId: string) {

		const employees = await prisma.employee.findMany({
			where: {
				companyId
			}
		})

		await prisma.configuration.create({
			data: {
				settings: DefaultConfigurationSettings,
				indirectExpenseRate: 0,
				payrollMethod: 'Percentage',
				companyId: companyId,
				payPeriodId
			}
		});

		for (const section of sections) {

			const newSection = await prisma.configurationSection.create({
				data: {
					companyId,
					payPeriodId,
					no: section.no,
					sectionName: section.sectionName,

				}
			})

			for (const field of section.fields) {

				const newField = await prisma.field.create({
					data: {
						companyId,
						payPeriodId,
						jsonId: field.jsonId,
						configurationSectionId: newSection.id,
						isActive: true,
						type: 'Monthly',
						name: field.name,
						priority: field.priority
					}
				});

				for (const employee of employees) {

					const employeeCostField = await prisma.employeeCostField.create({
						data: {
							companyId,
							payPeriodId,
							employeeId: employee.id,
							fieldId: newField.id,
						}
					});

					await prisma.employeeCostValue.create({
						data: {
							payPeriodId,
							employeeFieldId: employeeCostField.id,
							value: '0.00',
							employeeId: employee.id,
							isPercentage: true
						}
					})

				}

			}

		}

	}

	async editPayPeriod(payPeriodData: any) {
		const companyId = payPeriodData.companyId;

		// Check If company exists
		const companyDetails = await companyRepository.getDetails(companyId);
		if (!companyDetails) {
			throw new CustomError(404, 'Company not found');
		}

		const { isInPayPeriod, payPeriod }: any =
			await payPeriodRepository.isDateInEditPayPeriod(payPeriodData);

		if (isInPayPeriod && payPeriod.id != payPeriodData.id) {
			throw new CustomError(400, 'Dates are already in pay period');
		}

		const data = await payPeriodRepository.update(payPeriodData);

		// // Update time sheet

		if (data?.TimeSheets) {
			const { timeActivitiesWithHours: timeActivities } =
				await timeActivityServices.getAllTimeActivitiesServices({
					companyId: companyId,
					payPeriodId: data?.id,
				});

			const timeSheetData = {
				name: data?.TimeSheets?.name,
				notes: data?.TimeSheets?.name,
				status: data?.TimeSheets?.status,
				companyId: data?.TimeSheets?.companyId,
				userId: data?.TimeSheets?.userId,
				payPeriodId: data?.id,
				timeActivities: timeActivities,
				findExistingTimeSheet: data?.TimeSheets,
				allTimeActivities: timeActivities
			};
			await timeSheetRepository.createTimeSheet(timeSheetData);
		}

		return data;
	}

	async getAllPayPeriodDates(companyId: string) {
		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
			},
			orderBy: {
				startDate: 'asc',
			},
		});
		const dates: string[] = [];

		payPeriods.forEach((e) => {
			const startDate: any = new Date(e.startDate);
			const endDate: any = new Date(e.endDate);

			// Calculate the difference in milliseconds between start and end dates
			const timeDiff = endDate - startDate;

			// Calculate the number of days between start and end dates
			const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

			// Push the start date into the result array
			dates.push(moment(startDate).format('YYYY-MM-DD'));

			// Push all dates in between
			for (let i = 1; i < daysDiff; i++) {
				const date = new Date(startDate);
				date.setDate(startDate.getDate() + i);
				dates.push(moment(date).format('YYYY-MM-DD'));
			}

			// Push the end date into the result array
			dates.push(moment(endDate).format('YYYY-MM-DD'));
		});

		return dates;
	}
}

export default new payPeriodServices();
