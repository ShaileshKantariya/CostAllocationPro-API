import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
	openapi: '3.0.0',
	info: {
		title: 'Swagger Demo API',
		version: '1.0.0',
		description: 'A simple API for learning Swagger',
	},
	servers: [
		{
			url: 'http://localhost:8080',
			description: 'Development server',
		},
	],
};

const swaggerOptions = {
	swaggerDefinition,
	apis: [
		path.join(__dirname, '..', 'routes', 'index.ts'),
		path.join(__dirname, '..', 'routes', 'index.js'),
	],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
