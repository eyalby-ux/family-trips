import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Loaded from a build-time env var (set in the Netlify UI) so the key is not
  // committed to source. Firebase web config is public by design, but the value
  // matches Netlify's secret-scanning patterns, so it is kept out of the repo.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "family-trips-9aef4.firebaseapp.com",
  projectId: "family-trips-9aef4",
  storageBucket: "family-trips-9aef4.firebasestorage.app",
  messagingSenderId: "615876704416",
  appId: "1:615876704416:web:69c55743d6f499319b31c5",
  measurementId: "G-J4RS16JD93",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
