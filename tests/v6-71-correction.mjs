import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveSmartImportErrorMessage} from '../src/operational-data.js';

// V6-F71: src/smart-import-client.js's request() resolved a failed Smart Import call's displayed
// message as `payload.message||errorMessage(payload.error,response.status)` -- the server's own
// raw message ALWAYS won whenever present, which is every single httpError call site in
// netlify/functions/smart-import.mjs (each one supplies a message, in English). This made the
// client's Hebrew error-message dictionary effectively dead code for every existing entry,
// including robots_disallowed, which V6-F70's own investigation cited as "already working" based
// on the dictionary's mere existence, not on what the precedence rules would have actually shown
// a real user. Every Smart Import failure a user has ever seen has therefore been in English, not
// the Hebrew the dictionary implied.
//
// Fixed: the dictionary is now consulted FIRST, by error code (resolveSmartImportErrorMessage,
// extracted to src/operational-data.js so it can be genuinely executed here -- smart-import-
// client.js itself cannot be imported under this project's plain-Node test harness at all, since
// it transitively imports firebase.js, which touches import.meta.env and throws outside a Vite
// build). The server's raw message is now used ONLY as a fallback for a code with no dictionary
// entry at all (five such codes audited directly against every httpError(...) call site in
// netlify/functions/: invalid_trip, invalid_operation, invalid_url, authentication_required,
// source_too_large -- none of which were asked to gain a translation here).
//
// These tests assert on the actual RESOLVED/DISPLAYED text, not merely that a dictionary key
// exists -- exactly the gap that let the precedence bug go unnoticed the first time.

function test_V6_F71_robots_disallowed_displays_hebrew_not_the_english_server_message(){
  const displayed=resolveSmartImportErrorMessage('robots_disallowed',422,`This site's robots.txt disallows automated access to this page.`);
  assert.equal(displayed,'האתר חוסם גישה אוטומטית לדף זה (robots.txt). אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.','robots_disallowed must display the Hebrew dictionary text, not the English message the server actually sent -- this is the exact code V6-F70 assumed was "already working" based on the dictionary entry alone');
  assert.doesNotMatch(displayed,/robots\.txt disallows automated access/,'the raw English server message must not leak through when a Hebrew dictionary entry exists for this code');
  console.log('PASS: V6-F71 robots_disallowed resolves to Hebrew, not the English message the server actually sent');
}
function test_V6_F71_robots_unverifiable_displays_hebrew_not_the_english_server_message(){
  const displayed=resolveSmartImportErrorMessage('robots_unverifiable',415,`Could not verify whether this site's robots.txt allows automated access, and the page fetch also failed.`);
  assert.equal(displayed,'לא ניתן היה לאמת מראש שהאתר מתיר גישה אוטומטית (robots.txt), וניתוח הדף נכשל. אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.','robots_unverifiable must display the Hebrew dictionary text -- this is the new V6-F70 outcome, and must not regress into showing the server\'s own English fallback message either');
  assert.doesNotMatch(displayed,/Could not verify/,'the raw English server message must not leak through for robots_unverifiable');
  console.log('PASS: V6-F71 robots_unverifiable resolves to Hebrew, not the English message the server actually sent');
}
function test_V6_F71_unsupported_source_displays_hebrew_not_the_english_server_message(){
  const displayed=resolveSmartImportErrorMessage('unsupported_source',415,'The URL did not return an HTML page.');
  assert.equal(displayed,'סוג המקור אינו נתמך.','unsupported_source must display the Hebrew dictionary text, not the English "not an HTML page" message the server actually sent -- this is the exact message Eyal originally saw in V6-F70\'s own repro');
  assert.doesNotMatch(displayed,/HTML page/,'the raw English server message must not leak through for unsupported_source');
  console.log('PASS: V6-F71 unsupported_source resolves to Hebrew, not the English "not an HTML page" message the server actually sent');
}
function test_V6_F71_a_code_with_no_dictionary_entry_falls_back_to_the_servers_own_message(){
  // Confirms the fix is a PRECEDENCE change, not a removal of the server-message fallback --
  // invalid_trip (and the other four audited codes) have no Hebrew entry at all, so the server's
  // own message must still be shown for them, exactly as before this fix.
  const displayed=resolveSmartImportErrorMessage('invalid_trip',400,'tripId is required.');
  assert.equal(displayed,'tripId is required.','a code with no dictionary entry must still fall back to the server\'s own raw message, unchanged from before this fix');
  console.log('PASS: V6-F71 a code with no Hebrew dictionary entry (e.g. invalid_trip) still falls back to the server\'s own message, unaffected by the precedence fix');
}
function test_V6_F71_neither_dictionary_nor_server_message_falls_back_to_generic_hebrew(){
  const displayed=resolveSmartImportErrorMessage('some_future_unknown_code',503,'');
  assert.equal(displayed,'ניתוח המקור נכשל (503).','when neither a dictionary entry nor a server message is available, the fully-generic Hebrew fallback (with the HTTP status) must still be shown, unchanged from before this fix');
  console.log('PASS: V6-F71 with neither a dictionary entry nor a server message, the generic Hebrew fallback (with status code) is shown');
}

// --- Source-inspection for the actual call-site wiring (smart-import-client.js can't be
// live-imported at all, per the module-level comments above) -- confirms request() genuinely uses
// the fixed-precedence function, not a re-inlined duplicate of the old logic. ---
function test_V6_F71_request_uses_the_fixed_precedence_function(){
  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert.match(client,/import \{ resolveSmartImportErrorMessage, resolveSmartImportSubmissionMode \} from '\.\/operational-data\.js';/,'smart-import-client.js must import the shared, executable error-message resolver from operational-data.js');
  assert.match(client,/if\(!response\.ok\)throw new Error\(resolveSmartImportErrorMessage\(payload\.error,response\.status,payload\.message\)\);/,'request() must call resolveSmartImportErrorMessage with the error code, status, AND the server\'s own message (as the fallback argument, not the primary one) -- argument order/precedence is the entire fix');
  // Confirms the OLD backwards-precedence CODE (not merely a comment describing it) is gone --
  // matches only an actual `if(...)throw new Error(...)` statement using the old pattern, so this
  // can't be fooled by this file's own explanatory comment mentioning the same old code for
  // context (which a plain substring/regex check against the whole file text would be).
  assert.doesNotMatch(client,/if\(!response\.ok\)throw new Error\(payload\.message\|\|errorMessage/,'the old, backwards-precedence throw statement (payload.message first, dictionary as fallback) must be fully gone as actual code, not left dead alongside the new call');
  console.log('PASS: V6-F71 request() is wired to the fixed-precedence resolver, and the old backwards-precedence statement is gone, not just supplemented');
}

test_V6_F71_robots_disallowed_displays_hebrew_not_the_english_server_message();
test_V6_F71_robots_unverifiable_displays_hebrew_not_the_english_server_message();
test_V6_F71_unsupported_source_displays_hebrew_not_the_english_server_message();
test_V6_F71_a_code_with_no_dictionary_entry_falls_back_to_the_servers_own_message();
test_V6_F71_neither_dictionary_nor_server_message_falls_back_to_generic_hebrew();
test_V6_F71_request_uses_the_fixed_precedence_function();
console.log('ALL PASS: V6-F71 Smart Import error messages now genuinely display Hebrew (dictionary-first), not the server\'s raw English message, for every code with a translation -- fixed at the actual precedence bug, not papered over per-code');
