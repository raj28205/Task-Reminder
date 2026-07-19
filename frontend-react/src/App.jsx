import { useEffect, useState, useCallback } from "react";
import Login from "./components/Login";
import MapView from "./components/MapView";
import HomeView from "./components/Home";
import SettingsView from "./components/Settings";
import ProfileView from "./components/Profile";
import { useGeoTracking } from "./hooks/useGeoTracking";
import { api } from "./api/client";
import "./App.css";

// SVG Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const MapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
);
const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [markerTheme, setMarkerTheme] = useState(() => {
    return localStorage.getItem("markerTheme") || "arrow";
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("appTheme") || "light";
  });
  const [customLogo, setCustomLogo] = useState(() => {
    return localStorage.getItem("customLogo") || "default";
  });

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  const [activeTab, setActiveTab] = useState("home"); // home | map | settings | profile
  const [geofences, setGeofences] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [trackingOn, setTrackingOn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locationPings, setLocationPings] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const [profilePic, setProfilePic] = useState(() => {
    return localStorage.getItem("userProfilePic") || "";
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  // GPS watch hook
  const { position, error: gpsError } = useGeoTracking(trackingOn);

  // Sync tracking position history
  useEffect(() => {
    if (position) {
      setLocationPings((prev) => [
        { lat: position.lat, lng: position.lng, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4)
      ]);
    }
  }, [position]);

  const refreshGeofences = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getGeofences();
      setGeofences(data);
    } catch (e) {
      console.error(e.message);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error("Failed to fetch notifications:", e.message);
    }
  }, [user]);

  // Poll notifications
  useEffect(() => {
    refreshGeofences();
    refreshNotifications();
    let interval = setInterval(refreshNotifications, 8000);
    return () => clearInterval(interval);
  }, [refreshGeofences, refreshNotifications]);

  function handleMapClick(lat, lng) {
    setPendingPoint({ lat, lng, radius: 150 });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setTrackingOn(false);
    setActiveTab("home");
  }

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      refreshNotifications();
    } catch (e) {
      console.error(e.message);
    }
  };

  const handleToggleTask = async (taskId, isCurrentlyDone) => {
    try {
      await api.toggleWorkItem(taskId, !isCurrentlyDone);
      refreshGeofences();
    } catch (e) {
      console.error("Failed to toggle work item:", e.message);
    }
  };

  if (!user) return <Login onLoggedIn={setUser} />;

  // Calculate statistics
  const totalGeofences = geofences.length;
  const totalTasks = geofences.reduce((acc, curr) => acc + (curr.work_items?.length || 0), 0);
  const pendingTasks = geofences.reduce((acc, curr) => 
    acc + (curr.work_items?.filter(w => !w.is_done).length || 0), 0
  );

  const renderLogo = () => {
    if (customLogo === "default") {
      return <div className="radar-logo"></div>;
    }
    if (customLogo === "globe") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      );
    }
    if (customLogo === "map") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      );
    }
    if (customLogo === "briefcase") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      );
    }
    if (customLogo.startsWith("data:image/")) {
      return <img src={customLogo} className="custom-sidebar-logo" alt="Custom Logo" />;
    }
    return <div className="radar-logo"></div>;
  };

  return (
    <div className="app-shell">
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}
      
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isSidebarOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-left">
              {renderLogo()}
              {!isSidebarCollapsed && <h1>Task Reminder</h1>}
            </div>
            <button className="sidebar-collapse-toggle" onClick={toggleSidebarCollapse} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
              {isSidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              )}
            </button>
            <button className="mobile-menu-close" onClick={() => setIsSidebarOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <ul className="nav-menu">
            <li 
              className={`nav-item ${activeTab === "home" ? "active" : ""}`} 
              onClick={() => { setActiveTab("home"); setIsSidebarOpen(false); }}
              title={isSidebarCollapsed ? "Home" : ""}
            >
              <HomeIcon /> {!isSidebarCollapsed && <span>Home</span>}
            </li>
            <li 
              className={`nav-item ${activeTab === "map" ? "active" : ""}`} 
              onClick={() => { setActiveTab("map"); setIsSidebarOpen(false); }}
              title={isSidebarCollapsed ? "Full Map" : ""}
            >
              <MapIcon /> {!isSidebarCollapsed && <span>Full Map</span>}
            </li>
            <li 
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`} 
              onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }}
              title={isSidebarCollapsed ? "Settings" : ""}
            >
              <SettingsIcon /> {!isSidebarCollapsed && <span>Settings</span>}
            </li>
            <li 
              className={`nav-item ${activeTab === "profile" ? "active" : ""}`} 
              onClick={() => { setActiveTab("profile"); setIsSidebarOpen(false); }}
              title={isSidebarCollapsed ? "Profile" : ""}
            >
              <UserIcon /> {!isSidebarCollapsed && <span>Profile</span>}
            </li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <div className="user-snippet" title={isSidebarCollapsed ? `${user.name} (${user.email})` : ""}>
            <div className="user-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profilePic ? (
                <img src={profilePic} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user.name ? user.name[0].toUpperCase() : "U"
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="user-details">
                <span className="user-name-snippet">{user.name}</span>
                <span className="user-email-snippet">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header bar with GPS tracking controls */}
        <header className="view-header">
          <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h2>
            {activeTab === "home" && "Dashboard Home"}
            {activeTab === "map" && "Geofences Map"}
            {activeTab === "settings" && "Radar Settings"}
            {activeTab === "profile" && "Profile Details"}
          </h2>
          <div className="gps-tracking-bar">
            {gpsError && <span className="auth-error" style={{ padding: "0.4rem 0.8rem" }}>GPS Error: {gpsError}</span>}
            <div className="switch-container">
              {trackingOn && <span className="gps-pulse-dot"></span>}
              <span>Live GPS tracking</span>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={trackingOn} 
                  onChange={(e) => setTrackingOn(e.target.checked)} 
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </header>

        {/* Dynamic View Body */}
        <div className="view-body" style={{ padding: activeTab === "map" ? "0" : "2rem" }}>
          {activeTab === "home" && (
            <HomeView 
              user={user}
              geofences={geofences}
              notifications={notifications}
              totalGeofences={totalGeofences}
              pendingTasks={pendingTasks}
              totalTasks={totalTasks}
              markRead={markRead}
              locationPings={locationPings}
              handleToggleTask={handleToggleTask}
            />
          )}

          {activeTab === "map" && (
            <div className="map-view-container">
              <MapView 
                geofences={geofences}
                userPosition={position}
                pendingPoint={pendingPoint}
                onMapClick={handleMapClick}
                markerTheme={markerTheme}
              />
              <div className="map-control-overlay">
                <button className="map-btn" onClick={refreshGeofences}>Refresh Radar</button>
                {pendingPoint && (
                  <button 
                    className="map-btn" 
                    style={{ background: "var(--accent-amber)", color: "#1e293b" }} 
                    onClick={() => {
                      setActiveTab("settings");
                    }}
                  >
                    Create Geofence at Pin
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <SettingsView 
              geofences={geofences} 
              pendingPoint={pendingPoint}
              setPendingPoint={setPendingPoint}
              refreshGeofences={refreshGeofences}
              userPosition={position}
              markerTheme={markerTheme}
            />
          )}

          {activeTab === "profile" && (
            <ProfileView 
              user={user} 
              setUser={setUser} 
              handleLogout={handleLogout} 
              markerTheme={markerTheme}
              setMarkerTheme={setMarkerTheme}
              theme={theme}
              setTheme={setTheme}
              profilePic={profilePic}
              setProfilePic={setProfilePic}
            />
          )}
        </div>
      </main>
    </div>
  );
}
