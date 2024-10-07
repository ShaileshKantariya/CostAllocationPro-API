import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import customClassMappingRepository from '../repositories/customClassMappingRepository';

class CustomClassMappingService {

    async createCustomClassMapping(data: any, user: any) {

        data.createdBy = user.id;
        data.updatedBy = user.id;

        const companyId = data.companyId;
        // const payPeriodId = req.body.payPeriodId;

        // Check If company exists
        const companyDetails = await companyRepository.getDetails(companyId);
        if (!companyDetails) {
            throw new CustomError(400, 'Company not found');
        }

        // Check if company is connected
        if (companyDetails.isConnected == false) {
            throw new CustomError(400, 'Company is not connected');
        }

        const payPeriodData = await prisma.payPeriod.findFirst({
            where: {
                companyId: data.companyId,
                id: data.payPeriodId
            }
        });

        if (!payPeriodData) {
            throw new CustomError(400, 'Invalid pay period Id');
        }

        await customClassMappingRepository.createCustomClassMapping(data); 

        console.log('Custom class code');

        return {
            success: true
        }

    }


    async getCustomClassMapping(data: any) {

        // Check If company exists
        const companyDetails = await companyRepository.getDetails(data.companyId);
        if (!companyDetails) {
            throw new CustomError(400, 'Company not found');
        }

        // Check if company is connected
        if (companyDetails.isConnected == false) {
            throw new CustomError(400, 'Company is not connected');
        }

        const payPeriodData = await prisma.payPeriod.findFirst({
            where: {
                companyId: data.companyId,
                id: data.payPeriodId
            }
        });

        if (!payPeriodData) {
            throw new CustomError(400, 'Invalid pay period Id');
        }

        const customClassMapping:any=await customClassMappingRepository.getCustomClassMapping(data);

        return {
            success: true,
            customClassMapping: customClassMapping[0].classMapping
        }

    }

}

export default new CustomClassMappingService()