-- Add is_deleted column to source table for soft delete functionality
-- This migration adds support for marking sources as deleted without removing data

-- Begin transaction for safe execution
BEGIN TRANSACTION;

-- Add column if it doesn't exist (will only work if checked in migration manager)
ALTER TABLE source ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Create index for faster queries filtering deleted sources
CREATE INDEX IF NOT EXISTS idx_source_is_deleted ON source(is_deleted);

COMMIT;
