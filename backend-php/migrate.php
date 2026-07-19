<?php
require_once 'config.php';
try {
    $pdo->exec("ALTER TABLE geofences ADD COLUMN address VARCHAR(255) DEFAULT NULL;");
    echo "Migration successful\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column already exists\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
