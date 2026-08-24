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

const authRoot = document.querySelector('#auth-root');
const accountBar = document.querySelector('#account-bar');
const appRoot = document.querySelector('#app');
const LOCAL_DATA_KEY = 'family-trips-alpha-0.2';
let appLoaded = false;
let currentUser = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}

function hasLocalTrip() {
  return Boolean(localStorage.getItem(LOCAL_DATA_KEY));
}

function renderLogin(message = '') {
  currentUser = null;
  accountBar.hidden = true;
  appRoot.innerHTML = '';
  authRoot.innerHTML = `
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="auth-title">
        <img class="auth-logo" src="/assets/icons/icon-192.png" alt="">
        <p class="auth-kicker">Alpha 0.6.4</p>
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
  if (button) { button.disabled = true; button.textContent = 'מתחבר…'; }
  try { await signInWithPopup(auth, googleProvider); }
  catch (error) {
    const fallbacks = new Set(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment']);
    if (fallbacks.has(error?.code)) { await signInWithRedirect(auth, googleProvider); return; }
    renderLogin('ההתחברות נכשלה. נסה שוב.');
    console.error('Google sign-in failed', error);
  }
}

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
      <span>
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

async function start() {
  const serviceWorkerReady = registerServiceWorker();

  // Local data must render before Firebase/authentication performs network work.
  if (!navigator.onLine && hasLocalTrip()) {
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
