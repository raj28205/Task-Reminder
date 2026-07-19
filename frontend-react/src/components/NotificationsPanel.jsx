import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let interval;
    async function poll() {
      try {
        const data = await api.getNotifications();
        setNotifications(data);
      } catch (e) {
        console.error("Failed to fetch notifications:", e.message);
      }
    }
    poll();
    interval = setInterval(poll, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, []);

  async function dismiss(id) {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  if (notifications.length === 0) return null;

  return (
    <div className="toast-stack">
      {notifications.map((n) => (
        <div key={n.id} className="toast">
          <strong>{n.geofence_name}</strong>
          <p>{n.message}</p>
          <button onClick={() => dismiss(n.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}
