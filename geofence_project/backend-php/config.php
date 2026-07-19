<?php
// config.php — shared DB connection + CORS setup.
// Place this whole backend-php folder in: C:/xampp/htdocs/geofence_api

// --- Centralized Error Logging Setup ---
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/backend_errors.log');
error_reporting(E_ALL);

set_exception_handler(function($e) {
    error_log("Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    echo json_encode(["error" => "Internal Server Error"]);
    exit();
});

set_error_handler(function($level, $message, $file, $line) {
    if (error_reporting() !== 0) { 
        throw new ErrorException($message, 0, $level, $file, $line);
    }
});

// --- CORS: allow the React dev server to call this API ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173';
if ($origin === 'http://localhost:5173' || $origin === 'http://localhost:5174') {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:5173");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database connection ---
$DB_HOST = "taskreminder-db-myapp2026.g.aivencloud.com";
$DB_PORT = 28579;

$DB_NAME = "geofence_app";
$DB_USER = "avnadmin";
$DB_PASS = "AVNS_dxsftdUbj3kDiPgOqTI";
$DB_SSL_CA = __DIR__ . "/ca.pem";
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::MYSQL_ATTR_SSL_CA => $DB_SSL_CA,
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}
// --- Simple token auth helper ---
// For a real app, use a proper JWT library (firebase/php-jwt via Composer).
// This is a minimal, dependency-free stand-in so the scaffold runs out of the box.
function require_auth(PDO $pdo): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(["error" => "Missing or invalid Authorization header"]);
        exit();
    }
    $token = $matches[1];

    $stmt = $pdo->prepare("SELECT id, name, email, phone FROM users WHERE session_token = ?");
    // NOTE: this expects a session_token column — see auth.php for the simple
    // token scheme used here. Swap this whole mechanism for JWT in production.
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid or expired session"]);
        exit();
    }
    return $user;
}
