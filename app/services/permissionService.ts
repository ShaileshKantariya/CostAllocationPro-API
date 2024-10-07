import { CustomError } from '../models/customError';
import { roleRepository, permissionRepository } from '../repositories';

class PermissionService {
	updatePermission = async (
		companyId: string,
		roleId: string,
		permissions: any
	) => {
		try {
			const role = await roleRepository.getDetails(roleId);
			const isFromSameOrg = await roleRepository.checkCompanyAndRole(
				roleId,
				companyId
			);
			if (role) {
				if (!(role.isAdminRole || role.isCompanyAdmin)) {
					if (isFromSameOrg) {
						await permissionRepository.updateRolePermission(
							permissions,
							roleId
						);
					} else {
						throw new CustomError(
							403,
							'Can not modify the permission of other company role'
						);
					}
				} else {
					throw new CustomError(
						403,
						'You can not modify admin role permission'
					);
				}
			} else {
				throw new CustomError(404, 'No role found');
			}
		} catch (error) {
			throw error;
		}
	};
}

export default new PermissionService();
