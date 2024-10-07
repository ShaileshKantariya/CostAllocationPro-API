import { Response } from 'express';
import { DefaultResponseInterface } from '../interfaces/global';

// Default Response For Every Api
export const DefaultResponse = (
	res: Response,
	statusCode: number,
	message: string,
	data?: any,
	total?: number,
	page?: number
) => {
	let response: DefaultResponseInterface = {
		message: message,
		statusCode: statusCode,
		data: data,
	};

	if (total) {
		response = { ...response, total };
	}
	if (page) {
		response = { ...response, page };
	}
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'interest-cohort=()');
	res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
	res.setHeader('Expires', 'Wed, 11 Jan 1984 05:00:00 GMT');
	res.setHeader('X-XSS-Protection', '1; mode=block');
	res.setHeader('Pragma', 'no-cache');

	return res.status(statusCode).json(response);
};
