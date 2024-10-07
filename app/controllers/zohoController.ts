/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { promisify } from 'util';
import config from '../../config';
import { hasText, parseXml } from '../utils/utils';
import zohoService from '../services/zohoService';

const samlp = require('samlp');

const readFileAsync = promisify(fs.readFile);

type userType = {
	email: string;
};

type samlResponseType = {
	audience: string;
	isuser: string;
	recipient: string;
	cert: crypto.KeyObject;
	TimeToBeExpired: number; // 30 minutes in milliseconds
	inResponseTo: string;
	profileMapper: any;
};

class ZohoController {
	async SSOLogin(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const email = req.user?.email || '';

			if (!email) {
				throw new CustomError(400, 'Email required');
			}

			// Generate SAML response using the SAML request and user's email
			const samlResponse = await CommonMethods.GenerateSamlResponse(
				req.body.sAMLRequest,
				email
			);
			console.log('samlResponse: ', samlResponse);

			// Check if the SAML response is null or empty, and return an error response if true
			if (!samlResponse) {
				return new CustomError(400, 'SAML response is invalid.');
			}

			// Return a success response with SSO model containing SAML response, ACS URL, and RelayState

			return DefaultResponse(res, 200, 'Success', {
				SAMLResponse: samlResponse,
				ACSUrl: config.SSO_ACSURL,
				RelayState: req.body.relayState,
			});
		} catch (err) {
			next(err);
		}
	}

	async callback(req: Request, res: Response, next: NextFunction) {
		try {
			return res.json({
				result: true
			})
		} catch (error) {
			next(error)
		}
	}

	async refreshToken(req: Request, res: Response, next: NextFunction) {
		try {
			const data = await zohoService.refreshToken();

			return DefaultResponse(res, 200, 'Success', {
				result: data
			});
		} catch (error) {
			next(error)
		}
	}

	async getToken(req: Request, res: Response, next: NextFunction) {
		try {

			const data = await zohoService.generateToken(req.body.url);

			return DefaultResponse(res, 200, 'Success', {
				result: data
			});
		} catch (error) {
			next(error)
		}
	}

	async createHostedPage(req: Request, res: Response, next: NextFunction) {
		try {

			if (!hasText(req.query.companyId as any)) {
				return DefaultResponse(res, 200, 'Success', {
					hostedUrl: `${process.env.DEFAULT_ZOHO_PLAN}`
				});
			}

			const data = await zohoService.createHostedPage(req.query.companyId as unknown as string);

			return DefaultResponse(res, 200, 'Success', {
				hostedUrl: data
			});

		} catch (error) {
			next(error)
		}
	}

	async getSubscriptionDetailsById(req: Request, res: Response, next: NextFunction) {
		try {

			const data = await zohoService.getSubscriptionDetailsById(req.params.id as string);

			return DefaultResponse(res, 200, 'Success', {
				hostedUrl: data
			});

		} catch (error) {
			next(error)
		}
	}
}

class SamlResponseFactoryService {
	static CreateSamlResponse(args: samlResponseType, user: userType): string {
		const samlResponse = samlp.authnresponse(args, user);

		return samlResponse;
	}
}

class CommonMethods {
	static async GenerateSamlResponse(
		sAMLRequest: string,
		email: string
	): Promise<string> {
		// Decode the SAML request
		const sAMLRequestDecoded: any =
			CommonMethods.DecodeSAMLRequest(sAMLRequest);
		console.log('sAMLRequestDecoded: ', sAMLRequestDecoded);

		// Load the decoded SAML request into an XML document
		const sAMLRequestDoc: any = await parseXml(sAMLRequestDecoded);
		console.log('sAMLRequestDoc: ', sAMLRequestDoc);

		// Get the root element of the SAML request and extract the "ID" attribute
		const sAMLRequestRoot = sAMLRequestDoc.documentElement;
		console.log('sAMLRequestRoot: ', sAMLRequestRoot);

		const id = sAMLRequestRoot.getAttribute('ID') || '';
		console.log('ID: ', id);

		// Define the path to the signing certificate (PFX file)
		const pfxpath = path.join(__dirname, '..', 'costallocationpro.pfx');
		console.log('pfxpath: ', pfxpath);

		// Check if the PFX file exists, and throw an exception if not
		if (!fs.existsSync(pfxpath)) {
			throw new CustomError(400, 'Signing Certificate is missing!');
		}

		// Load the signing certificate from the PFX file using the provided password
		const cert = await CommonMethods.loadCertificate(
			pfxpath,
			config.SSO_PASSWORD
		);

		const user = {
			email: email,
		};

		// Create arguments for the SAML response factory
		const samlResponseFactoryArgs: samlResponseType = {
			audience: config.SSO_AUDIENCE,
			isuser: config.SSO_ISUSER,
			recipient: config.SSO_ACSURL,
			cert: cert,
			TimeToBeExpired: 30 * 60 * 1000, // 30 minutes in milliseconds
			inResponseTo: id,
			profileMapper: (user: userType) => {
				// Map user data to SAML attributes
				return {
					email: user.email,
				};
			},
		};

		// Create the SAML response using the factory service
		const samlResponse = SamlResponseFactoryService.CreateSamlResponse(
			samlResponseFactoryArgs,
			user
		);
		console.log('samlResponse: ', samlResponse);

		// Convert the SAML response to a Base64-encoded string
		const encodedSamlResponse = Buffer.from(samlResponse).toString('base64');
		console.log('encodedSamlResponse: ', encodedSamlResponse);

		// Return the Base64-encoded SAML response
		return encodedSamlResponse;
	}

	static async DecodeSAMLRequest(samlRequest: string) {
		// Convert the Base64-encoded SAML request string to a byte array
		const samlBytes = Buffer.from(samlRequest, 'base64');

		// Inflate the DEFLATE-compressed SAML request
		const decodedSaml = zlib.inflateSync(samlBytes).toString('utf-8');
		console.log('decodedSaml: ', decodedSaml);

		// Convert the decoded SAML string to an XML document
		const samlXml: any = await parseXml(decodedSaml);
		console.log('samlXml: ', samlXml);

		// Return the outer XML representation of the SAML document
		return samlXml.toString();
	}

	private static async loadCertificate(pfxpath: string, password: string) {
		const certBuffer = await readFileAsync(pfxpath);
		return crypto.createPrivateKey({
			key: certBuffer,
			passphrase: password,
		});
	}
}

export default new ZohoController();
