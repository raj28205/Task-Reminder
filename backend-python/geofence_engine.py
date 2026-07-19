"""
Core geofence logic: distance calculation + enter/exit detection.

This is intentionally separate from the Flask route handlers so it can be
unit-tested and reused (e.g. from a background worker instead of a live request).
"""

import math


def haversine_distance_meters(lat1, lng1, lat2, lng2) -> float:
    """Great-circle distance between two lat/lng points, in meters."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def is_inside_geofence(user_lat, user_lng, geofence: dict) -> bool:
    """geofence needs keys: center_lat, center_lng, radius_meters."""
    distance = haversine_distance_meters(
        user_lat, user_lng, geofence["center_lat"], geofence["center_lng"]
    )
    return distance <= geofence["radius_meters"]


def process_location_update(cursor, user_id: int, lat: float, lng: float) -> list[dict]:
    """
    Checks the user's new position against ALL of their geofences.
    Returns a list of ENTER events (dicts with geofence + work_items) that
    just happened, so the caller can send notifications for them.

    Only fires on the outside->inside transition — repeated pings while
    already inside don't re-trigger anything.
    """
    cursor.execute("SELECT * FROM geofences WHERE user_id = %s", (user_id,))
    geofences = cursor.fetchall()

    enter_events = []

    for geofence in geofences:
        cursor.execute(
            "SELECT status FROM geofence_status WHERE user_id = %s AND geofence_id = %s",
            (user_id, geofence["id"]),
        )
        row = cursor.fetchone()
        previous_status = row["status"] if row else "outside"

        currently_inside = is_inside_geofence(lat, lng, geofence)
        new_status = "inside" if currently_inside else "outside"

        if new_status != previous_status:
            cursor.execute(
                """INSERT INTO geofence_status (user_id, geofence_id, status)
                   VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE status = %s""",
                (user_id, geofence["id"], new_status, new_status),
            )

        if previous_status == "outside" and new_status == "inside":
            cursor.execute(
                "SELECT * FROM work_items WHERE geofence_id = %s AND is_done = FALSE",
                (geofence["id"],),
            )
            work_items = cursor.fetchall()
            enter_events.append({"geofence": geofence, "work_items": work_items})

    return enter_events
