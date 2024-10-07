import * as xml2js from 'xml2js';

export function getSkipRecordCount(pageNo: number, pageSize: number) {
	return (Math.max(1, Number(pageNo)) - 1) * Math.min(100, Number(pageSize));
}

export function sortArray(arr: any, type: string, field: string) {
	if (type === 'asc') {
		return arr.sort((a: any, b: any) => a[field].localeCompare(b[field]));
	} else {
		return arr.sort((a: any, b: any) => b[field].localeCompare(a[field]));
	}
}

export function isBlank(value?: string | number | null) {
	return (
		null === value ||
		undefined === value ||
		value.toString().trim().length === 0
	);
}

export function hasText(value?: string) {
	return !isBlank(value);
}

export function parseXml(xmlString: string) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(
			xmlString,
			{ explicitArray: false, explicitRoot: false },
			(err: any, result: any) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			}
		);
	});
}

export function getFiscalYearDates(month: number, fiscalStartMonth: number, year?: number) {
	// If year is not provided, calculate the current fiscal year
	if (!year) {
		const currentMonth = new Date().getMonth() + 1; // Adding 1 since getMonth() is zero-based
		year = new Date().getFullYear() - (currentMonth < fiscalStartMonth ? 1 : 0);
	}

	// Adjust fiscal start year based on the input month
	const fiscalStartYear = year - (month < fiscalStartMonth ? 1 : 0);

	// Calculate the start and end dates of the fiscal year
	const fiscalStartDate = new Date(fiscalStartYear, fiscalStartMonth - 1, 1);
	const fiscalEndDate = new Date(fiscalStartYear + 1, fiscalStartMonth - 1, 0);

	return {
		startDate: fiscalStartDate,
		endDate: fiscalEndDate
	};
}

export const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export function removeCommaAndDollar(numberWithCommaDollar: string) {
	// Remove anything other than numbers, negative sign, and decimal points using regular expressions
	return numberWithCommaDollar.replace(/[^\d.-]/g, '');
}