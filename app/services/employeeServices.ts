/* eslint-disable no-mixed-spaces-and-tabs */
import moment from 'moment-timezone';
import { prisma } from '../client/prisma';
import { CustomError } from '../models/customError';
import quickbooksClient from '../quickbooksClient/quickbooksClient';
import { companyRepository, employeeRepository } from '../repositories';
import quickbooksServices from './quickbooksServices';
// import configurationRepository from '../repositories/configurationRepository';
import { QuickBooksEmployee } from '../interfaces/quickbooksInterfaces';
import EmployeeInterface from '../interfaces/employeeInterface';

interface EmployeeDataInterface {
	page?: number;
	limit?: number;
	search?: string;
	filter?: string;
	type?: string;
	sort?: string;
	companyId: string;
}

interface EmployeeSyncInterface {
	accessToken: string;
	refreshToken: string;
	tenantId: string;
	companyId: string;
}

class EmployeeServices {
	async getEmployees(employeeData: EmployeeDataInterface) {
		try {
			const { companyId } = employeeData;

			// Check if company exists or not
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Get all employees by company id
			const employees = await employeeRepository.getAllEmployeesByCompanyId(
				companyId
			);
			return employees;
		} catch (err) {
			throw err;
		}
	}

	async syncEmployeeFirstTime(employeeData: EmployeeSyncInterface) {
		// Get all employees from the quickbooks

		const employees: any = await quickbooksClient.getEmployees(
			employeeData?.accessToken,
			employeeData?.tenantId,
			employeeData?.refreshToken
		);

		let employeeArr = [];
		if (employees && employees?.QueryResponse?.Employee?.length > 0) {
			employeeArr = await Promise.all(
				employees?.QueryResponse?.Employee?.map(
					async (employee: QuickBooksEmployee) => {
						const data: EmployeeInterface = {
							employeeId: employee?.Id,
							fullName: employee?.DisplayName?.replace(' (deleted)', ''),
							email: employee?.PrimaryEmailAddr?.Address ?? '',
							phone: employee?.PrimaryPhone?.FreeFormNumber ?? '',
							active: employee?.Active,
							companyId: employeeData?.companyId,
						};

						// Update or create employee in db
						return await employeeRepository.updateOrCreateEmployee(
							employee?.Id,
							employeeData?.companyId,
							data
						);
					}
				)
			);
		}

		// Update employee last sync date
		await prisma.company.update({
			where: {
				id: employeeData?.companyId,
			},
			data: {
				employeeLastSyncDate: moment(new Date())
					.tz('America/Los_Angeles')
					.format(),
			},
		});

		return employeeArr;
	}

	// Will be called on sync now button
	async syncEmployeesByLastSync(companyId: string) {
		try {
			// Check if company exists or not
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Get access token
			const authResponse = await quickbooksServices.getAccessToken(companyId);

			// DO NOT REMOVE THIS CODE

			// LAMBDA FUNCTION CALL

			// const syncData = await axios.post(
			// 	config.employeeSyncLambdaEndpoint,
			// 	{
			// 		accessToken: authResponse?.accessToken,
			// 		refreshToken: authResponse?.refreshToken,
			// 		tenantID: authResponse?.tenantID,
			// 		companyId: companyId,
			// 		employeeLastSyncDate: companyDetails?.employeeLastSyncDate,
			// 	},
			// 	{
			// 		headers: {
			// 			'x-api-key': config.employeeSyncLambdaApiKey,
			// 			'Content-Type': 'application/json',
			// 		},
			// 	}
			// );

			// return syncData?.data;

			// LAMBDA FUNCTION CALL

			// For local API

			// Get employees by last sync from Quickbooks

			const newEmployees: any = await quickbooksClient?.getEmployeesByLastSync(
				authResponse?.accessToken as string,
				authResponse?.tenantID as string,
				authResponse?.refreshToken as string,
				companyDetails?.employeeLastSyncDate as Date,
				companyId as string
			);

			// If new records found

			const employeeArr = [];
			if (newEmployees?.QueryResponse?.Employee?.length > 0) {
				// const sectionWithFields =
				// 	await configurationRepository.getConfigurationField(companyId, payPeriodId);
				// const sectionFields = sectionWithFields.reduce(
				// 	(accumulator: any, section) => {
				// 		accumulator.push(...section.fields);
				// 		return accumulator;
				// 	},
				// 	[]
				// );

				const listOfFields = await prisma.field.findMany({
					where: {
						companyId
					}
				})

				for (
					let i = 0;
					i < newEmployees?.QueryResponse?.Employee?.length;
					i++
				) {
					const employee = newEmployees?.QueryResponse?.Employee[i];
					const employeeData: any = {
						employeeId: employee?.Id,
						fullName: employee?.DisplayName?.replace(' (deleted)', ''),
						email: employee?.PrimaryEmailAddr?.Address ?? '',
						phone: employee?.PrimaryPhone?.FreeFormNumber ?? '',
						active: employee?.Active,
						companyId: companyId,
					};

					// listOfFields[0].payPeriodId

					// Update or create employee in db
					const result = await employeeRepository.updateOrCreateEmployee(
						employee?.Id,
						companyId,
						employeeData,
						listOfFields
					);
					employeeArr.push(result);
				}

				// employeeArr = await Promise.all(
				// 	newEmployees?.QueryResponse?.Employee?.map(async (employee: any) => {
				// 		const employeeData: any = {
				// 			employeeId: employee?.Id,
				// 			fullName: employee?.DisplayName?.replace(' (deleted)', ''),
				// 			email: employee?.PrimaryEmailAddr?.Address ?? '',
				// 			phone: employee?.PrimaryPhone?.FreeFormNumber ?? '',
				// 			active: employee?.Active,
				// 			companyId: companyId,
				// 		};

				// 		// Update or create employee in db
				// 		return await employeeRepository.updateOrCreateEmployee(
				// 			employee?.Id,
				// 			companyId,
				// 			employeeData,
				// 			sectionFields
				// 		);
				// 	})
				// );
			}

			// Update employee last sync date
			await prisma.company.update({
				where: {
					id: companyId,
				},
				data: {
					employeeLastSyncDate: moment(new Date())
						.tz('America/Los_Angeles')
						.format(),
				},
			});
			return employeeArr;
		} catch (err) {
			throw err;
		}
	}
}

export default new EmployeeServices();
