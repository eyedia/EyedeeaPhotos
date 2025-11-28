param (
    [ValidateSet("install", "uninstall")]
    [string]$Action = "install",
    [switch]$NoExit
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$app_path = Join-Path -Path $env:LOCALAPPDATA -ChildPath "EyediaTech\EyedeeaPhotos\app"
$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")
$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"
$node_file = "$env:TEMP\node.msi"
$node_path = "C:\Program Files\nodejs\"
$eyedeea_url = "http://127.0.0.1:8080/manage"

# Global error tracking
$script:ErrorCount = 0
$script:WarningCount = 0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

Function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Cyan
    Write-Host ""
}

Function Write-Success {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Green
}

Function Write-Error-Custom {
    param(
        [string]$Message,
        [switch]$Critical
    )
    Write-Host "$Message" -ForegroundColor Red
    $script:ErrorCount++
    
    if ($Critical) {
        Write-Host "   This is a critical error. Installation cannot continue." -ForegroundColor Red
    }
}

Function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Yellow
    $script:WarningCount++
}

Function Write-Info {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Cyan
}

Function Write-Step {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor White
}

Function Pause-Script {
    Write-Host ""
    Write-Host "Press any key to continue or close this window..." -ForegroundColor Yellow
    $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Function Check-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Function Refresh-PathEnvironment_not_used {
    [System.Environment]::SetEnvironmentVariable("Path", [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User"), "Machine")
}

Function Refresh-PathEnvironment {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $combined    = ($machinePath + ";" + $userPath).TrimEnd(';')
    [System.Environment]::SetEnvironmentVariable("Path", $combined, "Process")
}

# ============================================================================
# MAIN INSTALLATION LOGIC
# ============================================================================

Function Execute-Command ($cmd, $arg, $working_dir) {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $cmd
    $pinfo.RedirectStandardError = $true
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.Arguments = $arg
    $pinfo.WorkingDirectory = $working_dir
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $p.Start() | Out-Null
    $p.WaitForExit()
    [pscustomobject]@{        
        stdout   = $p.StandardOutput.ReadToEnd()
        stderr   = $p.StandardError.ReadToEnd()
        ExitCode = $p.ExitCode
    }
}

Function Install-EyedeeaPhotos {
    Write-Info "Installing Eyedeea Photos..."

    Write-Info $app_path
    if (!(Test-Path $app_path)) {
        New-Item -ItemType Directory -Path $app_path -Force | Out-Null
        Write-Info "Created application directory: $app_path"
    }

    # Check if Node.js is installed
    #$output = Execute-Command -cmd "node" -arg "-v" -working_dir $app_path
    #if (-not $output.stdout) {
    if (!(Test-Path "$node_path\node.exe")) {
        Write-Info "Node.js not found, installing..."
        try {
            Invoke-WebRequest $node_url -OutFile $node_file
            Start-Process "msiexec.exe" -ArgumentList "/i $node_file /qn" -Wait
            Start-Sleep -Seconds 5
            Write-Info "Node.js installed."
            Refresh-PathEnvironment
            # Re-query to get the newly installed path (optional)
            $nodePath = & where.exe node 2>$null
            if (-not [string]::IsNullOrWhiteSpace($nodePath)) {
                Write-Info "Node found at: $nodePath"
            } else {
                Write-Warning-Custom -Message "Node was installed but could not be found in PATH."
            }
        } catch {
            Write-Error-Custom -Message "Error installing Node.js: $($_.Exception.Message)" -Critical
            exit 1
        }
    } else {
        Write-Info "Node.js found, version: $($output.stdout.Trim())"
    }

    # Check and install PM2
    if (!(Test-Path "$appdataRoaming\npm\pm2.cmd")) {
        Write-Info "Installing PM2..."
        Execute-Command -cmd "$node_path\npm.cmd" -arg "install pm2 -g" -working_dir $app_path | Out-Null
        if (!(Test-Path "$appdataRoaming\npm\pm2.cmd")) {
            Write-Error-Custom -Message "PM2 installation failed." -Critical
            exit 101
        }
        Write-Info "PM2 installed."
    } else {
        Write-Info "PM2 already installed."
    }

    # Create application directory if not exists
    if (!(Test-Path $app_path)) {
        try {
            New-Item -ItemType Directory -Path $app_path -Force | Out-Null
            Write-Info "Created application directory: $app_path"
        } catch {
            Write-Error-Custom -Message "Error creating application directory: $($_.Exception.Message)" -Critical
            exit 1
        }
    }

    # Create a minimal package.json
    Execute-Command -cmd "$node_path\npm.cmd" -arg "init -y" -working_dir $app_path | Out-Null

    # Install Eyedeea Photos
    Write-Info "Installing Eyedeea Photos package..."
    $output = Execute-Command -cmd "$node_path\npm.cmd" -arg "install eyedeeaphotos" -working_dir $app_path
    if ($output.ExitCode -ne 0) {
        Write-Error-Custom -Message "Installation failed: $($output.stderr.Trim())" -Critical
        exit 100
    }
    Write-Info "Eyedeea Photos installed."

    # Start the application
    Write-Info "Starting Eyedeea Photos server..."
    $eyedeea_dir = "$app_path\node_modules\eyedeeaphotos"
    Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "start app.js --name ""Eyedeea Photos""" -working_dir $eyedeea_dir | Out-Null

    Start-Sleep -Seconds 3
    $pm2_status = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "list" -working_dir $eyedeea_dir
    if ($pm2_status.stdout -notmatch "Eyedeea Photos") {
        Write-Warning-Custom -Message "WARNING: Eyedeea Photos may not have started"
        exit 102
    }

    Write-Info "Eyedeea Photos started."

    # Open the application in the browser
    Start-Process $eyedeea_url
    Write-Info "Eyedeea Photos setup complete!"
}

Function Uninstall-EyedeeaPhotos {
    Write-Info "Uninstalling Eyedeea Photos..."

    # Stop PM2 process
    if (Test-Path "$appdataRoaming\npm\pm2.cmd") {
        Write-Info "Stopping PM2 process..."
        Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "stop Eyedeea Photos" -working_dir $app_path | Out-Null
        Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "delete Eyedeea Photos" -working_dir $app_path | Out-Null
        Write-Info "PM2 process stopped."
    }

    # Kill all Node.js processes
    Write-Info "Killing Node.js processes..."
    Get-Process "node" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force }
    Write-Info "Node.js processes killed."

    # Uninstall Eyedeea Photos
    if (Test-Path "$env:LOCALAPPDATA\npm\node_modules\eyedeeaphotos") {
        Write-Info "Uninstalling Eyedeea Photos package..."
        Execute-Command -cmd "$node_path\npm.cmd" -arg "uninstall eyedeeaphotos" -working_dir $app_path | Out-Null
        Write-Info "Eyedeea Photos uninstalled."
    }

    # Remove PM2 if not needed
    $pm2_apps = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "list --json"
    if ($pm2_apps.ExitCode -eq 0) {
        $pm2_list = $pm2_apps.stdout | ConvertFrom-Json
        if ($pm2_list.Count -eq 0) {
            Write-Info "No PM2 apps found, uninstalling PM2..."
            Execute-Command -cmd "$node_path\npm.cmd" -arg "uninstall pm2 -g" -working_dir $app_path | Out-Null
            Write-Info "PM2 removed."
        }
    }

    # Remove application directory
    if (Test-Path $app_path) {
        Write-Info "Removing Eyedeea Photos directory..."
        Remove-Item -Path $app_path -Recurse -Force
        Write-Info "Application directory deleted."
    }

    Write-Info "Uninstallation complete!"
}

trap {
    Write-Error-Custom -Message "Unexpected error: $_" -Critical
    Pause-Script
    exit 1
}

Write-Header "EyedeeaPhotos Installation"

# Check admin privileges
if (-not (Check-Admin)) {
    Write-Error-Custom -Message "Administrator privileges required!" -Critical
    Write-Info "Please right-click PowerShell and select 'Run as administrator'"
    Pause-Script
    exit 1
}

Write-Success "Running with administrator privileges"

# Execute based on command-line parameter
try {
    Write-Step "Installing dependencies..."
    if ($Action -eq "install") {
        Install-EyedeeaPhotos
    }
    elseif ($Action -eq "uninstall") {
        Uninstall-EyedeeaPhotos
    }
    else {
        Write-Error-Custom -Message "Invalid argument! Use 'install' or 'uninstall'." -Critical
        exit 1
    }
    Write-Success "Installation completed successfully!"
} catch {
    Write-Error-Custom -Message "Installation failed: $_" -Critical
}

# ============================================================================
# SUMMARY AND EXIT
# ============================================================================

$errorsColor = if ($script:ErrorCount -gt 0) { "Red" } else { "Green" }
$warningsColor = if ($script:WarningCount -gt 0) { "Yellow" } else { "Green" }

Write-Host "Errors: $script:ErrorCount" -ForegroundColor $errorsColor
Write-Host "Warnings: $script:WarningCount" -ForegroundColor $warningsColor

Pause-Script
