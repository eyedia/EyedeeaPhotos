# Eyedeea Photos - API Documentation

**Eyedeea Photos** is an app designed to bring forgotten memories back to life. It integrates with Synology Photos & any USB, HDD, SDD to display random photos from your collection.

## Table of Contents

- [Quick Start](#quick-start)
- [Base Configuration](#base-configuration)
- [API Endpoints Overview](#api-endpoints-overview)
- [Detailed Endpoints](#detailed-endpoints)
  - [View Endpoints](#view-endpoints)
  - [Sources Endpoints](#sources-endpoints)
  - [Scan Endpoints](#scan-endpoints)
  - [Browse Endpoints](#browse-endpoints)
  - [Drives Endpoints](#drives-endpoints)
  - [System Endpoints](#system-endpoints)
  - [Version Endpoints](#version-endpoints)
- [Error Handling](#error-handling)
- [Interactive Testing](#interactive-testing)

---

## Quick Start

### Access Swagger UI
The easiest way to explore and test all APIs is through our **interactive Swagger UI**:

```
🌐 http://localhost:8080/api/docs
```

From there you can:
- View all 33 endpoints
- See request/response schemas
- Test endpoints directly with "Try it out"
- Download API spec as JSON/YAML

### Using cURL
```bash
# Get a random photo
curl http://localhost:8080/api/view

# List all photo sources
curl http://localhost:8080/api/sources

# Search for photos globally
curl "http://localhost:8080/api/system/search?keywords=vacation"
```

---

## Base Configuration

| Property | Value |
|----------|-------|
| **Base URL** | `http://localhost:8080/api` |
| **Default Port** | `8080` |
| **Content-Type** | `application/json` |
| **Response Format** | JSON (except images) |
| **Total Endpoints** | 33 |

---

## API Endpoints Overview

| Category | Count | Purpose |
|----------|-------|---------|
| 📸 [View](#view-endpoints) | 11 | Photo viewing, filtering, and tagging |
| 📁 [Sources](#sources-endpoints) | 7 | Manage photo sources (USB, HDD, Synology) |
| 🔍 [Scan](#scan-endpoints) | 4 | Scan sources for photos and updates |
| 🗂️ [Browse](#browse-endpoints) | 8 | Navigate folder structure & metadata |
| 💾 [Drives](#drives-endpoints) | 4 | List and validate storage drives |
| ⚙️ [System](#system-endpoints) | 4 | System status, search, and logging |
| 📌 [Version](#version-endpoints) | 2 | Version information and updates |
| **TOTAL** | **33** | |

---

## Detailed Endpoints

### View Endpoints

Manage photo viewing, filtering, and user preferences.

#### GET `/view`
Get a random photo from the collection.

```bash
curl http://localhost:8080/api/view
```

**Response (200):**
```json
{
  "id": 1,
  "filename": "photo.jpg",
  "path": "/path/to/photo.jpg",
  "timestamp": "2023-06-15T10:30:00Z"
}
```

---

#### GET `/view/config`
Get viewer configuration and settings.

```bash
curl http://localhost:8080/api/view/config
```

**Response (200):**
```json
{
  "autoPlay": true,
  "interval": 5,
  "shuffle": true,
  "defaultFilter": 1
}
```

---

#### GET `/view/photos`
Get paginated list of all photos.

```bash
curl "http://localhost:8080/api/view/photos?limit=20&offset=0"
```

**Response (200):**
```json
{
  "total": 5000,
  "limit": 20,
  "offset": 0,
  "photos": [
    { "id": 1, "filename": "photo1.jpg", "date": "2023-06-15" },
    { "id": 2, "filename": "photo2.jpg", "date": "2023-06-16" }
  ]
}
```

---

#### GET `/view/photos/{photo_id}`
Get details for a specific photo.

```bash
curl http://localhost:8080/api/view/photos/1
```

**Response (200):**
```json
{
  "id": 1,
  "filename": "vacation.jpg",
  "path": "/sources/usb-drive/vacation.jpg",
  "size": 2048576,
  "timestamp": "2023-06-15T10:30:00Z",
  "tags": ["vacation", "beach"]
}
```

**Response (404):** Photo not found

---

#### DELETE `/view/photos/{photo_id}`
Delete a specific photo.

```bash
curl -X DELETE http://localhost:8080/api/view/photos/1
```

**Response (200):**
```json
{ "message": "Photo deleted successfully" }
```

---

#### POST `/view/{photo_id}/dns`
Add a DNS (Do Not Show) tag to a photo.

```bash
curl -X POST http://localhost:8080/api/view/1/dns
```

**Response (200):**
```json
{ "message": "DNS tag added" }
```

---

#### POST `/view/{photo_id}/mark`
Add a Mark tag to a photo (mark as favorite).

```bash
curl -X POST http://localhost:8080/api/view/1/mark
```

**Response (200):**
```json
{ "message": "Mark tag added" }
```

---

#### GET `/view/filters`
List all view filters.

```bash
curl http://localhost:8080/api/view/filters
```

**Response (200):**
```json
[
  { "id": 1, "name": "All Photos", "isDefault": true },
  { "id": 2, "name": "Vacation 2023", "query": { "tags": ["vacation"] } }
]
```

---

#### POST `/view/filters`
Create a new view filter.

```bash
curl -X POST http://localhost:8080/api/view/filters \
  -H "Content-Type: application/json" \
  -d '{"name": "Summer Photos", "query": {"tags": ["summer"]}}'
```

**Response (201):**
```json
{ "id": 3, "name": "Summer Photos", "created": true }
```

---

#### GET `/view/filters/{id}`
Get a specific filter.

```bash
curl http://localhost:8080/api/view/filters/2
```

**Response (200):**
```json
{ "id": 2, "name": "Vacation 2023", "query": { "tags": ["vacation"] } }
```

---

#### DELETE `/view/filters/{id}`
Delete a filter.

```bash
curl -X DELETE http://localhost:8080/api/view/filters/2
```

**Response (200):**
```json
{ "message": "Filter deleted" }
```

---

#### POST `/view/filters/active`
Set default filter.

```bash
curl -X POST http://localhost:8080/api/view/filters/active \
  -H "Content-Type: application/json" \
  -d '{"filterId": 1}'
```

**Response (200):**
```json
{ "message": "Default filter set" }
```

---

#### POST `/view/filters/{id}/active`
Activate a filter.

```bash
curl -X POST http://localhost:8080/api/view/filters/2/active
```

**Response (200):**
```json
{ "message": "Filter activated" }
```

---

### Sources Endpoints

Manage photo sources (USB drives, hard drives, Synology systems, etc.).

#### GET `/sources`
List all configured photo sources.

```bash
curl http://localhost:8080/api/sources
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "USB Drive",
    "type": "filesystem",
    "path": "/mnt/usb",
    "enabled": true
  },
  {
    "id": 2,
    "name": "Synology NAS",
    "type": "synology",
    "host": "192.168.1.100",
    "enabled": true
  }
]
```

---

#### POST `/sources`
Create a new photo source.

```bash
curl -X POST http://localhost:8080/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External HDD",
    "type": "filesystem",
    "path": "/mnt/external-hdd"
  }'
```

**Response (201):**
```json
{
  "id": 3,
  "name": "External HDD",
  "type": "filesystem",
  "path": "/mnt/external-hdd",
  "created": true
}
```

---

#### GET `/sources/{id}`
Get details for a specific source.

```bash
curl http://localhost:8080/api/sources/1
```

**Response (200):**
```json
{
  "id": 1,
  "name": "USB Drive",
  "type": "filesystem",
  "path": "/mnt/usb",
  "enabled": true,
  "lastScan": "2025-12-19T10:30:00Z",
  "photoCount": 1250
}
```

---

#### DELETE `/sources/{id}`
Delete a photo source.

```bash
curl -X DELETE http://localhost:8080/api/sources/1
```

**Response (200):**
```json
{ "message": "Source deleted successfully" }
```

---

#### GET `/sources/{id}/dirs`
Get directory structure of a source.

```bash
curl http://localhost:8080/api/sources/1/dirs
```

**Response (200):**
```json
{
  "directories": [
    { "id": 1, "name": "Vacation 2023", "photoCount": 250 },
    { "id": 2, "name": "Family Events", "photoCount": 500 }
  ]
}
```

---

#### GET `/sources/{id}/dirs/{dir_id}`
Get photos in a specific directory.

```bash
curl http://localhost:8080/api/sources/1/dirs/1
```

**Response (200):**
```json
{
  "directory": "Vacation 2023",
  "photoCount": 250,
  "photos": [
    { "id": 101, "filename": "beach.jpg" },
    { "id": 102, "filename": "sunset.jpg" }
  ]
}
```

---

#### POST `/sources/{id}/purge`
Purge references to photos that no longer exist in source.

```bash
curl -X POST http://localhost:8080/api/sources/1/purge
```

**Response (200):**
```json
{ "message": "Purge completed", "removedCount": 25 }
```

---

### Scan Endpoints

Scan photo sources for new or updated photos.

#### POST `/sources/{id}/scan`
Start scanning a source for photos.

```bash
curl -X POST http://localhost:8080/api/sources/1/scan
```

**Response (200):**
```json
{ "message": "Scan started", "scanId": "scan_123abc" }
```

**Response (503):** Scan already in progress

---

#### GET `/sources/{id}/scan`
Check the status of a scan operation.

```bash
curl http://localhost:8080/api/sources/1/scan
```

**Response (200):**
```json
{
  "status": "running",
  "progress": 45,
  "photosFound": 1250,
  "photosAdded": 150,
  "startTime": "2025-12-19T10:00:00Z"
}
```

---

#### GET `/sources/{id}/scan/logs`
Get scan log entries for a source.

```bash
curl http://localhost:8080/api/sources/1/scan/logs
```

**Response (200):**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-12-19T10:30:00Z",
      "message": "Scan completed",
      "photosAdded": 150,
      "photosUpdated": 25
    }
  ]
}
```

---

#### GET `/sources/{id}/scan/logs/{view_log_id}`
Get a specific scan log entry.

```bash
curl http://localhost:8080/api/sources/1/scan/logs/1
```

**Response (200):**
```json
{
  "id": 1,
  "timestamp": "2025-12-19T10:30:00Z",
  "message": "Scan completed",
  "details": {
    "photosAdded": 150,
    "photosUpdated": 25,
    "duration": "2 minutes 45 seconds"
  }
}
```

---

### Browse Endpoints

Navigate folder structures and retrieve photo metadata.

#### GET `/sources/{id}/browse`
Browse root folders of a source.

```bash
curl http://localhost:8080/api/sources/1/browse
```

**Response (200):**
```json
{
  "folders": [
    { "id": 1, "name": "2023", "subfolderCount": 12 },
    { "id": 2, "name": "2022", "subfolderCount": 12 }
  ]
}
```

---

#### GET `/sources/{id}/browse/persons`
Get list of persons detected in photos (requires face detection).

```bash
curl http://localhost:8080/api/sources/1/browse/persons
```

**Response (200):**
```json
{
  "persons": [
    { "id": 1, "name": "Unknown", "photoCount": 250 },
    { "id": 2, "name": "Person 2", "photoCount": 120 }
  ]
}
```

---

#### GET `/sources/{id}/browse/{folder_id}`
Get sub-folders of a folder.

```bash
curl http://localhost:8080/api/sources/1/browse/1
```

**Response (200):**
```json
{
  "folderName": "2023",
  "subfolders": [
    { "id": 10, "name": "January", "photoCount": 45 },
    { "id": 11, "name": "February", "photoCount": 52 }
  ]
}
```

---

#### GET `/sources/{id}/browse/{folder_id}/items`
Get items (photos/files) in a folder.

```bash
curl http://localhost:8080/api/sources/1/browse/10/items
```

**Response (200):**
```json
{
  "folder": "2023/January",
  "items": [
    { "id": 101, "filename": "IMG_0001.jpg", "type": "photo", "size": 2048576 },
    { "id": 102, "filename": "IMG_0002.jpg", "type": "photo", "size": 2097152 }
  ]
}
```

---

#### GET `/sources/{id}/browse/stats`
Get statistics about a source.

```bash
curl http://localhost:8080/api/sources/1/browse/stats
```

**Response (200):**
```json
{
  "totalPhotos": 2500,
  "totalSize": "5.2 GB",
  "dateRange": { "earliest": "2015-01-01", "latest": "2025-12-19" },
  "folderCount": 150,
  "lastScanned": "2025-12-19T10:30:00Z"
}
```

---

### Drives Endpoints

Manage storage drives and paths.

#### GET `/drives`
List all available drives.

```bash
curl http://localhost:8080/api/drives
```

**Response (200):**
```json
{
  "drives": [
    { "letter": "C:", "name": "System", "size": "256 GB", "free": "128 GB" },
    { "letter": "D:", "name": "External", "size": "2 TB", "free": "1.5 TB" }
  ]
}
```

---

#### GET `/drives/directories`
Get directory structure (hierarchical view).

**Query Parameters:**
- `path` (required): Path to list

```bash
curl "http://localhost:8080/api/drives/directories?path=D:/"
```

**Response (200):**
```json
{
  "path": "D:/",
  "directories": [
    { "name": "Photos", "modified": "2025-12-19" },
    { "name": "Videos", "modified": "2025-12-18" }
  ]
}
```

---

#### GET `/drives/directories/flat`
Get flat list of all directories in a path.

**Query Parameters:**
- `path` (required): Path to list

```bash
curl "http://localhost:8080/api/drives/directories/flat?path=D:/"
```

**Response (200):**
```json
{
  "path": "D:/",
  "directories": [
    "D:/Photos",
    "D:/Photos/Vacation 2023",
    "D:/Photos/Family Events",
    "D:/Videos"
  ]
}
```

---

#### POST `/drives/validate`
Validate if a path is accessible and readable.

```bash
curl -X POST http://localhost:8080/api/drives/validate \
  -H "Content-Type: application/json" \
  -d '{"path": "D:/Photos"}'
```

**Response (200):**
```json
{ "valid": true, "readable": true, "path": "D:/Photos" }
```

**Response (400):**
```json
{ "valid": false, "error": "Path does not exist" }
```

---

### System Endpoints

System-level operations and monitoring.

#### GET `/system`
Get system summary (total photos, sources, disk usage).

```bash
curl http://localhost:8080/api/system
```

**Response (200):**
```json
{
  "totalPhotos": 5000,
  "totalSources": 3,
  "totalSize": "8.5 GB",
  "activeScans": 0,
  "uptime": "2 days 5 hours"
}
```

---

#### GET `/system/search`
Global search across all photos by keywords or metadata.

**Query Parameters:**
- `keywords` (required): Search terms

```bash
curl "http://localhost:8080/api/system/search?keywords=vacation%20beach"
```

**Response (200):**
```json
{
  "query": "vacation beach",
  "results": [
    { "id": 1, "filename": "beach_vacation.jpg", "source": "USB Drive", "relevance": 0.95 },
    { "id": 2, "filename": "summer_vacation.jpg", "source": "External HDD", "relevance": 0.85 }
  ]
}
```

---

#### GET `/system/status`
Get application health and status.

```bash
curl http://localhost:8080/api/system/status
```

**Response (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2025.12.15.04",
  "timestamp": "2025-12-19T10:30:00Z"
}
```

---

#### GET `/system/logs`
Get system activity logs.

```bash
curl http://localhost:8080/api/system/logs
```

**Response (200):** Plain text log file
```
[2025-12-19 10:30:00] INFO: Scan started for source: USB Drive
[2025-12-19 10:35:45] INFO: Scan completed - 150 photos added
[2025-12-19 10:40:00] INFO: Database cleanup completed
```

---

### Version Endpoints

Version information and update checking.

#### GET `/version`
Get current application version.

```bash
curl http://localhost:8080/api/version
```

**Response (200):**
```json
{
  "version": "2025.12.15.04",
  "name": "eyedeeaphotos",
  "description": "Eyedeea Photos is an app designed to bring forgotten memories back to life"
}
```

---

#### GET `/version/check-updates`
Check for available updates.

```bash
curl http://localhost:8080/api/version/check-updates
```

**Response (200):**
```json
{
  "currentVersion": "2025.12.15.04",
  "latestVersion": "2025.12.19.01",
  "updateAvailable": true,
  "releaseNotes": "Bug fixes and performance improvements"
}
```

---

## Error Handling

All endpoints return standardized error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid parameter: id must be an integer"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested endpoint or resource does not exist"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Interactive Testing

### Option 1: Swagger UI (Recommended)
The most user-friendly way to test APIs:

```
🌐 http://localhost:8080/api/docs
```

Features:
- ✅ Browse all endpoints
- ✅ See request/response examples
- ✅ Test endpoints with "Try it out"
- ✅ View response codes and descriptions

### Option 2: Command Line (cURL)
```bash
# List all sources
curl http://localhost:8080/api/sources

# Create a filter
curl -X POST http://localhost:8080/api/view/filters \
  -H "Content-Type: application/json" \
  -d '{"name": "My Filter"}'

# Search photos
curl "http://localhost:8080/api/system/search?keywords=vacation"
```

### Option 3: HTTP Client Tools
- **Postman** - Import [swagger.json](server/swagger.json)
- **Insomnia** - Import [swagger.json](server/swagger.json)
- **VS Code REST Client** - Use REST file with requests

---

## API Statistics

- **Total Endpoints:** 33
- **HTTP Methods:** GET (20), POST (10), DELETE (3)
- **Response Formats:** JSON, Images, Plain Text
- **Tags/Categories:** 7
- **Documented:** 100%

---

## Getting Help

- 📖 Read [API_DOCUMENTATION.md](API_DOCUMENTATION.md) (this file)
- 🔍 Visit Swagger UI: http://localhost:8080/api/docs
- 📝 Check [CONTRIBUTING.md](CONTRIBUTING.md) for API development guidelines
- 📋 Review [CHANGELOG.md](CHANGELOG.md) for API changes

---

**Last Updated:** December 19, 2025  
**API Version:** 1.0.0  
**Status:** Production Ready
