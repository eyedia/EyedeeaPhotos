# Eyedeea Photos - Desktop Wallpaper App

A Windows desktop application that automatically fetches photos from the Eyedeea Photos API and sets them as your desktop wallpaper.

## Features

- 🖼️ **Auto Wallpaper Updates**: Fetches new photos from API at configurable intervals
- 💾 **Photo Management**: Keeps the last 15 photos locally for slideshow capability
- 🎯 **System Tray Integration**: Runs minimized with easy access via system tray icon
- ⚙️ **Server Configuration**: Easy-to-use UI dialog to configure server URL
- 🔄 **Start/Stop Control**: Control slideshow from system tray menu
- 🏠 **Default Restore**: Automatically restores Windows default wallpaper on shutdown
- 🚀 **Auto-Start**: Optional startup on Windows login
- 🌐 **Network Error Handling**: Graceful handling of server connectivity issues
- 🔐 **Singleton Pattern**: Prevents multiple instances from running
- 📐 **Smart Resizing**: Automatically resizes photos to match desktop resolution
- 🔗 **Quick Access**: Open photo details in browser from tray menu

## Installation

### Prerequisites

- Windows 10 or later
- PowerShell 5.1 or later
- Eyedeea Photos server accessible over network

### Bootstrap Install (Recommended)

Download and run the bootstrap installer which will download the latest version from GitHub:

1. Download `bootstrap.ps1` from: https://github.com/eyedia/EyedeeaPhotos/blob/main/apps/desktop/bootstrap.ps1

2. Run in PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
   ```

3. The bootstrap installer will:
   - Download the latest app files from GitHub
   - Install to `%LOCALAPPDATA%\EyediaTech\EyedeeaPhotos\app_desktop`
   - Create Start Menu and Startup shortcuts
   - Start the app in background

### Manual Install

1. Open PowerShell
2. Navigate to the desktop app folder:
   ```powershell
   cd c:\Work\EyedeeaPhotos\apps\desktop
   ```

3. Run the installer:
   ```powershell
   .\install.ps1
   ```

4. The installer will:
   - Create Start Menu shortcut: "Eyedeea Photos Wallpaper"
   - Create startup shortcut for auto-start on login
   - Offer to start the app immediately

## Configuration

### Using Server Config Dialog (Recommended)

1. Right-click the system tray icon
2. Select "Server Config"
3. Enter your server URL (e.g., `http://192.168.86.102:8080`)
4. Click "Save" - the app will test the connection

### Manual Configuration

Edit `config.json` to customize settings:

```json
{
  "serverUrl": "http://192.168.86.102:8080",
  "updateIntervalMinutes": 1,
  "autoStart": true,
  "maxPhotos": 15
}
```

### Configuration Options

- **serverUrl**: The base server URL without /api/view (default: `http://192.168.86.102:8080`)
- **updateIntervalMinutes**: How often to check for new photos in minutes (default: `1`)
- **autoStart**: Whether to start slideshow automatically when app launches (default: `true`)
- **maxPhotos**: Maximum number of photos to keep locally (default: `15`)

## Usage

### System Tray Menu

Right-click the system tray icon to access:

- **Start Slideshow**: Begin fetching and displaying photos
- **Stop Slideshow**: Pause the slideshow (keeps current wallpaper)
- **Fetch Photo Now**: Manually fetch a new photo immediately
- **Open Photos Folder**: Open the folder containing downloaded wallpapers
- **Server Config**: Configure server URL with connection testing
- **Show Photo Details**: Open the Eyedeea Photos website in browser
- **Shutdown and Restore Default**: Stop app and restore Windows default wallpaper
- **Exit**: Close the app without restoring wallpaper

### Keyboard Shortcut

- Double-click the tray icon to quickly start/stop the slideshow

### Manual Start

If not using the installer, you can run the app manually:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "WallpaperApp.ps1"
```

To run hidden in background:

```powershell
powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "WallpaperApp.ps1"
```

## Uninstall

### Using Bootstrap

```powershell
powershell -ExecutionPolicy Bypass -File bootstrap.ps1 -Uninstall
```

### Manual Uninstall

```powershell
.\install.ps1 -Uninstall
```

This will remove:
- Startup shortcut
- Start Menu shortcut
- Downloaded wallpapers folder

## Troubleshooting

### Cannot Reach Server

If you see "Connection Error" notifications:
1. Check that the Eyedeea Photos server is running
2. Verify the server URL in Server Config
3. Ensure your firewall allows the connection
4. Test the URL in a browser: `http://your-server:8080/api/view`

### Multiple Instances Running

The app uses a singleton pattern - only one instance can run at a time. If you see odd behavior:
1. Exit the app from the system tray
2. Check Task Manager for any remaining `powershell.exe` processes
3. End any processes running `WallpaperApp.ps1`
4. Restart the app

### App Not Starting on Login

1. Check that the startup shortcut exists: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
2. Verify the shortcut points to the correct location
3. Run `install.ps1` again to recreate shortcuts

## File Structure

```
apps/desktop/
├── bootstrap.ps1         # Bootstrap installer (downloads from GitHub)
├── WallpaperApp.ps1      # Main application script
├── config.json           # Configuration file
├── install.ps1           # Local installation/uninstallation script
├── README.md             # This file
├── icon.ico              # (Optional) Custom tray icon
└── wallpapers/           # Downloaded photos (auto-created)
```

## Technical Details

### How It Works

1. **Timer-based Fetching**: The app uses a Windows Forms Timer to check for new photos at the configured interval
2. **API Integration**: Calls the `/api/view` endpoint which returns a photo (refreshed every 60 minutes on the server)
3. **Local Storage**: Downloads photos with timestamp filenames to the `wallpapers` folder
4. **Image Resizing**: Automatically resizes photos to match desktop resolution using high-quality bicubic interpolation
5. **Wallpaper Setting**: Uses Windows API (`SystemParametersInfo`) to set the wallpaper
6. **Cleanup**: Automatically removes old photos, keeping only the most recent 15
7. **Graceful Shutdown**: Restores the original Windows wallpaper when shut down via the menu
8. **Singleton Pattern**: Uses a global mutex to prevent multiple instances from running

### Configuration Schema

The app supports both old and new config formats:

**Current Format** (serverUrl):
```json
{
  "serverUrl": "http://192.168.86.102:8080",
  "updateIntervalMinutes": 1,
  "autoStart": true,
  "maxPhotos": 15
}
```

**Legacy Format** (apiUrl - still supported):
```json
{
  "apiUrl": "http://localhost:8080/api/view",
  "updateIntervalMinutes": 1,
  "autoStart": true,
  "maxPhotos": 15
}
```

The new format separates the base server URL from the API endpoint path, which is constructed dynamically as `${serverUrl}/api/view`.

### Key Features Implementation

- **Server Config Dialog**: Windows Form with real-time connection testing and URL validation
- **Error Handling**: Comprehensive network error handling with user-friendly balloon tip notifications
- **Backward Compatibility**: Automatic fallback to old apiUrl format if serverUrl not found
- **Bootstrap Installer**: Downloads latest version from GitHub and auto-installs with shortcuts

## Troubleshooting

### App not starting

1. Check if PowerShell execution policy allows scripts:
   ```powershell
   Get-ExecutionPolicy
   ```
   If restricted, run as Administrator:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. Verify the Eyedeea Photos server is running:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/view" -Method HEAD
   ```

### Photos not updating

1. Check the system tray icon tooltip - it shows if slideshow is running or stopped
2. Verify the API URL in `config.json` is correct
3. Check network connectivity to the server
4. Look at the PowerShell console output for error messages

### Wallpaper not changing

1. Ensure the photos are being downloaded (check the `wallpapers` folder)
2. Verify the image files are valid JPEGs
3. Try manually setting a wallpaper from the `wallpapers` folder to test
4. Check Windows wallpaper settings (Settings > Personalization > Background)

### Finding the running process

To check if the app is running:

```powershell
Get-Process powershell | Where-Object {$_.CommandLine -like "*WallpaperApp*"}
```

### PowerShell Execution Policy Issues

If you get "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try running the installer again.

## Advanced

### For Developers

The bootstrap installer downloads files from:
```
https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/
```

Files downloaded: `WallpaperApp.ps1`, `config.json`, `install.ps1`, `README.md`

Installation location: `%LOCALAPPDATA%\EyediaTech\EyedeeaPhotos\app_desktop`

### Custom Icon

To use your own system tray icon:
1. Create an `icon.ico` file
2. Place it in the same directory as `WallpaperApp.ps1`
3. The app will automatically use it on next startup

## Version History

### v1.0 (Current - December 2025)
- Initial release with auto-fetch and timer-based updates
- System tray integration with Start/Stop controls
- Bootstrap installer for GitHub deployment
- Server configuration UI dialog
- Network error handling with user notifications
- Auto-resize to desktop resolution
- Singleton pattern (prevents multiple instances)
- Start Menu and Startup shortcuts
- Show Photo Details menu integration

## Future Enhancements

Potential improvements for future versions:
- Auto-update checker
- Windows Spotlight-style slideshow with transitions
- Multiple photo sources/servers
- Photo ratings and favorites
- Schedule-based intervals (different times of day)
- Multi-monitor support with different photos per screen
- Proxy support for corporate networks
- Custom hotkeys

## API Endpoint

The app expects the API endpoint to return:
- **Content-Type**: `image/jpeg` (or other image format)
- **Response**: Direct image binary data

Example API response:
```http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 123456

<binary image data>
```

## License

Part of the Eyedeea Photos project. See main project LICENSE for details.

## Support

For issues or questions:
- Check the main Eyedeea Photos documentation
- Review server logs if photos aren't being served
- Ensure firewall/antivirus isn't blocking the app
