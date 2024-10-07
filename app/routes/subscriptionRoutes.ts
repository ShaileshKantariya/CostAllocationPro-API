import express from 'express';
import subscriptionController from '../controllers/subscriptionController';
import { isAuthenticated } from '../middlewares/authMiddleware';
const subscriptionRoutes = express.Router();

subscriptionRoutes.get('/logged-in', isAuthenticated, subscriptionController.getLoggedInCompanySubscriptionDetails);
subscriptionRoutes.post('/cancel', subscriptionController.cancelSubscription);
subscriptionRoutes.post('/renew', subscriptionController.renewSubscription);
subscriptionRoutes.post('/expired', subscriptionController.expireSubscription);

export default subscriptionRoutes;
