import { prisma } from '../client/prisma';
// import employeeCostRepository from './employeeCostRepository';
// import payPeriodRepository from './payPeriodRepository';

class EmployeeRepository {
	async getAllEmployeesByCompanyId(companyId: string) {
		try {
			const employees = await prisma.employee.findMany({
				where: {
					companyId: companyId,
					active: true,
				},
				orderBy: {
					fullName: 'asc',
				},
			});
			return employees;
		} catch (err) {
			throw err;
		}
	}

	async updateOrCreateEmployee(
		empId: string,
		companyId: string,
		employeeData: any,
		listOfFields?: any[]
	) {
		try {
			const employee = await prisma.employee.findFirst({
				where: {
					employeeId: empId,
					companyId: companyId,
				},
			});

			let updatedEmployees: any;
			if (employee) {
				await prisma.employee.updateMany({
					where: {
						employeeId: empId,
						companyId: companyId,
					},
					data: {
						fullName: employeeData?.fullName,
						email: employeeData?.email,
						phone: employeeData?.phone,
						active: employeeData?.active,
					},
				});

				const employee = await prisma.employee.findFirst({
					where: {
						employeeId: empId,
						companyId,
					},
				});

				updatedEmployees = employee;

				if (listOfFields && listOfFields.length) {
					for (const singleField of listOfFields) {
						const getFieldData = await prisma.employeeCostField.findFirst({
							where: {
								companyId,
								payPeriodId: singleField.payPeriodId,
								fieldId: singleField.id,
								employeeId: updatedEmployees.id,
							},
						});

						if (!getFieldData) {
							const employeeCostField = await prisma.employeeCostField.create({
								data: {
									companyId,
									payPeriodId: singleField.payPeriodId,
									fieldId: singleField.id,
									employeeId: updatedEmployees.id,
								},
							});

							await prisma.employeeCostValue.create({
								data: {
									employeeId: updatedEmployees.id,
									employeeFieldId: employeeCostField.id,
									payPeriodId: singleField.payPeriodId,
									isPercentage: true,
									value: '0.00',
								},
							});
						}
					}
				}
			} else {
				updatedEmployees = await prisma.employee.create({
					data: {
						employeeId: employeeData?.employeeId,
						fullName: employeeData?.fullName,
						email: employeeData?.email,
						phone: employeeData?.phone,
						active: employeeData?.active,
						company: { connect: { id: employeeData?.companyId } },
					},
				});
				// This is new code for creating fields for employees after syncing

				// if (listOfFields && listOfFields?.length > 0) {
				// 	await Promise.all(
				// 		listOfFields.map(async (singleField: any) => {
				// 			await prisma.employeeCostField.create({
				// 				data: {
				// 					employee: { connect: { id: updatedEmployees.id } },
				// 					field: { connect: { id: singleField.id } },
				// 					company: { connect: { id: companyId } },
				// 				},
				// 			});
				// 		})
				// 	);

				// 	// Fetch all pay periods
				// 	const payPeriods = await payPeriodRepository.getAll({
				// 		companyId: companyId,
				// 	});

				// 	// Create initial values
				// 	if (payPeriods.length > 0) {
				// 		payPeriods.map(async (singlePayPeriod: any) => {
				// 			await employeeCostRepository.createMonthlyCost(
				// 				[updatedEmployees],
				// 				companyId,
				// 				singlePayPeriod.id
				// 			);
				// 		});
				// 	}

				// 	// OLD REQUIREMENT CODE NEED TO UPDATE WITH NEW
				// 	// const monthList = await prisma.monthYearTable.findMany({
				// 	// 	where: {
				// 	// 		companyId: companyId,
				// 	// 	},
				// 	// });

				// 	// // Create initial values
				// 	// monthList?.map(async (singleRecord: any) => {
				// 	// 	await employeeCostRepository.createMonthlyCost(
				// 	// 		[updatedEmployees],
				// 	// 		companyId,
				// 	// 		new Date(
				// 	// 			`${singleRecord?.month}/1/${singleRecord?.year}`
				// 	// 		).toString()
				// 	// 	);
				// 	// });
				// }

				if (listOfFields && listOfFields.length) {
					for (const singleField of listOfFields) {
						const employeeCostField = await prisma.employeeCostField.create({
							data: {
								companyId,
								payPeriodId: singleField.payPeriodId,
								fieldId: singleField.id,
								employeeId: updatedEmployees.id,
							},
						});

						await prisma.employeeCostValue.create({
							data: {
								employeeId: updatedEmployees.id,
								employeeFieldId: employeeCostField.id,
								payPeriodId: singleField.payPeriodId,
								isPercentage: true,
								value: '0.00',
							},
						});
					}
				}
			}
			return updatedEmployees;
		} catch (err) {
			throw err;
		}
	}

	async getEmployeeDetails(employeeId: string) {
		const employee = await prisma.employee.findUnique({
			where: {
				id: employeeId,
			},
		});
		return employee;
	}

	async getEmployeesByIds(employeeIds: string[]) {
		const employees = await prisma.employee.findMany({
			where: {
				id: {
					in: employeeIds,
				},
			},
		});
		return employees;
	}
}

export default new EmployeeRepository();
