# PM2 Logging Configuration

## Overview

PM2 process manager logs are separate from application logs. This document explains where PM2 logs are stored and how they're configured for Eyedeea Photos.

## Application Logs vs PM2 Logs

### Application Logs (Managed by Winston Logger)
- **Purpose**: Application-level events, errors, and debug information
- **Handled by**: Winston logger with log-rotator
- **Windows Location**: `C:\Users\<username>\AppData\Local\EyediaTech\EyedeeaPhotos\logs\`
- **Linux Location**: `/var/log/EyediaTech/EyedeeaPhotos/`
- **Files**: `error.log`, `info.log`, `debug.log`, `exceptions.log`
- **Rotation**: Weekly (7 days) with ZIP compression
- **Management**: Use `npm run logs:*` commands

### PM2 Process Logs
- **Purpose**: Process manager output and error streams
- **Handled by**: PM2 configuration (error_file, out_file)
- **Windows Location**: `C:\Users\<username>\AppData\Local\EyediaTech\EyedeeaPhotos\logs\`
- **Linux Location**: `/var/log/EyediaTech/EyedeeaPhotos/`
- **Files**: `pm2_app.log`, `pm2_error.log`
- **Rotation**: Not automatically rotated by PM2 (manual rotation recommended)
- **Management**: Use `pm2 logs` command

## Platform-Specific Locations

### Windows

#### Application Logs
```
C:\Users\debjy\AppData\Local\EyediaTech\EyedeeaPhotos\logs\
├── error.log
├── info.log
├── debug.log
├── exceptions.log
├── error.log.gz (archived)
└── .log.metadata (rotation tracking)
```

#### PM2 Logs
```
C:\Users\<username>\AppData\Local\EyediaTech\EyedeeaPhotos\logs\
├── pm2_app.log
├── pm2_error.log
└── [manual backups]
```

**Note**: On Windows, PM2 typically stores its own internal logs in:
```
C:\Users\<username>\AppData\Roaming\npm\etc\pm2\
```
But application-managed PM2 logs are centralized in the AppData\Local directory.

### Linux

#### Application Logs
```
/var/log/EyediaTech/EyedeeaPhotos/
├── error.log
├── info.log
├── debug.log
├── exceptions.log
├── error.log.zip (archived)
└── .log.metadata (rotation tracking)
```

#### PM2 Logs
```
/var/log/EyediaTech/EyedeeaPhotos/
├── pm2_app.log
├── pm2_error.log
└── [manual backups]
```

**Note**: PM2 may also store daemon logs at:
```
~/.pm2/logs/
/var/log/pm2/  (if running as system-wide service)
```

## Configuration

### Ecosystem.config.js

The PM2 configuration is defined in `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'Eyedeea Photos',
    script: '/path/to/server/app.js',
    cwd: '/path/to/app',
    // PM2 log configuration
    error_file: '/var/log/EyediaTech/EyedeeaPhotos/pm2_error.log',
    out_file: '/var/log/EyediaTech/EyedeeaPhotos/pm2_app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

#### Key Settings

| Setting | Purpose | Value |
|---------|---------|-------|
| `error_file` | Captures stderr from the process | Points to centralized log directory |
| `out_file` | Captures stdout from the process | Points to centralized log directory |
| `log_date_format` | Timestamp format in PM2 logs | ISO 8601 with timezone |
| `merge_logs` | Combines stdout/stderr when running multiple instances | `true` |
| `max_memory_restart` | Auto-restart if process exceeds memory limit | `500M` |

### Installation Script Integration

On Linux, the installation script (`release/install.sh`) creates the ecosystem.config.js dynamically:

```bash
LOG_DIR="/var/log/EyediaTech/EyedeeaPhotos"

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    # ... other config ...
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/app.log',
    # ... rest of config ...
  }]
};
EOF
```

On Windows, the installation script (`release/install.ps1`) starts PM2 without an ecosystem.config.js, using default PM2 log locations.

## Managing PM2 Logs

### View PM2 Logs

```bash
# View real-time logs
pm2 logs 'Eyedeea Photos'

# View specific log file
cat /var/log/EyediaTech/EyedeeaPhotos/pm2_app.log

# On Windows
Get-Content C:\Users\$env:USERNAME\AppData\Local\EyediaTech\EyedeeaPhotos\logs\pm2_app.log -Tail 50
```

### Rotate PM2 Logs

PM2 does not automatically rotate logs. For production environments, use:

```bash
# Manual rotation
pm2 flush 'Eyedeea Photos'

# Or use logrotate on Linux
sudo logrotate /etc/logrotate.d/eyedeeaphotos
```

### Backup PM2 Logs

```bash
# Linux
sudo tar -czf pm2_logs_backup_$(date +%Y%m%d).tar.gz /var/log/EyediaTech/EyedeeaPhotos/pm2*.log

# Windows PowerShell
$date = Get-Date -Format "yyyyMMdd"
Compress-Archive -Path "C:\Users\$env:USERNAME\AppData\Local\EyediaTech\EyedeeaPhotos\logs\pm2*.log" `
  -DestinationPath "pm2_logs_backup_$date.zip"
```

## Application Log Management

For application logs (not PM2 logs), use the built-in management utilities:

```bash
# List all logs
npm run logs:list

# View a specific log
npm run logs:view -- --file error.log

# Tail logs in real-time
npm run logs:tail -- --file info.log

# Get log statistics
npm run logs:stats

# Manually rotate logs
npm run logs:rotate

# Clean old logs
npm run logs:clean
```

See [README_LOG_SYSTEM.md](README_LOG_SYSTEM.md) for detailed application log management.

## Troubleshooting

### PM2 Logs Not Created

**Linux:**
```bash
# Check directory permissions
ls -la /var/log/EyediaTech/EyedeeaPhotos/

# Ensure PM2 daemon is running
pm2 ping

# Check PM2 daemon logs
cat ~/.pm2/pm2.log
```

**Windows:**
```powershell
# Check directory exists
Test-Path "C:\Users\$env:USERNAME\AppData\Local\EyediaTech\EyedeeaPhotos\logs"

# Verify PM2 is installed
npm list -g pm2

# Check PM2 startup
pm2 status
```

### Old Log Files Accumulating

1. **Application Logs**: Automatically managed by log-rotator (weekly rotation, 4-week retention)
2. **PM2 Logs**: Requires manual rotation
   - On Linux: Use logrotate with configuration in `/etc/logrotate.d/`
   - On Windows: Manually archive and delete old files, or use scheduled task

### Permission Issues on Linux

```bash
# PM2 logs require write access
sudo chmod 755 /var/log/EyediaTech/EyedeeaPhotos/

# If running as specific user
sudo chown -R $USER:$USER /var/log/EyediaTech/EyedeeaPhotos/
```

## Migration From Old Log Locations

If upgrading from an older version, you may have logs in:
- **Old Windows Path**: `C:\Users\<username>\AppData\Roaming\EyediaTech\EyedeeaPhotos\logs\`
- **Old Linux Path**: `/var/log/EyedeeaPhotos/`

To migrate:

```bash
# Linux
sudo cp /var/log/EyedeeaPhotos/* /var/log/EyediaTech/EyedeeaPhotos/ 2>/dev/null
sudo rm -rf /var/log/EyedeeaPhotos/

# Windows (PowerShell)
Copy-Item "C:\Users\$env:USERNAME\AppData\Roaming\EyediaTech\EyedeeaPhotos\logs\*" `
  -Destination "C:\Users\$env:USERNAME\AppData\Local\EyediaTech\EyedeeaPhotos\logs\" -Force
Remove-Item "C:\Users\$env:USERNAME\AppData\Roaming\EyediaTech\EyedeeaPhotos\logs\" -Recurse -Force
```

## Log File Rotation Strategy

| Log Type | Rotation | Location | Retention |
|----------|----------|----------|-----------|
| Application (error.log) | Weekly | Centralized | 4 weeks (auto-delete) |
| Application (info.log) | Weekly | Centralized | 4 weeks (auto-delete) |
| Application (debug.log) | Weekly | Centralized | 4 weeks (auto-delete) |
| PM2 stdout | Manual | Centralized | Indefinite |
| PM2 stderr | Manual | Centralized | Indefinite |

## Related Documentation

- [README_LOG_SYSTEM.md](README_LOG_SYSTEM.md) - Application log system details
- [LOGGING.md](LOGGING.md) - Logging configuration and setup
- [deployment/samples/ecosystem.config.js](deployment/samples/ecosystem.config.js) - PM2 config sample
- [release/install.sh](release/install.sh) - Linux installation with PM2 setup
- [release/install.ps1](release/install.ps1) - Windows installation with PM2 setup
