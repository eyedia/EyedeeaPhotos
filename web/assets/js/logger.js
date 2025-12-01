// Client-side logger with configurable log levels
// Set LOG_LEVEL in localStorage: localStorage.setItem('LOG_LEVEL', 'debug');
// Levels: 'error', 'warn', 'info', 'debug'

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        // Default to 'info', can be overridden via localStorage or config
        this.level = LOG_LEVELS[localStorage.getItem('LOG_LEVEL') || 'info'];
        this.enabledLevels = ['error', 'warn', 'info', 'debug'].filter(
            (level) => LOG_LEVELS[level] <= this.level
        );
        console.log(`[Logger] Initialized with level: ${this.getLevelName()} (${this.enabledLevels.join(', ')} enabled)`);
    }

    getLevelName() {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.level) || 'info';
    }

    setLevel(level) {
        if (LOG_LEVELS.hasOwnProperty(level)) {
            this.level = LOG_LEVELS[level];
            this.enabledLevels = ['error', 'warn', 'info', 'debug'].filter(
                (l) => LOG_LEVELS[l] <= this.level
            );
            localStorage.setItem('LOG_LEVEL', level);
            console.log(`[Logger] Level changed to: ${level} (${this.enabledLevels.join(', ')} enabled)`);
        } else {
            console.error(`[Logger] Invalid log level: ${level}. Valid levels: error, warn, info, debug`);
        }
    }

    error(...args) {
        if (this.level >= LOG_LEVELS.error) {
            console.error('[ERROR]', ...args);
        }
    }

    warn(...args) {
        if (this.level >= LOG_LEVELS.warn) {
            console.warn('[WARN]', ...args);
        }
    }

    info(...args) {
        if (this.level >= LOG_LEVELS.info) {
            console.info('[INFO]', ...args);
        }
    }

    debug(...args) {
        if (this.level >= LOG_LEVELS.debug) {
            console.log('[DEBUG]', ...args);
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Usage examples:
// logger.error('This is an error');
// logger.warn('This is a warning');
// logger.info('This is info');
// logger.debug('This is debug info');
// 
// Change log level dynamically:
// logger.setLevel('debug'); // Shows all logs
// logger.setLevel('error'); // Shows only errors
