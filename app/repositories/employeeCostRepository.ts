/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from '../client/prisma';
class EmployeeCostRepository {
	// For get the monthly cost value per employee
	async getMonthlyCost(
		companyId: string,
		date: string,
		offset: number,
		limit: number,
		searchCondition: any,
		sortCondition: any,
		isPercentage: boolean,
		payPeriodId: string,
		includeInactive?: boolean,
		showEmployeeWithAllocationConfig?: boolean,
		notIncludedEmployeeIds?: string[]

	) {
		try {
			const whereQuery: any = {
				companyId: companyId,
				active: true,
				...searchCondition,
			};

			if (showEmployeeWithAllocationConfig) {
				whereQuery.EmployeeDirectAllocationConfig = {
					some: {
						payPeriodId,
						isActive: true
					}
				}
			}

			if (notIncludedEmployeeIds && notIncludedEmployeeIds.length) {
				whereQuery.id = {
					in: notIncludedEmployeeIds
				}
			}

			if (includeInactive) {
				delete whereQuery['active'];
			}

			const employeesCostByMonth = await prisma.employee.findMany({
				where: {
					...whereQuery,
				},
				include: {
					employeeCostField: {
						where: {
							field: {
								payPeriodId,
								isActive: true,
							},
							payPeriodId
						},
						include: {
							field: true,
							costValue: {
								where: {
									payPeriodId,
									isPercentage: true,
								},
							},
						},
					},
					EmployeeDirectAllocationConfig: {
						where: {
							payPeriodId,
							isActive: true
						}
					}
				},
				skip: offset,
				take: limit,
				...sortCondition,
			});

			return employeesCostByMonth;
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
		const query: any = {
			companyId,
			fullName: {
				contains: search,
				mode: 'insensitive',
			},
			active: true,
		};

		if (!search) {
			delete query.fullName;
		}

		if (includeInactive) {
			delete query['active'];
		}

		if (showEmployeeWithAllocationConfig) {
			query.EmployeeDirectAllocationConfig = {
				some: {
					payPeriodId,
					isActive: true
				}
			}
		}

		const employeesCostByMonth = await prisma.employee.findMany({
			where: query,
			include: {
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},

			orderBy: {
				fullName: 'asc',
			},
		});
		return employeesCostByMonth;
	}

	async getEmployees(
		companyId: string,
		offset: number,
		limit: number,
		searchCondition: any,
		sortCondition: any
	) {
		try {
			// const dateCopy = new Date(date);
			const employeesCostByMonth = await prisma.employee.findMany({
				where: {
					companyId: companyId,
					...searchCondition,
				},
				skip: offset,
				take: limit,
				...sortCondition,
			});

			return employeesCostByMonth;
		} catch (error) {
			throw error;
		}
	}

	async getMonthlyCostExport(
		companyId: string,
		date: string,
		searchCondition: any,
		sortCondition: any,
		isPercentage: boolean,
		includeInactive: boolean,
		payPeriodId?: string
	) {
		const isPercentageValue = isPercentage || true;

		const whereQuery = {
			companyId: companyId,
			active: true,
			...searchCondition,
		};

		if (includeInactive) {
			delete whereQuery['active'];
		}

		try {
			const employeesCostByMonth = await prisma.employee.findMany({
				where: whereQuery,
				include: {
					employeeCostField: {
						where: {
							field: {
								payPeriodId,
								companyId,
								isActive: true,
								configurationSection: {
									payPeriodId,
									companyId
								}
							},
							payPeriodId
						},
						include: {
							field: {
								include: {
									configurationSection: true,
								},
							},
							costValue: {
								where: {
									payPeriodId: payPeriodId,
									isPercentage: isPercentageValue,
								},
							},
						},
					},
				},

				...sortCondition,
			});

			return employeesCostByMonth;
		} catch (error) {
			throw error;
		}
	}

	async count(
		companyId: string,
		searchCondition: any,
		includeInactive?: boolean,
		payPeriodId?: string,
		showEmployeeWithAllocationConfig?: boolean,
		notIncludedEmployeeIds?: string[]
	) {
		try {
			const whereQuery = {
				companyId: companyId,
				active: true,
				...searchCondition,
			};

			if (showEmployeeWithAllocationConfig) {
				whereQuery.EmployeeDirectAllocationConfig = {
					some: {
						payPeriodId,
						isActive: true
					}
				}
			}

			if (notIncludedEmployeeIds && notIncludedEmployeeIds.length) {
				whereQuery.id = {
					in: notIncludedEmployeeIds
				}
			}

			if (includeInactive) {
				delete whereQuery['active'];
			}

			const employeeCount = await prisma.employee.count({
				where: whereQuery,
			});
			return employeeCount;
		} catch (error) {
			throw error;
		}
	}

	// Create monthly cost values for all employees
	async createMonthlyCost(
		employees: any,
		companyId: string,
		payPeriodId: string
	) {
		let lastPayPeriodId: string | null = null;

		const allPayPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId,
				id: {
					not: payPeriodId,
				},
			},
		});

		if (allPayPeriods && allPayPeriods.length) {
			lastPayPeriodId = allPayPeriods[allPayPeriods.length - 1].id;
		}

		await Promise.all(
			employees.map(async (singleEmployee: any) => {
				// Fetching all the fields of that employee
				const employeeCostFields = await prisma.employeeCostField.findMany({
					where: {
						companyId: companyId,
						employeeId: singleEmployee.id,
						payPeriodId
					},
					select: {
						id: true,
						employee: true,
						employeeId: true,
						company: true,
						companyId: true,
						fieldId: true,
						field: {
							select: {
								jsonId: true,
								configurationSection: {
									select: {
										no: true,
									},
								},
							},
						},
					},
				});

				// Creating the values for single employee - For Percentage Method
				employeeCostFields.map(async (singleEmployeeCostFields) => {
					if (singleEmployeeCostFields?.field?.configurationSection?.no == 0) {
						if (singleEmployeeCostFields?.field?.jsonId == 'f1') {
							await prisma.employeeCostValue.create({
								data: {
									employee: { connect: { id: singleEmployee.id } },
									employeeCostField: {
										connect: { id: singleEmployeeCostFields.id },
									},
									payPeriod: { connect: { id: payPeriodId } },
									value: null,
									isPercentage: true,
								},
							});
						} else {
							await prisma.employeeCostValue.create({
								data: {
									employee: { connect: { id: singleEmployee.id } },
									employeeCostField: {
										connect: { id: singleEmployeeCostFields.id },
									},
									payPeriod: { connect: { id: payPeriodId } },
									value: '0:00',
									isPercentage: true,
								},
							});
						}
					} else {
						let value: string | null = '0.00';

						if (lastPayPeriodId) {
							const lastPayPeriodValue =
								await prisma.employeeCostValue.findFirst({
									where: {
										employeeCostField: {
											id: singleEmployeeCostFields.id,
											companyId,
										},
										employeeId: singleEmployee.id,
										payPeriodId: lastPayPeriodId,
									},
								});

							if (lastPayPeriodValue) {
								value = lastPayPeriodValue.value;
							}
						}

						await prisma.employeeCostValue.create({
							data: {
								employee: { connect: { id: singleEmployee.id } },
								employeeCostField: {
									connect: { id: singleEmployeeCostFields.id },
								},
								payPeriod: { connect: { id: payPeriodId } },
								isPercentage: true,
								value,
							},
						});
					}
				});
			})
		);
		return 'Percentage values created successfully';
	}

	// Creating employee cost fields at integration time
	async createInitialValues(
		listOfEmployee: any,
		listOfFields: any,
		companyId: string
	) {
		try {
			await Promise.all(
				listOfEmployee.map(async (singleEmployee: any) => {
					listOfFields.map(async (singleField: any) => {
						await prisma.employeeCostField.create({
							data: {
								employee: { connect: { id: singleEmployee.id } },
								field: { connect: { id: singleField.id } },
								company: { connect: { id: companyId } },
							},
						});
					});
				})
			);
			return 'Initial values created';
		} catch (error) {
			throw error;
		}
	}

	// Create EmployeeCost when new field create
	async createNewEmployeeCost(
		listOfEmployee: any,
		fieldId: string,
		companyId: string,
		listOfPayPeriods: any
	) {
		try {
			await Promise.all(
				listOfEmployee.map(async (singleEmployee: any) => {
					//creating employee field
					const employeeCostField = await prisma.employeeCostField.create({
						data: {
							employee: { connect: { id: singleEmployee.id } },
							field: { connect: { id: fieldId } },
							company: { connect: { id: companyId } },
						},
					});

					// creating the employee cost field value - percentage
					await Promise.all(
						listOfPayPeriods.map(async (singlePayPeriod: any) => {
							await prisma.employeeCostValue.create({
								data: {
									employee: { connect: { id: singleEmployee?.id } },
									employeeCostField: {
										connect: { id: employeeCostField?.id },
									},
									payPeriod: { connect: { id: singlePayPeriod?.id } },
									isPercentage: true,
								},
							});
						})
					);

				})
			);
			return 'Initial values created';
		} catch (error) {
			throw error;
		}
	}

	async createNewEmployeeCostAndField(listOfEmployees: any[], fieldId: string, companyId: string, payPeriodId: string) {
		if (!listOfEmployees.length) {
			return;
		}

		for (const employee of listOfEmployees) {
			const employeeCostField = await prisma.employeeCostField.create({
				data: {
					companyId,
					payPeriodId: payPeriodId,
					fieldId: fieldId,
					employeeId: employee.id
				}
			});

			await prisma.employeeCostValue.create({
				data: {
					employeeId: employee.id,
					employeeFieldId: employeeCostField.id,
					payPeriodId: payPeriodId,
					isPercentage: true,
					value: '0.00',
				},
			});
		}
	}

	// delete EmployeeCost when new field delete
	async deleteNewEmployeeCost(
		listOfEmployee: any,
		fieldId: string,
		companyId: string
	) {
		try {
			await Promise.all(
				listOfEmployee.map(async (singleEmployee: any) => {
					await prisma.employeeCostField.deleteMany({
						where: {
							employeeId: singleEmployee.id,
							fieldId: fieldId,
							companyId: companyId,
						},
					});
				})
			);
			return 'Initial values created';
		} catch (error) {
			throw error;
		}
	}

	// Create EmployeeCost Value when new field create
	async createNewMonthlyCost(
		employees: any,
		employeeCostFieldId: string,
		date: Date
	) {
		try {
			const dateCopy = new Date(date);
			// For hours
			await Promise.all(
				employees.map(async (singleEmployee: any) => {
					await prisma.employeeCostValue.create({
						data: {
							employee: { connect: { id: singleEmployee?.id } },
							employeeCostField: {
								connect: { id: employeeCostFieldId },
							},
							// month: dateCopy.getMonth() + 1,
							// year: dateCopy.getFullYear(),
							isPercentage: false,
						},
					});
				})
			);

			// For percentage
			await Promise.all(
				employees.map(async (singleEmployee: any) => {
					await prisma.employeeCostValue.create({
						data: {
							employee: { connect: { id: singleEmployee?.id } },
							employeeCostField: {
								connect: { id: employeeCostFieldId },
							},
							isPercentage: true,
						},
					});
				})
			);
		} catch (error) {
			throw error;
		}
	}

	// For update the monthly cost value
	async updateMonthlyCost(
		employeeCostValueID: string,
		value: string,
		payPeriodId?: string,
		isCalculatorValue?: boolean
	) {
		try {
			const updatedCost = await prisma.employeeCostValue.update({
				where: {
					id: employeeCostValueID,
				},
				data: {
					value: value,
				},
			});

			return updatedCost;
		} catch (error) {
			throw error;
		}
	}

}

export default new EmployeeCostRepository();
