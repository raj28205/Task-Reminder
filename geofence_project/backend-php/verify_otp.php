<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';
$otp = $data['otp'] ?? '';

if (empty($email) || empty($otp)) {
    http_response_code(400);
    echo json_encode(["error" => "Email and OTP are required"]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()");
    $stmt->execute([$email, $otp]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["message" => "OTP verified successfully"]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or expired OTP"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
