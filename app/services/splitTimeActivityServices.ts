import { CustomError } from '../models/customError';
import splitTimeActivityRepository from '../repositories/splitTimeActivityRepository';
import timeActivityRepository from '../repositories/timeActivityRepository';

class SplitTimeActivityServices {
	async createSplitTimeActivity(
		parentActivityId: string,
		employeeId: string,
		splitTimeActivityData: any
	) {
		const parentTimeActivity =
			await timeActivityRepository.getSingleTimeActivity(parentActivityId);

		if (!parentTimeActivity) {
			throw new CustomError(404, 'Time activity not found');
		}

		if (parentTimeActivity?.employeeId !== employeeId) {
			throw new CustomError(400, 'Employee id must be same');
		}

		// const splitTimeActivity =
		// 	await splitTimeActivityRepository.getSplitTimeActivityByParentId(
		// 		parentActivityId
		// 	);

		// if (splitTimeActivity.length > 0) {
		// 	throw new CustomError(400, 'Time activities are already splitted');
		// }

		const parentHours = parentTimeActivity?.hours;
		const parentMinutes = parentTimeActivity?.minute;

		const parentFinalTime = Number(parentHours) * 60 + Number(parentMinutes);

		let totalHours = 0;
		let totalMinutes = 0;

		splitTimeActivityData?.forEach((obj: { minute: string; hours: string }) => {
			totalHours += parseInt(obj.hours, 10);
			totalMinutes += parseInt(obj.minute, 10);
		});

		// If totalMinutes exceeds 59, adjust totalHours accordingly
		if (totalMinutes >= 60) {
			const additionalHours = Math.floor(totalMinutes / 60);
			totalHours += additionalHours;
			totalMinutes %= 60;
		}

		const splitFinalTime = Number(totalHours) * 60 + Number(totalMinutes);

		if (splitFinalTime !== parentFinalTime) {
			throw new CustomError(
				400,
				'Split time cannot be greater than the parent time.'
			);
		}

		await splitTimeActivityRepository.create(
			parentActivityId,
			employeeId,
			splitTimeActivityData
		);

		const finalData =
			await splitTimeActivityRepository.getSplitTimeActivityByParentId(
				parentActivityId
			);

		return finalData;
	}

	async deleteSplitTimeActivity(splitTimeActivityData: {
		splitTimeActivityId: string;
	}) {
		const { splitTimeActivityId } = splitTimeActivityData;

		const deletedSplitActivity = await splitTimeActivityRepository.delete({
			splitTimeActivityId: splitTimeActivityId,
		});

		return deletedSplitActivity;
	}

	async deleteAllSplitTimeActivity(splitTimeActivityData: {
		timeActivityId: string;
	}) {
		const { timeActivityId } = splitTimeActivityData;

		const deletedSplitActivity =
			await splitTimeActivityRepository.deleteSplitActivity({
				timeActivityId: timeActivityId,
			});

		return deletedSplitActivity;
	}
}

export default new SplitTimeActivityServices();
