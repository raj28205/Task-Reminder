import os
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

# The old "https://fcm.googleapis.com/fcm/send" + server-key API was
# shut down by Google in June 2024. This uses the current FCM HTTP v1 API,
# authenticated with a Firebase service-account JSON file (OAuth2).
SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

_cached_credentials = None


def _get_access_token() -> str:
    """Loads the service-account file (only once) and returns a fresh OAuth2 token."""
    global _cached_credentials
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not key_path or not os.path.exists(key_path):
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_PATH is missing or points to a file that "
            "doesn't exist. Set it in .env to the path of your downloaded "
            "service-account JSON key."
        )
    if _cached_credentials is None:
        _cached_credentials = service_account.Credentials.from_service_account_file(
            key_path, scopes=SCOPES
        )
    _cached_credentials.refresh(google.auth.transport.requests.Request())
    return _cached_credentials.token


def send_push_notification(user_id: int, title: str, body: str) -> bool:
    """Send a Firebase Cloud Messaging push (HTTP v1 API) to the user's device token.
    Assumes a MySQL `users` table with a `device_token` column.
    """
    from db import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT device_token FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        if not row or not row[0]:
            # No token registered – nothing to push
            return False
        token = row[0]

        project_id = os.getenv("FIREBASE_PROJECT_ID")
        if not project_id:
            print(">>> NOTIFY DEBUG: FIREBASE_PROJECT_ID not set – skipping push")
            return False

        try:
            access_token = _get_access_token()
        except RuntimeError as e:
            print(f">>> NOTIFY DEBUG: {e}")
            return False

        url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        payload = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
                "data": {"user_id": str(user_id)},
            }
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            return True
        print(f">>> NOTIFY DEBUG: FCM send failed: {resp.status_code} {resp.text}")
        return False
    finally:
        cursor.close()
        conn.close()
