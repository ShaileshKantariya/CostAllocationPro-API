import express from 'express';
import { companyController, configurationController } from '../controllers';
import {
	companyConfigurationValidation,
} from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
const router = express.Router();

router.get(
	'/configuration',
	configurationController.getCompanyConfiguration
);

router.get('/', companyController.getUserWiseCompanies);
router.get('/users', isAuthenticated, companyController.getUsers);
router.get('/:id', companyController.getCompanyDetails);
router.post('/', companyController.createCompany);

router.put(
	'/configuration',
	companyConfigurationValidation,
	configurationController.updateCompanyConfiguration
);

export default router;
