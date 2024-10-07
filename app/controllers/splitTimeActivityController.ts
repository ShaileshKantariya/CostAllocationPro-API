import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import { companyRepository } from '../repositories';
import { CustomError } from '../models/customError';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import splitTimeActivityServices from '../services/splitTimeActivityServices';
import timeActivityRepository from '../repositories/timeActivityRepository';

class SplitTimeActivityController {
	async getAllSplitTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, parentActivityId } = req.query;

			if (!companyId) {
				throw new CustomError(404, 'Company id is required');
			}

			if (!parentActivityId) {
				throw new CustomError(404, 'Parent time activity id is required');
			}

			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			const data = {
				companyId: companyId,
				parentActivityId: parentActivityId,
			};

			const timeActivityDetails =
				await timeActivityRepository.getTimeActivityDetails(data);

			if (!timeActivityDetails) {
				throw new CustomError(404, 'Time activity not found');
			}

			return DefaultResponse(
				res,
				200,
				'Time activity fetched successfully',
				timeActivityDetails
			);
		} catch (err) {
			next(err);
		}
	}

	async createSplitTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { parentActivityId, employeeId, timeActivityData } = req.body;

			checkValidation(req);

			if (timeActivityData.length === 0) {
				throw new CustomError(
					400,
					'Time activity data array must not be empty'
				);
			}

			const splitActivities =
				await splitTimeActivityServices.createSplitTimeActivity(
					parentActivityId,
					employeeId,
					timeActivityData
				);

			return DefaultResponse(
				res,
				201,
				'Split activity created successfully',
				splitActivities
			);
		} catch (err) {
			next(err);
		}
	}

	async deleteSplitTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { splitTimeActivityId } = req.body;

			checkValidation(req);

			const deletedActivity =
				await splitTimeActivityServices.deleteSplitTimeActivity({
					splitTimeActivityId: splitTimeActivityId,
				});

			return DefaultResponse(
				res,
				200,
				'Split activity deleted successfully',
				deletedActivity
			);
		} catch (err) {
			next(err);
		}
	}

	async deleteAllSplitTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { timeActivityId } = req.body;

			checkValidation(req);

			const deletedActivity =
				await splitTimeActivityServices.deleteAllSplitTimeActivity({
					timeActivityId: timeActivityId,
				});

			return DefaultResponse(
				res,
				200,
				'Split activity deleted successfully',
				deletedActivity
			);
		} catch (err) {
			next(err);
		}
	}
}

export default new SplitTimeActivityController();
