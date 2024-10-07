import moment from 'moment';
import { prisma } from '../client/prisma';
import { logger } from '../utils/logger';
import configurationRepository from '../repositories/configurationRepository';
import { employeeCostRepository, employeeRepository } from '../repositories';
import { DefaultSuperAdminPermissions, sectionPreLive } from '../constants/data';
import payPeriodServices from './payPeriodServices';
import { hashPassword } from '../helpers/passwordHelper';

async function addPayRolePermissions() {
	const allRoles = await prisma.role.findMany();

	if (allRoles.length) {
		for (const role of allRoles) {
			const payPeriodPermissions = await prisma.permission.findFirst({
				where: {
					roleId: role.id,
					permissionName: 'Pay Period',
				},
			});

			if (!payPeriodPermissions) {
				await prisma.permission.create({
					data: {
						roleId: role.id,
						permissionName: 'Pay Period',
						all:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						view:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						edit:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						delete:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						add:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						sortId: 16,
					},
				});
			}
		}
	}
}

async function addSyncLogsPermissions() {
	const allRoles = await prisma.role.findMany();

	if (allRoles.length) {
		for (const role of allRoles) {
			const payPeriodPermissions = await prisma.permission.findFirst({
				where: {
					roleId: role.id,
					permissionName: 'Sync Logs',
				},
			});

			if (!payPeriodPermissions) {
				await prisma.permission.create({
					data: {
						roleId: role.id,
						permissionName: 'Sync Logs',
						all:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						view:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						edit:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						delete:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						add:
							role.roleName === 'Admin' || role.roleName === 'Company Admin'
								? true
								: false,
						sortId: 16,
					},
				});
			}
		}
	}
}

async function testFun() {
	logger.info('running');
}

async function defaultIndirectExpenseRate() {
	await prisma.configuration.updateMany({
		data: {
			indirectExpenseRate: 0,
		},
	});
}

async function sectionNoChanges() {
	await prisma.configurationSection.updateMany({
		where: {
			sectionName: 'Fringe expense',
		},
		data: {
			no: 3,
		},
	});

	await prisma.configurationSection.updateMany({
		where: {
			sectionName: 'Payroll Taxes Expense',
		},
		data: {
			no: 2,
		},
	});
}

async function configurationSettingChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['2']?.placeHolder === 'Select Fringe Expense') {
				const newSettings = { ...settings };

				newSettings['2'] = { ...settings['3'], id: '2' };
				newSettings['3'] = { ...settings['2'], id: '3' };

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function fieldChanges() {
	const sectionTwoConfigurationSection =
		await prisma.configurationSection.findMany({
			where: {
				no: 2,
			},
			select: {
				fields: {
					where: {
						jsonId: 'f3',
					},
				},
				companyId: true,
				id: true,
				no: true,
				sectionName: true,
			},
		});

	if (sectionTwoConfigurationSection.length) {
		for (const section of sectionTwoConfigurationSection) {
			const sectionThree = await prisma.configurationSection.findFirst({
				where: {
					no: 3,
					companyId: section.companyId,
				},
			});

			if (sectionThree) {
				for (const field of section.fields) {
					await prisma.field.update({
						where: {
							id: field.id,
						},
						data: {
							configurationSectionId: sectionThree?.id,
						},
					});
				}
			}
		}
	}
}

async function configurationFringeExpenseChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['3']) {
				const newSettings = { ...settings };

				if (newSettings['3'].fields) {
					if (newSettings['3'].fields['f2']) {
						newSettings['3'].fields['f2'].deletable = true;
					}
				}

				if (newSettings['3'].fields) {
					if (newSettings['3'].fields['f3']) {
						newSettings['3'].fields['f3'].deletable = true;
					}
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function configurationPayRollExpenseChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['2']) {
				const newSettings = { ...settings };

				if (newSettings['2'].fields) {
					if (newSettings['2'].fields['f2']) {
						newSettings['2'].fields['f2'].deletable = true;
					}
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function configurationPayRollExpenseLabelChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['2']) {
				const newSettings = { ...settings };

				if (newSettings['2'].capMappingTitle) {
					newSettings['2'].capMappingTitle = 'Payroll Tax Expense';
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function configurationSalarySectionChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['1']) {
				const newSettings = { ...settings };

				if (newSettings['1'].fields) {
					if (newSettings['1'].fields['f2']) {
						newSettings['1'].fields['f2'].deletable = true;
					}
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function configurationFirstSectionChanges() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['1']) {
				const newSettings = { ...settings };

				if (newSettings['0'].fields) {
					if (newSettings['0'].fields['f1']) {
						newSettings['0'].fields['f1'].label = 'Payroll Expense Pool';
					}
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function addClosingDateToPayPeriod() {
	const allNullClosingDatePayPeriods = await prisma.payPeriod.findMany({
		where: {
			closingDate: null,
		},
	});

	if (allNullClosingDatePayPeriods && allNullClosingDatePayPeriods.length) {
		for (const payPeriod of allNullClosingDatePayPeriods) {
			await prisma.payPeriod.update({
				where: {
					id: payPeriod.id,
				},
				data: {
					closingDate: moment(payPeriod.endDate)
						.endOf('month')
						.startOf('day')
						.toDate(),
				},
			});
		}
	}
}

async function updatePublishedJournalPayPeriods() {
	const publishedJournals = await prisma.journal.findMany({
		where: {
			status: 1,
		},
	});

	if (publishedJournals.length) {
		const payPeriodIds = publishedJournals.map((e) => {
			return e.payPeriodId;
		});

		await prisma.payPeriod.updateMany({
			where: {
				id: {
					in: payPeriodIds,
				},
			},
			data: {
				isJournalPublished: true,
			},
		});
	}
}

async function syncMissingField() {
	if (process.env.RUN_SYNC_FIELD_MIGRATION === 'true') {
		const companyId = '4f4155a3-b6c3-4410-8857-6bbf18cd4dd8';

		await Promise.all(
			sectionPreLive.map(async (singleSection) => {
				const section = await prisma.configurationSection.create({
					data: {
						sectionName: singleSection.sectionName,
						no: singleSection.no,
						company: { connect: { id: companyId } },
					},
				});
				await Promise.all(
					singleSection.fields.map(async (singleField) => {
						await prisma.field.create({
							data: {
								jsonId: singleField.jsonId,
								name: singleField.name,
								type: singleField.type,
								company: { connect: { id: companyId } },
								configurationSection: { connect: { id: section.id } },
							} as any,
						});
					})
				);
			})
		);

		const employees = await employeeRepository.getAllEmployeesByCompanyId(
			companyId
		);

		const sectionWithFields =
			await configurationRepository.getConfigurationField(companyId, '');
		const sectionFields = sectionWithFields.reduce(
			(accumulator: any, section) => {
				accumulator.push(...section.fields);
				return accumulator;
			},
			[]
		);

		await employeeCostRepository.createInitialValues(
			employees,
			sectionFields,
			companyId
		);
	}
}

async function updateConfigurationJson() {
	const allConfigurations = await prisma.configuration.findMany();

	if (allConfigurations.length) {
		for (const configuration of allConfigurations) {
			const settings: any = configuration.settings;

			if (settings['0']) {
				const newSettings = { ...settings };

				if (newSettings['0'].fields) {
					if (newSettings['0'].fields['f1']) {
						newSettings['0'].fields['f1'].isActive = true;
						newSettings['0'].fields['f2'].isActive = true;
					}
				}

				if (newSettings['4'].fields) {
					if (newSettings['4'].fields['f1']) {
						newSettings['4'].fields['f1'].isActive = true;
					}
				}

				if (newSettings['5'].fields) {
					if (newSettings['5'].fields['f1']) {
						newSettings['5'].fields['f1'].isActive = true;
					}
				}

				if (newSettings['1'].fields) {
					Object.keys(newSettings['1'].fields).forEach((key) => {
						newSettings['1'].fields[key].isActive = true;
					});
				}

				if (newSettings['2'].fields) {
					Object.keys(newSettings['2'].fields).forEach((key) => {
						newSettings['2'].fields[key].isActive = true;
					});
				}

				if (newSettings['3'].fields) {
					Object.keys(newSettings['3'].fields).forEach((key) => {
						newSettings['3'].fields[key].isActive = true;
					});
				}

				await prisma.configuration.update({
					where: {
						id: configuration.id,
					},
					data: {
						settings: newSettings,
					},
				});
			}
		}
	}
}

async function migrateConfiguration() {

	const companies = await prisma.company.findMany({
		include: {
			configuration: true
		}
	});

	if (companies.length) {
		for (const company of companies) {

			const payPeriods = await prisma.payPeriod.findMany({
				where: {
					companyId: company.id
				},
				orderBy: {
					createdAt: 'asc'
				}
			});

			if (payPeriods && payPeriods.length) {

				const configuration = await prisma.configuration.findFirst({
					where: {
						companyId: company.id
					}
				});

				const configurationSection = await prisma.configurationSection.findMany({
					where: {
						companyId: company.id
					}
				});

				const fields = await prisma.field.findMany({
					where: {
						companyId: company.id
					}
				});

				const employeeCostFields = await prisma.employeeCostField.findMany({
					where: {
						companyId: company.id
					}
				});

				for (let i = 0; i < payPeriods.length - 1; i++) {
					const payPeriod = payPeriods[i];

					if (configuration) {

						await prisma.configuration.create({
							data: {
								companyId: company.id,
								payPeriodId: payPeriod.id,
								settings: configuration.settings!,
								indirectExpenseRate: configuration.indirectExpenseRate,
								payrollMethod: configuration.payrollMethod,
								decimalToFixedPercentage: configuration.decimalToFixedPercentage,
								decimalToFixedAmount: configuration.decimalToFixedAmount
							}
						});

						for (const oldSection of configurationSection) {

							const newSection = await prisma.configurationSection.create({
								data: {
									companyId: company.id,
									payPeriodId: payPeriod.id,
									sectionName: oldSection.sectionName,
									no: oldSection.no,
								}
							});


							const oldFieldData = fields.filter((e) => e.configurationSectionId === oldSection.id && e.companyId === company.id);

							if (oldFieldData.length) {

								for (const oldField of oldFieldData) {

									const newField = await prisma.field.create({
										data: {
											companyId: company.id,
											payPeriodId: payPeriod.id,
											configurationSectionId: newSection.id,
											jsonId: oldField.jsonId,
											type: oldField.type,
											name: oldField.name,
											isActive: oldField.isActive
										}
									});

									const oldEmployeeCostFields = employeeCostFields.filter((e) => e.fieldId === oldField.id);

									for (const oldEmployeeCostField of oldEmployeeCostFields) {

										const newEmployeeCostField = await prisma.employeeCostField.create({
											data: {
												companyId: company.id,
												payPeriodId: payPeriod.id,
												fieldId: newField.id,
												employeeId: oldEmployeeCostField.employeeId
											}
										});

										await prisma.employeeCostValue.updateMany({
											where: {
												payPeriodId: payPeriod.id,
												employeeFieldId: oldEmployeeCostField.id
											},
											data: {
												employeeFieldId: newEmployeeCostField.id
											}
										});

									}

								}

							}

						}
					}


				}

				const latestPayPeriod = payPeriods[payPeriods.length - 1];

				if (latestPayPeriod) {

					if (configuration) {
						await prisma.configuration.update({
							where: {
								id: configuration?.id,
							},
							data: {
								payPeriodId: latestPayPeriod.id
							}
						});

						for (const section of configurationSection) {

							await prisma.configurationSection.update({
								where: {
									id: section.id
								},
								data: {
									payPeriodId: latestPayPeriod.id
								}
							});

						}

						for (const field of fields) {

							await prisma.field.update({
								where: {
									id: field.id
								},
								data: {
									payPeriodId: latestPayPeriod.id
								}
							});

						}

						for (const employeeCostField of employeeCostFields) {

							await prisma.employeeCostField.update({
								where: {
									id: employeeCostField.id
								},
								data: {
									payPeriodId: latestPayPeriod.id
								}
							});

						}

					}

				}

			}

		}
	}

}

async function migrateTaxAndFringeSection() {

	const companies = await prisma.company.findMany({});

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		});

		const employees = await prisma.employee.findMany({
			where: {
				companyId: company.id,
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					companyId: company.id,
					payPeriodId: payPeriod.id
				}
			});


			if (configuration && configuration.settings) {

				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				const configurationSections = await prisma.configurationSection.findMany({
					where: {
						companyId: company.id,
						no: {
							in: [2, 3]
						},
						payPeriodId: payPeriod.id
					}
				});

				if (configurationSections && configurationSections.length) {

					const configurationSection2 = configurationSections.find((e) => e.no === 2);
					const configurationSection3 = configurationSections.find((e) => e.no === 3);

					if (configurationSection2 && configurationSection3) {

						const configurationSection2Fields = await prisma.field.findMany({
							where: {
								companyId: company.id,
								configurationSectionId: configurationSection2.id,
								payPeriodId: payPeriod.id,
								jsonId: {
									not: 't1'
								}
							}
						})

						const section2FieldsCount = configurationSection2Fields.length;

						const configurationSection3fields = await prisma.field.findMany({
							where: {
								companyId: company.id,
								configurationSectionId: configurationSection3.id,
								payPeriodId: payPeriod.id,
								jsonId: {
									not: 't1'
								}
							},
							orderBy: {
								jsonId: 'asc'
							}
						});

						let section2FieldsCountIncrement = section2FieldsCount;

						for (const section3Field of configurationSection3fields) {
							section2FieldsCountIncrement = section2FieldsCountIncrement + 1
							await prisma.field.update({
								where: {
									id: section3Field.id
								},
								data: {
									jsonId: `f${section2FieldsCountIncrement}`,
									configurationSectionId: configurationSection2.id
								}
							});

							newConfigurationSettings['2'].fields[`f${section2FieldsCountIncrement}`] = settings['2'].fields[section3Field.jsonId]

						}

						newConfigurationSettings['2'].capMappingTitle = 'Payroll Taxes & Fringe Benefits';
						newConfigurationSettings['2'].placeHolder = 'Select Payroll Taxes & Fringe Expense';
						newConfigurationSettings['2'].errorMessage = 'Please Select Payroll Taxes & Fringe Expense';
						newConfigurationSettings['2'].toolTip = 'Payroll Taxes & Fringe Benefits: These are the Payroll expense accounts or Fringe Benefits, if the user add new account here, it will be added as new column in Cost allocation';

						await prisma.field.updateMany({
							where: {
								configurationSectionId: configurationSection3.id,
								companyId: company.id,
								payPeriodId: payPeriod.id,
								jsonId: 't1'
							},
							data: {
								isActive: false,
								name: 'Total Other Expenses'
							}
						});

						await prisma.field.updateMany({
							where: {
								configurationSectionId: configurationSection2.id,
								companyId: company.id,
								payPeriodId: payPeriod.id,
								jsonId: 't1'
							},
							data: {
								name: 'Total Payroll Taxes & Fringe Benefits'
							}
						});

						newConfigurationSettings['3'].fields = {};

						newConfigurationSettings['3'].capMappingTitle = 'Other Expenses';
						newConfigurationSettings['3'].placeHolder = 'Select Other Expenses';
						newConfigurationSettings['3'].errorMessage = 'Please Select Other Expenses';
						newConfigurationSettings['3'].toolTip = 'Other Expense Accounts:  These are the Other expense accounts, if the user add a new account here, it will be added as new columns in Cost allocation';

						for (const employee of employees) {

							const employeeTotalField = await prisma.employeeCostField.findFirst({
								where: {
									field: {
										configurationSectionId: configurationSection2.id,
										jsonId: 't1',
										payPeriodId: payPeriod.id
									},
									employeeId: employee.id,
									payPeriodId: payPeriod.id
								}
							});

							const allSection2Fields = await prisma.employeeCostField.findMany({
								where: {
									field: {
										configurationSectionId: configurationSection2.id,
										jsonId: {
											not: 't1'
										},
										isActive: true,
										payPeriodId: payPeriod.id
									},
									employeeId: employee.id,
									payPeriodId: payPeriod.id
								}
							});

							const employeeCostValue = await prisma.employeeCostValue.findMany({
								where: {
									employeeFieldId: {
										in: allSection2Fields.map((e) => { return e.id })
									},
									payPeriodId: payPeriod.id
								}
							});

							let total = 0;

							employeeCostValue.forEach((empValue) => {
								total = total + Number(empValue.value);
							});

							total = Number(total.toFixed(configuration.decimalToFixedAmount || 2));

							if (employeeTotalField) {
								await prisma.employeeCostValue.updateMany({
									where: {
										employeeFieldId: employeeTotalField?.id,
										employeeId: employee.id,
										payPeriodId: payPeriod.id
									},
									data: {
										value: String(total)
									}
								})
							}


						}

					}



				}

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})

			}

		}
	}

}

async function configSectionMigrationFix() {

	const companies = await prisma.company.findMany();

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId: payPeriod.id,
					companyId: company.id
				}
			});

			if (configuration) {

				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				const section2 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 2
					}
				});

				if (section2) {
					const section2Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section2.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
							jsonId: {
								not: 't1'
							}
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (const section2Field of section2Fields) {

						const jsonField = settings['2'].fields[section2Field.jsonId];

						if (jsonField && jsonField.id && jsonField.id != section2Field.jsonId) {

							jsonField.label = section2Field.name
							jsonField.value = ''

							if (jsonField.id === 'f1') {
								jsonField.deletable = false
							} else {
								jsonField.deletable = true
							}

							newConfigurationSettings['2'].fields[section2Field.jsonId] = {
								...jsonField,
								id: section2Field.jsonId
							}

						}

					}

				}

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})


			}

		}

	}

}

async function section2FieldsStatus() {

	const companies = await prisma.company.findMany();

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId: payPeriod.id,
					companyId: company.id
				}
			});

			if (configuration) {

				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				Object.keys(settings['2'].fields).forEach((fieldKey: string) => {
					if (fieldKey != 'f1') {
						newConfigurationSettings['2'].fields[fieldKey].deletable = true
					}
				})

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})


			}

		}

	}

}

async function migrateConfigurationForMissedPayPeriod() {

	const companyDetails = await prisma.company.findUnique({
		where: {
			id: 'c68ffd40-42b5-4626-8711-f63b5a1763a5'
		}
	});

	if (companyDetails) {
		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: companyDetails.id
			}
		});

		if (payPeriods && payPeriods.length) {
			for (const payPeriod of payPeriods) {
				await payPeriodServices.createNewConfigurationWithDefault(companyDetails.id, payPeriod.id);
			}
		}
	}

}

async function addSuperAdmins() {

	const role = await prisma.role.create({
		data: {
			id: `${process.env.SUPER_ADMIN_ROLE_ID}`,
			roleName: 'Super Admin',
			roleDescription: 'Super Admin Role',
			permissions: {
				createMany: {
					data: DefaultSuperAdminPermissions
				},
			},
			isSuperAdmin: true
		}
	});

	const user = await prisma.user.create({
		data: {
			id: `${process.env.SUPER_ADMIN_USER_ID}`,
			email: `${process.env.SUPER_ADMIN_EMAIL}`,
			firstName: 'Super',
			lastName: 'Admin',
			password: await hashPassword(`${process.env.SUPER_ADMIN_PASS}`),
			isVerified: true
		}
	});

	await prisma.companyRole.create({
		data: {
			userId: user.id,
			roleId: role.id,
		}
	});

}

async function section2PriorityFields() {

	const companies = await prisma.company.findMany();

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId: payPeriod.id,
					companyId: company.id
				}
			});

			if (configuration) {

				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				Object.keys(settings['2'].fields).forEach((fieldKey: string, index: number) => {
					newConfigurationSettings['2'].fields[fieldKey]['priority'] = index + 1
				});

				const section2 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 2
					}
				});

				if (section2) {
					const section2Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section2.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section2Fields.length; i++) {
						const singleField = section2Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})


			}

		}

	}

}

async function allSectionPriorityFields() {

	const companies = await prisma.company.findMany();

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId: payPeriod.id,
					companyId: company.id
				}
			});

			if (configuration) {


				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				Object.keys(settings['1'].fields).forEach((fieldKey: string, index: number) => {
					if (newConfigurationSettings['1'].fields[fieldKey]) {
						newConfigurationSettings['1'].fields[fieldKey]['priority'] = index + 1
					}
				});

				Object.keys(settings['2'].fields).forEach((fieldKey: string, index: number) => {
					if (newConfigurationSettings['2'].fields[fieldKey]) {
						newConfigurationSettings['2'].fields[fieldKey]['priority'] = index + 1
					}
				});

				if (settings['3'].fields && settings['3'].fields.length) {
					Object.keys(settings['3'].fields).forEach((fieldKey: string, index: number) => {
						if (newConfigurationSettings['3'].fields[fieldKey]) {
							newConfigurationSettings['3'].fields[fieldKey]['priority'] = index + 1
						}
					});
				}

				const section1 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 1
					}
				});

				const section2 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 2
					}
				});

				const section3 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 3
					}
				});

				if (section1) {
					const section1Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section1.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section1Fields.length; i++) {
						const singleField = section1Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				if (section2) {
					const section2Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section2.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section2Fields.length; i++) {
						const singleField = section2Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				if (section3) {
					const section3Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section3.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section3Fields.length; i++) {
						const singleField = section3Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})


			}

		}

	}

}

async function configurationToolTipChanges() {
	const configurations = await prisma.configuration.findMany();

	for (const configuration of configurations) {
		const settings: any = configuration.settings;

		const newConfigurationSettings = { ...settings };

		settings['5'].toolTip = 'This QuickBooks Customer is used on the credit lines of the allocation journal entry.'

		await prisma.configuration.update({
			where: {
				id: configuration.id
			},
			data: {
				settings: newConfigurationSettings
			}
		})

	}

}

async function createFieldsForAllEmployees() {
	const companies = await prisma.company.findMany();

	if (companies.length) {
		for (const company of companies) {

			const companyId = company.id;

			const listOfFields = await prisma.field.findMany({
				where: {
					companyId
				}
			});

			const listOfEmployees = await prisma.employee.findMany({
				where: {
					companyId
				}
			})

			for (const employee of listOfEmployees) {
				if (listOfFields && listOfFields.length) {

					for (const singleField of listOfFields) {
						const getFieldData = await prisma.employeeCostField.findFirst({
							where: {
								companyId,
								payPeriodId: singleField.payPeriodId,
								fieldId: singleField.id,
								employeeId: employee.id
							}
						});

						if (!getFieldData) {
							const employeeCostField = await prisma.employeeCostField.create({
								data: {
									companyId,
									payPeriodId: singleField.payPeriodId,
									fieldId: singleField.id,
									employeeId: employee.id
								}
							});


							await prisma.employeeCostValue.create({
								data: {
									employeeId: employee.id,
									employeeFieldId: employeeCostField.id,
									payPeriodId: singleField.payPeriodId,
									isPercentage: true,
									value: '0.00',
								},
							});
						}


					}


				}
			}

		}
	}
}

async function configurationToolLabelChanges() {
	const configurations = await prisma.configuration.findMany();

	for (const configuration of configurations) {
		const settings: any = configuration.settings;

		const newConfigurationSettings = { ...settings };

		settings['0'].toolTip = 'Expense Pools:  These are the allocation accounts & it is mapped with QuickBooks classes.'
		settings['0'].qbMappingValue = 'QuickBooks Class'
		settings['1'].placeHolder = 'Select QuickBooks Chart of Account'
		settings['5'].toolTip = 'This QuickBooks Customer is used on the credit lines of the allocation journal entry.'
		settings['5'].qbMappingValue = 'QuickBooks Customer'

		await prisma.configuration.update({
			where: {
				id: configuration.id
			},
			data: {
				settings: newConfigurationSettings
			}
		})

	}

}

async function configurationCreditAccountMigration() {
	const configurations = await prisma.configuration.findMany();

	for (const configuration of configurations) {
		const settings: any = configuration.settings;

		const newConfigurationSettings = JSON.parse(JSON.stringify(settings));

		Object.keys(newConfigurationSettings['1'].fields).forEach((key) => {
			newConfigurationSettings['1'].fields[key]['creditValue'] =
				newConfigurationSettings['1'].fields[key]['value'];
		});

		Object.keys(newConfigurationSettings['2'].fields).forEach((key) => {
			newConfigurationSettings['2'].fields[key]['creditValue'] =
				newConfigurationSettings['2'].fields[key]['value'];
		});

		Object.keys(newConfigurationSettings['3'].fields).forEach((key) => {
			newConfigurationSettings['3'].fields[key]['creditValue'] =
				newConfigurationSettings['3'].fields[key]['value'];
		});

		await prisma.configuration.update({
			where: {
				id: configuration.id,
			},
			data: {
				settings: newConfigurationSettings,
			},
		});
	}
}

async function allSectionPriorityFieldsNew() {

	const companies = await prisma.company.findMany();

	for (const company of companies) {

		const payPeriods = await prisma.payPeriod.findMany({
			where: {
				companyId: company.id
			}
		})

		for (const payPeriod of payPeriods) {

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId: payPeriod.id,
					companyId: company.id
				}
			});

			if (configuration) {


				const settings: any = configuration.settings;

				const newConfigurationSettings = { ...settings };

				Object.keys(settings['1'].fields).forEach((fieldKey: string, index: number) => {
					if (newConfigurationSettings['1'].fields[fieldKey]) {
						newConfigurationSettings['1'].fields[fieldKey]['priority'] = index + 1
					}
				});

				Object.keys(settings['2'].fields).forEach((fieldKey: string, index: number) => {
					if (newConfigurationSettings['2'].fields[fieldKey]) {
						newConfigurationSettings['2'].fields[fieldKey]['priority'] = index + 1
					}
				});

				if (settings['3'].fields && settings['3'].fields.length) {
					Object.keys(settings['3'].fields).forEach((fieldKey: string, index: number) => {
						if (newConfigurationSettings['3'].fields[fieldKey]) {
							newConfigurationSettings['3'].fields[fieldKey]['priority'] = index + 1
						}
					});
				}

				const section1 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 1
					}
				});

				const section2 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 2
					}
				});

				const section3 = await prisma.configurationSection.findFirst({
					where: {
						companyId: company.id,
						payPeriodId: payPeriod.id,
						no: 3
					}
				});

				if (section1) {
					const section1Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section1.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section1Fields.length; i++) {
						const singleField = section1Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				if (section2) {
					const section2Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section2.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section2Fields.length; i++) {
						const singleField = section2Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				if (section3) {
					const section3Fields = await prisma.field.findMany({
						where: {
							configurationSectionId: section3.id,
							companyId: company.id,
							payPeriodId: payPeriod.id,
						},
						orderBy: {
							jsonId: 'asc'
						}
					});

					for (let i = 0; i < section3Fields.length; i++) {
						const singleField = section3Fields[i];

						await prisma.field.update({
							where: {
								id: singleField.id
							},
							data: {
								priority: singleField.jsonId === 't1' ? 1000 : i + 1
							}
						})

					}

				}

				await prisma.configuration.update({
					where: {
						id: configuration.id
					},
					data: {
						settings: newConfigurationSettings
					}
				})


			}

		}

	}

}

export const migrationService: any = {
	configurationCreditAccountMigration,
	configurationToolLabelChanges,
	createFieldsForAllEmployees,
	configurationToolTipChanges,
	allSectionPriorityFields,
	section2PriorityFields,
	addSuperAdmins,
	migrateConfigurationForMissedPayPeriod,
	section2FieldsStatus,
	configSectionMigrationFix,
	migrateTaxAndFringeSection,
	migrateConfiguration,
	addSyncLogsPermissions,
	updateConfigurationJson,
	syncMissingField,
	updatePublishedJournalPayPeriods,
	addClosingDateToPayPeriod,
	configurationFirstSectionChanges,
	configurationSalarySectionChanges,
	configurationPayRollExpenseLabelChanges,
	configurationPayRollExpenseChanges,
	configurationFringeExpenseChanges,
	fieldChanges,
	configurationSettingChanges,
	sectionNoChanges,
	defaultIndirectExpenseRate,
	addPayRolePermissions,
	testFun, allSectionPriorityFieldsNew
};
