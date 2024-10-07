import { Request } from 'express';

export interface RequestExtended extends Request {
	user?: any;
	file?: any;
	// session: any;
	idAdmin?: any;
	accessToken?: any;
	refreshToken?: any;
}

export interface DefaultResponseInterface {
	message: string;
	statusCode: number;
	data: any;
	total?: number;
	page?: number;
}

export interface PdfInterface {
	bodyHtml: string;
	headerHtml: string;
	footerHtml: string;
}
