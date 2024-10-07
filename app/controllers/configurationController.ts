import { NextFunction, Request, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import configurationRepository from '../repositories/configurationRepository';
import configurationServices from '../services/configurationServices';

class ConfigurationController {
	async getCompanyConfiguration(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company
			checkValidation(req);

			const companyId = req.query.companyId;
			const payPeriodId = req.query.payPeriodId;

			if (!payPeriodId) {
				throw new CustomError(400, 'PayPeriod Required');
			}

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);

			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			const configurationDetails =
				await configurationRepository.getCompanyConfiguration(
					companyId as string,
					payPeriodId as string
				);

			return DefaultResponse(
				res,
				200,
				'Configurations fetched successfully',
				configurationDetails
			);
		} catch (err) {
			next(err);
		}
	}

	async updateCompanyConfiguration(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			// Check validation for company
			checkValidation(req);

			const companyId = req.body.companyId;
			const payPeriodId = req.body.payPeriodId;

			const {
				settings,
				indirectExpenseRate,
				payrollMethod,
				decimalToFixedAmount,
				decimalToFixedPercentage,
				isClassRequiredForJournal,
				isCustomerRequiredForJournal
			} = req.body;

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			const data = {
				settings: settings,
				indirectExpenseRate: indirectExpenseRate,
				payrollMethod: payrollMethod,
				decimalToFixedAmount,
				decimalToFixedPercentage,
				payPeriodId,
				isClassRequiredForJournal,
				isCustomerRequiredForJournal
			};

			// Update configuration

			const updatedConfiguration =
				await configurationRepository.updateConfiguration(
					companyId,
					payPeriodId,
					data
				);

			return DefaultResponse(
				res,
				200,
				'Configurations updated successfully',
				updatedConfiguration
			);
		} catch (err) {
			next(err);
		}
	}
	async getFieldsSection(req: Request, res: Response, next: NextFunction) {
		try {
			const { companyId, payPeriodId } = req.query;
			const sections = await configurationServices.getFieldsSection(
				companyId as string,
				payPeriodId as string
			);

			sections.forEach((section) => {
				section.fields = section.fields.sort(
					(a, b) => (a.priority || 0) - (b.priority || 0)
				);
			});

			return DefaultResponse(
				res,
				200,
				'Section fields fetched successfully',
				sections
			);
		} catch (error) {
			next(error);
		}
	}
	async createField(req: Request, res: Response, next: NextFunction) {
		try {
			const { companyId, sectionId, payPeriodId, ...data } = req.body;
			checkValidation(req);
			const createdField = await configurationServices.createField(
				companyId,
				sectionId,
				payPeriodId,
				data
			);

			return DefaultResponse(
				res,
				200,
				'Field created successfully',
				createdField
			);
		} catch (error) {
			next(error);
		}
	}
	async deleteField(req: Request, res: Response, next: NextFunction) {
		try {
			const { fieldId, companyId, payPeriodId } = req.body;

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			checkValidation(req);
			const deletedField = await configurationServices.deleteField(
				fieldId,
				companyId,
				payPeriodId
			);
			return DefaultResponse(
				res,
				200,
				'Field deleted successfully',
				deletedField
			);
		} catch (error) {
			next(error);
		}
	}
	async updateField(req: Request, res: Response, next: NextFunction) {
		try {
			const { fieldId, fieldName } = req.body;
			checkValidation(req);
			const editedField = await configurationServices.updateField(
				fieldId,
				fieldName
			);
			return DefaultResponse(
				res,
				200,
				'Field updated successfully',
				editedField
			);
		} catch (error) {
			next(error);
		}
	}
}

export default new ConfigurationController();
