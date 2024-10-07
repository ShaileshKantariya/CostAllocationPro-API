/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../client/prisma';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { formatNumberWithCommas } from '../helpers/global';
import { checkValidation } from '../helpers/validationHelper';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { CustomError } from '../models/customError';
import employeeCostServices from '../services/employeeCostServices';
import moment from 'moment';
import { sectionWiseTotalFieldName } from '../constants/data';
import { json2csv } from 'json-2-csv';
import { RequestExtended } from '../interfaces/global';
import { hasText } from '../utils/utils';
const dataExporter = require('json2csv').Parser;

class EmployeeConstController {
	// For get the cost by month
	async getMonthlyCost(req: Request, res: Response, next: NextFunction) {
		try {
			const {
				companyId,
				date,
				page = 1,
				limit = 10,
				search,
				type,
				sort,
				isPdf,
				includeInactive = false,
				showEmployeeWithAllocationConfig = false,
				notIncludedEmployeeIds,
			} = req.query;

			let payPeriodId = req.query.payPeriodId;

			// const _date = new Date();

			let systemPayPeriodId = false;

			if (!payPeriodId) {
				const payPeriodData = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						// endDate: {
						// 	gte: new Date(_date?.getFullYear(), _date?.getMonth(), 1),
						// 	lte: new Date(_date.getFullYear(), _date.getMonth() + 1, 0)
						// },
						// OR: [
						// 	// {
						// 	// 	startDate: {
						// 	// 		lte: new Date(new Date().setUTCHours(23, 59, 59, 999)),
						// 	// 	},
						// 	// 	endDate: {
						// 	// 		gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
						// 	// 	},
						// 	// },
						// 	// {
						// 	// 	startDate: {
						// 	// 		gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
						// 	// 	},
						// 	// 	endDate: {
						// 	// 		lte: new Date(new Date().setUTCHours(23, 59, 59, 999)),
						// 	// 	},
						// 	// },
						// ],
					},
					orderBy: {
						endDate: 'desc',
					},
				});

				if (payPeriodData && payPeriodData.id) {
					systemPayPeriodId = true;
					payPeriodId = payPeriodData.id;
				}
			}

			// if (!payPeriodId) {
			// 	throw new CustomError(400, 'No Pay Periods Found');
			// }

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			// if (!payPeriodId) {
			// 	throw new CustomError(400, 'Pay period id is required');
			// }

			if (payPeriodId) {
				const validatePayPeriod = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						id: payPeriodId as string,
					},
				});

				if (!validatePayPeriod) {
					throw new CustomError(400, 'Invalid PayPeriod');
				}
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Employee Cost',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			let employeesMonthlyCost;

			let _notIncludedEmployeeIds: any = notIncludedEmployeeIds as string;

			if (hasText(_notIncludedEmployeeIds as any)) {
				_notIncludedEmployeeIds = _notIncludedEmployeeIds?.split(',');
			}

			if (isPdf === 'true') {
				employeesMonthlyCost = await employeeCostServices.getMonthlyCost(
					companyId as string,
					date as string,
					Number(page),
					Number(limit),
					search as string,
					type as string,
					sort as string,
					payPeriodId as string,
					includeInactive === 'true' ? true : false
				);
			} else {
				employeesMonthlyCost = await employeeCostServices.getMonthlyCostV2(
					companyId as string,
					date as string,
					Number(page),
					Number(limit),
					search as string,
					type as string,
					sort as string,
					payPeriodId as string,
					systemPayPeriodId,
					includeInactive === 'true' ? true : false,
					showEmployeeWithAllocationConfig === 'true',
					_notIncludedEmployeeIds
				);
			}

			return DefaultResponse(
				res,
				200,
				'Configurations fetched successfully',
				employeesMonthlyCost
			);
		} catch (error) {
			next(error);
		}
	}
	// For create the cost my month
	async createMonthlyCost(req: Request, res: Response, next: NextFunction) {
		try {
			const { companyId, payPeriodId } = req.body;
			checkValidation(req);
			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			if (!payPeriodId) {
				throw new CustomError(400, 'Pay period id is required');
			}

			await employeeCostServices.createMonthlyCost(companyId, payPeriodId);
			return DefaultResponse(
				res,
				200,
				'Configuration values created successfully'
			);
		} catch (error) {
			next(error);
		}
	}
	//For update any single cost
	async updateMonthlyCost(req: Request, res: Response, next: NextFunction) {
		try {
			const { employeeCostValueID, value, payPeriodId, isCalculatorValue } =
				req.body;

			checkValidation(req);

			const updatedEmployeeCostValue =
				await employeeCostServices.updateMonthlyCost(
					employeeCostValueID,
					value,
					payPeriodId,
					isCalculatorValue as boolean
				);
			return DefaultResponse(
				res,
				200,
				'Configurations fetched successfully',
				updatedEmployeeCostValue
			);
		} catch (error) {
			next(error);
		}
	}

	async exportEmployeeCost(req: Request, res: Response, next: NextFunction) {
		try {
			const {
				companyId,
				date,
				search,
				type,
				sort,
				isPercentage,
				payPeriodId,
				includeInactive = false,
			} = req.query;

			const percentage: boolean = isPercentage === 'false' ? false : true;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const employeesMonthlyCost: any =
				await employeeCostServices.getMonthlyCostExport(
					companyId as string,
					date as string,
					search as string,
					type as string,
					sort as string,
					Boolean(percentage),
					payPeriodId as string,
					includeInactive === 'true' ? true : false
				);

			const finalDataArr = employeesMonthlyCost?.employees?.map(
				(singleEmployee: any) => {
					const sortedData = singleEmployee?.employeeCostField?.sort(
						(a: any, b: any) => {
							// First, sort by field.configurationSection.no
							if (
								a.field.configurationSection.no !==
								b.field.configurationSection.no
							) {
								return (
									a.field.configurationSection.no -
									b.field.configurationSection.no
								);
							} else {
								// If configurationSection.no values are equal, sort by field.jsonId
								if (a.field.jsonId < b.field.jsonId) {
									return -1;
								} else if (a.field.jsonId > b.field.jsonId) {
									return 1;
								} else {
									return 0;
								}
							}
						}
					);

					let finalObject: any = {};

					sortedData.forEach((item: any) => {
						finalObject = {
							...finalObject,
							[item?.field?.name]:
								item?.costValue[0]?.value === 'salaried_exempt'
									? 'Salaried Exempt'
									: item?.costValue[0]?.value === 'salaried_non_exempt'
									? 'Salaried Non Exempt'
									: item?.costValue[0]?.value === null
									? 'NA'
									: item?.field?.name === 'Maximum allocate hours per year'
									? item?.costValue[0]?.value
									: item?.field?.name === 'Maximum Vacation/PTO hours per year'
									? item?.costValue[0]?.value
									: `$ ${formatNumberWithCommas(item?.costValue[0]?.value)}`,
						};
					});

					return {
						'Employee Name': singleEmployee?.fullName,
						...finalObject,
						'Total Labor Burden': `$ ${formatNumberWithCommas(
							Number(
								Number(
									finalObject[sectionWiseTotalFieldName[1]]
										.split(',')
										.join('')
										.split('$')[1]
								) +
									Number(
										finalObject[sectionWiseTotalFieldName[2]]
											.split(',')
											.join('')
											.split('$')[1]
									) +
									(finalObject[sectionWiseTotalFieldName[3]]
										? Number(
												finalObject[sectionWiseTotalFieldName[3]]
													.split(',')
													.join('')
													.split('$')[1]
										  )
										: 0)
							).toFixed(2)
						)}`,
					};
				}
			);

			if (percentage) {
				finalDataArr.forEach((singleEmployee: any) => {
					if (singleEmployee['Payroll Expense Pool']) {
						delete singleEmployee['Payroll Expense Pool'];
					}

					if (singleEmployee['Indirect Allocation Pool']) {
						delete singleEmployee['Indirect Allocation Pool'];
					}
					delete singleEmployee['Employee Type'];
					delete singleEmployee['Maximum allocate hours per year'];
					delete singleEmployee['Maximum Vacation/PTO hours per year'];
				});
			}

			const totalObject: any = {};

			if (finalDataArr.length > 0) {
				finalDataArr.forEach((singleData: any) => {
					Object.entries(singleData).map((singleField: any) => {
						if (singleField[0] in totalObject) {
							totalObject[singleField[0]] += Number(
								singleField[1]?.split(' ')[1]?.replace(/,/g, '')
							);
						} else {
							totalObject[singleField[0]] = Number(
								singleField[1]?.split(' ')[1]?.replace(/,/g, '')
							);
						}
					});
					Object.values(singleData);
				});
			}
			totalObject['Employee Name'] = 'Total';
			const fileHeader = ['Employee Name', 'Employee Type'];

			const jsonData = new dataExporter({ fileHeader });

			let dateRange;

			let startDate;
			let endDate;
			if (employeesMonthlyCost.payPeriodData) {
				startDate = moment(employeesMonthlyCost.payPeriodData.startDate).format(
					'MM/DD/YYYY'
				);
				endDate = moment(employeesMonthlyCost.payPeriodData.endDate).format(
					'MM/DD/YYYY'
				);
				dateRange = `${startDate} - ${endDate}`;
			} else {
				dateRange = 'All';
			}
			const extraData =
				`Report Name ,Employee Cost\n` +
				`Period ,${dateRange}\n` +
				`QuickBooks Company's Name ,${employeesMonthlyCost?.company?.tenantName}\n` +
				`\n`;

			// const exportingData = [...extraData, ...finalDataArr];

			const csvData = jsonData.parse(finalDataArr);
			// const totalData = jsonData.parse([totalObject]);
			const finalData =
				csvData +
				'\n' +
				JSON.stringify(
					Object.values(totalObject).map((singleObj: any, index: number) => {
						if (index === 0) {
							return singleObj;
						} else {
							return `$ ${singleObj.toFixed(2)}`;
						}
					})
				)
					.replace('[', '')
					.replace(']', '');

			res.setHeader('Content-Type', 'text/csv');

			res.setHeader(
				'Content-Disposition',
				'attachment; filename=employee_cost_data.csv'
			);

			return res.status(200).end(extraData + finalData);
		} catch (error) {
			next(error);
		}
	}

	async employeeCostTotal(req: Request, res: Response, next: NextFunction) {
		try {
			const {
				companyId,
				payPeriodId,
				search,
				includeInactive,
				showEmployeeWithAllocationConfig,
			} = req.query;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			if (!payPeriodId) {
				throw new CustomError(400, 'Pay period id is required');
			}
			if (includeInactive){
				if ( includeInactive !== 'true' && includeInactive !== 'false') {
					throw new CustomError(400, 'includeInactive value must be boolean');
				}
			}
			if (showEmployeeWithAllocationConfig) {
				if (showEmployeeWithAllocationConfig !== 'true' && showEmployeeWithAllocationConfig !== 'false') {
					throw new CustomError(400, 'Show employee with allocation config value must be boolean');
				}
			}

			if (payPeriodId) {
				const validatePayPeriod = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						id: payPeriodId as string,
					},
				});

				if (!validatePayPeriod) {
					throw new CustomError(400, 'Invalid PayPeriod');
				}
			}

			const data = await employeeCostServices.getMonthlyCostTotal(
				companyId as string,
				payPeriodId as string,
				search as string,
				includeInactive === 'true',
				showEmployeeWithAllocationConfig === 'true'
			);
			// const data = await employeeCostServices.getMonthlyCostTotal(
			// 	'acad9ecb-797a-4d43-b354-1a4ebb4bf1c1',
			// 	'3309e3e3-bc0e-45c0-8804-4c15afea65d3'
			// );
			return DefaultResponse(
				res,
				200,
				'Configurations fetched successfully',
				data
			);
		} catch (err) {
			next(err);
		}
	}

	async exportEmployeeCostSampleCsv(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { payPeriodId, companyId } = req.query;

			if (!payPeriodId) {
				throw new CustomError(400, 'Pay period id is required');
			}

			if (!companyId) {
				throw new CustomError(400, 'company id is required');
			}

			const data = await employeeCostServices.exportEmployeeCostSampleCsv(
				payPeriodId as string,
				companyId as string
			);

			const csv = await json2csv(data);

			res.setHeader('Content-Type', 'text/csv');

			res.setHeader(
				'Content-Disposition',
				'attachment; filename=employee_cost_data.csv'
			);

			res.status(200).send(csv);

			// return DefaultResponse(res, 200, '', data)
		} catch (error) {
			next(error);
		}
	}

	async importCsvEmployeeConstValue(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { payPeriodId, companyId, employeeCostData } = req.body;

			if (!payPeriodId) {
				throw new CustomError(400, 'Pay period id is required');
			}

			if (!companyId) {
				throw new CustomError(400, 'company id is required');
			}

			const data = await employeeCostServices.importCsvEmployeeConstValue(
				payPeriodId,
				companyId,
				employeeCostData
			);

			return DefaultResponse(
				res,
				200,
				'All employee cost values updated successfully',
				data
			);
		} catch (error) {
			next(error);
		}
	}
}
export default new EmployeeConstController();
