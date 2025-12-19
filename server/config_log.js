import winston from "winston";
import moment from "moment-timezone";
import path from 'path';
import constants from "./constants.js";
import { LogRotator } from "./utils/log-rotator.mjs";

const log_dir = constants.app_log_dir;
console.log('Logs dir:', log_dir);

const getTimestamp = () => moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");

const logFormat = winston.format.combine(
  winston.format.printf(({ level, message }) => `${getTimestamp()} [${level.toUpperCase()}]: ${message}`)
);

// Initialize log rotator for weekly rotation with zip compression
const logRotator = new LogRotator(log_dir);

/**
 * Custom transport that handles file rotation
 * Instead of using DailyRotateFile, we use simple File transport
 * and manage rotation manually with weekly intervals
 */
class RotatingFileTransport extends winston.transports.File {
  constructor(options) {
    super(options);
    this.filename = options.filename;
    this.logRotator = options.logRotator;
    
    // Perform rotation check on startup
    this.checkRotation();
    
    // Check for rotation every hour (more efficient than checking every log)
    this.rotationInterval = setInterval(() => {
      this.checkRotation();
    }, 60 * 60 * 1000); // Every hour
  }

  checkRotation() {
    const basename = path.basename(this.filename);
    this.logRotator.rotateIfNeeded(basename, 4); // Keep 4 weeks of archives
  }

  close() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    super.close();
  }
}

// Error logs: Simple error.log file with weekly rotation
const errorTransport = new RotatingFileTransport({
  filename: path.join(log_dir, "error.log"),
  level: "error",
  maxSize: "50m", // Rotate if file exceeds 50MB (in case of log flood)
  maxFiles: "100", // Keep last 100 rotations before cleanup
  logRotator: logRotator,
});

// Info logs: Simple info.log file with weekly rotation
const infoTransport = new RotatingFileTransport({
  filename: path.join(log_dir, "info.log"),
  level: "info",
  maxSize: "50m",
  maxFiles: "100",
  logRotator: logRotator,
});

// Debug logs: Simple debug.log file with weekly rotation
const debugTransport = new RotatingFileTransport({
  filename: path.join(log_dir, "debug.log"),
  level: "debug",
  maxSize: "50m",
  maxFiles: "100",
  logRotator: logRotator,
});

// Console output for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize(), logFormat),
  level: constants.LOG_LEVEL,
});

// Create logger with all transports
const logger = winston.createLogger({
  format: logFormat,
  level: constants.LOG_LEVEL,
  transports: [errorTransport, infoTransport, debugTransport, consoleTransport],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(log_dir, "exceptions.log"),
      maxSize: "50m",
    }),
  ],
});

console.log(`Logger initialized with level: ${constants.LOG_LEVEL}`);
console.log(`Log files: error.log, info.log, debug.log (weekly rotation, zip compression)`);

export default logger;
