const CACHE = 'family-trips-alpha-0.6.4-shell-v1';
const CACHE_PREFIX = 'family-trips-alpha-';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

function absolute(path) {
  return new URL(path, self.registration.scope).href;
}

async function fetchAndCache(cache, url, { required = false } = {}) {
  try {
    const response = await fetch(new Request(url, { cache: 'no-store', credentials: 'same-origin' }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(url, response.clone());
    return response;
  } catch (error) {
    if (required) throw error;
    console.warn('Optional precache failed', url, error);
    return null;
  }
}

async function precache() {
  const cache = await caches.open(CACHE);
  const indexUrl = absolute('./index.html');
  const indexResponse = await fetchAndCache(cache, indexUrl, { required: true });
  await cache.put(absolute('./'), indexResponse.clone());
  await cache.put(self.registration.scope, indexResponse.clone());

  const html = await indexResponse.text();
  const discovered = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)]
    .map((match) => absolute(match[1]))
    .filter((url) => new URL(url).origin === self.location.origin);
  const urls = [...new Set([...CORE.map(absolute), ...discovered])]
    .filter((url) => url !== indexUrl && url !== absolute('./'));
  await Promise.all(urls.map((url) => fetchAndCache(cache, url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cachedShell() {
  const cache = await caches.open(CACHE);
  return cache.match(absolute('./index.html'), { ignoreSearch: true, ignoreVary: true })
    || cache.match(absolute('./'), { ignoreSearch: true, ignoreVary: true })
    || cache.match(self.registration.scope, { ignoreSearch: true, ignoreVary: true });
}

async function handleNavigation(request) {
  const shell = await cachedShell();
  if (shell) return shell;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(absolute('./index.html'), response.clone());
      await cache.put(absolute('./'), response.clone());
    }
    return response;
  } catch {
    return new Response('Offline shell unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline resource unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(event.request.mode === 'navigate'
    ? handleNavigation(event.request)
    : handleAsset(event.request));
});
