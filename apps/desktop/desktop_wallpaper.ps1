# Eyedeea Photos Desktop Wallpaper - Installer & Bootstrap Script
# This script downloads and installs the Eyedeea Photos Desktop Wallpaper app from GitHub
# It can also be used to uninstall the app when run with the -Uninstall switch
# Version: 1.0

param(
    [switch]$Uninstall
)

# GitHub repository information
$GithubBaseUrl = "https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop"
$FilesToDownload = @(
    "WallpaperApp.ps1",
    "config.json",
    "install.ps1",
    "icon.ico",
    "README.md"
)

# Installation directory
$InstallDir = Join-Path $env:LOCALAPPDATA "EyediaTech\EyedeeaPhotos\app_desktop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-AdminPrivileges {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Download-AppFiles {
    Write-ColorOutput "`nDownloading Eyedeea Photos Wallpaper App from GitHub..." "Cyan"
    
    # Create installation directory
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Write-ColorOutput "Created installation directory: $InstallDir" "Green"
    }
    
    # Download each file
    $success = $true
    foreach ($file in $FilesToDownload) {
        $url = "$GithubBaseUrl/$file"
        $destination = Join-Path $InstallDir $file
        
        try {
            Write-Host "  Downloading $file... " -NoNewline
            
            # Use TLS 1.2 for GitHub
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($url, $destination)
            
            Write-ColorOutput "OK" "Green"
        } catch {
            Write-ColorOutput "FAILED" "Red"
            Write-ColorOutput "  Error: $_" "Red"
            $success = $false
        }
    }
    
    return $success
}

function Install-Application {
    Write-ColorOutput "`nInstalling application..." "Cyan"
    
    # Run the install script from the downloaded location
    $installScriptPath = Join-Path $InstallDir "install.ps1"
    
    if (Test-Path $installScriptPath) {
        try {
            # Run install script with proper execution policy
            & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $installScriptPath
            
            Write-ColorOutput "Installation completed successfully!" "Green"
            return $true
        } catch {
            Write-ColorOutput "Installation failed: $_" "Red"
            return $false
        }
    } else {
        Write-ColorOutput "Install script not found at: $installScriptPath" "Red"
        return $false
    }
}

function Start-Application {
    Write-ColorOutput "`nStarting Eyedeea Photos Wallpaper..." "Cyan"
    
    $appPath = Join-Path $InstallDir "WallpaperApp.ps1"
    
    if (Test-Path $appPath) {
        try {
            # Start the app in a new hidden PowerShell window
            $startInfo = New-Object System.Diagnostics.ProcessStartInfo
            $startInfo.FileName = "powershell.exe"
            $startInfo.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$appPath`""
            $startInfo.UseShellExecute = $false
            $startInfo.CreateNoWindow = $true
            
            [System.Diagnostics.Process]::Start($startInfo) | Out-Null
            
            Write-ColorOutput "Application started in background!" "Green"
            Write-ColorOutput "Look for the Eyedeea icon in your system tray." "Yellow"
            return $true
        } catch {
            Write-ColorOutput "Failed to start application: $_" "Red"
            return $false
        }
    } else {
        Write-ColorOutput "Application not found at: $appPath" "Red"
        return $false
    }
}

function Uninstall-Application {
    Write-ColorOutput "`nUninstalling Eyedeea Photos Wallpaper..." "Cyan"
    
    $installScriptPath = Join-Path $InstallDir "install.ps1"
    
    if (Test-Path $installScriptPath) {
        try {
            # Run uninstall
            Push-Location $InstallDir
            & $installScriptPath -Uninstall
            Pop-Location
            
            # Remove installation directory
            if (Test-Path $InstallDir) {
                Write-Host "  Removing installation directory... " -NoNewline
                Remove-Item -Path $InstallDir -Recurse -Force
                Write-ColorOutput "OK" "Green"
            }
            
            Write-ColorOutput "Uninstallation completed successfully!" "Green"
        } catch {
            Write-ColorOutput "Uninstallation failed: $_" "Red"
            Pop-Location
        }
    } else {
        Write-ColorOutput "Installation not found at: $InstallDir" "Yellow"
    }
}

# Main execution
Write-ColorOutput "============================================" "Cyan"
Write-ColorOutput "  Eyedeea Photos Desktop Wallpaper" "Cyan"
Write-ColorOutput "  Bootstrap Installer v1.0" "Cyan"
Write-ColorOutput "============================================" "Cyan"

if ($Uninstall) {
    Uninstall-Application
} else {
    # Check for admin privileges (not required but good to know)
    if (Test-AdminPrivileges) {
        Write-ColorOutput "`nRunning with administrator privileges." "Yellow"
    }
    
    # Download files
    if (Download-AppFiles) {
        Write-ColorOutput "`nAll files downloaded successfully!" "Green"
        
        # Install application
        if (Install-Application) {
            # Start the application
            Start-Application
            
            Write-ColorOutput "`n============================================" "Green"
            Write-ColorOutput "Installation Complete!" "Green"
            Write-ColorOutput "============================================" "Green"
            Write-ColorOutput "`nThe Eyedeea Photos Wallpaper app is now running." "White"
            Write-ColorOutput "Right-click the system tray icon to:" "White"
            Write-ColorOutput "  - Configure your server URL" "White"
            Write-ColorOutput "  - Start/Stop wallpaper rotation" "White"
            Write-ColorOutput "  - Fetch new photos manually" "White"
            Write-ColorOutput "`nInstall Location: $InstallDir" "Gray"
            Write-ColorOutput "`nTo uninstall, run:" "Gray"
            Write-ColorOutput "  powershell -File bootstrap.ps1 -Uninstall" "Gray"
        }
    } else {
        Write-ColorOutput "`nDownload failed. Please check your internet connection and try again." "Red"
        Write-ColorOutput "If the problem persists, visit: https://github.com/eyedia/EyedeeaPhotos" "Yellow"
    }
}

Write-ColorOutput "`nPress any key to exit..." "Gray"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
