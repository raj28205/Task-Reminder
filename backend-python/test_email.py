from dotenv import load_dotenv
load_dotenv()
import smtplib
from email.mime.text import MIMEText
import os

msg = MIMEText("This is a test email from the geofence app.")
msg["Subject"] = "Test Email"
msg["From"] = os.getenv("SMTP_FROM")
msg["To"] = os.getenv("SMTP_FROM")  # sending to yourself

with smtplib.SMTP(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))) as server:
    server.starttls()
    server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
    server.send_message(msg)

print("Email sent!")