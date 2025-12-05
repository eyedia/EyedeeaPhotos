-- Add is_deleted column to source table for soft delete functionality

ALTER TABLE source ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- Create index for faster queries filtering deleted sources
CREATE INDEX IF NOT EXISTS idx_source_is_deleted ON source(is_deleted);


