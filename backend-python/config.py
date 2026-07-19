import os

# Same MySQL database the PHP backend connects to.
# Reads from environment variables so this can point at either your local
# XAMPP database or a remote one (like Aiven) depending on .env — falls
# back to local XAMPP defaults if the env vars aren't set.
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 3306)),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASS", ""),  # default XAMPP root password is empty
    "database": os.environ.get("DB_NAME", "geofence_app"),
}

# If a CA certificate exists (needed for SSL connections to Aiven), add it.
_ca_path = os.path.join(os.path.dirname(__file__), "ca.pem")
if os.path.exists(_ca_path):
    DB_CONFIG["ssl_ca"] = _ca_path
    DB_CONFIG["ssl_verify_cert"] = True

# Email (SMTP) — e.g. Gmail with an App Password, or any SMTP provider
SMTP_CONFIG = {
    "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
    "port": int(os.environ.get("SMTP_PORT", 587)),
    "user": os.environ.get("SMTP_USER", ""),
    "password": os.environ.get("SMTP_PASSWORD", ""),
    "from_address": os.environ.get("SMTP_FROM", "noreply@example.com"),
}

# SMS via Twilio — sign up at twilio.com, get these from the console
TWILIO_CONFIG = {
    "account_sid": os.environ.get("TWILIO_ACCOUNT_SID", ""),
    "auth_token": os.environ.get("TWILIO_AUTH_TOKEN", ""),
    "from_number": os.environ.get("TWILIO_FROM_NUMBER", ""),
}