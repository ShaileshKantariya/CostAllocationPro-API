export class CustomError {
	status: number;
	message: string;
	additionalInfo: any;
	constructor(
		status: number = 500,
		message: string = 'Something went wrong',
		additionalInfo: any = {}
	) {
		this.status = status;
		this.message = message;
		this.additionalInfo = additionalInfo;
	}
}
