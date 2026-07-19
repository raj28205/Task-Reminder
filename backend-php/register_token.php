<?php
require_once 'auth.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

// Authenticate user via Bearer token
$user = require_auth($pdo);

$body = json_decode(file_get_contents('php://input'), true);
$deviceToken = trim($body['device_token'] ?? '');
if (!$deviceToken) {
    http_response_code(400);
    echo json_encode(['error' => 'device_token is required']);
    exit();
}

$stmt = $pdo->prepare('UPDATE users SET device_token = ? WHERE id = ?');
$stmt->execute([$deviceToken, $user['id']]);

echo json_encode(['success' => true]);
?>
