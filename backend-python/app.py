"""
Python GPS tracking + geofence service.

Run separately from XAMPP/PHP: this is its own Flask server (e.g. port 5000).
React sends browser GPS coordinates here on an interval; this checks them
against the user's geofences and fires notifications on entry.

Run with: python app.py
"""

from dotenv import load_dotenv
load_dotenv()  # must run before importing anything that reads os.environ at import time

import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

from db import get_connection
from geofence_engine import process_location_update
from notifier import notify_enter_event

def delayed_notify(user_id, user_dict, enter_events):
    """Wait 10 seconds, then check if user is still inside to fire notifications."""
    print(f">>> NOTIFY DEBUG: delayed_notify started for user_id={user_id} with {len(enter_events)} events.")
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            for event in enter_events:
                geofence_id = event["geofence"]["id"]
                print(f">>> NOTIFY DEBUG: Checking geofence_status for geofence_id={geofence_id}")
                cursor.execute(
                    "SELECT status FROM geofence_status WHERE user_id = %s AND geofence_id = %s",
                    (user_id, geofence_id)
                )
                row = cursor.fetchone()
                print(f">>> NOTIFY DEBUG: DB returned status: {row['status'] if row else 'None'}")
                if row and row["status"] == "inside":
                    print(f">>> NOTIFY DEBUG: User still inside {event['geofence']['name']}, calling notify_enter_event...")
                    notify_enter_event(cursor, user_dict, event)
                    print(f">>> NOTIFY DEBUG: Returned from notify_enter_event for {event['geofence']['name']}")
                else:
                    print(f">>> NOTIFY DEBUG: User left {event['geofence']['name']}, skipping notifications.")
            conn.commit()
            print(f">>> NOTIFY DEBUG: DB commit successful in delayed_notify.")
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        print(f">>> NOTIFY DEBUG: delayed_notify EXCEPTION: {e}")

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])  # Vite dev server


def get_user_by_token(cursor, token: str):
    cursor.execute("SELECT * FROM users WHERE session_token = %s", (token,))
    return cursor.fetchone()


@app.route("/api/location", methods=["POST"])
def receive_location():
    """
    Body: { "lat": 23.03, "lng": 72.58 }
    Header: Authorization: Bearer <token>  (same token PHP's login issued)
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing Authorization header"}), 401
    token = auth_header.split(" ", 1)[1]

    data = request.get_json(silent=True) or {}
    lat, lng = data.get("lat"), data.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng are required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        user = get_user_by_token(cursor, token)
        if not user:
            return jsonify({"error": "Invalid or expired session"}), 401

        # Optional: log the raw ping for a breadcrumb-trail map layer
        cursor.execute(
            "INSERT INTO location_pings (user_id, lat, lng) VALUES (%s, %s, %s)",
            (user["id"], lat, lng),
        )

        enter_events = process_location_update(cursor, user["id"], lat, lng)

        if enter_events:
            print(f">>> NOTIFY DEBUG: Spawning Timer for {len(enter_events)} enter events.")
            # Spawn a background timer for the 10-second confirmation delay
            t = threading.Timer(10.0, delayed_notify, args=(user["id"], dict(user), list(enter_events)))
            t.start()
            print(f">>> NOTIFY DEBUG: Timer started successfully (is_alive={t.is_alive()}).")

        conn.commit()

        return jsonify({
            "status": "ok",
            "entered_geofences": [e["geofence"]["name"] for e in enter_events],
        })

    finally:
        cursor.close()
        conn.close()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "running"})


if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)
