import fs from 'node:fs';

const required = [
  'index.html','src/main.js','src/firebase.js','src/legacy-app.js','src/styles.css','src/foundation.css',
  'public/service-worker.js','public/manifest.webmanifest','netlify.toml','firestore.rules','storage.rules',
  'UPGRADE_0.2.1_TO_0.3_FOUNDATION_WINDOWS.md','docs/release/RELEASE_NOTES.md','docs/guides/INSTALLATION_WINDOWS.md'
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);

const main = fs.readFileSync('src/main.js','utf8');
for (const marker of [
  'signInWithPopup',
  'signInWithRedirect',
  'browserLocalPersistence',
  'onAuthStateChanged',
  'signOut'
]) {
  if (!main.includes(marker)) throw new Error(`Missing auth marker: ${marker}`);
}
const config = fs.readFileSync('src/firebase.js','utf8');
for (const marker of [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'getAuth',
  'getFirestore',
  'getStorage'
]) {
  if (!config.includes(marker)) throw new Error(`Missing Firebase marker: ${marker}`);
}
const legacy = fs.readFileSync('src/legacy-app.js','utf8');
if (!/function\s+sourceStep\s*\(/.test(legacy)) throw new Error('Create Item source step is missing');
const sw = fs.readFileSync('public/service-worker.js','utf8');
if (!sw.includes('family-trips-alpha-0.3-foundation-v1')) throw new Error('Service Worker cache version mismatch');
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
if (manifest.display !== 'standalone' || manifest.theme_color !== '#2f8f63') throw new Error('Manifest mismatch');
const netlify = fs.readFileSync('netlify.toml','utf8');
if (!netlify.includes('command = "npm run build"') || !netlify.includes('publish = "dist"')) throw new Error('Netlify build settings mismatch');
console.log('Smoke tests passed.');
