import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEM_TYPES,TYPE_FIELDS,buildItemFormValues,scheduleForType} from '../src/ingestion.js';

// 0.7.7: Shopping places + scheduled shopping visits. Real scope, confirmed by direct code
// inspection before writing FAMILY_TRIPS_ALPHA_0_7_7_SCOPE_V1.md: the shared shopping list
// (state.shopping) already existed and already synced -- untouched by this candidate except for
// one new optional field (placeId). The real gap was a shopping-place/visit entity, modeled as a
// new ITEM_TYPES entry (shoppingPlace) per the same reasoning 0.7.4 used for Transport: Firestore
// sync via state.items, participant scope and Timeline/Calendar projection all come for free.
//
// One open design question was flagged rather than assumed: every existing ITEM_TYPES entry has a
// schedule shape FIXED per type, but a shopping place needs it mutable PER INSTANCE (undated until
// a date is added, in place, no duplicate record). Verified directly: every reader (Timeline sort/
// group, Today's relevance filter, conflict/out-of-range detection, itemRow's own date rendering)
// already treats item.schedule as a genuine per-item field -- good news for a new-ITEM_TYPES-entry
// approach. But the only WRITER, buildItemFormValues (used by both manual create and edit-item),
// recomputed schedule from ITEM_TYPES[type].schedule on every single save -- a harmless no-op for
// every existing type (whose schedule never varies), but it would have silently reset a shopping
// place's schedule back to 'none' on the very save meant to add a date. Fixed with scheduleForType,
// a small type-conditional exception, not a rebuild of the write path.
//
// Two further, related fixes were required to actually deliver the agreed acceptance criteria, not
// scope creep: (1) center()'s generic Trip Center tile grid is driven off Object.entries(ITEM_TYPES)
// minus link/participant -- a plain new entry would render as its own SEPARATE tile, contradicting
// the frozen contract's single combined "Shopping" category (places + list together). shoppingPlace
// needed the same exclusion, with shoppingView() itself gaining a places section. (2) found only
// during implementation, not in the original scope document: manualCreateDefaults() pre-fills
// startAt/endAt with the Trip's own start date for every type when the manual-create form opens --
// harmless for every existing type, but it would defeat "may be saved without a date at all" for a
// shopping place left untouched. Skipped for shoppingPlace only.
//
// v5-app.js still cannot be imported directly under this harness (touches firebase.js, which
// touches import.meta.env and throws outside a Vite build) -- verified by source-inspection below,
// matching the established pattern for this module throughout this project. ingestion.js has no
// env-dependent imports and is tested directly, with real function calls, not source-inspection.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

function mockFormData(fields){
  return {
    get:(name)=>Object.prototype.hasOwnProperty.call(fields,name)?fields[name]:null,
    getAll:(name)=>Array.isArray(fields[name])?fields[name]:(fields[name]!=null?[fields[name]]:[]),
  };
}

function test_0_7_7_shoppingPlace_is_a_real_item_type_with_no_fixed_schedule_default(){
  assert(ITEM_TYPES.shoppingPlace);
  assert.equal(ITEM_TYPES.shoppingPlace.schedule,'none');
  assert.deepEqual(TYPE_FIELDS.shoppingPlace,['location','website','phone','startAt','notes']);
  // Deliberately no provider/confirmationNumber -- not in this candidate's own acceptance criteria.
  assert(!TYPE_FIELDS.shoppingPlace.includes('provider'));
}

function test_0_7_7_scheduleForType_derives_shoppingPlace_from_whether_a_date_was_entered(){
  assert.equal(scheduleForType('shoppingPlace',false),'none');
  assert.equal(scheduleForType('shoppingPlace',true),'single');
}

function test_0_7_7_scheduleForType_leaves_every_existing_type_unaffected_by_date_presence(){
  // The real regression guard for the open design question's own fix: every pre-existing type's
  // schedule must still come from ITEM_TYPES, completely independent of whether a date was entered
  // -- exactly the previously-true, previously-untested assumption this correction had to preserve.
  for(const type of ['flight','hotel','car','activity','restaurant','insurance','link','document','contact','participant']){
    assert.equal(scheduleForType(type,false),ITEM_TYPES[type].schedule,`${type} with no date`);
    assert.equal(scheduleForType(type,true),ITEM_TYPES[type].schedule,`${type} with a date`);
  }
}

function test_0_7_7_buildItemFormValues_shoppingPlace_undated_save_is_schedule_none(){
  const values=buildItemFormValues(mockFormData({type:'shoppingPlace',title:'Central World Mall'}));
  assert.equal(values.schedule,'none');
  assert.equal(values.startAt,'');
}

function test_0_7_7_buildItemFormValues_shoppingPlace_dated_save_is_schedule_single(){
  const values=buildItemFormValues(mockFormData({type:'shoppingPlace',title:'Chatuchak Market',startAt:'2027-01-05T10:00',endAt:''}));
  assert.equal(values.schedule,'single');
  assert.equal(values.startAt,'2027-01-05T10:00');
}

function test_0_7_7_buildItemFormValues_shoppingPlace_editing_the_same_record_flips_schedule_in_place(){
  // The frozen contract's own explicit requirement: adding a date SCHEDULES THE SAME ENTITY, not a
  // second record -- simulated here as two successive buildItemFormValues calls against the same
  // id, exactly as the edit-item-form submit handler's Object.assign(item,values,...) would apply.
  const undated=buildItemFormValues(mockFormData({type:'shoppingPlace',title:'Central World Mall'}));
  assert.equal(undated.schedule,'none');
  const dated=buildItemFormValues(mockFormData({type:'shoppingPlace',title:'Central World Mall',startAt:'2027-01-06T15:00',endAt:''}));
  assert.equal(dated.schedule,'single');
}

function test_0_7_7_buildItemFormValues_existing_types_unaffected_by_this_fix(){
  // hotel's schedule is 'range' regardless of whether a date was entered -- must remain true after
  // scheduleForType's introduction, not just before it.
  const noDates=buildItemFormValues(mockFormData({type:'hotel',title:'x'}));
  assert.equal(noDates.schedule,'range');
  const withDates=buildItemFormValues(mockFormData({type:'hotel',title:'x',startAt:'2027-01-01T12:00',endAt:'2027-01-03T12:00'}));
  assert.equal(withDates.schedule,'range');
}

function test_0_7_7_updateSuggestion_uses_the_same_scheduleForType_fix(){
  const start=app.indexOf('function updateSuggestion');
  const body=app.slice(start,app.indexOf('\n',app.indexOf('changedFields',start)));
  assert(body.includes('scheduleForType(type,Boolean(range.start))'));
  assert(!body.includes("ITEM_TYPES[type]?.schedule||'none'"));
}

function test_0_7_7_scheduleForType_is_imported_in_v5_app(){
  const importLine=app.split('\n').find(line=>line.includes("from './ingestion.js'"));
  assert(importLine.includes('scheduleForType'));
}

function test_0_7_7_shoppingPlace_excluded_from_the_generic_trip_center_tile_grid(){
  const start=app.indexOf('const visibleTypes=');
  const line=app.slice(start,app.indexOf('\n',start));
  assert(line.includes("'shoppingPlace'"));
  assert(line.includes("'link'"));
  assert(line.includes("'participant'"));
}

function test_0_7_7_shoppingView_renders_a_places_section_using_the_standard_itemRow(){
  const start=app.indexOf('function shoppingView');
  const body=app.slice(start,app.indexOf('\n}',start)+2);
  assert(body.includes("item.type==='shoppingPlace'"));
  assert(body.includes('places.map(itemRow)'));
  assert(body.includes('data-action="shopping-place-add"'));
}

function test_0_7_7_shopping_place_add_action_reuses_the_existing_manual_create_pipeline(){
  assert(app.includes("action==='shopping-place-add'){state.category='shoppingPlace';state.modal={type:'intake',source:'manual'};render()}"));
}

function test_0_7_7_manual_create_skips_the_trip_start_date_prefill_for_shoppingPlace_only(){
  // Found during implementation, not in the original scope document: manualCreateDefaults() would
  // otherwise pre-fill startAt with the Trip's own start date for every type, including
  // shoppingPlace -- defeating "may be saved without a date at all" if left untouched by the user.
  const start=app.indexOf("if(source==='manual')body=");
  const line=app.slice(start,app.indexOf('\n',start));
  assert(line.includes("state.category==='shoppingPlace'?{startAt:'',endAt:''}:manualCreateDefaults(state.trip)"));
}

function test_0_7_7_newly_created_shoppingPlace_routes_back_to_the_shopping_view_not_a_generic_category_page(){
  const start=app.indexOf("form.id==='manual-form'||form.id==='edit-item-form'");
  const body=app.slice(start,app.indexOf("form.id==='suggestion-form'",start));
  assert(body.includes("type==='shoppingPlace'?'shopping':'center'"));
}

function test_0_7_7_shopping_list_entry_may_optionally_reference_a_place(){
  const modalStart=app.indexOf("if(type==='shopping'){");
  const modalBody=app.slice(modalStart,app.indexOf("return `<div class=\"modal-bg\"><section class=\"modal\"><div class=\"modal-head\"><h2>מיקום</h2>",modalStart));
  assert(modalBody.includes('name="placeId"'));
  assert(modalBody.includes("item.type==='shoppingPlace'"));
  // 0.7.7.1 restructured this handler into a multi-line block (edit-in-place support) -- narrowed
  // to the field itself, not the exact single-line form.
  const submitStart=app.indexOf("form.id==='shopping-form'");
  const submitBody=app.slice(submitStart,app.indexOf("save();state.modal=null;render();",submitStart));
  assert(submitBody.includes("placeId:String(data.get('placeId')||'').trim()"));
}

function test_0_7_7_deleting_a_place_cannot_cascade_delete_a_list_entry(){
  // No code path removes or mutates state.shopping entries when a state.items record is deleted
  // (delete-item only ever touches state.items and sourceIds) -- shoppingView()'s own placeById
  // lookup is a render-time-only join that simply omits the reference if the place is gone,
  // confirmed by the absence of any state.shopping mutation inside delete-item's handler.
  const start=app.indexOf("action==='delete-item'");
  const line=app.slice(start,app.indexOf('\n',start));
  assert(!line.includes('state.shopping'));
}

const tests=[
  test_0_7_7_shoppingPlace_is_a_real_item_type_with_no_fixed_schedule_default,
  test_0_7_7_scheduleForType_derives_shoppingPlace_from_whether_a_date_was_entered,
  test_0_7_7_scheduleForType_leaves_every_existing_type_unaffected_by_date_presence,
  test_0_7_7_buildItemFormValues_shoppingPlace_undated_save_is_schedule_none,
  test_0_7_7_buildItemFormValues_shoppingPlace_dated_save_is_schedule_single,
  test_0_7_7_buildItemFormValues_shoppingPlace_editing_the_same_record_flips_schedule_in_place,
  test_0_7_7_buildItemFormValues_existing_types_unaffected_by_this_fix,
  test_0_7_7_updateSuggestion_uses_the_same_scheduleForType_fix,
  test_0_7_7_scheduleForType_is_imported_in_v5_app,
  test_0_7_7_shoppingPlace_excluded_from_the_generic_trip_center_tile_grid,
  test_0_7_7_shoppingView_renders_a_places_section_using_the_standard_itemRow,
  test_0_7_7_shopping_place_add_action_reuses_the_existing_manual_create_pipeline,
  test_0_7_7_manual_create_skips_the_trip_start_date_prefill_for_shoppingPlace_only,
  test_0_7_7_newly_created_shoppingPlace_routes_back_to_the_shopping_view_not_a_generic_category_page,
  test_0_7_7_shopping_list_entry_may_optionally_reference_a_place,
  test_0_7_7_deleting_a_place_cannot_cascade_delete_a_list_entry,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.7 -- Shopping places + scheduled shopping visits (${tests.length} tests). No Firestore emulator is available in this environment, so real cross-device sync of a shoppingPlace item and its Timeline/Calendar projection remain unverified against a live backend from here -- consistent with every prior Firestore-backed candidate in this project.`);
