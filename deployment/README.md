# Deployment Scripts

This folder contains post-installation scripts for setting up auto-update functionality on deployed instances.

## Files

- `setup-cron.sh` - Linux/macOS cron job setup
- `setup-task.ps1` - Windows scheduled task setup

## Usage

### Linux/macOS
```bash
cd /path/to/eyedeeaphotos
chmod +x deployment/setup-cron.sh
./deployment/setup-cron.sh
```

### Windows (Run as Administrator)
```powershell
cd C:\path\to\eyedeeaphotos
powershell -ExecutionPolicy Bypass -File deployment\setup-task.ps1
```

## Notes

- These scripts configure automatic updates via `server/deployment/auto-update.mjs`
- Logs are written to `logs/auto-update.log`
- On Linux, you can view cron jobs with `crontab -l`
- On Windows, you can view scheduled tasks via Task Scheduler (taskschd.msc)
