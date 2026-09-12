import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, initializeFirestore, persistentLocalCache, persistentSingleTabManager, updateDoc } from 'firebase/firestore';
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
// a raw Firestore call" attempt hit that tooling gap, not a rules result. The first version of this
// hook (raw auth/db/storage instances only) hit a second, subtler tooling gap on the Product
// Owner's own live retest: a separately, freshly imported copy of `firebase/firestore` (e.g. via a
// CDN dynamic import() in DevTools) is a DIFFERENT module instance than the one already bundled
// into this app, and the modular SDK's own internal type checks reject a reference built from one
// copy against a Firestore instance from another ("Expected first argument to collection() to be a
// CollectionReference...") -- an SDK-instance-mismatch artifact, not a rules result. Fixed by
// exposing ready-made helpers bound to this bundle's own already-imported doc/getDoc/updateDoc, so
// no separate import is ever needed. Gated on the deployed origin, not a build-time flag, since qa
// and Production share the exact same build artifact (the whole point of promoting the untouched
// qa-tested dist/ output, never a separate rebuild) -- a build-time env var could not tell them
// apart at runtime the way this can. Never exposed on Production. Usage from the qa DevTools
// console, Test 5's exact scenario (a Trip neither owned nor shared) -- both calls are expected to
// reject with a permission error:
//   await __ft.tryGetTrip('someTripIdNotOwnedOrShared');
//   await __ft.tryWriteTrip('someTripIdNotOwnedOrShared');
if (typeof location !== 'undefined' && location.hostname.startsWith('qa--')) {
  window.__ft = {
    auth, db, storage,
    tryGetTrip: async (tripId) => {
      try {
        const snapshot = await getDoc(doc(db, 'trips', tripId));
        return { exists: snapshot.exists(), data: snapshot.exists() ? snapshot.data() : null };
      } catch (error) {
        return { rejected: true, code: error.code, message: error.message };
      }
    },
    tryWriteTrip: async (tripId) => {
      try {
        await updateDoc(doc(db, 'trips', tripId), { __qaDebugProbe: new Date().toISOString() });
        return { wrote: true };
      } catch (error) {
        return { rejected: true, code: error.code, message: error.message };
      }
    },
  };
  console.info('[qa debug] window.__ft = {auth, db, storage, tryGetTrip, tryWriteTrip} -- see src/firebase.js for usage.');
}

