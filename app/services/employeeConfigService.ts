import { prisma } from '../client/prisma';
import { EmployeeConfigInterface } from '../interfaces/employeeConfigInterface';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import { hasText } from '../utils/utils';

class EmployeeConfigService {
	async getExistingEmployeeConfig(
		employeeId: string,
		payPeriodId: string,
		companyId: string
	) {
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
				companyId,
				id: payPeriodId,
			},
		});

		if (!payPeriodData) {
			throw new CustomError(400, 'Invalid pay period Id');
		}

		const employeeConfig = await prisma.employeeDirectAllocationConfig.findMany(
			{
				where: {
					employeeId,
					payPeriodId,
					companyId,
				},
			}
		);

		return employeeConfig;
	}

	async createEmployeeConfig(data: EmployeeConfigInterface, user: any) {
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
				id: data.payPeriodId,
			},
		});

		if (!payPeriodData) {
			throw new CustomError(400, 'Invalid pay period Id');
		}

		if (!data.directAllocation.length) {
			throw new CustomError(400, 'Direct allocation can not be empty');
		}

		const configuration = await prisma.configuration.findFirst({
			where: {
				companyId,
				payPeriodId: payPeriodData.id,
			},
		});

		let hasClassOrCustomerError = false;
		let totalAllocation = 0;

		data.directAllocation.forEach((e) => {
			if (!hasText(e.classId) && configuration?.isClassRequiredForJournal) {
				hasClassOrCustomerError = true;
			}

			if (!hasText(e.customerId) && configuration?.isCustomerRequiredForJournal) {
				hasClassOrCustomerError = true;
			}

			totalAllocation = totalAllocation + Number(e.allocation);
		});

		if (hasClassOrCustomerError) {
			throw new CustomError(
				400,
				'Some of the entries missing class or customer'
			);
		}

		if (totalAllocation != 100) {
			throw new CustomError(
				400,
				'Sum of total allocation should be equal to 100'
			);
		}

		await prisma.employeeDirectAllocationConfig.deleteMany({
			where: {
				employeeId: data.employeeId,
				payPeriodId: data.payPeriodId,
				companyId: data.companyId,
			},
		});

		const allocations = data.directAllocation.map((allocation) => {
			return {
				companyId: data.companyId,
				payPeriodId: data.payPeriodId,
				allocation: Number(allocation.allocation),
				classId: allocation.classId,
				customerId: allocation.customerId,
				className: allocation.className,
				customerName: allocation.customerName,
				isActive: data.isActive,
				employeeId: data.employeeId,
				createdBy: data.createdBy,
				updatedBy: data.updatedBy,
			};
		});

		await prisma.employeeDirectAllocationConfig.createMany({
			data: allocations,
		});

		return {
			success: true,
		};
	}
}

export default new EmployeeConfigService();
