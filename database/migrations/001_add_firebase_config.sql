-- Migration: Add Firebase Configuration to Projects Table
-- This migration adds Firebase credentials storage to the projects table
-- Run this if you're upgrading from a previous version

USE codelog;

-- Add Firebase configuration columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS firebase_project_id VARCHAR(255) AFTER website_url,
ADD COLUMN IF NOT EXISTS firebase_private_key TEXT AFTER firebase_project_id,
ADD COLUMN IF NOT EXISTS firebase_client_email VARCHAR(255) AFTER firebase_private_key,
ADD COLUMN IF NOT EXISTS firebase_config_uploaded BOOLEAN DEFAULT FALSE AFTER firebase_client_email;

-- Update existing projects to have default values
UPDATE projects
SET firebase_config_uploaded = FALSE
WHERE firebase_config_uploaded IS NULL;

SELECT 'Migration completed successfully!' as Status;
