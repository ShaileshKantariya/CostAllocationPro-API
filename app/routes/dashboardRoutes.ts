import { Router } from 'express';
import dashboardController from '../controllers/dashboardController';
import { isAuthenticated } from '../middlewares/authMiddleware';
const dashboardRoutes = Router();

dashboardRoutes.get(
	'/salary-by-month',
	isAuthenticated,
	dashboardController.getSalaryExpenseByMonth
);

dashboardRoutes.get(
	'/salary-by-customer',
	isAuthenticated,
	dashboardController.getExpensesByCustomer
);

dashboardRoutes.get(
	'/summary-by-payPeriod',
	isAuthenticated,
	dashboardController.getJournalGraphData
);

dashboardRoutes.get(
	'/hours-by-employee',
	isAuthenticated,
	dashboardController.getEmployeeHoursGraphData
);

export default dashboardRoutes;
