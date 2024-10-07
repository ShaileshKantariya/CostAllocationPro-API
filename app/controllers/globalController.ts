import { NextFunction, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import globalServices from '../services/globalServices';
import { logger } from '../utils/logger';
// import { DefaultResponse } from '../helpers/defaultResponseHelper';

class GlobalController {
	async pdfGenerator(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const { bodyHtml, headerHtml, footerHtml } = req.body;

			// const headerHtml = `

			//                     <div style="text-align: left; font-size: 12px;">
			//                       Company Name
			//                     </div>
			//                     <div style="text-align: center; font-size: 16px;">
			//                       Time Sheet
			//                     </div>
			//                   `;

			// const bodyHtml = `<!DOCTYPE html>
			//                     <html>
			//                       <h1>Body</h1>
			//                     </html>`;

			// const footerHtml = `

			//                     <div style="text-align: center;">
			//                       <h1>Footer</h1>
			//                     </div>
			//                   `;

			const data = {
				bodyHtml: bodyHtml as string,
				headerHtml: headerHtml as string,
				footerHtml: footerHtml as string,
			};

			const pdf = await globalServices.generatePdf(data);

			return res.end(pdf);
		} catch (err) {
			logger.error('Error while making pdf ', err)
			next(err);
		}
	}
}

export default new GlobalController();
