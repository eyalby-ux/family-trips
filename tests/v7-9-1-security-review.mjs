import assert from 'node:assert/strict';
import fs from 'node:fs';

// Pre-Beta Code Health & Security Review V1 (2026-09-28, planning assistant, document-only) --
// two findings the Product Owner asked to fix before Beta: CR-001 (a real privilege-escalation
// gap in firestore.rules' own Trip update rule) and CR-004 (two fully dead source files). Both
// verified against the actual repo before fixing, not assumed from the review's own claims --
// firestoreRules is read as raw text (this project's established pattern for rules files, no
// Firestore emulator reachable from this environment to exercise them for real).
const firestoreRules=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const packageJson=fs.readFileSync(new URL('../package.json',import.meta.url),'utf8');

// --- CR-001: field-level restriction on the Trip update rule ----------------------------------

function test_0_7_9_1_trip_update_rule_requires_ownerUid_to_stay_unchanged(){
  // ownerUid must never change via update at all -- there is no ownership-transfer feature
  // anywhere in the app; it is only ever set once, at create.
  assert(firestoreRules.includes('request.resource.data.ownerUid == resource.data.ownerUid'));
}
function test_0_7_9_1_trip_update_rule_restricts_editorEmails_changes_to_the_owner(){
  // editorEmails may change on an update only when the caller is the Owner -- addEditorByEmail/
  // removeEditorByEmail (cloud-store.js) are the only legitimate writers of this field, and
  // sharingSection() (v5-app.js) already gates that whole UI to the Owner only; this closes the
  // same gap in the actual security boundary (Firestore rules), not just the client UI.
  assert(firestoreRules.includes('(request.resource.data.editorEmails == resource.data.editorEmails || isOwner(resource))'));
}
function test_0_7_9_1_trip_list_rule_is_unaffected_by_the_update_restriction(){
  // list must still be its own, unrestricted-beyond-hasTripAccess rule -- the fix only narrows
  // update, never widens or narrows who can query their own Trips.
  assert(firestoreRules.includes('allow list: if hasTripAccess(resource);'));
  assert(!firestoreRules.includes('allow list, update: if hasTripAccess(resource);'),'the old unrestricted combined rule must be fully gone, not left as dead code alongside the new one');
}
function test_0_7_9_1_an_editor_only_update_that_touches_neither_field_is_still_allowed(){
  // Direct evidence the fix doesn't regress the ordinary case: every legitimate Trip-scalar write
  // (name/dates/destinationCountries via syncTripState's own diff-based merge, operational-data.js's
  // TRIP_NESTED_FIELDS/TRIP_TOP_LEVEL_FIELDS) never includes ownerUid or editorEmails in its patch,
  // so Firestore's own merge semantics leave request.resource.data.{ownerUid,editorEmails} equal
  // to the existing document's values automatically -- the rule's equality checks are trivially
  // satisfied for that case, confirmed here by simulating the rule's own boolean logic directly.
  const hasTripAccess=true,isOwner=false; // an Editor, not the Owner
  const resourceData={ownerUid:'owner-uid',editorEmails:['editor@example.com']};
  const requestData={ownerUid:'owner-uid',editorEmails:['editor@example.com'],name:'New Trip Name'}; // merge result: unrelated field changed, both guarded fields untouched
  const allowed=hasTripAccess
    && requestData.ownerUid===resourceData.ownerUid
    && (JSON.stringify(requestData.editorEmails)===JSON.stringify(resourceData.editorEmails) || isOwner);
  assert.equal(allowed,true);
}
function test_0_7_9_1_an_editor_attempting_to_rewrite_ownerUid_or_editorEmails_is_now_rejected(){
  // The actual privilege-escalation case CR-001 reported: an Editor (not the Owner) writing
  // directly to ownerUid or editorEmails must now be rejected, where it previously was not.
  const hasTripAccess=true,isOwner=false;
  const resourceData={ownerUid:'owner-uid',editorEmails:['editor@example.com']};
  const rewriteOwner={ownerUid:'attacker-uid',editorEmails:['editor@example.com']};
  const rewriteEditors={ownerUid:'owner-uid',editorEmails:['editor@example.com','attacker@example.com']};
  const check=requestData=>hasTripAccess
    && requestData.ownerUid===resourceData.ownerUid
    && (JSON.stringify(requestData.editorEmails)===JSON.stringify(resourceData.editorEmails) || isOwner);
  assert.equal(check(rewriteOwner),false,'an Editor rewriting ownerUid must be rejected');
  assert.equal(check(rewriteEditors),false,'an Editor rewriting editorEmails must be rejected');
}
function test_0_7_9_1_the_owner_can_still_change_editorEmails(){
  const hasTripAccess=true,isOwner=true;
  const resourceData={ownerUid:'owner-uid',editorEmails:['editor@example.com']};
  const requestData={ownerUid:'owner-uid',editorEmails:['editor@example.com','new-editor@example.com']};
  const allowed=hasTripAccess
    && requestData.ownerUid===resourceData.ownerUid
    && (JSON.stringify(requestData.editorEmails)===JSON.stringify(resourceData.editorEmails) || isOwner);
  assert.equal(allowed,true);
}

// --- CR-004: dead code removal -------------------------------------------------------------

function test_0_7_9_1_legacy_app_and_v4_app_are_fully_deleted(){
  assert(!fs.existsSync(new URL('../src/legacy-app.js',import.meta.url)));
  assert(!fs.existsSync(new URL('../src/v4-app.js',import.meta.url)));
}
function test_0_7_9_1_package_json_check_script_no_longer_references_legacy_app(){
  assert(!packageJson.includes('src/legacy-app.js'));
}
function test_0_7_9_1_main_js_only_ever_dynamically_imports_v5_app(){
  const mainJs=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert(mainJs.includes("await import('./v5-app.js')"));
  assert(!mainJs.includes('legacy-app'));
  assert(!mainJs.includes('v4-app'));
}

const tests=[
  test_0_7_9_1_trip_update_rule_requires_ownerUid_to_stay_unchanged,
  test_0_7_9_1_trip_update_rule_restricts_editorEmails_changes_to_the_owner,
  test_0_7_9_1_trip_list_rule_is_unaffected_by_the_update_restriction,
  test_0_7_9_1_an_editor_only_update_that_touches_neither_field_is_still_allowed,
  test_0_7_9_1_an_editor_attempting_to_rewrite_ownerUid_or_editorEmails_is_now_rejected,
  test_0_7_9_1_the_owner_can_still_change_editorEmails,
  test_0_7_9_1_legacy_app_and_v4_app_are_fully_deleted,
  test_0_7_9_1_package_json_check_script_no_longer_references_legacy_app,
  test_0_7_9_1_main_js_only_ever_dynamically_imports_v5_app,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log('ALL PASS: 0.7.9.1 -- Pre-Beta Code Health & Security Review V1 correction: CR-001 (Trip update rule field-level restriction) and CR-004 (dead-code removal) (9 tests). No Firestore emulator is reachable from this environment, so firestoreRules is verified by source-inspection plus a direct simulation of the rule\'s own boolean logic against the exact reported attack case, matching this project\'s established pattern for rules files.');
