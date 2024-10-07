import { PdfInterface } from '../interfaces/global';
import puppeteer from 'puppeteer';
import fs from 'fs';

class GlobalService {
	async generatePdf(pdfData: PdfInterface) {
		const { bodyHtml, footerHtml, headerHtml } = pdfData;

		const browser = await puppeteer.launch({
			dumpio: true,
			headless: true,
			args: ['--disable-setuid-sandbox', '--no-sandbox', '--disable-gpu'],
		});
		const page = await browser.newPage();

		const htmlString = bodyHtml;

		await page.setContent(htmlString);

		// Generate the PDF as a buffer
		const pdfBuffer = await page.pdf({
			format: 'A4',
			displayHeaderFooter: true,
			headerTemplate: headerHtml,
			footerTemplate: footerHtml,
			preferCSSPageSize: true,
			margin: {
				top: '80px',
				bottom: '80px',
				right: '80px',
				left: '80px',
			},
		});

		fs.writeFileSync('output.pdf', pdfBuffer);
		// Convert the buffer to a base64 string
		const pdfBase64 = pdfBuffer.toString('base64');

		// Log or return the base64-encoded PDF

		await browser.close();

		return pdfBase64;
	}
}

export default new GlobalService();
