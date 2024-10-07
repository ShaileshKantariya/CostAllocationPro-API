import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import dashboardServices from '../services/dashboardServices';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { CustomError } from '../models/customError';

class DashboardController {
	// Salary Expense By PayPeriod
	async getSalaryExpenseByMonth(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, year } = req.query;

			const { data, labels, max } =
				await dashboardServices.getSalaryExpenseByPayPeriod(
					companyId as string,
					year as string
				);

			return DefaultResponse(res, 200, 'Journal fetched successfully', {
				data,
				labels,
				max,
			});
		} catch (err) {
			next(err);
		}
	}

	// Payroll Expense By Customer
	async getExpensesByCustomer(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId } = req.query;
			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}
			const expensesByCustomer = await dashboardServices.getExpensesByCustomer(
				companyId as string,
				req.query.year as string
			);
			return DefaultResponse(
				res,
				200,
				'Expenses by customers fetched successfully',
				expensesByCustomer
			);
		} catch (err) {
			next(err);
		}
	}

	// Cost Allocation Summary
	async getJournalGraphData(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId } = req.query;
			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const data = await dashboardServices.getAllJournalsWithPayPeriod(
				companyId as string,
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}

	// Current Fiscal Years Employee hours
	async getEmployeeHoursGraphData(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId } = req.query;
			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			const data = await dashboardServices.getEmployeeHoursGraphData(
				req.query.companyId as string,
				req.user?.id as string,
				req.query.year as string
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}
}

export default new DashboardController();
