import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Database Connection
prisma
	.$connect()
	.then(() => {
		logger.info('Database connected successfully');
	})
	.catch((error: any) => {
		logger.info('Database connection error:', error);
	});
