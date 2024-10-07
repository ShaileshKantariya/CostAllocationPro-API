import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import employeeServices from '../services/employeeServices';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';

class EmployeeController {
	async getAllEmployees(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company id
			checkValidation(req);

			const { page = 1, limit = 10, search, filter, type, sort } = req.query;

			const companyId = req.body.companyId;

			// Get all employees
			const employees = await employeeServices.getEmployees({
				page: Number(page),
				limit: Number(limit),
				search: String(search),
				filter: String(filter),
				type: String(type),
				sort: String(sort),
				companyId: companyId,
			});

			return DefaultResponse(
				res,
				200,
				'Employees fetched successfully',
				employees
			);
		} catch (err) {
			next(err);
		}
	}

	// Sync lambda call
	async syncEmployees(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			// Check validation for company id
			checkValidation(req);

			const companyId = req.body.companyId;
			// const payPeriodId = req.body.payPeriodId;

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Check if company is connected
			if (companyDetails.isConnected == false) {
				throw new CustomError(400, 'Company is not connected');
			}

			// Get new employees
			await employeeServices.syncEmployeesByLastSync(companyId);

			return DefaultResponse(res, 200, 'Employees synced successfully');
		} catch (err) {
			next(err);
		}
	}

	// async syncEmployees(req: RequestExtended, res: Response, next: NextFunction) {
	// 	try {
	// 		// Check validation for company id
	// 		checkValidation(req);

	// 		const companyId = req.body.companyId;

	// 		// Get new employees
	// 		const updatedEmployees = await employeeServices.syncEmployeesByLastSync(
	// 			companyId
	// 		);

	// 		return DefaultResponse(
	// 			res,
	// 			200,
	// 			'Employees synced successfully',
	// 			updatedEmployees
	// 		);
	// 	} catch (err) {
	// 		next(err);
	// 	}
	// }
}

export default new EmployeeController();
