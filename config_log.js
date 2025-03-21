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
});

const logger = winston.createLogger({
  format: logFormat,
  transports: [errorTransport, infoTransport, consoleTransport],
});

export default logger;
