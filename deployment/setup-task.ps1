# PowerShell script to setup auto-update scheduled task for Windows
# Run as Administrator: powershell -ExecutionPolicy Bypass -File setup-task.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== EyedeeaPhotos Auto-Update Task Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$AutoUpdateScript = Join-Path $ProjectRoot "server/deployment/auto-update.mjs"

# Check if script exists
if (-not (Test-Path $AutoUpdateScript)) {
    Write-Host "Error: auto-update.mjs not found at $AutoUpdateScript" -ForegroundColor Red
    exit 1
}

# Get Node.js path
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
    Write-Host "Error: Node.js not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Select update frequency:"
Write-Host "1) Daily at 3:00 AM"
Write-Host "2) Weekly on Sunday at 3:00 AM"
Write-Host "3) Twice a month (1st and 15th at 3:00 AM)"
Write-Host ""
$choice = Read-Host "Choose (1-3)"

switch ($choice) {
    "1" {
        $Trigger = New-ScheduledTaskTrigger -Daily -At 3am
        $Description = "daily at 3:00 AM"
    }
    "2" {
        $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3am
        $Description = "weekly on Sunday at 3:00 AM"
    }
    "3" {
        # Create two triggers for 1st and 15th
        $Trigger1 = New-ScheduledTaskTrigger -Daily -At 3am
        $Trigger1.DaysOfMonth = 1
        $Trigger2 = New-ScheduledTaskTrigger -Daily -At 3am
        $Trigger2.DaysOfMonth = 15
        $Trigger = @($Trigger1, $Trigger2)
        $Description = "twice a month (1st and 15th) at 3:00 AM"
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}

# Task settings
$TaskName = "EyedeeaPhotos-AutoUpdate"
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$AutoUpdateScript`"" -WorkingDirectory $ProjectRoot
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Check if task already exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host ""
    Write-Host "Existing task found." -ForegroundColor Yellow
    $replace = Read-Host "Replace it? (y/n)"
    if ($replace -ne "y") {
        Write-Host "Installation cancelled" -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Register task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Auto-update EyedeeaPhotos to latest version" | Out-Null

Write-Host ""
Write-Host "✓ Scheduled task created successfully!" -ForegroundColor Green
Write-Host "  Task Name: $TaskName"
Write-Host "  Schedule: $Description"
Write-Host ""
Write-Host "Logs will be written to: $ProjectRoot\logs\auto-update.log"
Write-Host ""
Write-Host "To view the task: taskschd.msc"
Write-Host "To run manually: schtasks /Run /TN `"$TaskName`""
Write-Host "To remove: schtasks /Delete /TN `"$TaskName`" /F"
Write-Host ""
