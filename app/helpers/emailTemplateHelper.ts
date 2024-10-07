// Send email to user for forgot password
import config from '../../config';
export const getForgotPasswordTemplate = (data: any) => {
	const { fullName, url } = data;
	return `<!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Let's Reset your Password</p>
									<p>Hi <b>${fullName}</b>,</p>
									<p>We have received a request to reset your password.</p>
									<p>If you didn't make this request, please disregard this message. However, if you did the password reset, you can proceed to reset now. </p>
										<br/>
									<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Reset Your Password<a/></p>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
									</div>
						</div> 
					</div>
				</body>
			</html>`;
};

// Send email to user when he subscribe to zoho
export const getRegisterEmailTemplate = (data: any) => {
	const { fullName, url } = data;

	return `
  <!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>Browser</title>
				</head>
				<body>

 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:Lexend">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
							<a href="${config.reactAppBaseUrl}" target="_blank">
							
							<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</a>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Welcome to CostAllocation Pro.</p>
									<p>Hi <b>${fullName}</b>, Thank you for subscribing to CostAllocation Pro. Please click the button below to sign in.</p>
                  <p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Sign In<a/> </p>
									<p style="margin:30px 0px">Checkout our easy guide to get started by clicking <a href='https://www.costallocationpro.com/onboarding'>Getting Started<a/> </p>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div>
					</div>
				</body>
			</html>
  `;
};

// Send email to user on invitation when he is already exist
export const getInvitationEmailUserExistTemplate = (data: any) => {
	const { firstName, lastName, companyName, url } = data;

	return `
    <!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Invitation to join the company.</p>
									<p>Hi <b>${firstName || ''}${lastName ? ` ${lastName}` : ''}</b>,</p>
									<p>You have been invited to join <b>${companyName}</b> on CostAllocation Pro. </p>
									<p>To log in,  
										<br/>
									<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Click Here<a/></p>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div> 
					</div>
				</body>
			</html>
  `;
};

// Send email to admin on user invitation
export const getInvitationAdminMailTemplate = (data: any) => {
	const { finalName, firstName, lastName, companyName, url } = data;

	return `
    <!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Invitation to join the company.</p>
									<p>Hi <b>${finalName}</b>,</p>
									<p>		You just invited ${firstName || ''} ${
		lastName || ''
	} to ${companyName} on CostAllocation Pro.</p><p> If you don't want this person on your account, you can delete them from your Manage Users page.</p>  
										<br/>
									<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Click Here<a/> to view the Manage Users page.</p>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div> 
					</div>
				</body>
			</html>
  `;
};

// Send email to user on invitation for the first time
export const getInvitationEmailUserTemplate = (data: any) => {
	const { firstName, lastName, companyName, url } = data;

	return `
 <!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Invitation to join the company.</p>
									<p>Hi <b>${firstName || ''}${lastName ? ` ${lastName}` : ''}</b>,</p>
									<p>You have been invited to join <b>${companyName}</b> on CostAllocation Pro.</p>  
									<p>Please generate password for your account to access our portal using below link :</p>  
										<br/>
									<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Generate Password<a/></p>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div> 
					</div>
				</body>
			</html>
  `;
};

// Send email to admin when user is deleted
export const getAdminEmailOnUserDeleteTemplate = (data: any) => {
	const { adminUserName, firstName, lastName, companyName, url } = data;

	return `	
 		<!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Your Access has been Revoked - CostAllocation Pro</p>
									<p>Hi <b>${adminUserName}</b>,</p>
									<p>	User access for ${firstName || ''} ${
		lastName || ''
	} has been removed from ${companyName} on CostAllocation Pro.</p>  
									<p>To view the Manage Users page </p>  
										<br/>
									<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Click Here<a/></p>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div> 
					</div>
				</body>
			</html>
	`;
};

// Send email to the user who is deleted
export const getUserEmailOnDeleteTemplate = (data: any) => {
	const { firstName, lastName, companyName } = data;

	return `
		<!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Your Access has been Revoked - CostAllocation Pro</p>
									<p>Hi <b>${firstName || ''}${lastName ? ` ${lastName}` : ''}</b>,</p>
									<p>	Your user access for ${companyName} on CostAllocation Pro has been removed. </p>  
									<p>Please contact the Administrator on your account if you have any questions.  </p>  
								 	</div>
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div> 
							</div> 
					</div>
				</body>
			</html>
	`;
};

//Send Email on password change
export const getChangePasswordTemplate = (data: any) => {
	const { password, fullName } = data;
	return `<!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
						<title>Browser</title> 
				</head>
				<body>
				 
 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:'Lexend', sans-serif;">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
								<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Let's Reset your Password</p>
									<p>Hi <b>${fullName}</b>,</p>
									<p>Your password has been successfully changed by CostAllocationPro.</p>
									<p>You can use this temporary password: <b>${password}</b> for login. Don't forget to change your password later.</p> 
									<br/>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
									</div>
						</div> 
					</div>
				</body>
			</html>`;
};

// Send email to user when he subscribe to zoho
export const getAddNewSubscriptionEmail = (data: any) => {
	const { fullName, url } = data;

	return `
  <!DOCTYPE html>
			<html lang="en">
				<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>Browser</title>
				</head>
				<body>

 				 <div style="width:100%; min-height:60vh;display:block; background-color:#f8f1e9; padding : 200px 0px; font-family:Lexend">
						<div class="my-card" style="background-color:#fff; border:2px solid #e0e0eb; padding:30px; max-width:470px; border-radius:15px; margin:auto">
							<div class="card-header">
							<a href="${config.reactAppBaseUrl}" target="_blank">
							
							<img src="https://costallocationspro.s3.amazonaws.com/image/cap-logo.png" width="200"/>
							</a>
							</div>
							<div class="card-body">
									<p style="font-weight:600; font-size:20px">Welcome to CostAllocation Pro.</p>
									<p>Hi <b>${fullName}</b>, Thank you for subscribing to CostAllocation Pro. Please click the button below to add new company.</p>
                  					<p style="margin:30px 0px"><a href='${url}' style="color:white;text-decoration:none;border:none;border-radius:20px;padding:8px 20px;background-color:#000;">Add New Company<a/> </p>
									<p style="margin:30px 0px">Checkout our easy guide to get started by clicking <a href='https://www.costallocationpro.com/onboarding'>Getting Started<a/> </p>
									<p>	Best Regards,</p>
									<p> CostAllocation Pro Team</p>
								</div>
						</div>
					</div>
				</body>
			</html>
  `;
};
