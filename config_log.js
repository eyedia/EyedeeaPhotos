import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', // Log level (e.g., error, warn, info, debug)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
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
