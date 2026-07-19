<?php
require_once 'config.php';
$user = require_auth($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents("php://input"), true);

switch ($method) {

    case 'GET':
        // List all geofences (with their work items) for the logged-in user
        $stmt = $pdo->prepare("SELECT * FROM geofences WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
        $geofences = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($geofences as &$g) {
            $workStmt = $pdo->prepare("SELECT * FROM work_items WHERE geofence_id = ?");
            $workStmt->execute([$g['id']]);
            $g['work_items'] = $workStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($geofences);
        break;

    case 'POST':
        $action = $_GET['action'] ?? '';
        if ($action === 'update') {
            $id = $body['id'] ?? null;
            $name = trim($body['name'] ?? '');
            $lat = $body['center_lat'] ?? null;
            $lng = $body['center_lng'] ?? null;
            $radius = $body['radius_meters'] ?? null;
            $address = $body['address'] ?? null;

            if (!$id || !$name || $lat === null || $lng === null || $radius === null) {
                http_response_code(400);
                echo json_encode(["error" => "id, name, center_lat, center_lng, and radius_meters are required"]);
                exit();
            }

            $stmt = $pdo->prepare("SELECT id FROM geofences WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $user['id']]);
            if (!$stmt->fetch()) {
                http_response_code(403);
                echo json_encode(["error" => "You don't own this geofence"]);
                exit();
            }

            $stmt = $pdo->prepare(
                "UPDATE geofences SET name = ?, center_lat = ?, center_lng = ?, address = ?, radius_meters = ? WHERE id = ?"
            );
            $stmt->execute([$name, $lat, $lng, $address, $radius, $id]);
            echo json_encode(["success" => true]);
            break;
        }

        if (isset($body['bulk']) && is_array($body['bulk'])) {
            $insertedCount = 0;
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    "INSERT INTO geofences (user_id, name, center_lat, center_lng, address, radius_meters) VALUES (?, ?, ?, ?, ?, ?)"
                );
                $statusStmt = $pdo->prepare(
                    "INSERT INTO geofence_status (user_id, geofence_id, status) VALUES (?, ?, 'outside')"
                );
                
                foreach ($body['bulk'] as $item) {
                    $name = trim($item['name'] ?? '');
                    $lat = $item['center_lat'] ?? null;
                    $lng = $item['center_lng'] ?? null;
                    $address = $item['address'] ?? null;
                    $radius = $item['radius_meters'] ?? 100;
                    
                    if ($name !== '' && $lat !== null && $lng !== null) {
                        $stmt->execute([$user['id'], $name, $lat, $lng, $address, $radius]);
                        $newId = $pdo->lastInsertId();
                        $statusStmt->execute([$user['id'], $newId]);
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

        // Create a new geofence: { name, center_lat, center_lng, radius_meters, address }
        $name = trim($body['name'] ?? '');
        $lat = $body['center_lat'] ?? null;
        $lng = $body['center_lng'] ?? null;
        $radius = $body['radius_meters'] ?? 100;
        $address = $body['address'] ?? null;

        if (!$name || $lat === null || $lng === null) {
            http_response_code(400);
            echo json_encode(["error" => "name, center_lat, and center_lng are required"]);
            exit();
        }

        $stmt = $pdo->prepare(
            "INSERT INTO geofences (user_id, name, center_lat, center_lng, address, radius_meters) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$user['id'], $name, $lat, $lng, $address, $radius]);
        $geofenceId = $pdo->lastInsertId();

        // Initialize status row so the Python engine has something to compare against
        $pdo->prepare("INSERT INTO geofence_status (user_id, geofence_id, status) VALUES (?, ?, 'outside')")
            ->execute([$user['id'], $geofenceId]);

        echo json_encode(["success" => true, "id" => $geofenceId]);
        break;

    case 'PUT':
        $id = $body['id'] ?? null;
        $name = trim($body['name'] ?? '');
        $lat = $body['center_lat'] ?? null;
        $lng = $body['center_lng'] ?? null;
        $radius = $body['radius_meters'] ?? null;
        $address = $body['address'] ?? null;

        if (!$id || !$name || $lat === null || $lng === null || $radius === null) {
            http_response_code(400);
            echo json_encode(["error" => "id, name, center_lat, center_lng, and radius_meters are required"]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT id FROM geofences WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "You don't own this geofence"]);
            exit();
        }

        $stmt = $pdo->prepare(
            "UPDATE geofences SET name = ?, center_lat = ?, center_lng = ?, address = ?, radius_meters = ? WHERE id = ?"
        );
        $stmt->execute([$name, $lat, $lng, $address, $radius, $id]);
        echo json_encode(["success" => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "id query parameter required"]);
            exit();
        }
        $stmt = $pdo->prepare("DELETE FROM geofences WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user['id']]);
        echo json_encode(["success" => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
