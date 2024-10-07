import config from '../../config';
import axios from 'axios';

/* eslint-disable @typescript-eslint/no-var-requires */
const OAuthClient = require('intuit-oauth');

const authClient = new OAuthClient({
	clientId: config?.quickbooksClientId,
	clientSecret: config?.quickbooksClientSecret,
	environment:
		config?.quickbooksEnvironment?.toLowerCase() === 'sandbox'
			? 'sandbox'
			: 'production',
	redirectUri: config?.quickbooksRedirectUri,
});

const ssoAuthClient = new OAuthClient({
	clientId: config?.quickbooksClientId,
	clientSecret: config?.quickbooksClientSecret,
	environment:
		config?.quickbooksEnvironment?.toLowerCase() === 'sandbox'
			? 'sandbox'
			: 'production',
	redirectUri: config?.quickbooksRedirectUri,
});

class QuickbooksAuthClient {
	async authorizeUri(stateValue: string) {
		try {
			let authUri = '';

			authUri = authClient.authorizeUri({
				scope: config?.quickbooksScopes?.split(','),
				state: stateValue,
			});
			return authUri;
		} catch (err) {
			throw err;
		}
	}

	async createAuthToken(url: string) {
		try {
			console.log('URL: ', url);
			const authToken = await authClient.createToken(url);
			return authToken.token;
		} catch (err) {
			throw err;
		}
	}

	async revokeToken(refreshToken: string) {
		try {
			const clientAuthorization = Buffer.from(
				config.quickbooksClientId + ':' + config.quickbooksClientSecret,
				'utf-8'
			).toString('base64');

			await axios
				.post(
					config?.quickbooksTokenRevokeEndpoint,
					{
						token: refreshToken,
					},
					{
						headers: {
							Accept: 'application/json',
							Authorization: `Basic ${clientAuthorization}`,
							'Content-Type': 'application/json',
						},
					}
				)
				.catch((err) => {
					throw err;
				});
		} catch (err) {
			throw err;
		}
	}

	async refreshToken(refreshToken: string) {
		try {
			const authResponse = await authClient.refreshUsingToken(refreshToken);
			return authResponse;
		} catch (err) {
			throw err;
		}
	}

	async ssoAuthorizeUri(stateValue: string) {
		try {
			let authUri = '';

			authUri = ssoAuthClient.authorizeUri({
				scope: config?.quickbooksSSOScopes?.split(','),
				state: stateValue,
			});
			return authUri;
		} catch (err) {
			throw err;
		}
	}
	async ssoCreateAuthToken(url: string) {
		try { 
			const authToken = await ssoAuthClient.createToken(url);
			return authToken.token;
		} catch (err) {
			throw err;
		}
	}

	async ssoRevokeToken(refreshToken: string) {
		try {
			const clientAuthorization = Buffer.from(
				config.quickbooksClientId + ':' + config.quickbooksClientSecret,
				'utf-8'
			).toString('base64');

			await axios
				.post(
					config?.quickbooksTokenRevokeEndpoint,
					{
						token: refreshToken,
					},
					{
						headers: {
							Accept: 'application/json',
							Authorization: `Basic ${clientAuthorization}`,
							'Content-Type': 'application/json',
						},
					}
				)
				.catch((err) => {
					throw err;
				});
		} catch (err) {
			throw err;
		}
	}

	async ssoRefreshToken(refreshToken: string) {
		try {
			const authResponse = await ssoAuthClient.refreshUsingToken(refreshToken);
			return authResponse;
		} catch (err) {
			throw err;
		}
	}
}

export default new QuickbooksAuthClient();
