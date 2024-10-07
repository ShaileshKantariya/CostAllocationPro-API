import { prisma } from '../client/prisma';

class OverHourRepository {
	async getOverHoursByYear(
		companyId: string,
		employeeId: string,
		year: number
	) {
		const hourOverDetails = await prisma.hoursOver.findFirst({
			where: {
				employeeId: employeeId,
				companyId: companyId,
				year: Number(year),
			},
		});
		return hourOverDetails;
	}

	async createOverHoursByYear(
		companyId: string,
		employeeId: string,
		year: number
	) {
		const overHours = await prisma.hoursOver.create({
			data: {
				company: { connect: { id: companyId } },
				employee: { connect: { id: employeeId } },
				year: year,
			},
		});
		return overHours;
	}

	async updateOverHoursByYear(
		companyId: string,
		employeeId: string,
		year: number,
		overHours: number,
		overMinutes: number,
		isOver: boolean
	) {
		const updated = await prisma.hoursOver.updateMany({
			where: {
				companyId: companyId,
				employeeId: employeeId,
				year: year,
			},
			data: {
				isOverHours: isOver,
				overHours: overHours,
				overMinutes: overMinutes,
			},
		});
		return updated;
	}
}

export default new OverHourRepository();
