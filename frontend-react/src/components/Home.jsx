import React from "react";

export default function HomeView({ 
  user, 
  geofences,
  notifications, 
  totalGeofences, 
  pendingTasks, 
  totalTasks, 
  markRead,
  locationPings,
  handleToggleTask
}) {
  return (
    <div className="dashboard-summary">
      {/* Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h3>Welcome back, {user.name}!</h3>
          <p>Radar engine is active. Draw geofences and attach reminders to automate your workflow.</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Geofences</span>
          <span className="stat-val">{totalGeofences}</span>
        </div>
        <div className="stat-card teal">
          <span className="stat-label">Pending Tasks</span>
          <span className="stat-val">{pendingTasks} / {totalTasks}</span>
        </div>
        <div className="stat-card amber">
          <span className="stat-label">Unread Alerts</span>
          <span className="stat-val">{notifications.length}</span>
        </div>
        <div className="stat-card red">
          <span className="stat-label">GPS Logs</span>
          <span className="stat-val" style={{ fontSize: "1.3rem", paddingTop: "0.6rem" }}>
            {locationPings.length > 0 ? "Tracking Active" : "No GPS Active"}
          </span>
        </div>
      </div>

      {/* Main split sections */}
      <div className="dashboard-sections">
        {/* Left Side: Notification Feed */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h4>Active Notifications Feed</h4>
            <span className="hint">Polled every 8s</span>
          </div>

          <div className="feed-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>No active unread reminder notifications.</p>
                <p style={{ fontSize: "0.78rem" }}>Walk into a geofence to trigger reminders.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="feed-item unread">
                  <div className="feed-item-content">
                    <div className="feed-item-header">
                      <span className="feed-title">{n.geofence_name} Alert</span>
                      <span className="feed-time">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="feed-desc">{n.message}</p>
                  </div>
                  <button className="feed-dismiss-btn" onClick={() => markRead(n.id)}>Dismiss</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Quick tasks check / GPS logs */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h4>Geofence Reminders List</h4>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
            {geofences.length === 0 ? (
              <p className="hint">No geofences created yet. Head to Settings to add one.</p>
            ) : (
              geofences.map(g => (
                <div key={g.id} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.8rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--accent-teal)" }}>{g.name}</span>
                  {g.work_items?.length === 0 ? (
                    <p className="hint" style={{ margin: "0.2rem 0 0 0.5rem" }}>No tasks attached.</p>
                  ) : (
                    g.work_items.map(w => (
                      <label key={w.id} className="inline-task-item" style={{ cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={!!w.is_done} 
                          onChange={() => handleToggleTask(w.id, !!w.is_done)}
                        />
                        <span style={{ textDecoration: w.is_done ? "line-through" : "none", color: w.is_done ? "var(--text-muted)" : "var(--text-primary)" }}>
                          {w.title}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
