import nodemailer from 'nodemailer';
import config from '../../config';
import { logger } from '../utils/logger';

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
	host: config.smtpHost,
	port: Number(config.smtpPort),
	secure: false,
	auth: {
		user: config.smtpEmailLogin,
		pass: config.smtpPassword,
	},
	from: config.smtpEmailLogin
});

// Send Email
const sendEmail = async(options: nodemailer.SendMailOptions): Promise<any> => {

	try {
		const info = await transporter.sendMail(options);
		logger.info('Email Sent ------' + ' ' + JSON.stringify(info));
	} catch (error) {
		logger.error('Error sending email:', error);
		throw error;	
	}


	// return new Promise((resolve, reject) => {
	// 	transporter.sendMail(options, (error, info) => {
	// 		if (error) {
	// 			logger.error('Error sending email:', error);
	// 			reject(error);
	// 		}
	// 		resolve(info);
	// 	});
	// });

	// Send the email with the reset token
	// const mailOptions = {
	// 	from: process.env.SMTP_USER,
	// 	to: email,
	// 	subject: 'Password Reset',
	// 	// text: `Please use the following token to reset your password: ${resetToken}`,
	// };
};

export default sendEmail;
