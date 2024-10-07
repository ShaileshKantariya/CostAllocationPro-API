import { RequestExtended } from '../interfaces/global';
import { Response, NextFunction } from 'express';
import { PayPeriodInterface } from '../interfaces/payPeriodInterface';
import payPeriodServices from '../services/payPeriodServices';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { CustomError } from '../models/customError';
import { checkValidation } from '../helpers/validationHelper';
import { checkPermission } from '../middlewares/isAuthorizedUser';

class PayPeriodController {
	async getAllPayPeriods(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, year, page, limit } = req.query;

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const data = {
				companyId,
				year: Number(year),
				page: page ? Number(page) : page,
				limit: limit ? Number(limit) : limit,
			};

			if (limit && page) {
				const isPermitted = await checkPermission(req, companyId as string, {
					permissionName: 'Pay Period',
					permission: ['view'],
				});

				if (!isPermitted) {
					throw new CustomError(403, 'You are not authorized');
				}
			}

			const payPeriods = await payPeriodServices.getAllPayPeriods(data);

			const count = await payPeriodServices.count(data);

			return DefaultResponse(
				res,
				200,
				'Get all pay periods',
				payPeriods,
				count
			);
		} catch (err) {
			next(err);
		}
	}

	async createPayPeriod(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, startDate, endDate } = req.body;

			checkValidation(req);

			const data: PayPeriodInterface = {
				companyId: companyId as string,
				startDate: new Date(startDate),
				endDate: new Date(endDate),
				copyEmployeeCostValueFromPriorPeriod: req.body.copyEmployeeCostValueFromPriorPeriod
			};

			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Pay Period',
				permission: ['add'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const payPeriodData = await payPeriodServices.createNewPayPeriod(data);

			return DefaultResponse(
				res,
				201,
				'Pay period created successfully',
				payPeriodData
			);
		} catch (err) {
			next(err);
		}
	}

	async editPayPeriod(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const { id } = req.params;
			const { companyId, startDate, endDate } = req.body;

			checkValidation(req);

			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Pay Period',
				permission: ['edit'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const newStartDate = new Date(startDate as string);
			const newEndDate = new Date(endDate as string);

			if (newEndDate < newStartDate) {
				throw new CustomError(400, 'Star date must be before end date');
			}

			const data = {
				id: id,
				companyId: companyId as string,
				startDate: newStartDate,
				endDate: newEndDate,
			};

			const payPeriodData = await payPeriodServices.editPayPeriod(data);

			return DefaultResponse(
				res,
				200,
				'Pay Period updated successfully',
				payPeriodData
			);
		} catch (err) {
			next(err);
		}
	}

	async getDisabledDate(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const disabledDate = await payPeriodServices.getAllPayPeriodDates(
				req.query.companyId as string
			);

			return DefaultResponse(res, 200, 'Pay Period Dates', disabledDate);
		} catch (err) {
			next(err);
		}
	}
}

export default new PayPeriodController();
