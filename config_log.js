import winston from "winston";
import "winston-daily-rotate-file";
import moment from "moment-timezone";
import path from 'path';
import constants from "./constants.js";

const log_dir = constants.app_log_dir;
console.log('Logs dir:', log_dir);

const getTimestamp = () => moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");

const logFormat = winston.format.combine(
  winston.format.printf(({ level, message }) => `${getTimestamp()} [${level.toUpperCase()}]: ${message}`)
);

const errorTransport = new winston.transports.DailyRotateFile({
  filename: path.join(log_dir,"error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
});

const infoTransport = new winston.transports.DailyRotateFile({
  filename: path.join(log_dir,"info-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "info",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat),
  level: constants.LOG_LEVEL,
});

const debugTransport = new winston.transports.DailyRotateFile({
  filename: path.join(log_dir,"debug-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  level: "debug",
  maxSize: "20m",
  maxFiles: "7d",
  zippedArchive: true,
});

const logger = winston.createLogger({
  format: logFormat,
  level: constants.LOG_LEVEL,
  transports: [errorTransport, infoTransport, debugTransport, consoleTransport],
});

console.log(`Logger initialized with level: ${constants.LOG_LEVEL}`);

export default logger;
