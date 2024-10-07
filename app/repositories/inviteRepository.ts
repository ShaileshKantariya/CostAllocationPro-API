import { prisma } from '../client/prisma';

class InviteRepository {
	async create(
		invitedBy: string,
		invitedTo: string,
		role: string,
		company: string,
		companyRole: string
	) {
		try {
			const invite = await prisma.invitations.create({
				data: {
					invitedBy: { connect: { id: invitedBy } },
					invitedTo: { connect: { id: invitedTo } },
					role: { connect: { id: role } },
					company: { connect: { id: company } },
					companyRole: { connect: { id: companyRole } },
					invitationStatus: 'Pending',
				},
			});
			return invite;
		} catch (err) {
			throw err;
		}
	}
}

export default new InviteRepository();
