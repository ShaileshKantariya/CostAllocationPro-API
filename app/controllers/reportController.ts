import { NextFunction, Request, Response } from 'express';
import reportService from '../services/reportService';
import {
	ICustomerExpenseReportQuery,
	ITimeActivitySummaryQuery,
} from '../interfaces/reportInterface';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { CustomError } from '../models/customError';
import { promises as fs } from 'fs';
import path from 'path';
import moment from 'moment';
import { companyRepository } from '../repositories';
import payPeriodRepository from '../repositories/payPeriodRepository';
class ReportController {
	async getTimeActivitySummaryReport(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const companyDetails= await companyRepository.getDetails(req.query?.companyId as string)
			if(!companyDetails){
				throw new CustomError(400, 'Valid Company Id is required');
			}

			if(req?.query?.payPeriodId){
				const payPeriodDetails =await  payPeriodRepository.getDetails(req?.query?.payPeriodId as string, req.query?.companyId as string)
				if (!payPeriodDetails){
					throw new CustomError(400, 'Valid payPeriod Id is required');
				}
			}

			if (req.query?.year) {
				const year = req.query.year;

				if (isNaN(Number(year)) || year.length !== 4 || (year as any)[0]=== '0') {
					throw new CustomError(400, 'Enter a valid 4-digit year that does not start with 0');
				}
			}


			const data = await reportService.getTimeActivitySummaryReport(
				req.query as unknown as ITimeActivitySummaryQuery
			);
			return DefaultResponse(res, 200, 'Report fetched successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async getExpensesByCustomerReport(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const data = await reportService.getExpensesByCustomerReport(
				req.query as unknown as ICustomerExpenseReportQuery
			);
			return DefaultResponse(res, 200, 'Report fetched successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async getTimeActivitySummaryReportPdf(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const data = await reportService.getTimeActivitySummaryReport(
				req.query as unknown as ITimeActivitySummaryQuery
			);

			const stream = await reportService.getTimeActivitySummaryReportPdf(
				data,
				req.query as unknown as ITimeActivitySummaryQuery
			);

			const filePath = path.join(
				__dirname,
				'..',
				'costAllocationPdfs',
				`${new Date().getUTCDate()}time-summary-report.pdf`
			);
			stream.on('close', async () => {
				const data = await fs.readFile(filePath);

				const base64String = Buffer.from(data).toString('base64');

				await fs.unlink(filePath);

				res.status(200).json({
					data: base64String,
				});
			});
		} catch (err) {
			next(err);
		}
	}

	async getTimeActivitySummaryReportCsv(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const data = await reportService.getTimeActivitySummaryReport(
				req.query as unknown as ITimeActivitySummaryQuery
			);

			const csvData = await reportService.getTimeActivitySummaryReportCsv(
				data,
				req.query
			);

			res.setHeader('Content-Type', 'text/csv');

			const fileName = moment(new Date()).format('MMDDYYYYhhmmss');

			res.setHeader(
				'Content-Disposition',
				`attachment; filename=TimeActivitySummaryReport_${fileName}.csv`
			);

			return res.status(200).end(csvData);
		} catch (err) {
			next(err);
		}
	}

	async getAllPublishedPayrollSummary(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const data = await reportService.getAllPublishedPayrollSummary(
				req.query as unknown as ICustomerExpenseReportQuery
			);
			return DefaultResponse(res, 200, 'Report fetched successfully', data);
		} catch (error) {
			next(error);
		}
	}

	async getPayrollSummaryReportPdf(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const stream = await reportService.getPayrollSummaryReportPdf(req.query);

			// const stream = await reportService.getPayrollSummaryReportPdf(
			// 	data,
			// 	req.query?.companyId as string
			// );

			const filePath = path.join(
				__dirname,
				'..',
				'costAllocationPdfs',
				`${new Date().getUTCDate()}payroll-summary-report.pdf`
			);
			stream.on('close', async () => {
				const data = await fs.readFile(filePath);

				const base64String = Buffer.from(data).toString('base64');

				await fs.unlink(filePath);

				res.status(200).json({
					data: base64String,
				});
			});
		} catch (err) {
			next(err);
		}
	}

	async getPayrollSummaryReportCsv(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			if (!req.query?.companyId) {
				throw new CustomError(400, 'Company Id is required');
			}

			const data = await reportService.getAllPublishedPayrollSummary(
				req.query as unknown as ITimeActivitySummaryQuery
			);

			const csvData = await reportService.getPayrollSummaryReportCsv(
				data.content,
				req.query
			);

			res.setHeader('Content-Type', 'text/csv');

			const fileName = moment(new Date()).format('MMDDYYYYhhmmss');

			res.setHeader(
				'Content-Disposition',
				`attachment; filename=PayrollSummaryReport_${fileName}.csv`
			);

			return res.status(200).end(csvData);
		} catch (err) {
			next(err);
		}
	}
}

export default new ReportController();
