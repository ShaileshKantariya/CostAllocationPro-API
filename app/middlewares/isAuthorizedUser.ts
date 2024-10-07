import { prisma } from '../client/prisma';
import { RequestExtended } from '../interfaces/global';
import { logger } from '../utils/logger';
// Assuming you have the necessary imports and setup for Prisma and Express

export const checkPermission = async (
	req: RequestExtended,
	companyId: string,
	requiredPermission: any
) => {
	const { id } = req.user; // Assuming you have stored the user ID in the request object

	try {
		const userPermissions: any = await prisma.companyRole.findFirst({
			where: {
				userId: id,
				companyId,
			},
			include: {
				role: {
					include: {
						permissions: true,
					},
				},
			},
		});
		const permissionsList = userPermissions.role.permissions;
		const permission = permissionsList.find(
			(singlePermission: any) =>
				singlePermission.permissionName === requiredPermission.permissionName
		);
		if (permission) {
			const permitted = requiredPermission.permission.some(
				(singlePermission: string) => permission[singlePermission]
			);
			return permitted || permission['all'];
		} else {
			return false;
		}
	} catch (err) {
		logger.error('Error while checking user permissions:', err);
	}
};
