# Deployment Guide for Eyedeea Photos Desktop Wallpaper

## For Users (Quick Start)

### Option 1: One-Line Bootstrap Install

1. Open PowerShell
2. Run this command (replace URL with actual location of bootstrap.ps1):

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/bootstrap.ps1" -OutFile "$env:TEMP\eyedeea-bootstrap.ps1"; & "$env:TEMP\eyedeea-bootstrap.ps1"
```

That's it! The bootstrap will:
- Download all required files from GitHub
- Install to `%LOCALAPPDATA%\EyediaTech\EyedeeaPhotos\app_desktop`
- Create shortcuts (Start Menu + Startup)
- Start the app in background

### Option 2: Download and Run

1. Download `bootstrap.ps1` from GitHub
2. Right-click → "Run with PowerShell"
3. Follow the prompts

### First Run Configuration

After installation:
1. Look for the Eyedeea icon in your system tray (bottom-right of screen)
2. Right-click the icon → "Server Config"
3. Enter your Eyedeea Photos server URL (e.g., `http://192.168.86.102:8080`)
4. Click "Save" to test connection
5. Right-click again → "Start Slideshow"

---

## For Developers (GitHub Setup)

### Preparing for GitHub Release

Ensure these files are in the `apps/desktop/` folder of your repository:

```
apps/desktop/
├── bootstrap.ps1        # Bootstrap installer
├── WallpaperApp.ps1     # Main application
├── config.json          # Default configuration
├── install.ps1          # Local installer
├── README.md            # User documentation
└── DEPLOYMENT.md        # This file
```

### GitHub Repository Structure

The bootstrap installer expects files at:
```
https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/
```

Make sure these files are committed to the `main` branch.

### Testing Bootstrap Installer

Before distributing, test the bootstrap:

1. **Test Download**:
   ```powershell
   $url = "https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/WallpaperApp.ps1"
   Invoke-WebRequest -Uri $url -Method Head
   ```

2. **Test Full Installation**:
   ```powershell
   # Download bootstrap to temp
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/bootstrap.ps1" -OutFile "$env:TEMP\test-bootstrap.ps1"
   
   # Run it
   & "$env:TEMP\test-bootstrap.ps1"
   ```

3. **Verify Installation**:
   - Check files exist in `%LOCALAPPDATA%\EyediaTech\EyedeeaPhotos\app_desktop`
   - Check Start Menu shortcut exists
   - Check app is running in system tray
   - Test Server Config dialog
   - Test photo fetching

### Creating a Release

1. **Tag the release**:
   ```bash
   git tag -a desktop-v1.0 -m "Desktop Wallpaper App v1.0"
   git push origin desktop-v1.0
   ```

2. **Create GitHub Release**:
   - Go to GitHub → Releases → "Create a new release"
   - Select the tag `desktop-v1.0`
   - Title: "Desktop Wallpaper App v1.0"
   - Description: Include features, installation instructions, changelog
   - Attach `bootstrap.ps1` as a release asset (optional - users can also run directly from raw URL)

3. **Update Documentation**:
   - Add installation instructions to main README.md
   - Include screenshots if available
   - List system requirements

---

## Distribution Options

### Option 1: Direct GitHub Raw URL (Recommended)

Easiest for users - single PowerShell command:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/bootstrap.ps1" -OutFile "$env:TEMP\eyedeea-bootstrap.ps1"; & "$env:TEMP\eyedeea-bootstrap.ps1"
```

**Pros**: No manual downloads, always gets latest version
**Cons**: Requires internet connection, users may be wary of direct execution

### Option 2: Release Assets

Users download `bootstrap.ps1` from GitHub Releases:

1. Go to: https://github.com/eyedia/EyedeeaPhotos/releases
2. Download `bootstrap.ps1` from the latest release
3. Run: `powershell -ExecutionPolicy Bypass -File bootstrap.ps1`

**Pros**: More explicit, users see what they're downloading
**Cons**: Extra steps, may download outdated version

### Option 3: Website/Documentation

Add installation section to your website/docs:

```markdown
## Download Desktop App

[Download Installer](https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/main/apps/desktop/bootstrap.ps1)

After downloading, run:
```powershell
powershell -ExecutionPolicy Bypass -File bootstrap.ps1
```
```

---

## Updating the App

### For Users

Re-run the bootstrap installer:
```powershell
powershell -ExecutionPolicy Bypass -File bootstrap.ps1
```

It will download and overwrite with the latest version from GitHub.

### For Developers

1. Commit changes to `main` branch
2. Test the bootstrap installer
3. Users who re-run bootstrap will get updates automatically
4. Consider adding version checking in future releases

---

## Default Configuration

The `config.json` has these defaults:

```json
{
  "serverUrl": "http://192.168.86.102:8080",
  "updateIntervalMinutes": 1,
  "autoStart": true,
  "maxPhotos": 15
}
```

**Note**: Users should configure their actual server URL via the Server Config dialog after installation.

---

## Troubleshooting Common Issues

### PowerShell Execution Policy

If users get "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try again.

### TLS/SSL Errors

If bootstrap fails with SSL/TLS error:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
```

This is included in bootstrap.ps1, but older systems may need manual configuration.

### GitHub Rate Limiting

GitHub API has rate limits. If users hit limits:
- Wait 1 hour for reset
- Use release assets instead of raw URLs
- Consider self-hosting the installer files

---

## Advanced: Self-Hosted Deployment

To host installer files on your own server:

1. Update `bootstrap.ps1` line 10:
   ```powershell
   $GithubBaseUrl = "https://your-server.com/path/to/files"
   ```

2. Upload all files to your web server
3. Ensure files are publicly accessible
4. Update documentation with new URL

---

## Security Considerations

1. **Code Signing**: Consider signing PowerShell scripts for enhanced trust
2. **HTTPS**: Always use HTTPS URLs for downloads
3. **Checksum Verification**: Add file integrity checks in future versions
4. **Minimal Permissions**: App runs in user context, no admin required

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/eyedia/EyedeeaPhotos/issues
- Documentation: See README.md

---

## Version History

### v1.0 (Current)
- Initial release
- Bootstrap installer
- Server configuration UI
- Network error handling
- Auto-resize to desktop resolution
- System tray integration
- Start Menu shortcuts
