# Eyedeea Photos - Desktop Wallpaper App

A Windows desktop application that automatically fetches photos from the Eyedeea Photos API and sets them as your desktop wallpaper.

## Features

- 🖼️ **Auto Wallpaper Updates**: Fetches new photos from API at configurable intervals
- 💾 **Photo Management**: Keeps the last 15 photos locally for slideshow capability
- 🎯 **System Tray Integration**: Runs minimized with easy access via system tray icon
- ⚙️ **Configurable**: Easy JSON configuration for API URL and update frequency
- 🔄 **Start/Stop Control**: Control slideshow from system tray menu
- 🏠 **Default Restore**: Automatically restores Windows default wallpaper on shutdown
- 🚀 **Auto-Start**: Optional startup on Windows login

## Installation

### Prerequisites

- Windows 10 or later
- PowerShell 5.1 or later
- Eyedeea Photos server running (default: http://localhost:3000)

### Quick Install

1. Open PowerShell as Administrator
2. Navigate to the desktop app folder:
   ```powershell
   cd c:\Work\EyedeeaPhotos\apps\desktop
   ```

3. Run the installer:
   ```powershell
   .\install.ps1
   ```

4. The installer will:
   - Create a startup shortcut
   - Offer to start the app immediately
   - Configure auto-start on login

## Configuration

Edit `config.json` to customize settings:

```json
{
  "apiUrl": "http://localhost:3000/api/view",
  "updateIntervalMinutes": 1,
  "autoStart": true,
  "maxPhotos": 15
}
```

### Configuration Options

- **apiUrl**: The API endpoint to fetch photos from (default: `http://localhost:3000/api/view`)
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

## File Structure

```
apps/desktop/
├── WallpaperApp.ps1      # Main application script
├── config.json           # Configuration file
├── install.ps1           # Installation/uninstallation script
├── README.md             # This file
├── icon.ico              # (Optional) Custom tray icon
└── wallpapers/           # Downloaded photos (auto-created)
```

## How It Works

1. **Timer-based Fetching**: The app uses a Windows Forms Timer to check for new photos at the configured interval
2. **API Integration**: Calls the `/api/view` endpoint which returns a photo (refreshed every 60 minutes on the server)
3. **Local Storage**: Downloads photos with timestamp filenames to the `wallpapers` folder
4. **Wallpaper Setting**: Uses Windows API (`SystemParametersInfo`) to set the wallpaper
5. **Cleanup**: Automatically removes old photos, keeping only the most recent 15
6. **Graceful Shutdown**: Restores the original Windows wallpaper when shut down via the menu

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

## Uninstallation

To uninstall the app:

```powershell
.\install.ps1 -Uninstall
```

This will:
- Remove the startup shortcut
- Stop any running instances
- Preserve downloaded photos (delete manually if needed)

## Future Enhancements

- Windows Spotlight-style slideshow with transitions
- Multiple photo sources
- Custom tray icon
- Photo ratings and favorites
- Schedule-based intervals (different times of day)
- Multi-monitor support

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
