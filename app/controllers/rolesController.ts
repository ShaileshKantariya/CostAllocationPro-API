import { Request, Response, NextFunction } from 'express';
import { roleRepository } from '../repositories';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import roleService from '../services/roleService';
import { checkValidation } from '../helpers/validationHelper';
import { checkPermission } from '../middlewares/isAuthorizedUser';
import { CustomError } from '../models/customError';
class RolesController {
	//For create a single role
	createRole = async (req: Request, res: Response, next: NextFunction) => {
		try {
			checkValidation(req);
			const {
				orgId,
				roleDescription,
				roleName,
				isAdminRole = false,
			} = req.body;

			// checking is user permitted
			const isPermitted = await checkPermission(req, orgId, {
				permissionName: 'Roles',
				permission: ['add'],
			});
			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}
			const createdRole = await roleService.createRole({
				orgId,
				roleDescription,
				roleName,
				isAdminRole,
			});
			return DefaultResponse(
				res,
				201,
				'Roles created successfully',
				createdRole
			);
		} catch (error) {
			next(error);
		}
	};
	// For get All the roles from that company
	getAllRoles = async (req: any, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const { page = 1, limit = 10, search, filter, type, sort } = req.query;

			const roles = await roleService.getAllRoles(
				id as string,
				Number(page),
				Number(limit),
				search as string,
				filter as string,
				type as string,
				sort as string
			);

			return DefaultResponse(res, 200, 'Roles find successful', roles);
		} catch (error) {
			next(error);
		}
	};
	// For get single roles from that company
	getARole = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const role = await roleRepository.getDetails(id);
			return DefaultResponse(res, 200, 'Role find successful', role);
		} catch (error) {
			next(error);
		}
	};

	// for update the some role
	updateRole = async (req: Request, res: Response, next: NextFunction) => {
		try {
			checkValidation(req);
			const data = req.body;

			const isPermitted = await checkPermission(req, data.orgId, {
				permissionName: 'Roles',
				permission: ['edit'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			await roleService.updateUserRole(data);
			return DefaultResponse(res, 200, 'Role updated successfully');
		} catch (error) {
			next(error);
		}
	};
	// for delete the role
	deleteRole = async (req: Request, res: Response, next: NextFunction) => {
		try {
			checkValidation(req);
			const { orgId, roleId } = req.body;

			const isPermitted = await checkPermission(req, orgId, {
				permissionName: 'Roles',
				permission: ['delete'],
			});

			if (!isPermitted) {
				throw new CustomError(403, 'You are not authorized');
			}

			await roleService.deleteRole(roleId, orgId);
			return DefaultResponse(res, 200, 'Role deleted successfully');
		} catch (error) {
			next(error);
		}
	};
}

export default new RolesController();
