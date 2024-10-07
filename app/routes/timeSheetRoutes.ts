import express from 'express';
import { timeSheetController } from '../controllers';

import {
	createTimeSheetValidator,
	timeSheetEmailValidators,
	timeSheetExportValidators,
} from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
const router = express.Router();

// Get time sheet logs by employee
// router.get(
// 	'/employee',
// 	isAuthenticated,
// 	timeSheetController.getAllTimeSheetLogs
// );

router.get(
	'/employees',
	isAuthenticated,
	timeSheetController.getTimeSheetWiseEmployees
);

// Get all time sheets
router.get('/', isAuthenticated, timeSheetController.getAllTimeSheets);

router.get(
	'/by-payPeriod',
	isAuthenticated,
	timeSheetController.getTimeSheetByPayPeriod
);
// Get time sheet details
router.get('/:id', isAuthenticated, timeSheetController.getTimeSheetDetails);

// Create new time sheet by date
router.post(
	'/',
	isAuthenticated,
	createTimeSheetValidator,
	timeSheetController.createTimeSheet
);

router.post(
	'/validate',
	isAuthenticated,
	timeSheetController.validateTimeSheet
);

// Email time sheet
router.post(
	'/email',
	isAuthenticated,
	timeSheetEmailValidators,
	timeSheetController.emailTimeSheet
);

// Export time sheet
router.post(
	'/export',
	isAuthenticated,
	timeSheetExportValidators,
	timeSheetController.exportTimeSheetPdf
);

// Export time sheet
router.post(
	'/export-zip',
	isAuthenticated,
	timeSheetController.exportTimeSheetZip
);

export default router;
