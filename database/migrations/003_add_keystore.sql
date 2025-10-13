-- Add keystore support for projects
-- This allows users to upload their own keystore for signed APKs

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS keystore_path VARCHAR(500) AFTER firebase_project_id,
ADD COLUMN IF NOT EXISTS keystore_password VARCHAR(255) AFTER keystore_path,
ADD COLUMN IF NOT EXISTS keystore_alias VARCHAR(255) AFTER keystore_password,
ADD COLUMN IF NOT EXISTS keystore_key_password VARCHAR(255) AFTER keystore_alias,
ADD COLUMN IF NOT EXISTS keystore_uploaded_at TIMESTAMP NULL AFTER keystore_key_password;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_keystore_path ON projects(keystore_path);
