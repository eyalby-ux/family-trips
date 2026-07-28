import fs from 'node:fs';

const required = [
  'START_HERE.md',
  'README.md',
  'index.html',
  'src/app.js',
  'src/styles.css',
  'service-worker.js',
  'manifest.webmanifest',
  'netlify.toml',
  'CODEX_INSTRUCTIONS.md',
  'docs/guides/INSTALLATION.md',
  'docs/guides/BUILD_DEPLOY.md',
  'docs/guides/COMMANDS.md',
  'docs/guides/ROLLBACK.md',
  'docs/qa/QA_CHECKLIST.md',
  'docs/qa/ACCEPTANCE_THAILAND.md',
  'docs/release/RELEASE_NOTES.md',
  'docs/release/KNOWN_ISSUES.md',
  'docs/release/MANIFEST.json'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const app = fs.readFileSync('src/app.js', 'utf8');
for (const term of ['Today', 'Trip Center', 'Timeline', 'conflicts', 'uploadForm', 'tripForm']) {
  if (!app.includes(term)) throw new Error(`Missing flow ${term}`);
}

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone' || !manifest.icons?.length) {
  throw new Error('Bad PWA manifest');
}

console.log('Smoke tests passed.');
