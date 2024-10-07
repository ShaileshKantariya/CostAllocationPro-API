import { Router } from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware';
import employeeConfigController from '../controllers/employeeConfigController';
import { employeeDirectAllocationValidation } from '../helpers/validators';
const employeeConfigRoutes = Router();

employeeConfigRoutes.post(
    '/create',
    isAuthenticated,
    employeeDirectAllocationValidation,
    employeeConfigController.createEmployeeConfig
);

employeeConfigRoutes.get(
    '/',
    isAuthenticated,
    employeeConfigController.getExistingEmployeeConfig
);


export default employeeConfigRoutes;
