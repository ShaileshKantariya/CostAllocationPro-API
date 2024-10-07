import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import employeeConfigService from '../services/employeeConfigService';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';

class EmployeeConfigController {

    async getExistingEmployeeConfig(req: RequestExtended, res: Response, next: NextFunction) {
        try {

            const { employeeId, payPeriodId, companyId } = req.query;

            const data = await employeeConfigService.getExistingEmployeeConfig(employeeId as string, payPeriodId as string, companyId as string);

            return DefaultResponse(res, 200, '', data);

        } catch (error) {
            next(error);
        }
    }


    async createEmployeeConfig(req: RequestExtended, res: Response, next: NextFunction) {
        try {
            checkValidation(req);
            const body = req.body;

            const data = await employeeConfigService.createEmployeeConfig(body, req.user);

            return DefaultResponse(res, 200, '', data);

        } catch (error) {
            next(error);
        }
    }

}

export default new EmployeeConfigController()