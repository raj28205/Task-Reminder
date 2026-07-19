<?php
require_once 'config.php';
// We need auth? The geocode could be authenticated just to be safe.
$user = require_auth($pdo);

$address = $_GET['q'] ?? '';

if (!$address) {
    http_response_code(400);
    echo json_encode(["error" => "Address query parameter 'q' is required"]);
    exit();
}

$url = "https://nominatim.openstreetmap.org/search?q=" . urlencode($address) . "&format=json&limit=1";

$options = [
    "http" => [
        "header" => "User-Agent: GeofenceReminderApp/1.0 (antigravity@example.com)\r\n"
    ]
];
$context = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to contact geocoding service."]);
    exit();
}

$data = json_decode($response, true);

if (empty($data)) {
    http_response_code(404);
    echo json_encode(["error" => "Could not find that address. Try being more specific."]);
    exit();
}

$result = $data[0];

echo json_encode([
    "lat" => (float)$result['lat'],
    "lng" => (float)$result['lon'],
    "display_name" => $result['display_name']
]);
