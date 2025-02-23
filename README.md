[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eyedia_EyedeeaPhotos&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=eyedia_EyedeeaPhotos) ![CodeQL](https://github.com/eyedia/eyedeeaphotos/actions/workflows/codeql.yml/badge.svg) ![Build](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/build.yml/badge.svg)
[![Node.js Package](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/eyedia/EyedeeaPhotos/actions/workflows/npm-publish.yml)

# Rediscover Your Photos

## The Problem: Viewing and Sharing My Photos
Storing photos efficiently is great, but what's the use if we can't easily view and share them? I don’t want to just send folders of images via email—I want a seamless way to rediscover and showcase my memories.

## The Solution: Eyedeea Photos
![Eyedeea Photos](graphics/eyedeea_two_logos.png)

**Eyedeea Photos** is an app designed to bring forgotten memories back to life. It integrates with **Synology Photos** & any USB, HDD, SDD to display random photos from the collection. Here’s how it works:
- **Scan:** Interacts with **Synology Photos API** or **file system** to extract metadata (filename, path, date taken, geolocation, album name, etc.).
- **Show:** Displays random photos across devices.

Ideally you run it on **Raspberry Pi** within your home network, making photos easily accessible on TVs, laptops, and mobile devices. However, it's a tiny website (~125MB) that can be deployed on any laptop or desktop.

## Eyedeea Photos:
Photos will be shown with below details:
- **Title:** Smartly formatted directory name.
- **Sub Title:** Taken date and geo location as [Place, Country], as available.
- **Sub Sub Title:** Name of the file.

![Eyedeea Photos Demo](graphics/eyedeea_photos_demo_720p.gif)

## Technical Details:
- **Written in Node.js** with a **Synology Photo API wrapper** that scans the photo repository and extracts metadata into a flattened structure.
- **Metadata stored in SQLite DB**, allowing easy updates to album names, date taken, and marking photos for future edits.
- **Storage agnostic:** Can be extended to read from external sources like USB, HDD, or other service providers through plugins. I am planning to write a **File System plugin** to support USB and external SSDs/HDDs very soon.

## Feature Summary:
| Feature | Details | Technology | Status |
|---------|---------|------------|--------|
| **Basic Photo Player** | Scans photos, random playback, filtered playback, search, configurable scan times, display duration, and logs | Node.js, SQLite, PM2, Apache | Development |
| **MetaFix** | Updates metadata (tags, taken-on date, EXIF, album movement) | Python, ExifTool | Incubation |
| **Duplicate Identification** | Detects and marks duplicate photos | Python | Requested |
| **Out-of-Focus Detection** | Identifies and marks blurry photos | Python | Requested |

## Scope and Considerations:
- **Not a photo management app:** Users must handle organization, metadata updates, and deletions themselves.
- **No warranty:** Users assume full responsibility for any issues.
- **Built for home networks:** No authentication system is currently implemented.
- **Primary focus is display:** Users must collect and arrange photos beforehand.

## Current State:
- **MVP deployed on Raspberry Pi 5**, regularly used on two **Amazon FireStick** devices via the **Silk Browser**. FireStick sleep timeout disabled using ADBLink.
- **Personal Results:**
  - **42,000 photos identified**, **12,000 duplicates removed**
  - Corrected multiple album names (**album names inferred from folder names, with formatting improvements**)
  - **Scanning 30,000 photos takes ~10 minutes**
- **Family Impact:**
  - Enjoy random memories resurfacing.
  - Easily spot incorrect albums and duplicates.
  - Discover surprising, long-forgotten moments.

## Eyedeea Photos Diagram:
![Eyedeea Photos Demo](graphics/EyedeeaPhotos_Diagram.gif)

## Folder Structure
My folder structure looks as follows, but the code should traverse through any folder structure.
- It takes about **10 mins** to parse my folders with **30K photos**. I started with **42K photos**, but **Eyedeea Photos** helped me identify **12K duplicates**.

![Synology Photos Folder Structure](graphics/EyedeeaPhotos_Folder_Structure.png)

## KYP - Know Your Photos:  
Many of us have multiple accounts for various reasons, and many of our memories are scattered across these accounts. You can download all those pics from various places, clean them, crop them, edit them where required, and move them to appropriate folders. Then, use Eyedeea Photos these to view your photos. This will also helpy to identify duplicates, correct your album (directory) names, ultimately a better photo repository.

## Why NAS?
I migrated all photos to Synology NAS. If you find these questions intriguing, keep reading:
- Where do you store your photos?
- Do you know how many photos you have?
- How often do you revisit your entire collection?
- How much are you paying for cloud storage?

Most of us sync our photos to one or more cloud providers. They lure us in with free storage, only to charge hefty fees as our collections grow. Their business model revolves around two things:
1. Leveraging our data to train AI models and develop new tools.
2. Charging for storage.

While businesses need to make a profit, the real concern for me is **privacy** - I don’t want my photos stored with someone else. As a tech enthusiast, I could go into more details, but let’s keep it simple.

## My Concerns:
- **Privacy Risks:** Cloud providers scan photos for metadata—faces, locations, timestamps. With this data, someone could map out my travel history.
- **Duplicate Photos:** Multiple services prompt me to sync my photos, creating redundancy.
- **Disorganization:** I often find myself drowning in photos, unsure of how many I have. If I can't easily access and enjoy them, what’s the point of storing them?
- **Limited Sharing Options:** I want to regularly view and share my photos with friends and family across different devices—TV, laptop, mobile.
- **Multiple Providers:** Due to varying features and costs, I can’t rely on a single cloud provider.

## The Solution: Take Control of Your Photos
### 1. NAS Storage
I built my own **Network Attached Storage (NAS)** using a **Synology DS923+**, ensuring data redundancy and high availability. My photos are accessible within my home network and remotely—without recurring fees or third-party dependencies.

### 2. Geo-Redundancy for Backup
To mitigate risks like natural disasters, I use two backup strategies:
- **Cloud Backup:** I back up my NAS to affordable cloud storage like **AWS S3 Deep Glacier** ($0.0036 per GB/month).
- **Physical Backup:** I periodically copy encrypted backups onto **external SSDs/HDDs** and store them in a separate location.

I also declutter my collection by removing duplicates and keeping only meaningful photos. Currently, I have **32,000 photos (~100GB)**, and I expect to stay under **1TB** for years, making cloud backup affordable (~$50 per TB per year).


## Conclusion
You can also simply migrate your photos to external SDD or HDD. But keep at least one replica and if possible have a geo-redundancy too. With this setup, our photos are **secure, organized, and easily viewable**—giving us peace of mind and a better way to enjoy our memories. No hefty cloud fees, no privacy concerns—just **our photos, our way**.

## Download Eyedeea Photos

### Simple
| Windows | Linux | Mac |
| ------- | ----- | --- |
|Download [Win Install](release/win_install.ps1) & [Win Setup](release/win_setup.ps1) and execute win_install.ps1 on Windows Powershell | _Use Expert_ | _Use Expert_

### Experts
For my techie friends
- Install Node
- Install npm pm2 global
- Install npm eyedeeaphotos

## Detailed Features:
| Source Type | Extract Address | Cost | Description |
| ----------- | --------------- | ---- | ----------- |
|Synology NAS(DS923+) | Available |Free|
|File System | Available |About $5 per 1000 addresses. [Details at Google](https://mapsplatform.google.com/pricing/?#pricing-grid)|If configured, Eyedeea Photos will call Google Geolocation API only when (1) your photo meta data has geo location and (2) call only once per photo, even if you rescan multiple times.

## Credits:
- **Website Template:** https://html5up.net
- **Synology API Documentation** [at github by zeichensatz](https://github.com/zeichensatz/SynologyPhotosAPI)
