import express from 'express';
import { quickbooksController } from '../controllers';
import { isAuthenticated } from '../middlewares/authMiddleware';
import {
	chartOfAccountsValidation,
	companyIdValidation,
	createQuickBooksEmployeeValidation,
	quickbooksAccountsValidation,
	quickbooksClassValidation,
	quickbooksCustomersValidation,
	quickbooksEmployeeValidation,
	quickbooksTimeActivityValidation,
} from '../helpers/validators';
const router = express.Router();

// Get Quickbooks Auth URL
router.get(
	'/authurl',
	isAuthenticated,
	quickbooksController.getQuickbooksAuthUri
);

// Get App now Quickbooks Auth URL
router.get(
	'/get-app-now/authurl',
	quickbooksController.getAppNowQuickbooksAuthUri
);

// Quickbooks Callback
router.post(
	'/callback',
	isAuthenticated,
	quickbooksController.quickbooksCallback
);

// Quickbooks Callback
router.post(
	'/get-app-now/callback',
	quickbooksController.quickbooksGetAppNowCallback
);

// Get Quickbooks SSO Auth URL
router.get('/sso-authurl', quickbooksController.getQuickbooksSSOAuthUri);

// Get Quickbooks SSO Auth URL
router.post(
	'/sso-callback',
	quickbooksController.quickBooksCallbackWithSignAndSignUp
);

// router.post('/install-app-callback', quickbooksController.quickBooksInstallAppCallback);

// Disconnect company
router.post(
	'/disconnect',
	isAuthenticated,
	quickbooksController.quickbooksDisconnect
);

// Update status
router.put('/', isAuthenticated, quickbooksController.updateCompanyStatus);

router.post(
	'/employees',
	isAuthenticated,
	quickbooksEmployeeValidation,
	quickbooksController.getAllQBEmployees
);

router.post(
	'/employees/create',
	isAuthenticated,
	createQuickBooksEmployeeValidation,
	quickbooksController.createQBEmployees
);

router.post(
	'/accounts',
	isAuthenticated,
	quickbooksAccountsValidation,
	quickbooksController.getAllAccounts
);

router.post(
	'/customers',
	isAuthenticated,
	quickbooksCustomersValidation,
	quickbooksController.getAllCustomer
);

router.post(
	'/customer-options',
	isAuthenticated,
	quickbooksCustomersValidation,
	quickbooksController.getCustomerOptions
);

router.post(
	'/classes',
	isAuthenticated,
	quickbooksClassValidation,
	quickbooksController.getAllClasses
);

router.post(
	'/class-options',
	isAuthenticated,
	quickbooksCustomersValidation,
	quickbooksController.getClassOptions
);

router.post('/company', quickbooksController.getCompanyInfo);

// Sync time activities for the first time
router.post(
	'/time-activities',
	isAuthenticated,
	quickbooksTimeActivityValidation,
	quickbooksController.getAllTimeActivities
);

router.get(
	'/closingDate',
	isAuthenticated,
	companyIdValidation,
	quickbooksController.getClosingDateList
);

router.post(
	'/chart-of-account',
	isAuthenticated,
	chartOfAccountsValidation,
	quickbooksController.createChartOfAccount
);

router.post('/webhook', quickbooksController.quickbooksWebhook);
export default router;
