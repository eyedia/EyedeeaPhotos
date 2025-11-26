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
$node_path = "C:\Program Files\nodejs\npm.cmd"
$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"
$node_file = "$env:TEMP\node.msi"
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
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

Function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

Function Write-Error-Custom {
    param(
        [string]$Message,
        [switch]$Critical
    )
    Write-Host "❌ $Message" -ForegroundColor Red
    $script:ErrorCount++
    
    if ($Critical) {
        Write-Host "   This is a critical error. Installation cannot continue." -ForegroundColor Red
    }
}

Function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
    $script:WarningCount++
}

Function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

Function Write-Step {
    param([string]$Message)
    Write-Host "📋 $Message" -ForegroundColor White
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

# ============================================================================
# MAIN INSTALLATION LOGIC
# ============================================================================

trap {
    Write-Error-Custom -Message "Unexpected error: $_" -Critical
    Pause-Script
    exit 1
}

Write-Header "🎉 EyedeeaPhotos Installation"

# Check admin privileges
if (-not (Check-Admin)) {
    Write-Error-Custom -Message "Administrator privileges required!" -Critical
    Write-Info "Please right-click PowerShell and select 'Run as administrator'"
    Pause-Script
    exit 1
}

Write-Success "Running with administrator privileges"

# Add your installation steps here with try-catch blocks
try {
    Write-Step "Installing dependencies..."
    # Your installation code
    Write-Success "Installation completed successfully!"
}
catch {
    Write-Error-Custom -Message "Installation failed: $_"
}

# ============================================================================
# SUMMARY AND EXIT
# ============================================================================

Write-Header "📊 Installation Summary"
Write-Host "Errors: $script:ErrorCount" -ForegroundColor $(if ($script:ErrorCount -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings: $script:WarningCount" -ForegroundColor $(if ($script:WarningCount -gt 0) { "Yellow" } else { "Green" })

Pause-Script
