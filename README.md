# Geofence Reminders

A location-based reminder app: draw geofence areas on a map, attach work
items/reminders to each area, and get notified (email/SMS + in-app) the
moment you physically enter that area.

## Architecture

```
┌─────────────────┐        ┌──────────────────┐
│  React frontend  │──GPS──▶│  Python (Flask)  │──▶ MySQL (geofence_status,
│  (Vite, Leaflet) │        │  geofence engine  │    notifications, pings)
└────────┬─────────┘        └──────────────────┘
         │                            │
         │  CRUD (auth, geofences,    ▼
         │  work items, notif poll) Email (SMTP) / SMS (Twilio)
         ▼
┌──────────────────┐
│  PHP (XAMPP)      │──▶ same MySQL DB (geofence_app)
│  REST API          │
└──────────────────┘
```

- **PHP (XAMPP + MySQL)**: user accounts, geofence CRUD, work item CRUD,
  notification list for the frontend to poll. Stateless REST-ish endpoints,
  simple bearer-token auth.
- **Python (Flask)**: receives GPS pings from the browser, runs the
  haversine distance check against every geofence, detects outside→inside
  transitions, and fires email/SMS notifications.
- **React**: map UI (Leaflet — no API key needed), forms to create
  geofences and reminders, a GPS-tracking toggle using the browser's
  Geolocation API, and a notification toast poller.

Both backends talk to the **same MySQL database** — PHP owns the schema,
Python just reads/writes existing tables.

## 1. Database (XAMPP)

1. Start XAMPP, enable Apache + MySQL.
2. Open phpMyAdmin (`http://localhost/phpmyadmin`) → Import →
   `backend-php/db_schema.sql`. This creates the `geofence_app` database and
   all tables.

## 2. PHP backend (XAMPP)

1. Copy the whole `backend-php/` folder into `C:/xampp/htdocs/geofence_api`
   (or the equivalent htdocs path on your OS).
2. Visit `http://localhost/geofence_api/auth.php?action=register` — if you
   get a JSON error response (not a blank/500 page), it's wired up correctly.
3. Default XAMPP MySQL credentials (`root` / empty password) are already
   set in `config.php`. Change them there if yours differ.

## 3. Python service (Flask)

```bash
cd backend-python
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

To enable real email/SMS, set environment variables before running:

```bash
export SMTP_USER=you@gmail.com
export SMTP_PASSWORD=your_app_password   # Gmail: use an App Password, not your real password
export TWILIO_ACCOUNT_SID=xxxx
export TWILIO_AUTH_TOKEN=xxxx
export TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

Without these set, the app still runs — it just logs "not configured" and
skips that channel, always falling back to logging an in-app notification.

## 4. React frontend

```bash
cd frontend-react
npm install
npm run dev
```

Runs on `http://localhost:5173`. Open it, register an account, log in.

## How to use it

1. **Register / log in.**
2. **Click the map** to drop a pending geofence center point.
3. **Fill in the "New geofence area" form** (name + radius) and save —
   this becomes a circle on the map.
4. **Add a work item/reminder**, choosing which geofence it belongs to.
5. **Turn on "GPS tracking"** (top right). Your browser will ask for
   location permission — accept it, and keep the tab open/foregrounded on
   your phone.
6. Walk (or spoof your location in dev tools) into a geofence circle — the
   Python service detects the outside→inside transition and:
   - inserts a notification (shows as a toast in the app within ~8s), and
   - sends an email/SMS if configured.

## Known limitations to fix before real use

- **Auth is a minimal bearer-token scheme**, not JWT — fine for
  learning/prototyping, replace with `firebase/php-jwt` (via Composer)
  before anything production-facing.
- **Browser tab must stay open** for GPS tracking to keep firing
  (`watchPosition` pauses when the tab is backgrounded on most mobile
  browsers). For real background tracking you'd need a native/PWA wrapper
  with background location permissions.
- **CORS origins are hardcoded** to `localhost:5173` — update
  `config.php` and `app.py` when you deploy to a real domain.
- **No rate limiting** on the `/api/location` endpoint — a compromised or
  buggy client could hammer it. Add throttling before going live.
- **Passwords/tokens over HTTP** — this all needs to run over HTTPS once
  it's not just localhost.
"# Task-Reminder" 
"# Task-Reminder" 
"# Task-Reminder" 
