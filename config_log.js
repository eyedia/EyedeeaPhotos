import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', // Log level (e.g., error, warn, info, debug)
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'combined.log' }),
    //new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

export default {
  logger
}

logger.info('Logger started.');
