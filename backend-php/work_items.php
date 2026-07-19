<?php
require_once 'config.php';
$user = require_auth($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents("php://input"), true);

// Helper: confirm the geofence belongs to the logged-in user before touching it
function ownsGeofence(PDO $pdo, int $geofenceId, int $userId): bool {
    $stmt = $pdo->prepare("SELECT id FROM geofences WHERE id = ? AND user_id = ?");
    $stmt->execute([$geofenceId, $userId]);
    return (bool) $stmt->fetch();
}

switch ($method) {

    case 'POST':
        $geofenceId = $body['geofence_id'] ?? null;
        if (!$geofenceId) {
            http_response_code(400);
            echo json_encode(["error" => "geofence_id is required"]);
            exit();
        }
        if (!ownsGeofence($pdo, (int)$geofenceId, (int)$user['id'])) {
            http_response_code(403);
            echo json_encode(["error" => "You don't own this geofence"]);
            exit();
        }

        if (isset($body['bulk']) && is_array($body['bulk'])) {
            $insertedCount = 0;
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO work_items (geofence_id, title, description) VALUES (?, ?, ?)");
                foreach ($body['bulk'] as $item) {
                    $title = trim($item['title'] ?? '');
                    $description = trim($item['description'] ?? '');
                    if ($title !== '') {
                        $stmt->execute([$geofenceId, $title, $description]);
                        $insertedCount++;
                    }
                }
                $pdo->commit();
                echo json_encode(["success" => true, "inserted_count" => $insertedCount]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(["error" => "Bulk upload failed: " . $e->getMessage()]);
            }
            break;
        }

        $title = trim($body['title'] ?? '');
        $description = trim($body['description'] ?? '');

        if (!$title) {
            http_response_code(400);
            echo json_encode(["error" => "title is required"]);
            exit();
        }

        $stmt = $pdo->prepare("INSERT INTO work_items (geofence_id, title, description) VALUES (?, ?, ?)");
        $stmt->execute([$geofenceId, $title, $description]);
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        // Mark done/undone or edit: { id, is_done } or { id, title, description }
        $id = $body['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "id is required"]);
            exit();
        }

        $fields = [];
        $values = [];
        foreach (['title', 'description', 'is_done'] as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "$field = ?";
                $values[] = $body[$field];
            }
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(["error" => "Nothing to update"]);
            exit();
        }
        $values[] = $id;

        $stmt = $pdo->prepare("UPDATE work_items SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($values);
        echo json_encode(["success" => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "id query parameter required"]);
            exit();
        }
        $stmt = $pdo->prepare("DELETE FROM work_items WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
