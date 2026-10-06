import './styles.css';
import './foundation.css';
import {
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase.js';
import { appVersionLabel } from './app-version.js';
import { largePalm } from './import-status.js';

const authRoot = document.querySelector('#auth-root');
const accountBar = document.querySelector('#account-bar');
const appRoot = document.querySelector('#app');
const LOCAL_DATA_KEY = 'family-trips-alpha-0.2';
// 0.7.2: a not-yet-migrated Trip's data is still this legacy localStorage blob (LOCAL_DATA_KEY),
// but a Trip already on Firestore has no such blob at all -- its offline availability now comes
// from Firestore's own persistent local cache (src/firebase.js), with ACTIVE_TRIP_KEY as the
// signal that this device has a real Trip to resume (must match v5-app.js's own ACTIVE_TRIP_KEY
// constant -- duplicated here rather than imported, the same way LOCAL_DATA_KEY/v5-app.js's KEY
// have always been two independent literals for the same value, since main.js loads before
// v5-app.js is ever imported and cannot depend on it upfront).
const ACTIVE_TRIP_KEY = 'family-trips-active-trip';
let appLoaded = false;
let currentUser = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}

function hasLocalTrip() {
  return Boolean(localStorage.getItem(LOCAL_DATA_KEY) || localStorage.getItem(ACTIVE_TRIP_KEY));
}

function renderLogin(message = '') {
  currentUser = null;
  accountBar.hidden = true;
  appRoot.innerHTML = '';
  authRoot.innerHTML = `
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="auth-title">
        <img class="auth-logo" src="/assets/icons/icon-192.png" alt="">
        <p class="auth-kicker"><bdi>${appVersionLabel()}</bdi></p>
        <h1 id="auth-title">Family Trips</h1>
        <p>התחברות מאובטחת באמצעות חשבון Google למשתמשים מוזמנים בלבד.</p>
        ${message ? `<p class="auth-error" role="alert">${escapeHtml(message)}</p>` : ''}
        <button class="btn auth-button" id="google-sign-in" type="button">התחברות עם Google</button>
        <p class="auth-note">נתוני הטיול והמקורות נשמרים מקומית במכשיר. ניתוח חכם מתבצע רק לאחר אישור מפורש.</p>
      </section>
    </main>`;
  document.querySelector('#google-sign-in')?.addEventListener('click', handleSignIn);
}

async function handleSignIn() {
  const button = document.querySelector('#google-sign-in');
  if (button) renderPalm('מתחבר…');
  try { await signInWithPopup(auth, googleProvider); }
  catch (error) {
    const fallbacks = new Set(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment']);
    if (fallbacks.has(error?.code)) { await signInWithRedirect(auth, googleProvider); return; }
    renderLogin('ההתחברות נכשלה. נסה שוב.');
    console.error('Google sign-in failed', error);
  }
}

// Beta 0.8 Phase 1: the design spec's own 5-item bottom nav (design spec S3) has no Settings
// slot -- this gear button, always visible in the account bar, is the replacement entry point.
// account-bar is rendered by this module, entirely separate from v5-app.js's own state/routing,
// so it can't call route('settings') directly; it dispatches a plain DOM event instead, the same
// bridge pattern this file already uses for 'online'/'offline'. v5-app.js listens for it once
// booted (see its own 'familytrips:open-settings' listener).
const SETTINGS_ICON = '<svg viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>';
function accountMarkup(user) {
  const offline = !navigator.onLine;
  const name = user?.displayName || (offline ? 'מצב אופליין' : 'משתמש');
  const detail = user?.email || (offline ? 'הנתונים המקומיים זמינים' : '');
  return `
    <div class="account-bar-inner">
      <span class="account-person">
        ${user?.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="">` : ''}
        <span><b>${escapeHtml(name)}</b><small>${escapeHtml(detail)}</small></span>
      </span>
      <span class="account-actions">
        <button id="account-settings" class="account-settings" type="button" aria-label="הגדרות">${SETTINGS_ICON}</button>
        <button id="sign-out" class="account-sign-out" type="button" ${offline ? 'disabled aria-describedby="offline-sign-out-note"' : ''}>יציאה</button>
        ${offline ? '<small id="offline-sign-out-note" class="account-offline-note" role="status">יציאה זמינה רק בחיבור לאינטרנט; הסשן המקומי נשמר.</small>' : ''}
      </span>
    </div>`;
}

async function handleSignOut() {
  if (!navigator.onLine) {
    const note = document.querySelector('#offline-sign-out-note');
    if (note) note.textContent = 'אין חיבור לאינטרנט. היציאה נחסמה והטיול המקומי נשאר זמין.';
    return;
  }
  await signOut(auth);
  location.reload();
}

async function renderApplication(user = null) {
  currentUser = user;
  authRoot.innerHTML = '';
  accountBar.hidden = false;
  accountBar.innerHTML = accountMarkup(user);
  document.querySelector('#sign-out')?.addEventListener('click', handleSignOut);
  document.querySelector('#account-settings')?.addEventListener('click', () => {
    dispatchEvent(new CustomEvent('familytrips:open-settings'));
  });
  if (!appLoaded) { appLoaded = true; await import('./v5-app.js'); }
}

async function renderSignedIn(user) {
  await renderApplication(user);
}

async function renderOfflineSession() {
  await renderApplication(currentUser);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service Worker registration failed', error);
  }
}

// Beta 0.8 Phase 2.1 (P2-F2): the swaying palm is the app's one "in process" display -- large and floating for every
// full-screen wait (app start / refresh, sign-in), replacing the old blank screen and hourglass.
function renderPalm(phrase) {
  authRoot.innerHTML = `<main class="auth-page"><div class="palm-screen">${largePalm({ phrases: [phrase] })}</div></main>`;
}

async function start() {
  if (!authRoot.innerHTML.trim()) renderPalm('טוען…');
  const serviceWorkerReady = registerServiceWorker();

  // Local data must render before Firebase/authentication performs network work -- but 0.7.2's
  // boot() (v5-app.js) needs auth.currentUser populated to know which Trip to open, since Trip
  // data itself now lives in Firestore's own offline cache, not a single localStorage blob whose
  // presence alone used to be enough. Restoring an already-persisted session from IndexedDB is a
  // LOCAL operation, not network work, so it must still run here -- unlike getRedirectResult()
  // (irrelevant to a returning user, and can itself require network) or subscribing to the live,
  // ongoing onAuthStateChanged stream (only this cold launch's first, already-cached state is
  // needed; 'online'/'offline' listeners below already handle re-rendering on a real change).
  // Real bug, caught by the Product Owner's own live acceptance testing (Test 8): without this,
  // the app rendered its empty initial state on every offline cold launch, silently discarding the
  // last-saved Trip that Firestore's own local cache still genuinely had -- a direct violation of
  // the frozen "installed PWA and last saved Trip available on first cold Offline launch" invariant
  // (ARCHITECTURE_CURRENT_STATE.md).
  if (!navigator.onLine && hasLocalTrip()) {
    try { await setPersistence(auth, browserLocalPersistence); } catch (error) { console.error('Offline auth restore failed', error); }
    await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); currentUser = user; resolve(); });
    });
    await renderOfflineSession();
    return;
  }

  await serviceWorkerReady;
  try { await setPersistence(auth, browserLocalPersistence); await getRedirectResult(auth); }
  catch (error) { console.error('Authentication initialization failed', error); }
  onAuthStateChanged(auth, (user) => {
    if (user) renderSignedIn(user);
    else if (!navigator.onLine && hasLocalTrip()) renderOfflineSession();
    else renderLogin();
  });
}

window.addEventListener('offline', () => {
  if (appLoaded || hasLocalTrip()) renderApplication(currentUser);
});
window.addEventListener('online', () => {
  if (!currentUser && hasLocalTrip()) location.reload();
  else if (appLoaded) renderApplication(currentUser);
});

start();
