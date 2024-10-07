/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../models/customError';
import { RequestExtended } from '../interfaces/global';
import { logger } from '../utils/logger';

// Custom Error Object
export const customError = (
	err: CustomError,
	req: RequestExtended,
	res: Response,
	next: NextFunction
) => {
	const error = new CustomError(err.status, err.message, err.additionalInfo);
	logger.error(
		`Error while solving Request Method: ${req.method} Url: ${
			req.originalUrl
		} of UserId: ${req?.user?.id} failed with status code: ${
			error.status
		} message: ${JSON.stringify(error.message)} Error: ${err}`,
		err
	);
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'interest-cohort=()');
	res.setHeader(
		'Strict-Transport-Security',
		'max-age=31536000; includeSubDomains'
	);
	res.setHeader(
		'Cache-Control',
		'no-store, no-cache, must-revalidate, max-age=0'
	);
	res.setHeader('Expires', 'Wed, 11 Jan 1984 05:00:00 GMT');
	res.setHeader('X-XSS-Protection', '1; mode=block');
	res.setHeader('Pragma', 'no-cache');
	return res.status(error.status).json({
		error: err,
		message: error.status == 500 ? 'Something went wrong' : error.message,
		responseStatus: error.status,
	});
};

// 404 Not Found Error
export const notFound = (req: Request, res: Response, next: NextFunction) => {
	const error = new CustomError(404, `Path not found`);
	next(error);
};
