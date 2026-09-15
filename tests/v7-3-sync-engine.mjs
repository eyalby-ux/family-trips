import assert from 'node:assert/strict';
import fs from 'node:fs';
import {diffById} from '../src/operational-data.js';

// diffById is the one genuinely pure, deterministic piece of the sync engine's logic --
// everything else (cloud-store.js's syncTripState/subscribeToTrip, v5-app.js's save()/render()/
// openTrip()) is either a real Firestore/Storage call or touches firebase.js, which touches
// import.meta.env and throws outside a Vite build, so nothing else here can be exercised directly
// under this project's plain-Node test harness. Everything past diffById's own tests below is
// verified by source-inspection instead, matching the established pattern for every module this
// harness cannot import directly (see tests/v7-2-firestore-migration.mjs's own comment).

function test_0_7_3_diffById_a_brand_new_record_goes_to_toCreate_as_a_full_record(){
  const {toCreate,toUpdate,toDelete}=diffById([],[{id:'a',name:'A'}]);
  assert.deepEqual(toCreate,[{id:'a',name:'A'}]);
  assert.deepEqual(toUpdate,[]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_3_diffById_detects_removals(){
  const {toCreate,toUpdate,toDelete}=diffById([{id:'a',name:'A'}],[]);
  assert.deepEqual(toCreate,[]);
  assert.deepEqual(toUpdate,[]);
  assert.deepEqual(toDelete,['a']);
}
// The actual 0.7.3 fix (DESIGN_V1.md §2.2): a changed field on an EXISTING record produces a
// field-level delta, not the whole record -- this is what lets two devices editing different
// fields of the same record both survive, instead of one full-record overwrite silently reverting
// the other's change.
function test_0_7_3_diffById_detects_a_single_changed_field_as_a_delta_not_the_whole_record(){
  const {toCreate,toUpdate,toDelete}=diffById([{id:'a',name:'A',notes:'x'}],[{id:'a',name:'A2',notes:'x'}]);
  assert.deepEqual(toCreate,[]);
  assert.deepEqual(toUpdate,[{id:'a',changedFields:{name:'A2'},deletedFields:[]}]);
  assert.deepEqual(toDelete,[]);
}
// The exact scenario DESIGN_V1.md §2.2 names: device A changes `notes`, device B concurrently
// changes `title` on the SAME record. Each device's own diff (against its own last-synced
// baseline) must carry ONLY the field it actually touched -- confirmed here by computing both
// devices' diffs independently against the same shared prior state.
function test_0_7_3_diffById_two_devices_editing_different_fields_of_the_same_record_each_get_a_disjoint_delta(){
  const shared={id:'item-1',title:'Old title',notes:'Old notes'};
  const deviceA=diffById([shared],[{...shared,notes:'A wrote this'}]);
  const deviceB=diffById([shared],[{...shared,title:'B wrote this'}]);
  assert.deepEqual(deviceA.toUpdate,[{id:'item-1',changedFields:{notes:'A wrote this'},deletedFields:[]}]);
  assert.deepEqual(deviceB.toUpdate,[{id:'item-1',changedFields:{title:'B wrote this'},deletedFields:[]}]);
}
function test_0_7_3_diffById_is_a_no_op_for_identical_records(){
  const {toCreate,toUpdate,toDelete}=diffById([{id:'a',name:'A'}],[{id:'a',name:'A'}]);
  assert.deepEqual(toCreate,[]);
  assert.deepEqual(toUpdate,[]);
  assert.deepEqual(toDelete,[]);
}
// The risk flag DESIGN_V1.md §7 names explicitly: a field that disappears from the record (not
// just changes value) must be reported so the caller can clear it with Firestore's deleteField()
// sentinel -- omitting a field from an update() call leaves it untouched server-side, it does not
// remove it, so this has to be a distinct signal from "unchanged".
function test_0_7_3_diffById_reports_a_removed_field_separately_from_a_changed_one(){
  const {toUpdate}=diffById([{id:'a',name:'A',notes:'delete me'}],[{id:'a',name:'A'}]);
  assert.deepEqual(toUpdate,[{id:'a',changedFields:{},deletedFields:['notes']}]);
}
function test_0_7_3_diffById_handles_a_changed_field_and_a_deleted_field_on_the_same_record_together(){
  const {toUpdate}=diffById([{id:'a',name:'A',notes:'old',website:'gone'}],[{id:'a',name:'A2',notes:'old'}]);
  assert.deepEqual(toUpdate,[{id:'a',changedFields:{name:'A2'},deletedFields:['website']}]);
}
// A brand-new field appearing on an already-existing record (id was present before, this field
// wasn't) is a changed field like any other, not a special case.
function test_0_7_3_diffById_a_newly_added_field_on_an_existing_record_is_a_changed_field(){
  const {toUpdate}=diffById([{id:'a',name:'A'}],[{id:'a',name:'A',notes:'brand new field'}]);
  assert.deepEqual(toUpdate,[{id:'a',changedFields:{notes:'brand new field'},deletedFields:[]}]);
}
function test_0_7_3_diffById_id_itself_is_never_reported_as_a_changed_field(){
  const {toUpdate}=diffById([{id:'a',name:'A'}],[{id:'a',name:'A2'}]);
  assert.deepEqual(Object.keys(toUpdate[0].changedFields),['name']);
}
function test_0_7_3_diffById_handles_add_change_and_remove_together(){
  const previous=[{id:'a',name:'A'},{id:'b',name:'B'}];
  const next=[{id:'a',name:'A'},{id:'b',name:'B2'},{id:'c',name:'C'}];
  const {toCreate,toUpdate,toDelete}=diffById(previous,next);
  assert.deepEqual(toCreate,[{id:'c',name:'C'}]);
  assert.deepEqual(toUpdate,[{id:'b',changedFields:{name:'B2'},deletedFields:[]}]);
  assert.deepEqual(toDelete,[]);
  const {toCreate:toCreate2,toUpdate:toUpdate2,toDelete:toDelete2}=diffById(next,[{id:'a',name:'A'}]);
  assert.deepEqual(toCreate2,[]);
  assert.deepEqual(toUpdate2,[]);
  assert.deepEqual(toDelete2.sort(),['b','c']);
}
function test_0_7_3_diffById_treats_a_null_previous_snapshot_as_empty_not_a_crash(){
  const {toCreate,toUpdate,toDelete}=diffById(null,[{id:'a',name:'A'}]);
  assert.deepEqual(toCreate,[{id:'a',name:'A'}]);
  assert.deepEqual(toUpdate,[]);
  assert.deepEqual(toDelete,[]);
}
function test_0_7_3_diffById_skips_records_with_no_id(){
  const {toCreate,toUpdate,toDelete}=diffById([],[{name:'no id'},{id:'a',name:'A'}]);
  assert.deepEqual(toCreate,[{id:'a',name:'A'}]);
  assert.deepEqual(toUpdate,[]);
  assert.deepEqual(toDelete,[]);
}

const cloudStore=fs.readFileSync(new URL('../src/cloud-store.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

// 0.7.3 (DESIGN_V1.md §2.2): syncTripState must actually USE diffById's new field-level shape --
// batch.update() with only the changed fields (plus deleteField() for removed ones) for an
// existing record, batch.set() only for a genuinely brand-new one (update() fails outright
// against a document that doesn't exist yet, so this distinction is load-bearing).
function test_0_7_3_syncTripState_writes_existing_records_via_batch_update_not_a_full_overwrite(){
  const start=cloudStore.indexOf('export async function syncTripState(');
  const body=cloudStore.slice(start,cloudStore.indexOf('// Assembles one full state-shaped object',start));
  assert(body.includes('const {toCreate,toUpdate,toDelete}=diffById('));
  assert(body.includes("writes.push({type:'update'"));
  assert(!body.includes("batch.set(write.ref,write.data,write.merge?{merge:true}:{})") || body.includes("batch.update(write.ref,write.data)"));
  assert(body.includes('batch.update(write.ref,write.data)'));
}
function test_0_7_3_syncTripState_clears_deleted_fields_via_deleteField_sentinel(){
  assert(cloudStore.includes("import {collection,deleteDoc,deleteField,doc,"));
  const start=cloudStore.indexOf('export async function syncTripState(');
  const body=cloudStore.slice(start,cloudStore.indexOf('// Assembles one full state-shaped object',start));
  assert(body.includes('for(const field of deletedFields)data[field]=deleteField();'));
}
function test_0_7_3_syncTripState_still_uses_a_full_set_for_a_brand_new_record(){
  const start=cloudStore.indexOf('export async function syncTripState(');
  const body=cloudStore.slice(start,cloudStore.indexOf('// Assembles one full state-shaped object',start));
  assert(body.includes('for(const record of toCreate)writes.push({type:\'set\''));
}
// Attribution pair uses syncedAt/syncedByUid, deliberately NOT the app's own pre-existing
// `updatedAt` field (proposal-lifecycle.js/v5-app.js already write a domain-meaningful `updatedAt`
// on suggestion records) -- reusing that name in the sync layer would silently conflate two
// unrelated meanings under one field.
function test_0_7_3_syncTripState_attribution_fields_do_not_collide_with_the_apps_own_updatedAt(){
  const start=cloudStore.indexOf('export async function syncTripState(');
  const body=cloudStore.slice(start,cloudStore.indexOf('// Assembles one full state-shaped object',start));
  assert(body.includes('syncedAt'));
  assert(body.includes('syncedByUid'));
  assert(!/[^\w]updatedAt[^\w]/.test(body.replace(/syncedAt/g,'')));
}

// 0.7.3 (DESIGN_V1.md §0.2/§2.3): a live remote update must never silently destroy an open,
// unsubmitted edit form. These assert the actual fixed structure -- buffering while state.modal is
// set, flushing exactly once render() runs with no modal open -- not just that the pieces exist
// somewhere plausible.
function test_0_7_3_openTrips_listener_buffers_a_remote_update_instead_of_applying_it_while_a_modal_is_open(){
  const start=app.indexOf('function openTrip(tripId){');
  const body=app.slice(start,app.indexOf('function switchTrip(',start));
  assert(body.includes('if(state.modal){bufferedRemoteState=remoteState;return}'));
  // The immediate-apply path (no modal open) must still merge and render right away, exactly like
  // 0.7.2's own original behavior for the common case.
  assert(body.includes('mergeRemoteState(remoteState);\n    render();'));
}
function test_0_7_3_render_flushes_exactly_one_buffered_update_only_once_no_modal_is_open(){
  const start=app.indexOf('function render(){');
  const body=app.slice(start,app.indexOf('function ',start+20));
  assert(body.includes('if(bufferedRemoteState&&!state.modal){'));
  assert(body.includes('bufferedRemoteState=null'));
  assert(body.includes('mergeRemoteState(remoteState)'));
}
function test_0_7_3_bufferedRemoteState_is_reset_everywhere_lastSyncedSnapshot_is(){
  // Every place that resets lastSyncedSnapshot=null (a Trip subscription is being torn down and
  // rebuilt) must also reset bufferedRemoteState=null -- a stale buffered update from a PREVIOUS
  // trip must never leak into a newly-opened one.
  const openTripStart=app.indexOf('function openTrip(tripId){');
  const openTripBody=app.slice(openTripStart,app.indexOf('function switchTrip(',openTripStart));
  assert(openTripBody.includes('lastSyncedSnapshot=null;')&&openTripBody.includes('bufferedRemoteState=null;'));
  const startNewStart=app.indexOf('async function startNewTripFlow(){');
  const startNewBody=app.slice(startNewStart,app.indexOf('function uid(',startNewStart));
  assert(startNewBody.includes('lastSyncedSnapshot=null;')&&startNewBody.includes('bufferedRemoteState=null;'));
  const resetStart=app.indexOf('async function resetCurrentTrip(');
  const resetBody=app.slice(resetStart,app.indexOf('async function ingest(',resetStart));
  assert(resetBody.includes('lastSyncedSnapshot=null;')&&resetBody.includes('bufferedRemoteState=null;'));
}
function test_0_7_3_mergeRemoteState_preserves_the_same_ephemeral_fields_as_before(){
  const start=app.indexOf('function mergeRemoteState(remoteState){');
  const body=app.slice(start,app.indexOf('function openTrip(',start));
  assert(body.includes('const {view,category,itemId,suggestionId,modal,timelineMode,calendarDate,toast}=state;'));
  assert(body.includes('normalizeOperationalState(state);'));
  assert(body.includes('lastSyncedSnapshot=clone(state);'));
  // mergeRemoteState itself must NOT call render() -- render() calls it (for the buffered-flush
  // case) and openTrip calls it directly then renders separately (for the immediate case); if
  // mergeRemoteState also rendered, the flush path would render twice per update.
  assert(!body.includes('render()'));
}

// 0.7.3 (DESIGN_V1.md §4, Product Owner decision: option 2, the minimal pending-sync indicator).
function test_0_7_3_save_tracks_pendingSyncCount_around_each_write(){
  const start=app.indexOf('function save(){');
  const body=app.slice(start,app.indexOf('async function boot(){',start));
  assert(body.includes('pendingSyncCount++;'));
  // Must decrement (and re-render) regardless of success or failure, via .finally() -- a failed
  // write must not leave the pending-sync indicator stuck on forever.
  assert(body.includes('.finally(()=>{pendingSyncCount--;render()});'));
}
function test_0_7_3_syncBanner_shows_offline_first_then_pending_sync_then_nothing(){
  const start=app.indexOf('function syncBanner(){');
  const body=app.slice(start,app.indexOf('function render(){',start));
  assert(body.includes('if(!navigator.onLine)return'));
  assert(body.includes('if(pendingSyncCount>0)return'));
  const offlineIndex=body.indexOf('!navigator.onLine');
  const pendingIndex=body.indexOf('pendingSyncCount>0');
  assert(offlineIndex<pendingIndex); // offline is checked (and wins) before pending-sync
}
function test_0_7_3_render_uses_syncBanner_instead_of_the_old_inline_offline_check(){
  const start=app.indexOf('function render(){');
  const body=app.slice(start,app.indexOf('function ',start+20));
  assert(body.includes('${syncBanner()}'));
  assert(!body.includes("!navigator.onLine?'<div class=\"offline\">"));
}

const tests=[
  test_0_7_3_diffById_a_brand_new_record_goes_to_toCreate_as_a_full_record,
  test_0_7_3_diffById_detects_removals,
  test_0_7_3_diffById_detects_a_single_changed_field_as_a_delta_not_the_whole_record,
  test_0_7_3_diffById_two_devices_editing_different_fields_of_the_same_record_each_get_a_disjoint_delta,
  test_0_7_3_diffById_is_a_no_op_for_identical_records,
  test_0_7_3_diffById_reports_a_removed_field_separately_from_a_changed_one,
  test_0_7_3_diffById_handles_a_changed_field_and_a_deleted_field_on_the_same_record_together,
  test_0_7_3_diffById_a_newly_added_field_on_an_existing_record_is_a_changed_field,
  test_0_7_3_diffById_id_itself_is_never_reported_as_a_changed_field,
  test_0_7_3_diffById_handles_add_change_and_remove_together,
  test_0_7_3_diffById_treats_a_null_previous_snapshot_as_empty_not_a_crash,
  test_0_7_3_diffById_skips_records_with_no_id,
  test_0_7_3_syncTripState_writes_existing_records_via_batch_update_not_a_full_overwrite,
  test_0_7_3_syncTripState_clears_deleted_fields_via_deleteField_sentinel,
  test_0_7_3_syncTripState_still_uses_a_full_set_for_a_brand_new_record,
  test_0_7_3_syncTripState_attribution_fields_do_not_collide_with_the_apps_own_updatedAt,
  test_0_7_3_openTrips_listener_buffers_a_remote_update_instead_of_applying_it_while_a_modal_is_open,
  test_0_7_3_render_flushes_exactly_one_buffered_update_only_once_no_modal_is_open,
  test_0_7_3_bufferedRemoteState_is_reset_everywhere_lastSyncedSnapshot_is,
  test_0_7_3_mergeRemoteState_preserves_the_same_ephemeral_fields_as_before,
  test_0_7_3_save_tracks_pendingSyncCount_around_each_write,
  test_0_7_3_syncBanner_shows_offline_first_then_pending_sync_then_nothing,
  test_0_7_3_render_uses_syncBanner_instead_of_the_old_inline_offline_check,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.3 -- field-level merge writes (diffById/syncTripState), open-form buffering, pending-sync indicator (${tests.length} tests). Real Firestore/Storage network behavior, and the two-device offline/reconnect scenarios themselves, are NOT exercised by this suite -- no emulator is available in this environment; see docs/versions/V7/0.7.3/EXECUTABLE_TEST_SESSION_V1.md for what the acceptance session verifies instead.`);
