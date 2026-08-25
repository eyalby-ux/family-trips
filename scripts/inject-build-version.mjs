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
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
