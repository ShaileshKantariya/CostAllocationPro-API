import { NextFunction, Request, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import developerServices from '../services/developerServices';
import { CustomError } from '../models/customError';

class DeveloperController {
    async  deleteCompany(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { companyId, secret } = req.body;

            if (secret != 'gK8E22}RUyP[4((p7v43(Yn.KgrgLG') {
                throw new CustomError(401, 'Unauthorized');
            }

            await developerServices.deleteCompanyFromDb(companyId);            

            return DefaultResponse(res, 200, 'company deleted successfully');
        } catch (err) {
            next(err);
        }
    }
}

export default new DeveloperController();
