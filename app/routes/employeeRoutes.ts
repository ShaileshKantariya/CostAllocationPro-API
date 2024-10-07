import express from 'express';
import employeeController from '../controllers/employeeController';
import { employeeValidation } from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
import globalController from '../controllers/globalController';
const router = express.Router();

// Get all employees from db
router.post('/', employeeValidation, employeeController.getAllEmployees);

// Sync when company connect
router.post(
	'/sync',
	employeeValidation,
	isAuthenticated,
	employeeController.syncEmployees
);

router.post('/export', globalController.pdfGenerator);

export default router;
