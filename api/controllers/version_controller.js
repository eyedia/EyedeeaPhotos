/**
 * Eyedeea Photos - Version Management API
 * Copyright (c) 2024 Eyedia Technologies
 * 
 * This file is part of Eyedeea Photos.
 * Eyedeea Photos is licensed under the GNU General Public License v3.0
 * 
 * SPDX-License-Identifier: GPL-3.0-only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../config_log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get current app version from package.json
 */
export const get_version = async (req, res) => {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    res.json({
      version: packageJson.version,
      name: packageJson.name,
      description: packageJson.description
    });
  } catch (error) {
    logger.error('Error reading version:', error);
    res.status(500).json({ error: 'Failed to read version information' });
  }
};

/**
 * Check for available updates from npm registry
 */
export const check_updates = async (req, res) => {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    const packageName = packageJson.name;
    
    // Fetch latest version from npm
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    
    if (!response.ok) {
      throw new Error(`npm registry returned ${response.status}`);
    }
    
    const latestPackage = await response.json();
    const latestVersion = latestPackage.version;
    
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    
    res.json({
      currentVersion,
      latestVersion,
      updateAvailable,
      packageName,
      releaseDate: latestPackage.time?.[latestVersion] || null
    });
  } catch (error) {
    logger.error('Error checking for updates:', error);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
};

/**
 * Compare semantic versions (e.g., "1.2.3" vs "1.2.4")
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}
