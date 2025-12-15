# Eyedeea Photos Desktop Wallpaper App - Installer
# This script sets up the wallpaper app to run at startup

param(
    [switch]$Uninstall
)

$AppName = "EyedeeaPhotosWallpaper"
$ScriptPath = Join-Path $PSScriptRoot "WallpaperApp.ps1"
$StartupFolder = [Environment]::GetFolderPath("Startup")
$StartupShortcutPath = Join-Path $StartupFolder "$AppName.lnk"
$StartMenuFolder = [Environment]::GetFolderPath("Programs")
$StartMenuShortcutPath = Join-Path $StartMenuFolder "Eyedeea Photos Wallpaper.lnk"

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
    $StartupShortcut.Save()
    
    Write-Host "Startup shortcut created at: $StartupShortcutPath" -ForegroundColor Green
    
    # Create shortcut in Start Menu
    $StartMenuShortcut = $WshShell.CreateShortcut($StartMenuShortcutPath)
    $StartMenuShortcut.TargetPath = "powershell.exe"
    $StartMenuShortcut.Arguments = "-ExecutionPolicy Bypass -File `"$ScriptPath`""
    $StartMenuShortcut.WorkingDirectory = $PSScriptRoot
    $StartMenuShortcut.Description = "Eyedeea Photos Wallpaper - Desktop slideshow app"
    $StartMenuShortcut.Save()
    
    Write-Host "Start Menu shortcut created at: $StartMenuShortcutPath" -ForegroundColor Green
    
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
    Write-Host "To uninstall, run: .\install.ps1 -Uninstall"
}

function Uninstall-App {
    Write-Host "Uninstalling Eyedeea Photos Wallpaper App..." -ForegroundColor Yellow
    
    # Remove startup shortcut
    if (Test-Path $StartupShortcutPath) {
        Remove-Item $StartupShortcutPath -Force
        Write-Host "Removed startup shortcut" -ForegroundColor Green
    } else {
        Write-Host "No startup shortcut found" -ForegroundColor Yellow
    }
    
    # Remove Start Menu shortcut
    if (Test-Path $StartMenuShortcutPath) {
        Remove-Item $StartMenuShortcutPath -Force
        Write-Host "Removed Start Menu shortcut" -ForegroundColor Green
    } else {
        Write-Host "No Start Menu shortcut found" -ForegroundColor Yellow
    }
    
    # Try to stop running instances
    $processes = Get-Process powershell -ErrorAction SilentlyContinue | 
                 Where-Object { $_.CommandLine -like "*WallpaperApp.ps1*" }
    
    if ($processes) {
        Write-Host "Stopping running instances..." -ForegroundColor Yellow
        $processes | Stop-Process -Force
        Write-Host "Stopped running instances" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Uninstallation complete!" -ForegroundColor Green
    Write-Host "Note: Downloaded wallpapers in 'wallpapers' folder were preserved."
    Write-Host "You can manually delete the entire folder if needed: $PSScriptRoot"
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
