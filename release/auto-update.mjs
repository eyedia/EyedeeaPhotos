#!/usr/bin/env node

/**
 * Eyedeea Photos - Automatic Update Script
 * Copyright (c) 2024 Eyedia Technologies
 * 
 * This file is part of Eyedeea Photos.
 * Eyedeea Photos is licensed under the GNU General Public License v3.0
 * 
 * SPDX-License-Identifier: GPL-3.0-only
 */

/**
 * Auto-update script for EyedeeaPhotos
 * Checks for updates and installs them automatically
 * Can be run manually or via cron job
 */

import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../logs/auto-update.log');
const LOCK_FILE = path.join(__dirname, '../logs/update.lock');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  
  // Ensure logs directory exists
  const logsDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.appendFileSync(LOG_FILE, logMessage);
}

function checkLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
    // If lock is older than 30 minutes, assume stale and remove
    if (lockAge > 30 * 60 * 1000) {
      log('Removing stale lock file');
      fs.unlinkSync(LOCK_FILE);
      return false;
    }
    log('Update already in progress (lock file exists)');
    return true;
  }
  return false;
}

function createLock() {
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
}

function removeLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  return packageJson.version;
}

function getLatestVersion(packageName) {
  try {
    // Validate packageName to prevent command injection
    if (!/^[a-z0-9@./_-]+$/i.test(packageName)) {
      throw new Error(`Invalid package name: ${packageName}`);
    }
    const output = execFileSync('npm', ['view', packageName, 'version'], { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    log(`Error getting latest version: ${error.message}`);
    return null;
  }
}

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

function updatePackage(packageName) {
  log(`Installing ${packageName}...`);
  try {
    // Validate packageName to prevent command injection
    if (!/^[a-z0-9@./_-]+$/i.test(packageName)) {
      throw new Error(`Invalid package name: ${packageName}`);
    }
    execFileSync('npm', ['install', '-g', `${packageName}@latest`], { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    log(`Successfully updated to latest version`);
    return true;
  } catch (error) {
    log(`Error updating package: ${error.message}`);
    return false;
  }
}

function restartService() {
  log('Attempting to restart service...');
  try {
    // If running as PM2 process
    try {
      execFileSync('pm2', ['restart', 'eyedeeaphotos'], { stdio: 'inherit' });
      log('Service restarted via PM2');
      return true;
    } catch {
      // Not running under PM2, try systemd
      try {
        execFileSync('sudo', ['systemctl', 'restart', 'eyedeeaphotos'], { stdio: 'inherit' });
        log('Service restarted via systemd');
        return true;
      } catch {
        log('Could not restart service automatically. Please restart manually.');
        return false;
      }
    }
  } catch (error) {
    log(`Error restarting service: ${error.message}`);
    return false;
  }
}

async function main() {
  log('=== Auto-update check started ===');
  
  // Check if another update is running
  if (checkLock()) {
    log('Exiting: Another update is in progress');
    process.exit(0);
  }
  
  createLock();
  
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
    );
    const packageName = packageJson.name;
    const currentVersion = packageJson.version;
    
    log(`Current version: ${currentVersion}`);
    log(`Checking for updates on npm...`);
    
    const latestVersion = getLatestVersion(packageName);
    
    if (!latestVersion) {
      log('Could not determine latest version. Exiting.');
      return;
    }
    
    log(`Latest version: ${latestVersion}`);
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      log(`Update available: ${currentVersion} → ${latestVersion}`);
      
      // Perform update
      const updated = updatePackage(packageName);
      
      if (updated) {
        log('Update completed successfully');
        
        // Restart service
        restartService();
        
        log('Update process completed');
      } else {
        log('Update failed');
      }
    } else {
      log('Already on latest version');
    }
    
  } catch (error) {
    log(`Error during update check: ${error.message}`);
    log(error.stack);
  } finally {
    removeLock();
    log('=== Auto-update check finished ===\n');
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('Interrupted by user');
  removeLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Terminated');
  removeLock();
  process.exit(0);
});

main();
