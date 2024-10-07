import { Router } from 'express';
import customClassMappingController from '../controllers/customClassMappingController';
import { isAuthenticated } from '../middlewares/authMiddleware';
const customClassMappingRoutes = Router();

customClassMappingRoutes.post(
    '/',
    isAuthenticated,
    // employeeDirectAllocationValidation,
    customClassMappingController.createCustomClassMapping
);

customClassMappingRoutes.get(
    '/',
    isAuthenticated,
    // employeeDirectAllocationValidation,
    customClassMappingController.getCustomClassMapping
);


export default customClassMappingRoutes;
