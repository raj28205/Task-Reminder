import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

/**
 * Watches the browser's GPS position and pushes updates to the Python
 * geofence engine. Returns the latest known position + any errors, so the
 * map can center on the user and show tracking status.
 */
export function useGeoTracking(enabled) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't supported by this browser.");
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        try {
          const result = await api.sendLocation(latitude, longitude);
          if (result.entered_geofences?.length) {
            // The NotificationsPanel poll will pick up the actual notification
            // record, but this gives instant feedback too.
            console.log("Entered:", result.entered_geofences);
          }
        } catch (e) {
          console.error("Failed to send location:", e.message);
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled]);

  return { position, error };
}
