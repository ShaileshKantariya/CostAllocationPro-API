/* eslint-disable camelcase */
import axios from 'axios';
import url from 'url';
import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';

class ZohoService {
    async generateToken(zohoUrl: string) {
        const urlTest = url.parse(zohoUrl, true);

        const axiosRes = await axios({
            url: 'https://accounts.zoho.com/oauth/v2/token',
            method: 'POST',
            params: {
                response_type: 'code',
                client_id: process.env.ZOHO_CLIENT_ID,
                grant_type: 'authorization_code',
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                redirect_uri: process.env.ZOHO_REDIRECT_URL,
                code: urlTest.query?.code
            }
        });

        await prisma.zohoDetails.deleteMany();

        const create = await prisma.zohoDetails.create({
            data: {
                accessToken: axiosRes.data.access_token,
                refreshToken: axiosRes.data.refresh_token || '',
                scope: axiosRes.data.scope,
                apiDomain: axiosRes.data.api_domain
            }
        })
        return create
    }

    async createHostedPage(companyId: string) {

        const subscriptionData = await prisma.subscription.findFirst({
            where: {
                companyId
            }
        });

        if (!subscriptionData) {
            return `${process.env.DEFAULT_ZOHO_PLAN}`
        }

        await this.refreshToken();

        const findTokenDetails = await prisma.zohoDetails.findFirst();

        if(!findTokenDetails) {
            throw new CustomError(400, 'Token details not found');
        }

        const createHostedPayMentPage = await axios({
            url: 'https://www.zohoapis.com/subscriptions/v1/hostedpages/newsubscription',
            method: 'post',
            headers: {
                'Authorization': `Zoho-oauthtoken ${findTokenDetails.accessToken}`,
                'X-com-zoho-subscriptions-organizationid': `${process.env.ZOHO_ORGANIZATION_ID}`,
            },
            data: {
                'customer_id': subscriptionData?.zohoCustomerId,
                'plan': {
                    'plan_code': process.env.ZOHO_PLAN_CODE
                }
            }
        });

        return createHostedPayMentPage.data.hostedpage.url

    }

    async refreshToken() {
        const findTokenDetails = await prisma.zohoDetails.findFirst();

        if (!findTokenDetails) {
            throw new CustomError(400, 'Token details not found');
        }

        const res = await axios({
            url: 'https://accounts.zoho.com/oauth/v2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: {
                'refresh_token': findTokenDetails.refreshToken,
                'client_id': process.env.ZOHO_CLIENT_ID,
                'client_secret': process.env.ZOHO_CLIENT_SECRET,
                'redirect_uri': 'http://www.zoho.com/subscriptions',
                'grant_type': 'refresh_token'
            }
        });

        await prisma.zohoDetails.update({
            where: {
                id: findTokenDetails.id
            },
            data: {
                accessToken: res.data.access_token
            }
        })
    }

    async getSubscriptionDetailsById(subscriptionId: string) {
        await this.refreshToken();

        const findTokenDetails = await prisma.zohoDetails.findFirst();

        if (!findTokenDetails) {
            throw new CustomError(400, 'Token details not found');
        }

        const subscriptionDetails = await axios({
            url: `https://www.zohoapis.com/subscriptions/v1/subscriptions/${subscriptionId}`,
            method: 'get',
            headers: {
                'Authorization': `Zoho-oauthtoken ${findTokenDetails.accessToken}`,
                'X-com-zoho-subscriptions-organizationid': `${process.env.ZOHO_ORGANIZATION_ID}`,
            }
        });

        return subscriptionDetails.data
    }
}

export default new ZohoService();