#!/usr/bin/env node

/**
 * Create a new migration file
 * Usage: npm run migrate:create <migration_name>
 * Example: npm run migrate:create add_user_preferences
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Error: Migration name is required');
  console.log('Usage: npm run migrate:create <migration_name>');
  console.log('Example: npm run migrate:create add_user_preferences');
  process.exit(1);
}

// Validate migration name
if (!/^[a-z_]+$/.test(migrationName)) {
  console.error('Error: Migration name must contain only lowercase letters and underscores');
  process.exit(1);
}

// Get next version number
const migrationsDir = path.join(__dirname, 'migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir);
}

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let nextVersion = 1;
if (files.length > 0) {
  const lastFile = files[files.length - 1];
  const lastVersion = parseInt(lastFile.split('_')[0]);
  nextVersion = lastVersion + 1;
}

// Format version with leading zeros (e.g., 001, 002, 003)
const versionStr = String(nextVersion).padStart(3, '0');
const filename = `${versionStr}_${migrationName}.sql`;
const filepath = path.join(migrationsDir, filename);

// Create migration file with template
const template = `-- Migration: ${migrationName}
-- Version: ${versionStr}
-- Created: ${new Date().toISOString()}
-- Description: Add a description of what this migration does

-- Write your SQL migration here
-- Example:
-- ALTER TABLE table_name ADD COLUMN column_name TEXT;
-- CREATE INDEX idx_name ON table_name(column_name);
`;

fs.writeFileSync(filepath, template, 'utf8');

console.log(`✓ Created migration: ${filename}`);
console.log(`  Location: ${filepath}`);
console.log('');
console.log('Next steps:');
console.log('1. Edit the migration file and add your SQL');
console.log('2. Test the migration by restarting the app');
console.log('3. The migration will run automatically on next startup');
