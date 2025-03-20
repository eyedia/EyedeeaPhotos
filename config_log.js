import winston from "winston";
import "winston-daily-rotate-file";
import moment from "moment-timezone";
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

const getTimestamp = () => moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");

const logFormat = winston.format.combine(
  winston.format.printf(({ level, message }) => `${getTimestamp()} [${level.toUpperCase()}]: ${message}`)
);

const errorTransport = new winston.transports.DailyRotateFile({
  filename: path.join(log_path,"error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
});

const infoTransport = new winston.transports.DailyRotateFile({
  filename: path.join(log_path,"info-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "info",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat),
});

const logger = winston.createLogger({
  format: logFormat,
  transports: [errorTransport, infoTransport, consoleTransport],
});

export default logger;
