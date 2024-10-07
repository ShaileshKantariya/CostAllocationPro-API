import { NextFunction, Request, Response } from 'express';
import customRuleService from '../services/customRuleService';
import { ICustomRuleQuery } from '../interfaces/customRuleInterface';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import { checkValidation } from '../helpers/validationHelper';

class CustomRuleController {

    async getListOfCustomRules(req: Request, res: Response, next: NextFunction) {

        try {
            const data = await customRuleService.getCustomRuleList(req.query as unknown as ICustomRuleQuery)
            return DefaultResponse(res, 200, 'Rules fetched successfully', data);
        } catch (error) {
            next(error);
        }

    }

    async getSplitCustomRuleList(req: Request, res: Response, next: NextFunction) {

        try {
            const data = await customRuleService.getSplitCustomRuleList(req.query as unknown as ICustomRuleQuery)
            return DefaultResponse(res, 200, 'Rules fetched successfully', data);
        } catch (error) {
            next(error);
        }

    }

    async getEditCustomRuleList(req: Request, res: Response, next: NextFunction) {

        try {
            const data = await customRuleService.getEditCustomRuleList(req.query as unknown as ICustomRuleQuery)
            return DefaultResponse(res, 200, 'Rules fetched successfully', data);
        } catch (error) {
            next(error);
        }

    }

    async getDeleteCustomRuleList(req: Request, res: Response, next: NextFunction) {

        try {
            const data = await customRuleService.getDeleteCustomRuleList(req.query as unknown as ICustomRuleQuery)
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

            if(!companyId) {
                throw new CustomError(400, 'CompanyId is required');
            }

            const data = await customRuleService.getCustomRuleById(id, companyId as string);
            return DefaultResponse(res, 200, 'Rules fetched successfully', data);
        } catch (error) {
            next(error);
        }

    }

    async createCustomRules(req: RequestExtended, res: Response, next: NextFunction) {

        try {

            checkValidation(req);

            console.log(req.user);

            const data = await customRuleService.saveCustomRule(req.body, req.user.id as string, null);
            return DefaultResponse(res, 200, 'Rule created successfully', data);
        } catch (error) {
            next(error);
        }

    }


    async updateCustomRules(req: RequestExtended, res: Response, next: NextFunction) {

        try {

            const id = req.params.id;

            if(!id) {
                throw new CustomError(400, 'Id is required');
            }

            const data = await customRuleService.saveCustomRule(req.body, req.user.id as string, id);
            return DefaultResponse(res, 200, 'Rules updated successfully', data);
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

            const data = await customRuleService.deleteCustomRuleById(id, companyId as string);
            return DefaultResponse(res, 200, 'Deleted rule successfully', data);
        } catch (error) {
            next(error);
        }

    }

    async updatePriority(req: Request, res: Response, next: NextFunction) {

        try {

            const companyId = req.query.companyId;

            if (!companyId) {
                throw new CustomError(400, 'CompanyId is required');
            }

            const data = await customRuleService.updatePriority(req.body, companyId as string);
            return DefaultResponse(res, 200, 'Updated rule priority successfully', data);
        } catch (error) {
            next(error);
        }

    }



}

export default new CustomRuleController();