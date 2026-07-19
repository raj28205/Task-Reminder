-- Add device_token column to users table for push notifications
ALTER TABLE users ADD COLUMN device_token VARCHAR(255) NULL AFTER session_token;
