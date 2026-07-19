"""
Sends notifications when a user enters a geofence. Email is ready to go
with any SMTP provider; SMS uses Twilio (pip install twilio) — both fail
gracefully (log + skip) if not configured, so the app still runs without them.
"""

import smtplib
from email.mime.text import MIMEText
import concurrent.futures

# Push notification helper
from push_utils import send_push_notification

from config import SMTP_CONFIG, TWILIO_CONFIG


def send_email(to_address: str, subject: str, body: str) -> bool:
    if not SMTP_CONFIG["user"] or not SMTP_CONFIG["password"]:
        print(">>> NOTIFY DEBUG: SMTP not configured — skipping email")
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_CONFIG["from_address"]
    msg["To"] = to_address

    try:
        with smtplib.SMTP(SMTP_CONFIG["host"], SMTP_CONFIG["port"]) as server:
            server.starttls()
            server.login(SMTP_CONFIG["user"], SMTP_CONFIG["password"])
            server.sendmail(SMTP_CONFIG["from_address"], [to_address], msg.as_string())
        return True
    except Exception as e:
        print(f">>> NOTIFY DEBUG: Email send failed: {e}")
        return False


def send_sms(to_number: str, body: str) -> bool:
    if not TWILIO_CONFIG["account_sid"] or not TWILIO_CONFIG["auth_token"]:
        print(">>> NOTIFY DEBUG: Twilio not configured — skipping SMS")
        return False

    try:
        from twilio.rest import Client  # pip install twilio

        client = Client(TWILIO_CONFIG["account_sid"], TWILIO_CONFIG["auth_token"])
        client.messages.create(
            body=body, from_=TWILIO_CONFIG["from_number"], to=to_number
        )
        return True
    except Exception as e:
        print(f">>> NOTIFY DEBUG: SMS send failed: {e}")
        return False


def notify_enter_event(cursor, user: dict, event: dict):
    print(f">>> NOTIFY DEBUG: Entering notify_enter_event for user={user.get('email')} phone={user.get('phone')}")
    geofence = event["geofence"]
    work_items = event["work_items"]

    if work_items:
        task_list = "\n".join(f"- {w['title']}" for w in work_items)
        message = (
            f"You've entered '{geofence['name']}'. "
            f"Reminders for this area:\n{task_list}"
        )
    else:
        message = f"You've entered '{geofence['name']}'. No pending tasks here."

    subject = f"Arrived at {geofence['name']}"
    push_title = subject
    push_body = message

    sent_via = []

    def _do_email():
        print(">>> NOTIFY DEBUG: _do_email started.")
        if not int(user.get("pref_email", 1)):
            print(">>> NOTIFY DEBUG: User opted out of Email.")
            return None

        if user.get("email"):
            try:
                print(f">>> NOTIFY DEBUG: Calling send_email for {user['email']}")
                if send_email(user["email"], subject, message):
                    print(">>> NOTIFY DEBUG: send_email returned True")
                    return "email"
                else:
                    print(">>> NOTIFY DEBUG: send_email returned False")
            except Exception as e:
                print(f">>> NOTIFY DEBUG: Email thread EXCEPTION: {e}")
        else:
            print(">>> NOTIFY DEBUG: No email address on user dict.")
        return None

    def _do_sms():
        print(">>> NOTIFY DEBUG: _do_sms started.")
        if not int(user.get("pref_sms", 1)):
            print(">>> NOTIFY DEBUG: User opted out of SMS.")
            return None

        phone = user.get("phone")
        if phone:
            # Twilio requires E.164 format (must include country code).
            # Auto-format 10-digit Indian numbers since you're likely testing in India.
            if len(phone) == 10 and phone.isdigit():
                phone = f"+91{phone}"
            elif not str(phone).startswith("+"):
                phone = f"+{phone}"

            try:
                print(f">>> NOTIFY DEBUG: Calling send_sms for {phone}")
                if send_sms(phone, message):
                    print(">>> NOTIFY DEBUG: send_sms returned True")
                    return "sms"
                else:
                    print(">>> NOTIFY DEBUG: send_sms returned False")
            except Exception as e:
                print(f">>> NOTIFY DEBUG: SMS thread EXCEPTION: {e}")
        else:
            print(">>> NOTIFY DEBUG: No phone number on user dict.")
        return None

    def _do_push():
        print(">>> NOTIFY DEBUG: _do_push started.")
        if not int(user.get("pref_browser", 1)):
            print(">>> NOTIFY DEBUG: User opted out of Push Notifications.")
            return None

        try:
            print(f">>> NOTIFY DEBUG: Calling send_push_notification for user_id={user['id']}")
            if send_push_notification(user["id"], push_title, push_body):
                print(">>> NOTIFY DEBUG: send_push_notification returned True")
                return "push"
            else:
                print(">>> NOTIFY DEBUG: send_push_notification returned False")
        except Exception as e:
            print(f">>> NOTIFY DEBUG: Push thread EXCEPTION: {e}")
        return None

    print(">>> NOTIFY DEBUG: Starting ThreadPoolExecutor...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_email = executor.submit(_do_email)
        f_sms = executor.submit(_do_sms)
        f_push = executor.submit(_do_push)

        print(">>> NOTIFY DEBUG: Waiting for futures to complete...")
        for future in concurrent.futures.as_completed([f_email, f_sms, f_push]):
            try:
                res = future.result()
                print(f">>> NOTIFY DEBUG: A future completed with result: {res}")
                if res:
                    sent_via.append(res)
            except Exception as e:
                print(f">>> NOTIFY DEBUG: Future result EXCEPTION: {e}")

    work_item_id = work_items[0]["id"] if work_items else None
    sent_via_str = ",".join(sent_via) if sent_via else "none"
    print(f">>> NOTIFY DEBUG: All futures done. sent_via_str='{sent_via_str}'. Writing to DB...")
    
    try:
        cursor.execute(
            """INSERT INTO notifications (user_id, geofence_id, work_item_id, message, sent_via)
               VALUES (%s, %s, %s, %s, %s)""",
            (user["id"], geofence["id"], work_item_id, message, sent_via_str),
        )
        print(">>> NOTIFY DEBUG: INSERT INTO notifications successful.")
    except Exception as e:
        print(f">>> NOTIFY DEBUG: INSERT INTO notifications EXCEPTION: {e}")
