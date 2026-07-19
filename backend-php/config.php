<?php
// config.php — shared DB connection + CORS setup.
//
// Local (XAMPP): place this whole backend-php folder in C:/xampp/htdocs/geofence_api
// Live (Render): this same file is used, but DB credentials come from
// environment variables set in the Render dashboard (Environment tab),
// NOT hardcoded here.

// --- CORS: allow local dev + the live Vercel frontend to call this API ---
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://task-reminder-eight-ivory.vercel.app',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
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
// Reads from environment variables (set these in Render → Environment tab).
// Falls back to local XAMPP defaults only if the env vars aren't set, so
// this file still works unchanged on your local machine.
$isLocalhost = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', '::1']);

$DB_HOST = $isLocalhost ? 'localhost' : (getenv('DB_HOST') ?: 'localhost');
$DB_PORT = $isLocalhost ? 3306 : (getenv('DB_PORT') ?: 3306);
$DB_NAME = $isLocalhost ? 'geofence_app' : (getenv('DB_NAME') ?: 'geofence_app');
$DB_USER = $isLocalhost ? 'root' : (getenv('DB_USER') ?: 'root');
$DB_PASS = $isLocalhost ? '' : (getenv('DB_PASS') ?: '');
$DB_SSL_CA = __DIR__ . "/ca.pem";

try {
    $dsn = "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ];
    // Only use SSL if the CA file actually exists (it won't on plain local
    // XAMPP unless you copied it there too).
    if (file_exists($DB_SSL_CA)) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $DB_SSL_CA;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
    }
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
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