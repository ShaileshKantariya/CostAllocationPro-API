import express from 'express';
import { customError, notFound } from '../helpers/errorHandler';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import companyRoutes from './companyRoutes';
import roleRoutes from './roleRoutes';
import permissionRoutes from './permissionRoutes';
import quickbooksRoutes from './quickbooksRoutes';
import employeeRoutes from './employeeRoutes';
import timeActivityRoutes from './timeActivityRoutes';
import splitTimeActivityRoutes from './splitTimeActivityRoutes';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { Request, Response } from 'express';
import configuration from './configuration';
import employeeCostRouter from './employeeCostRoutes';
import timeSheetRouter from './timeSheetRoutes';
import payPeriodRouter from './payPeriodRoutes';
import costAllocationRouter from './costAllocationRoutes';
import journalRouter from './journalRoutes';
import dashboardRoutes from './dashboardRoutes';
import syncLogRoutes from './syncLogsRoutes';
import developerRoutes from './developerRoutes';
import reportRoutes from './reportRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import zohoRoutes from './zohoRoutes';
import { requestLogger } from '../middlewares/requestLogger';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger';
import customRuleRoutes from '../routes/customRuleRoutes';
import employeeConfigRoutes from './employeeConfigRoutes';
import configurationCustomRuleRoute from './configurationCustomRuleRoutes'
import customClassMappingRoutes from './customClassMappingRoutes';
import { prisma } from '../client/prisma';

const router = express.Router();

router.use(requestLogger);

router.use('/auth', authRoutes);
router.use('/users', isAuthenticated, userRoutes);
router.use('/companies', isAuthenticated, companyRoutes);
router.use('/role', isAuthenticated, roleRoutes);
router.use('/permission', permissionRoutes);
router.use('/quickbooks', quickbooksRoutes);
router.use('/employees', employeeRoutes);
router.use('/time-activities', timeActivityRoutes);
router.use('/configuration', configuration);
router.use('/employee-cost', employeeCostRouter);
router.use('/split-time-activity', splitTimeActivityRoutes);
router.use('/time-sheet', timeSheetRouter);
router.use('/pay-periods', payPeriodRouter);
router.use('/cost-allocation', costAllocationRouter);
router.use('/journal', journalRouter);
router.use('/dashboard', dashboardRoutes);
router.use('/sync-logs', syncLogRoutes);
router.use('/developer', developerRoutes);
router.use('/reports', reportRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/zoho', zohoRoutes);
router.use('/custom-rule', customRuleRoutes);
router.use('/employee-config', employeeConfigRoutes)
router.use('/custom-configuration-rule', configurationCustomRuleRoute);
router.use('/customClassMapping', customClassMappingRoutes)

router.get('/test-users',isAuthenticated, async (req: any, res: any) => {
	try {
		const firstName=req.body.firstName
		const users = await prisma.$queryRaw`SELECT * FROM public.get_users_by_first_name(${firstName});`;
		console.log(users);
		return res.status(200).json({ data: users, message: "Users fetched" })
	} catch (error) {
		console.error('Error retrieving users:', error);
	}
});


/**
 * @swagger
 * /test:
 *   get:
 *     summary: Test api
 *     description: Testing api
 *     parameters:
 *       - in: body
 *         name: user
 *         description: The user to login 
 *     responses:
 *       200:
 *         description: Success
 */
router.use('/test', (req: Request, res: Response) => {
	return res.json({ data: 'Hello world!' });
});

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

router.use(notFound);
router.use(customError);

export default router;
