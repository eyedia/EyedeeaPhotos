import { meta_db } from './meta_base.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config_log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create migrations tracking table
 */
function initMigrationsTable() {
  return new Promise((resolve, reject) => {
    meta_db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, (err) => {
      if (err) {
        logger.error('Failed to create schema_migrations table:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get list of already applied migrations
 */
function getAppliedMigrations() {
  return new Promise((resolve, reject) => {
    meta_db.all('SELECT version, name FROM schema_migrations ORDER BY version', (err, rows) => {
      if (err) {
        logger.error('Failed to get applied migrations:', err);
        reject(err);
      } else {
        resolve(rows.map(r => r.version));
      }
    });
  });
}

/**
 * Apply a single migration within a transaction
 */
async function applyMigration(version, name, sql) {
  return new Promise((resolve, reject) => {
    meta_db.serialize(() => {
      meta_db.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(err);
      });
      
      // Execute the migration SQL
      meta_db.exec(sql, (err) => {
        if (err) {
          logger.error(`Migration ${version} (${name}) failed:`, err);
          meta_db.run('ROLLBACK');
          reject(err);
        } else {
          // Record migration as applied
          meta_db.run(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)', 
            [version, name], 
            (err) => {
              if (err) {
                logger.error(`Failed to record migration ${version}:`, err);
                meta_db.run('ROLLBACK');
                reject(err);
              } else {
                meta_db.run('COMMIT', (err) => {
                  if (err) {
                    logger.error(`Failed to commit migration ${version}:`, err);
                    reject(err);
                  } else {
                    logger.info(`✓ Migration ${version} (${name}) applied successfully`);
                    resolve();
                  }
                });
              }
            }
          );
        }
      });
    });
  });
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  try {
    logger.info('Checking for database migrations...');
    
    // Initialize migrations table
    await initMigrationsTable();
    
    // Get already applied migrations
    const applied = await getAppliedMigrations();
    
    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      logger.info('No migration files found');
      return;
    }
    
    let appliedCount = 0;
    
    // Apply pending migrations
    for (const file of files) {
      // Parse version from filename (e.g., "001_add_is_deleted_column.sql")
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        logger.warn(`Skipping invalid migration filename: ${file}`);
        continue;
      }
      
      const version = parseInt(match[1]);
      const name = match[2];
      
      if (!applied.includes(version)) {
        logger.info(`Applying migration ${version}: ${name}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
          await applyMigration(version, name, sql);
          appliedCount++;
        } catch (err) {
          logger.error(`Migration ${version} failed, stopping migrations:`, err.message);
          throw err;
        }
      }
    }
    
    if (appliedCount === 0) {
      logger.info('Database schema is up to date');
    } else {
      logger.info(`Successfully applied ${appliedCount} migration(s)`);
    }
    
  } catch (error) {
    logger.error('Migration process failed:', error);
    throw error;
  }
}

/**
 * Get current schema version
 */
export async function getCurrentSchemaVersion() {
  return new Promise((resolve, reject) => {
    meta_db.get('SELECT MAX(version) as version FROM schema_migrations', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.version : 0);
      }
    });
  });
}
