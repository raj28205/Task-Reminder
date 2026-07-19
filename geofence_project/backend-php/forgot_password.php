<?php
require_once __DIR__ . '/config.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(["error" => "Email is required"]);
    exit();
}

try {
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->rowCount() === 0) {
        // To prevent email enumeration, return success even if not found
        echo json_encode(["message" => "If an account with that email exists, an OTP has been sent."]);
        exit();
    }

    // Generate 6-digit OTP
    $otp = sprintf("%06d", mt_rand(1, 999999));
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // Save to database
    $stmt = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?");
    $stmt->execute([$otp, $expires_at, $email]);

    // Send Email
    $subject = "Your Password Reset OTP";
    $message = "Your OTP for password reset is: $otp\nIt is valid for 15 minutes.";
    $headers = "From: noreply@yourdomain.com\r\n";
    $headers .= "Reply-To: noreply@yourdomain.com\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    if (mail($email, $subject, $message, $headers)) {
        echo json_encode(["message" => "If an account with that email exists, an OTP has been sent."]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to send email. Please try again later."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
