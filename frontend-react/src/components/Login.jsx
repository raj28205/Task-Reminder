import { useState, useEffect } from "react";
import { api } from "../api/client";
import { requestFcmToken } from "../firebase";

const SLIDES = [
  {
    image: "/geofence_map_bg.jpg",
    title: "Geofence Radar Reminders",
    subtitle: "Never forget a task when arriving at your destination."
  },
  {
    image: "/location_tracking_bg.jpg",
    title: "Real-time GPS Monitoring",
    subtitle: "Set smart geofences for your location-aware tasks."
  },
  {
    image: "/reminders_dashboard_bg.jpg",
    title: "Dynamic Alerts & Tasks",
    subtitle: "Get instant alerts and stay on top of your workflow."
  }
];

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot_request" | "forgot_verify"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register(form.name, form.email, form.phone, form.password);
        setMode("login");
        setSuccess("Account created — now log in.");
      } else {
        const result = await api.login(form.email, form.password);
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        onLoggedIn(result.user);

        // Register this browser's push token in the background — login
        // shouldn't fail or wait on this if permission is denied.
        requestFcmToken()
          .then((fcmToken) => {
            if (fcmToken) return api.registerDeviceToken(fcmToken);
          })
          .catch((e) => console.warn("Push registration skipped:", e));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOTP(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.requestOTP(resetIdentifier);
      setSuccess("OTP sent to your email/phone.");
      setMode("forgot_verify");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleVerifyOTPClick(e) {
    e.preventDefault();
    if (otp.length === 6) {
      setError("");
      setShowPasswordModal(true);
    } else {
      setError("Please enter a 6-digit OTP.");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPasswordWithOTP(resetIdentifier, otp, newPassword);
      setSuccess("Password updated successfully! Please log in.");
      setMode("login");
      setShowPasswordModal(false);
      setResetIdentifier("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-container">
      {/* Left Column: Solid Login Panel */}
      <div className="auth-left-panel">
        <div className="auth-content-box">
          <div className="auth-brand-header">
            <div className="auth-brand-logo">
              <img src="/favicon.png" alt="Logo" />
            </div>
            <h1 className="auth-brand-title">Task Reminder</h1>
          </div>

          {/* 1. Login Mode */}
          {mode === "login" && (
            <form className="auth-card" onSubmit={handleSubmit}>
              <h2>Log in</h2>
              {success && <p style={{ color: "var(--accent-teal)", fontSize: "0.85rem", margin: "0" }}>{success}</p>}
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={update("password")}
                  required
                />
              </div>
              
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: "0.85rem", alignSelf: "flex-end", marginTop: "-0.5rem" }}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("forgot_request");
                }}
              >
                Forgot password?
              </button>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Please wait…" : "Log in"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("register");
                }}
              >
                Need an account? Register
              </button>
            </form>
          )}

          {/* 2. Register Mode */}
          {mode === "register" && (
            <form className="auth-card" onSubmit={handleSubmit}>
              <h2>Create account</h2>
              <div className="input-group">
                <label>Name</label>
                <input placeholder="Name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={update("email")}
                  required
                />
              </div>
              <div className="input-group">
                <label>Phone (optional)</label>
                <input
                  placeholder="Phone (for SMS alerts, optional)"
                  value={form.phone}
                  onChange={update("phone")}
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={update("password")}
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Please wait…" : "Create account"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("login");
                }}
              >
                Already have an account? Log in
              </button>
            </form>
          )}

          {/* 3. Forgot Password - Request OTP Mode */}
          {mode === "forgot_request" && (
            <form className="auth-card" onSubmit={handleRequestOTP}>
              <h2>Reset Password</h2>
              <p>
                Enter your registered email address or phone number and we'll send you an OTP to reset your password.
              </p>
              <div className="input-group">
                <label>Email or Phone</label>
                <input
                  type="text"
                  placeholder="Enter your email or phone number"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Sending OTP…" : "Send OTP"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("login");
                }}
              >
                Back to Login
              </button>
            </form>
          )}

          {/* 4. Forgot Password - Verify OTP Mode */}
          {mode === "forgot_verify" && (
            <form className="auth-card" onSubmit={handleVerifyOTPClick}>
              <h2>Verify OTP</h2>
              {success && <p style={{ color: "var(--accent-teal)", fontSize: "0.85rem", margin: "0" }}>{success}</p>}
              
              <div className="input-group">
                <label>Email or Phone</label>
                <input
                  type="text"
                  placeholder="Email or Phone"
                  value={resetIdentifier}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
              <div className="input-group">
                <label>6-digit OTP</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Please wait…" : "Verify OTP"}
              </button>

              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("login");
                }}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Background Slideshow */}
      <div className="auth-right-slider">
        {SLIDES.map((slide, idx) => (
          <div 
            key={idx}
            className={`auth-slide ${currentSlide === idx ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
        <div className="auth-slider-overlay"></div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(11, 15, 25, 0.85)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <form className="auth-card" style={{ background: "var(--bg-secondary)", padding: "2rem", borderRadius: "12px", width: "90%", maxWidth: "350px", border: "1px solid var(--border-color)", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }} onSubmit={handleResetPassword}>
            <h2 style={{ marginBottom: "1rem" }}>Set New Password</h2>
            <div className="input-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="auth-error" style={{ marginTop: "0.5rem" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
            <button type="button" className="link-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}
