import { prisma } from '../client/prisma';

class PermissionRepository {
	// For get all the permission back for user
	getRolePermissions = async (id: string) => {
		const permissions = await prisma.permission.findMany({
			where: {
				roleId: id,
			},
			orderBy: {
				sortId: 'asc',
			},
		});
		return permissions;
	};

	// For update the permission
	updateRolePermission = async (permissions: any, roleId: string) => {
		// "comment"
		await Promise.all(
			await permissions.map(async (singlePermission: any) => {
				const permissionObjCopy = { ...singlePermission };
				if (permissionObjCopy.all === true) {
					permissionObjCopy.delete = true;
					permissionObjCopy.edit = true;
					permissionObjCopy.view = true;
					permissionObjCopy.add = true;
				}
				if (permissionObjCopy.edit === true) {
					permissionObjCopy.view = true;
				}
				if (permissionObjCopy.delete === true) {
					permissionObjCopy.view = true;
				}
				if (permissionObjCopy.add === true) {
					permissionObjCopy.view = true;
				}

				await prisma.permission.updateMany({
					where: {
						id: permissionObjCopy.id,
						roleId: roleId,
					},
					data: {
						all: permissionObjCopy.all,
						delete: permissionObjCopy.delete,
						edit: permissionObjCopy.edit,
						view: permissionObjCopy.view,
						add: permissionObjCopy.add,
					},
				});
			})
		);
	};
}

export default new PermissionRepository();
