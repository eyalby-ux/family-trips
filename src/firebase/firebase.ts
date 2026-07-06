import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

type FirebaseConfigKey =
  | "VITE_FIREBASE_API_KEY"
  | "VITE_FIREBASE_AUTH_DOMAIN"
  | "VITE_FIREBASE_PROJECT_ID"
  | "VITE_FIREBASE_STORAGE_BUCKET"
  | "VITE_FIREBASE_MESSAGING_SENDER_ID"
  | "VITE_FIREBASE_APP_ID"
  | "VITE_FIREBASE_MEASUREMENT_ID";

const requiredEnvKeys: FirebaseConfigKey[] = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
];

function getRequiredEnvValue(key: FirebaseConfigKey) {
  const value = import.meta.env[key];

  if (!value || value === "undefined") {
    throw new Error(
      `Missing Firebase environment variable: ${key}. Check .env locally and Netlify Environment variables.`
    );
  }

  return value;
}

function validateFirebaseEnv() {
  const missingKeys = requiredEnvKeys.filter((key) => {
    const value = import.meta.env[key];
    return !value || value === "undefined";
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missingKeys.join(", ")}`
    );
  }
}

validateFirebaseEnv();

const firebaseConfig = {
  apiKey: getRequiredEnvValue("VITE_FIREBASE_API_KEY"),
  authDomain: getRequiredEnvValue("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredEnvValue("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredEnvValue("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredEnvValue("VITE_FIREBASE_APP_ID"),
  measurementId: getRequiredEnvValue("VITE_FIREBASE_MEASUREMENT_ID"),
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
