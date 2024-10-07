import { Router } from 'express';
import developerController from '../controllers/developerController';
const developerRoutes = Router();

developerRoutes.post(
    '/delete-company',
    developerController.deleteCompany
);

export default developerRoutes;
