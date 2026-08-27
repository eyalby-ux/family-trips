import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The service worker's own script bytes are what a browser checks to decide whether a new
// version is available at all (see public/service-worker.js). If two builds of the same
// package.json version ever produced byte-identical service-worker.js output, a browser that
// already registered the first one would never detect the second and would keep serving a
// stale precached shell/bundle indefinitely, no matter how many times the app itself changed.
// Folding the git commit SHA in here means every single build gets a distinct cache name
// automatically, with no manual step to remember or forget.
export const PLACEHOLDER = '__BUILD_VERSION__';

export function resolveBuildVersion(pkgVersion, gitSha) {
  const sha = String(gitSha || '').trim();
  return sha ? `${pkgVersion}-${sha}` : pkgVersion;
}

export function injectServiceWorkerVersion(source, buildVersion) {
  if (!String(source).includes(PLACEHOLDER)) {
    throw new Error(`service-worker.js is missing the ${PLACEHOLDER} placeholder; the cache can no longer be busted automatically.`);
  }
  return source.replaceAll(PLACEHOLDER, buildVersion);
}

// index.html's <title> and <meta name="description"> (V6-F24): plain package.json version only
// (no commit SHA) -- this is a human-facing label, not a cache-busting key.
export const APP_VERSION_PLACEHOLDER = '__APP_VERSION__';

export function injectIndexHtmlVersion(source, appVersion) {
  if (!String(source).includes(APP_VERSION_PLACEHOLDER)) {
    throw new Error(`index.html is missing the ${APP_VERSION_PLACEHOLDER} placeholder; the tab title/description can no longer stay in sync with the shipped version automatically.`);
  }
  return source.replaceAll(APP_VERSION_PLACEHOLDER, appVersion);
}

function readShortSha(root) {
  try {
    return execSync('git rev-parse --short=8 HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'));
  const buildVersion = resolveBuildVersion(pkg.version, readShortSha(root));
  const swPath = `${root}/dist/service-worker.js`;
  const resolved = injectServiceWorkerVersion(fs.readFileSync(swPath, 'utf8'), buildVersion);
  fs.writeFileSync(swPath, resolved);
  console.log(`Service worker cache-busted to ${buildVersion}`);

  const indexPath = `${root}/dist/index.html`;
  // V6-F40: index.html also carries a <meta name="build-version"> with the same
  // package.json-version+git-SHA string as the service worker's cache name (not just the plain
  // Alpha version), so a build-specific identifier is checkable from the running app itself
  // (Settings) without opening the network tab. Reuses injectServiceWorkerVersion since it's the
  // same placeholder/value pair, just resolved into a second file.
  let resolvedIndex = injectIndexHtmlVersion(fs.readFileSync(indexPath, 'utf8'), pkg.version);
  resolvedIndex = injectServiceWorkerVersion(resolvedIndex, buildVersion);
  fs.writeFileSync(indexPath, resolvedIndex);
  console.log(`index.html title/description synced to Alpha ${pkg.version}, build meta synced to ${buildVersion}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
