import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import payPeriodRepository from '../repositories/payPeriodRepository';
import { ITimeActivitySummaryQuery } from '../interfaces/reportInterface';
import moment from 'moment';
import { hasText } from '../utils/utils';
import { prisma } from '../client/prisma';

function mapJSONDataToArray(jsonData: any) {
	const headers = ['Name', ...jsonData.classNames, 'Total Hours'];
	const dataArray = [headers];

	for (const obj of jsonData.timeActivitySummary) {
		const values = [];
		values.push(obj.name);
		jsonData.classNames.forEach((e: string) => {
			if (obj[e]) {
				values.push(obj[e]);
			} else {
				values.push('');
			}
		});
		values.push(obj.totalHours);
		dataArray.push(values);
	}

	return dataArray;
}

export const generateTimeSummaryReportPdf = async (
	costAllocationData: any,
	filePath: string,
	companyName: string,
	query: ITimeActivitySummaryQuery
) => {
	let payPeriod: {
		startDate?: string | Date;
		endDate?: string | Date;
	} = {};
	if (query.payPeriodId) {
		payPeriod = await payPeriodRepository.getDatesByPayPeriod(
			query.payPeriodId
		);
	}

	const tableData = mapJSONDataToArray(costAllocationData);
	const doc = new PDFDocument({
		size: [
			(costAllocationData.classNames.length + 2) * 225,
			tableData.length * 100 + 300,
		],
	});

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
	const titleText = 'Report Name : Time Summary Report';
	const titleOptions: any = {
		width: 500,
		fontSize: 32,
		color: 'black',
	};
	const titleY = imageY + 60;
	doc.text(titleText, imageX, titleY, titleOptions);

	// Company Details
	const companyTitle = `Company Name : ${companyName}`;
	const companyY = titleY + 40;
	doc.text(companyTitle, imageX, companyY, titleOptions);

	// Pay period
	let payPeriodDetails = '';
	let payPeriodY;

	if (payPeriod.startDate && payPeriod.endDate) {
		payPeriodDetails = `Pay Period : ${moment(payPeriod.startDate).format(
			'MM/DD/YYYY'
		)} - ${moment(payPeriod.endDate).format('MM/DD/YYYY')}`;
		payPeriodY = companyY + 40;
		doc.text(payPeriodDetails, imageX, payPeriodY, titleOptions);
	}

	// Table
	const cellWidth = 200;
	const cellHeight = 74;
	const borderWidth = 1;

	function drawTable(table: any, x: any, y: any) {
		for (let i = 0; i < table.length; i++) {
			const row = table[i];
			for (let j = 0; j < row.length; j++) {
				if (i === 0) {
					doc.fillColor('#333');
				} else {
					doc.fillColor('#FFFFFF');
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
	const tableY =
		payPeriod?.startDate && payPeriod?.endDate
			? Number(payPeriodY) + 40
			: companyY + 40;

	drawTable(tableData, tableX, tableY);

	const stream = fs.createWriteStream(filePath);
	doc.pipe(stream);
	doc.end();
	return stream;
};

function mapJSONDataToArrayPayroll(jsonData: any) {
	const headerNames: any = [];
	const headerValues: any = [];

	jsonData.headers.forEach((data: { name: string; value: string }) => {
		headerNames.push(data.name);
		headerValues.push(data.value);
	});

	const headers = ['Employee Name', 'Allocation', ...headerNames, 'Total'];
	const headersMapping = [
		'employee-name',
		'allocation',
		...headerValues,
		'total',
	];
	const dataArray = [headers];

	for (const obj of jsonData.payrollSummaryData) {
		const values: any = [];
		headersMapping.forEach((e: string) => {
			const value =
				typeof obj[e] === 'number'
					? `$ ${Number(obj[e]).toFixed(e === 'allocation' ? 4 : 2)}`
					: obj[e];
			values.push(value);
		});
		dataArray.push(values);
	}

	return dataArray;
}

export const generatePayrollSummaryReportPdf = async (
	payrollSummaryData: any,
	headers: any,
	filePath: string,
	companyName: string,
	query: ITimeActivitySummaryQuery
) => {
	let payPeriod: {
		startDate?: string | Date;
		endDate?: string | Date;
	} = {};
	if (query.payPeriodId) {
		payPeriod = await payPeriodRepository.getDatesByPayPeriod(
			query.payPeriodId
		);
	}

	const tableData = mapJSONDataToArrayPayroll({
		payrollSummaryData: payrollSummaryData,
		headers: headers,
	});
	const doc = new PDFDocument({
		size: [(headers.length + 3) * 200, tableData.length * 100 + 600],
	});

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
	const titleText = 'Report Name : Payroll Summary Report';
	const titleOptions: any = {
		width: 500,
		fontSize: 32,
		color: 'black',
	};
	const titleY = imageY + 60;
	doc.text(titleText, imageX, titleY, titleOptions);

	// Company Details
	const companyTitle = `Company Name : ${companyName}`;
	const companyY = titleY + 40;
	doc.text(companyTitle, imageX, companyY, titleOptions);

	// Pay period
	let payPeriodDetails = '';
	let payPeriodY;

	if (payPeriod.startDate && payPeriod.endDate) {
		payPeriodDetails = `Pay Period : ${moment(payPeriod.startDate).format(
			'MM/DD/YYYY'
		)} - ${moment(payPeriod.endDate).format('MM/DD/YYYY')}`;
		payPeriodY = companyY + 40;
		doc.text(payPeriodDetails, imageX, payPeriodY, titleOptions);
	}

	// Employee
	let empDetails = '';
	let empY;

	if (hasText(query.employeeId)) {
		const empData = await prisma.employee.findFirst({
			where: {
				companyId: query.companyId,
				id: query.employeeId
			}
		});

		if (empData && empData?.fullName) {
			empDetails = `Employee: ${empData.fullName}`
			empY = payPeriodY ? payPeriodY + 40 : companyY + 40;
			doc.text(empDetails, imageX, empY, titleOptions);
		}
	}

	// Customer
	let customerDetails = '';
	let customerY;

	if (hasText(query.customerId)) {
		const customerData = await prisma.timeActivities.findFirst({
			where: {
				companyId: query.companyId,
				customerId: query.customerId
			}
		});

		if (customerData && customerData?.customerName) {
			customerDetails = `Customer: ${customerData.customerName}`
			customerY = empY ? empY + 40 : payPeriodY ? payPeriodY + 40 : companyY + 40;
			doc.text(customerDetails, imageX, customerY, titleOptions);
		}
	}

	// Class
	let classDetails = '';
	let classY;

	if (hasText(query.classId)) {
		const classData = await prisma.timeActivities.findFirst({
			where: {
				companyId: query.companyId,
				classId: query.classId
			}
		});

		if (classData && classData?.className) {
			classDetails = `Class: ${classData.className}`
			classY = customerY ? customerY + 40 : empY ? empY + 40 : payPeriodY ? payPeriodY + 40 : companyY + 40;
			doc.text(classDetails, imageX, classY, titleOptions);
		}
	}

	// Table
	const cellWidth = 180;
	const cellHeight = 74;
	const borderWidth = 1;

	function drawTable(table: any, x: any, y: any) {
		for (let i = 0; i < table.length; i++) {
			const row = table[i];
			for (let j = 0; j < row.length; j++) {
				if (i === 0) {
					doc.fillColor('#333');
				} else {
					doc.fillColor('#FFFFFF');
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
	const tableY =
		classY ? classY + 40 :
			empY ? empY + 40 :
				customerY ? customerY + 40 :
					payPeriodY ? Number(payPeriodY) + 40
						: companyY + 40;

	drawTable(tableData, tableX, tableY);

	const stream = fs.createWriteStream(filePath);
	doc.pipe(stream);
	doc.end();
	return stream;
};
