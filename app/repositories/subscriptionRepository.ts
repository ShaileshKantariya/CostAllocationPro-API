import { prisma } from '../client/prisma';

class SubscriptionRepository {
    async createSubscription(data: any) {
        return prisma.subscription.create({
            data
        });
    }

    async updateSubscription(id: string, data: any) {
        return prisma.subscription.update({
            where: {
                id
            },
            data
        });
    }

    async updateOrCreateSubscriptionByCompanyId(companyId: string, data: any) {

        const findSubscription = await prisma.subscription.findFirst({
            where: {
                companyId
            }
        });

        if (findSubscription) {
            return prisma.subscription.updateMany({
                where: {
                    companyId: companyId,
                    userId: data.userId
                },
                data
            });
        }

        await prisma.subscription.create({
            data: {
                ...data,
                companyId
            }
        })

    }

    async findSubscriptionByUserId(userId: string) {
        return prisma.subscription.findFirst({
            where: {
                userId
            }
        })
    }

    async findSubscriptionsByCompanyId(companyId: string) {
        return prisma.subscription.findMany({
            where: {
                companyId
            }
        })
    }

    async findSubscriptionsByAdminUser(userId: string) {
        return prisma.subscription.findMany({
            where: {
                userId
            }
        })
    }

    async findSubscriptionByUserIdWithNullCompany(userId: string) {
        return prisma.subscription.findFirst({
            where: {
                userId,
                companyId: null,
                status: {
                    in: ['live', 'trial']
                }
            }
        })
    }

    async getSubscriptionDetailsByCompanyIdOrUserId(companyId: string, userId: string) {

        return prisma.subscription.findMany({
            where: {
                OR: [
                    {
                        companyId
                    },
                    {
                        userId
                    }
                ]
            }
        })
    }

    async getSubscriptionDetailsByZohoSubscriptionId(subscriptionId: string) {
        return prisma.subscription.findFirst({
            where: {
                zohoSubscriptionId: subscriptionId
            }
        });
    }
}

export default new SubscriptionRepository();