# Eyedeea Photos - Desktop Wallpaper App
# System tray application that fetches photos from API and sets as wallpaper

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Threading

# Singleton check - prevent multiple instances
$mutexName = "Global\EyedeeaPhotosWallpaperApp"
$script:Mutex = New-Object System.Threading.Mutex($false, $mutexName)

if (-not $script:Mutex.WaitOne(0, $false)) {
    Write-Host "Another instance is already running. Exiting..."
    [System.Windows.Forms.MessageBox]::Show(
        "Eyedeea Photos Wallpaper is already running. Check the system tray icon.",
        "Already Running",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
    exit
}

# Configuration
$script:ConfigPath = Join-Path $PSScriptRoot "config.json"
$script:Config = Get-Content $ConfigPath | ConvertFrom-Json
$script:PhotosDir = Join-Path $PSScriptRoot "wallpapers"
$script:MaxPhotos = 15
$script:IsRunning = $false
$script:Timer = $null

# Build API URL from server URL
if ($script:Config.PSObject.Properties.Name -contains 'serverUrl') {
    $script:ApiUrl = "$($script:Config.serverUrl)/api/view"
} else {
    # Fallback for old config format
    $script:ApiUrl = $script:Config.apiUrl
}

# Ensure photos directory exists
if (-not (Test-Path $script:PhotosDir)) {
    New-Item -ItemType Directory -Path $script:PhotosDir -Force | Out-Null
}

# Function to get desktop resolution
function Get-DesktopResolution {
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    return @{
        Width = $screen.Bounds.Width
        Height = $screen.Bounds.Height
    }
}

# Function to resize image to desktop resolution
function Resize-Image {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [int]$Width,
        [int]$Height
    )
    
    try {
        # Load the source image
        $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
        
        # Create new bitmap with target dimensions
        $resizedImage = New-Object System.Drawing.Bitmap($Width, $Height)
        
        # Create graphics object for high-quality resizing
        $graphics = [System.Drawing.Graphics]::FromImage($resizedImage)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Calculate dimensions to maintain aspect ratio and fill screen
        $sourceRatio = $sourceImage.Width / $sourceImage.Height
        $targetRatio = $Width / $Height
        
        $drawWidth = $Width
        $drawHeight = $Height
        $drawX = 0
        $drawY = 0
        
        if ($sourceRatio -gt $targetRatio) {
            # Source is wider - fit by height
            $drawWidth = [int]($Height * $sourceRatio)
            $drawX = [int](($Width - $drawWidth) / 2)
        } else {
            # Source is taller - fit by width
            $drawHeight = [int]($Width / $sourceRatio)
            $drawY = [int](($Height - $drawHeight) / 2)
        }
        
        # Draw the resized image
        $graphics.DrawImage($sourceImage, $drawX, $drawY, $drawWidth, $drawHeight)
        
        # Save the resized image
        $resizedImage.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        
        # Clean up
        $graphics.Dispose()
        $resizedImage.Dispose()
        $sourceImage.Dispose()
        
        Write-Host "Image resized to ${Width}x${Height}: $DestinationPath"
        return $true
    } catch {
        Write-Host "Error resizing image: $_"
        if ($null -ne $graphics) { $graphics.Dispose() }
        if ($null -ne $resizedImage) { $resizedImage.Dispose() }
        if ($null -ne $sourceImage) { $sourceImage.Dispose() }
        return $false
    }
}

# Function to set wallpaper
function Set-Wallpaper {
    param([string]$Path)
    
    Add-Type @"
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32;

public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
    
    public static void SetWallpaper(string path) {
        SystemParametersInfo(20, 0, path, 0x01 | 0x02);
    }
}
"@
    
    [Wallpaper]::SetWallpaper($Path)
    Write-Host "Wallpaper set to: $Path"
}

# Function to download photo from API
function Get-Photo {
    try {
        $url = $script:ApiUrl
        
        if ([string]::IsNullOrEmpty($url)) {
            Write-Host "Server URL not configured. Please configure in Server Config menu."
            $script:NotifyIcon.ShowBalloonTip(5000, "Configuration Required", "Please configure server URL from the menu.", [System.Windows.Forms.ToolTipIcon]::Warning)
            return $null
        }
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $filename = "wallpaper_$timestamp.jpg"
        $filepath = Join-Path $script:PhotosDir $filename
        
        Write-Host "Fetching photo from: $url"
        
        # Download the image
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($url, $filepath)
        
        if (Test-Path $filepath) {
            Write-Host "Photo downloaded: $filename"
            
            # Get desktop resolution
            $resolution = Get-DesktopResolution
            Write-Host "Desktop resolution: $($resolution.Width)x$($resolution.Height)"
            
            # Resize image to match desktop resolution
            $resizedFilename = "wallpaper_${timestamp}_resized.jpg"
            $resizedFilepath = Join-Path $script:PhotosDir $resizedFilename
            
            if (Resize-Image -SourcePath $filepath -DestinationPath $resizedFilepath -Width $resolution.Width -Height $resolution.Height) {
                # Remove original (non-resized) image
                Remove-Item $filepath -Force
                
                # Set resized image as wallpaper
                Set-Wallpaper -Path $resizedFilepath
            } else {
                # If resize fails, use original
                Write-Host "Using original image size"
                Set-Wallpaper -Path $filepath
            }
            
            # Clean up old photos
            Remove-OldPhotos
            
            return $resizedFilepath
        } else {
            Write-Host "Failed to download photo"
            return $null
        }
    } catch {
        Write-Host "Error downloading photo: $_"
        
        # Show user-friendly notification
        if ($_.Exception.Message -like "*Unable to connect*" -or $_.Exception.Message -like "*could not be resolved*") {
            $script:NotifyIcon.ShowBalloonTip(5000, "Connection Error", "Cannot reach server. Check Server Config.", [System.Windows.Forms.ToolTipIcon]::Error)
        } else {
            $script:NotifyIcon.ShowBalloonTip(5000, "Download Error", "Failed to fetch photo from server.", [System.Windows.Forms.ToolTipIcon]::Error)
        }
        
        return $null
    }
}

# Function to remove old photos (keep last 15)
function Remove-OldPhotos {
    $photos = Get-ChildItem -Path $script:PhotosDir -Filter "wallpaper_*.jpg" | 
              Sort-Object CreationTime -Descending
    
    if ($photos.Count -gt $script:MaxPhotos) {
        $photosToDelete = $photos | Select-Object -Skip $script:MaxPhotos
        foreach ($photo in $photosToDelete) {
            Remove-Item $photo.FullName -Force
            Write-Host "Removed old photo: $($photo.Name)"
        }
    }
}

# Function to show server configuration dialog
function Show-ServerConfigDialog {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Server Configuration"
    $form.Size = New-Object System.Drawing.Size(450, 200)
    $form.StartPosition = "CenterScreen"
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false
    
    $label = New-Object System.Windows.Forms.Label
    $label.Text = "Server URL (without /api/view):"
    $label.Location = New-Object System.Drawing.Point(20, 20)
    $label.Size = New-Object System.Drawing.Size(400, 20)
    $form.Controls.Add($label)
    
    $textBox = New-Object System.Windows.Forms.TextBox
    $textBox.Location = New-Object System.Drawing.Point(20, 50)
    $textBox.Size = New-Object System.Drawing.Size(400, 25)
    $textBox.Text = $script:Config.serverUrl
    $form.Controls.Add($textBox)
    
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Location = New-Object System.Drawing.Point(20, 85)
    $statusLabel.Size = New-Object System.Drawing.Size(400, 40)
    $statusLabel.ForeColor = [System.Drawing.Color]::Gray
    $statusLabel.Text = "Example: http://192.168.86.102:8080"
    $form.Controls.Add($statusLabel)
    
    $saveButton = New-Object System.Windows.Forms.Button
    $saveButton.Text = "Save"
    $saveButton.Location = New-Object System.Drawing.Point(245, 130)
    $saveButton.Size = New-Object System.Drawing.Size(80, 25)
    $saveButton.Add_Click({
        $newUrl = $textBox.Text.Trim()
        
        # Validate URL format
        if (-not ($newUrl -match '^https?://')) {
            $statusLabel.Text = "Error: URL must start with http:// or https://"
            $statusLabel.ForeColor = [System.Drawing.Color]::Red
            return
        }
        
        # Remove trailing slash
        $newUrl = $newUrl.TrimEnd('/')
        
        # Test server connectivity
        $statusLabel.Text = "Testing connection..."
        $statusLabel.ForeColor = [System.Drawing.Color]::Blue
        $form.Refresh()
        
        try {
            $testUrl = "$newUrl/api/view"
            $response = Invoke-WebRequest -Uri $testUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
            
            # Update config
            $script:Config.serverUrl = $newUrl
            $script:ApiUrl = $testUrl
            $script:Config | ConvertTo-Json | Set-Content $script:ConfigPath
            
            $statusLabel.Text = "Server configured successfully!"
            $statusLabel.ForeColor = [System.Drawing.Color]::Green
            
            Start-Sleep -Seconds 1
            $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
            $form.Close()
        } catch {
            $statusLabel.Text = "Error: Cannot reach server. Please check the URL."
            $statusLabel.ForeColor = [System.Drawing.Color]::Red
        }
    })
    $form.Controls.Add($saveButton)
    
    $cancelButton = New-Object System.Windows.Forms.Button
    $cancelButton.Text = "Cancel"
    $cancelButton.Location = New-Object System.Drawing.Point(335, 130)
    $cancelButton.Size = New-Object System.Drawing.Size(80, 25)
    $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $form.Controls.Add($cancelButton)
    
    $form.AcceptButton = $saveButton
    $form.CancelButton = $cancelButton
    
    $form.ShowDialog() | Out-Null
}

# Function to restore default wallpaper
function Restore-DefaultWallpaper {
    try {
        # Get Windows default wallpaper path
        $defaultWallpaper = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name Wallpaper).Wallpaper
        
        if ($defaultWallpaper -and (Test-Path $defaultWallpaper)) {
            Set-Wallpaper -Path $defaultWallpaper
            Write-Host "Restored default wallpaper"
        } else {
            # Use Windows default
            $winDir = $env:windir
            $defaultPath = "$winDir\Web\Wallpaper\Windows\img0.jpg"
            if (Test-Path $defaultPath) {
                Set-Wallpaper -Path $defaultPath
                Write-Host "Set to Windows default wallpaper"
            }
        }
    } catch {
        Write-Host "Error restoring wallpaper: $_"
    }
}

# Timer tick event
function OnTimerTick {
    if ($script:IsRunning) {
        Get-Photo
    }
}

# Start slideshow
function Start-Slideshow {
    if (-not $script:IsRunning) {
        $script:IsRunning = $true
        Write-Host "Slideshow started"
        
        # Update menu
        $script:StartMenuItem.Enabled = $false
        $script:StopMenuItem.Enabled = $true
        $script:NotifyIcon.Text = "Eyedeea Photos - Running"
        
        # Fetch photo immediately
        Get-Photo
        
        # Start timer
        if ($null -eq $script:Timer) {
            $script:Timer = New-Object System.Windows.Forms.Timer
            $script:Timer.Interval = $script:Config.updateIntervalMinutes * 60 * 1000
            $script:Timer.Add_Tick({ OnTimerTick })
        }
        $script:Timer.Start()
    }
}

# Stop slideshow
function Stop-Slideshow {
    if ($script:IsRunning) {
        $script:IsRunning = $false
        Write-Host "Slideshow stopped"
        
        # Update menu
        $script:StartMenuItem.Enabled = $true
        $script:StopMenuItem.Enabled = $false
        $script:NotifyIcon.Text = "Eyedeea Photos - Stopped"
        
        # Stop timer
        if ($null -ne $script:Timer) {
            $script:Timer.Stop()
        }
    }
}

# Shutdown application
function Stop-Application {
    Write-Host "Shutting down application..."
    
    # Stop slideshow
    Stop-Slideshow
    
    # Restore default wallpaper
    Restore-DefaultWallpaper
    
    # Clean up
    if ($null -ne $script:Timer) {
        $script:Timer.Dispose()
    }
    
    # Remove tray icon
    $script:NotifyIcon.Visible = $false
    $script:NotifyIcon.Dispose()
    
    # Release mutex
    if ($null -ne $script:Mutex) {
        $script:Mutex.ReleaseMutex()
        $script:Mutex.Dispose()
    }
    
    # Exit application
    [System.Windows.Forms.Application]::Exit()
}

# Create system tray icon
function Initialize-TrayIcon {
    # Create icon (using a default icon for now)
    $iconPath = Join-Path $PSScriptRoot "icon.ico"
    if (Test-Path $iconPath) {
        $icon = [System.Drawing.Icon]::new($iconPath)
    } else {
        # Use default system icon
        $icon = [System.Drawing.SystemIcons]::Application
    }
    
    # Create notify icon
    $script:NotifyIcon = New-Object System.Windows.Forms.NotifyIcon
    $script:NotifyIcon.Icon = $icon
    $script:NotifyIcon.Text = "Eyedeea Photos - Stopped"
    $script:NotifyIcon.Visible = $true
    
    # Create context menu
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip
    
    # Start menu item
    $script:StartMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $script:StartMenuItem.Text = "Start Slideshow"
    $script:StartMenuItem.Add_Click({ Start-Slideshow })
    $contextMenu.Items.Add($script:StartMenuItem) | Out-Null
    
    # Stop menu item
    $script:StopMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $script:StopMenuItem.Text = "Stop Slideshow"
    $script:StopMenuItem.Enabled = $false
    $script:StopMenuItem.Add_Click({ Stop-Slideshow })
    $contextMenu.Items.Add($script:StopMenuItem) | Out-Null
    
    # Separator
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    
    # Fetch now menu item
    $fetchNowMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $fetchNowMenuItem.Text = "Fetch Photo Now"
    $fetchNowMenuItem.Add_Click({ Get-Photo })
    $contextMenu.Items.Add($fetchNowMenuItem) | Out-Null
    
    # Open folder menu item
    $openFolderMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $openFolderMenuItem.Text = "Open Photos Folder"
    $openFolderMenuItem.Add_Click({ Start-Process $script:PhotosDir })
    $contextMenu.Items.Add($openFolderMenuItem) | Out-Null
    
    # Server Config menu item
    $serverConfigMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $serverConfigMenuItem.Text = "Server Config"
    $serverConfigMenuItem.Add_Click({ Show-ServerConfigDialog })
    $contextMenu.Items.Add($serverConfigMenuItem) | Out-Null
    
    # Show Photo Details menu item
    $showDetailsMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $showDetailsMenuItem.Text = "Show Photo Details"
    $showDetailsMenuItem.Add_Click({ 
        Start-Process $script:Config.serverUrl
    })
    $contextMenu.Items.Add($showDetailsMenuItem) | Out-Null
    
    # Separator
    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    
    # Shutdown menu item
    $shutdownMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $shutdownMenuItem.Text = "Shutdown and Restore Default"
    $shutdownMenuItem.Add_Click({ Stop-Application })
    $contextMenu.Items.Add($shutdownMenuItem) | Out-Null
    
    # Exit menu item
    $exitMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $exitMenuItem.Text = "Exit"
    $exitMenuItem.Add_Click({ 
        Stop-Slideshow
        $script:NotifyIcon.Visible = $false
        [System.Windows.Forms.Application]::Exit()
    })
    $contextMenu.Items.Add($exitMenuItem) | Out-Null
    
    # Assign context menu to notify icon
    $script:NotifyIcon.ContextMenuStrip = $contextMenu
    
    # Double-click to start/stop
    $script:NotifyIcon.Add_DoubleClick({
        if ($script:IsRunning) {
            Stop-Slideshow
        } else {
            Start-Slideshow
        }
    })
}

# Main entry point
function Main {
    Write-Host "Eyedeea Photos Desktop Wallpaper App"
    Write-Host "======================================"
    Write-Host "Server URL: $($script:Config.serverUrl)"
    Write-Host "API URL: $script:ApiUrl"
    Write-Host "Update Interval: $($script:Config.updateIntervalMinutes) minutes"
    Write-Host "Photos Directory: $script:PhotosDir"
    Write-Host ""
    
    # Initialize tray icon
    Initialize-TrayIcon
    
    # Auto-start if configured
    if ($script:Config.autoStart) {
        Start-Slideshow
    }
    
    # Show notification
    $script:NotifyIcon.ShowBalloonTip(3000, "Eyedeea Photos", "Wallpaper app is running. Right-click icon for options.", [System.Windows.Forms.ToolTipIcon]::Info)
    
    # Run application loop
    [System.Windows.Forms.Application]::Run()
}

# Run the application
Main
