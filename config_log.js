import winston from 'winston';
import moment from 'moment-timezone';
import getAppDataPath from 'appdata-path';
import path from 'path';
import fs from 'fs';
import os from 'os';

const platform = os.platform();

const org = 'EyediaTech';
const app_name = 'EyedeeaPhotos';

const is_jest_running = process.env.JEST_WORKER_ID !== undefined

const log_path = (() => {
  if (is_jest_running){
    return "./logs"
  }
  else if (platform.startsWith("win")) {
    return path.join(getAppDataPath(org), app_name, 'logs');
  } else {
    return "/var/log/EyediaTech/EyedeeaPhotos/logs";
  }
})();

console.log('Logs folder path:', log_path);

if (!fs.existsSync(log_path)){
    fs.mkdirSync(log_path, { recursive: true });
}


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
    new winston.transports.File({ filename: path.join(log_path, 'logs.log')}),
    //new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(log_path, 'errors.log'), level: 'error' })
  ]
});

export default {
  logger
}

logger.info('Logger started.');
