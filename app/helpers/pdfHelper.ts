export const timeLogPdfGenerate = async (
	allTimeLogs: any,
	//startDate: any,
	//endDate: any,
	//employee: any,
	//totalHours: any
) => {
	return `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
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
      <p>Employee Name: "Ayush"</p>
      <p>Month: "February"</p>
      <p>Total Hours: 156</p>

      <table>
          <thead>
              <tr>
                  <th>Date</th>
                  <th>Employee Name</th>
                  <th>Customer Name</th>
                  <th>Class Name</th>
                  <th>Hours</th>
              </tr>
          </thead>
          <tbody> 
          ${allTimeLogs?.map((singleTimeLog: any) => {
						return `<tr>
									<td>${singleTimeLog?.activityDate}</td>
									<td>${singleTimeLog?.employee?.fullName}</td>
									<td>${singleTimeLog?.className}</td>
									<td>${singleTimeLog?.customerName}</td>
									<td>${singleTimeLog?.hours}:${singleTimeLog?.minute}</td>
								</tr>`;
					})}
          </tbody>
      </table>
  </body>
  </html>


  `;
};
