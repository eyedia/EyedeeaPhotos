#!/usr/bin/env node

/**
 * Eyedeea Photos - Release Management Script
 * Copyright (c) 2024 Eyedia Technologies
 * 
 * This file is part of Eyedeea Photos.
 * Eyedeea Photos is licensed under the GNU General Public License v3.0
 * 
 * SPDX-License-Identifier: GPL-3.0-only
 */

/**
 * Release script for EyedeeaPhotos
 * Automates version bumping, changelog generation, and npm publishing
 * Usage: npm run release [patch|minor|major]
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message) {
  console.log(`\x1b[36m[Release]\x1b[0m ${message}`);
}

function error(message) {
  console.error(`\x1b[31m[Error]\x1b[0m ${message}`);
}

function success(message) {
  console.log(`\x1b[32m[Success]\x1b[0m ${message}`);
}

function exec(command, args = [], silent = false) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
  } catch (err) {
    error(`Command failed: ${command} ${args.join(' ')}`);
    throw err;
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  return packageJson.version;
}

function bumpVersion(type) {
  log(`Bumping ${type} version...`);
  const output = exec('npm', ['version', type, '--no-git-tag-version'], true);
  const newVersion = output.trim().replace('v', '');
  success(`Version bumped to ${newVersion}`);
  return newVersion;
}

function checkGitStatus() {
  const status = exec('git', ['status', '--porcelain'], true);
  return status.trim();
}

function runTests() {
  log('Running tests...');
  try {
    exec('npm', ['test']);
    success('All tests passed');
    return true;
  } catch {
    error('Tests failed');
    return false;
  }
}

async function updateDependencies() {
  log('Checking for dependency updates...');
  try {
    exec('npm', ['outdated']);
  } catch {
    // npm outdated returns non-zero if updates are available
  }
  
  const answer = await question('Update dependencies? (y/n): ');
  if (answer.toLowerCase() === 'y') {
    log('Updating dependencies...');
    exec('npm', ['update']);
    exec('npm', ['audit', 'fix']);
    success('Dependencies updated');
  }
}

function generateChangelog(version) {
  log('Generating changelog...');
  
  const changelogPath = path.join(__dirname, '../CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  
  // Get commits since last tag
  let commits = '';
  try {
    const lastTag = exec('git', ['describe', '--tags', '--abbrev=0'], true).trim();
    commits = exec('git', ['log', `${lastTag}..HEAD`, '--oneline'], true);
  } catch {
    commits = exec('git', ['log', '--oneline', '-10'], true);
  }
  
  const newEntry = `\n## [${version}] - ${date}\n\n### Changes\n${commits}\n`;
  
  let changelog = '';
  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, 'utf8');
  } else {
    changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n';
  }
  
  // Insert new entry after header
  const lines = changelog.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## '));
  if (insertIndex > 0) {
    lines.splice(insertIndex, 0, newEntry);
  } else {
    lines.push(newEntry);
  }
  
  fs.writeFileSync(changelogPath, lines.join('\n'));
  success('Changelog updated');
}

function commitAndTag(version) {
  log('Committing changes...');
  exec('git', ['add', '.']);
  exec('git', ['commit', '-m', `chore: release v${version}`]);
  
  log('Creating git tag...');
  exec('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`]);
  
  success('Changes committed and tagged');
}

function publishToNpm() {
  log('Publishing to npm...');
  exec('npm', ['publish']);
  success('Published to npm');
}

function pushToGitHub() {
  log('Pushing to GitHub...');
  exec('git', ['push', 'origin', 'main']);
  exec('git', ['push', 'origin', '--tags']);
  success('Pushed to GitHub');
}

async function main() {
  console.log('\n\x1b[1m🚀 EyedeeaPhotos Release Process\x1b[0m\n');
  
  // Get release type
  let releaseType = process.argv[2];
  if (!releaseType || !['patch', 'minor', 'major'].includes(releaseType)) {
    console.log('Release types:');
    console.log('  patch - Bug fixes (1.0.0 → 1.0.1)');
    console.log('  minor - New features (1.0.0 → 1.1.0)');
    console.log('  major - Breaking changes (1.0.0 → 2.0.0)');
    releaseType = await question('\nRelease type (patch/minor/major): ');
    
    if (!['patch', 'minor', 'major'].includes(releaseType)) {
      error('Invalid release type');
      rl.close();
      process.exit(1);
    }
  }
  
  const currentVersion = getCurrentVersion();
  log(`Current version: ${currentVersion}`);
  
  // Check git status
  const gitStatus = checkGitStatus();
  if (gitStatus) {
    log('Uncommitted changes detected:');
    console.log(gitStatus);
    const proceed = await question('Continue? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Release cancelled');
      rl.close();
      process.exit(0);
    }
  }
  
  // Update dependencies
  await updateDependencies();
  
  // Run tests
  const testsPassed = runTests();
  if (!testsPassed) {
    const proceed = await question('Tests failed. Continue anyway? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Release cancelled');
      rl.close();
      process.exit(1);
    }
  }
  
  // Bump version
  const newVersion = bumpVersion(releaseType);
  
  // Generate changelog
  generateChangelog(newVersion);
  
  // Confirm release
  console.log(`\n\x1b[1mRelease Summary:\x1b[0m`);
  console.log(`  Version: ${currentVersion} → ${newVersion}`);
  console.log(`  Type: ${releaseType}`);
  
  const confirm = await question('\nProceed with release? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    log('Release cancelled');
    rl.close();
    process.exit(0);
  }
  
  try {
    // Commit and tag
    commitAndTag(newVersion);
    
    // Publish to npm
    publishToNpm();
    
    // Push to GitHub
    pushToGitHub();
    
    console.log('\n\x1b[32m\x1b[1m✨ Release completed successfully!\x1b[0m');
    console.log(`\nVersion ${newVersion} has been released`);
    console.log(`- Published to npm`);
    console.log(`- Pushed to GitHub with tag v${newVersion}`);
    console.log(`\nUsers can update with: npm install -g eyedeeaphotos@latest\n`);
    
  } catch (err) {
    error('Release failed');
    console.error(err);
    process.exit(1);
  }
  
  rl.close();
}

main();
