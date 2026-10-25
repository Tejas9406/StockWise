import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isConfigured = Boolean(
  apiKey &&
  apiKey.trim() !== '' &&
  !apiKey.includes('your-') &&
  apiKey !== 'undefined'
);

let app = null;
let auth = null;

if (isConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (err) {
    console.warn('[Firebase] Client initialization skipped or failed:', err.message);
    auth = null;
  }
} else {
  console.info('[Firebase] VITE_FIREBASE_API_KEY not configured. Running with native backend JWT authentication.');
}

export {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};

export default auth;
