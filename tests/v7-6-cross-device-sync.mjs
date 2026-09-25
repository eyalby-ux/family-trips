import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.6: original-source cross-device sync. Per DESIGN_V1.md's own headline finding, confirmed by
// direct code inspection, not assumed: cross-device retrieval already worked before this candidate
// (0.7.2's real Storage read/write plus 0.7.3's existing field-level sync of the sources
// collection) -- this candidate's real scope is V7-F08 (orphaned Storage cleanup on deletion), a
// copy-only message fix, and documenting two things that were already true (encryption, retention)
// plus one limitation left deliberately unbuilt (offline file upload).
//
// cloud-store.js and v5-app.js still cannot be imported directly under this harness (touch
// firebase.js, which touches import.meta.env and throws outside a Vite build) -- verified by
// source-inspection, matching the established pattern for these exact modules throughout this
// project.
const cloudStore=fs.readFileSync(new URL('../src/cloud-store.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const storageRules=fs.readFileSync(new URL('../storage.rules',import.meta.url),'utf8');

// 0.7.6 correction, round 2 (found live, Tests 2/3, after round 1's own rules fix didn't resolve
// it either): the original listAll()-based prefix sweep was wrong for two independent reasons --
// (1) listAll() is not recursive, and files live one segment deeper than the prefix it listed
// (trips/{tripId}/sources/{sourceId}/{fileName}), so it always found zero items; (2) Firebase
// Storage evaluates a `list` rule against its ENTIRE potential result set, which round 1's own
// attempted rules fix still couldn't safely satisfy at this depth. Reverted to reading each
// source's already-known storagePath directly from Firestore -- the exact pattern
// deleteTripCompletely used successfully before 0.7.6 touched it. This needs no `list` Storage
// permission at all, so storage.rules is back to its pre-0.7.6 text, confirmed here.
function test_0_7_6_storage_rules_have_no_list_permission_the_reverted_approach_does_not_need(){
  assert(!storageRules.includes('allow list:'));
}

function test_0_7_6_deleteAllAttachments_reads_each_sources_storagePath_from_firestore(){
  const start=cloudStore.indexOf('async function deleteAllAttachments');
  assert(start>-1);
  const body=cloudStore.slice(start,cloudStore.indexOf('\n}',start)+2);
  assert(body.includes("getDocs(subRef(tripId,'sources'))"));
  assert(body.includes('document.data()?.storagePath'));
  assert(body.includes('await deleteAttachment(storagePath)'));
  // No listAll()/Storage-side listing of any kind -- deleteAttachment() only ever touches one
  // exact, already-known file path, already covered by the existing file-level read/write rule.
  assert(!body.includes('listAll'));
}
function test_0_7_6_clearAllTripContent_cleans_up_storage_before_deleting_firestore_records(){
  const start=cloudStore.indexOf('export async function clearAllTripContent');
  const body=cloudStore.slice(start,cloudStore.indexOf('\n}',start)+2);
  const cleanupIndex=body.indexOf('await deleteAllAttachments(tripId)');
  const firstBatchIndex=body.indexOf('for(const [,collectionName] of SYNCED_COLLECTIONS)');
  assert(cleanupIndex>-1&&firstBatchIndex>-1);
  assert(cleanupIndex<firstBatchIndex,'Storage cleanup must run before the Firestore batch deletes, matching this project\'s established ordering discipline');
}
function test_0_7_6_deleteTripCompletely_no_longer_has_its_own_per_source_storage_loop(){
  const start=cloudStore.indexOf('export async function deleteTripCompletely');
  const body=cloudStore.slice(start,cloudStore.indexOf('\n}',start)+2);
  // The old loop this replaced read each source's storagePath directly via a Firestore query --
  // confirming it's genuinely gone, not left duplicated alongside the new helper.
  assert(!body.includes('getDocs(subRef(tripId'));
  assert(!body.includes("document.data()?.storagePath"));
  assert(body.includes('await clearAllTripContent(tripId)'));
  assert(body.includes('await deleteDoc(tripRef(tripId))'));
}
function test_0_7_6_only_one_storagePath_cleanup_mechanism_exists_not_duplicated(){
  // Guards against the fix having been duplicated rather than shared -- deleteAllAttachments()
  // should be the ONLY place this pattern appears (called from both clearAllTripContent and,
  // via that, deleteTripCompletely), not re-inlined a second time anywhere.
  const occurrences=(cloudStore.match(/document\.data\(\)\?\.storagePath/g)||[]).length;
  assert.equal(occurrences,1);
}
function test_0_7_6_open_source_message_no_longer_implies_a_per_device_availability_gap(){
  assert(!app.includes('קובץ המקור אינו זמין אופליין במכשיר זה'));
  assert(app.includes('קובץ המקור אינו זמין — ייתכן שהוא לא הועלה בהצלחה'));
  // Both call sites carrying the old wrong assumption were fixed, not just the one named in the
  // kickoff -- openSource() and analyzeSavedSource() shared the identical stale message.
  const occurrences=(app.match(/קובץ המקור אינו זמין — ייתכן שהוא לא הועלה בהצלחה/g)||[]).length;
  assert.equal(occurrences,2);
}
function test_0_7_6_encryption_and_retention_are_documented_as_already_satisfied(){
  const start=cloudStore.indexOf('function attachmentRef');
  const commentBlock=cloudStore.slice(cloudStore.lastIndexOf('// 0.7.6',start),start);
  assert(commentBlock.includes('encryption'));
  assert(commentBlock.includes('retention'));
  assert(commentBlock.includes('at-rest default'));
}
function test_0_7_6_offline_upload_is_documented_as_a_known_limitation_not_left_unexplained(){
  const start=app.indexOf('async function storeOriginal');
  const commentBlock=app.slice(app.lastIndexOf('// 0.7.6',start),start);
  assert(commentBlock.includes('known, accepted limitation'));
  assert(commentBlock.includes('no offline'));
  assert(commentBlock.includes('queueing'));
}
function test_0_7_6_admin_delete_account_was_not_touched_confirmed_already_correct(){
  // DESIGN_V1.md §4.3's own finding: admin-delete-account.mjs already does Storage cleanup
  // correctly (bucket().deleteFiles({prefix}) before firestore.recursiveDelete) -- no fix needed,
  // confirmed by its own git history staying untouched by this candidate's commit.
  const adminFn=fs.readFileSync(new URL('../netlify/functions/admin-delete-account.mjs',import.meta.url),'utf8');
  assert(adminFn.includes("bucket().deleteFiles({prefix:"));
  assert(!adminFn.includes('deleteAllAttachments'));
}

const tests=[
  test_0_7_6_storage_rules_have_no_list_permission_the_reverted_approach_does_not_need,
  test_0_7_6_deleteAllAttachments_reads_each_sources_storagePath_from_firestore,
  test_0_7_6_clearAllTripContent_cleans_up_storage_before_deleting_firestore_records,
  test_0_7_6_deleteTripCompletely_no_longer_has_its_own_per_source_storage_loop,
  test_0_7_6_only_one_storagePath_cleanup_mechanism_exists_not_duplicated,
  test_0_7_6_open_source_message_no_longer_implies_a_per_device_availability_gap,
  test_0_7_6_encryption_and_retention_are_documented_as_already_satisfied,
  test_0_7_6_offline_upload_is_documented_as_a_known_limitation_not_left_unexplained,
  test_0_7_6_admin_delete_account_was_not_touched_confirmed_already_correct,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.6 -- original-source cross-device sync, real scope narrowed to V7-F08 Storage cleanup (${tests.length} tests). No Firestore/Storage emulator or second real device is reachable from this environment, so the actual cross-device retrieval behavior, the live deleteAllAttachments sweep against a real bucket, and cross-device deletion visibility remain unverified against a live backend from here -- consistent with every prior Firestore-backed candidate in this project.`);
