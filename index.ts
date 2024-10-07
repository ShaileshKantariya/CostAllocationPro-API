// require('dotenv').config();
import bodyParser from 'body-parser';
// import pgSession from 'connect-pg-simple';
// import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
// import session from 'express-session';
// import { Pool } from 'pg';
import routes from './app/routes';

// Database configuration
import './app/config/db';
import config from './config';
import { runMigration } from './app/services/migration-runner.service';
import { logger } from './app/utils/logger';

import fs from 'fs';
import path from 'path';

const app = express();

app.use(helmet());
app.use(cors());

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to redirect HTTP to HTTPS
// app.use((req, res, next) => {
// 	if (req.headers['x-forwarded-proto'] !== 'https') {
// 		return res.redirect(`https://${req.headers.host}${req.url}`);
// 	}
// 	next();
// });

// Alternatively, enable HSTS directly with specific settings
app.use(helmet.hsts({
	maxAge: 63072000, // 2 years in seconds
	includeSubDomains: true, // Apply HSTS to all subdomains
	preload: true // Indicate that the site would like to be included in the HSTS preload list
}));

app.use((req, res, next) => {
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'interest-cohort=()');
	res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
	res.setHeader('Expires', 'Wed, 11 Jan 1984 05:00:00 GMT');
	res.setHeader('X-XSS-Protection', '1; mode=block');
	res.setHeader('Pragma', 'no-cache');

	next();
});

runMigration();

// Import routes
app.use(`/${config.routeBasePath}`, routes);

const PORT = config.port || 8080;

//create pdf folder
const folderPath = path.join(__dirname, './app', 'costAllocationPdfs');

if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
	fs.mkdirSync(folderPath, { recursive: true });
	logger.info(`Folder '${path}' created.`);
}
// Server configuration
app.listen(PORT, () => {
	logger.info('Server is listening on port ' + PORT);
});
