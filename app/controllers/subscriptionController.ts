import { NextFunction, Response, Request } from 'express';
import { RequestExtended } from '../interfaces/global';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
// import { CustomError } from '../models/customError';
import subscriptionService from '../services/subscriptionService';

class SubscriptionController {
    async getLoggedInCompanySubscriptionDetails(
        req: RequestExtended,
        res: Response,
        next: NextFunction
    ) {
        try {
            // if (!req.query?.companyId) {
            //     throw new CustomError(400, 'Company Id is required');
            // }

            const data = await subscriptionService.getSubscriptionDetails({
                userId: req.user.id as string,
                // companyId: req.query.companyId as string
            });
            return DefaultResponse(res, 200, 'Subscription fetched successfully', data);
        } catch (error) {
            next(error);
        }
    }

    async cancelSubscription(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            
            const { data } = req.body;

            if(data) {
                await subscriptionService.cancelSubscription(data.subscription)
            }


            return DefaultResponse(res, 200, 'Subscription canceled successfully', { success: true });
        } catch (error) {
            next(error);
        }
    }

    async renewSubscription(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            const { data } = req.body;

            if (data) {
                await subscriptionService.renewSubscription(data.subscription)
            }


            return DefaultResponse(res, 200, 'Subscription canceled successfully', { success: true });
        } catch (error) {
            next(error);
        }
    }

    async reactiveSubscription(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            const { data } = req.body;

            if (data) {
                await subscriptionService.renewSubscription(data.subscription)
            }


            return DefaultResponse(res, 200, 'Subscription canceled successfully', { success: true });
        } catch (error) {
            next(error);
        }
    }

    async expireSubscription(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {

            const { data } = req.body;

            if (data) {
                await subscriptionService.expireSubscription(data.subscription)
            }


            return DefaultResponse(res, 200, 'Subscription canceled successfully', { success: true });
        } catch (error) {
            next(error);
        }
    }
}

export default new SubscriptionController();