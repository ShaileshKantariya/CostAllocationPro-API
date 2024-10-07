import { prisma } from '../client/prisma';

class GlobalRepository {
	isAdminUser = async (userId: string, companyId: string) => {
		const response = await prisma.companyRole.findFirst({
			where: {
				userId,
				companyId,
			},
			include: {
				role: true,
			},
		});

		if (response?.role.isCompanyAdmin || response?.role.isAdminRole) {
			return true;
		} else {
			return false;
		}
	};
}

export default new GlobalRepository();
