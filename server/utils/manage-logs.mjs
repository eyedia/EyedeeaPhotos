#!/usr/bin/env node

/**
 * Log Management Utility
 * Usage: node server/utils/manage-logs.mjs [command] [options]
 * 
 * Commands:
 *   view [type]     - View logs (type: error, info, debug, all) - default: info
 *   tail [type]     - Tail logs in real-time (type: error, info, debug, all)
 *   list            - List all log files and archives
 *   clean           - Remove old archives (older than 4 weeks)
 *   rotate          - Manually trigger log rotation
 *   stats           - Show log file sizes and statistics
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import constants from '../constants.js';
import { LogRotator } from './log-rotator.mjs';

const log_dir = constants.app_log_dir;
const archive_dir = path.join(log_dir, 'archive');

/**
 * View log file contents
 */
function viewLog(type = 'info') {
  const filename = `${type}.log`;
  const filepath = path.join(log_dir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`Log file not found: ${filepath}`);
    return;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  if (content.length === 0) {
    console.log(`Log file is empty: ${filename}`);
    return;
  }

  console.log(`\n📋 Contents of ${filename}:\n`);
  console.log(content);
}

/**
 * Tail log file (show last lines and watch for updates)
 */
function tailLog(type = 'info', lines = 50) {
  const filename = `${type}.log`;
  const filepath = path.join(log_dir, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`Log file not found: ${filepath}`);
    return;
  }

  console.log(`\n📡 Tailing ${filename} (last ${lines} lines, press Ctrl+C to exit):\n`);

  // Read and display last N lines
  const content = fs.readFileSync(filepath, 'utf8');
  const fileLines = content.split('\n');
  const lastLines = fileLines.slice(-lines).join('\n');
  console.log(lastLines);

  // Watch for new lines
  let lastSize = fs.statSync(filepath).size;
  const watcher = fs.watch(filepath, (eventType) => {
    if (eventType === 'change') {
      const stats = fs.statSync(filepath);
      if (stats.size > lastSize) {
        const content = fs.readFileSync(filepath, 'utf8');
        const newLines = content.split('\n').slice(-3);
        newLines.forEach(line => {
          if (line.trim()) console.log(line);
        });
        lastSize = stats.size;
      }
    }
  });

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

/**
 * List all log files and archives
 */
function listLogs() {
  console.log(`\n📁 Log Directory: ${log_dir}\n`);

  console.log('📄 Current Log Files:');
  const logFiles = ['error.log', 'info.log', 'debug.log', 'exceptions.log'];
  logFiles.forEach(file => {
    const filepath = path.join(log_dir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const modified = new Date(stats.mtime).toLocaleString();
      console.log(`  ✓ ${file.padEnd(20)} ${sizeMB.padStart(8)} MB  (modified: ${modified})`);
    } else {
      console.log(`  - ${file.padEnd(20)} (empty)`);
    }
  });

  // List archives
  if (fs.existsSync(archive_dir)) {
    const archives = fs.readdirSync(archive_dir);
    if (archives.length > 0) {
      console.log(`\n📦 Archived Logs (${archive_dir}):`);
      archives.forEach(file => {
        const filepath = path.join(archive_dir, file);
        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const modified = new Date(stats.mtime).toLocaleString();
        console.log(`  ✓ ${file.padEnd(30)} ${sizeMB.padStart(8)} MB  (${modified})`);
      });
    }
  }

  console.log('');
}

/**
 * Clean up old archives
 */
function cleanOldArchives(weeksToKeep = 4) {
  if (!fs.existsSync(archive_dir)) {
    console.log('No archives to clean');
    return;
  }

  const files = fs.readdirSync(archive_dir);
  let deletedCount = 0;

  files.forEach(file => {
    const filepath = path.join(archive_dir, file);
    const stats = fs.statSync(filepath);
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > weeksToKeep * 7) {
      fs.unlinkSync(filepath);
      console.log(`🗑️  Deleted: ${file}`);
      deletedCount++;
    }
  });

  console.log(`\n✓ Cleanup complete: ${deletedCount} file(s) removed (kept logs from last ${weeksToKeep} weeks)`);
}

/**
 * Manually trigger log rotation
 */
async function rotateLogsNow() {
  const rotator = new LogRotator(log_dir);
  console.log('\n🔄 Rotating logs manually...\n');

  try {
    await rotator.rotateIfNeeded('error.log', 4);
    await rotator.rotateIfNeeded('info.log', 4);
    await rotator.rotateIfNeeded('debug.log', 4);
    console.log('✓ Log rotation completed\n');
  } catch (error) {
    console.error('✗ Error during rotation:', error);
  }
}

/**
 * Show log statistics
 */
function showStats() {
  console.log(`\n📊 Log Statistics:\n`);

  let totalSize = 0;
  const logFiles = ['error.log', 'info.log', 'debug.log', 'exceptions.log'];

  console.log('Current Logs:');
  logFiles.forEach(file => {
    const filepath = path.join(log_dir, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const sizeMB = stats.size / (1024 * 1024);
      const lines = fs.readFileSync(filepath, 'utf8').split('\n').length;
      totalSize += stats.size;
      console.log(`  ${file.padEnd(20)} ${sizeMB.toFixed(2).padStart(8)} MB  ${lines.toString().padStart(6)} lines`);
    }
  });

  console.log(`\n  Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  // Archive stats
  if (fs.existsSync(archive_dir)) {
    const archives = fs.readdirSync(archive_dir);
    let archiveSize = 0;

    archives.forEach(file => {
      const filepath = path.join(archive_dir, file);
      const stats = fs.statSync(filepath);
      archiveSize += stats.size;
    });

    console.log(`\nArchived Logs:`);
    console.log(`  Files: ${archives.length}`);
    console.log(`  Total Size: ${(archiveSize / (1024 * 1024)).toFixed(2)} MB`);
  }

  console.log('');
}

// Parse command line arguments
const command = process.argv[2] || 'help';
const arg = process.argv[3] || 'info';

switch (command.toLowerCase()) {
  case 'view':
    viewLog(arg);
    break;
  case 'tail':
    tailLog(arg);
    break;
  case 'list':
    listLogs();
    break;
  case 'clean':
    cleanOldArchives(4);
    break;
  case 'rotate':
    rotateLogsNow();
    break;
  case 'stats':
    showStats();
    break;
  case 'help':
  default:
    console.log(`
🎯 Log Management Utility

Usage: node server/utils/manage-logs.mjs [command] [options]

Commands:
  view [type]     - View log file (type: error, info, debug, exceptions)
  tail [type]     - Tail log file in real-time (type: error, info, debug)
  list            - List all log files and archives
  clean           - Remove old archives (older than 4 weeks)
  rotate          - Manually trigger log rotation
  stats           - Show log file sizes and statistics
  help            - Show this help message

Examples:
  node server/utils/manage-logs.mjs view error
  node server/utils/manage-logs.mjs tail info
  node server/utils/manage-logs.mjs list
  node server/utils/manage-logs.mjs stats
    `);
}
