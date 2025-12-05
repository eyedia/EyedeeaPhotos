#!/bin/bash

# Setup auto-update cron job for EyedeeaPhotos
# Run this script once to install the cron job
# This should be run from the deployed npm package location

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AUTO_UPDATE_SCRIPT="$PROJECT_ROOT/server/deployment/auto-update.mjs"

echo "=== EyedeeaPhotos Auto-Update Cron Setup ==="
echo ""

# Check if script exists
if [[ ! -f "$AUTO_UPDATE_SCRIPT" ]]; then
    echo "Error: auto-update.mjs not found at $AUTO_UPDATE_SCRIPT"
    exit 1
fi

# Make script executable
chmod +x "$AUTO_UPDATE_SCRIPT"

# Propose cron schedule
echo "Select update frequency:"
echo "1) Daily at 3:00 AM"
echo "2) Weekly on Sunday at 3:00 AM"
echo "3) Twice a month (1st and 15th at 3:00 AM)"
echo "4) Custom"
echo ""
read -p "Choose (1-4): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="daily at 3:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * 0"
        DESCRIPTION="weekly on Sunday at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 3 1,15 * *"
        DESCRIPTION="twice a month (1st and 15th) at 3:00 AM"
        ;;
    4)
        read -p "Enter cron schedule (e.g., '0 3 * * *'): " CRON_SCHEDULE
        DESCRIPTION="custom schedule"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Get node path
NODE_PATH=$(which node)

# Create cron job
CRON_JOB="$CRON_SCHEDULE cd $PROJECT_ROOT && $NODE_PATH $AUTO_UPDATE_SCRIPT >> $PROJECT_ROOT/logs/auto-update.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "auto-update.mjs"; then
    echo ""
    echo "Existing auto-update cron job found."
    read -p "Replace it? (y/n): " replace
    if [[ "$replace" != "y" ]]; then
        echo "Installation cancelled"
        exit 0
    fi
    # Remove existing job
    crontab -l 2>/dev/null | grep -v "auto-update.mjs" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✓ Cron job installed successfully!"
echo "  Schedule: $DESCRIPTION"
echo "  Command: $CRON_JOB"
echo ""
echo "Logs will be written to: $PROJECT_ROOT/logs/auto-update.log"
echo ""
echo "To view your cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line with auto-update.mjs)"
echo ""
