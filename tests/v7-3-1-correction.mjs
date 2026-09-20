import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.3.1: three findings from the 0.7.3 acceptance session's finding register
// (docs/versions/V7/0.7.3/EXECUTABLE_TEST_SESSION_V1.md), all found live by the Product Owner
// outside that session's own tests A-G. v5-app.js can't be imported directly under this harness --
// it touches firebase.js, which touches import.meta.env and throws outside a Vite build -- so
// everything here is source-inspection, matching the established pattern for this module.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

// Finding 1 (medium-high, 6/10): a Flight item's map link stayed stale after editing its
// location. Root cause: mapSearchLocation() always preferred item.details.departureAirport (an
// extraction-only field with no edit UI at all -- TYPE_FIELDS.flight has no departureAirport
// entry) over item.location (the one field the edit form actually exposes), so a genuine user
// edit to location was silently ignored by the map link. Fix: departureAirport only wins while
// location still equals the exact "DEP → ARR" route string Smart Import generated -- the moment
// it diverges (a real edit), the edit wins.
function test_0_7_3_1_mapSearchLocation_prefers_departureAirport_only_while_location_matches_the_generated_route(){
  const start=app.indexOf('function mapSearchLocation(item){');
  const body=app.slice(start,app.indexOf('// V6-F41',start+40)>-1?app.indexOf('function ',start+40):start+800);
  assert(body.includes("const importedRoute=[departure?.code,arrival?.code].filter(Boolean).join(' → ');"));
  assert(body.includes('if(item.location&&item.location===importedRoute)return departure?.code||departure?.name||item.location;'));
  assert(body.includes('return item.location||departure?.code||departure?.name||'));
}
function test_0_7_3_1_mapSearchLocation_still_falls_through_to_item_location_for_non_flight_types(){
  const start=app.indexOf('function mapSearchLocation(item){');
  const body=app.slice(start,app.indexOf('function ',start+40));
  const returnLines=[...body.matchAll(/return item\.location;/g)];
  assert(returnLines.length>=1); // the non-flight fallback at the end of the function
}

// Finding 2 (cosmetic, but a real regression in 0.7.3's own §2.3 buffering fix): a source row's
// "מנתח…" (analyzing) label stayed stuck long after analysis had actually finished. Root cause,
// traced through runSmartAnalysis()/smartIngest()'s real control flow: while a form-carrying
// modal is open, EVERY remote echo gets buffered into the single bufferedRemoteState slot,
// overwriting whatever was buffered before -- but nothing guaranteed the buffer got flushed
// (or cleared) at the exact moment the modal closed. A stale buffered snapshot (e.g. still
// reflecting processingState:'processing' from before analysis finished) could survive past a
// FRESHER remote update already applied directly through the no-modal-open path, and then get
// re-applied by render()'s own flush check on that SAME render pass -- silently reverting the
// fresher data that render() had just painted moments earlier in the very same call.
function test_0_7_3_1_openTrips_listener_clears_a_leftover_buffer_before_applying_a_fresher_update_directly(){
  const start=app.indexOf('function openTrip(tripId){');
  const body=app.slice(start,app.indexOf('function switchTrip(',start));
  const bufferedNullIndex=body.indexOf('bufferedRemoteState=null;',body.indexOf('if(state.modal){bufferedRemoteState=remoteState;return}'));
  const mergeIndex=body.indexOf('mergeRemoteState(remoteState);');
  assert(bufferedNullIndex>-1&&mergeIndex>-1&&bufferedNullIndex<mergeIndex);
}
function test_0_7_3_1_render_only_flushes_a_buffered_update_while_no_local_write_is_still_in_flight(){
  const start=app.indexOf('function render(){');
  const body=app.slice(start,app.indexOf('function ',start+20));
  assert(body.includes('if(bufferedRemoteState&&!state.modal){'));
  assert(body.includes('if(pendingSyncCount===0)mergeRemoteState(remoteState);'));
  // The buffer must be cleared either way (applied or discarded) -- a discarded one must never
  // sit around to be retried later against even-more-stale data.
  const flushBlockStart=body.indexOf('if(bufferedRemoteState&&!state.modal){');
  const flushBlockEnd=body.indexOf('}',body.indexOf('mergeRemoteState(remoteState);',flushBlockStart))+1;
  const flushBlock=body.slice(flushBlockStart,flushBlockEnd+40);
  assert(flushBlock.includes('bufferedRemoteState=null;'));
}

// Finding 3 (cosmetic): an empty "new trip" state flashed briefly on every app launch/refresh
// before the real Trip data loaded in. Root cause: render() (state.trip still null, EMPTY's own
// default) fires synchronously BEFORE boot() has resolved anything at all -- the very first paint
// always showed empty()'s "start with an empty Trip" call-to-action, indistinguishable from a
// genuinely Trip-less account. Fix: a one-time bootResolved latch distinguishes "nothing has
// loaded yet" from "boot() has a real answer" (a Trip opened, confirmed empty, or an error) --
// render() shows a neutral loading() view until it's true.
function test_0_7_3_1_render_shows_loading_not_empty_before_bootResolved(){
  const start=app.indexOf('function render(){');
  const body=app.slice(start,app.indexOf('function ',start+20));
  assert(body.includes("body=(!bootResolved?loading:!state.trip&&state.view!=='trips'?empty:(views[state.view]||todayView))();"));
}
function test_0_7_3_1_bootResolved_is_set_on_every_real_answer_boot_can_reach(){
  // Not signed in.
  const bootInnerStart=app.indexOf('async function bootInner(){');
  const bootInnerBody=app.slice(bootInnerStart,app.indexOf('function openTrip(',bootInnerStart));
  assert(bootInnerBody.includes('if(!uid){bootResolved=true;render();return}'));
  // listMyTrips itself failed and there's no remembered Trip to fall back to.
  assert(bootInnerBody.includes("bootResolved=true;notify('טעינת רשימת הטיולים נכשלה.');render();return;"));
  // Genuinely no active Trip (none remembered, none/many owned with no single unambiguous pick).
  assert(bootInnerBody.includes("else{bootResolved=true;state.view=myTrips.length?'trips':'today';render()}"));
  // boot()'s own top-level catch backstop -- an uncaught error is still a real answer.
  const bootStart=app.indexOf('async function boot(){');
  const bootBody=app.slice(bootStart,bootInnerStart);
  assert(bootBody.includes('bootResolved=true;'));
  // A real Trip snapshot actually arriving, via mergeRemoteState -- covers openTrip's own
  // immediate-apply path and render()'s buffered-flush path with one shared assignment.
  const mergeStart=app.indexOf('function mergeRemoteState(remoteState){');
  const mergeBody=app.slice(mergeStart,app.indexOf('function openTrip(',mergeStart));
  assert(mergeBody.includes('bootResolved=true;'));
  // A Trip subscription failure -- must not leave the UI stuck on the loading screen either.
  const openTripStart=app.indexOf('function openTrip(tripId){');
  const openTripBody=app.slice(openTripStart,app.indexOf('function switchTrip(',openTripStart));
  const errorCallbackStart=openTripBody.indexOf('},error=>{');
  assert(errorCallbackStart>-1&&openTripBody.slice(errorCallbackStart).includes('bootResolved=true;'));
}
function test_0_7_3_1_bootResolved_starts_false_so_the_very_first_synchronous_render_shows_loading(){
  assert(app.includes('let bootResolved=false;'));
  // Declared before the bottom-of-module `render();boot();` kickoff, not reset anywhere else
  // (switching Trips deliberately keeps the previous Trip's data visible while the new one loads,
  // a separate, already-correct behavior this candidate doesn't touch).
  const declarationIndex=app.indexOf('let bootResolved=false;');
  const kickoffIndex=app.lastIndexOf('render();boot();');
  assert(declarationIndex>-1&&kickoffIndex>declarationIndex);
  const resetCount=[...app.matchAll(/bootResolved=false;/g)].length;
  assert.equal(resetCount,1); // only the declaration itself -- never reset back to false
}

const tests=[
  test_0_7_3_1_mapSearchLocation_prefers_departureAirport_only_while_location_matches_the_generated_route,
  test_0_7_3_1_mapSearchLocation_still_falls_through_to_item_location_for_non_flight_types,
  test_0_7_3_1_openTrips_listener_clears_a_leftover_buffer_before_applying_a_fresher_update_directly,
  test_0_7_3_1_render_only_flushes_a_buffered_update_while_no_local_write_is_still_in_flight,
  test_0_7_3_1_render_shows_loading_not_empty_before_bootResolved,
  test_0_7_3_1_bootResolved_is_set_on_every_real_answer_boot_can_reach,
  test_0_7_3_1_bootResolved_starts_false_so_the_very_first_synchronous_render_shows_loading,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.3.1 -- Flight map-link staleness, stuck analyzing badge (buffer staleness), empty-trip flash on load (${tests.length} tests). No Firestore emulator is available in this environment; these tests verify the fixed logic by source-inspection, not live two-device timing -- see docs/versions/V7/0.7.3.1/EXECUTABLE_TEST_SESSION_V1.md for what the acceptance session verifies instead.`);
