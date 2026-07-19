import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

export default function ProfileView({ 
  user, 
  setUser, 
  handleLogout, 
  markerTheme, 
  setMarkerTheme, 
  theme, 
  setTheme, 
  profilePic,
  setProfilePic
}) {
  const [profileName, setProfileName] = useState(user.name || "");
  const [profileEmail, setProfileEmail] = useState(user.email || "");
  const [profilePhone, setProfilePhone] = useState(user.phone || "");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Avatar Modal & Webcam states
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showIllustrations, setShowIllustrations] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);

  const PRESET_ILLUSTRATIONS = [
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%236366f1'/><circle cx='50' cy='45' r='20' fill='white'/><rect x='40' y='65' width='20' height='15' rx='5' fill='white'/><circle cx='50' cy='45' r='16' fill='%231e1b4b'/><path d='M38 45a12 12 0 0 1 24 0Z' fill='%233b82f6'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2310b981'/><path d='M30 30h40v40H30z' fill='none' stroke='white' strokeWidth='4'/><circle cx='50' cy='50' r='10' fill='%23f59e0b'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ec4899'/><text x='50' y='60' font-family='monospace' font-size='32' font-weight='bold' fill='white' text-anchor='middle'>&lt;/&gt;</text></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f59e0b'/><circle cx='50' cy='50' r='20' fill='none' stroke='white' strokeWidth='6'/><circle cx='50' cy='50' r='10' fill='white'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2306b6d4'/><circle cx='50' cy='50' r='25' fill='none' stroke='white' strokeWidth='4'/><path d='M50 30 L58 50 L50 70 L42 50 Z' fill='%23ef4444'/></svg>",
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%238b5cf6'/><path d='M50 25 C65 25 70 30 70 45 C70 65 50 75 50 75 C50 75 30 65 30 45 C30 30 35 25 50 25 Z' fill='white'/></svg>"
  ];

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
      }, 100);
    } catch (err) {
      setCameraError("Could not access webcam. Make sure permissions are granted.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setProfilePic(dataUrl);
      localStorage.setItem("userProfilePic", dataUrl);
      stopCamera();
      setShowWebcam(false);
      setIsAvatarModalOpen(false);
    }
  };

  const closeModal = () => {
    stopCamera();
    setShowWebcam(false);
    setShowIllustrations(false);
    setIsAvatarModalOpen(false);
  };

  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // FAQ state
  const [openFaqIdx, setOpenFaqIdx] = useState(null);



  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await api.updateProfile(profileName, profileEmail, profilePhone);
      localStorage.setItem("user", JSON.stringify(result.user));
      setUser(result.user);
      setSuccess("Profile settings updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const toggleFaq = (idx) => {
    setOpenFaqIdx(openFaqIdx === idx ? null : idx);
  };

  const faqs = [
    {
      q: "How does geofence event tracking work?",
      a: "When GPS tracking is toggled on, the React frontend watches your browser coordinates and pings them to the Python service. The Python engine computes the Great-Circle distance to your active geofences and detects if you transitioned from OUTSIDE to INSIDE. When that happens, it logs a notification which the React app pulls."
    },
    {
      q: "How do I edit or delete an existing geofence?",
      a: "Go to Settings -> '2. Update / Delete Geofence'. Select the geofence you want to edit. You can modify its name, coordinates, radius, or delete it permanently."
    },
    {
      q: "What is the bulk upload format?",
      a: "In Settings tab 3, you can upload a CSV file where column 1 is the Task Title and column 2 is the Description. Or, paste line-by-line in the textbox using the vertical pipe: 'Title | Description' format."
    },
    {
      q: "Why are my location alerts not firing?",
      a: "Ensure that: 1) GPS tracking is toggled ON, 2) browser location access is granted, 3) the Python Flask server is running at port 5000, and 4) you physically cross or spoof your GPS coordinate into the geofence radius boundary."
    }
  ];

  return (
    <div className="profile-layout">
      {/* Profile Details */}
      <div className="profile-card">
        <div className="profile-avatar-row">
          <div 
            className="profile-avatar-wrapper" 
            onClick={() => setIsAvatarModalOpen(true)}
            style={{ cursor: "pointer", position: "relative" }}
            title="Click to change profile picture"
          >
            <div className="profile-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profilePic ? (
                <img src={profilePic} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profileName ? profileName[0].toUpperCase() : "U"
              )}
            </div>
            <div className="avatar-edit-overlay">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </div>
          </div>
          <div>
            <h4 className="profile-title-name">{profileName}</h4>
            <p className="profile-title-role">Task Reminder Member</p>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <form onSubmit={handleProfileUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="form-group">
            <label>Name / Username</label>
            <input 
              value={profileName} 
              onChange={(e) => setProfileName(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email"
              value={profileEmail} 
              onChange={(e) => setProfileEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Phone Number (SMS alerts)</label>
            <input 
              placeholder="+1234567890"
              value={profilePhone} 
              onChange={(e) => setProfilePhone(e.target.value)} 
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Updating..." : "Save Profile Settings"}
          </button>
        </form>
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.2rem" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Map Marker Theme</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.8rem", marginTop: "0.5rem" }}>
            <div 
              className={`theme-selection-card ${markerTheme === "arrow" ? "active" : ""}`}
              onClick={() => {
                setMarkerTheme("arrow");
                localStorage.setItem("markerTheme", "arrow");
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ filter: "drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3))" }}>
                <path d="M12 3l8 18-8-6-8 6z" fill="#6366f1" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>Navigation</span>
            </div>

            <div 
              className={`theme-selection-card ${markerTheme === "pulse" ? "active" : ""}`}
              onClick={() => {
                setMarkerTheme("pulse");
                localStorage.setItem("markerTheme", "pulse");
              }}
            >
              <div style={{ width: "12px", height: "12px", background: "#10b981", border: "2px solid white", borderRadius: "50%", boxShadow: "0 0 6px #10b981", margin: "6px 0" }}></div>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>Pulse Dot</span>
            </div>

            <div 
              className={`theme-selection-card ${markerTheme === "pin" ? "active" : ""}`}
              onClick={() => {
                setMarkerTheme("pin");
                localStorage.setItem("markerTheme", "pin");
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5"/>
              </svg>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>Classic Pin</span>
            </div>
          </div>
        </div>



        <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.2rem" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "0.5rem" }} className="theme-card-title">App Theme Options</h4>
          <div className="theme-cards-grid">
            <div 
              className={`theme-selection-card ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <div className="theme-preview-dots">
                <span className="theme-preview-dot" style={{ background: "#0b0f19" }}></span>
                <span className="theme-preview-dot" style={{ background: "#161f30" }}></span>
                <span className="theme-preview-dot" style={{ background: "#6366f1" }}></span>
              </div>
              <span className="theme-card-title">Dark Mode</span>
            </div>

            <div 
              className={`theme-selection-card ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
            >
              <div className="theme-preview-dots">
                <span className="theme-preview-dot" style={{ background: "#f8fafc" }}></span>
                <span className="theme-preview-dot" style={{ background: "#ffffff" }}></span>
                <span className="theme-preview-dot" style={{ background: "#4f46e5" }}></span>
              </div>
              <span className="theme-card-title">Light Mode</span>
            </div>
          </div>
        </div>

        <div className="logout-row">
          <button className="danger-btn" style={{ width: "100%" }} onClick={handleLogout}>Log Out Session</button>
        </div>
      </div>

      {/* Customer Services Side Panel */}
      <div className="customer-service-card">
        <h3>Customer Services Support</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>Frequently Asked Questions</h4>
          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(idx)}>
                  <span>{faq.q}</span>
                  <span>{openFaqIdx === idx ? "▲" : "▼"}</span>
                </button>
                {openFaqIdx === idx && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* Change Profile Picture Modal */}
      {isAvatarModalOpen && (
        <div className="avatar-modal-backdrop" onClick={closeModal}>
          <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-modal-header">
              <h3>Change profile picture</h3>
              <button className="avatar-modal-close" onClick={closeModal} title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {!showWebcam && !showIllustrations ? (
              <>
                <div className="avatar-modal-preview-wrapper">
                  <div className="avatar-modal-preview">
                    {profilePic ? (
                      <img src={profilePic} alt="Avatar Preview" />
                    ) : (
                      profileName ? profileName[0].toUpperCase() : "U"
                    )}
                  </div>
                </div>

                <div className="avatar-modal-options">
                  <button className="avatar-option-item" onClick={() => setShowIllustrations(true)}>
                    <div className="avatar-option-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <span>Browse illustrations</span>
                  </button>

                  <label className="avatar-option-item" style={{ cursor: "pointer" }}>
                    <div className="avatar-option-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <span>Upload from device</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setProfilePic(evt.target.result);
                            localStorage.setItem("userProfilePic", evt.target.result);
                            closeModal();
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <button className="avatar-option-item" onClick={() => { setShowWebcam(true); startCamera(); }}>
                    <div className="avatar-option-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    <span>Take a picture</span>
                  </button>

                  {profilePic && (
                    <button className="avatar-option-item danger" onClick={() => { setProfilePic(""); localStorage.removeItem("userProfilePic"); closeModal(); }}>
                      <div className="avatar-option-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </div>
                      <span>Remove current picture</span>
                    </button>
                  )}
                </div>
              </>
            ) : showWebcam ? (
              <div className="avatar-webcam-panel">
                <div className="webcam-view-wrapper">
                  {cameraError ? (
                    <p className="camera-error">{cameraError}</p>
                  ) : (
                    <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  )}
                </div>
                <div className="webcam-actions">
                  {!cameraError && (
                    <button className="primary-btn" onClick={capturePhoto}>Capture Photo</button>
                  )}
                  <button className="secondary-btn" onClick={() => { stopCamera(); setShowWebcam(false); }}>Back</button>
                </div>
              </div>
            ) : (
              <div className="avatar-illustrations-panel">
                <h4>Choose an illustration</h4>
                <div className="illustrations-grid">
                  {PRESET_ILLUSTRATIONS.map((ill, idx) => (
                    <div 
                      key={idx} 
                      className="illustration-item" 
                      onClick={() => {
                        setProfilePic(ill);
                        localStorage.setItem("userProfilePic", ill);
                        closeModal();
                      }}
                    >
                      <img src={ill} alt={`Illustration ${idx}`} />
                    </div>
                  ))}
                </div>
                <button className="secondary-btn" style={{ marginTop: "1rem" }} onClick={() => setShowIllustrations(false)}>Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
