import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware';
import configurationCustomRuleController from '../controllers/configurationCustomRuleController';
import { configurationCustomRuleValidation } from '../helpers/validators';

const router = express.Router();

router.get('/', isAuthenticated, configurationCustomRuleController.getListOfCustomRules);
router.get(
	'/split',
	isAuthenticated,
	configurationCustomRuleController.getListOfCustomRules
);
router.get('/:id', isAuthenticated, configurationCustomRuleController.getCustomRuleById);
router.post(
	'/',
	isAuthenticated,
	configurationCustomRuleValidation,
	configurationCustomRuleController.createCustomRules
);
router.put('/:id', isAuthenticated, configurationCustomRuleController.updateCustomRules);
router.put(
	'/update/priority',
	isAuthenticated,
	configurationCustomRuleController.updatePriority
);
router.delete(
	'/:id',
	isAuthenticated,
	configurationCustomRuleController.deleteCustomRuleById
);

export default router;
