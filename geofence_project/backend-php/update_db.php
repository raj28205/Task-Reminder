<?php
require_once __DIR__ . '/config.php';

try {
    // Add columns if they don't exist
    $pdo->exec("ALTER TABLE users ADD COLUMN otp_code VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME DEFAULT NULL");
    echo "Columns added successfully.\n";
} catch (PDOException $e) {
    // 1060 is duplicate column error
    if ($e->getCode() == '42S21' || strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Columns already exist.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
