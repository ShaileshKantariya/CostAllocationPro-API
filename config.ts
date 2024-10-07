import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Env file configuration
function config(Env: any) {
	return {
		port: Env?.PORT,
		reactAppBaseUrl: Env?.REACT_APP_BASE_URL,
		databaseHost: Env?.DATABASE_HOST,
		databaseUser: Env?.DATABASE_USER,
		databasePassword: Env?.DATABASE_PASSWORD,
		databaseName: Env?.DATABASE_NAME,
		databasePort: Env?.DATABASE_PORT,
		databaseUrl: Env?.DATABASE_URL,
		accessTokenSecretKey: Env?.ACCESS_TOKEN_SECRET_KEY,
		refreshTokenSecretKey: Env?.REFRESH_TOKEN_SECRET_KEY,
		forgotPasswordTokenSecretKey: Env?.FORGOT_PASSWORD_TOKEN_SECRET_KEY,
		smtpEmail: Env?.SMTP_EMAIL,
		smtpEmailLogin: Env?.SMTP_EMAIL_LOGIN,
		smtpPassword: Env?.SMTP_PASSWORD,
		smtpHost: Env?.SMTP_HOST,
		smtpPort: Env?.SMTP_PORT,
		forgotPasswordUrlExpireTime: 30 * 60 * 1000, // in milliseconds - 30 minutes
		registerUrlExpireTime: 7 * 24 * 60 * 60 * 1000, // in milliseconds - 7 days
		accessTokenExpireTime: 24 * 60 * 60, // in seconds
		refreshTokenExpireTime: 10 * 24 * 60 * 60, // in seconds
		resetPasswordReactUrl: `${Env?.REACT_APP_BASE_URL}/reset-password`,
		changePasswordReactUrl: `${Env?.REACT_APP_BASE_URL}/reset-password`,
		s3accessKeyId: Env?.S3_ACCESSKEYID,
		s3secretAccessKey: Env?.S3_SECRETACCESSKEY,
		s3BaseUrl: Env?.S3_BASE_URL,
		quickbooksClientId: Env?.QUICKBOOKS_CLIENT_ID,
		quickbooksClientSecret: Env?.QUICKBOOKS_CLIENT_SECRET,
		quickbooksEnvironment: Env?.QUICKBOOKS_ENVIRONMENT,
		quickbooksRedirectUri: Env?.QUICKBOOKS_REDIRECT_URI,
		quickbooksSSORedirectUri: Env?.QUICKBOOKS_SSO_REDIRECT_URI,
		quickbooksUserInfoUri: Env?.QUICKBOOKS_USERINFO_ENDPOINT,
		quickbooksScopes: Env?.QUICKBOOKS_SCOPES,
		quickbooksSSOScopes: Env?.QUICKBOOKS_SSO_SCOPES,
		quickbooksTokenRevokeEndpoint: Env?.QUICKBOOKS_TOKEN_REVOKE_ENDPOINT,
		employeeSyncLambdaEndpoint: Env?.EMPLOYEE_SYNC_LAMBDA_ENDPOINT,
		employeeSyncLambdaApiKey: Env?.EMPLOYEE_SYNC_API_KEY,
		timeactivitySyncLambdaEndpoint: Env?.TIME_ACTIVITY_SYNC_LAMBDA_ENDPOINT,
		timeactivitySyncLambdaApiKey: Env?.TIME_ACTIVITY_SYNC_API_KEY,
		routeBasePath: Env?.ROUTE_BASE_PATH,
		SSO_PASSWORD: Env?.SSO_PASSWORD,
		SSO_AUDIENCE: Env?.SSO_AUDIENCE,
		SSO_ISUSER: Env?.SSO_ISUSER,
		SSO_ACSURL: Env?.SSO_ACSURL,
	};
}

export default {
	...config(process.env),
};
