<?php
require_once 'config.php';

// Self-healing database check: Auto-append OTP columns if missing
try {
    $pdo->query("SELECT otp_code, otp_expiry FROM users LIMIT 1");
} catch (PDOException $e) {
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN otp_code VARCHAR(6) DEFAULT NULL");
        $pdo->exec("ALTER TABLE users ADD COLUMN otp_expiry DATETIME DEFAULT NULL");
    } catch (PDOException $ex) {}
}

try {
    $pdo->query("SELECT pref_browser FROM users LIMIT 1");
} catch (PDOException $e) {
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN pref_browser BOOLEAN DEFAULT TRUE");
        $pdo->exec("ALTER TABLE users ADD COLUMN pref_sms BOOLEAN DEFAULT TRUE");
        $pdo->exec("ALTER TABLE users ADD COLUMN pref_email BOOLEAN DEFAULT TRUE");
    } catch (PDOException $ex) {}
}

function send_sms($phone, $otp_code) {
    // TODO: Integrate real SMS provider (e.g., Twilio, MSG91) here.
    // For now, log the OTP to server error log for local debugging.
    error_log("Mock SMS to {$phone}: Your OTP is {$otp_code}");
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents("php://input"), true);

if (($method === 'PUT') || ($method === 'POST' && $action === 'update_profile')) {
    $user = require_auth($pdo);
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $pref_browser = isset($body['pref_browser']) ? (int)(bool)$body['pref_browser'] : 1;
    $pref_sms = isset($body['pref_sms']) ? (int)(bool)$body['pref_sms'] : 1;
    $pref_email = isset($body['pref_email']) ? (int)(bool)$body['pref_email'] : 1;

    if (!$name || !$email) {
        http_response_code(400);
        echo json_encode(["error" => "name and email are required"]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, phone = ?, pref_browser = ?, pref_sms = ?, pref_email = ? WHERE id = ?");
        $stmt->execute([$name, $email, $phone, $pref_browser, $pref_sms, $pref_email, $user['id']]);
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $user['id'], 
                "name" => $name, 
                "email" => $email, 
                "phone" => $phone,
                "pref_browser" => (bool)$pref_browser,
                "pref_sms" => (bool)$pref_sms,
                "pref_email" => (bool)$pref_email
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(["error" => "Email already in use"]);
    }
    exit();
}

if ($method === 'POST' && $action === 'register') {
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $password = $body['password'] ?? '';

    if (!$name || !$email || !$password) {
        http_response_code(400);
        echo json_encode(["error" => "name, email, and password are required"]);
        exit();
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $phone, $hash]);
        echo json_encode(["success" => true, "user_id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(["error" => "Email already registered"]);
    }
    exit();
}

if ($method === 'POST' && $action === 'login') {
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid email or password"]);
        exit();
    }

    $token = bin2hex(random_bytes(32));
    $update = $pdo->prepare("UPDATE users SET session_token = ? WHERE id = ?");
    $update->execute([$token, $user['id']]);

    echo json_encode([
        "success" => true,
        "token" => $token,
        "user" => [
            "id" => $user['id'], 
            "name" => $user['name'], 
            "email" => $user['email'], 
            "phone" => $user['phone'],
            "pref_browser" => (bool)($user['pref_browser'] ?? true),
            "pref_sms" => (bool)($user['pref_sms'] ?? true),
            "pref_email" => (bool)($user['pref_email'] ?? true)
        ],
    ]);
    exit();
}

if ($method === 'POST' && $action === 'request_otp') {
    $identifier = trim($body['identifier'] ?? '');

    if (!$identifier) {
        http_response_code(400);
        echo json_encode(["error" => "Email or phone is required"]);
        exit();
    }

    $stmt = $pdo->prepare("SELECT id, email, phone FROM users WHERE email = ? OR phone = ?");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "No account found with this email or phone number"]);
        exit();
    }

    // Generate 6-digit OTP
    $otp_code = (string)rand(100000, 999999);
    // Expiry: 10 minutes from now
    $otp_expiry = date('Y-m-d H:i:s', time() + 600);

    $update = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expiry = ? WHERE id = ?");
    $update->execute([$otp_code, $otp_expiry, $user['id']]);

    // Determine if identifier is an email or phone number (simple check)
    if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
        // Send email using native mail() function (errors are suppressed with @)
        $to = $identifier;
        $subject = "Task Reminder - Reset Password OTP";
        $message = "Your OTP for resetting password is: $otp_code. This OTP is valid for 10 minutes.";
        $headers = "From: no-reply@taskreminder.com\r\nReply-To: no-reply@taskreminder.com\r\n";
        @mail($to, $subject, $message, $headers);
    } else {
        // Send SMS
        send_sms($identifier, $otp_code);
    }

    echo json_encode([
        "success" => true,
        "message" => "OTP sent successfully"
    ]);
    exit();
}

if ($method === 'POST' && $action === 'reset_password_otp') {
    $identifier = trim($body['identifier'] ?? '');
    $otp = trim($body['otp'] ?? '');
    $new_password = $body['new_password'] ?? '';

    if (!$identifier || !$otp || !$new_password) {
        http_response_code(400);
        echo json_encode(["error" => "identifier, otp, and new_password are required"]);
        exit();
    }

    $stmt = $pdo->prepare("SELECT id, otp_code, otp_expiry FROM users WHERE email = ? OR phone = ?");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "No account found with this email"]);
        exit();
    }

    $current_time = date('Y-m-d H:i:s');
    
    if (!$user['otp_code'] || $user['otp_code'] !== $otp || $user['otp_expiry'] < $current_time) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid or expired OTP"]);
        exit();
    }

    // OTP is valid! Reset password.
    $new_hash = password_hash($new_password, PASSWORD_BCRYPT);
    $update = $pdo->prepare("UPDATE users SET password_hash = ?, otp_code = NULL, otp_expiry = NULL WHERE id = ?");
    $update->execute([$new_hash, $user['id']]);

    echo json_encode([
        "success" => true,
        "message" => "Password updated successfully"
    ]);
    exit();
}

http_response_code(404);
echo json_encode(["error" => "Unknown action. Use ?action=register or ?action=login"]);
