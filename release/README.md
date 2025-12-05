# Release Management

This directory contains scripts and tools for managing EyedeeaPhotos releases and deployments.

## Overview

The release management system provides:
- **Automated version management** with semantic versioning
- **Release automation** with git tagging and npm publishing
- **Auto-update mechanism** for deployed instances
- **Cross-platform scheduled tasks** (Linux cron, Windows Task Scheduler)
- **CI/CD pipeline** via GitHub Actions
- **Version API** for displaying current version in the UI

## Files

### Scripts

- **release.mjs** - Interactive release workflow script
- **auto-update.mjs** - Automated update checker and installer
- **setup-cron.sh** - Linux cron job installer
- **setup-task.ps1** - Windows Task Scheduler installer

### Configuration

- **ecosystem.config.js** - PM2 configuration for process management
- **install.sh** - Linux installation script
- **install.ps1** - Windows installation script
- **000-default.conf** - Apache configuration example

## Release Workflow

### Prerequisites

1. Ensure you have npm publish permissions
2. Configure GitHub secrets (NPM_TOKEN) for automated publishing
3. All tests must pass
4. Git working directory must be clean

### Creating a Release

Run the interactive release script:

```bash
npm run release
```

The script will:
1. Prompt for release type (patch/minor/major)
2. Ask if you want to update dependencies
3. Run tests to ensure code quality
4. Bump version in package.json
5. Generate changelog from git commits
6. Create git commit and tag
7. Publish to npm registry
8. Push changes and tags to GitHub

### Release Types

- **patch** (1.0.x) - Bug fixes and minor changes
- **minor** (1.x.0) - New features, backward compatible
- **major** (x.0.0) - Breaking changes

### Manual Steps

You can also perform release steps manually:

```bash
# Bump version
npm version patch  # or minor, major

# Generate tag (automatically done by npm version)
git tag -a v1.0.1 -m "Release v1.0.1"

# Publish to npm
npm publish

# Push to GitHub
git push origin main --tags
```

## Auto-Update System

### How It Works

1. Scheduled task runs `auto-update.mjs` on a regular schedule
2. Script checks npm registry for latest version
3. Compares current version with latest using semantic versioning
4. If update available, downloads and installs via `npm install -g`
5. Attempts to restart the service (PM2 or systemd)
6. Logs all activity to `logs/auto-update.log`

### Lock Mechanism

- Lock file (`logs/update.lock`) prevents concurrent updates
- Stale lock timeout: 30 minutes
- Safe for cron jobs running frequently

### Manual Update Check

Run the auto-update script manually:

```bash
npm run check-updates
```

This will check for updates and install if available, without needing to wait for the scheduled task.

### Setting Up Scheduled Updates

#### Linux (Cron Job)

Run the setup script:

```bash
cd release
bash setup-cron.sh
```

Choose frequency:
- Daily (3 AM)
- Weekly (Sunday 3 AM)
- Twice monthly (1st and 15th at 3 AM)
- Custom (specify your own cron expression)

#### Windows (Task Scheduler)

Run the PowerShell script as Administrator:

```powershell
cd release
powershell -ExecutionPolicy Bypass -File setup-task.ps1
```

Choose frequency:
- Daily (3 AM)
- Weekly (Sunday 3 AM)
- Twice monthly (1st and 15th at 3 AM)
- Custom (specify your own schedule)

### Logs

All auto-update activity is logged to:
```
logs/auto-update.log
```

Check this file if updates fail or to verify update history.

## GitHub Actions CI/CD

### Workflow

The `.github/workflows/release.yml` workflow automatically:
1. Runs tests and linting on tag push
2. Publishes to npm registry
3. Creates GitHub release with changelog

### Trigger

Workflow triggers on tags matching pattern `v*` (e.g., v1.0.0, v2.1.3)

### Required Secrets

Add to GitHub repository settings:
- **NPM_TOKEN** - npm authentication token for publishing

To create npm token:
```bash
npm login
npm token create
```

## Version API

### Endpoints

**GET /api/version**
- Returns current version from package.json
- Response: `{ version, name, description }`

**GET /api/version/check-updates**
- Checks npm registry for newer version
- Response: `{ currentVersion, latestVersion, updateAvailable, releaseDate }`

### UI Integration

The version is automatically displayed in the footer of the management interface:
- Shows current version (e.g., "v1.2.3")
- Displays "Update available!" badge if newer version exists
- Badge is clickable to refresh update check

## Service Restart

After updates, the script attempts to restart the service using:

1. **PM2** - `pm2 restart eyedeea-photos`
2. **systemd** - `systemctl restart eyedeea-photos`
3. **Manual** - If both fail, requires manual restart

### PM2 Configuration

If using PM2, ensure ecosystem.config.js is configured:

```javascript
module.exports = {
  apps: [{
    name: 'eyedeea-photos',
    script: './app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Troubleshooting

### Update Not Installing

1. Check `logs/auto-update.log` for errors
2. Verify npm registry is accessible
3. Check file permissions on package directories
4. Ensure lock file (`logs/update.lock`) is not stale

### Service Not Restarting

1. Check if PM2 is running: `pm2 status`
2. Check systemd service: `systemctl status eyedeea-photos`
3. Manually restart after update
4. Review restart permissions

### Version Not Displaying in UI

1. Check browser console for fetch errors
2. Verify `/api/version` endpoint is accessible
3. Check network tab for API responses
4. Clear browser cache and reload

### Release Script Fails

1. Ensure git working directory is clean
2. Verify tests pass: `npm test`
3. Check npm authentication: `npm whoami`
4. Verify GitHub remote is configured

## Best Practices

1. **Test before releasing** - Always run tests locally
2. **Review changelog** - Check generated changelog before confirming
3. **Monitor first deployment** - Watch logs after first auto-update setup
4. **Document breaking changes** - Use meaningful commit messages
5. **Keep dependencies updated** - Regularly check for dependency updates
6. **Backup before major updates** - Create backups before major version changes

## Version Numbering

Follow semantic versioning (semver):
- **Major** (x.0.0) - Breaking changes, incompatible API changes
- **Minor** (1.x.0) - New features, backward compatible
- **Patch** (1.0.x) - Bug fixes, backward compatible

Examples:
- Fix bug: 1.0.0 → 1.0.1
- Add feature: 1.0.0 → 1.1.0
- Breaking change: 1.0.0 → 2.0.0

## Support

For issues or questions:
- Check GitHub issues
- Review logs in `logs/auto-update.log`
- Verify npm package is published
- Check GitHub Actions workflow status
