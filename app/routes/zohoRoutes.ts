import express from 'express';

import zohoController from '../controllers/zohoController';
import { isAuthenticated } from '../middlewares/authMiddleware';
const router = express.Router();

router.post('/sso-login', isAuthenticated, zohoController.SSOLogin);

router.get('/callback', zohoController.callback);

router.get('/refresh-token', isAuthenticated, zohoController.refreshToken);

router.post('/get-token', zohoController.getToken);

router.get('/hosted-page', isAuthenticated, zohoController.createHostedPage);

router.get('/subscription/:id', zohoController.getSubscriptionDetailsById);

export default router;
