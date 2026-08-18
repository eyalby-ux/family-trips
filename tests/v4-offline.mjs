import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');
const listeners = new Map();
const added = [];
const stored = new Map();

const cache = {
  async addAll(paths) { added.push(...paths); },
  async put(key, response) { stored.set(typeof key === 'string' ? key : key.url, response); },
};

const context = {
  URL,
  Request,
  Response,
  console,
  fetch: async () => new Response(
    '<!doctype html><link rel="stylesheet" href="/assets/index-abc.css"><script type="module" src="/assets/index-def.js"></script>',
    { status: 200, headers: { 'content-type': 'text/html' } }
  ),
  caches: {
    async open() { return cache; },
    async keys() { return []; },
    async delete() { return true; },
    async match(key) { return stored.get(typeof key === 'string' ? key : key.url); },
  },
  self: {
    location: { origin: 'https://familytripz.example' },
    clients: { async claim() {} },
    skipWaiting() {},
    addEventListener(type, handler) { listeners.set(type, handler); },
  },
};

vm.runInNewContext(source, context, { filename: 'service-worker.js' });
let installPromise;
listeners.get('install')({ waitUntil(promise) { installPromise = promise; } });
await installPromise;

assert(stored.has('/'), 'The navigation shell must be cached during service-worker installation.');
assert(added.includes('/assets/index-abc.css'), 'The built CSS asset must be precached.');
assert(added.includes('/assets/index-def.js'), 'The built JavaScript asset must be precached.');
assert(added.includes('/manifest.webmanifest'));

console.log('V4 0.4.4 offline shell regression test passed.');
