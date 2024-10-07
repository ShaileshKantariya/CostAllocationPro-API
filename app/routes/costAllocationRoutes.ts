import express from 'express';
import { costAllocationController } from '../controllers';
import { isAuthenticated } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', isAuthenticated, costAllocationController.getCostAllocation);

router.get('/total-row', isAuthenticated, costAllocationController.getCostAllocationGrandTotal);

router.get(
	'/export-csv',
	isAuthenticated,
	costAllocationController.exportCostAllocationCSV
);

router.get(
	'/export-pdf',
	isAuthenticated,
	costAllocationController.exportCostAllocationPDF
);

router.get('/difference', isAuthenticated, costAllocationController.getCostAllocationDifference);

export default router;
