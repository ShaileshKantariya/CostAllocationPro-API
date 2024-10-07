import { prisma } from '../client/prisma';
import { ICancelZohoSubscription, ISubscriptionQuery, IZohoSubscription } from '../interfaces/subscriptionInterface';
import { CustomError } from '../models/customError';
import { subscriptionRepository } from '../repositories';

class SubscriptionService {
    async getSubscriptionDetails(query: ISubscriptionQuery) {

        // const companyRole = await prisma.companyRole.findFirst({
        //     where: {
        //         userId: query.userId,
        //         companyId: query.companyId
        //     }
        // });

        // if(!companyRole) {
        //     throw new CustomError(400, 'You are not authorized to access details of this company');
        // }
        
        const subscriptionData = await subscriptionRepository.findSubscriptionsByAdminUser(query.userId);

        // const role = await prisma.role.findFirstOrThrow({
        //     where: {
        //         id: companyRole.roleId
        //     }
        // })

        // if(role.isCompanyAdmin) {
        //     subscriptionData = await subscriptionRepository.findSubscriptionsByAdminUser(query.userId);
        // } else {
        //     subscriptionData = await subscriptionRepository.findSubscriptionsByCompanyId(query.companyId);
        // }

        return subscriptionData;

    }

    async cancelSubscription(data: ICancelZohoSubscription) {

        const subscriptionData = await subscriptionRepository.getSubscriptionDetailsByZohoSubscriptionId(data.subscription_id);

        if(!subscriptionData) {
            throw new CustomError(400, 'Subscription not found');
        }

        await prisma.subscription.updateMany({
            where: {
                zohoSubscriptionId: data.subscription_id
            },
            data: {
                status: data.status
            }
        })

        if(subscriptionData.companyId) {
            await prisma.company.update({
                where: {
                    id: subscriptionData.companyId
                },
                data: {
                    isConnected: false,
                    status: false
                }
            })
        }

    }

    async renewSubscription(data: IZohoSubscription) {

        const subscriptionData = await subscriptionRepository.getSubscriptionDetailsByZohoSubscriptionId(data.subscription_id);

        if (!subscriptionData) {
            throw new CustomError(400, 'Subscription not found');
        }

        await prisma.subscription.updateMany({
            where: {
                zohoSubscriptionId: data.subscription_id
            },
            data: {
                status: data.status,
                expiresAt: data.expires_at,
            }
        })

    }

    async reactiveSubscription(data: IZohoSubscription) {

        const subscriptionData = await subscriptionRepository.getSubscriptionDetailsByZohoSubscriptionId(data.subscription_id);

        if (!subscriptionData) {
            throw new CustomError(400, 'Subscription not found');
        }

        await prisma.subscription.updateMany({
            where: {
                zohoSubscriptionId: data.subscription_id
            },
            data: {
                status: data.status,
                expiresAt: data.expires_at,
            }
        });

        if (subscriptionData.companyId) {
            await prisma.company.update({
                where: {
                    id: subscriptionData.companyId
                },
                data: {
                    status: true
                }
            })
        }

    }

    async expireSubscription(data: IZohoSubscription) {

        const subscriptionData = await subscriptionRepository.getSubscriptionDetailsByZohoSubscriptionId(data.subscription_id);

        if (!subscriptionData) {
            throw new CustomError(400, 'Subscription not found');
        }

        await prisma.subscription.updateMany({
            where: {
                zohoSubscriptionId: data.subscription_id
            },
            data: {
                status: data.status,
                expiresAt: data.expires_at,
            }
        })

    }
}

export default new SubscriptionService();