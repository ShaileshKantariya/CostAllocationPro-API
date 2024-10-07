import moment from 'moment';

export const generatePdf = (
	pdfData: any,
	singleEmployee: any,
	customers: any,
	companyName: string
) => {
	const { allTimeLogs, startDate, endDate, totalHours, totalMinutes, timeSheetId } = pdfData;

	const { fullName } = singleEmployee;

	let htmlData = ``;

	let customerData = ``;

	allTimeLogs?.forEach((singleTimeLog: any) => {
    if (singleTimeLog.timeSheetId === timeSheetId) {
      if (
        singleTimeLog?.SplitTimeActivities &&
        singleTimeLog?.SplitTimeActivities.length > 0
      ) {
        singleTimeLog?.SplitTimeActivities.forEach((singleSplitTimeLog: any) => {
          htmlData += `<tr>
                      <td>${moment(singleSplitTimeLog?.activityDate).format(
                        'MM/DD/YYYY'
                      )}</td>
                        <td>${
                          singleSplitTimeLog?.className
                            ? singleSplitTimeLog?.className
                            : '-'
                        }</td>
                        <td>${singleSplitTimeLog?.customerName}</td>
                        <td>${singleSplitTimeLog?.hours} : ${
            singleSplitTimeLog?.minute
          }</td>
                      </tr>`;
        });
      } else {
        htmlData += `<tr>
                      <td>${moment(singleTimeLog?.activityDate).format(
                        'MM/DD/YYYY'
                      )}</td>
                        <td>${
                          singleTimeLog?.className
                            ? singleTimeLog?.className
                            : '-'
                        }</td>
                        <td>${singleTimeLog?.customerName}</td>
                        <td>${singleTimeLog?.hours} : ${
          singleTimeLog?.minute
        }</td>
                      </tr>`;
      }
    }
	});

	customers?.forEach((singleCustomer: any) => {
		customerData += `<tr>
                        <td>${singleCustomer?.customerName}</td>
                        <td>${singleCustomer?.hours}</td>
                        </td>
                      </tr>`;
	});

	return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
        *{
            font-family: Arial, sans-serif;
        }
          table {
              width: 100%;
              border-collapse: collapse;
          }

          table, th, td {
              border: 1px solid black;
          }

          th, td {
              padding: 8px;
              text-align: left;
          }
          
      </style>
  </head>
  <body>
      <div style="margin: 0; padding: 0; box-sizing: border-box; font-family: Arial;"> 
				<div style="margin-bottom:20px;  ">
				<img src='https://costallocationspro.s3.amazonaws.com/cap-logonew.png' width="180px" style="float: left;"/>
				<p style="text-align: center; padding-top: 12px; padding-right:150px; font-weight:800">Time Sheet</p>
			</div>
      <br/> 
      <p>Employee Name: ${fullName}</p>
      <p>Company Name: ${companyName}</p>
      <p>Pay Period: ${moment(startDate).format('MM/DD/YYYY')} - ${moment(
		endDate
	).format('MM/DD/YYYY')}</p>
      <p>Total Time: ${totalHours} Hours ${totalMinutes} Minutes</p>

      <table>
        <tr>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Date</th>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Class Name</th>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Customer Name</th>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Hours</th> 
        <tr>
        <tbody> 
          ${htmlData}
        </tbody>
      </table>
    
      <br/>
    
      <table> 
        <tr>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Customer Name</th>
          <th style="background-color: #333; color: white; padding: 8px; text-align: left;">Hours</th>
        </tr> 
      <tbody> 
        ${customerData}
      </tbody>
      </table>
      <br/>
      <p> I certify that this is a correct representation of actual hours worked for the time period shown above.
         <table style="border-collapse: separate; border-spacing: 10px 5px; border: none;">
          <tr>
            <td style="padding: 5px; text-align: left; border: none;">Employee Signature :</td>
            <td style="padding: 5px; text-align: left; border: none;">Supervisor Signature :</td>
          </tr>
          <tr>
            <td style="padding: 5px; text-align: left; border: none;">Date: __________________</td>
            <td style="padding: 5px; text-align: left; border: none;">Date: __________________</td>
          </tr>
        </table> 
      </body>
  </html>
`;
};
