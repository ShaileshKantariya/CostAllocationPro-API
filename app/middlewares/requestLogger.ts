import { RequestExtended } from '../interfaces/global';
import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (
	req: RequestExtended,
	res: Response,
	next: NextFunction
) => {
	const start = Date.now();
	
	const reqId = uuidv4();

	logger.info(
		`Request received at ${new Date()} ReqId: ${reqId}  Method: ${req.method} Url: ${
			req.originalUrl
		}`
	);

	res.on('finish', () => {
		const duration = Date.now() - start;
		logger.info(
			`Request of UserId: ${req?.user?.id} ReqId: ${reqId} Method: ${req.method} Url: ${req.originalUrl} completed in ${duration}ms with status code: ${res.statusCode}`
		);
	});

	next();
};
