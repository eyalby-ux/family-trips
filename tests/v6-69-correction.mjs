import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveSmartImportSubmissionMode} from '../src/operational-data.js';

// V6-F69: the generic "Add by link" flow for a brand-new item (global Add, category not yet
// known) failed on every URL, not just source-specific ones. Root cause, confirmed directly:
// analyzeSource({trip,source,file}) in src/smart-import-client.js had no url parameter in its
// signature at all and called runSource with url hardcoded to '', unconditionally -- a link
// source has no file, so runSource's file-required branch always threw "יש לבחור PDF או תמונה"
// before any network request was attempted, regardless of the URL's content-type, robots.txt, or
// reachability. analyzeHotelSource/analyzeActivitySource, the two sibling functions in the same
// file, both already correctly accepted and forwarded url -- this was a plain omitted-parameter
// bug on the one call site used for a brand-new item before its category is known.
//
// smart-import-client.js itself cannot be imported at all under this project's plain-Node test
// harness: it transitively imports src/firebase.js, which touches import.meta.env and throws
// immediately outside a Vite build (confirmed directly: `node -e "import('./src/smart-import-
// client.js')"` fails with "Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')").
// This is exactly the coverage gap that let the bug ship unnoticed -- the one prior test touching
// analyzeSource (tests/v6-5-flight-import.mjs:404) could only ever source-inspect the v5-app.js
// call-site text, never truly exercise analyzeSource's own url-vs-file decision. The fix extracts
// that exact decision (resolveSmartImportSubmissionMode) into src/operational-data.js, which has
// no such dependency, so it can be executed directly here rather than merely source-inspected.

function test_V6_F69_resolve_submission_mode_prefers_url_when_present_and_allowed(){
  assert.equal(resolveSmartImportSubmissionMode('https://example.com/ticket.pdf',null,true),'url','a URL with no file present, for an operation that allows URLs, must resolve to url mode -- this is the exact decision analyzeSource\'s missing url parameter previously could never reach, since url was always hardcoded to \'\'');
  console.log('PASS: V6-F69 a submitted URL with no file present resolves to url submission mode when allowed');
}
function test_V6_F69_resolve_submission_mode_rejects_disallowed_url(){
  assert.throws(()=>resolveSmartImportSubmissionMode('https://example.com/ticket.pdf',null,false),/קישור ציבורי אינו נתמך עבור סוג מקור זה/,'a URL submitted for an operation that does not allow URLs (e.g. Flight) must be rejected client-side with a clear message, before ever reaching the network');
  console.log('PASS: V6-F69 a URL is rejected client-side for an operation that does not allow one (Flight), unchanged by this fix');
}
function test_V6_F69_resolve_submission_mode_throws_the_original_bug_message_with_neither_url_nor_file(){
  assert.throws(()=>resolveSmartImportSubmissionMode('',null,true),/יש לבחור PDF או תמונה/,'this is the exact error V6-F69 reported -- with url hardcoded to \'\' (its previous, buggy behavior) and no file, this was the ONLY possible outcome for a link source, regardless of the URL\'s validity');
  console.log('PASS: V6-F69 with neither url nor file, the original "must choose PDF or image" error still fires -- reproduces the exact reported bug when url is (as it used to always be) blank');
}
function test_V6_F69_resolve_submission_mode_falls_back_to_file_when_no_url(){
  assert.equal(resolveSmartImportSubmissionMode('',{size:100,type:'application/pdf'},true),'file','a normal file-based source (no url at all) must still resolve to file mode, completely unaffected by this fix');
  console.log('PASS: V6-F69 a normal file-based source (no URL) is unaffected, still resolves to file submission mode');
}

// --- Source-inspection for the actual fix wiring (analyzeSource's signature/forwarding, and the
// v5-app.js call site that supplies the URL) -- matching this codebase's established pattern for
// the parts of this file that genuinely cannot be executed under the plain-Node harness. ---
function test_V6_F69_analyze_source_accepts_and_forwards_url(){
  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert.match(client,/export async function analyzeSource\(\{trip,source,file,url\}\)\{/,'analyzeSource must accept a url parameter -- it previously had none at all');
  assert.match(client,/return runSource\(\{operation:'analyze_source',trip,source,file,url,allowUrl:true\}\);/,'analyzeSource must forward the received url into runSource, not hardcode it to an empty string');
  assert.match(client,/const mode=resolveSmartImportSubmissionMode\(url,file,allowUrl\);/,'runSource must actually use the extracted, testable submission-mode decision, not a re-inlined duplicate of the same branching logic');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/await analyzeSource\(\{trip:state\.trip,source,file,url:source\.url\}\)/,'the one call site used for a brand-new item (global Add, category not yet known) must forward source.url into analyzeSource -- this is what actually lets a link source reach the network at all');
  console.log('PASS: V6-F69 analyzeSource\'s signature/forwarding and its v5-app.js call site are correctly wired');
}

// --- Confirms the server-side claim made in the fix report rather than assuming it: analyze_source
// already calls prepareSource with allowUrl hardcoded to true, unconditionally, so no server-side
// change was needed for this fix. ---
function test_V6_F69_server_analyze_source_already_allows_url_unconditionally(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/body\.operation==='analyze_source'\)\{[\s\S]{0,200}?prepareSource\(body\.source,true\)/,'analyze_source must already call prepareSource with allowUrl hardcoded to true -- confirming the server side never needed a change for this fix, only the client');
  console.log('PASS: V6-F69 server-side analyze_source already unconditionally allows a URL source -- confirmed, not assumed');
}

test_V6_F69_resolve_submission_mode_prefers_url_when_present_and_allowed();
test_V6_F69_resolve_submission_mode_rejects_disallowed_url();
test_V6_F69_resolve_submission_mode_throws_the_original_bug_message_with_neither_url_nor_file();
test_V6_F69_resolve_submission_mode_falls_back_to_file_when_no_url();
test_V6_F69_analyze_source_accepts_and_forwards_url();
test_V6_F69_server_analyze_source_already_allows_url_unconditionally();
console.log('ALL PASS: V6-F69 generic Add-by-link now reaches the network for every URL, not just Hotel/Activity-specific attach-and-extract sources');
