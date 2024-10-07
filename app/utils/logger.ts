import winston from 'winston';
import winstonDailyRotateFile from 'winston-daily-rotate-file';
import colors from 'colors';

colors.setTheme({
    info: 'green',
    warn: 'yellow',
    error: 'red',
    debug: 'blue'
});

export const logger = winston.createLogger({
    level: 'info', // Set log level to 'info'
    format: winston.format.combine(
        winston.format.colorize(), // Apply colorization to log messages
        winston.format.simple()
    ), // Use the simple format for logging
    transports: [
        new winston.transports.Console(), // Log to the console
        new winstonDailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }) // Log to a daily rotating file
    ]
});