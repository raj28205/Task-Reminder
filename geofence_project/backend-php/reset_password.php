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
$new_password = $data['new_password'] ?? '';

if (empty($email) || empty($otp) || empty($new_password)) {
    http_response_code(400);
    echo json_encode(["error" => "Email, OTP, and new password are required"]);
    exit();
}

try {
    // Verify OTP again before resetting
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()");
    $stmt->execute([$email, $otp]);

    if ($stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or expired OTP"]);
        exit();
    }

    // Hash the new password (assumes password_hash is used for login too)
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

    // Update password and clear OTP
    $updateStmt = $pdo->prepare("UPDATE users SET password = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?");
    $updateStmt->execute([$hashed_password, $email]);

    echo json_encode(["message" => "Password has been reset successfully"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
