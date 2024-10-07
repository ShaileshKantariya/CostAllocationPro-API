import jwt, { decode } from 'jsonwebtoken';
import config from '../../config';
import tokenRepository from '../repositories/tokenRepository';
import { CustomError } from '../models/customError';
import { prisma } from '../client/prisma';

// Generate AccessToken
export const generateAccessToken = (payload: any) => {
	// expiresIn works in seconds if given in number
	const token = jwt.sign(payload, config.accessTokenSecretKey, {
		expiresIn: config.accessTokenExpireTime,
	});
	return token;
};

// Generate RefreshToken
export const generateRefreshToken = (payload: any) => {
	// expiresIn works in seconds if given in number
	const token = jwt.sign(payload, config.refreshTokenSecretKey, {
		expiresIn: config.refreshTokenExpireTime,
	});
	return token;
};

// Generate Forgot Password Token
export const generateForgotPasswordToken = (
	payload: any,
	isWelcomeToken?: boolean
) => {
	const token = jwt.sign(payload, config.forgotPasswordTokenSecretKey, {
		expiresIn:
			(isWelcomeToken
				? config.registerUrlExpireTime
				: config.forgotPasswordUrlExpireTime) / 1000,
	});
	return token;
};

// Verify Access Token
export const verifyAccessToken = async (accessToken: string) => {
	try {
		const verified = jwt.verify(accessToken, config.accessTokenSecretKey);
		return verified;
	} catch (err) {
		const data: any = decode(accessToken);
		if (data && data.id) {
			await prisma.token.deleteMany({
				where: {
					userId: data.id,
					accessToken: accessToken,
				},
			});
		}
		throw new CustomError(401, 'Token expired');
	}
};

// Verify Refresh Token
export const verifyRefreshToken = (refreshToken: string) => {
	const verified = jwt.verify(refreshToken, config.refreshTokenSecretKey);
	return verified;
};

// Verify Forgot Password Token
export const verifyForgotPasswordToken = (forgotPasswordToken: any) => {
	const verified = jwt.verify(
		forgotPasswordToken,
		config.forgotPasswordTokenSecretKey
	);
	return verified;
};

// Check Tokens in DB
export const checkTokens = async (
	userId: string,
	accessToken: string,
	refreshToken: string
) => {
	const getRecord = await tokenRepository.findToken(
		userId,
		accessToken,
		refreshToken
	);

	return getRecord;
};

export const getUserPasswordResetData = async (userId: string) => {
	const userRecord = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			passwordResetDate: true,
			email: true,
		},
	});

	return userRecord?.passwordResetDate;
};
