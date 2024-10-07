/* eslint-disable no-mixed-spaces-and-tabs */
import moment from 'moment';
import { prisma } from '../client/prisma';
import {
	EJournalStatus,
	IJournalCreateEntity,
	IJournalEntriesQuery,
	IJournalListQuery,
} from '../interfaces/journalInterface';
import { CustomError } from '../models/customError';
import quickbooksClient from '../quickbooksClient/quickbooksClient';
import { companyRepository, journalRepository } from '../repositories';
import costAllocationRepository from '../repositories/costAllocationRepository';
import { hasText, sortArray } from '../utils/utils';
import quickbooksServices from './quickbooksServices';
import { v4 as uuidv4 } from 'uuid';
import costallocationServices from './costallocationServices';
import { generatePdf } from '../templates/costAllocationPdf';
import * as fs from 'fs';
import { QBOModules, SyncLogsStatus } from '../enum';

class JournalService {
	async getJournalEntriesByPayPeriod(
		query: IJournalEntriesQuery,
		quickBooksDecimal?: boolean
	) {
		const qbAccounts = await this.getAccount(query.companyId);

		const qbClasses = await this.getAllClasses(query.companyId);

		const qbCustomers = await this.getAllCustomer(query.companyId);

		const timeSheetData = await prisma.timeSheets.findFirst({
			where: {
				payPeriodId: query?.payPeriodId,
				companyId: query?.companyId,
			},
		});

		if (!timeSheetData) {
			throw new CustomError(400, 'Can not Preview Journal');
		}

		const queryCostAllocation = {
			...query,
			timeSheetId: timeSheetData.id,
		};

		let defaultAmountToFixed = 2;

		const companyConfiguration = await prisma.configuration.findFirst({
			where: {
				companyId: query.companyId,
				payPeriodId: query.payPeriodId,
			},
		});

		if (companyConfiguration?.decimalToFixedAmount) {
			defaultAmountToFixed = companyConfiguration.decimalToFixedAmount;
		}

		if (quickBooksDecimal) {
			defaultAmountToFixed = 2;
		}

		const fieldSettings: any = companyConfiguration?.settings;

		const configurationSectionData = await prisma.configurationSection.findMany(
			{
				where: {
					companyId: query.companyId,
					no: {
						gt: 0,
					},
					payPeriodId: query.payPeriodId,
				},
				select: {
					id: true,
					no: true,
					fields: {
						where: {
							jsonId: {
								not: 't1',
							},
							isActive: true,
							payPeriodId: query.payPeriodId,
						},
						orderBy: {
							jsonId: 'asc',
						},
					},
				},
			}
		);

		const fieldMapping: any = {};

		configurationSectionData.forEach((section) => {
			section.fields.forEach((field) => {
				const configFieldValue =
					fieldSettings[section.no.toString()]?.fields[field.jsonId];

				if (configFieldValue) {
					const findAccount = qbAccounts.find(
						(account) => account.Id == configFieldValue.value
					);

					const findCreditAccount = qbAccounts.find(
						(account) => account.Id == configFieldValue.creditValue
					);

					if (findAccount) {
						fieldMapping[field.id] = {
							id: field.id,
							label: findAccount.Name,
							value: findAccount.Id,
						};
					}

					if (findCreditAccount) {
						fieldMapping[field.id] = {
							...fieldMapping[field.id],
							creditLabel: findCreditAccount.Name,
							creditValue: findCreditAccount.Id,
						};
					}
				}
			});
		});

		const customRules = await prisma.configurationCustomRules.findMany({
			where: {
				companyId: query.companyId,
				payPeriodId: query.payPeriodId,
				isActive: true,
			},
			orderBy: [
				{
					priority: 'asc',
				},
			],
		});

		//custom rule fields mapping same as general field mapping
		const customRuleMapping: any = {};

		const customRuleNameMapping: any = {};

		if (customRules.length) {
			customRules.forEach((e: any) => {
				if (e.actions) {
					customRuleNameMapping[e.id] = e.name;
					const _fieldMapping: any = {};
					configurationSectionData.forEach((section) => {
						section.fields.forEach((field) => {
							const configFieldValue =
								e.actions[section.no.toString()]?.fields[field.jsonId];

							if (configFieldValue) {
								const findAccount = qbAccounts.find(
									(account) => account.Id == configFieldValue.value
								);

								const findCreditAccount = qbAccounts.find(
									(account) => account.Id == configFieldValue.creditValue
								);

								if (findAccount) {
									_fieldMapping[field.id] = {
										id: field.id,
										label: findAccount.Name,
										value: findAccount.Id,
									};
								}

								if (findCreditAccount) {
									_fieldMapping[field.id] = {
										..._fieldMapping[field.id],
										creditLabel: findCreditAccount.Name,
										creditValue: findCreditAccount.Id,
									};
								}
							}
						});
					});
					customRuleMapping[e.id] = _fieldMapping;
				}
			});
		}

		const indirectAllocationFieldValue = fieldSettings['4']?.fields['f1'];

		const findIndirectAllocationAccount = qbAccounts.find(
			(account) => account.Id == indirectAllocationFieldValue.value
		);

		if (findIndirectAllocationAccount) {
			fieldMapping['indirect-allocation'] = {
				id: 'indirect-allocation',
				label: findIndirectAllocationAccount.Name,
				value: findIndirectAllocationAccount.Id,
			};
		}

		const salaryExpenseCreditValue = fieldSettings['0']?.fields['f1'];

		const salaryExpenseCreditClass = qbClasses.find(
			(qbClass: any) => qbClass.Id == salaryExpenseCreditValue?.value
		);

		const indirectAllocationCreditValue = fieldSettings['0']?.fields['f2'];

		const indirectAllocationCreditValueClass = qbClasses.find(
			(qbClass: any) => qbClass.Id == indirectAllocationCreditValue.value
		);

		const creditCustomerValue = fieldSettings['5']?.fields['f1'];

		const creditCustomerName = qbCustomers.find(
			(qbCustomer: any) => qbCustomer.Id === creditCustomerValue.value
		);

		const fieldIds = Object.keys(fieldMapping);

		const costAllocationData =
			await costAllocationRepository.getCostAllocationForJournal(
				queryCostAllocation
			);

		const journalEntries: any[] = [];

		let finalDebitTotal = 0;
		let finalCreditTotal = 0;

		costAllocationData.forEach((singleAllocation: any) => {
			if (customRules.length) {
				singleAllocation.costAllocation.forEach((allocation: any) => {
					const ruleData = this.matchCustomRule(allocation, customRules);
					if (ruleData) {
						allocation['customRuleId'] = ruleData.id;
					}
				});
			}

			fieldIds.forEach((field: any) => {
				const costAllocation = singleAllocation.costAllocation;

				let total = 0;
				let totalNegative = 0;

				costAllocation.forEach((employee: any) => {
					if (fieldMapping[field] && Number(employee[field])) {
						let isNegative = false;

						if (employee[field] < 0) {
							isNegative = true;
						}

						const type = isNegative ? 'Credit' : 'Debit';

						const isRuleMatched = employee.customRuleId ? true : false;

						const customRuleId = employee.customRuleId;

						const singleJournalEntry = {
							key: uuidv4(),
							employeeName: employee['employee-name'],
							account:
								isRuleMatched && field !== 'indirect-allocation'
									? customRuleMapping[customRuleId][field].label
									: fieldMapping[field].label,
							accountId:
								isRuleMatched && field !== 'indirect-allocation'
									? customRuleMapping[customRuleId][field].value
									: fieldMapping[field].value,
							class: employee['class-name'],
							classId: employee['classId'],
							customer: employee['customer-name'],
							customerId: employee['customerId'],
							debit: !isNegative
								? employee[field].toFixed(defaultAmountToFixed)
								: '',
							credit: isNegative
								? Math.abs(employee[field].toFixed(defaultAmountToFixed))
								: '',
							type,
							ruleName: isRuleMatched && field !== 'indirect-allocation'
								? customRuleNameMapping[customRuleId]
								: null,
						};

						//if different credit account is define and type is credit change account value
						if (
							type === 'Credit' &&
							field !== 'indirect-allocation' &&
							fieldMapping[field].creditValue
						) {
							singleJournalEntry.account = isRuleMatched
								? customRuleMapping[customRuleId][field].creditLabel
								: fieldMapping[field].creditLabel;
							singleJournalEntry.accountId = isRuleMatched
								? customRuleMapping[customRuleId][field].creditValue
								: fieldMapping[field].creditValue;
						}

						//if rule matched do not add value to total
						if (isNegative && !isRuleMatched) {
							totalNegative = Number(
								(
									Number(totalNegative.toFixed(defaultAmountToFixed)) +
									Math.abs(
										Number(employee[field].toFixed(defaultAmountToFixed))
									)
								).toFixed(defaultAmountToFixed)
							);
						}

						//if rule matched add value directly to final credit, debit
						if (isNegative && isRuleMatched) {
							finalCreditTotal = Number(
								(
									Number(finalCreditTotal.toFixed(defaultAmountToFixed)) +
									Math.abs(
										Number(employee[field].toFixed(defaultAmountToFixed))
									)
								).toFixed(defaultAmountToFixed)
							);
							finalDebitTotal = Number(
								(
									Number(finalDebitTotal.toFixed(defaultAmountToFixed)) +
									Math.abs(
										Number(employee[field].toFixed(defaultAmountToFixed))
									)
								).toFixed(defaultAmountToFixed)
							);
						}

						if (!isNegative) {
							//if rule matched do not add value to total
							if (!isRuleMatched) {
								total = Number(
									(
										Number(total.toFixed(defaultAmountToFixed)) +
										Number(employee[field].toFixed(defaultAmountToFixed))
									).toFixed(defaultAmountToFixed)
								);
							}

							//if rule matched add value directly to final credit
							if (isRuleMatched) {
								finalCreditTotal = Number(
									(
										Number(finalCreditTotal.toFixed(defaultAmountToFixed)) +
										Number(employee[field].toFixed(defaultAmountToFixed))
									).toFixed(defaultAmountToFixed)
								);
							}

							finalDebitTotal = Number(
								(
									Number(finalDebitTotal.toFixed(defaultAmountToFixed)) +
									Number(employee[field].toFixed(defaultAmountToFixed))
								).toFixed(defaultAmountToFixed)
							);
						}

						journalEntries.push(singleJournalEntry);

						//if rule matched add separate debit entry if type is credit
						if (
							type === 'Credit' &&
							field !== 'indirect-allocation' &&
							isRuleMatched
						) {
							journalEntries.push({
								key: uuidv4(),
								employeeName: employee['employee-name'],
								account: customRuleMapping[customRuleId][field].label,
								accountId: customRuleMapping[customRuleId][field].value,
								class: employee['class-name'],
								classId: employee['classId'],
								customer: employee['customer-name'],
								customerId: employee['customerId'],
								debit: Math.abs(employee[field].toFixed(defaultAmountToFixed)),
								credit: '',
								type: 'Debit',
								ruleName: isRuleMatched
									? customRuleNameMapping[customRuleId]
									: null,
							});
						}

						if (
							type === 'Credit' &&
							field === 'indirect-allocation' &&
							isRuleMatched
						) {
							journalEntries.push({
								key: uuidv4(),
								employeeName: employee['employee-name'],
								account: fieldMapping[field].label,
								accountId: fieldMapping[field].value,
								class: employee['class-name'],
								classId: employee['classId'],
								customer: employee['customer-name'],
								customerId: employee['customerId'],
								debit: Math.abs(employee[field].toFixed(defaultAmountToFixed)),
								credit: '',
								type: 'Debit',
								// ruleName: isRuleMatched
								// 	? customRuleNameMapping[customRuleId]
								// 	: null,
							});
						}

						

						//if rule matched add separate credit entry if type is debit
						if (
							type === 'Debit' &&
							field !== 'indirect-allocation' &&
							isRuleMatched
						) {
							journalEntries.push({
								key: uuidv4(),
								employeeName: '',
								account: customRuleMapping[customRuleId][field].creditLabel,
								accountId: customRuleMapping[customRuleId][field].creditValue,
								class: salaryExpenseCreditClass?.FullyQualifiedName || null,
								classId: salaryExpenseCreditClass?.Id || null,
								customer: creditCustomerName?.DisplayName,
								customerId: creditCustomerName?.Id,
								debit: '',
								credit: Math.abs(employee[field].toFixed(defaultAmountToFixed)),
								type: 'Credit',
								ruleName: isRuleMatched
									? customRuleNameMapping[customRuleId]
									: null,
							});
						}


						if (
							type === 'Debit' &&
							field === 'indirect-allocation' &&
							isRuleMatched
						) {
							journalEntries.push({
								key: uuidv4(),
								employeeName: '',
								account: fieldMapping[field].label,
								accountId: fieldMapping[field].value,
								class: indirectAllocationCreditValueClass.FullyQualifiedName || null,
								classId: indirectAllocationCreditValueClass.Id || null,
								customer: creditCustomerName?.DisplayName,
								customerId: creditCustomerName?.Id,
								debit: '',
								credit: Math.abs(employee[field].toFixed(defaultAmountToFixed)),
								type: 'Credit',
								// ruleName: isRuleMatched
								// 	? customRuleNameMapping[customRuleId]
								// 	: null,
							});
						}
					}
				});

				if (Number(totalNegative) || Number(total)) {
					const type = totalNegative ? 'Debit' : 'Credit';

					const singleJournalEntry = {
						key: uuidv4(),
						employeeName: '',
						class:
							field === 'indirect-allocation'
								? indirectAllocationCreditValueClass.FullyQualifiedName
								: salaryExpenseCreditClass?.FullyQualifiedName || null,
						classId:
							field === 'indirect-allocation'
								? indirectAllocationCreditValueClass.Id
								: salaryExpenseCreditClass?.Id || null,
						customer: creditCustomerName?.DisplayName,
						customerId: creditCustomerName?.Id,
						debit: totalNegative
							? totalNegative.toFixed(defaultAmountToFixed)
							: '',
						credit: total ? total.toFixed(defaultAmountToFixed) : '',
						account: fieldMapping[field].label,
						accountId: fieldMapping[field].value,
						type,
					};

					if (
						type === 'Credit' &&
						field !== 'indirect-allocation' &&
						fieldMapping[field].creditValue
					) {
						singleJournalEntry.account = fieldMapping[field].creditLabel;
						singleJournalEntry.accountId = fieldMapping[field].creditValue;
					}

					finalCreditTotal = Number(
						(
							Number(finalCreditTotal.toFixed(defaultAmountToFixed)) +
							Number(total.toFixed(defaultAmountToFixed))
						).toFixed(defaultAmountToFixed)
					);

					if (totalNegative) {
						finalCreditTotal = Number(
							(
								Number(finalCreditTotal.toFixed(defaultAmountToFixed)) +
								Number(totalNegative.toFixed(defaultAmountToFixed))
							).toFixed(defaultAmountToFixed)
						);
						finalDebitTotal = Number(
							(
								Number(finalDebitTotal.toFixed(defaultAmountToFixed)) +
								Number(totalNegative.toFixed(defaultAmountToFixed))
							).toFixed(defaultAmountToFixed)
						);
					}

					journalEntries.push(singleJournalEntry);
				}
			});
		});

		journalEntries.forEach((e: any, index: number) => {
			e['id'] = index + 1;
		});

		journalEntries.push({
			id: '',
			key: uuidv4(),
			employeeName: '',
			account: 'Total',
			class: '',
			customer: '',
			debit: finalDebitTotal.toFixed(defaultAmountToFixed),
			credit: finalCreditTotal.toFixed(defaultAmountToFixed),
			accountId: '',
		});

		return journalEntries;
	}

	async getAccount(companyId: string) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		let qbAccounts: any[] = [];

		if (authResponse?.status == true) {
			// Get All Accounts From Quickbooks
			const accounts: any = await quickbooksClient.getAllAccounts(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			// Accounts with account number
			const finalAccounts = accounts?.QueryResponse?.Account?.map(
				(account: any) => {
					if (account?.AcctNum) {
						return {
							...account,
							Name: `${account?.AcctNum} - ${account?.Name}`,
						};
					} else {
						return account;
					}
				}
			);
			qbAccounts = sortArray(finalAccounts, 'asc', 'Name');
		}

		return qbAccounts;
	}

	matchCustomRule(timeActivity: any, customRules: any[]) {
		let matchedRule: any = null;

		for (const rule of customRules) {
			if (rule.isActive) {
				if (
					rule.criteria.operator1 === 'AND' &&
					rule.criteria.operator2 === 'AND'
				) {
					if (
						this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(rule.criteria.classId, timeActivity.classId)
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'OR' &&
					rule.criteria.operator2 === 'OR'
				) {
					if (
						(this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) ||
							this.matchCriteria(
								rule.criteria.customerId,
								timeActivity.customerId
							)) &&
						(this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) ||
							this.matchCriteria(rule.criteria.classId, timeActivity.classId))
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'AND' &&
					rule.criteria.operator2 === 'OR'
				) {
					if (
						this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						(this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) ||
							this.matchCriteria(rule.criteria.classId, timeActivity.classId))
					) {
						matchedRule = rule;
						break;
					}
				}

				if (
					rule.criteria.operator1 === 'OR' &&
					rule.criteria.operator2 === 'AND'
				) {
					if (
						(this.matchCriteria(
							rule.criteria.employeeId,
							timeActivity.employeeId
						) ||
							this.matchCriteria(
								rule.criteria.customerId,
								timeActivity.customerId
							)) &&
						this.matchCriteria(
							rule.criteria.customerId,
							timeActivity.customerId
						) &&
						this.matchCriteria(rule.criteria.classId, timeActivity.classId)
					) {
						matchedRule = rule;
						break;
					}
				}
			}
		}

		return matchedRule;
	}

	matchCriteria(criteria: any, value: any) {
		if (criteria === 'ANY') {
			// return hasText(value);
			return true
		}

		if (!hasText(criteria)) {
			return !hasText(value);
		}

		return criteria === value;
	}

	async getAllClasses(companyId: string) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		let qbClasses = [];

		if (authResponse?.status == true) {
			// Get All Classes From Quickbooks
			const classes: any = await quickbooksClient.getAllClasses(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			const finalClasses = classes?.QueryResponse?.Class;

			qbClasses = finalClasses;
		}

		return qbClasses;
	}

	async getAllCustomer(companyId: string) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		let qbCustomers = [];

		if (authResponse?.status == true) {
			// Get All Customers from Quickbooks
			const customers: any = await quickbooksClient.getAllCustomers(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string
			);

			qbCustomers = customers?.QueryResponse?.Customer;
		}

		return qbCustomers;
	}

	async getAllJournals(timeSheetData: IJournalListQuery) {
		const {
			companyId,
			payPeriodId,
			page,
			limit,
			search,
			status,
			type,
			sort,
			year,
		} = timeSheetData;

		if (!companyId) {
			throw new CustomError(400, 'Company id is required');
		}

		const companyDetails = await companyRepository.getDetails(
			companyId as string
		);
		if (!companyDetails) {
			throw new CustomError(400, 'Company not found');
		}

		// Offset set
		const offset = (Number(page) - 1) * Number(limit);

		// Filter Conditions

		let filterConditions = {};

		if (status) {
			filterConditions = {
				status: Number(status),
			};
		}

		let payPeriodFilter = {};

		if (hasText(payPeriodId)) {
			payPeriodFilter = {
				payPeriodId: payPeriodId,
			};
		}

		// Conditions for searching
		const searchCondition = search
			? {
				OR: [
					{
						notes: { contains: search as string, mode: 'insensitive' },
					},
				],
			}
			: {};

		const orderByArray: any = [];

		if (sort === 'createdByName') {
			orderByArray.push({
				createdBy: {
					firstName: type ? type : 'desc',
				},
			});
		}

		if (sort === 'status') {
			orderByArray.push({
				status: type ? type : 'desc',
			});
		}

		if (sort == 'date') {
			orderByArray.push({
				date: type ? type : 'desc',
			});
		}

		if (sort == 'amount') {
			orderByArray.push({
				amount: type ? type : 'desc',
			});
		}

		if (sort == 'qboJournalNo') {
			orderByArray.push({
				qboJournalNo: type ? type : 'desc',
			});
		}
		if (sort == 'qboJournalTrnId') {
			orderByArray.push({
				qboJournalTrnId: type ? type : 'desc',
			});
		}

		orderByArray.push({
			id: 'desc',
		});

		const sortCondition = {
			orderBy: orderByArray,
		};

		const data = {
			companyId,
			offset: offset,
			limit: limit,
			filterConditions: filterConditions,
			searchCondition: searchCondition,
			sortCondition: sortCondition,
			payPeriodFilter: payPeriodFilter,
			year: year,
		};

		const { journals, count } = await journalRepository.getAllJournals(data);

		return { journals, count };
	}

	async getJournalByPayPeriodId(payPeriodId: string, companyId: string) {
		return await prisma.journal.findFirst({
			where: {
				companyId,
				payPeriodId,
			},
		});
	}

	async createJournal(data: IJournalCreateEntity) {
		const validatePayPeriod = await prisma.payPeriod.findFirst({
			where: {
				id: data.payPeriodId,
				companyId: data.companyId,
			},
		});

		if (!validatePayPeriod) {
			throw new CustomError(400, 'Invalid pay period');
		}

		let amount = '0';

		const findExistingJournal = await prisma.journal.findFirst({
			where: {
				companyId: data.companyId,
				payPeriodId: data.payPeriodId,
			},
		});

		const findExistingQuery: any = {
			companyId: data.companyId,
			qboJournalNo: data.qboJournalNo,
		};

		if (findExistingJournal) {
			findExistingQuery.id = {
				not: findExistingJournal.id,
			};
		}

		// const qboNoExists = await prisma.journal.findFirst({
		// 	where: findExistingQuery,
		// });

		// if (qboNoExists) {
		// 	throw new CustomError(
		// 		400,
		// 		'Journal with same journal number already exists'
		// 	);
		// }

		let journalData;

		const _data = { ...data };

		delete _data.dateString;

		if (findExistingJournal) {
			journalData = await prisma.journal.update({
				where: {
					payPeriodId: findExistingJournal.payPeriodId,
				},
				data: _data,
			});
		} else {
			journalData = await prisma.journal.create({
				data: {
					..._data,
					amount,
				},
			});
		}

		const journalEntries = await this.getJournalEntriesByPayPeriod(
			{
				companyId: data.companyId,
				payPeriodId: journalData.payPeriodId,
			},
			true
		);

		if (journalEntries && journalEntries.length) {
			if (journalEntries[journalEntries.length - 1]) {
				if (journalEntries[journalEntries.length - 1].debit) {
					amount = journalEntries[journalEntries.length - 1].debit;
				}
			}
		}

		await prisma.journal.update({
			where: {
				id: journalData.id,
			},
			data: {
				amount,
			},
		});

		if (journalData.status === EJournalStatus.PUBLISHED) {
			try {
				const start = Date.now();
				const response = await this.publishJournalToQBO(
					{
						...journalData,
						dateString: data.dateString,
					},
					journalEntries
				);
				const duration = Date.now() - start;

				if (response) {
					await prisma.journal.update({
						where: {
							id: journalData.id,
						},
						data: {
							qboJournalTrnId: response,
						},
					});

					await prisma.timeSheets.update({
						where: {
							payPeriodId: journalData.payPeriodId,
						},
						data: {
							status: 'Published',
						},
					});

					await prisma.payPeriod.update({
						where: {
							id: journalData.payPeriodId,
						},
						data: {
							isJournalPublished: true,
						},
					});

					await prisma.syncLogs.create({
						data: {
							moduleName: QBOModules.JOURNAL,
							status: SyncLogsStatus.SUCCESS,
							message: `Journal with Journal No: ${journalData.qboJournalNo
								} and Amount: $${journalData.amount
								} has been posted successfully in 
                            ${Number(duration) / 1000} seconds.`,
							companyId: journalData.companyId as string,
						},
					});
				}
			} catch (error: any) {
				await prisma.journal.update({
					where: {
						id: journalData.id,
					},
					data: {
						status: EJournalStatus.DRAFT,
					},
				});

				await prisma.timeSheets.update({
					where: {
						payPeriodId: journalData.payPeriodId,
					},
					data: {
						status: 'Draft',
					},
				});

				await prisma.payPeriod.update({
					where: {
						id: journalData.payPeriodId,
					},
					data: {
						isJournalPublished: false,
					},
				});

				let customErrorMessage = 'Error while posting journal in QuickBooks';

				if (
					error &&
					error?.Fault &&
					error.Fault?.Error &&
					error.Fault.Error.length
				) {
					customErrorMessage = `${error?.Fault?.Error[0]?.Message}: ${error?.Fault?.Error[0]?.Detail}`;
				}

				await prisma.syncLogs.create({
					data: {
						moduleName: QBOModules.JOURNAL,
						status: SyncLogsStatus.FAILURE,
						message: customErrorMessage,
						companyId: journalData.companyId as string,
					},
				});

				throw new CustomError(400, customErrorMessage);
			}
		}

		return journalData;
	}

	async publishJournalToQBO(journalData: any, journalEntries: any) {
		if (!journalEntries || !journalEntries.length) {
			throw new CustomError(400, 'Cannot post empty journal entries');
		}

		const journalDataQBO: any = {
			Line: this.createQBOJournalLineItems(journalEntries),
			PrivateNote: journalData?.notes || '',
			TxnDate: journalData?.dateString,
			// DocNumber: journalData.qboJournalNo,
		};

		const systemJournalId = journalData.id

		if (journalData?.qboJournalTrnId) {
			journalDataQBO['Id'] = journalData?.qboJournalTrnId;
			const oldJournalData = await this.getJournalFromQBO(
				journalData?.companyId,
				journalData?.qboJournalTrnId
			);
			if (oldJournalData) {
				journalDataQBO['SyncToken'] = oldJournalData?.SyncToken;
			}
			else {
				delete journalDataQBO['Id']
			}

		}

		const requestToSaveJournal = await this.saveJournalToQBO(
			journalData.companyId,
			journalDataQBO,
			systemJournalId
		);

		if (requestToSaveJournal && requestToSaveJournal?.Id) {
			const { finalDataArr, counts, filePath, companyName } =
				await costallocationServices.exportCostAllocationPDF({
					companyId: journalData.companyId,
					payPeriodId: journalData.payPeriodId,
				});

			const stream = await generatePdf(
				finalDataArr,
				counts,
				filePath,
				journalData?.payPeriodId as string,
				companyName as string
			);

			const fileName = moment(new Date()).format('MMDDYYYYhhmmss');

			stream.on('close', async () => {
				await this.updateAttachmentForJournal(
					journalData?.companyId,
					requestToSaveJournal?.Id,
					`CostAllocation_${fileName}.pdf`,
					fs.createReadStream(filePath)
				);

				fs.unlinkSync(filePath);
			});
		}

		return requestToSaveJournal?.Id;
	}

	async saveJournalToQBO(companyId: string, journalData: any, systemJournalId: string) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		let response: any = {};
		
		if (authResponse?.status == true) {
			// Get All Accounts From Quickbooks
			if (journalData?.Id) {
				response = await quickbooksClient.updateJournalEntry(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string,
					journalData
				);
			} else {
				delete journalData['DocNumber']
				response = await quickbooksClient.createJournalEntry(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string,
					journalData
				);
			}
			if (Number(response?.DocNumber)) {
				await prisma.journal.update({
					where: {
						id: systemJournalId
					},
					data: {
						qboJournalNo: Number(response?.DocNumber)
					}
				})
			} else {
				await prisma.journal.update({
					where: {
						id: systemJournalId
					},
					data: {
						qboJournalNo: 0
					}
				})
			}
		}

		return response;
	}

	async updateAttachmentForJournal(
		companyId: string,
		entityId: string,
		fileName: string,
		content: any
	) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		if (authResponse?.status == true) {
			await quickbooksClient.uploadFile(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string,
				fileName,
				'application/pdf',
				content,
				'JournalEntry',
				entityId
			);
		}
	}

	createQBOJournalLineItems(journalEntries: any[]) {
		const QBOJournalLineItems: any[] = [];

		journalEntries.forEach((entry: any, index: number) => {
			if (journalEntries.length - 1 != index) {
				QBOJournalLineItems.push({
					JournalEntryLineDetail: {
						PostingType: entry.type,
						AccountRef: {
							name: entry.account,
							value: entry.accountId,
						},
						Entity: {
							EntityRef: {
								name: entry?.customer,
								value: entry?.customerId,
							},
							Type: 'Customer',
						},
						ClassRef: {
							name: entry?.class,
							value: entry?.classId,
						},
					},
					DetailType: 'JournalEntryLineDetail',
					Amount: Number(entry.type === 'Debit' ? entry.debit : entry.credit),
					Id: index,
					Description: entry.employeeName,
					LineNum: index + 1,
				});
			}
		});

		return QBOJournalLineItems;
	}

	async getJournalFromQBO(companyId: string, journalId: string) {
		const authResponse = await quickbooksServices.getAccessToken(companyId);

		let response: any = {};

		if (authResponse?.status == true) {
			// Get All Accounts From Quickbooks

			try {
				response = await quickbooksClient.getJournal(
					authResponse?.accessToken as string,
					authResponse?.tenantID as string,
					authResponse?.refreshToken as string,
					journalId
				);
			}
			catch (err: any) {
				if (err?.Fault?.Error[0].code === '610') {
					return null
				}
				throw new CustomError(400,"Error while fetching journal")

			}
		}

		return response;
	}

	async getLatestJournalNo(companyId: string) {
		const allJournals = await prisma.journal.findMany({
			where: {
				companyId,
			},
			orderBy: {
				qboJournalNo: 'desc',
			},
		});

		let latestNo = 1;

		if (allJournals && allJournals.length) {
			latestNo = allJournals[0].qboJournalNo + 1;
		}

		return { latestNo };
	}
}

export default new JournalService();
