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
let legacyLoaded = false;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}

function renderLogin(message = '') {
  accountBar.hidden = true;
  appRoot.innerHTML = '';
  authRoot.innerHTML = `
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="auth-title">
        <img class="auth-logo" src="/assets/icons/icon-192.png" alt="">
        <p class="auth-kicker">Alpha 0.3 Foundation</p>
        <h1 id="auth-title">Family Trips</h1>
        <p>התחברות מאובטחת באמצעות חשבון Google.</p>
        ${message ? `<p class="auth-error" role="alert">${escapeHtml(message)}</p>` : ''}
        <button class="btn auth-button" id="google-sign-in" type="button">התחברות עם Google</button>
        <p class="auth-note">בשלב ה־Foundation נתוני הטיול הקיימים נשארים מקומיים במכשיר. Firestore ו־Storage עדיין נעולים.</p>
      </section>
    </main>`;

  document.querySelector('#google-sign-in')?.addEventListener('click', handleSignIn);
}

async function handleSignIn() {
  const button = document.querySelector('#google-sign-in');
  if (button) {
    button.disabled = true;
    button.textContent = 'מתחבר…';
  }

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const popupFallbackCodes = new Set([
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ]);

    if (popupFallbackCodes.has(error?.code)) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    renderLogin('ההתחברות נכשלה. נסה שוב.');
    console.error('Google sign-in failed', error);
  }
}

async function renderSignedIn(user) {
  authRoot.innerHTML = '';
  accountBar.hidden = false;
  accountBar.innerHTML = `
    <div class="account-bar-inner">
      <span class="account-person">
        ${user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="">` : ''}
        <span><b>${escapeHtml(user.displayName || 'משתמש')}</b><small>${escapeHtml(user.email || '')}</small></span>
      </span>
      <button id="sign-out" class="account-sign-out" type="button">יציאה</button>
    </div>`;

  document.querySelector('#sign-out')?.addEventListener('click', async () => {
    await signOut(auth);
    location.reload();
  });

  if (!legacyLoaded) {
    legacyLoaded = true;
    await import('./legacy-app.js');
  }
}

async function start() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await getRedirectResult(auth);
  } catch (error) {
    console.error('Authentication initialization failed', error);
  }

  onAuthStateChanged(auth, (user) => {
    if (user) renderSignedIn(user);
    else renderLogin();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.error('Service Worker registration failed', error);
      });
    });
  }
}

start();
