# Logging Configuration

## Overview
EyedeeaPhotos now supports configurable log levels for both server-side (Node.js) and client-side (browser) JavaScript.

## Log Levels
- **error**: Only critical errors
- **warn**: Warnings and errors
- **info**: General information, warnings, and errors (default)
- **debug**: All logs including debug information

## Server-Side Logging (Node.js API)

### Configuration
Set the log level using the `LOG_LEVEL` environment variable:

**Windows (PowerShell):**
```powershell
$env:LOG_LEVEL="debug"
node app.js
```

**Linux/Mac:**
```bash
export LOG_LEVEL=debug
node app.js
```

**Docker/Production:**
Add to your environment configuration:
```
LOG_LEVEL=info
```

### Default Behavior
- If `LOG_LEVEL` is not set, defaults to `info`
- Logs are written to files in the logs directory:
  - `error-YYYY-MM-DD.log` - Error logs (kept for 14 days)
  - `info-YYYY-MM-DD.log` - Info and above (kept for 14 days)
  - `debug-YYYY-MM-DD.log` - Debug and above (kept for 7 days)
- Console output respects the configured log level

### Usage in Code
```javascript
import logger from "./config_log.js";

logger.error('Critical error message');
logger.warn('Warning message');
logger.info('Information message');
logger.debug('Debug message'); // Only shown when LOG_LEVEL=debug
```

## Client-Side Logging (Browser JavaScript)

### Configuration
Set the log level in the browser console or your code:

**Option 1: Using localStorage (persists across page reloads)**
```javascript
// In browser console:
localStorage.setItem('LOG_LEVEL', 'debug');
// Then reload the page
```

**Option 2: Programmatically**
```javascript
// In your JavaScript code:
logger.setLevel('debug'); // Shows all logs
logger.setLevel('info');  // Default
logger.setLevel('error'); // Only errors
```

### Default Behavior
- If not configured, defaults to `info` level
- Check current level in console when page loads: `[Logger] Initialized with level: info`

### Usage in Code
Replace `console.log`, `console.error`, etc. with:

```javascript
// Old way
console.log('Photo loaded:', photoId);
console.error('Failed to load photo:', error);

// New way (respects log level)
logger.debug('Photo loaded:', photoId);
logger.error('Failed to load photo:', error);
```

**Example in eyedeea_client.js:**
```javascript
async function get_photo(photo_index) {
    logger.debug(`Fetching photo at index: ${photo_index}`);
    
    try {
        const response = await fetch(photo_url);
        logger.info(`Photo ${photo_index} loaded successfully`);
        return photo_info;
    } catch (error) {
        logger.error(`Error loading photo ${photo_index}:`, error);
    }
}
```

## Examples

### Development Mode (Show all logs)
**Server:**
```bash
LOG_LEVEL=debug node app.js
```

**Client:**
```javascript
localStorage.setItem('LOG_LEVEL', 'debug');
// Reload page
```

### Production Mode (Minimal logging)
**Server:**
```bash
LOG_LEVEL=error node app.js
```

**Client:**
```javascript
localStorage.setItem('LOG_LEVEL', 'error');
// Reload page
```

## Benefits
1. **Performance**: Debug logs don't run in production
2. **Security**: Sensitive debug info hidden from production users
3. **Troubleshooting**: Easy to enable debug logs when investigating issues
4. **Consistency**: Same logging API across server and client
5. **Flexibility**: Change log levels without code changes

## Migration Guide

### Server-Side
Replace existing logger calls based on importance:
- `console.log()` → `logger.debug()` (low priority info)
- `console.log()` → `logger.info()` (important info)
- `console.warn()` → `logger.warn()` (warnings)
- `console.error()` → `logger.error()` (errors)

### Client-Side
1. Ensure `logger.js` is loaded before other scripts
2. Replace `console.*` calls with `logger.*` calls
3. Use `logger.debug()` for verbose development logs

## Testing
**Server:**
```bash
# Test different log levels
LOG_LEVEL=debug node app.js   # See all logs
LOG_LEVEL=info node app.js    # See info, warn, error
LOG_LEVEL=error node app.js   # See only errors
```

**Client:**
```javascript
// In browser console:
logger.setLevel('debug');
logger.debug('This should appear');
logger.setLevel('error');
logger.debug('This should NOT appear');
```
