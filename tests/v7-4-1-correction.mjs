import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildItemFormValues} from '../src/ingestion.js';

// 0.7.4.1: removes the old free-text "משתתפים" (participants) field from item edit forms, found
// live by the Product Owner as a leftover duplicate alongside 0.7.4's own real
// participant-assignment picker (Test 9 of docs/versions/V7/0.7.4/EXECUTABLE_TEST_SESSION_V1.md).
// Investigated before removing, not assumed empty (per this correction's own kickoff): the field
// was confirmed NOT shared to one item type -- it's a single field() call inside proposalFields()
// (v5-app.js), rendered for every type whose TYPE_FIELDS lists 'participants' (every real item
// type except link/contact/participant), so removing it once fixes every type at once, not just
// Hotel. It also was NOT always empty: Flight/Activity/Insurance items created via Smart Import do
// carry real extracted names in item.participants (flight-import-adapter.js's participantNames;
// activity-/insurance-import-adapter.js's own union-merge treatment, ingestion.js's own V6-F66
// comment) -- but that data was always redundant with details.passengers/ticketHolders/
// insuredPersons, already shown in full via flightSummaryBlock/activitySummaryBlock/
// insuranceSummaryBlock, and item.participants itself was never rendered anywhere on its own. No
// migration or display fallback needed as a result -- nothing visible is being removed, and
// buildItemFormValues() (tested directly below, ingestion.js has no env-dependent imports and can
// be imported under this harness) no longer even computes a `participants` key, so whatever
// already sits in Firestore for any item survives an edit-and-save round trip untouched instead of
// being silently overwritten to [].
//
// v5-app.js itself still can't be imported directly under this harness (touches firebase.js, which
// touches import.meta.env and throws outside a Vite build), so its own wiring (the removed form
// field, the untouched participant-assignment picker) is verified by source-inspection below,
// matching the established pattern for this module throughout this project.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

function mockFormData(fields){
  return {
    get:(name)=>Object.prototype.hasOwnProperty.call(fields,name)?fields[name]:null,
    getAll:(name)=>Array.isArray(fields[name])?fields[name]:(fields[name]!=null?[fields[name]]:[]),
  };
}

function test_0_7_4_1_buildItemFormValues_never_outputs_a_participants_key_at_all(){
  // The real, behavioral guarantee this correction depends on: Object.assign(item,values,...)
  // (v5-app.js's edit-item-form submit handler) only overwrites keys PRESENT in `values` -- so a
  // `participants` key's total absence here, not just an empty array, is what keeps any existing
  // value on the item untouched by an unrelated edit-and-save.
  const values=buildItemFormValues(mockFormData({type:'hotel',title:'Test Hotel'}));
  assert(!Object.prototype.hasOwnProperty.call(values,'participants'));
  // Confirmed across every type this could plausibly matter for, not just Hotel (the Product
  // Owner's own report) or the two Smart-Import-populated types found during investigation.
  for(const type of ['hotel','flight','activity','insurance','car','restaurant']){
    const typedValues=buildItemFormValues(mockFormData({type,title:'x'}));
    assert(!Object.prototype.hasOwnProperty.call(typedValues,'participants'),`buildItemFormValues must not output a participants key for type ${type}`);
  }
}
function test_0_7_4_1_buildItemFormValues_still_outputs_the_real_participant_relationship_fields(){
  // The new (0.7.4) participantScope/participantIds fields are untouched by this correction --
  // only the old free-text field is gone, not the real relationship system built on top of it.
  const values=buildItemFormValues(mockFormData({type:'hotel',title:'x',participantScope:'specific',participantIds:['p1','p2']}));
  assert.equal(values.participantScope,'specific');
  assert.deepEqual(values.participantIds,['p1','p2']);
}

function test_0_7_4_1_old_free_text_participants_field_is_gone_from_proposalFields(){
  const start=app.indexOf('function proposalFields(');
  const body=app.slice(start,app.indexOf('function header(',start));
  assert(!body.includes("field('participants','משתתפים'"));
  // Confirmed removed once, not per-type -- proposalFields() is the one shared template every
  // item type's edit/create form renders through (TYPE_FIELDS' own field-presence pattern doesn't
  // apply here since the old call itself is gone, not conditionally hidden).
  assert(!body.includes('name="participants"'));
}
function test_0_7_4_1_participantAssignmentField_the_real_0_7_4_picker_is_unaffected(){
  const start=app.indexOf('function proposalFields(');
  const body=app.slice(start,app.indexOf('function header(',start));
  assert(body.includes('${participantAssignmentField(p)}'));
  const pickerStart=app.indexOf('function participantAssignmentField(p){');
  const pickerBody=app.slice(pickerStart,app.indexOf('function proposalFields(',pickerStart));
  assert(pickerBody.includes('name="participantScope"'));
  assert(pickerBody.includes('name="participantIds"'));
}
function test_0_7_4_1_type_change_rebuild_and_manual_create_defaults_no_longer_reference_the_old_field(){
  // Cosmetic cleanup, not just the visible form field -- the type-change handler's own values
  // object and the manual-create default object both used to carry a now-meaningless
  // participants:... entry forward; removed for consistency, not left as dead code.
  const typeChangeStart=app.indexOf('select[data-action="proposal-type"]');
  const typeChangeBody=app.slice(typeChangeStart,app.indexOf('actions=form.querySelector',typeChangeStart));
  assert(!typeChangeBody.includes("participants:String(current.get('participants')"));
  // Narrowed to manualCreateDefaults' own presence, not the exact surrounding call, since 0.7.7
  // wrapped it in a shoppingPlace-only conditional (see tests/v7-7-shopping-places.mjs) rather than
  // calling it unconditionally.
  assert(app.includes('manualCreateDefaults(state.trip)'));
  assert(app.includes("notes:''})}<button class=\"btn\">יצירת פריט</button>"));
}

const tests=[
  test_0_7_4_1_buildItemFormValues_never_outputs_a_participants_key_at_all,
  test_0_7_4_1_buildItemFormValues_still_outputs_the_real_participant_relationship_fields,
  test_0_7_4_1_old_free_text_participants_field_is_gone_from_proposalFields,
  test_0_7_4_1_participantAssignmentField_the_real_0_7_4_picker_is_unaffected,
  test_0_7_4_1_type_change_rebuild_and_manual_create_defaults_no_longer_reference_the_old_field,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.4.1 -- leftover duplicate participants field removed from item edit forms (${tests.length} tests). No Firestore emulator is available in this environment, and no way to query live Trip data from here -- whether any real item in Production actually has data in the old field could not be confirmed directly; the fix guarantees that data (if any) survives untouched regardless, per the tests above.`);
