import express from 'express';
import { splitTimeActivityController } from '../controllers';
import { isAuthenticated } from '../middlewares/authMiddleware';
import {
	createSplitTimeActivity,
	deleteAllSplitTimeActivity,
	deleteSplitTimeActivity,
} from '../helpers/validators';

const router = express.Router();

// Get time activity details
router.get(
	'/',
	isAuthenticated,
	splitTimeActivityController.getAllSplitTimeActivities
);

// Create a new split time activity
router.post(
	'/',
	isAuthenticated,
	createSplitTimeActivity,
	splitTimeActivityController.createSplitTimeActivities
);

// Delete split time activity
router.delete(
	'/',
	isAuthenticated,
	deleteSplitTimeActivity,
	splitTimeActivityController.deleteSplitTimeActivity
);

// Delete all split time activity
router.delete(
	'/all',
	isAuthenticated,
	deleteAllSplitTimeActivity,
	splitTimeActivityController.deleteAllSplitTimeActivity
);

export default router;
