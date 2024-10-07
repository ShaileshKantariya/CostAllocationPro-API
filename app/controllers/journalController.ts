import { NextFunction, Response, Request } from 'express';
import journalServices from '../services/journalServices';
import { IJournalEntriesQuery } from '../interfaces/journalInterface';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { RequestExtended } from '../interfaces/global';
import { checkValidation } from '../helpers/validationHelper';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { CustomError } from '../models/customError';

class JournalController {
	async getJournalEntries(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await journalServices.getJournalEntriesByPayPeriod(
				req.query as unknown as IJournalEntriesQuery
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}

	async getLatestJournalNo(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await journalServices.getLatestJournalNo(
				req.query.companyId as unknown as string
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}

	async getJournalFromQBO(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await journalServices.getJournalFromQBO(
				req.query.companyId as string,
				req.query.journalId as string
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}

	async getAllJournals(
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
				status = '',
				type = '',
				sort = '',
				payPeriodId = '',
				year,
			} = req.query;

			const data = {
				companyId: companyId as string,
				payPeriodId: payPeriodId as string,
				page: Number(page),
				limit: Number(limit),
				search: search as string,
				status: Number(status),
				type: type as string,
				sort: sort as string,
				year: year as string,
			};

			// Checking is the user is permitted
			const isPermitted = await checkPermission(req, companyId as string, {
				permissionName: 'Journals Entries',
				permission: ['view'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const timeSheets = await journalServices.getAllJournals(data);
			return DefaultResponse(
				res,
				200,
				'Journals fetched successfully',
				timeSheets
			);
		} catch (err) {
			next(err);
		}
	}

	async getJournalByPayPeriod(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await journalServices.getJournalByPayPeriodId(
				req.query.payPeriodId as string,
				req.query.companyId as string
			);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}

	async createJournal(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);

			const body = req.body;
			req.body.createdById = req.user.id;

			// Checking is the user is permitted
			const isPermitted = await checkPermission(
				req,
				req.body.companyId as string,
				{
					permissionName: 'Journals Entries',
					permission: ['add'],
				}
			);

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			const data = await journalServices.createJournal(body);
			return DefaultResponse(res, 200, '', data);
		} catch (error) {
			next(error);
		}
	}
}

export default new JournalController();
