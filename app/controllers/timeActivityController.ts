/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import { companyRepository } from '../repositories';
import timeActivityServices from '../services/timeActivityServices';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import { logger } from '../utils/logger';
import { hasText } from '../utils/utils';
import { prisma } from '../client/prisma';

const Excel = require('excel4node');
// import moment from 'moment';
const dataExporter = require('json2csv').Parser;

class TimeActivityController {
	async getAllTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const {
				page = 1,
				limit = 10,
				search = '',
				classId = '',
				customerId = '',
				employeeId = '',
				type = '',
				sort = '',
				isOverHours = false,
				payPeriodId = '',
				companyId = '',
				year = '',
				closingDate = '',
			} = req.query;

			let _payPeriodId = payPeriodId as string;
			let systemPayPeriodId = false;

			if (!hasText(_payPeriodId)) {
				const payPeriodData = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						// endDate: {
						// 	gte: new Date(_date?.getFullYear(), _date?.getMonth(), 1),
						// 	lte: new Date(_date.getFullYear(), _date.getMonth() + 1, 0)
						// },
					},
					orderBy: {
						endDate: 'desc',
					},
				});

				if (payPeriodData && payPeriodData.id) {
					systemPayPeriodId = true;
					_payPeriodId = payPeriodData.id;
				}
			}

			if (hasText(_payPeriodId)) {
				const validatePayPeriod = await prisma.payPeriod.findFirst({
					where: {
						companyId: companyId as string,
						id: _payPeriodId as string,
					},
				});

				if (!validatePayPeriod) {
					throw new CustomError(400, 'Invalid PayPeriod');
				}
			}

			if (!companyId) {
				throw new CustomError(400, 'Company id is required');
			}

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(
				companyId as string
			);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Time Logs',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const { timeActivitiesWithHours, timeActivitiesCount } =
				await timeActivityServices.getAllTimeActivitiesServices({
					companyId: String(companyId),
					page: Number(page),
					limit: Number(limit),
					search: String(search),
					classId: String(classId),
					customerId: String(customerId),
					employeeId: String(employeeId),
					type: String(type),
					sort: String(sort),
					isOverHours:
						isOverHours === 'false'
							? false
							: isOverHours === 'true'
							? true
							: '',
					payPeriodId: String(_payPeriodId),
					year: String(year),
					closingDate,
				});

			return DefaultResponse(res, 200, 'Time Activities fetched successfully', {
				timeActivities: timeActivitiesWithHours,
				timeActivitiesCount: timeActivitiesCount,
				currentDatePayPeriod: systemPayPeriodId ? _payPeriodId : null,
			});
		} catch (err) {
			next(err);
		}
	}

	async syncTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const { companyId, payPeriodId } = req.body;

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// Checking is the user is permitted
			const isAddPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['add'],
			});

			// Checking is the user is permitted
			const isEditPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['edit'],
			});

			if (!isAddPermitted && !isEditPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			// Check if company is connected
			if (companyDetails.isConnected == false) {
				throw new CustomError(400, 'Company is not connected');
			}

			// Check if company is active
			if (companyDetails.status == false) {
				throw new CustomError(400, 'Company status is not active');
			}

			const payPeriodData = await prisma.payPeriod.findFirst({
				where: {
					id: payPeriodId,
				},
			});

			if (!payPeriodData) {
				throw new CustomError(400, 'Pay Period Not Found');
			}

			const data = await timeActivityServices.syncTimeActivityByLastSync(
				companyId,
				moment(payPeriodData.startDate).format('YYYY-MM-DD'),
				moment(payPeriodData.endDate).format('YYYY-MM-DD'),
				payPeriodData.id
			);
			// await timeActivityServices.syncTimeActivities(companyId);

			return DefaultResponse(
				res,
				200,
				'Time Activities synced successfully',
				data
			);
		} catch (err) {
			next(err);
		}
	}

	async updateTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const {
				timeActivityId,
				companyId,
				hours,
				minute,
				classId,
				className,
				customerId,
				customerName,
			} = req.body;

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['edit'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			// Update service
			const updatedTimeActivity = await timeActivityServices.updateTimeActivity(
				{
					timeActivityId,
					companyId,
					hours,
					minute,
					classId,
					className,
					customerId,
					customerName,
				}
			);

			return DefaultResponse(
				res,
				200,
				'Time activity updated successfully',
				updatedTimeActivity
			);
		} catch (err) {
			next(err);
		}
	}

	async createTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const {
				companyId,
				hours,
				minute,
				classId,
				className,
				customerId,
				customerName,
				activityDate,
				employeeId,
				payPeriodId,
			} = req.body;

			// Check If company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			const configuration = await prisma.configuration.findFirst({
				where: {
					payPeriodId,
					companyId,
				},
			});

			console.log(configuration);

			if (
				(!classId && configuration?.isClassRequiredForJournal) ||
				(!customerId && configuration?.isCustomerRequiredForJournal) ||
				!employeeId
			) {
				throw new CustomError(
					400,
					'ClassId, CustomerId and EmployeeId are required'
				);
			}

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['add'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			// Create service
			const createTimeActivity = await timeActivityServices.createTimeActivity({
				companyId,
				hours,
				minute,
				classId,
				className,
				customerId,
				customerName,
				activityDate,
				employeeId,
			});

			return DefaultResponse(
				res,
				201,
				'Time activity created successfully',
				createTimeActivity
			);
		} catch (err) {
			next(err);
		}
	}

	async bulkCreateTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const { companyId, activities } = req.body;

			// Check if company exists
			const companyDetails = await companyRepository.getDetails(companyId);
			if (!companyDetails) {
				throw new CustomError(404, 'Company not found');
			}

			// // Fetch the configuration for validation
			// const configuration = await prisma.configuration.findFirst({
			// 	where: { payPeriodId, companyId },
			// });

			const validationErrors: any[] = [];
			const validActivities: any[] = [];

			// Validate permissions
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['add'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			for (const activity of activities) {
				const { employeeId, activityDate } = activity;

				const missingFields: string[] = []; // Collect missing field names

				// Check if employeeId is missing
				if (
					employeeId === null ||
					employeeId === undefined ||
					employeeId === ''
				) {
					missingFields.push('EmployeeId');
				}

				// Check if activityDate is null, undefined, or empty string
				if (
					activityDate === null ||
					activityDate === undefined ||
					activityDate === ''
				) {
					missingFields.push('ActivityDate');
				}

				// If there are missing fields, add an error message for this activity
				if (missingFields.length > 0) {
					validationErrors.push({
						activity,
						error: `The following fields are missing: ${missingFields.join(
							', '
						)}`, // Single message with missing fields
					});
					continue; // Skip this activity and move to the next one
				}

				// Validate activity against the configuration
				// if (
				// 	(!classId && configuration?.isClassRequiredForJournal) ||
				// 	(!customerId && configuration?.isCustomerRequiredForJournal) ||
				// 	!employeeId
				// ) {
				// 	validationErrors.push({
				// 		activity,
				// 		error: 'ClassId, CustomerId, and EmployeeId are required',
				// 	});
				// 	continue;
				// }

				// If no fields are missing, add the activity to validActivities
				validActivities.push(activity);
			}

			// If there are valid activities, proceed to service
			if (validActivities.length > 0) {
				const createdActivities =
					await timeActivityServices.bulkCreateTimeActivities({
						companyId,
						activities: validActivities,
					});

				let message = 'Time activities created successfully';

				// Check if there are any validation errors
				if (validationErrors.length > 0) {
					message += `, but some activities failed validation (${validationErrors.length} errors)`;
				}

				return DefaultResponse(res, 201, message, {
					createdActivities,
					validationErrors,
				});
			} else {
				return DefaultResponse(res, 400, 'No valid activities to create', {
					validationErrors,
				});
			}
		} catch (err) {
			next(err);
		}
	}

	async deleteTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { timeActivityId, companyId } = req.body;
			checkValidation(req);

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['delete'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			await timeActivityServices.deleteTimeActivity({
				companyId: companyId,
				timeActivityId: timeActivityId,
			});

			return DefaultResponse(res, 200, 'Time Activity deleted successfully');
		} catch (err) {
			next(err);
		}
	}

	// Export Time Activity CSV
	async exportTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				search = '',
				classId = '',
				customerId = '',
				employeeId = '',
				payPeriodId = '',
				sort = '',
				type = '',
			} = req.query;

			const { timeActivities, companyDetails, payPeriodData } =
				await timeActivityServices.exportTimeActivity(
					companyId as string,
					search as string,
					classId as string,
					customerId as string,
					employeeId as string,
					payPeriodId as string,
					sort as string,
					type as string
				);

			const timeActivityData = JSON.parse(JSON.stringify(timeActivities));

			const fileHeader: any = [
				'Activity Date',
				'Employee Name',
				'Customer',
				'Class',
				'Hours',
			];

			const jsonData = new dataExporter({ fileHeader });

			let dateRange;

			let startDate;
			let endDate;
			if (payPeriodData) {
				startDate = moment(payPeriodData.startDate).format('MM/DD/YYYY');
				endDate = moment(payPeriodData.endDate).format('MM/DD/YYYY');
				dateRange = `${startDate} - ${endDate}`;
			} else {
				dateRange = 'All';
			}
			const extraData =
				`Report Name ,Time Logs\n` +
				`Period ,${dateRange}\n` +
				`QuickBooks Company's Name ,${companyDetails?.tenantName}\n` +
				`\n`;

			const csvData = jsonData.parse(timeActivityData);

			res.setHeader('Content-Type', 'text/csv');

			res.setHeader(
				'Content-Disposition',
				'attachment; filename=sample_data.csv'
			);

			return res.status(200).end(extraData + csvData);
		} catch (err) {
			next(err);
		}
	}

	// Export Pdf
	async exportTimeActivityPdf(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const htmlData = req.body.html;
			const fileName = req.body.fileName;

			const response = await axios.post(
				'https://pdf.satvasolutions.com/api/ConvertHtmlToPdf',
				{
					FileName: fileName,
					HtmlData: htmlData,
				}
			);

			return res.status(200).json({
				data: response.data,
			});
		} catch (err) {
			next(err);
		}
	}

	// Export Excel
	async exportTimeActivityExcel(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				search = '',
				classId = '',
				customerId = '',
				employeeId = '',
				startDate = '',
				endDate = '',
				payPeriodId = '',
				sort = '',
				type = '',
			} = req.query;

			let formattedStartDate = '';
			let formattedEndDate = '';

			if (startDate && endDate) {
				// Format start date
				const newStart: any = new Date(startDate as string);
				newStart.setUTCHours(0, 0, 0, 0);
				formattedStartDate = newStart.toISOString();

				// Format end date
				const newEnd: any = new Date(endDate as string);
				newEnd.setUTCHours(0, 0, 0, 0);
				formattedEndDate = newEnd.toISOString();
			}

			const { timeActivities, companyDetails } =
				await timeActivityServices.exportTimeActivity(
					companyId as string,
					search as string,
					classId as string,
					customerId as string,
					employeeId as string,
					payPeriodId as string,
					sort as string,
					type as string
				);

			// Create a new Excel workbook and worksheet
			const wb = new Excel.Workbook();
			const ws = wb.addWorksheet('Sheet 1');

			// Define Excel styles
			const boldTitleStyle = wb.createStyle({
				font: {
					bold: true,
					size: 14,
				},
				alignment: {
					horizontal: 'center',
				},
			});

			let fileName = '';
			let dateRange = '';
			if (startDate && endDate) {
				fileName =
					formattedStartDate === formattedEndDate
						? `${moment(formattedEndDate).format('MM-DD-YYYY')}`
						: `${moment(formattedStartDate).format('MM-DD-YYYY')} - ${moment(
								formattedEndDate
						  ).format('MM-DD-YYYY')}`;
				dateRange =
					formattedStartDate === formattedEndDate
						? `${moment(formattedEndDate).format('MM-DD-YYYY')}`
						: `${moment(formattedStartDate).format('MM-DD-YYYY')} - ${moment(
								formattedEndDate
						  ).format('MM-DD-YYYY')}`;
			} else {
				fileName = moment().format('MM-DD-YYYY');
				dateRange = 'All';
			}

			// Add the title (with bold formatting)
			ws.cell(1, 1, true).string('Report Name:');
			ws.cell(1, 2, true).string('Time Log Activity');

			ws.cell(2, 1).string('Period');
			ws.cell(2, 2).string(dateRange);
			ws.cell(3, 1).string("QuickBooks Company's Name");
			ws.cell(3, 2).string(companyDetails?.tenantName);

			// Add headers
			ws.cell(5, 1).string('Activity Date').style(boldTitleStyle);
			ws.cell(5, 2).string('Employee').style(boldTitleStyle);
			ws.cell(5, 3).string('Customer').style(boldTitleStyle);
			ws.cell(5, 4).string('Class').style(boldTitleStyle);
			ws.cell(5, 5).string('Hours').style(boldTitleStyle);

			// Add data from JSON
			timeActivities.forEach((item: any, index: any) => {
				ws.cell(index + 6, 1).string(item['Activity Date']);
				ws.cell(index + 6, 2).string(item['Class']);
				ws.cell(index + 6, 3).string(item['Customer']);
				ws.cell(index + 6, 4).string(item['Employee Name']);
				ws.cell(index + 6, 5).string(item['Hours']);
			});

			// Generate Excel file
			const excelFileName = `${fileName}.xlsx`;
			wb.write(excelFileName, (err: any) => {
				if (err) {
					logger.error('Error writing Excel file:', err);
					res.status(500).json({ error: 'Error generating Excel file' });
				} else {
					res.download(excelFileName, (err) => {
						if (err) {
							logger.error('Error sending Excel file:', err);
							res.status(500).json({ error: 'Error sending Excel file' });
						} else {
							// Clean up the Excel file after it's sent
							fs.unlinkSync(excelFileName);
						}
					});
				}
			});
		} catch (err) {
			next(err);
		}
	}

	async applyCustomRules(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			await timeActivityServices.applyCustomRules(
				req.query.payPeriodId as string,
				req.query.companyId as string
			);

			return DefaultResponse(res, 200, 'Rules applied successfully');
		} catch (error) {
			next(error);
		}
	}

	async updateBatchTimeActivity(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);

			const {
				companyId,
				search,
				classId,
				customerId,
				employeeId,
				payPeriodId,
			} = req.query;

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Time Logs',
				permission: ['edit'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const updated = await timeActivityServices.updateBatchTimeActivity(
				req.body,
				{
					companyId: companyId,
					search,
					classId,
					customerId,
					employeeId,
					payPeriodId,
				}
			);

			return DefaultResponse(
				res,
				200,
				'Time activities updated successfully.',
				updated
			);
		} catch (err) {
			next(err);
		}
	}

	async bulkDeleteTimeActivities(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId } = req.body;
			checkValidation(req);
			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId, {
				permissionName: 'Time Logs',
				permission: ['delete'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const result = await timeActivityServices.bulkDeleteTimeActivities(
				req.body
			);
			res.status(200).json({ success: true, deletedCount: result.count });
		} catch (err) {
			next(err);
		}
	}

	createOrUpdateTimelogMappingHistory = async (
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) => {
		try {
			const {
				companyId,
				headerMapping,
				employeeMapping,
				customerMapping,
				classMapping,
			} = req.body;

			// Consolidating all mappings into a single object
			const mappingData = {
				headerMapping,
				employeeMapping,
				customerMapping,
				classMapping,
			};

			// Call the service to create or update the history
			const mappingHistory =
				await timeActivityServices.createOrUpdateTimelogMappingHistory(
					companyId,
					mappingData
				);

			return DefaultResponse(
				res,
				200,
				'Timelog mapping history successfully created/updated',
				mappingHistory
			);
		} catch (err) {
			next(err);
		}
	};

	getTimelogMappingHistory = async (
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) => {
		try {
			const { companyId } = req.body; // Assuming companyId is passed as a query parameter

			// Fetch history by companyId or all history if no companyId is provided
			const result = await timeActivityServices.getTimelogMappingHistory(
				companyId
			);

			return res.status(200).json({
				message: 'Timelog mapping history fetched successfully',
				data: result,
			});
		} catch (err) {
			next(err);
		}
	};
}

export default new TimeActivityController();
