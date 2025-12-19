import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

/**
 * Custom rotation handler for weekly log rotation with zip compression
 * Instead of gzip (.gz), creates .zip files weekly
 */
export class LogRotator {
  constructor(logDir) {
    this.logDir = logDir;
  }

  /**
   * Rotate log file weekly and compress to zip
   * @param {string} filename - Base filename (e.g., 'debug.log')
   * @param {number} maxKeepWeeks - Number of weeks to keep archived logs (default 4 weeks)
   */
  async rotateIfNeeded(filename, maxKeepWeeks = 4) {
    const filepath = path.join(this.logDir, filename);
    const metadataFile = path.join(this.logDir, `.${filename}.metadata`);

    // Check if rotation is needed
    if (!this.shouldRotate(metadataFile)) {
      return;
    }

    try {
      // If log file exists, compress it
      if (fs.existsSync(filepath)) {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const archiveName = `${filename.replace('.log', '')}-${timestamp}.zip`;
        const archivePath = path.join(this.logDir, 'archive', archiveName);

        // Create archive directory if it doesn't exist
        const archiveDir = path.dirname(archivePath);
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }

        // Compress log file to zip
        await this.compressToZip(filepath, archivePath, filename);

        // Clear the original log file
        fs.writeFileSync(filepath, '');
      }

      // Update metadata to mark rotation done
      this.updateMetadata(metadataFile);

      // Clean up old archives (keep last 4 weeks worth)
      this.cleanupOldArchives(filename, maxKeepWeeks);
    } catch (error) {
      console.error(`Error rotating log ${filename}:`, error);
    }
  }

  /**
   * Check if rotation should happen (once per week)
   */
  shouldRotate(metadataFile) {
    if (!fs.existsSync(metadataFile)) {
      return true; // First time, do rotation
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
      const lastRotation = new Date(metadata.lastRotation);
      const now = new Date();
      const daysSinceRotation = (now - lastRotation) / (1000 * 60 * 60 * 24);

      return daysSinceRotation >= 7; // Rotate weekly (7 days)
    } catch (error) {
      return true; // If error reading metadata, rotate
    }
  }

  /**
   * Update metadata file to track last rotation
   */
  updateMetadata(metadataFile) {
    const metadata = {
      lastRotation: new Date().toISOString(),
    };
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  }

  /**
   * Compress log file to zip
   */
  compressToZip(sourceFile, destZip, logFilename) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destZip);
      const archive = archiver('zip', { zlib: { level: 9 } }); // 9 = max compression

      output.on('close', () => {
        console.log(`Log rotated and archived: ${path.basename(destZip)}`);
        resolve();
      });

      archive.on('error', (err) => {
        console.error(`Error creating archive:`, err);
        reject(err);
      });

      archive.pipe(output);
      archive.file(sourceFile, { name: logFilename });
      archive.finalize();
    });
  }

  /**
   * Remove archives older than specified weeks
   */
  cleanupOldArchives(filename, maxKeekWeeks) {
    const archiveDir = path.join(this.logDir, 'archive');
    if (!fs.existsSync(archiveDir)) {
      return;
    }

    const baseFilename = filename.replace('.log', '');
    const files = fs.readdirSync(archiveDir);
    const pattern = new RegExp(`^${baseFilename}-\\d{4}-\\d{2}-\\d{2}\\.zip$`);

    files.forEach((file) => {
      if (pattern.test(file)) {
        const filepath = path.join(archiveDir, file);
        const stats = fs.statSync(filepath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        // Delete if older than specified weeks
        if (ageInDays > maxKeekWeeks * 7) {
          fs.unlinkSync(filepath);
          console.log(`Removed old archive: ${file}`);
        }
      }
    });
  }
}

export default LogRotator;
