import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import customClassMappingService from '../services/customClassMappingService';

class customClassMappingController {




    async createCustomClassMapping(req: RequestExtended, res: Response, next: NextFunction) {
        try {
            checkValidation(req);
            const body = req.body;

            const data = await customClassMappingService.createCustomClassMapping(body, req.user);

            return DefaultResponse(res, 200, '', data);

        } catch (error) {
            next(error);
        }
    }

    async getCustomClassMapping(req: RequestExtended, res: Response, next: NextFunction) {
        try {
            checkValidation(req);
            const body = {
                companyId: req.query.companyId,
                payPeriodId: req.query.payPeriodId
            
            };

            const data = await customClassMappingService.getCustomClassMapping(body);

            return DefaultResponse(res, 200, '', data);

        } catch (error) {
            next(error);
        }
    }

}

export default new customClassMappingController()