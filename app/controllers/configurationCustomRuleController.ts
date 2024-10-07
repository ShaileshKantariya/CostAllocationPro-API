import { NextFunction, Request, Response } from 'express';
import configurationCustomRuleService from '../services/configurationCustomRuleService';
import { ICustomRuleQuery } from '../interfaces/customRuleInterface';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import { checkValidation } from '../helpers/validationHelper';

class ConfigurationCustomRuleController {
	async getListOfCustomRules(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await configurationCustomRuleService.getRulesList(
				req.query as unknown as ICustomRuleQuery
			);
			return DefaultResponse(res, 200, 'Rules fetched successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async getCustomRuleById(req: Request, res: Response, next: NextFunction) {
		try {
			const id = req.params.id;

			if (!id) {
				throw new CustomError(400, 'Id is required');
			}

			const companyId = req.query.companyId;

			if (!companyId) {
				throw new CustomError(400, 'CompanyId is required');
			}

			const data = await configurationCustomRuleService.getCustomRuleById(
				id,
				companyId as string
			);
			return DefaultResponse(res, 200, 'Rules fetched successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async createCustomRules(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			console.log(req.user);

			const data = await configurationCustomRuleService.saveCustomRule(
				req.body,
				req.user.id as string,
				null
			);
			return DefaultResponse(res, 200, 'Rule created successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async updateCustomRules(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const id = req.params.id;

			if (!id) {
				throw new CustomError(400, 'Id is required');
			}

			const data = await configurationCustomRuleService.saveCustomRule(
				req.body,
				req.user.id as string,
				id
			);
			return DefaultResponse(res, 200, 'Rules updated successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async updatePriority(req: Request, res: Response, next: NextFunction) {
		try {
			const companyId = req.query.companyId;
			const payPeriodId = req.query.payPeriodId;

			if (!companyId) {
				throw new CustomError(400, 'CompanyId is required');
			}

			if (!payPeriodId) {
				throw new CustomError(400, 'PayPeriodId is required');
			}

			const data = await configurationCustomRuleService.updatePriority(
				req.body,
				companyId as string,
				payPeriodId as string
			);
			return DefaultResponse(
				res,
				200,
				'Updated rule priority successfully',
				data
			);
		} catch (error) {
			next(error);
		}
	}

	async deleteCustomRuleById(req: Request, res: Response, next: NextFunction) {
		try {
			const id = req.params.id;

			if (!id) {
				throw new CustomError(400, 'Id is required');
			}

			const companyId = req.query.companyId;

			if (!companyId) {
				throw new CustomError(400, 'CompanyId is required');
			}

			const data = await configurationCustomRuleService.deleteCustomRuleById(
				id,
				companyId as string,
			);
			return DefaultResponse(res, 200, 'Deleted rule successfully', data);
		} catch (error) {
			next(error);
		}
	}
}

export default new ConfigurationCustomRuleController();
