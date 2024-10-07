import express from 'express';
import payPeriodController from '../controllers/payPeriodController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { payPeriodValidator } from '../helpers/validators';
const router = express.Router();

router.get('/', isAuthenticated, payPeriodController.getAllPayPeriods);
router.get('/dates', isAuthenticated, payPeriodController.getDisabledDate);
router.post(
	'/',
	isAuthenticated,
	payPeriodValidator,
	payPeriodController.createPayPeriod
);
router.put(
	'/:id',
	isAuthenticated,
	payPeriodValidator,
	payPeriodController.editPayPeriod
);

export default router;
