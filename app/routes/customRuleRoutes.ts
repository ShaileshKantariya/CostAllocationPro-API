import express from 'express';
import { isAuthenticated } from '../middlewares/authMiddleware';
import customRuleController from '../controllers/customRuleController';
import { customRuleValidation } from '../helpers/validators';

const router = express.Router();

router.get('/', isAuthenticated, customRuleController.getListOfCustomRules);
router.get('/split', isAuthenticated, customRuleController.getSplitCustomRuleList);
router.get('/edit', isAuthenticated, customRuleController.getEditCustomRuleList);
router.get('/delete', isAuthenticated, customRuleController.getDeleteCustomRuleList);
router.get('/:id', isAuthenticated, customRuleController.getCustomRuleById);
router.post('/', isAuthenticated, customRuleValidation, customRuleController.createCustomRules);
router.put('/:id', isAuthenticated, customRuleController.updateCustomRules);
router.put('/update/priority', isAuthenticated, customRuleController.updatePriority);
router.delete('/:id', isAuthenticated, customRuleController.deleteCustomRuleById);

export default router;


