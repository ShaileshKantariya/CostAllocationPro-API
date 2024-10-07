import { Router } from 'express';
import { permissionController } from '../controllers';
import { permissionRoleValidationRules } from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';
const permissionRoute = Router();

//For get the permissions based on the role
permissionRoute.get(
	'/:id',
	isAuthenticated,
	permissionController.getAllPermission
);

// for update the permission of some role
permissionRoute.post(
	'/update-permission',
	permissionRoleValidationRules,
	isAuthenticated,
	permissionController.updatePermission
);

export default permissionRoute;
