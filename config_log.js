import winston from 'winston';
import moment from 'moment-timezone';

const logger = winston.createLogger({
  level: 'info', // Log level (e.g., error, warn, info, debug)
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
      format: () => moment().tz('America/New_York').format('YYYY-MM-DD HH:mm:ss z') 
    }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      // const formatted_msg = `${timestamp} [${level}]: ${message}`;
      // return stack ? formatted_msg + '\n' + stack : formatted_msg;
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: './logs/logs.log' }),
    new winston.transports.Console(),
    new winston.transports.File({ filename: './logs/errors.log', level: 'error' })
  ]
});

export default {
  logger
}

logger.info('Logger started.');
