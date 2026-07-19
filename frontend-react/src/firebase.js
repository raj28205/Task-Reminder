import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Get these values from Firebase Console -> Project settings -> General
// -> "Your apps" -> Web app -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7-9XNkOEQfV8bqkKfN-n3RhBo9HaZRE8",
  authDomain: "task-reminder-643fa.firebaseapp.com",
  projectId: "task-reminder-643fa",
  storageBucket: "task-reminder-643fa.firebasestorage.app",
  messagingSenderId: "359168705281",
  appId: "1:359168705281:web:1a19750079059bedc7d100",
  measurementId: "G-PRY4Z341V0"
};

const firebaseApp = initializeApp(firebaseConfig);

// Get this from Firebase Console -> Project settings -> Cloud Messaging
// -> "Web configuration" -> Web Push certificates -> Key pair
const VAPID_KEY = "BLoG_HQbEIbBEAZlbny-AE_ZSwbOwqSvhAYexR1HcTCUQH2Gz7W7lE8zj76FHYxjSQ-4mdt1BCS7zKczN0AEimw";

export async function requestFcmToken() {
  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Notification permission not granted:", permission);
    return null;
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );
  // register() can resolve before the worker is actually active — wait
  // for it, or getToken's push subscription will fail intermittently.
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(firebaseApp);

  async function tryGetToken() {
    return getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  }

  try {
    const token = await tryGetToken();
    return token || null;
  } catch (e) {
    // Known first-load race in the Firebase SDK: the service worker
    // registers but isn't fully "active" yet when the push subscription
    // call fires. Wait a beat and retry once.
    if (e.name === "AbortError") {
      console.warn("FCM token fetch hit the known first-load race, retrying…");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const token = await tryGetToken();
        return token || null;
      } catch (e2) {
        console.error("Failed to get FCM token on retry:", e2);
        return null;
      }
    }
    console.error("Failed to get FCM token:", e);
    return null;
  }
}
