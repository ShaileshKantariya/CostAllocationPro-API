import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import payPeriodRepository from '../repositories/payPeriodRepository';
import { getFormattedDates } from '../helpers/global';

function mapJSONDataToArray(jsonData: any) {
	const headers = Object.keys(jsonData[0]);
	const dataArray = [headers];

	for (const obj of jsonData) {
		const values = headers.map((key) => obj[key]);
		dataArray.push(values);
	}

	return dataArray;
}

export const generatePdf = async (
	costAllocationData: any,
	counts: any,
	filePath: string,
	payPeriodId: string,
	companyName: string
) => {
	const classArr: string[] = [];

	const customerArr: string[] = [];

	costAllocationData.forEach((e: any) => {
		if(e['Class Name']) {
			if (!classArr.includes(e['Class Name'])) {
				classArr.push(e['Class Name']);
			}
		}

		if (e['Customer Name']) {
			if (!customerArr.includes(e['Customer Name'])) {
				customerArr.push(e['Customer Name']);
			}
		}
	});

	let classLength = 0;
	let customerLength = 0;

	classArr.forEach((item: any) => {
		if (item && item.length && item.length > classLength) {
			classLength = item.length;
		}
	});

	customerArr.forEach((item: any) => {
		if (item && item.length && item.length > customerLength) {
			customerLength = item.length;
		}
	});

	let finalWidth = classLength * 10;

	if (customerLength > classLength) {
		finalWidth = customerLength * 10;
	}

	if(finalWidth < 150) {
		finalWidth = 150
	}

	const { salaryExpenseAccounts, fringeExpense, payrollTaxesExpense } = counts;
	const tableData = mapJSONDataToArray(costAllocationData);

	const salaryExpenseAccountsCounts = 5 + salaryExpenseAccounts;
	const payrollTaxesExpenseCounts =
		salaryExpenseAccountsCounts + payrollTaxesExpense;
	const fringeExpenseCounts = payrollTaxesExpenseCounts + fringeExpense;

	const doc = new PDFDocument({
		size: [tableData[0].length * finalWidth + 100, tableData.length * 100 + 200],
	});
	// doc.pipe(stream);

	// Image
	const image = 'https://costallocationspro.s3.amazonaws.com/cap-logonew.png';
	const imageX = 50;
	const imageY = 50;
	const imageWidth = 200;

	const response = await axios.get(image, { responseType: 'arraybuffer' });
	const imageBuffer = Buffer.from(response.data);
	doc.image(imageBuffer, imageX, imageY, {
		width: imageWidth,
		height: 40,
	});

	// Title
	const titleText = 'Report Name : Cost Allocations';
	const titleOptions: any = {
		width: 500,
		fontSize: 40,
		color: 'black',
	};
	const titleY = imageY + 60;
	doc.text(titleText, imageX, titleY, titleOptions);

	// Date
	const { startDate, endDate } = await payPeriodRepository.getDatesByPayPeriod(
		payPeriodId
	);
	const dateX = imageX;
	const dateY = titleY + 40;
	const date = `Pay Period : ${getFormattedDates(startDate!, endDate!)}`;
	doc.text(date, dateX, dateY, titleOptions);

	// Company Details

	const companyTitle = `Company Name : ${companyName}`;
	const companyY = dateY + 40;
	doc.text(companyTitle, imageX, companyY, titleOptions);

	// Table
	const cellWidth = finalWidth;
	// const cellWidth = 150;
	const cellHeight = 74;
	const borderWidth = 1;

	function drawTable(table: any, x: any, y: any) {
		for (let i = 0; i < table.length; i++) {
			const row = table[i];
			for (let j = 0; j < row.length; j++) {
				// Set the cell background color
				if (i === 0) {
					// If it's the first row (header row), change the background color
					doc.fillColor('#485949'); // Change the color as needed
				} else {
					if (j < 3) {
						doc.fillColor('#ffffff');
					} else if (j >= 3 && j <= 4) {
						doc.fillColor('#FCF9E1');
					} else if (j >= 5 && j < salaryExpenseAccountsCounts) {
						doc.fillColor('#E7EFF8');
					} else if (
						j >= salaryExpenseAccountsCounts &&
						j < payrollTaxesExpenseCounts
					) {
						doc.fillColor('#E1F1EB');
					} else if (
						j >= payrollTaxesExpenseCounts &&
						j < fringeExpenseCounts
					) {
						doc.fillColor('#F3EDE7');
					} else {
						doc.fillColor('#DFE9ED');
					}
				}

				doc.fontSize(16);
				// Fill the cell background
				doc
					.rect(x + j * cellWidth, y + i * cellHeight, cellWidth, cellHeight)
					.fill();

				// Set the text color
				if (i === 0) {
					// If it's the first row (header row), change the background color
					doc.fillColor('#FFFFFF'); // Change the color as needed
				} else {
					doc.fillColor('#000000'); // Default background color for other rows
				}

				// Calculate vertical position for text to center it within the cell
				const textHeight = doc.heightOfString(row[j], {
					width: cellWidth - 2 * borderWidth,
					align: 'center',
				});
				const textY = y + i * cellHeight + (cellHeight - textHeight) / 2;

				// Draw the cell content
				doc.text(row[j], x + j * cellWidth + borderWidth, textY, {
					width: cellWidth - 2 * borderWidth,
					align: 'center',
				});

				// Draw cell borders
				doc
					.rect(x + j * cellWidth, y + i * cellHeight, cellWidth, cellHeight)
					.stroke();
			}
		}
	}

	const tableX = 50;
	const tableY = companyY + 40;

	drawTable(tableData, tableX, tableY);

	const stream = fs.createWriteStream(filePath);
	doc.pipe(stream);
	doc.end();
	return stream;
};
