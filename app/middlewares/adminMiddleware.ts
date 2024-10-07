import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import { globalRepository } from '../repositories';
import { CustomError } from '../models/customError';

export const isAdminUser = async (
	req: RequestExtended,
	res: Response,
	next: NextFunction
) => {
	try {
		const orgId = req.body.orgId || req.body.company;
		const isAdmin = await globalRepository.isAdminUser(req?.user?.id, orgId);
		req.idAdmin = isAdmin;
		if (!isAdmin) {
			const error = new CustomError(403, 'You are unauthorized');
			throw error;
		} else {
			next();
		}
	} catch (error) {
		next(error);
	}
};
