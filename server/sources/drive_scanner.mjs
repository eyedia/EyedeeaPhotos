/**
 * Drive Scanner Module
 * OS-agnostic utility to scan and list available drives on Windows and Linux
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import logger from '../config_log.js';
import constants from '../constants.js';

const platform = os.platform();

/**
 * Normalize drive path for the current platform
 * Windows: 'C' -> 'C:\', 'C:' -> 'C:\', 'C:\' -> 'C:\'
 * Linux/Mac: '/media/...' -> '/media/...' (no change)
 */
export const normalize_drive_path = (drivePath) => {
  if (constants.IS_WINDOWS) {
    // For Windows, ensure we have the full drive path like C:\
    if (drivePath.length === 1) {
      // Single letter like 'C' -> 'C:\'
      return `${drivePath}:\\`;
    } else if (drivePath.length === 2 && drivePath[1] === ':') {
      // Like 'C:' -> 'C:\'
      return `${drivePath}\\`;
    }
  }
  // For Linux/Mac or already formatted Windows paths, return as-is
  return drivePath;
};

/**
 * Get list of available drives on the system
 * Windows: Returns C:, D:, E:, etc.
 * Linux: Returns mounted volumes from /etc/mtab
 */
export const get_available_drives = async () => {
  try {
    if (platform === 'win32') {
      return await getWindowsDrives();
    } else if (platform === 'linux') {
      return await getLinuxDrives();
    } else if (platform === 'darwin') {
      return await getMacDrives();
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    logger.error(`Error scanning drives: ${error.message}`);
    throw error;
  }
};

/**
 * Get directories from a specified drive/path
 * Works on both Windows and Linux
 */
export const get_drive_directories = async (drivePath, maxDepth = 2, currentDepth = 0) => {
  try {
    // Normalize the drive path for the current platform
    const normalizedPath = normalize_drive_path(drivePath);
    
    logger.debug(`get_drive_directories: input='${drivePath}', normalized='${normalizedPath}', depth=${currentDepth}`);

    // Validate the path exists and is accessible
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Path does not exist: '${normalizedPath}' (input: '${drivePath}')`);
    }

    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: '${normalizedPath}'`);
    }

    // Read directory contents
    const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });
    
    const directories = [];

    for (const entry of entries) {
      try {
        // Skip hidden files/folders (starting with . on Linux, or system files on Windows)
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(normalizedPath, entry.name);
        
        if (entry.isDirectory()) {
          const dirInfo = {
            name: entry.name,
            path: fullPath,
            depth: currentDepth,
            subdirs: []
          };

          // Recursively get subdirectories if maxDepth not reached
          if (currentDepth < maxDepth) {
            try {
              dirInfo.subdirs = await get_drive_directories(fullPath, maxDepth, currentDepth + 1);
            } catch (subError) {
              logger.warn(`Could not read subdirectories of ${fullPath}: ${subError.message}`);
              // Continue with other directories even if one fails
            }
          }

          directories.push(dirInfo);
        }
      } catch (entryError) {
        logger.warn(`Error processing entry ${entry.name}: ${entryError.message}`);
        // Continue with other entries
      }
    }

    return directories;
  } catch (error) {
    logger.error(`Error getting directories from '${drivePath}': ${error.message}`);
    throw error;
  }
};

/**
 * Get flattened list of directories (non-hierarchical)
 * Useful for dropdown lists or search
 */
export const get_drive_directories_flat = async (drivePath, maxDepth = 3) => {
  try {
    const directories = [];
    
    const traverse = async (currentPath, depth = 0) => {
      if (depth > maxDepth) return;

      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        try {
          if (entry.name.startsWith('.')) continue;

          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            directories.push({
              name: entry.name,
              path: fullPath,
              depth: depth,
              relative_path: path.relative(drivePath, fullPath)
            });

            await traverse(fullPath, depth + 1);
          }
        } catch (error) {
          logger.warn(`Error processing ${entry.name}: ${error.message}`);
        }
      }
    };

    await traverse(drivePath);
    return directories;
  } catch (error) {
    logger.error(`Error getting flat directory list from ${drivePath}: ${error.message}`);
    throw error;
  }
};

/**
 * Get Windows drives (C:, D:, E:, etc.)
 */
async function getWindowsDrives() {
  const drives = [];
  
  // Check all drive letters A-Z
  for (let i = 65; i <= 90; i++) {
    const driveLetter = String.fromCharCode(i);
    const drivePath = `${driveLetter}:\\`;

    try {
      // Try to access the drive to check if it exists
      if (fs.existsSync(drivePath)) {
        const stats = fs.statSync(drivePath);
        
        drives.push({
          id: drivePath,  // Use full path like C:\ instead of just C
          name: drivePath,
          path: drivePath,
          type: 'local',
          accessible: true,
          platform: 'windows'
        });
      }
    } catch (error) {
      // Drive not accessible, skip it
      logger.debug(`Drive ${driveLetter}: not accessible`);
    }
  }

  return drives;
}

/**
 * Get Linux mounted drives
 * Excludes system mounts and pseudo filesystems
 */
async function getLinuxDrives() {
  const drives = [];
  const excludedFilesystems = ['tmpfs', 'devtmpfs', 'devfs', 'iso9660', 'squashfs', 'overlay'];
  const excludedMounts = ['/sys', '/proc', '/dev', '/run', '/boot/efi'];

  try {
    // Read /proc/mounts for all mounted filesystems
    const mountsContent = fs.readFileSync('/proc/mounts', 'utf-8');
    const mounts = mountsContent.split('\n').filter(line => line.trim());

    for (const mount of mounts) {
      const parts = mount.split(/\s+/);
      if (parts.length < 3) continue;

      const device = parts[0];
      const mountPath = parts[1];
      const filesystem = parts[2];

      // Skip system mounts and pseudo filesystems
      if (excludedFilesystems.includes(filesystem)) continue;
      if (excludedMounts.some(excluded => mountPath.startsWith(excluded))) continue;
      if (mountPath === '/') continue; // Root filesystem is already in system

      try {
        // Verify the mount point exists and is accessible
        if (fs.existsSync(mountPath)) {
          const stats = fs.statSync(mountPath);
          
          drives.push({
            id: device,
            name: path.basename(mountPath) || device,
            path: mountPath,
            type: getDriveType(device),
            filesystem: filesystem,
            accessible: true,
            platform: 'linux'
          });
        }
      } catch (error) {
        logger.debug(`Mount ${mountPath} not accessible: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Error reading /proc/mounts: ${error.message}`);
    throw new Error('Could not read mounted drives');
  }

  return drives;
}

/**
 * Get Mac drives
 */
async function getMacDrives() {
  const drives = [];

  try {
    // Use 'df' command to list mounted filesystems
    const output = execSync('df -h', { encoding: 'utf-8' });
    const lines = output.split('\n').slice(1); // Skip header

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;

      const mountPath = parts[5];
      const filesystem = parts[0];

      // Skip system mounts
      if (['/dev', '/sys', '/proc'].some(sys => mountPath.includes(sys))) continue;

      try {
        if (fs.existsSync(mountPath)) {
          drives.push({
            id: filesystem,
            name: path.basename(mountPath),
            path: mountPath,
            type: 'local',
            accessible: true,
            platform: 'darwin'
          });
        }
      } catch (error) {
        logger.debug(`Mount ${mountPath} not accessible`);
      }
    }
  } catch (error) {
    logger.error(`Error reading Mac drives: ${error.message}`);
    throw new Error('Could not read mounted drives');
  }

  return drives;
}

/**
 * Determine drive type based on device name
 */
function getDriveType(device) {
  if (device.includes('/dev/sd') || device.includes('/dev/hd')) {
    return 'usb_or_disk';
  } else if (device.includes('/dev/nvme')) {
    return 'nvme';
  } else if (device.includes('//') || device.includes(':\\')) {
    return 'network';
  } else {
    return 'other';
  }
}

/**
 * Validate a path is safe and exists
 */
export const validate_path = (targetPath) => {
  try {
    // Prevent directory traversal attacks
    const normalizedPath = path.normalize(targetPath);
    
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }

    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${targetPath}`);
    }

    return {
      valid: true,
      path: normalizedPath,
      is_directory: true
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};
