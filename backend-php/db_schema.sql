-- Geofence Reminder App — schema
-- Import via phpMyAdmin (XAMPP) or: mysql -u root -p < db_schema.sql

CREATE DATABASE IF NOT EXISTS geofence_app;
USE geofence_app;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) DEFAULT NULL,       -- for SMS notifications
    password_hash VARCHAR(255) NOT NULL,
    session_token VARCHAR(64) DEFAULT NULL,   -- simple bearer token, set on login
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Each row is ONE geofence area. A user can have many (multi-location).
CREATE TABLE geofences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,           -- e.g. "Warehouse A", "Client Site 3"
    center_lat DOUBLE NOT NULL,
    center_lng DOUBLE NOT NULL,
    address VARCHAR(255) DEFAULT NULL,
    radius_meters INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Work / reminder tied to a specific geofence area.
CREATE TABLE work_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    geofence_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE
);

-- Tracks whether a user is currently INSIDE or OUTSIDE each of their geofences.
-- This is what lets the Python engine detect an ENTER event (transition from
-- outside -> inside) instead of re-notifying on every single GPS ping.
CREATE TABLE geofence_status (
    user_id INT NOT NULL,
    geofence_id INT NOT NULL,
    status ENUM('outside', 'inside') NOT NULL DEFAULT 'outside',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, geofence_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE
);

-- Log of every notification sent (also what the React app polls to show
-- an in-app toast).
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    geofence_id INT NOT NULL,
    work_item_id INT DEFAULT NULL,
    message TEXT NOT NULL,
    sent_via VARCHAR(50) NOT NULL,        -- 'email', 'sms', 'in_app'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE
);

-- Optional: raw location history, useful for debugging / a "breadcrumb trail" map layer
CREATE TABLE location_pings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
