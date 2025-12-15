# Eyedeea Photos Desktop Wallpaper App - Installer
# This script sets up the wallpaper app to run at startup

param(
    [switch]$Uninstall
)

$AppName = "EyedeeaPhotosWallpaper"
$ScriptPath = Join-Path $PSScriptRoot "WallpaperApp.ps1"
$IconPath = Join-Path $PSScriptRoot "icon.ico"
$StartupFolder = [Environment]::GetFolderPath("Startup")
$StartupShortcutPath = Join-Path $StartupFolder "$AppName.lnk"
$StartMenuFolder = [Environment]::GetFolderPath("Programs")
$StartMenuShortcutPath = Join-Path $StartMenuFolder "Eyedeea Photos Wallpaper.lnk"
$DesktopWallpaperScriptPath = Join-Path $PSScriptRoot "desktop_wallpaper.ps1"

# Registry path for uninstall (per-user)
$UninstallRegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"

function Install-App {
    Write-Host "Installing Eyedeea Photos Wallpaper App..." -ForegroundColor Green
    
    # Check if script exists
    if (-not (Test-Path $ScriptPath)) {
        Write-Host "Error: WallpaperApp.ps1 not found at $ScriptPath" -ForegroundColor Red
        return
    }
    
    $WshShell = New-Object -ComObject WScript.Shell
    
    # Create shortcut in Startup folder (auto-start on login)
    $StartupShortcut = $WshShell.CreateShortcut($StartupShortcutPath)
    $StartupShortcut.TargetPath = "powershell.exe"
    $StartupShortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $StartupShortcut.WorkingDirectory = $PSScriptRoot
    $StartupShortcut.Description = "Eyedeea Photos Desktop Wallpaper"
    if (Test-Path $IconPath) {
        $StartupShortcut.IconLocation = $IconPath
    }
    $StartupShortcut.Save()
    
    Write-Host "Startup shortcut created at: $StartupShortcutPath" -ForegroundColor Green
    
    # Create shortcut in Start Menu
    $StartMenuShortcut = $WshShell.CreateShortcut($StartMenuShortcutPath)
    $StartMenuShortcut.TargetPath = "powershell.exe"
    $StartMenuShortcut.Arguments = "-ExecutionPolicy Bypass -File `"$ScriptPath`""
    $StartMenuShortcut.WorkingDirectory = $PSScriptRoot
    $StartMenuShortcut.Description = "Eyedeea Photos Wallpaper - Desktop slideshow app"
    if (Test-Path $IconPath) {
        $StartMenuShortcut.IconLocation = $IconPath
        Write-Host "Custom icon applied from: $IconPath" -ForegroundColor Cyan
    }
    $StartMenuShortcut.Save()
    
    Write-Host "Start Menu shortcut created at: $StartMenuShortcutPath" -ForegroundColor Green
    
    # Register app in Windows Uninstall Registry
    Write-Host ""
    Write-Host "Registering app with Windows..." -ForegroundColor Cyan
    try {
        # Create registry path if it doesn't exist
        if (-not (Test-Path $UninstallRegistryPath)) {
            New-Item -Path $UninstallRegistryPath -Force | Out-Null
        }
        
        # Set registry values for Windows Settings/Apps recognition
        Set-ItemProperty -Path $UninstallRegistryPath -Name "DisplayName" -Value "Eyedeea Photos Wallpaper"
        Set-ItemProperty -Path $UninstallRegistryPath -Name "DisplayVersion" -Value "1.0"
        Set-ItemProperty -Path $UninstallRegistryPath -Name "Publisher" -Value "Eyedia Technologies"
        Set-ItemProperty -Path $UninstallRegistryPath -Name "URLInfoAbout" -Value "https://eyedeeaphotos.eyediatech.com/"
        Set-ItemProperty -Path $UninstallRegistryPath -Name "InstallLocation" -Value $PSScriptRoot
        
        # Critical: Set UninstallString to point to desktop_wallpaper.ps1 with -Uninstall flag
        # This is what Windows calls when user clicks "Uninstall" in Settings
        $uninstallCommand = "powershell.exe -ExecutionPolicy Bypass -NoProfile -File `"$DesktopWallpaperScriptPath`" -Uninstall"
        Set-ItemProperty -Path $UninstallRegistryPath -Name "UninstallString" -Value $uninstallCommand
        
        # Optional: Set QuietUninstallString for silent uninstall
        Set-ItemProperty -Path $UninstallRegistryPath -Name "QuietUninstallString" -Value $uninstallCommand
        
        # Set display icon
        if (Test-Path $IconPath) {
            Set-ItemProperty -Path $UninstallRegistryPath -Name "DisplayIcon" -Value $IconPath
        }
        
        Write-Host "✓ App registered in Windows Settings" -ForegroundColor Green
        Write-Host "  You can now uninstall from: Settings > Apps > Apps and features" -ForegroundColor Green
    } catch {
        Write-Host "! Warning: Could not register app in Windows Settings" -ForegroundColor Yellow
        Write-Host "  You can still uninstall manually by running: .\desktop_wallpaper.ps1 -Uninstall" -ForegroundColor Yellow
    }
    
    # Ask if user wants to start now
    $response = Read-Host "Do you want to start the app now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "Starting application..." -ForegroundColor Green
        Start-Process powershell.exe -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
        Write-Host "Application started in background. Check system tray for icon." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "The app will start automatically on next login."
    Write-Host ""
    Write-Host "You can also launch it from:" -ForegroundColor Cyan
    Write-Host "  - Windows Start Menu: Search for 'Eyedeea Photos Wallpaper'" -ForegroundColor Cyan
    Write-Host "  - System tray icon (when running)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To configure, edit: $PSScriptRoot\config.json"
    Write-Host "To uninstall, run: .\desktop_wallpaper.ps1 -Uninstall"
}

function Uninstall-App {
    Write-Host "" 
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host "  Uninstalling Eyedeea Photos Wallpaper" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to stop running instances first
    Write-Host "Checking for running instances..." -ForegroundColor Cyan
    try {
        # Try to find processes with WallpaperApp.ps1
        $processes = Get-WmiObject Win32_Process -Filter "name='powershell.exe'" -ErrorAction SilentlyContinue |
                     Where-Object { $_.CommandLine -like "*WallpaperApp.ps1*" }
        
        if ($processes) {
            Write-Host "Found $($processes.Count) running instance(s). Stopping..." -ForegroundColor Yellow
            foreach ($proc in $processes) {
                Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
            Write-Host "✓ Stopped running instances" -ForegroundColor Green
        } else {
            Write-Host "✓ No running instances found" -ForegroundColor Gray
        }
    } catch {
        Write-Host "! Could not check for running processes" -ForegroundColor Yellow
    }
    
    # Remove startup shortcut
    Write-Host ""
    Write-Host "Removing shortcuts..." -ForegroundColor Cyan
    if (Test-Path $StartupShortcutPath) {
        Remove-Item $StartupShortcutPath -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Removed Startup shortcut: $StartupShortcutPath" -ForegroundColor Green
    } else {
        Write-Host "- Startup shortcut not found" -ForegroundColor Gray
    }
    
    # Remove Start Menu shortcut
    if (Test-Path $StartMenuShortcutPath) {
        Remove-Item $StartMenuShortcutPath -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Removed Start Menu shortcut: $StartMenuShortcutPath" -ForegroundColor Green
    } else {
        Write-Host "- Start Menu shortcut not found" -ForegroundColor Gray
    }
    
    # Remove Registry Uninstall entry
    Write-Host ""
    Write-Host "Removing Windows registry entries..." -ForegroundColor Cyan
    try {
        if (Test-Path $UninstallRegistryPath) {
            Remove-Item -Path $UninstallRegistryPath -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Removed Windows registry entry" -ForegroundColor Green
        } else {
            Write-Host "- Registry entry not found" -ForegroundColor Gray
        }
    } catch {
        Write-Host "! Warning: Could not remove registry entry" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "  Uninstallation Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files preserved:" -ForegroundColor Cyan
    Write-Host "  - Application files: $PSScriptRoot" -ForegroundColor Gray
    Write-Host "  - Downloaded wallpapers: $PSScriptRoot\wallpapers" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To completely remove, manually delete: $PSScriptRoot" -ForegroundColor Yellow
}

# Main execution
if ($Uninstall) {
    Uninstall-App
} else {
    Install-App
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
