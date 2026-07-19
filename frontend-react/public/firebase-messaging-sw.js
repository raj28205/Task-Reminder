// This file must be served from the site root (public/ in Vite) so its
// scope covers the whole origin. It handles pushes that arrive while the
// app is closed or in the background.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Must match the config in src/firebase.js
firebase.initializeApp({
  apiKey: "AIzaSyC7-9XNkOEQfV8bqkKfN-n3RhBo9HaZRE8",
  authDomain: "task-reminder-643fa.firebaseapp.com",
  projectId: "task-reminder-643fa",
  storageBucket: "task-reminder-643fa.firebasestorage.app",
  messagingSenderId: "359168705281",
  appId: "1:359168705281:web:1a19750079059bedc7d100",
  measurementId: "G-PRY4Z341V0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Geofence alert", {
    body: body || "",
    icon: "/favicon.png",
  });
});
