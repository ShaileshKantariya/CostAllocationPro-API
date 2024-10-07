import { Router } from 'express';
import { reportController } from '../controllers';
import { isAuthenticated } from '../middlewares/authMiddleware';

const reportRoutes = Router();

reportRoutes.get(
	'/time-activity-summary',
	isAuthenticated,
	reportController.getTimeActivitySummaryReport
);

reportRoutes.get(
	'/customer-expense-summary',
	isAuthenticated,
	reportController.getExpensesByCustomerReport
);

reportRoutes.get(
	'/time-activity-summary-pdf',
	isAuthenticated,
	reportController.getTimeActivitySummaryReportPdf
);

reportRoutes.get(
	'/time-activity-summary-csv',
	isAuthenticated,
	reportController.getTimeActivitySummaryReportCsv
);

reportRoutes.get(
	'/payroll-expense-summary',
	isAuthenticated,
	reportController.getAllPublishedPayrollSummary
);

reportRoutes.get(
	'/payroll-expense-summary-pdf',
	isAuthenticated,
	reportController.getPayrollSummaryReportPdf
);

reportRoutes.get(
	'/payroll-expense-summary-csv',
	isAuthenticated,
	reportController.getPayrollSummaryReportCsv
);

export default reportRoutes;
