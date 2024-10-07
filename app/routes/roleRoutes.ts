import { Router } from 'express';
import { rolesController } from '../controllers';
import {
	createRoleValidationRules,
	deleteRoleValidationRules,
	updateRoleValidationRules,
} from '../helpers/validators';
const roleRoutes = Router();

//For create a single role
roleRoutes.post(
	'/create',
	createRoleValidationRules,
	rolesController.createRole
);
// For get single roles from that company
roleRoutes.get('/single-role/:id', rolesController.getARole);
// For get All the roles from that company
roleRoutes.get('/organization-roles/:id', rolesController.getAllRoles);
// for update the some role
roleRoutes.post(
	'/update-role',
	updateRoleValidationRules,
	rolesController.updateRole
);
// for delete the role
roleRoutes.delete('/', deleteRoleValidationRules, rolesController.deleteRole);

export default roleRoutes;
