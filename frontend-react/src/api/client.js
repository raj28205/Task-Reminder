// Two base URLs: PHP (XAMPP) for CRUD, Python (Flask) for live location.
const PYTHON_BASE = "https://task-reminder-python.onrender.com";
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // --- Auth (PHP) ---
  register: (name, email, phone, password) =>
    request(PHP_BASE, "/auth.php?action=register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    }),

  login: (email, password) =>
    request(PHP_BASE, "/auth.php?action=login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  requestOTP: (identifier) =>
    request(PHP_BASE, "/auth.php?action=request_otp", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),

  resetPasswordWithOTP: (identifier, otp, new_password) =>
    request(PHP_BASE, "/auth.php?action=reset_password_otp", {
      method: "POST",
      body: JSON.stringify({ identifier, otp, new_password }),
    }),

  // --- Auth (PHP) Update Profile ---
  updateProfile: (name, email, phone) =>
    request(PHP_BASE, "/auth.php?action=update_profile", {
      method: "POST",
      body: JSON.stringify({ name, email, phone }),
    }),

  // --- Geofences (PHP) ---
  getGeofences: () => request(PHP_BASE, "/geofences.php"),
  geocodeAddress: (address) => request(PHP_BASE, `/geocode.php?q=${encodeURIComponent(address)}`),
  bulkCreateGeofences: (items) =>
    request(PHP_BASE, "/geofences.php", {
      method: "POST",
      body: JSON.stringify({ bulk: items }),
    }),
  createGeofence: (name, center_lat, center_lng, radius_meters, address = null) =>
    request(PHP_BASE, "/geofences.php", {
      method: "POST",
      body: JSON.stringify({ name, center_lat, center_lng, radius_meters, address }),
    }),
  updateGeofence: (id, name, center_lat, center_lng, radius_meters, address = null) =>
    request(PHP_BASE, "/geofences.php?action=update", {
      method: "POST",
      body: JSON.stringify({ id, name, center_lat, center_lng, radius_meters, address }),
    }),
  deleteGeofence: (id) =>
    request(PHP_BASE, `/geofences.php?id=${id}`, { method: "DELETE" }),

  // --- Work items (PHP) ---
  createWorkItem: (geofence_id, title, description) =>
    request(PHP_BASE, "/work_items.php", {
      method: "POST",
      body: JSON.stringify({ geofence_id, title, description }),
    }),
  bulkCreateWorkItems: (geofence_id, items) =>
    request(PHP_BASE, "/work_items.php", {
      method: "POST",
      body: JSON.stringify({ geofence_id, bulk: items }),
    }),
  toggleWorkItem: (id, is_done) =>
    request(PHP_BASE, "/work_items.php", {
      method: "PUT",
      body: JSON.stringify({ id, is_done }),
    }),
  deleteWorkItem: (id) =>
    request(PHP_BASE, `/work_items.php?id=${id}`, { method: "DELETE" }),


  // --- Notifications (PHP) ---
  getNotifications: () => request(PHP_BASE, "/notifications.php"),
  markNotificationRead: (id) =>
    request(PHP_BASE, "/notifications.php", {
      method: "PUT",
      body: JSON.stringify({ id }),
    }),

  // --- Live location (Python) ---
  sendLocation: (lat, lng) =>
    request(PYTHON_BASE, "/api/location", {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),

  // --- Push notifications (PHP) ---
  registerDeviceToken: (device_token) =>
    request(PHP_BASE, "/register_token.php", {
      method: "POST",
      body: JSON.stringify({ device_token }),
    }),
};
