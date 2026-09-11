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
  assert(app.includes('syncTripState(tripId,lastSyncedSnapshot,snapshotForThisSave)'));
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
function test_0_7_2_attachments_use_firebase_storage_not_indexeddb(){
  assert(app.includes('source.storagePath=await uploadAttachment(state.trip.id,source.id,file)'));
  assert(app.includes('const blob=await downloadAttachment(source.storagePath)'));
  const storeOriginalStart=app.indexOf('async function storeOriginal(');
  const storeOriginalBody=app.slice(storeOriginalStart,app.indexOf('async function openSource(',storeOriginalStart));
  assert(!/indexedDB/.test(storeOriginalBody));
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
  test_0_7_2_storage_rules_mirror_firestore_trip_access_via_cross_service_get,
  test_0_7_2_firebase_config_enables_firestore_offline_persistence,
  test_0_7_2_save_keeps_its_synchronous_call_signature_but_syncs_to_firestore_internally,
  test_0_7_2_a_brand_new_trip_is_created_transparently_inside_save_not_ensureTrip,
  test_0_7_2_boot_skips_the_network_trip_list_query_when_offline_and_a_trip_is_remembered,
  test_0_7_2_main_js_offline_detection_recognizes_a_firestore_only_trip_not_just_the_legacy_blob,
  test_0_7_2_attachments_use_firebase_storage_not_indexeddb,
  test_0_7_2_legacy_indexeddb_access_is_now_read_only_and_migration_scoped,
  test_0_7_2_migration_is_explicit_never_automatic,
  test_0_7_2_migration_verifies_before_declaring_success,
  test_0_7_2_trip_switcher_and_editor_grant_are_reachable_from_settings,
  test_0_7_2_sharing_section_is_owner_only,
  test_0_7_2_reset_and_delete_trip_operate_on_real_firestore_storage_records,
  test_0_7_2_delete_trip_removes_storage_attachments_before_the_trip_document,
  test_0_7_2_ownership_reconciliation_reads_firestore_via_the_callers_own_token_not_a_service_account,
  test_0_7_2_ownership_check_falls_back_to_legacy_blobs_record_for_a_not_yet_migrated_trip,
  test_0_7_2_ownership_check_never_falls_back_for_a_trip_that_exists_in_firestore,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.2 -- Firestore datastore wiring, security rules, migration, ownership reconciliation (${tests.length} tests). Real Firestore/Storage network behavior is NOT exercised by this suite -- no emulator is available in this environment; see the 0.7.2 implementation report for what remains unverified.`);
