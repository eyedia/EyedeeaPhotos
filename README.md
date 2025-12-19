[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eyedia_EyedeeaPhotos&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=eyedia_EyedeeaPhotos) ![CodeQL](https://github.com/eyedia/eyedeeaphotos/actions/workflows/codeql.yml/badge.svg) ![Build](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/build.yml/badge.svg) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/eyedia/EyedeeaPhotos) ![GitHub repo size](https://img.shields.io/github/repo-size/eyedia/EyedeeaPhotos)
[![Node.js Package](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/npm-publish.yml)

# Eyedeea Photos — Rediscover Your Photos

Eyedeea Photos is a lightweight photo explorer that helps you rediscover and enjoy the pictures you already store on your own drives (Synology Photos, USB/HDD/SSD). It is not a storage provider — you keep full control of your files; Eyedeea simply scans, shows, and helps you curate.

## At a Glance
- Explore, not store: works with your existing folders or Synology Photos
- Simple slideshow on TV, desktop, web, and mobile
- Shows title, date/place, and filename to aid curation
- Optional filters and search (when configured)
- Free and open source; actively maintained with frequent releases

Quick links: [Skip to Downloads](#download-eyedeea-photos) • [Releases](https://github.com/eyedia/EyedeeaPhotos/releases) • [NPM](https://www.npmjs.com/package/eyedeeaphotos)

## The Problem: Viewing and Sharing My Photos
Storing photos efficiently is great, but what's the use if we can't easily view and share them? I don’t want to just send folders of images via email—I want a seamless way to rediscover and showcase my memories.

## The Solution: Eyedeea Photos
![Eyedeea Photos](graphics/eyedeea_two_logos.png)

**Eyedeea Photos** is an app designed to bring forgotten memories back to life. It integrates with **Synology Photos** and any USB, HDD, or SSD to display random photos from your collection. Here’s how it works:
- **Scan:** Interacts with **Synology Photos API** or the **file system** to extract metadata (filename, path, date taken, geolocation, album name, etc.).
- **Show:** Displays random photos across devices.

I recommend to run it on a **Raspberry Pi** within your home network, making photos easily accessible on TVs, laptops, and mobile devices. However, it's a lightweight website (~125MB) that can be deployed on any laptop or desktop.

## Eyedeea Photos:
Photos are displayed with the following details:
- **Title:** Smartly formatted directory name.
- **Subtitle:** Date taken and geolocation formatted as [Place, Country], if available.
- **Sub-subtitle:** Name of the file.


![Eyedeea Photos Demo](graphics/eyedeea_photos_demo_720p.gif)

## Technical Details:
- **Written in Node.js**, with a **Synology Photo API wrapper** that scans the photo repository and extracts metadata into a flattened structure.
- **Storage-agnostic:** Currently it supports two sources: (1) Synology Photos and (2) File System like USB, HDD. But it can easily extended to support other cloud providers like Google and Amazon Photos.

## Feature Summary:
| Feature | Details | Technology | Status |
|---------|---------|------------|--------|
| **Eyedeea Photos Player** | Scan photos, random playback, filtered playback, search, configurable scan times, display duration, and logs. Read metadata (tags, taken-on date, geolocation) | Node.js, SQLite, PM2, Apache | Beta Testing |
| **Eyedeea Photos Management** | An user interface to set up sources, configure filtered playback, search, configure scan time, statistics, view logs. Read metadata (tags, taken-on date, geolocation).<br> Targeting for 2025 summer. Experts can use Postman and call Eyedeea Photos API to perform all these operations | Node.js, HTML, CSS | Incubation |
| **MetaFix** | Update metadata (tags, taken-on date, geolocation) | Node JS, Python, ExifTool | Requested |
| **Duplicate Identification** | Detect and mark duplicate photos | Python | Requested |
| **Out-of-Focus Detection** | Identify and mark blurry photos | Python | Requested |

## Scope and Considerations:
- **Not a photo management app:** Users must handle organization, metadata updates, and deletions themselves.
- **No warranty:** Users assume full responsibility for any issues.
- **Built for home networks:** No authentication system is currently implemented.
- **Primary focus is display:** Users must collect and arrange photos beforehand.

## Current State:
- **MVP deployed on Raspberry Pi 5**, regularly used on two **Amazon FireStick** devices via the **Silk Browser**. FireStick sleep timeout disabled using ADBLink.
- **Personal Results:**
  - **42,000 photos identified**, **12,000 duplicates removed**
  - Corrected multiple album names (**inferred from folder names, with formatting improvements**)
  - **Scanning 30,000 photos from Synology takes ~6 minutes**. The same number from file system takes about ~3 minutes.
- **Family Impact:**
  - Enjoy random memories resurfacing.
  - Easily spot incorrect albums and duplicates.
  - Discover surprising, long-forgotten moments.

## Eyedeea Photos Diagram:
![Eyedeea Photos Diagram](graphics/EyedeeaPhotos_Diagram.gif)

## Folder Structure
My folder structure looks as follows, but the code should traverse through any folder structure.

![Synology Photos Folder Structure](graphics/EyedeeaPhotos_Folder_Structure.png)

## KYP - Know Your Photos:  
Many of us have multiple accounts across platforms, leading to scattered memories. You can download all your photos, clean and organize them, and then use **Eyedeea Photos** to view them. This also helps identify duplicates and correct album (directory) names, creating a better photo repository.

## I migrated to NAS. But Why?
I migrated all my photos to **Synology NAS**. If these questions intrigue you, keep reading:
- Where do you store your photos?
- Do you know how many photos you have?
- How often do you revisit your entire collection?
- How much are you paying for cloud storage?

Most of us sync our photos to multiple cloud providers. They lure us in with free storage, then charge hefty fees as our collections grow. Their business model relies on:
1. Leveraging our data to train AI models and develop new tools.
2. Charging for storage.

Privacy is a major concern—I don’t want my photos stored with someone else. 

## My Concerns:
- **Privacy Risks:** Cloud providers scan photos for metadata—faces, locations, timestamps. With this data, someone could map out my travel history.
- **Duplicate Photos:** Multiple services prompt me to sync photos, creating redundancy.
- **Disorganization:** Without proper management, photo collections become overwhelming.
- **Limited Sharing Options:** I want seamless access across devices (TV, laptop, mobile).
- **Multiple Providers:** Due to varying features and costs, a single provider isn’t reliable.

## The Solution: Take Control of Your Photos
### Local (or Network) Based Storage (NAS or external SDD, HDD, USB)
I built my own **Network Attached Storage (NAS)** using a **Synology DS923+**, ensuring data redundancy and high availability. My photos are accessible within my home network and remotely—without recurring fees or third-party dependencies.

### Geo-Redundancy for Backup
To mitigate risks, we can use following two backup strategies:
- **Cloud Backup:** Back up my NAS to affordable cloud storage like **AWS S3 Deep Glacier** ($0.0036 per GB/month). *I am using this*.
- **Physical Backup:** Periodically copy encrypted backups onto **external SSDs/HDDs** and store them in a separate location.

I also declutter my collection by removing duplicates and keeping only meaningful photos. With **30,000 photos**, I expect to stay under **1TB** for years, making cloud backup affordable (~$50 per TB per year).

## Conclusion
I end up setting up NAS. But, you can simply migrate your photos to an external SSD or HDD. But keep at least one replica and, if possible, a geo-redundant backup. With this setup, your photos are **secure, organized, and easily viewable**—providing peace of mind and a better way to enjoy memories. **No hefty cloud fees, no privacy concerns—just our photos, our way.**

## Download Eyedeea Photos

 Fixed URLs (latest release):
- Android [A]: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/ep_a.apk
- Fire TV [FTV]: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/ep_f.apk
- Server (Windows) [SVR]: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/install.ps1
- Server (Linux) [SVR]: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/install.sh
- Desktop wallpaper [PC]: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/desktop_wallpaper.ps1

Or download from repo:
- [Download & Execute](release/install.ps1) on Windows Powershell
- [Download & Execute](release/install.sh) on Linux

- Expert Installation
  - Install Node.js
  - Install npm pm2 globally
  - Install npm eyedeeaphotos
  - Configure pm2, optionally configure Apache HTTP server

> **_NOTE:_**  *Remember he IP address of the server. Henceforth we will call this device as **Eyedeea Photos** server.*

## Automatic Updates

Eyedeea Photos includes an automatic update system to keep your installation current with the latest features and security patches.

### Setting Up Auto-Updates

**Linux (Cron Job):**
```bash
cd release
bash setup-cron.sh
```

**Windows (Task Scheduler):**
```powershell
cd release
powershell -ExecutionPolicy Bypass -File setup-task.ps1
```

Choose your preferred update frequency:
- Daily (recommended for production)
- Weekly
- Twice monthly
- Custom schedule

The update system will:
- Check npm registry for new versions
- Download and install updates automatically
- Restart the service (PM2 or systemd)
- Log all activity to `logs/auto-update.log`

### Version Display

The current version is displayed in the footer of the management interface. An "Update available" badge appears when a newer version is published, allowing you to track your deployment status.

For detailed documentation on release management, see [release/README.md](release/README.md).

## Access Eyedeea Photos
After installing, make sure that you triggered scan mannually. And once scanning is completed, you can access it.

- On the server, access it using http://127.0.0.1:8080/manage
- On other devices, access it using server intranet IP Address e.g. http://192.168.1.112:8080/manage
- We can configure Apache server to access it without the port like http://192.168.1.112/manage
- We can also configure it to access it using hostname like http://eyedeea **recommended**

## Detailed Features:
Finally, access the player http://127.0.0.1:8080


## Detailed Features:
Blog & Official Website: https://eyedeeaphotos.eyediatech.com/
NPM Package: https://www.npmjs.com/package/eyedeeaphotos
GitHub Releases: https://github.com/eyedia/EyedeeaPhotos/releases

Free & Open Source: Eyedeea Photos is actively maintained on GitHub with frequent releases (typically weekly) and automated checks (quality gates, security scans, Node.js build/tests).

### Desktop Wallpaper (Windows)
- Download the desktop wallpaper helper: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/desktop_wallpaper.ps1
- Right-click PowerShell and choose "Run as Administrator" (recommended)
- Run the script to install the wallpaper app and follow prompts
- For more details, see apps/desktop/README.md

## Credits:
- **Website Template:** https://html5up.net
- **Synology API Documentation:** [GitHub by zeichensatz](https://github.com/zeichensatz/SynologyPhotosAPI)
