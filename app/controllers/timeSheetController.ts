import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import timeSheetServices from '../services/timeSheetServices';
import timeSheetRepository from '../repositories/timeSheetRepository';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { prisma } from '../client/prisma';
import fs from 'fs';
import archiver from 'archiver';
import path from 'path';
import { promises as fsPromise } from 'fs';
import moment from 'moment';

class TimeSheetController {
	// Get all time sheets
	async getAllTimeSheets(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const {
				companyId,
				page = 1,
				limit = 10,
				search = '',
				createdBy = '',
				type = '',
				sort = '',
				payPeriodId = '',
			} = req.query;

			const data = {
				companyId: companyId as string,
				payPeriodId: payPeriodId as string,
				page: Number(page),
				limit: Number(limit),
				search: String(search),
				createdBy: String(createdBy),
				type: String(type),
				sort: String(sort),
			};

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Time Sheets',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const timeSheets = await timeSheetServices.getAllTimeSheets(data);
			return DefaultResponse(
				res,
				200,
				'Time Sheets fetched successfully',
				timeSheets
			);
		} catch (err) {
			next(err);
		}
	}

	// Get time sheet deails
	async getTimeSheetDetails(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { id } = req.params;
			const timeSheetDetails = await timeSheetRepository.getTimeSheetDetails(
				id
			);

			if (!timeSheetDetails) {
				throw new CustomError(400, 'Time sheet not found');
			}

			// Checking is the user is permitted
			// const isPermitted = await checkPermission(req, companyId as string, {
			// 	permissionName: 'Time Sheets',
			// 	permission: ['view'],
			// });

			// if (!isPermitted) {
			// 	throw new CustomError(403, 'You are not authorized');
			// }

			return DefaultResponse(
				res,
				200,
				'Time Sheet fetched successfully',
				timeSheetDetails
			);
		} catch (err) {
			next(err);
		}
	}

	// Create a new time sheet
	async createTimeSheet(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);
			const { name, notes, status, companyId, payPeriodId } = req.body;

			const findExistingTimeSheet = await prisma.timeSheets.findUnique({
				where: {
					payPeriodId,
				},
				include: {
					timeActivities: true,
				},
			});

			if (findExistingTimeSheet) {
				// Checking is the user is permitted
				const isPermitted = await checkPermission(req, companyId as string, {
					permissionName: 'Time Sheets',
					permission: ['edit'],
				});

				if (!isPermitted) {
					throw new CustomError(403, 'You are not authorized');
				}
			} else {
				// Checking is the user is permitted
				const isPermitted = await checkPermission(req, companyId as string, {
					permissionName: 'Time Sheets',
					permission: ['add'],
				});

				if (!isPermitted) {
					throw new CustomError(403, 'You are not authorized');
				}
			}

			const data = {
				name: name,
				notes: notes,
				status: status,
				companyId: companyId,
				payPeriodId: payPeriodId,
				userId: req.user.id,
				findExistingTimeSheet: findExistingTimeSheet,
			};
			const createdTimeSheet = await timeSheetServices.createTimeSheet(data);
			return DefaultResponse(
				res,
				201,
				'Time sheet created successfully',
				createdTimeSheet
			);
		} catch (err) {
			next(err);
		}
	}

	// validate time sheet
	async validateTimeSheet(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			checkValidation(req);
			const { companyId, payPeriodId } = req.body;

			const isValid = await timeSheetServices.validateTimeSheet({ companyId, payPeriodId });
			return DefaultResponse(
				res,
				201,
				'Time sheet validated successfully',
				isValid
			);
		} catch (err) {
			next(err);
		}
	}

	// Email time sheet to employee
	async emailTimeSheet(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, timeSheetId } = req.body;
			const employeeList: any = req.body.employeeList;

			checkValidation(req);

			const timeSheetData = {
				timeSheetId: timeSheetId,
				employeeList: employeeList,
				companyId: companyId,
				userId: req.user.id,
			};

			await timeSheetServices.emailTimeSheet(timeSheetData);
			return DefaultResponse(res, 200, 'Email sent successfully');
		} catch (err) {
			next(err);
		}
	}

	// Get time sheet by pay period
	async getTimeSheetByPayPeriod(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const data = await timeSheetServices.getTimeSheetByPayPeriod(
				req.query.payPeriodId as string,
				req.query.companyId as string
			);

			return DefaultResponse(res, 200, 'Timesheet found', data);
		} catch (error) {
			next(error);
		}
	}

	// Get all employees by timesheet
	async getTimeSheetWiseEmployees(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { timeSheetId, companyId } = req.query;

			const employees = await timeSheetServices.getTimeSheetWiseEmployees(
				timeSheetId as string,
				companyId as string
			);

			return DefaultResponse(
				res,
				200,
				'Employees fetched successfully',
				employees
			);
		} catch (err) {
			next(err);
		}
	}

	// Export Time sheet pdf
	async exportTimeSheetPdf(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const { companyId, timeSheetId, employeeId, fileName } = req.body;

			checkValidation(req);

			const timeSheetData = {
				timeSheetId: timeSheetId,
				companyId: companyId,
				employeeId: employeeId,
			};

			const response = await timeSheetServices.exportTimeSheetPdf(
				timeSheetData
			);

			const base64Data = response.data;

			const buffer = Buffer.from(base64Data, 'base64');

			const filePath = path.join(
				__dirname,
				'..',
				'costAllocationPdfs',
				fileName + '.pdf'
			);

			await fsPromise.writeFile(filePath, buffer);

			return res.status(200).json({
				data: fileName + '.pdf',
			});
		} catch (err) {
			next(err);
		}
	}

	// Export Time sheet
	async exportTimeSheetZip(
		req: RequestExtended,
		res: Response,
		next: NextFunction
	) {
		try {
			const fileNames: any = req.body.fileNames;

			// Create a zip archive
			const archive = archiver('zip');
			archive.on('error', (err) => {
				res.status(500).send({ error: err.message });
			});

			// Set the response headers
			res.setHeader('Content-Type', 'application/zip');
			res.setHeader(
				'Content-Disposition',
				`attachment; filename=TimeSheet_${moment(new Date()).format(
					'MMDDYYYYhhmmss'
				)}.zip`
			);

			// Pipe the zip archive to the response object
			archive.pipe(res);

			// Iterate over the file names and append corresponding files to the archive
			fileNames.forEach((fileName: any) => {
				const filePath = path.join(
					__dirname,
					'..',
					'costAllocationPdfs',
					fileName
				);

				// Check if the file exists before appending to the archive

				if (fs.existsSync(filePath)) {
					archive.file(filePath, { name: fileName });
				} else {
					console.warn(`File not found: ${filePath}`);
				}
			});

			// Finalize the archive
			archive.finalize();

			archive.on('finish', async () => {
				fileNames.forEach((fileName: any) => {
					const filePath = path.join(
						__dirname,
						'..',
						'costAllocationPdfs',
						fileName
					);

					if (fs.existsSync(filePath)) {
						fsPromise.unlink(filePath);
					}
				});
			});
		} catch (err) {
			next(err);
		}
	}
}

export default new TimeSheetController();
