/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Response } from 'express';
import { promises as fs } from 'fs';
import moment from 'moment';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import companyRepository from '../repositories/companyRepository';
import costallocationServices from '../services/costallocationServices';
import { generatePdf } from '../templates/costAllocationPdf';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { prisma } from '../client/prisma';
class CostAllocationController {
	async getCostAllocation(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);
			const {
				companyId,
				page = 1,
				limit = 10,
				search = '',
				createdBy = '',
				type = '',
				sort = '',
				classId = '',
				customerId = '',
				employeeId = '',
				payPeriodId = null,
			} = req.query;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(400, 'Company not found');
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Cost Allocations',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			let _payPeriodId = payPeriodId;

			// const _date = new Date();

			let systemPayPeriodId = false;

			if (!_payPeriodId) {
				const payPeriodData = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						// endDate: {
						// 	gte: new Date(_date?.getFullYear(), _date?.getMonth(), 1),
						// 	lte: new Date(_date.getFullYear(), _date.getMonth() + 1, 0)
						// },
					},
					orderBy: {
						endDate: 'desc',
					},
				});

				if (payPeriodData && payPeriodData.id) {
					systemPayPeriodId = true;
					_payPeriodId = payPeriodData.id;
				}
			}

			if (_payPeriodId) {
				const validatePayPeriod = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						id: _payPeriodId as string,
					},
				});

				if (!validatePayPeriod) {
					throw new CustomError(400, 'Invalid PayPeriod');
				}
			}

			const data = {
				companyId: companyId,
				page: page,
				limit: limit,
				search: String(search),
				createdBy: String(createdBy),
				type: String(type),
				sort: String(sort),
				classId: String(classId),
				customerId: String(customerId),
				employeeId: String(employeeId),
				payPeriodId: String(_payPeriodId),
			};
			const costAllocation = await costallocationServices.getCostAllocationData(
				data as any
			);

			return DefaultResponse(res, 200, 'Cost allocation fetched successfully', {
				...costAllocation,
				currentDatePayPeriod: systemPayPeriodId ? _payPeriodId : null,
			});
		} catch (err) {
			next(err);
		}
	}

	async getCostAllocationGrandTotal(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);
			const {
				companyId,
				page = 1,
				limit = 10,
				search = '',
				createdBy = '',
				type = '',
				sort = '',
				classId = '',
				customerId = '',
				employeeId = '',
				payPeriodId = null,
			} = req.query;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(400, 'Company not found');
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Cost Allocations',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			let _payPeriodId = payPeriodId;

			const _date = new Date();

			if (!_payPeriodId) {
				const payPeriodData = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						endDate: {
							gte: new Date(_date?.getFullYear(), _date?.getMonth(), 1),
							lte: new Date(_date.getFullYear(), _date.getMonth() + 1, 0),
						},
					},
					orderBy: {
						endDate: 'desc',
					},
				});

				if (payPeriodData && payPeriodData.id) {
					_payPeriodId = payPeriodData.id;
				}
			}

			if (_payPeriodId) {
				const validatePayPeriod = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						id: _payPeriodId as string,
					},
				});

				if (!validatePayPeriod) {
					throw new CustomError(400, 'Invalid PayPeriod');
				}
			}

			const data = {
				companyId: companyId,
				page: page,
				limit: limit,
				search: String(search),
				createdBy: String(createdBy),
				type: String(type),
				sort: String(sort),
				classId: String(classId),
				customerId: String(customerId),
				employeeId: String(employeeId),
				payPeriodId: String(_payPeriodId),
			};
			const grandTotalRow =
				await costallocationServices.getCostAllocationDataGrandTotal(
					data as any
				);

			return DefaultResponse(
				res,
				200,
				'Cost allocation grand total row fetched successfully',
				grandTotalRow
			);
		} catch (err) {
			next(err);
		}
	}

	async exportCostAllocationCSV(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				search = '',
				type = '',
				sort = '',
				classId = '',
				customerId = '',
				employeeId = '',
				payPeriodId = null,
			} = req.query;

			const data = {
				companyId: companyId,
				search: String(search),
				type: String(type),
				sort: String(sort),
				classId: String(classId),
				customerId: String(customerId),
				employeeId: String(employeeId),
				payPeriodId: String(payPeriodId),
			};

			const csvData = await costallocationServices.exportCostAllocationCSV(
				data
			);

			res.setHeader('Content-Type', 'text/csv');

			const fileName = moment(new Date()).format('MMDDYYYYhhmmss');

			res.setHeader(
				'Content-Disposition',
				`attachment; filename=CostAllocation_${fileName}.csv`
			);

			return res.status(200).end(csvData);
		} catch (err) {
			next(err);
		}
	}

	async exportCostAllocationPDF(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				search = '',
				type = '',
				sort = '',
				classId = '',
				customerId = '',
				employeeId = '',
				payPeriodId = null,
			} = req.query;

			const data = {
				companyId: companyId,
				search: String(search),
				type: String(type),
				sort: String(sort),
				classId: String(classId),
				customerId: String(customerId),
				employeeId: String(employeeId),
				payPeriodId: String(payPeriodId),
			};

			const { finalDataArr, counts, filePath, companyName } =
				await costallocationServices.exportCostAllocationPDF(data);

			const stream = await generatePdf(
				finalDataArr,
				counts,
				filePath,
				payPeriodId as string,
				companyName as string
			);

			stream.on('close', async () => {
				const data = await fs.readFile(filePath);

				const base64String = Buffer.from(data).toString('base64');

				await fs.unlink(filePath);

				res.status(200).json({
					data: base64String,
				});
			});
		} catch (err) {
			next(err);
		}
	}

	async getCostAllocationDifference(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				payPeriodId,
			} = req.query;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			if (!payPeriodId) {
				throw new CustomError(400, 'Pay period id is required');
			}

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(400, 'Company not found');
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Cost Allocations',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const costAllocationDifference =
				await costallocationServices.getCostAllocationDifference(
					payPeriodId as string, companyId as string
				);

			return DefaultResponse(
				res,
				200,
				'Cost allocation difference fetched successfully',
				costAllocationDifference
			);
		} catch (err) {
			next(err);
		}
	}
}

export default new CostAllocationController();
