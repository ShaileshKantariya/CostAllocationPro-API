import express from 'express';
import { timeActivityController } from '../controllers';
import {
	bulkCreateTimeActivitiesValidation,
	bulkDeleteTimeActivityValidation,
	createTimeActivityValidation,
	deleteTimeActivityValidation,
	timeActivityValidation,
	timelogMappingHistoryValidation,
	updateBatchTimeActivityValidation,
	updateTimeActivityValidation,
} from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
// import { employeeValidation } from '../helpers/validators';
const router = express.Router();

// Sync time activities
router.post(
	'/sync',
	isAuthenticated,
	timeActivityValidation,
	timeActivityController.syncTimeActivities
);

// Get all time activities from db
router.get('/', isAuthenticated, timeActivityController?.getAllTimeActivities);

// Update time activity
router.put(
	'/',
	isAuthenticated,
	updateTimeActivityValidation,
	timeActivityController?.updateTimeActivity
);

// Update Batch time activity
router.put(
	'/batch',
	isAuthenticated,
	updateBatchTimeActivityValidation,
	timeActivityController?.updateBatchTimeActivity
);

// Create time activity
router.post(
	'/create',
	isAuthenticated,
	createTimeActivityValidation,
	timeActivityController?.createTimeActivity
);

router.post(
	'/bulk-create-time-activities',
	isAuthenticated,
	bulkCreateTimeActivitiesValidation,
	timeActivityController?.bulkCreateTimeActivities
);

router.post(
	'/create-update-timelog-mapping-history',
	isAuthenticated,
	timelogMappingHistoryValidation, // Add validation logic if needed
	timeActivityController?.createOrUpdateTimelogMappingHistory
);

router.get(
	'/timelog-mapping-history',
	isAuthenticated,
	timeActivityController?.getTimelogMappingHistory
);

// Delete time activity
router.delete(
	'/',
	isAuthenticated,
	deleteTimeActivityValidation,
	timeActivityController?.deleteTimeActivity
);

// Bulk Delete time activity
router.post(
	'/bulk-delete',
	isAuthenticated,
	bulkDeleteTimeActivityValidation,
	timeActivityController.bulkDeleteTimeActivities
);

// Export time activity
router.get(
	'/export',
	isAuthenticated,
	// timeActivityController.exportTimeActivityExcel
	timeActivityController.exportTimeActivity
);

// Export time activity
router.post(
	'/exportpdf',
	isAuthenticated,
	timeActivityController.exportTimeActivityPdf
);

router.get(
	'/apply-custom-rules',
	isAuthenticated,
	// timeActivityController.exportTimeActivityExcel
	timeActivityController.applyCustomRules
);

export default router;
