# Eyedeea Photos - Logging Guide

Comprehensive logging system with centralized log management, weekly rotation, and zip compression.

## Table of Contents

- [Overview](#overview)
- [Log Locations](#log-locations)
- [Log Files](#log-files)
- [Rotation & Compression](#rotation--compression)
- [Managing Logs](#managing-logs)
- [Viewing Logs](#viewing-logs)
- [Log Configuration](#log-configuration)

---

## Overview

Eyedeea Photos uses **Winston logger** with a standardized, centralized logging system:

✅ **Single standardized location** - All logs in one place
✅ **Simplified filenames** - `error.log`, `info.log`, `debug.log` (no date patterns)
✅ **Weekly rotation** - Logs rotate every 7 days automatically
✅ **Zip compression** - Rotated logs compressed to `.zip` format for storage efficiency
✅ **Easy management** - CLI utilities to view, tail, and manage logs

---

## Log Locations

### Windows
```
Local AppData:     C:\Users\<username>\AppData\Local\EyediaTech\EyedeeaPhotos\logs
Archive Location:  C:\Users\<username>\AppData\Local\EyediaTech\EyedeeaPhotos\logs\archive
```

### Linux
```
Logs:              /var/log/EyediaTech/EyedeeaPhotos
Archive Location:  /var/log/EyediaTech/EyedeeaPhotos/archive
```

### Development
```
Logs:              ./logs (relative to project root)
```

---

## Log Files

### Active Log Files

| File | Level | Purpose | Max Size |
|------|-------|---------|----------|
| `error.log` | ERROR | Application errors and warnings | 50 MB |
| `info.log` | INFO | General application information | 50 MB |
| `debug.log` | DEBUG | Detailed debugging information | 50 MB |
| `exceptions.log` | ERROR | Uncaught exceptions | 50 MB |

### Archive Format

When logs rotate (weekly), they are:
- Renamed with timestamp: `error-YYYY-MM-DD.zip`
- Compressed to ZIP format
- Moved to `archive/` subdirectory
- Kept for 4 weeks (28 days), then deleted

**Example archive file structure:**
```
logs/
├── error.log
├── info.log
├── debug.log
├── exceptions.log
└── archive/
    ├── error-2025-12-19.zip
    ├── error-2025-12-12.zip
    ├── info-2025-12-19.zip
    ├── debug-2025-12-12.zip
    └── ... (up to 4 weeks old)
```

---

## Rotation & Compression

### Automatic Weekly Rotation

Logs automatically rotate every **7 days**:

1. **Check on startup** - Rotation status verified when app starts
2. **Check hourly** - Background task checks if rotation is needed (every hour)
3. **Trigger at rotation time** - When 7 days elapsed since last rotation:
   - Current log file is compressed to `.zip`
   - File is timestamped with date of rotation
   - Original log file is cleared
   - Archive is moved to `archive/` subdirectory

### Example Timeline

```
Friday Dec 19, 10:30 AM - Application starts
  └─ logs rotated (if 7+ days since last rotation)
  └─ error-2025-12-19.zip created
  └─ error.log cleared

Friday Dec 26, 10:30 AM - Next rotation
  └─ error-2025-12-26.zip created
  └─ Logs from week of Dec 19-26 now archived

Friday Jan 2, 10:30 AM - Cleanup
  └─ Logs older than 4 weeks deleted
  └─ Only recent 4 weeks of archives kept
```

### Compression

- **Format**: ZIP (not gzip)
- **Compression Level**: Maximum (9) - optimal storage efficiency
- **Size Reduction**: Typically 80-90% size reduction
- **Extraction**: Use standard ZIP tools (7-Zip, WinRAR, `unzip` command, etc.)

---

## Managing Logs

### Quick Commands

```bash
# View current logs
npm run logs:list              # List all log files and archives

# View log file contents
npm run logs:view error        # View error.log
npm run logs:view info         # View info.log
npm run logs:view debug        # View debug.log

# Real-time log monitoring
npm run logs:tail error        # Monitor errors as they happen
npm run logs:tail info         # Monitor info logs

# Statistics
npm run logs:stats             # Show file sizes and counts

# Manual rotation
npm run logs:rotate            # Force rotation now

# Cleanup old archives
npm run logs:clean             # Remove archives older than 4 weeks
```

### Using CLI Directly

```bash
# View error logs
node server/utils/manage-logs.mjs view error

# Tail info logs in real-time
node server/utils/manage-logs.mjs tail info

# List all logs and archives
node server/utils/manage-logs.mjs list

# Show statistics
node server/utils/manage-logs.mjs stats

# Clean old archives manually
node server/utils/manage-logs.mjs clean

# Force rotation
node server/utils/manage-logs.mjs rotate
```

---

## Viewing Logs

### Option 1: Using npm Scripts (Recommended)

```bash
# View all active log files and archives
npm run logs:list

# View specific log file
npm run logs:view error
npm run logs:view info

# Monitor logs in real-time
npm run logs:tail info
```

**Output Example:**
```
📋 Contents of error.log:

2025-12-19 10:30:45 [ERROR]: Failed to scan source: Permission denied
2025-12-19 11:15:22 [ERROR]: Database connection timeout
2025-12-19 14:30:00 [ERROR]: Invalid image format: JPEG
```

### Option 2: Direct File Access

**Windows:**
```bash
# Using PowerShell
Get-Content "C:\Users\$env:USERNAME\AppData\Local\EyediaTech\EyedeeaPhotos\logs\error.log" -Tail 50

# Using Notepad
notepad "C:\Users\%username%\AppData\Local\EyediaTech\EyedeeaPhotos\logs\error.log"
```

**Linux:**
```bash
# View last 50 lines
tail -50 /var/log/EyediaTech/EyedeeaPhotos/error.log

# Monitor in real-time
tail -f /var/log/EyediaTech/EyedeeaPhotos/error.log

# Search for errors
grep "ERROR" /var/log/EyediaTech/EyedeeaPhotos/error.log
```

### Option 3: Log Tailing (Real-Time Monitoring)

```bash
npm run logs:tail error

# Output:
# 📡 Tailing error.log (last 50 lines, press Ctrl+C to exit):
# 
# 2025-12-19 10:30:45 [ERROR]: Failed to scan source
# 2025-12-19 11:15:22 [ERROR]: Database connection timeout
# [Live updates as new logs arrive...]
```

### Option 4: Extract & View Archives

**Windows:**
```powershell
# Using PowerShell to extract
Expand-Archive "C:\...\logs\archive\error-2025-12-19.zip" -DestinationPath "C:\temp\logs"

# View extracted log
notepad "C:\temp\logs\error.log"
```

**Linux:**
```bash
# Extract archive
unzip /var/log/EyediaTech/EyedeeaPhotos/archive/error-2025-12-19.zip -d /tmp/logs

# View log
cat /tmp/logs/error.log
```

---

## Log Configuration

### Current Settings

**File**: `server/config_log.js`

```javascript
// Log rotation happens every 7 days
// Archives kept for 4 weeks (28 days)
// Compression: ZIP (maximum compression level 9)
// Rotation check: Hourly background task

const rotator = new LogRotator(log_dir);
// Keep logs for 4 weeks
const maxKeepWeeks = 4;
// Check rotation every hour (3600000 ms)
const rotationCheckInterval = 60 * 60 * 1000;
```

### Customizing Log Levels

Edit `server/constants.js`:

```javascript
// Log levels: 'error', 'warn', 'info', 'debug'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
```

Set at runtime:
```bash
# Windows
$env:LOG_LEVEL="debug"; npm start

# Linux
LOG_LEVEL=debug npm start
```

### Customizing Rotation Period

To change from weekly (7 days) to different interval:

Edit `server/utils/log-rotator.mjs`:
```javascript
// In shouldRotate() method, change 7 to desired days
return daysSinceRotation >= 7; // Change this number
```

### Customizing Archive Retention

To change from 4 weeks to different retention:

Edit `server/config_log.js`:
```javascript
// Change 4 to desired weeks
this.logRotator.rotateIfNeeded(basename, 4); // Change this number
```

---

## Log Format

All logs follow a standardized format:

```
YYYY-MM-DD HH:MM:SS [LEVEL]: Message
```

**Example:**
```
2025-12-19 10:30:45 [ERROR]: Failed to scan source: Permission denied
2025-12-19 11:15:22 [INFO]: Scan completed: 150 photos added
2025-12-19 14:30:00 [DEBUG]: Loading configuration from database
```

---

## Troubleshooting

### Issue: Log file permissions on Linux

**Problem**: Cannot write to `/var/log/EyediaTech/EyedeeaPhotos`

**Solution**:
```bash
# Ensure correct ownership
sudo chown -R <username>:<username> /var/log/EyediaTech/EyedeeaPhotos
sudo chmod 755 /var/log/EyediaTech/EyedeeaPhotos
```

### Issue: Archive directory not created

**Problem**: No `archive/` subdirectory in logs folder

**Solution**: It's created automatically on first rotation. If not created:
```bash
# Create manually
mkdir -p /path/to/logs/archive
```

### Issue: Rotation not happening

**Problem**: Logs not rotating after 7 days

**Solution**:
1. Check log metadata file: `.error.log.metadata`, `.info.log.metadata`, `.debug.log.metadata`
2. Force rotation: `npm run logs:rotate`
3. Check app is running (rotation happens when app is running)

### Issue: Logs growing too large

**Problem**: Log file exceeds 50 MB before rotation

**Solution**: Log files will rotate based on size (50 MB) or time (7 days), whichever comes first.

---

## Log Analysis Examples

### Find all errors in a date range

```bash
# Linux
grep "2025-12-19" /var/log/EyediaTech/EyedeeaPhotos/error.log

# Extract from archive and search
unzip -p /var/log/EyediaTech/EyedeeaPhotos/archive/error-2025-12-19.zip | grep "ERROR"
```

### Count errors by type

```bash
# Linux
grep "ERROR" /var/log/EyediaTech/EyedeeaPhotos/error.log | sed 's/.*\[ERROR\]: //' | sort | uniq -c | sort -rn
```

### Monitor in real-time with filtering

```bash
# Linux - show only errors
tail -f /var/log/EyediaTech/EyedeeaPhotos/error.log

# Show errors and warnings
tail -f /var/log/EyediaTech/EyedeeaPhotos/info.log | grep -E "ERROR|WARN"
```

---

## Best Practices

1. **Regular Cleanup**: Run `npm run logs:clean` weekly
2. **Monitor Size**: Check `npm run logs:stats` periodically
3. **Archive Backups**: Keep important archives backed up
4. **Log Levels**: Use appropriate log levels in code
5. **Performance**: Avoid excessive debug logging in production

---

## Related Files

- **Logger Configuration**: [server/config_log.js](server/config_log.js)
- **Log Rotator**: [server/utils/log-rotator.mjs](server/utils/log-rotator.mjs)
- **Log Manager CLI**: [server/utils/manage-logs.mjs](server/utils/manage-logs.mjs)
- **Constants**: [server/constants.js](server/constants.js)

---

**Last Updated:** December 19, 2025
**Log System Version:** 2.0 (Centralized, Weekly Rotation, ZIP Compression)
