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

// qa-only debug hook, requested directly for Test 5 of the 0.7.2 acceptance session (server-side
// rule enforcement): this app uses the modern modular Firebase SDK, which has no global
// `firebase`/`db` object for DevTools to reach on its own -- every prior "open the console and try
// a raw Firestore call" attempt hit that tooling gap, not a rules result. Gated on the deployed
// origin, not a build-time flag, since qa and Production share the exact same build artifact (the
// whole point of promoting the untouched qa-tested dist/ output, never a separate rebuild) -- a
// build-time env var could not tell them apart at runtime the way this can. Never exposed on
// Production. Usage from the qa DevTools console:
//   const {doc,getDoc} = await import('firebase/firestore');
//   await getDoc(doc(__ft.db,'trips','someTripIdNotOwnedOrShared'));  // should reject
if (typeof location !== 'undefined' && location.hostname.startsWith('qa--')) {
  window.__ft = { auth, db, storage };
  console.info('[qa debug] window.__ft = {auth, db, storage} -- see src/firebase.js for usage.');
}

