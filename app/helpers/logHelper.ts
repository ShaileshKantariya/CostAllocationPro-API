import log4js from 'log4js';

log4js.configure({
	appenders: {
		gcl: {
			type: 'file',
			filename: `logs/DailyLogs_${new Date().toJSON().slice(0, 10)}.log`,
		},
	},
	categories: { default: { appenders: ['gcl'], level: 'error' } },
});

const logger = log4js.getLogger();
logger.level = 'debug';

// Information Log
export const InfoLog = (api: string, data: any) => {
	logger.info(`[${api}] - `, data);
};

// Error Log
export const ErrorLog = (api: string, data: any) => {
	logger.error(`[${api}] - `, data);
};
