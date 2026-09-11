import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
// 0.7.2: persistent offline cache, single-tab (this PWA has never supported multiple
// simultaneously-open tabs against the same local data, so multi-tab listener coordination would
// be new complexity with no existing use case behind it) -- re-verifies the frozen "installed PWA
// and last saved Trip are available on the first cold Offline launch" invariant
// (ARCHITECTURE_CURRENT_STATE.md) against Firestore's own offline behavior rather than assuming
// it transfers automatically. See docs/versions/V7/0.7.2/DESIGN_V1.md §4.3.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
});
export const storage = getStorage(firebaseApp);

