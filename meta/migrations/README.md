# Database Migrations

This directory contains SQL migration files for managing database schema changes.

## How It Works

- Migrations run automatically on app startup
- Each migration runs only once and is tracked in the `schema_migrations` table
- Migrations run in order based on version number (001, 002, 003, etc.)
- Failed migrations stop the process and must be fixed before continuing

## Creating a New Migration

```bash
npm run migrate:create <migration_name>
```

Example:
```bash
npm run migrate:create add_user_preferences
```

This creates a new migration file like `002_add_user_preferences.sql`

## Migration File Format

Migrations must be named: `XXX_description.sql` where:
- `XXX` is a 3-digit version number (001, 002, 003, etc.)
- `description` is a brief name using lowercase and underscores
- Must end with `.sql`

Example: `001_add_is_deleted_column.sql`

## Writing Migrations

Migrations are plain SQL files. Examples:

### Adding a Column
```sql
ALTER TABLE source ADD COLUMN new_column TEXT DEFAULT 'default_value';
```

### Creating an Index
```sql
CREATE INDEX IF NOT EXISTS idx_source_new_column ON source(new_column);
```

### Creating a Table
```sql
CREATE TABLE IF NOT EXISTS new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

## Best Practices

1. **One Migration Per Feature**: Keep migrations focused on a single change
2. **Use IF NOT EXISTS**: Makes migrations idempotent (safe to run multiple times)
3. **Add Comments**: Explain what the migration does and why
4. **Test Migrations**: Test on a copy of your database first
5. **Never Modify Applied Migrations**: Create a new migration to fix issues

## Migration Tracking

The `schema_migrations` table tracks applied migrations:

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);
```

## Troubleshooting

### Migration Failed
1. Check the error message in logs
2. Fix the SQL in the migration file
3. Delete the failed version from `schema_migrations` table
4. Restart the app to retry

### Check Migration Status
Query the database:
```sql
SELECT * FROM schema_migrations ORDER BY version;
```

### Reset All Migrations (Development Only)
⚠️ **This will lose data!** Only use in development:
```sql
DROP TABLE schema_migrations;
-- Then restart the app
```

## Examples

### Example 1: Adding a Column
File: `001_add_is_deleted_column.sql`
```sql
-- Add soft delete support to source table
ALTER TABLE source ADD COLUMN is_deleted INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_source_is_deleted ON source(is_deleted);
```

### Example 2: Creating a New Table
File: `002_create_audit_log.sql`
```sql
-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    user_id INTEGER,
    changes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
```

## Deployment

When deploying updates:
1. Include all new migration files in your package
2. Migrations run automatically on app startup
3. Check logs to confirm migrations applied successfully
4. If migration fails, app will stop with error

## Manual Execution (Advanced)

To run migrations manually:
```javascript
import { runMigrations } from './meta/migration_manager.mjs';
await runMigrations();
```
