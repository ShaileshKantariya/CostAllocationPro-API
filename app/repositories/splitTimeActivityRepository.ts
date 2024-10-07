import { prisma } from '../client/prisma';

class SplitTimeActivityRepository {
	async create(
		parentActivityId: string,
		employeeId: string,
		splitTimeActivityData: any
	) {
		await prisma.splitTimeActivities.deleteMany({
			where: {
				timeActivityId: parentActivityId,
			},
		});

		const createdSplitTimeActivities = await Promise.all(
			await splitTimeActivityData.map(async (singleActivity: any) => {
				// Check if existing split time activity available or not

				await prisma.splitTimeActivities.create({
					data: {
						classId: singleActivity?.classId,
						className: singleActivity?.className,
						customerId: singleActivity?.customerId,
						customerName: singleActivity?.customerName,
						hours: singleActivity?.hours,
						minute: singleActivity?.minute,
						timeActivity: { connect: { id: parentActivityId } },
						employee: { connect: { id: employeeId } },
						activityDate: new Date(singleActivity?.activityDate),
						isAutoSplit: singleActivity?.isAutoSplit,
						isClassReadOnly: singleActivity?.isClassReadOnly,
						isCustomerReadOnly: singleActivity?.isCustomerReadOnly,
						customRuleId: singleActivity?.customRuleId
					},
				});
			})
		);

		return createdSplitTimeActivities;
	}

	async getSplitTimeActivityByParentId(parentId: string) {
		try {
			const splitTimeActivity = await prisma.splitTimeActivities.findMany({
				where: {
					timeActivityId: parentId,
				},
			});
			return splitTimeActivity;
		} catch (err) {
			throw err;
		}
	}

	async delete(splitTimeActivityData: any) {
		const { splitTimeActivityId } = splitTimeActivityData;

		const deletedSplitActivity = await prisma.splitTimeActivities.delete({
			where: {
				id: splitTimeActivityId,
			},
		});
		return deletedSplitActivity;
	}

	async deleteSplitActivity(splitTimeActivityData: any) {
		const { timeActivityId } = splitTimeActivityData;
		await prisma.splitTimeActivities.deleteMany({
			where: {
				timeActivityId: timeActivityId,
			},
		});
	}
}

export default new SplitTimeActivityRepository();
