/* eslint-disable @typescript-eslint/no-var-requires */
const { validationResult } = require('express-validator');
import { Request } from 'express';

// Check Validation For Requests
export const checkValidation = (req: Request) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const validationError = {
			status: 400,
			//   status: 422,
			message: errors.errors[0].msg,
		};
		throw validationError;
	}
};
