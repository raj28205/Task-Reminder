<?php
require_once 'config.php';
$user = require_auth($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // React polls this every few seconds to show in-app toasts for new notifications
    $stmt = $pdo->prepare(
        "SELECT n.*, g.name AS geofence_name
         FROM notifications n
         JOIN geofences g ON g.id = n.geofence_id
         WHERE n.user_id = ? AND n.is_read = FALSE
         ORDER BY n.created_at DESC"
    );
    $stmt->execute([$user['id']]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit();
}

if ($method === 'PUT') {
    // Mark as read: { id }
    $body = json_decode(file_get_contents("php://input"), true);
    $id = $body['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "id is required"]);
        exit();
    }
    $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user['id']]);
    echo json_encode(["success" => true]);
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
