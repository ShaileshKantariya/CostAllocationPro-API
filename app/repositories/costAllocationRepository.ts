import { prisma } from '../client/prisma';
import { v4 as uuidv4 } from 'uuid';
import { CustomError } from '../models/customError';

class costAllocationRepository {
	// Get all time sheets
	hoursToMin(hrs: number, min: number) {
		const hours = hrs;
		const minutes = min;
		return Number(hours * 60 + minutes);
	}
	allocationPercentage(currMin: number, totalMin: number) {
		const percentage = (Number(currMin) / Number(totalMin)) * 100;
		return percentage;
	}

	totalHoursIntoMin(arr: any) {
		let totalMinutes = 0;
		arr.forEach(async (entry: any) => {
			const hours = parseInt(entry.hours);
			const minutes = parseInt(entry.minute);
			const min = this.hoursToMin(hours, minutes);
			totalMinutes += Number(min);
		});
		return totalMinutes;
	}

	minToHours(totalMinutes: number) {
		const totalHours = Math.floor(totalMinutes / 60);
		const remainingMinutes = totalMinutes % 60;

		return `${totalHours.toString().padStart(2, '0')}:${remainingMinutes
			.toString()
			.padStart(2, '0')}`;
	}

	async getCostAllocation(costAllocationData: any) {
		const {
			companyId,
			offset,
			limit,
			searchCondition,
			empFilterConditions,
			filterConditions,
			sortCondition,
			payPeriodId,
			timeSheetId,
		} = costAllocationData;

		const directAllocationEmployees =
			await prisma.employeeDirectAllocationConfig.findMany({
				where: {
					companyId,
					payPeriodId,
					isActive: true,
				},
			});

		const query = {
			where: {
				companyId: companyId,
				active: true,
				...empFilterConditions,
				OR: [
					{
						timeActivities: {
							some: {
								timeSheetId: timeSheetId,
								...filterConditions,
								...searchCondition,
								employeeId: {
									notIn: directAllocationEmployees.map((e) => {
										return e.employeeId;
									}),
								},
							},
						},
					},
					{
						EmployeeDirectAllocationConfig: {
							some: {
								payPeriodId,
								...filterConditions,
								...searchCondition,
								isActive: true,
							},
						},
					},
				],
			},
			select: {
				fullName: true,
				id: true,
				timeActivities: {
					where: {
						timeSheetId: timeSheetId,
						...filterConditions,
						...searchCondition,
						employeeId: {
							notIn: directAllocationEmployees.map((e) => {
								return e.employeeId;
							}),
						},
					},
					include: {
						SplitTimeActivities: true,
					},
				},
				EmployeeDirectAllocationConfig: {
					where: {
						isActive: true,
						payPeriodId,
						...filterConditions,
						...searchCondition,
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},
			skip: offset,
			take: limit,
			...sortCondition,
		};

		// if (!offset) {
		delete query['skip'];
		// }

		// if (!limit) {
		delete query['take'];
		// }

		const _costAllocations = await prisma.employee.findMany(query);

		//NOTE: If filter and other things not work remove this split activity additional logic

		const splitSearchCondition =
			searchCondition && searchCondition.OR
				? {
						OR: [searchCondition.OR[2]],
						// eslint-disable-next-line no-mixed-spaces-and-tabs
				  }
				: {};

		const splitQuery = {
			where: {
				id: {
					notIn: directAllocationEmployees.map((e) => {
						return e.employeeId;
					}),
				},
				active: true,
				companyId: companyId,
				...empFilterConditions,
				timeActivities: {
					some: {
						timeSheetId: timeSheetId,
						...splitSearchCondition,
						SplitTimeActivities: {
							some: {
								...filterConditions,
							},
						},
					},
				},
			},
			select: {
				fullName: true,
				id: true,
				timeActivities: {
					where: {
						timeSheetId: timeSheetId,
						...splitSearchCondition,
						SplitTimeActivities: {
							some: {
								...filterConditions,
							},
						},
					},
					include: {
						SplitTimeActivities: {
							where: {
								...filterConditions,
							},
						},
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},
			// skip: offset,
			// take: limit,
			...sortCondition,
		};

		// if (!offset) {
		// 	delete splitQuery['skip'];
		// }

		// if (!limit) {
		// 	delete splitQuery['take'];
		// }

		// 	if (_costAllocations.length && _costAllocations.length < limit) {
		// 		if (offset) {
		// 			query['take'] = offset;
		// 			const previousData = await prisma.employee.findMany(query);
		// 			if (previousData && previousData.length) {
		// 				splitQuery.where['id'] = {
		// 					notIn: previousData.map((e) => {
		// 						return e.id
		// 					})
		// 				}
		// 			}
		// 		}
		// 	}
		// }

		// if (_costAllocations) {
		// 	if (_costAllocations.length && _costAllocations.length === limit) {
		// 		splitQuery.where['id'] = {
		// 			in: _costAllocations.map((e) => {
		// 				return e.id
		// 			})
		// 		}
		// 	}

		const splitActivities: any = await prisma.employee.findMany(splitQuery);

		const notFoundEmployeeData: any[] = [];

		splitActivities.forEach((e: any) => {
			const costAllocation = _costAllocations.find((x: any) => x.id === e.id);

			if (!costAllocation) {
				notFoundEmployeeData.push(e);
			}
		});

		const costAllocations = [..._costAllocations, ...notFoundEmployeeData];

		let response: any[] = [];

		const companySection = await prisma.configurationSection.findMany({
			where: {
				companyId,
				no: {
					gt: 0,
				},
				payPeriodId,
			},
		});

		const sectionIds = companySection.map((e) => {
			return e.id;
		});

		const companyFields = await prisma.field.findMany({
			where: {
				companyId,
				jsonId: 't1',
				configurationSectionId: {
					in: sectionIds,
				},
				payPeriodId,
			},
		});

		const totalFields = companyFields.map((e) => {
			return e.id;
		});

		const employeeRowSpanMapping: any = {
			Total: 1,
			'Grand Total': 1,
		};

		const salarySection = companySection.find((e) => e.no === 1);

		const salarySectionFields = companyFields
			.filter((e) => e.configurationSectionId === salarySection?.id)
			.map((e) => {
				return e.id;
			});

		const companyConfiguration = await prisma.configuration.findFirst({
			where: {
				companyId,
				payPeriodId,
			},
		});

		let percentageToFixed = 4;

		if (companyConfiguration && companyConfiguration.decimalToFixedPercentage) {
			percentageToFixed = companyConfiguration.decimalToFixedPercentage;
		}

		let grandTotal = 0;

		const foundAllocationEmployeeIds = costAllocations.map((e) => {
			return e.id;
		});

		for (const singleCostAllocation of costAllocations) {
			const costAllocation: any = singleCostAllocation;
			const allTimeActivities = await prisma.timeActivities.findMany({
				where: {
					timeSheetId,
					employeeId: costAllocation.id,
				},
			});
			const totalTimeMin: any = this.totalHoursIntoMin(allTimeActivities);

			const employeeCostMappingData: any[] = [];
			const employeeCostFieldValueMapping: any = {};

			if (costAllocation.employeeCostField.length) {
				costAllocation.employeeCostField.forEach((singleEmployeeData: any) => {
					const obj: any = {};
					if (singleEmployeeData) {
						if (
							singleEmployeeData &&
							singleEmployeeData.field &&
							sectionIds.includes(
								singleEmployeeData.field.configurationSectionId
							)
						) {
							obj[singleEmployeeData.field.id] =
								singleEmployeeData.costValue[0].value;
							employeeCostMappingData.push(obj);
							employeeCostFieldValueMapping[singleEmployeeData.field.id] =
								singleEmployeeData.costValue[0].value;
						}
					}
				});
			}
			const timeActivity: any[] = [];
			// const totalTime = this.minToHours(totalTimeMin);
			const allTotalColumnsObj: any = {};
			let totalAllocationPercentage = 0;
			let totalAllocationPercentageWithToFixed = 0;
			let availableTotalMinutes = 0;

			//Array with time activities with same customer and class
			const sameCustomerWithSameClass: any[] = [];

			costAllocation?.timeActivities?.forEach((timeActivities: any) => {
				if (!timeActivities.SplitTimeActivities.length) {
					const findSameTimeLog = sameCustomerWithSameClass.find(
						(e) =>
							e.customerId === timeActivities.customerId &&
							e.classId === timeActivities.classId
					);
					if (findSameTimeLog) {
						findSameTimeLog.hours =
							parseInt(timeActivities?.hours) +
							parseInt(findSameTimeLog?.hours);
						findSameTimeLog.minute =
							parseInt(timeActivities?.minute) +
							parseInt(findSameTimeLog.minute);
					} else {
						sameCustomerWithSameClass.push(timeActivities);
					}
				}
			});

			const splitTimeActivities = splitActivities.find(
				(e: any) => e.id === costAllocation.id
			);

			if (splitTimeActivities && splitTimeActivities?.timeActivities?.length) {
				splitTimeActivities?.timeActivities.forEach((timeActivities: any) => {
					if (timeActivities.SplitTimeActivities.length) {
						timeActivities.SplitTimeActivities.forEach((splitActivity: any) => {
							const findSameTimeLog = sameCustomerWithSameClass.find(
								(e) =>
									e.customerId === splitActivity.customerId &&
									e.classId === splitActivity.classId
							);

							if (findSameTimeLog) {
								findSameTimeLog.hours =
									parseInt(splitActivity?.hours) +
									parseInt(findSameTimeLog?.hours);
								findSameTimeLog.minute =
									parseInt(splitActivity?.minute) +
									parseInt(findSameTimeLog.minute);
							} else {
								sameCustomerWithSameClass.push(splitActivity);
							}
						});
					}
				});
			}

			// const directAllocationData = empDirectAllocation.find((e: any) => e.id === costAllocation.id);

			if (costAllocation?.EmployeeDirectAllocationConfig?.length) {
				costAllocation?.EmployeeDirectAllocationConfig?.forEach(
					(timeActivities: any) => {
						const findSameTimeLog = sameCustomerWithSameClass.find(
							(e) =>
								e.customerId === timeActivities.customerId &&
								e.classId === timeActivities.classId
						);

						if (findSameTimeLog) {
							findSameTimeLog.allocation =
								timeActivities.allocation + findSameTimeLog.allocation;
						} else {
							sameCustomerWithSameClass.push(timeActivities);
						}
					}
				);
			}

			employeeRowSpanMapping[costAllocation.fullName] =
				sameCustomerWithSameClass.length;

			const allocationMapping: any = {};

			sameCustomerWithSameClass.forEach(
				(timeActivities: any, timeActivityIndex: number) => {
					const hours = parseInt(timeActivities?.hours);
					const minutes = parseInt(timeActivities?.minute);
					if (hours || minutes) {
						const currActivitiesTime = this.hoursToMin(hours, minutes);

						// availableTotalMinutes = availableTotalMinutes + currActivitiesTime;

						const allocation = this.allocationPercentage(
							Number(currActivitiesTime),
							Number(totalTimeMin)
						);

						totalAllocationPercentage =
							totalAllocationPercentage + Number(allocation);

						totalAllocationPercentageWithToFixed = Number(
							(
								Number(totalAllocationPercentageWithToFixed.toFixed(2)) +
								Number(allocation.toFixed(2))
							).toFixed(2)
						);

						allocationMapping[timeActivityIndex] = Number(
							allocation.toFixed(2)
						);
					} else if (timeActivities.allocation) {
						totalAllocationPercentage = totalAllocationPercentageWithToFixed =
							Number(
								(
									Number(totalAllocationPercentageWithToFixed.toFixed(2)) +
									Number(timeActivities.allocation.toFixed(2))
								).toFixed(2)
							);
						totalAllocationPercentage +
							Number(timeActivities.allocation.toFixed(2));
						4;
						allocationMapping[timeActivityIndex] = Number(
							timeActivities.allocation.toFixed(2)
						);
					}
				}
			);

			const allocationDiff =
				totalAllocationPercentage - totalAllocationPercentageWithToFixed;

			if (allocationDiff) {
				const largestEntry = Object.entries(allocationMapping).reduce(
					(acc: any, curr: any) => (curr[1] > acc[1] ? curr : acc)
				);
				const largestKey = largestEntry[0];
				allocationMapping[largestKey] = Number(
					(allocationMapping[largestKey] + allocationDiff).toFixed(2)
				);
			}

			const employeeAllocation: any[] = [];

			sameCustomerWithSameClass.forEach(
				(timeActivities: any, timeActivityIndex: number) => {
					const costAllocationObj: any = {
						id: uuidv4(),
					};

					const hours = parseInt(timeActivities?.hours);
					const minutes = parseInt(timeActivities?.minute);
					const currActivitiesTime = this.hoursToMin(hours, minutes);

					if (hours || minutes) {
						availableTotalMinutes = availableTotalMinutes + currActivitiesTime;
					}

					let allocation = Number(allocationMapping[timeActivityIndex]);

					if (!hours && !minutes && !timeActivities?.allocation) {
						allocation = 0;
					}

					if (timeActivities.allocation) {
						costAllocationObj['hasDirectAllocation'] = true;
					}

					// totalAllocationPercentage =
					// 	totalAllocationPercentage + Number(allocation);

					if (timeActivityIndex === 0) {
						costAllocationObj['employee-name'] = costAllocation.fullName;
					}

					costAllocationObj['total-hours'] = !costAllocationObj[
						'hasDirectAllocation'
					]
						? this.minToHours(currActivitiesTime)
						: '-';
					costAllocationObj['customer-name'] = timeActivities?.customerName;
					costAllocationObj['class-name'] = timeActivities?.className;
					costAllocationObj['allocation'] = `${allocation.toFixed(
						percentageToFixed
					)}%`;

					employeeCostMappingData.forEach((data) => {
						const key = Object.keys(data)[0];
						const value = (Number(allocation) * Number(data[key])) / 100;

						if (totalFields.includes(key)) {
							grandTotal = grandTotal + value;
						}

						if (allTotalColumnsObj[key]) {
							allTotalColumnsObj[key] = Number(
								(
									Number(allTotalColumnsObj[key].toFixed(2)) +
									Number(value.toFixed(2))
								).toFixed(2)
							);
						} else {
							allTotalColumnsObj[key] = Number(value.toFixed(2));
						}
						// if (totalFields.includes(key)) {
						// }

						if (salarySectionFields.includes(key)) {
							const directAllocation =
								(value * Number(companyConfiguration?.indirectExpenseRate)) /
								100;
							costAllocationObj['indirect-allocation'] = directAllocation;
							// grandTotal = grandTotal + directAllocation;
							if (allTotalColumnsObj['indirect-allocation']) {
								allTotalColumnsObj['indirect-allocation'] =
									allTotalColumnsObj['indirect-allocation'] + directAllocation;
							} else {
								allTotalColumnsObj['indirect-allocation'] = directAllocation;
							}
						}

						costAllocationObj[key] = Number(value.toFixed(2));
					});

					employeeAllocation.push(costAllocationObj);

					if (sameCustomerWithSameClass.length - 1 === timeActivityIndex) {
						//
					}
				}
			);

			Object.keys(allTotalColumnsObj).map((key: any) => {
				if (key != 'indirect-allocation') {
					const actualTotalAllocation =
						(Number(totalAllocationPercentage.toFixed(2)) *
							Number(employeeCostFieldValueMapping[key])) /
						100;
					const diff =
						Number(actualTotalAllocation.toFixed(2)) - allTotalColumnsObj[key];
					if (diff) {
						const fieldValue: any = {};

						employeeAllocation.forEach((allocation: any, index: number) => {
							if (Object.keys(allocation).includes(key)) {
								fieldValue[index] = allocation[key];
							}
						});

						const largestEntry = Object.entries(fieldValue).reduce(
							(acc: any, curr: any) => (curr[1] > acc[1] ? curr : acc)
						);
						const largestKey: any = largestEntry[0];
						fieldValue[largestKey] = Number(
							(fieldValue[largestKey] + allocationDiff).toFixed(2)
						);

						employeeAllocation[largestKey][key] =
							employeeAllocation[largestKey][key] + diff;
						allTotalColumnsObj[key] = Number(
							employeeCostFieldValueMapping[key]
						);
					}
				}
			});

			timeActivity.push(...employeeAllocation);
			const timeActivitiesTotalColumn: any = {
				...allTotalColumnsObj,
				id: uuidv4(),
				type: 'total',
				allocation: `${totalAllocationPercentage.toFixed(percentageToFixed)}%`,
				'total-hours': !costAllocation?.EmployeeDirectAllocationConfig?.length
					? this.minToHours(availableTotalMinutes)
					: '-',
				'employee-name': 'Total',
				hasDirectAllocation: costAllocation?.EmployeeDirectAllocationConfig
					?.length
					? true
					: false,
				totalHoursInMinutes: availableTotalMinutes,
				totalRowEmployeeName: costAllocation.fullName,
			};
			timeActivity.push(timeActivitiesTotalColumn);
			response = [...response, ...timeActivity];
		}

		const count = await prisma.employee.count({
			where: query.where,
		});

		return {
			result: response,
			employeeRowSpanMapping,
			count,
			grandTotal,
			foundAllocationEmployeeIds,
		};
	}

	getGrandTotalRowCostAllocation(response: any[]) {
		if (!response || !response.length) {
			return null;
		}

		const notIncludeFields = [
			'employee-name',
			'allocation',
			'customer-name',
			'class-name',
			'totalRowEmployeeName',
		];

		const totalMapping: any = {};

		response.forEach((row: any) => {
			Object.keys(row).forEach((key: string) => {
				if (!notIncludeFields.includes(key)) {
					if (totalMapping[key]) {
						totalMapping[key] = row[key] + totalMapping[key];
					} else {
						totalMapping[key] = row[key];
					}
				}
			});
		});

		totalMapping['total-hours'] = this.minToHours(
			totalMapping['totalHoursInMinutes']
		);
		totalMapping['employee-name'] = 'Grand Total';
		totalMapping['type'] = 'grandTotal';

		return totalMapping;
	}

	getRowWiseTotal(row: any, includeFields: string[]) {
		if (!row || !Object.keys(row).length) {
			return null;
		}

		let total = 0;

		Object.keys(row).forEach((key: string) => {
			if (includeFields.includes(key)) {
				total = row[key] + total;
			}
		});

		return total;
	}

	async getCostAllocationForJournal(costAllocationData: any) {
		const { companyId, payPeriodId, timeSheetId } = costAllocationData;

		const directAllocationEmployees =
			await prisma.employeeDirectAllocationConfig.findMany({
				where: {
					companyId,
					payPeriodId,
					isActive: true,
				},
			});

		const query = {
			where: {
				companyId: companyId,
				active: true,
				OR: [
					{
						timeActivities: {
							some: {
								timeSheetId: timeSheetId,
								employeeId: {
									notIn: directAllocationEmployees.map((e) => {
										return e.employeeId;
									}),
								},
							},
						},
					},
					{
						EmployeeDirectAllocationConfig: {
							some: {
								payPeriodId,
								isActive: true,
							},
						},
					},
				],
			},
			select: {
				fullName: true,
				id: true,
				timeActivities: {
					where: {
						timeSheetId: timeSheetId,
						employeeId: {
							notIn: directAllocationEmployees.map((e) => {
								return e.employeeId;
							}),
						},
					},
					include: {
						SplitTimeActivities: {
							select: {
								id: true,
								classId: true,
								className: true,
								customerId: true,
								customerName: true,
								hours: true,
								minute: true,
								activityDate: true,
								isAutoSplit: true,
								isClassReadOnly: true,
								isCustomerReadOnly: true,
								customRuleId: true,
							},
						},
					},
				},
				EmployeeDirectAllocationConfig: {
					where: {
						payPeriodId,
						isActive: true,
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},
		};

		const costAllocations = await prisma.employee.findMany({
			...query,
			orderBy: {
				fullName: 'asc',
			},
		});
		const response: any[] = [];

		console.log('costAllocations', JSON.stringify(costAllocations));

		const companySection = await prisma.configurationSection.findMany({
			where: {
				companyId,
				no: {
					gt: 0,
				},
				payPeriodId,
			},
		});

		const sectionIds = companySection.map((e) => {
			return e.id;
		});

		const companyFields = await prisma.field.findMany({
			where: {
				companyId,
				jsonId: 't1',
				configurationSectionId: {
					in: sectionIds,
				},
				payPeriodId,
			},
		});

		const salarySection = companySection.find((e) => e.no === 1);

		const salarySectionFields = companyFields
			.filter((e) => e.configurationSectionId === salarySection?.id)
			.map((e) => {
				return e.id;
			});

		const companyConfiguration = await prisma.configuration.findFirst({
			where: {
				companyId,
				payPeriodId,
			},
		});

		for (const singleCostAllocation of costAllocations) {
			const costAllocation: any = singleCostAllocation;
			const allTimeActivities = await prisma.timeActivities.findMany({
				where: {
					timeSheetId,
					employeeId: costAllocation.id,
				},
			});
			const totalTimeMin: any = this.totalHoursIntoMin(allTimeActivities);

			const employeeCostMappingData: any[] = [];
			const employeeCostFieldValueMapping: any = {};

			if (costAllocation.employeeCostField.length) {
				costAllocation.employeeCostField.forEach((singleEmployeeData: any) => {
					const obj: any = {};
					if (singleEmployeeData) {
						if (
							singleEmployeeData &&
							singleEmployeeData.field &&
							sectionIds.includes(
								singleEmployeeData.field.configurationSectionId
							)
						) {
							obj[singleEmployeeData.field.id] =
								singleEmployeeData.costValue[0].value;
							employeeCostMappingData.push(obj);
							employeeCostFieldValueMapping[singleEmployeeData.field.id] =
								singleEmployeeData.costValue[0].value;
						}
					}
				});
			}
			const timeActivity: any[] = [];
			const allTotalColumnsObj: any = {};
			let totalAllocationPercentage = 0;
			let availableTotalMinutes = 0;
			let totalAllocationPercentageWithToFixed = 0;

			//Array with time activities with same customer and class
			const sameCustomerWithSameClass: any[] = [];

			costAllocation?.timeActivities?.forEach((timeActivities: any) => {
				const findSameTimeLog = sameCustomerWithSameClass.find(
					(e) =>
						e.customerId === timeActivities.customerId &&
						e.classId === timeActivities.classId
				);
				if (!timeActivities.SplitTimeActivities.length) {
					if (findSameTimeLog) {
						findSameTimeLog.hours =
							parseInt(timeActivities?.hours) +
							parseInt(findSameTimeLog?.hours);
						findSameTimeLog.minute =
							parseInt(timeActivities?.minute) +
							parseInt(findSameTimeLog.minute);
					} else {
						sameCustomerWithSameClass.push(timeActivities);
					}
				} else {
					timeActivities.SplitTimeActivities.forEach((splitActivity: any) => {
						const findSameTimeLog = sameCustomerWithSameClass.find(
							(e) =>
								e.customerId === splitActivity.customerId &&
								e.classId === splitActivity.classId
						);

						if (findSameTimeLog) {
							findSameTimeLog.hours =
								parseInt(splitActivity?.hours) +
								parseInt(findSameTimeLog?.hours);
							findSameTimeLog.minute =
								parseInt(splitActivity?.minute) +
								parseInt(findSameTimeLog.minute);
						} else {
							sameCustomerWithSameClass.push(splitActivity);
						}
					});
				}
			});

			costAllocation?.EmployeeDirectAllocationConfig?.forEach(
				(timeActivities: any) => {
					const findSameTimeLog = sameCustomerWithSameClass.find(
						(e) =>
							e.customerId === timeActivities.customerId &&
							e.classId === timeActivities.classId
					);

					if (findSameTimeLog) {
						findSameTimeLog.allocation =
							timeActivities.allocation + findSameTimeLog.allocation;
					} else {
						sameCustomerWithSameClass.push(timeActivities);
					}
				}
			);

			const allocationMapping: any = {};

			sameCustomerWithSameClass.forEach(
				(timeActivities: any, timeActivityIndex: number) => {
					const hours = parseInt(timeActivities?.hours);
					const minutes = parseInt(timeActivities?.minute);
					if (hours || minutes) {
						const currActivitiesTime = this.hoursToMin(hours, minutes);

						// availableTotalMinutes = availableTotalMinutes + currActivitiesTime;

						const allocation = this.allocationPercentage(
							Number(currActivitiesTime),
							Number(totalTimeMin)
						);

						totalAllocationPercentage =
							totalAllocationPercentage + Number(allocation);

						totalAllocationPercentageWithToFixed = Number(
							(
								Number(totalAllocationPercentageWithToFixed.toFixed(2)) +
								Number(allocation.toFixed(2))
							).toFixed(2)
						);

						allocationMapping[timeActivityIndex] = Number(
							allocation.toFixed(2)
						);
					} else if (timeActivities.allocation) {
						totalAllocationPercentage = totalAllocationPercentageWithToFixed =
							Number(
								(
									Number(totalAllocationPercentageWithToFixed.toFixed(2)) +
									Number(timeActivities.allocation.toFixed(2))
								).toFixed(2)
							);
						totalAllocationPercentage +
							Number(timeActivities.allocation.toFixed(2));
						4;
						allocationMapping[timeActivityIndex] = Number(
							timeActivities.allocation.toFixed(2)
						);
					}
				}
			);

			const allocationDiff =
				totalAllocationPercentage - totalAllocationPercentageWithToFixed;

			if (allocationDiff) {
				const largestEntry = Object.entries(allocationMapping).reduce(
					(acc: any, curr: any) => (curr[1] > acc[1] ? curr : acc)
				);
				const largestKey = largestEntry[0];
				allocationMapping[largestKey] = Number(
					(allocationMapping[largestKey] + allocationDiff).toFixed(2)
				);
			}

			const employeeAllocation: any[] = [];

			sameCustomerWithSameClass.forEach(
				(timeActivities: any, timeActivityIndex: number) => {
					const costAllocationObj: any = {
						id: uuidv4(),
					};

					const hours = parseInt(timeActivities?.hours);
					const minutes = parseInt(timeActivities?.minute);
					const currActivitiesTime = this.hoursToMin(hours, minutes);

					availableTotalMinutes = availableTotalMinutes + currActivitiesTime;

					let allocation = Number(allocationMapping[timeActivityIndex]);

					if (!hours && !minutes && !timeActivities.allocation) {
						allocation = 0;
					}

					// totalAllocationPercentage =
					// 	totalAllocationPercentage + Number(allocation);

					costAllocationObj['employee-name'] = costAllocation.fullName;
					costAllocationObj['employeeId'] = costAllocation.id;
					costAllocationObj['customer-name'] = timeActivities?.customerName;
					costAllocationObj['customerId'] = timeActivities?.customerId;
					costAllocationObj['class-name'] = timeActivities?.className;
					costAllocationObj['classId'] = timeActivities?.classId;

					console.log('employeeCostMappingData', employeeCostMappingData);

					employeeCostMappingData.forEach((data) => {
						const key = Object.keys(data)[0];
						const value = (Number(allocation) * Number(data[key])) / 100;

						if (allTotalColumnsObj[key]) {
							allTotalColumnsObj[key] = Number(
								(
									Number(allTotalColumnsObj[key].toFixed(2)) +
									Number(value.toFixed(2))
								).toFixed(2)
							);
						} else {
							allTotalColumnsObj[key] = Number(value.toFixed(2));
						}

						if (salarySectionFields.includes(key)) {
							const directAllocation =
								(value * Number(companyConfiguration?.indirectExpenseRate)) /
								100;
							costAllocationObj['indirect-allocation'] = directAllocation;
						}

						costAllocationObj[key] = value;
					});

					employeeAllocation.push(costAllocationObj);
				}
			);

			Object.keys(allTotalColumnsObj).map((key: any) => {
				if (key != 'indirect-allocation') {
					const actualTotalAllocation =
						(Number(totalAllocationPercentage.toFixed(2)) *
							Number(employeeCostFieldValueMapping[key])) /
						100;
					const diff =
						Number(actualTotalAllocation.toFixed(2)) - allTotalColumnsObj[key];
					if (diff) {
						const fieldValue: any = {};

						employeeAllocation.forEach((allocation: any, index: number) => {
							if (Object.keys(allocation).includes(key)) {
								fieldValue[index] = allocation[key];
							}
						});

						const largestEntry = Object.entries(fieldValue).reduce(
							(acc: any, curr: any) => (curr[1] > acc[1] ? curr : acc)
						);
						const largestKey: any = largestEntry[0];
						fieldValue[largestKey] = Number(
							(fieldValue[largestKey] + allocationDiff).toFixed(2)
						);

						employeeAllocation[largestKey][key] =
							employeeAllocation[largestKey][key] + diff;
						allTotalColumnsObj[key] = Number(
							employeeCostFieldValueMapping[key]
						);
					}
				}
			});

			timeActivity.push(...employeeAllocation);

			response.push({
				costAllocation: timeActivity,
			});
		}

		return response;
	}

	async getExpensesByCustomer(costAllocationData: any) {
		const { companyId, payPeriodId, timeSheetId, searchCondition } =
			costAllocationData;

		const directAllocationEmployees =
			await prisma.employeeDirectAllocationConfig.findMany({
				where: {
					companyId,
					payPeriodId,
					isActive: true,
				},
			});

		const _costAllocations = await prisma.employee.findMany({
			where: {
				id: {
					notIn: directAllocationEmployees.map((e) => {
						return e.employeeId;
					}),
				},
				companyId: companyId,
				active: true,
				timeActivities: {
					some: {
						timeSheetId,
						...searchCondition,
					},
				},
			},
			select: {
				fullName: true,
				id: true,
				timeActivities: {
					where: {
						timeSheetId,
						...searchCondition,
					},
					include: {
						SplitTimeActivities: true,
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
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

		//NOTE: If filter and other things not work remove this split activity additional logic
		const splitQuery = {
			where: {
				id: {
					notIn: directAllocationEmployees.map((e) => {
						return e.employeeId;
					}),
				},
				companyId: companyId,
				timeActivities: {
					some: {
						timeSheetId: timeSheetId,
						SplitTimeActivities: {
							some: {
								...searchCondition,
							},
						},
					},
				},
			},
			select: {
				fullName: true,
				id: true,
				timeActivities: {
					where: {
						timeSheetId: timeSheetId,
						SplitTimeActivities: {
							some: {
								...searchCondition,
							},
						},
					},
					include: {
						SplitTimeActivities: {
							where: {
								...searchCondition,
							},
						},
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},
		};

		const splitActivities: any = await prisma.employee.findMany(splitQuery);

		const empDirectAllocation: any = await prisma.employee.findMany({
			where: {
				companyId: companyId,
				active: true,
				EmployeeDirectAllocationConfig: {
					some: {
						payPeriodId,
						...searchCondition,
						isActive: true,
					},
				},
			},
			select: {
				fullName: true,
				id: true,
				EmployeeDirectAllocationConfig: {
					where: {
						payPeriodId,
						...searchCondition,
						isActive: true,
					},
				},
				employeeCostField: {
					where: {
						field: {
							payPeriodId,
							isActive: true,
						},
						payPeriodId,
					},
					include: {
						field: true,
						costValue: {
							where: {
								payPeriodId: payPeriodId,
								isPercentage: true,
							},
						},
					},
				},
			},
		});

		const notFoundEmployeeData: any[] = [];

		splitActivities.forEach((e: any) => {
			const costAllocation = _costAllocations.find((x: any) => x.id === e.id);

			if (!costAllocation) {
				notFoundEmployeeData.push(e);
			}
		});

		empDirectAllocation.forEach((e: any) => {
			const costAllocation = _costAllocations.find((x: any) => x.id === e.id);

			if (!costAllocation) {
				notFoundEmployeeData.push(e);
			}
		});

		const costAllocations = [..._costAllocations, ...notFoundEmployeeData];

		const companySection = await prisma.configurationSection.findMany({
			where: {
				companyId,
				no: {
					gt: 0,
				},
				payPeriodId,
			},
		});
		const sectionIds = companySection.map((e) => {
			return e.id;
		});

		const companyFields = await prisma.field.findMany({
			where: {
				companyId,
				jsonId: 't1',
				configurationSectionId: {
					in: sectionIds,
				},
				payPeriodId,
			},
		});
		const salarySection = companySection.find((e) => e.no === 1);

		const salarySectionFields = companyFields
			.filter((e) => e.configurationSectionId === salarySection?.id)
			.map((e) => {
				return e.id;
			});

		const totalFields = companyFields.map((e) => {
			return e.id;
		});

		const companyConfiguration = await prisma.configuration.findFirst({
			where: {
				companyId,
				payPeriodId,
			},
		});

		const customerTotalMapping: any = [];

		for (const singleCostAllocation of costAllocations) {
			const costAllocation: any = singleCostAllocation;
			const allTimeActivities = await prisma.timeActivities.findMany({
				where: {
					timeSheetId,
					employeeId: costAllocation.id,
				},
			});
			const totalTimeMin: any = this.totalHoursIntoMin(allTimeActivities);

			const employeeCostMappingData: any[] = [];

			if (costAllocation.employeeCostField.length) {
				costAllocation.employeeCostField.forEach((singleEmployeeData: any) => {
					const obj: any = {};
					if (singleEmployeeData) {
						if (
							singleEmployeeData &&
							singleEmployeeData.field &&
							sectionIds.includes(
								singleEmployeeData.field.configurationSectionId
							)
						) {
							let value = 0;
							singleEmployeeData.costValue.forEach((e: any) => {
								value = value + Number(e.value);
							});
							obj[singleEmployeeData.field.id] = value;
							employeeCostMappingData.push(obj);
						}
					}
				});
			}

			// const totalTime = this.minToHours(totalTimeMin);
			let totalAllocationPercentage = 0;
			let availableTotalMinutes = 0;

			//Array with time activities with same customer and class
			const sameCustomer: any[] = [];

			costAllocation?.timeActivities?.forEach((timeActivities: any) => {
				if (!timeActivities.SplitTimeActivities.length) {
					const findSameTimeLog = sameCustomer.find(
						(e) =>
							e.customerId === timeActivities.customerId &&
							e.classId === timeActivities.classId
					);
					if (findSameTimeLog) {
						findSameTimeLog.hours =
							parseInt(timeActivities?.hours) +
							parseInt(findSameTimeLog?.hours);
						findSameTimeLog.minute =
							parseInt(timeActivities?.minute) +
							parseInt(findSameTimeLog.minute);
					} else {
						sameCustomer.push(timeActivities);
					}
				}
			});

			const splitTimeActivities = splitActivities.find(
				(e: any) => e.id === costAllocation.id
			);

			if (splitTimeActivities && splitTimeActivities?.timeActivities?.length) {
				splitTimeActivities?.timeActivities?.forEach((timeActivities: any) => {
					if (timeActivities.SplitTimeActivities.length) {
						timeActivities.SplitTimeActivities.forEach((splitActivity: any) => {
							const findSameTimeLog = sameCustomer.find(
								(e) =>
									e.customerId === splitActivity.customerId &&
									e.classId === splitActivity.classId
							);

							if (findSameTimeLog) {
								findSameTimeLog.hours =
									parseInt(splitActivity?.hours) +
									parseInt(findSameTimeLog?.hours);
								findSameTimeLog.minute =
									parseInt(splitActivity?.minute) +
									parseInt(findSameTimeLog.minute);
							} else {
								sameCustomer.push(splitActivity);
							}
						});
					}
				});
			}

			const directAllocationData = empDirectAllocation.find(
				(e: any) => e.id === costAllocation.id
			);

			if (
				directAllocationData &&
				directAllocationData?.EmployeeDirectAllocationConfig?.length
			) {
				directAllocationData?.EmployeeDirectAllocationConfig.forEach(
					(timeActivities: any) => {
						const findSameTimeLog = sameCustomer.find(
							(e) =>
								e.customerId === timeActivities.customerId &&
								e.classId === timeActivities.classId
						);

						if (findSameTimeLog) {
							findSameTimeLog.allocation =
								timeActivities.allocation + findSameTimeLog.allocation;
						} else {
							sameCustomer.push(timeActivities);
						}
					}
				);
			}

			costAllocation.employeeCostMappingData = employeeCostMappingData;

			sameCustomer.forEach((timeActivities: any) => {
				const hours = parseInt(timeActivities?.hours);
				const minutes = parseInt(timeActivities?.minute);
				const currActivitiesTime = this.hoursToMin(hours, minutes);

				if (hours || minutes) {
					availableTotalMinutes = availableTotalMinutes + currActivitiesTime;
				}

				let allocation = this.allocationPercentage(
					Number(currActivitiesTime),
					Number(totalTimeMin)
				);

				if (timeActivities.allocation) {
					allocation = timeActivities.allocation;
				}

				if (!hours && !minutes && !timeActivities.allocation) {
					allocation = 0;
				}

				totalAllocationPercentage =
					totalAllocationPercentage + Number(allocation);

				let totalOfAllSalary = 0;

				employeeCostMappingData.forEach((data) => {
					const key = Object.keys(data)[0];
					const value = (Number(allocation) * Number(data[key])) / 100;

					if (totalFields.includes(key)) {
						totalOfAllSalary = totalOfAllSalary + value;
					}

					if (salarySectionFields.includes(key)) {
						const directAllocation =
							(value * Number(companyConfiguration?.indirectExpenseRate)) / 100;
						totalOfAllSalary = totalOfAllSalary + directAllocation;
					}
				});

				customerTotalMapping.push({
					name: timeActivities?.customerName,
					value: totalOfAllSalary,
					id: timeActivities?.customerId,
				});
			});
		}
		return customerTotalMapping;
	}

	async getCostAllocationDifference(payPeriodId: string, companyId: string) {
		const payPeriodData = await prisma.payPeriod.findFirst({
			where: {
				id: payPeriodId,
				companyId,
			},
			include: {
				TimeSheets: true,
			},
		});

		if (!payPeriodData) {
			throw new CustomError(400, 'Pay period not found');
		}

		if (!payPeriodData.TimeSheets) {
			throw new CustomError(
				400,
				'TimeSheet is not created for particular pay period'
			);
		}

		const costAllocation = await this.getCostAllocation({
			companyId,
			payPeriodId,
			timeSheetId: payPeriodData.TimeSheets.id,
		});

		const employeeCostQuery = `SELECT
									employee_id,
									employee_name,
									indirectExpenseRate,
									total_employee_value,
									indirectExpenses,
									ROUND(CAST(total_employee_value + indirectExpenses AS NUMERIC), 2) AS total_expenses_per_employee
								FROM (
									SELECT
										e."id" AS employee_id,
										e."fullName" AS employee_name,
										c."indirectExpenseRate" AS indirectExpenseRate,
										SUM(CASE WHEN f."jsonId" = 't1' AND f."name" = 'Total Salary' THEN CAST(ecv."value" AS NUMERIC) * (c."indirectExpenseRate" / 100) ELSE 0 END) AS indirectExpenses,
										SUM(CAST(ecv."value" AS NUMERIC)) AS total_employee_value
									FROM
										public."Field" f
									JOIN
										public."PayPeriod" p ON p."id" = f."payPeriodId"
									JOIN
										public."Configuration" c ON p."id" = c."payPeriodId"
									JOIN
										public."EmployeeCostField" ecf ON ecf."fieldId" = f.id
									JOIN
										public."Employee" e ON ecf."employeeId" = e."id" AND e."active" IS TRUE
									JOIN
										public."EmployeeCostValue" ecv ON ecf."id" = ecv."employeeFieldId"
									WHERE
										f."payPeriodId" = '${payPeriodId}' AND
										f."companyId" = '${companyId}' AND
										f."jsonId" = 't1' AND
										f."isActive" IS TRUE AND
										e."active" IS true
									GROUP BY
										e."id", e."fullName", c."indirectExpenseRate"
								) AS employee_expenses;`;

		const employeeCostData: any[] = await prisma.$queryRawUnsafe(
			employeeCostQuery
		);

		if (!employeeCostData || !employeeCostData.length) {
			throw new CustomError(400, 'Employee cost data not found');
		}

		const foundAllocationEmployeeIds =
			costAllocation.foundAllocationEmployeeIds;

		const totalAllocation = costAllocation.grandTotal;

		let totalEmployeeCost = 0;

		let totalEmployeeCostWithoutIndirectRate = 0;

		const notFoundAllocationEmployeesIDs: any[] = [];

		const notFoundAllocationEmployeesName: any[] = [];

		employeeCostData.forEach((data) => {
			if (!foundAllocationEmployeeIds.includes(data.employee_id)) {
				notFoundAllocationEmployeesIDs.push(data.employee_id);
				notFoundAllocationEmployeesName.push(data.employee_name);
			}

			totalEmployeeCost = Number(
				(
					Number(totalEmployeeCost.toFixed(2)) +
					Number(data.total_expenses_per_employee)
				).toFixed(2)
			);

			totalEmployeeCostWithoutIndirectRate = Number(
				(
					Number(totalEmployeeCostWithoutIndirectRate.toFixed(2)) +
					Number(data.total_employee_value)
				).toFixed(2)
			);
		});

		return {
			totalEmployeeCost,
			totalAllocation,
			notFoundAllocationEmployeesIDs,
			notFoundAllocationEmployeesName,
			foundAllocationEmployeeIds,
			totalEmployeeCostWithoutIndirectRate,
		};
	}
}
export default new costAllocationRepository();
