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

    // Check if input is Email or Phone
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
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
    } else {
        // Assume it's a Phone Number, Send SMS via Twilio
        // Read credentials securely from Python backend's .env file if available
        $envPath = __DIR__ . '/../backend-python/.env';
        if (file_exists($envPath)) {
            $env = parse_ini_file($envPath);
            $twilio_sid = $env['TWILIO_ACCOUNT_SID'] ?? '';
            $twilio_token = $env['TWILIO_AUTH_TOKEN'] ?? '';
            $twilio_from = $env['TWILIO_FROM_NUMBER'] ?? '';
        } else {
            // Fallback (Update manually on live server)
            $twilio_sid = 'YOUR_TWILIO_SID';
            $twilio_token = 'YOUR_TWILIO_TOKEN';
            $twilio_from = 'YOUR_TWILIO_FROM_NUMBER';
        }
        
        // Format phone (assuming India +91 if not provided)
        $phone_to = $email;
        if (strlen($phone_to) == 10 && is_numeric($phone_to)) {
            $phone_to = '+91' . $phone_to;
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/$twilio_sid/Messages.json";
        $post_data = http_build_query([
            'From' => $twilio_from,
            'To' => $phone_to,
            'Body' => "Your OTP for password reset is: $otp. It is valid for 15 minutes."
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
        curl_setopt($ch, CURLOPT_USERPWD, "$twilio_sid:$twilio_token");
        // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Uncomment if SSL issues occur locally

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code == 201) {
            echo json_encode(["message" => "If an account with that phone number exists, an OTP has been sent."]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to send SMS."]);
        }
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
