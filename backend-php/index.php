<?php
header("Content-Type: application/json");

echo json_encode([
    "status" => "success",
    "message" => "Geofence Task Reminder PHP API is running!",
    "time" => date("Y-m-d H:i:s")
]);