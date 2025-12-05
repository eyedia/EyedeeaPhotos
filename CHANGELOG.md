# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Version API**: New `/api/version` endpoint to retrieve current application version
- **Update Check API**: New `/api/version/check-updates` endpoint to check for available updates from npm registry
- **Auto-Update System**: Automated update checking and installation script with lock mechanism
- **Release Management**: Interactive release script for version bumping, changelog generation, and npm publishing
- **Cross-Platform Scheduled Updates**: 
  - Linux cron job setup script (`setup-cron.sh`)
  - Windows Task Scheduler setup script (`setup-task.ps1`)
- **GitHub Actions CI/CD**: Automated testing, publishing, and release creation on tag push
- **Version Display**: UI footer now displays current version with update notification badge
- **Database Migration System**: Automatic migration execution on application startup
- **Migration Tools**: 
  - Migration manager for executing SQL migrations
  - Migration creation script for generating new migration files
- **Delete Source Feature**: Ability to delete photo sources with confirmation dialog
- **Comprehensive Documentation**: Release management guide in `release/README.md`

### Changed
- Updated source summary query to exclude deleted sources (`is_deleted = 0` filter)
- Enhanced UI with version information display in management interface footer
- Improved source management with single-selection radio buttons

### Fixed
- Fixed checkbox visibility issue in source selection
- Fixed source list refresh after deletion
- Corrected async function declaration in release script

### Security
- Added lock file mechanism to prevent concurrent auto-updates
- Stale lock detection with 30-minute timeout

## [1.0.1] - 2024-XX-XX

### Previous Release
- Initial stable release with photo scanning and playback features
- Synology Photos API integration
- File system scanning support
- Random photo playback
- Metadata extraction (date, geolocation, tags)
- SQLite database storage
- PM2 process management support

---

## Guidelines for Future Releases

### Version Numbering
- **Major** (x.0.0): Breaking changes, incompatible API changes
- **Minor** (1.x.0): New features, backward compatible
- **Patch** (1.0.x): Bug fixes, backward compatible

### Changelog Sections
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

### Release Process
1. Update this CHANGELOG.md with all changes since last release
2. Run `npm run release [patch|minor|major]`
3. Review and confirm the generated changelog
4. Script will automatically commit, tag, and publish
5. GitHub Actions will create the release and publish to npm
