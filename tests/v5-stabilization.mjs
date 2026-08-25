import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeProposalLifecycle,rejectProposal} from '../src/proposal-lifecycle.js';
import {createSuggestions} from '../src/ingestion.js';

const pending={id:'pending-1',status:'pending',proposed:{type:'hotel',title:'New hotel'}};
const legacyRejected={id:'rejected-1',status:'rejected',proposed:{type:'hotel',title:'Old hotel'}};
const migrated=normalizeProposalLifecycle([legacyRejected,pending],[legacyRejected]);
assert.deepEqual(migrated.suggestions.map(item=>item.id),['pending-1']);
assert.deepEqual(migrated.rejectedSuggestions.map(item=>item.id),['rejected-1']);

const rejected=rejectProposal(migrated.suggestions,migrated.rejectedSuggestions,'pending-1',new Date('2026-08-11T00:00:00Z'));
assert.deepEqual(rejected.suggestions,[]);
assert.deepEqual(rejected.rejectedSuggestions.map(item=>item.id),['rejected-1','pending-1']);
assert.equal(rejected.rejectedSuggestions[1].status,'rejected');
assert.equal(rejected.rejectedSuggestions[1].rejectedAt,'2026-08-11T00:00:00.000Z');
assert.deepEqual(normalizeProposalLifecycle(rejected.suggestions,rejected.rejectedSuggestions),rejected);

assert.deepEqual(createSuggestions({id:'opaque',kind:'link',name:'https://share.google/opaque',url:'https://share.google/opaque'}),[]);

const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/service-worker.js',import.meta.url),'utf8');
assert(app.includes('rejectedSuggestions'));
assert(app.includes('ארכיון הצעות שנדחו'));
assert(app.includes("!['document','link'].includes(key)"));
assert(app.includes('function smartImportPanel(source)'));
assert(app.includes('כתובת אתר ציבורי רשמי של המלון'));
assert(!app.includes("suggestion.status='rejected'"));
assert(main.includes('offline-sign-out-note'));
assert(main.includes('if (!navigator.onLine)'));
assert(main.includes('await navigator.serviceWorker.ready'));
assert(sw.includes("const CACHE = 'family-trips-alpha-__BUILD_VERSION__-shell';"));
assert(sw.indexOf('const shell = await cachedShell()') < sw.indexOf('const response = await fetch(request)'));
assert(sw.includes('key.startsWith(CACHE_PREFIX) && key !== CACHE'));

console.log('V5 Alpha 0.5.4 stabilization tests passed.');
