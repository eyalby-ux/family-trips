import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diffById,SYNCED_COLLECTIONS,TRIP_NESTED_FIELDS,TRIP_TOP_LEVEL_FIELDS} from '../src/operational-data.js';

// diffById is the one genuinely pure, deterministic piece of 0.7.2's Firestore sync logic --
// everything else in cloud-store.js is a real network call and cannot be exercised under this
// project's plain-Node test harness (it imports firebase.js, which touches import.meta.env and
// throws outside a Vite build -- the same reason smart-import-client.js has never been importable
// here either). v5-app.js and cloud-store.js's own wiring is verified by source-inspection below,
// matching the established pattern for every other module this harness cannot import directly.

function test_0_7_2_diffById_detects_additions(){
  const {toSet,toDelete}=diffById([],[{id:'a',name:'A'}]);
  assert.deepEqual(toSet,[{id:'a',name:'A'}]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_2_diffById_detects_removals(){
  const {toSet,toDelete}=diffById([{id:'a',name:'A'}],[]);
  assert.deepEqual(toSet,[]);
  assert.deepEqual(toDelete,['a']);
}
function test_0_7_2_diffById_detects_changed_field(){
  const {toSet,toDelete}=diffById([{id:'a',name:'A'}],[{id:'a',name:'A2'}]);
  assert.deepEqual(toSet,[{id:'a',name:'A2'}]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_2_diffById_is_a_no_op_for_identical_records(){
  const {toSet,toDelete}=diffById([{id:'a',name:'A'}],[{id:'a',name:'A'}]);
  assert.deepEqual(toSet,[]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_2_diffById_handles_add_change_and_remove_together(){
  const previous=[{id:'a',name:'A'},{id:'b',name:'B'}];
  const next=[{id:'a',name:'A'},{id:'b',name:'B2'},{id:'c',name:'C'}];
  const {toSet,toDelete}=diffById(previous,next);
  assert.deepEqual(toSet.map(r=>r.id).sort(),['b','c']);
  assert.deepEqual(toDelete,[]);
  const {toSet:toSet2,toDelete:toDelete2}=diffById(next,[{id:'a',name:'A'}]);
  assert.deepEqual(toSet2,[]);
  assert.deepEqual(toDelete2.sort(),['b','c']);
}
function test_0_7_2_diffById_treats_a_null_previous_snapshot_as_empty_not_a_crash(){
  const {toSet,toDelete}=diffById(null,[{id:'a',name:'A'}]);
  assert.deepEqual(toSet,[{id:'a',name:'A'}]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_2_diffById_skips_records_with_no_id(){
  const {toSet,toDelete}=diffById([],[{name:'no id'},{id:'a',name:'A'}]);
  assert.deepEqual(toSet,[{id:'a',name:'A'}]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_2_synced_collections_covers_every_state_array_save_used_to_persist(){
  // Cross-check against the pre-0.7.2 localStorage save() payload this replaces (the exact
  // literal list is preserved in git history at commit 2795f2a's src/v5-app.js) -- every array
  // that used to go into the single localStorage blob now has a real Firestore subcollection.
  const stateKeys=SYNCED_COLLECTIONS.map(([stateKey])=>stateKey).sort();
  assert.deepEqual(stateKeys,['games','items','locationRecords','packing','rejectedSuggestions','shopping','sources','suggestions','tasks'].sort());
  assert(SYNCED_COLLECTIONS.some(([stateKey,collectionName])=>stateKey==='packing'&&collectionName==='packingLists'));
}
function test_0_7_2_trip_field_lists_do_not_overlap(){
  const overlap=TRIP_NESTED_FIELDS.filter(field=>TRIP_TOP_LEVEL_FIELDS.includes(field));
  assert.deepEqual(overlap,[]);
}

const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const cloudStore=fs.readFileSync(new URL('../src/cloud-store.js',import.meta.url),'utf8');
const firebaseConfig=fs.readFileSync(new URL('../src/firebase.js',import.meta.url),'utf8');
const firestoreRules=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const storageRules=fs.readFileSync(new URL('../storage.rules',import.meta.url),'utf8');
const mainJs=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const authShared=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-auth.mjs',import.meta.url),'utf8');
const quotaShared=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-quota.mjs',import.meta.url),'utf8');

function test_0_7_2_firestore_rules_enforce_both_application_invitation_and_trip_role_layers(){
  assert(firestoreRules.includes('function isInvited()'));
  assert(firestoreRules.includes('config/appInvitations'));
  assert(firestoreRules.includes('function isOwner(trip)'));
  assert(firestoreRules.includes('function isEditor(trip)'));
  assert(firestoreRules.includes('ownerUid'));
  assert(firestoreRules.includes('editorEmails'));
  assert(firestoreRules.includes("allow write: if false"));
  assert(!firestoreRules.includes('allow read, write: if false'));
}
// A fifth real bug, still on the same qa build the four prior fixes shipped to, caught by the
// Product Owner attaching a file on a genuinely brand-new Trip: the persistent-overwrite fix
// (createTripDoc's getDoc() existence pre-check, added before this visible session) introduced a
// catch-22 in firestore.rules -- the original `allow read, update: if hasTripAccess(resource)`
// required a Trip to already grant access before it could even be READ to check whether it
// existed, so the existence check itself was denied for every genuinely new Trip. The client
// silently treated that denial as "someone else already created it" (its own permission-denied
// fallback, meant for a real create-race) and gave up without ever creating the document -- so
// every subsequent Storage upload kept hitting the same 403 the earlier ordering fix was supposed
// to resolve, because the Trip document it was waiting on was never actually created.
function test_0_7_2_firestore_rules_allow_a_get_on_a_nonexistent_trip_to_check_existence_safely(){
  assert(firestoreRules.includes('trip != null'));
  assert(firestoreRules.includes('allow get: if isInvited() && (resource == null || hasTripAccess(resource));'));
  // list/update must still require real access -- this fix only touches the single-document
  // existence-check path (get), never widens who can read a query result or write an update.
  assert(firestoreRules.includes('allow list, update: if hasTripAccess(resource);'));
}
// Test 5 of the executable acceptance session (docs/versions/V7/0.7.2/EXECUTABLE_TEST_SESSION_V1.md)
// asks for direct proof that Firestore's own security rules -- not merely hidden client UI --
// reject a Trip a user has neither ownership of nor Editor access to. The Product Owner deferred
// this specific test to the Development Agent, since it needs a raw Firestore access attempt
// rather than a normal UI click-through. This environment has no Firebase emulator and no second
// real authenticated session to exercise the LIVE deployed rules against (both already-established
// limitations, see the 0.7.2 design document and every "no Google credentials" note throughout
// this project) -- so this reimplements hasTripAccess/isOwner/isEditor's exact boolean logic as a
// pure function, kept honest by asserting the deployed rule TEXT matches what this function
// mirrors (so a future rules edit that changes the logic without updating this test fails loudly),
// and exercises it against every access pattern Test 5 cares about. This is logic-equivalent to
// the deployed rules, not a live execution of them -- stated plainly rather than overclaimed.
function hasTripAccessReimplementation({authUid,authEmail,emailVerified,invitedEmails,trip}){
  const isInvited=Boolean(authUid)&&emailVerified===true&&invitedEmails.includes(authEmail);
  if(!trip)return false;
  const isOwner=authUid===trip.ownerUid;
  const isEditor=(trip.editorEmails||[]).includes(authEmail);
  return isInvited&&(isOwner||isEditor);
}
function test_0_7_2_firestore_rules_reject_a_trip_neither_owned_nor_shared_server_side(){
  // Confirms this reimplementation genuinely mirrors the deployed rule's own structure, not a
  // hand-waved approximation of it.
  assert(firestoreRules.includes('function isOwner(trip) { return request.auth.uid == trip.data.ownerUid; }'));
  assert(firestoreRules.includes('function isEditor(trip) { return request.auth.token.email in trip.data.editorEmails; }'));
  assert(firestoreRules.includes('function hasTripAccess(trip) { return trip != null && isInvited() && (isOwner(trip) || isEditor(trip)); }'));

  const invitedEmails=['owner@example.com','editor@example.com','outsider@example.com'];
  const someoneElsesTrip={ownerUid:'owner-uid',editorEmails:['editor@example.com']};

  // The exact scenario Test 5 asks for: an invited, application-authorized user who is neither
  // this specific Trip's Owner nor one of its Editors -- must be denied.
  assert.equal(hasTripAccessReimplementation({authUid:'outsider-uid',authEmail:'outsider@example.com',emailVerified:true,invitedEmails,trip:someoneElsesTrip}),false);
  // The Owner and a granted Editor must both be allowed against that same Trip.
  assert.equal(hasTripAccessReimplementation({authUid:'owner-uid',authEmail:'owner@example.com',emailVerified:true,invitedEmails,trip:someoneElsesTrip}),true);
  assert.equal(hasTripAccessReimplementation({authUid:'editor-uid',authEmail:'editor@example.com',emailVerified:true,invitedEmails,trip:someoneElsesTrip}),true);
  // An uninvited email must be denied even if it somehow matched ownerUid/editorEmails (defense in
  // depth -- the application-invitation layer is independent of the Trip-role layer).
  assert.equal(hasTripAccessReimplementation({authUid:'owner-uid',authEmail:'owner@example.com',emailVerified:true,invitedEmails:['someone-else@example.com'],trip:someoneElsesTrip}),false);
  // A nonexistent Trip must be denied (not error/allow) for every caller, matching the get-rule's
  // own resource==null short-circuit still requiring real access, not a bypass.
  assert.equal(hasTripAccessReimplementation({authUid:'owner-uid',authEmail:'owner@example.com',emailVerified:true,invitedEmails,trip:null}),false);
}
function test_0_7_2_storage_rules_mirror_firestore_trip_access_via_cross_service_get(){
  assert(storageRules.includes('firestore.get('));
  assert(storageRules.includes('trips/{tripId}/sources/{sourceId}/{fileName}'));
  assert(storageRules.includes('ownerUid'));
  assert(storageRules.includes('editorEmails'));
}
function test_0_7_2_firebase_config_enables_firestore_offline_persistence(){
  assert(firebaseConfig.includes('initializeFirestore'));
  assert(firebaseConfig.includes('persistentLocalCache'));
}
function test_0_7_2_save_keeps_its_synchronous_call_signature_but_syncs_to_firestore_internally(){
  // The load-bearing property that makes this refactor tractable: every pre-0.7.2 call site does
  // `mutate state.x; save(); render()` with no await -- confirmed unchanged by grepping for any
  // "await save(" call site, which must not exist anywhere in this file.
  assert(app.includes('function save(){'));
  assert(!/await save\(/.test(app));
  // 0.7.2.1: syncTripState is now called against diffBaseline (lastSyncedSnapshot's value captured
  // synchronously at save() call time), not against lastSyncedSnapshot read later -- see
  // test_0_7_2_1_save_issues_each_writes_commit_immediately_not_queued_behind_an_earlier_saves below
  // for why.
  assert(app.includes('syncTripState(tripId,diffBaseline,snapshotForThisSave)'));
}
// 0.7.2.1 correction: a real, already-shipped bug found during 0.7.3's design verification
// (DESIGN_V1.md §0.1), live in Production. The OLD save() chained the ENTIRE write --
// ensureTripDocSynced, syncTripState, and its internal await batch.commit() -- behind
// saveInFlight.then(async()=>{...}). Per Firestore's own type docs, batch.commit()'s returned
// Promise "won't resolve while you're offline" -- so while offline, only the very first queued
// save() ever reached commit() at all; every save() after it sat waiting in memory for a Promise
// that would never resolve until reconnection, and was lost outright if the app closed/reloaded
// first. The fix (DESIGN_V1.md §3.2): issue each save()'s diff-and-commit immediately, and only
// serialize the narrow step of advancing lastSyncedSnapshot once each write's own Promise
// resolves, in order. These three tests assert the actual fixed structure, not just that
// diffBaseline/writeAttempt exist somewhere plausible.
function test_0_7_2_1_save_issues_each_writes_commit_immediately_not_queued_behind_an_earlier_saves(){
  const saveStart=app.indexOf('function save(){');
  const saveBody=app.slice(saveStart,app.indexOf('async function boot(){',saveStart));
  const writeAttemptIndex=saveBody.indexOf('const writeAttempt=(async()=>{');
  const saveInFlightAssignIndex=saveBody.indexOf('saveInFlight=saveInFlight.then(');
  assert(writeAttemptIndex>-1&&saveInFlightAssignIndex>-1);
  // The write must be issued (writeAttempt's IIFE called) BEFORE it is ever handed to saveInFlight
  // -- i.e. outside/ahead of the saveInFlight chain, not nested inside a callback passed to it.
  // This is exactly what the OLD buggy code got backwards.
  assert(writeAttemptIndex<saveInFlightAssignIndex);
  // The old buggy pattern -- the entire write wrapped inside saveInFlight's own .then(async()=>{ --
  // must not exist anywhere in save()'s body.
  assert(!saveBody.includes('saveInFlight=saveInFlight.then(async()=>{'));
}
function test_0_7_2_1_diffBaseline_is_captured_synchronously_before_the_write_is_issued(){
  const saveStart=app.indexOf('function save(){');
  const saveBody=app.slice(saveStart,app.indexOf('async function boot(){',saveStart));
  const diffBaselineIndex=saveBody.indexOf('const diffBaseline=lastSyncedSnapshot;');
  const writeAttemptIndex=saveBody.indexOf('const writeAttempt=(async()=>{');
  assert(diffBaselineIndex>-1&&writeAttemptIndex>-1&&diffBaselineIndex<writeAttemptIndex);
}
function test_0_7_2_1_saveInFlight_only_serializes_advancing_lastSyncedSnapshot_not_the_write_itself(){
  const saveStart=app.indexOf('function save(){');
  const saveBody=app.slice(saveStart,app.indexOf('async function boot(){',saveStart));
  assert(saveBody.includes('saveInFlight=saveInFlight.then(()=>writeAttempt).then('));
  const advanceIndex=saveBody.indexOf('lastSyncedSnapshot=committedSnapshot;');
  const chainIndex=saveBody.indexOf('saveInFlight=saveInFlight.then(()=>writeAttempt).then(');
  assert(advanceIndex>chainIndex); // the advance happens inside that .then(), not before it
  // The chain must still end in .catch() -- one save's failure must never leave saveInFlight
  // itself a rejected promise, which would permanently break every save() called after it.
  assert(saveBody.includes('}).catch(error=>{'));
}
function test_0_7_2_a_brand_new_trip_is_created_transparently_inside_save_not_ensureTrip(){
  // ensureTrip() itself needed no async awareness -- ensureTrip still only sets state.trip in
  // memory; the actual Firestore trip-doc creation happens lazily on the first save() after it.
  const ensureTripBody=app.slice(app.indexOf('function ensureTrip('),app.indexOf('function ensureTrip(')+400);
  assert(!/await|createTripDoc/.test(ensureTripBody));
  assert(app.includes('await createTripDoc(tripId,'));
}
function test_0_7_2_boot_skips_the_network_trip_list_query_when_offline_and_a_trip_is_remembered(){
  assert(app.includes('async function boot(){'));
  assert(app.includes("if(!navigator.onLine&&remembered){openTrip(remembered);return}"));
}
function test_0_7_2_main_js_offline_detection_recognizes_a_firestore_only_trip_not_just_the_legacy_blob(){
  assert(mainJs.includes("localStorage.getItem(LOCAL_DATA_KEY) || localStorage.getItem(ACTIVE_TRIP_KEY)"));
}
// A seventh real bug, caught by the Product Owner's own live acceptance testing (Test 8: offline/
// airplane-mode cold launch showed an empty Trip, breaking the frozen "installed PWA and last saved
// Trip available on first cold Offline launch" invariant, ARCHITECTURE_CURRENT_STATE.md). Root
// cause: boot() (v5-app.js) needs auth.currentUser (via currentUid()) to know which Trip to open,
// but the offline cold-launch branch here deliberately skipped Firebase Auth initialization
// entirely -- a shortcut that was safe under the pre-0.7.2 architecture (a pure localStorage read
// needed no auth dependency at all) but silently broke once boot() started depending on a restored
// session. Fixed: restoring an already-persisted session from IndexedDB is itself local, not
// network work, so it must still run here -- unlike getRedirectResult() or the live
// onAuthStateChanged stream, both still skipped.
function test_0_7_2_offline_cold_launch_still_restores_the_persisted_auth_session(){
  const start=mainJs.indexOf('if (!navigator.onLine && hasLocalTrip())');
  const body=mainJs.slice(start,mainJs.indexOf('await serviceWorkerReady;',start));
  assert(body.includes('await setPersistence(auth, browserLocalPersistence)'));
  assert(body.includes('onAuthStateChanged(auth, (user) => { unsubscribe(); currentUser = user; resolve(); })'));
  // getRedirectResult must still NOT be called in this branch -- it's irrelevant to a returning
  // offline user and can itself require network, unlike the local persisted-session restore above.
  assert(!body.includes('getRedirectResult'));
}
// Eighth/ninth/tenth real fixes, all from the SAME live retest: the offline-auth-restore fix above
// made Test 8 WORSE, not just ineffective -- an empty-Trip screen became a hard crash. Root cause:
// subscribeToTrip()'s onSnapshot listeners (cloud-store.js) never had an error callback, a gap that
// existed from this module's first version but was never exercised, since boot() used to bail out
// before ever reaching openTrip()/subscribeToTrip() while offline. Once the auth-restore fix let
// boot() reach this code offline for the first time ever, any listener error there was completely
// uncaught. These three tests assert the actual fix, not just that error-handling code exists
// somewhere plausible.
function test_0_7_2_subscribeToTrip_provides_an_error_callback_on_every_listener(){
  const start=cloudStore.indexOf('export function subscribeToTrip(');
  const body=cloudStore.slice(start,cloudStore.indexOf('export async function listMyTrips(',start));
  assert(body.includes('const handleError=error=>{console.error(\'Trip subscription failed\',error);if(onError)onError(error)};'));
  // Both the single trip-doc listener and the per-collection listeners must wire error:handleError
  // -- not just the trip doc, which would leave every subcollection listener still silently uncaught.
  const errorWirings=[...body.matchAll(/error:handleError/g)].length;
  assert.equal(errorWirings,2); // one on tripRef's own onSnapshot, one shared across the SYNCED_COLLECTIONS .map()
}
function test_0_7_2_openTrip_never_leaves_the_page_blank_on_a_subscription_failure(){
  const start=app.indexOf('function openTrip(tripId){');
  const body=app.slice(start,app.indexOf('function switchTrip(',start));
  assert(body.includes('subscribeToTrip(tripId,remoteState=>{'));
  // The second (error) callback must itself call render() -- a caught error that never renders
  // anything is just a slower, quieter version of the same blank-page failure.
  const errorCallbackStart=body.indexOf('},error=>{');
  assert(errorCallbackStart>-1);
  const errorCallbackBody=body.slice(errorCallbackStart);
  assert(errorCallbackBody.includes('notify(') && errorCallbackBody.includes('render();'));
}
function test_0_7_2_boot_has_a_top_level_backstop_so_no_uncaught_error_can_blank_the_page(){
  // boot() is invoked fire-and-forget (no caller awaits or .catch()es it) -- an uncaught rejection
  // anywhere in its body would otherwise surface as a silent unhandled rejection with no render()
  // ever called. bootInner() carries the real logic; boot() itself is purely this backstop.
  assert(app.includes('async function boot(){\n  try{await bootInner()}'));
  const start=app.indexOf('async function boot(){');
  const body=app.slice(start,app.indexOf('async function bootInner(){',start));
  assert(body.includes('catch(error){') && body.includes('render();'));
}
function test_0_7_2_qa_only_debug_hook_exposes_auth_db_storage_gated_by_origin_not_a_build_flag(){
  // qa and Production share the exact same build artifact (the point of promoting the untouched
  // qa-tested dist/ output, never a separate rebuild) -- a build-time env var could not
  // distinguish them at runtime the way an origin check can. Never exposed on Production.
  assert(firebaseConfig.includes("location.hostname.startsWith('qa--')"));
  assert(firebaseConfig.includes('window.__ft = {'));
  assert(firebaseConfig.includes('auth, db, storage,'));
}
// Second version of the debug hook, requested after the Product Owner's own live retest hit a
// second, subtler tooling gap: a freshly imported copy of firebase/firestore in DevTools is a
// DIFFERENT module instance than the one already bundled into this app, and the modular SDK's own
// internal checks reject a reference built from one copy against a Firestore instance from
// another -- an SDK-instance-mismatch artifact, not a rules result. Fixed by exposing ready-made
// helpers bound to this bundle's own doc/getDoc/updateDoc, so no separate import is ever needed.
function test_0_7_2_debug_hook_exposes_ready_made_helpers_bound_to_the_bundles_own_sdk_instance(){
  assert(firebaseConfig.includes("import { doc, getDoc, initializeFirestore, persistentLocalCache, persistentSingleTabManager, updateDoc } from 'firebase/firestore';"));
  const start=firebaseConfig.indexOf('window.__ft = {');
  const body=firebaseConfig.slice(start,firebaseConfig.indexOf('console.info(',start));
  assert(body.includes('tryGetTrip:'));
  assert(body.includes('tryWriteTrip:'));
  // Both helpers must use doc()/getDoc()/updateDoc() imported directly into this module (the app's
  // own bundled SDK copy), never a re-import inside the helper itself.
  assert(body.includes('await getDoc(doc(db, \'trips\', tripId));'));
  assert(body.includes('await updateDoc(doc(db, \'trips\', tripId),'));
}
// A real production bug, caught by the Product Owner during 0.7.2 QA testing (white screen +
// "(intermediate value)(intermediate value)(intermediate value) is not a function" immediately
// after sign-in): render()'s ternary called empty() itself (producing an HTML string) in its true
// branch, instead of passing the bare function reference like every other branch, so the trailing
// "()" that invokes whichever branch won tried to call that string as a function. Triggers
// specifically whenever there is no active Trip and the view isn't 'trips' -- exactly the state a
// freshly signed-in account is in before boot() finishes loading, so it hit every real sign-in.
// Decoded from the minified qa bundle via its build sourcemap (dist/assets/*.js.map, `vite build
// --sourcemap`) rather than guessed from the stack trace alone.
function test_0_7_2_render_passes_a_function_reference_to_its_view_dispatch_not_an_already_called_string(){
  assert(!app.includes("state.view!=='trips'?empty():"));
  assert(app.includes("state.view!=='trips'?empty:"));
}
// A second real production bug, caught by the Product Owner in the same qa round: a brand-new
// Trip's very first attachment upload got a live 403 from Firebase Storage. Root cause:
// storage.rules authorizes an upload only by checking the Trip's OWN Firestore document
// (firestore.get(...).data.ownerUid), but storeOriginal()/uploadAttachment() (reached from
// ingest()/smartIngest()/attachIngest(), all of which call createLocalSource() before the
// state.sources.push(source);save() that follows it) ran before save() ever created that
// document -- so on a brand-new Trip, the Firestore Trip document genuinely did not exist yet at
// the moment of upload, and Storage denies a rules evaluation against a nonexistent cross-service
// document rather than treating it as simply absent.
function test_0_7_2_storeOriginal_creates_the_firestore_trip_doc_before_uploading_not_after(){
  const start=app.indexOf('async function storeOriginal(');
  const body=app.slice(start,app.indexOf('async function openSource(',start));
  const ensureIndex=body.indexOf('await ensureTripDocSynced(');
  const uploadIndex=body.indexOf('await uploadAttachment(');
  assert(ensureIndex>-1&&uploadIndex>-1&&ensureIndex<uploadIndex);
}
function test_0_7_2_ensureTripDocSynced_is_shared_by_save_and_storeOriginal_not_duplicated(){
  assert(app.includes('async function ensureTripDocSynced(tripId,trip){'));
  const callers=[...app.matchAll(/ensureTripDocSynced\(/g)].length;
  assert.equal(callers,3); // its own definition + save()'s call + storeOriginal()'s call
}
// A third real gap, found by auditing every other direct Firestore/Storage call site in
// v5-app.js for the same "operates against a Trip document that may not exist yet" bug class,
// after the Product Owner's two live findings above -- not itself reported live, but reachable by
// this candidate's own Test 6 acceptance path (reset/delete a brand-new, never-yet-saved Trip):
// resetCurrentTrip() called deleteTripCompletely/clearAllTripContent unconditionally, which would
// hit the exact same permission error against a Trip document that was never created, for no
// reason -- there is nothing server-side to delete or clear in the first place.
function test_0_7_2_resetCurrentTrip_skips_the_firestore_calls_for_a_trip_that_was_never_synced(){
  const start=app.indexOf('async function resetCurrentTrip(');
  const body=app.slice(start,app.indexOf('async function ingest(',start));
  assert(body.includes('const everSynced=lastSyncedSnapshot?.trip?.id===tripId;'));
  const ifIndex=body.indexOf('if(everSynced){');
  const deleteIndex=body.indexOf('await deleteTripCompletely(tripId)');
  const clearIndex=body.indexOf('await clearAllTripContent(tripId)');
  assert(ifIndex>-1&&deleteIndex>ifIndex&&clearIndex>ifIndex);
}
// A fourth real gap, found in the same audit: myTrips (backing the Trip switcher) was only ever
// refreshed at boot() and after migration -- creating a brand-new second Trip via
// startNewTripFlow() never refreshed it, so the new Trip would silently not appear in
// tripsSection()/tripsView() until the next full reload, even after it genuinely existed in
// Firestore. This would have failed this candidate's own Test 2 acceptance criterion
// ("Confirm Settings lists both") the first time it was actually run.
function test_0_7_2_save_refreshes_myTrips_when_it_creates_a_brand_new_trip_document(){
  assert(app.includes('async function ensureTripDocSynced(tripId,trip){'));
  const start=app.indexOf('async function ensureTripDocSynced(');
  const helperBody=app.slice(start,app.indexOf('function save(){',start));
  assert(/return\s+false/.test(helperBody)&&/return\s+created/.test(helperBody));
  const saveStart=app.indexOf('function save(){');
  const saveBody=app.slice(saveStart,app.indexOf('async function boot(){',saveStart));
  assert(saveBody.includes('const createdNewTrip=await ensureTripDocSynced('));
  assert(saveBody.includes('if(createdNewTrip){'));
  assert(saveBody.includes('myTrips=await listMyTrips(uid,currentEmail())'));
}
function test_0_7_2_attachments_use_firebase_storage_not_indexeddb(){
  assert(app.includes('source.storagePath=await uploadAttachment(state.trip.id,source.id,file)'));
  // downloadAttachment now takes the caller's known content type as a second argument (Test 7 fix,
  // see test_0_7_2_downloadAttachment_avoids_cors_via_getBytes below) -- both real call sites pass
  // source.type, not a bare storagePath-only call.
  assert(app.includes('downloadAttachment(source.storagePath,source.type)'));
  const storeOriginalStart=app.indexOf('async function storeOriginal(');
  const storeOriginalBody=app.slice(storeOriginalStart,app.indexOf('async function openSource(',storeOriginalStart));
  assert(!/indexedDB/.test(storeOriginalBody));
}
// A sixth real bug, caught by the Product Owner's own live acceptance testing (Test 7, "Can't
// open" -- console showed a CORS rejection fetching the Storage download URL directly).
// getDownloadURL()+fetch() is a raw cross-origin browser request to storage.googleapis.com that
// needs the bucket's own CORS configuration (a separate GCS infrastructure step, not deployable
// through this repo or Firebase's rules system) -- getBytes() avoids the problem entirely by
// downloading through the Storage SDK's own network layer, the same mechanism uploadBytes()
// already used successfully.
function test_0_7_2_downloadAttachment_avoids_cors_via_getBytes(){
  assert(cloudStore.includes("import {deleteObject,getBytes,ref,uploadBytes} from 'firebase/storage';"));
  const start=cloudStore.indexOf('export async function downloadAttachment(');
  const body=cloudStore.slice(start,cloudStore.indexOf('export async function deleteAttachment(',start));
  assert(body.includes('const bytes=await getBytes(reference);'));
  assert(!/\bfetch\(/.test(body));
}
function test_0_7_2_legacy_indexeddb_access_is_now_read_only_and_migration_scoped(){
  assert(app.includes('function openLegacyDb()'));
  assert(app.includes('async function readLegacyBlob(id)'));
  // openLegacyDb must only ever be called from readLegacyBlob -- confirms nothing else in the
  // file still depends on the old per-device store for normal (non-migration) operation.
  const callers=[...app.matchAll(/openLegacyDb\(\)/g)].length;
  assert.equal(callers,2); // its own definition's transaction call site + readLegacyBlob's call
}
function test_0_7_2_migration_is_explicit_never_automatic(){
  assert(app.includes("data-action=\"run-migration\""));
  assert(app.includes("if(!confirm('להעביר את נתוני הטיול המקומי למערכת המשותפת?"));
  assert(app.includes('await migrateLocalTripToFirestore(legacy,uid,readLegacyBlob)'));
}
function test_0_7_2_migration_verifies_before_declaring_success(){
  assert(cloudStore.includes('אימות ההעברה נכשל'));
  assert(cloudStore.includes('if(snapshot.size!==expected)mismatches.push'));
}
function test_0_7_2_trip_switcher_and_editor_grant_are_reachable_from_settings(){
  assert(app.includes('function tripsSection()'));
  assert(app.includes('function sharingSection()'));
  assert(app.includes("${sharingSection()}${tripsSection()}"));
  assert(app.includes("data-action=\"switch-trip\""));
  assert(app.includes("id='add-editor-form'")||app.includes('id="add-editor-form"'));
}
function test_0_7_2_sharing_section_is_owner_only(){
  const sharingBody=app.slice(app.indexOf('function sharingSection()'),app.indexOf('function sharingSection()')+300);
  assert(sharingBody.includes('state.trip.ownerUid!==currentUid()'));
}
// A sixth and seventh real bug, both caught by the Product Owner's own live acceptance testing
// (Test 2 and Test 3), not by this suite -- the two prior tests above only confirmed sharingSection/
// tripsSection existed and were wired into settingsView, never that their own gating logic could
// actually be satisfied by a real user in a real session. Both fixed the same way: by asserting the
// specific logic, not just the presence of code, so a regression here fails loudly next time.
function test_0_7_2_ensureTrip_sets_ownerUid_so_a_freshly_created_trip_is_not_locked_out_of_its_own_sharing_section(){
  // sharingSection() gates on state.trip.ownerUid===currentUid() -- but ownerUid was otherwise only
  // ever populated by the real-time Firestore listener (openTrip()), which a brand-new Trip created
  // via ensureTrip() never goes through. Without this, ownerUid stayed undefined for the rest of
  // that session, so its own creator could never see "שיתוף הטിול" until a full reload re-ran
  // boot()'s openTrip() and the real Firestore data finally arrived.
  const start=app.indexOf('function ensureTrip(');
  const body=app.slice(start,app.indexOf('function defaultPacking(',start));
  assert(body.includes('ownerUid:currentUid(),editorEmails:[]'));
}
function test_0_7_2_start_new_trip_button_is_always_reachable_not_gated_on_having_other_trips(){
  // The old code returned '' from the whole tripsSection() -- "start a new Trip" button included --
  // whenever there was nothing yet to switch to, a chicken-and-egg gate: the only way to ever get a
  // second Trip was through a button that only appeared once a second Trip already existed.
  const start=app.indexOf('function tripsSection(){');
  const end=app.indexOf('function migrationBanner(',start);
  const body=app.slice(start,end);
  assert(!/if\(!others\.length&&!hasLegacyLocalTrip\(\)\)return ''/.test(body));
  assert(body.includes('data-action="start-new-trip"'));
}
function test_0_7_2_reset_and_delete_trip_operate_on_real_firestore_storage_records(){
  assert(app.includes('if(removeTrip)await deleteTripCompletely(tripId)'));
  assert(app.includes('else await clearAllTripContent(tripId)'));
}
function test_0_7_2_delete_trip_removes_storage_attachments_before_the_trip_document(){
  const order=cloudStore.indexOf('deleteAttachment(storagePath)');
  const clearOrder=cloudStore.indexOf('await clearAllTripContent(tripId)',cloudStore.indexOf('export async function deleteTripCompletely'));
  const docOrder=cloudStore.indexOf('await deleteDoc(tripRef(tripId))');
  assert(order>-1&&clearOrder>order&&docOrder>clearOrder);
}
function test_0_7_2_ownership_reconciliation_reads_firestore_via_the_callers_own_token_not_a_service_account(){
  // Decision 4's literal wording asked for a Firebase Admin/service-account client; this reuses
  // the caller's own already-verified ID token instead (a rules-respecting read, not an admin
  // bypass) -- a deliberate, reported deviation, not a silent one. See the 0.7.2 implementation
  // report and DESIGN_V1.md §2.4.
  assert(authShared.includes('token,projectId'));
  assert(quotaShared.includes('Authorization:`Bearer ${user.token}`'));
  assert(!/firebase-admin/.test(quotaShared));
  assert(!/firebase-admin/.test(authShared));
}
function test_0_7_2_ownership_check_falls_back_to_legacy_blobs_record_for_a_not_yet_migrated_trip(){
  assert(quotaShared.includes("return {status:'not_found'}"));
  assert(quotaShared.includes('const key=`trip/${hash(tripId)}`'));
}
function test_0_7_2_ownership_check_never_falls_back_for_a_trip_that_exists_in_firestore(){
  const body=quotaShared.slice(quotaShared.indexOf('export async function registerOrVerifyTrip'));
  assert(body.includes("if(firestoreResult.status==='found'){"));
  const foundBranch=body.slice(body.indexOf("status==='found'"),body.indexOf("if(firestoreResult.status==='forbidden')"));
  assert(foundBranch.includes('return'));
}
// Behavioral regression test for the specific 0.7.2.1 failure mode: multiple sequential
// offline-queued writes must each reach their own commit() immediately, without waiting for an
// earlier write's Promise to resolve first. v5-app.js's real save() cannot be invoked directly
// under this harness -- it imports firebase.js, which touches import.meta.env and throws outside
// a Vite build (the same limitation the top of this file already notes for cloud-store.js) -- so
// this mirrors save()'s own fixed control-flow shape (asserted by source-inspection in the three
// tests above) against a mock commit() standing in for Firestore's real batch.commit(), whose
// Promise, per its own type docs, "won't resolve while you're offline." This is a genuine
// behavioral test of the algorithm's shape, not of the real Firestore SDK -- no emulator is
// available in this environment to verify actual offline persistence behavior; that remains
// unverified from here, same as noted for the rest of this suite.
async function test_0_7_2_1_offline_writes_after_the_first_still_reach_commit_without_waiting_for_the_prior_write(){
  function flush(){return new Promise(resolve=>setTimeout(resolve,0))}
  const committedCalls=[];
  let resolveFirstCommit;
  const firstCommitPromise=new Promise(resolve=>{resolveFirstCommit=resolve});
  // Simulates Firestore while offline: call 0's "commit" is issued (committedCalls captures that)
  // but its Promise stays unresolved until the test explicitly resolves it, standing in for
  // reconnection. Calls 1 and 2 resolve immediately, standing in for edits queued afterward.
  function mockCommit(callIndex){committedCalls.push(callIndex);return callIndex===0?firstCommitPromise:Promise.resolve()}
  let saveInFlight=Promise.resolve();
  const advancedInOrder=[];
  // Mirrors save()'s own fixed shape exactly: writeAttempt's IIFE runs (and calls mockCommit)
  // immediately when mockSave() is called, never nested inside a callback handed to saveInFlight.
  function mockSave(callIndex){
    const writeAttempt=(async()=>{await mockCommit(callIndex);return callIndex})();
    saveInFlight=saveInFlight.then(()=>writeAttempt).then(committedIndex=>{advancedInOrder.push(committedIndex)});
  }
  mockSave(0);mockSave(1);mockSave(2);
  await flush();
  // The actual fix, demonstrated: all three commits were issued immediately -- under the OLD
  // buggy shape (the whole write chained behind saveInFlight.then(async()=>{...})), calls 1 and 2
  // would never have reached mockCommit at all until call 0's Promise resolved.
  assert.deepEqual(committedCalls,[0,1,2]);
  // Nothing has advanced yet -- call 0 is still "offline" (its commit Promise unresolved), and
  // advancing lastSyncedSnapshot stays serialized in call order behind it, as designed.
  assert.deepEqual(advancedInOrder,[]);
  resolveFirstCommit(0);
  await flush();
  assert.deepEqual(advancedInOrder,[0,1,2]);
}

const tests=[
  test_0_7_2_diffById_detects_additions,
  test_0_7_2_diffById_detects_removals,
  test_0_7_2_diffById_detects_changed_field,
  test_0_7_2_diffById_is_a_no_op_for_identical_records,
  test_0_7_2_diffById_handles_add_change_and_remove_together,
  test_0_7_2_diffById_treats_a_null_previous_snapshot_as_empty_not_a_crash,
  test_0_7_2_diffById_skips_records_with_no_id,
  test_0_7_2_synced_collections_covers_every_state_array_save_used_to_persist,
  test_0_7_2_trip_field_lists_do_not_overlap,
  test_0_7_2_firestore_rules_enforce_both_application_invitation_and_trip_role_layers,
  test_0_7_2_firestore_rules_allow_a_get_on_a_nonexistent_trip_to_check_existence_safely,
  test_0_7_2_firestore_rules_reject_a_trip_neither_owned_nor_shared_server_side,
  test_0_7_2_storage_rules_mirror_firestore_trip_access_via_cross_service_get,
  test_0_7_2_firebase_config_enables_firestore_offline_persistence,
  test_0_7_2_save_keeps_its_synchronous_call_signature_but_syncs_to_firestore_internally,
  test_0_7_2_1_save_issues_each_writes_commit_immediately_not_queued_behind_an_earlier_saves,
  test_0_7_2_1_diffBaseline_is_captured_synchronously_before_the_write_is_issued,
  test_0_7_2_1_saveInFlight_only_serializes_advancing_lastSyncedSnapshot_not_the_write_itself,
  test_0_7_2_a_brand_new_trip_is_created_transparently_inside_save_not_ensureTrip,
  test_0_7_2_boot_skips_the_network_trip_list_query_when_offline_and_a_trip_is_remembered,
  test_0_7_2_main_js_offline_detection_recognizes_a_firestore_only_trip_not_just_the_legacy_blob,
  test_0_7_2_offline_cold_launch_still_restores_the_persisted_auth_session,
  test_0_7_2_subscribeToTrip_provides_an_error_callback_on_every_listener,
  test_0_7_2_openTrip_never_leaves_the_page_blank_on_a_subscription_failure,
  test_0_7_2_boot_has_a_top_level_backstop_so_no_uncaught_error_can_blank_the_page,
  test_0_7_2_qa_only_debug_hook_exposes_auth_db_storage_gated_by_origin_not_a_build_flag,
  test_0_7_2_debug_hook_exposes_ready_made_helpers_bound_to_the_bundles_own_sdk_instance,
  test_0_7_2_render_passes_a_function_reference_to_its_view_dispatch_not_an_already_called_string,
  test_0_7_2_storeOriginal_creates_the_firestore_trip_doc_before_uploading_not_after,
  test_0_7_2_ensureTripDocSynced_is_shared_by_save_and_storeOriginal_not_duplicated,
  test_0_7_2_resetCurrentTrip_skips_the_firestore_calls_for_a_trip_that_was_never_synced,
  test_0_7_2_save_refreshes_myTrips_when_it_creates_a_brand_new_trip_document,
  test_0_7_2_attachments_use_firebase_storage_not_indexeddb,
  test_0_7_2_downloadAttachment_avoids_cors_via_getBytes,
  test_0_7_2_legacy_indexeddb_access_is_now_read_only_and_migration_scoped,
  test_0_7_2_migration_is_explicit_never_automatic,
  test_0_7_2_migration_verifies_before_declaring_success,
  test_0_7_2_trip_switcher_and_editor_grant_are_reachable_from_settings,
  test_0_7_2_sharing_section_is_owner_only,
  test_0_7_2_ensureTrip_sets_ownerUid_so_a_freshly_created_trip_is_not_locked_out_of_its_own_sharing_section,
  test_0_7_2_start_new_trip_button_is_always_reachable_not_gated_on_having_other_trips,
  test_0_7_2_reset_and_delete_trip_operate_on_real_firestore_storage_records,
  test_0_7_2_delete_trip_removes_storage_attachments_before_the_trip_document,
  test_0_7_2_ownership_reconciliation_reads_firestore_via_the_callers_own_token_not_a_service_account,
  test_0_7_2_ownership_check_falls_back_to_legacy_blobs_record_for_a_not_yet_migrated_trip,
  test_0_7_2_ownership_check_never_falls_back_for_a_trip_that_exists_in_firestore,
  test_0_7_2_1_offline_writes_after_the_first_still_reach_commit_without_waiting_for_the_prior_write,
];
for(const test of tests){await test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.2 -- Firestore datastore wiring, security rules, migration, ownership reconciliation (${tests.length} tests). Real Firestore/Storage network behavior is NOT exercised by this suite -- no emulator is available in this environment; see the 0.7.2 implementation report for what remains unverified.`);
