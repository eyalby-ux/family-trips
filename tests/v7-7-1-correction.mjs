import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.7.1 V1: correction for a non-blocking finding logged during 0.7.7's own acceptance session
// (Test 6) -- linking a shopping-list entry to a shopping place worked correctly in the
// list-entry-to-place direction (shoppingView's own placeById lookup), but a shopping place's own
// detail view had no reverse lookup at all. Fixed with linkedShoppingListEntries(), mirroring the
// existing insuranceCoveringItems() pattern.
//
// 0.7.7.1 V2: three further findings came up during V1's own acceptance session (Test 1, Product
// Owner's own observations while verifying the reverse lookup, not part of what V1 was scoped to
// touch) -- the Product Owner's explicit decision was to fold them into 0.7.7.1 rather than defer:
// 1. A shopping-list entry could not be edited once created -- confirmed by direct inspection, not
//    assumed: simpleFormModal()'s shopping branch was always a blank creation form. Fixed by
//    mirroring task-form's own edit-in-place pattern (state.modal.shoppingId, pre-filled values,
//    data-id on the form, Object.assign on an existing match instead of always pushing new).
// 2. Marking an entry purchased needed to also be reachable from the place's own reverse-lookup
//    section (V1's own rows were deliberately non-interactive, per V1's Test 3) -- the Product
//    Owner confirmed directly this is what was meant, not a bug in the pre-existing Shopping-center
//    checkbox (which was already correctly wired). Both rows now share one row template
//    (shoppingRow) with a real checkbox, superseding V1's "plain rows" behavior deliberately, with
//    the Product Owner's own explicit authorization -- not a silent change to accepted behavior.
// 3. Purchased entries should move to a separate, hidden-by-default list, mirroring the Equipment/
//    Packing list's own already-owned-items pattern -- confirmed directly: packingView() already
//    splits active/packed and collapses packed by default (state.packedCollapsed, normalized to
//    true unless explicitly false). shoppingPurchasedCollapsed mirrors this exactly, added to
//    TRIP_TOP_LEVEL_FIELDS for the same Trip-level sync treatment.
//
// v5-app.js still cannot be imported directly under this harness (touches firebase.js, which
// touches import.meta.env and throws outside a Vite build) -- verified by source-inspection below,
// matching the established pattern for this module throughout this project.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const operationalData=fs.readFileSync(new URL('../src/operational-data.js',import.meta.url),'utf8');

function test_0_7_7_1_linkedShoppingListEntries_mirrors_insuranceCoveringItems_pattern(){
  const start=app.indexOf('function linkedShoppingListEntries');
  const line=app.slice(start,app.indexOf('\n',start));
  assert(line.includes("state.shopping.filter(entry=>entry.placeId===item.id)"));
}

function test_0_7_7_1_detailView_computes_linkedShoppingList_only_for_shoppingPlace(){
  // Beta 0.8 Phase 2: detailView is a multi-line function now (it used to be one line).
  const start=app.indexOf('function detailView');
  const body=app.slice(start,app.indexOf('\n}\n',start));
  assert(body.includes("const linkedShoppingList=item.type==='shoppingPlace'?linkedShoppingListEntries(item):[];"));
}

// Beta 0.8 Phase 2: tickets and documents are ONE section now (ticketsAndDocumentsSection), so the old "between the
// tickets section and the Documents heading" insertion point no longer exists; the reverse lookup renders
// immediately before that section instead.
function test_0_7_7_1_detailView_renders_the_reverse_lookup_section_after_ticketsSection(){
  const start=app.indexOf('function detailView');
  const body=app.slice(start,app.indexOf('\n}\n',start));
  const sectionIndex=body.indexOf('linkedShoppingList.map(entry=>');
  const ticketsIndex=body.indexOf('${ticketsAndDocumentsSection(item,sources)}');
  assert(ticketsIndex>-1&&sectionIndex>-1);
  assert(sectionIndex<ticketsIndex);
}

function test_0_7_7_1_v2_reverse_lookup_rows_are_now_interactive_by_explicit_authorization(){
  // Supersedes V1's own "plain rows, not clickable" behavior -- the Product Owner explicitly
  // confirmed this is what finding 2 meant, not a bug in the pre-existing Shopping-center toggle.
  // Still no data-route/click-through to a detail page that doesn't exist for a list entry -- only
  // the checkbox and edit button are interactive, not full-row navigation.
  const start=app.indexOf('function detailView');
  const body=app.slice(start,app.indexOf('\n}\n',start));
  const sectionStart=body.indexOf('${linkedShoppingList.length?');
  const sectionText=body.slice(sectionStart,body.indexOf('${ticketsAndDocumentsSection(item,sources)}',sectionStart));
  assert(!sectionText.includes('data-route'));
  assert(sectionText.includes('data-action="shopping-toggle"'));
  assert(sectionText.includes('data-action="shopping-edit"'));
}

function test_0_7_7_1_shoppingRow_is_one_shared_row_template_for_both_locations(){
  // The Shopping-center list and the place's own reverse-lookup section render the same shape via
  // one function, not two independently-maintained copies -- confirmed by counting call sites.
  const start=app.indexOf('function shoppingRow(item,placeById)');
  assert(start>-1);
  const line=app.slice(start,app.indexOf('\n',start));
  const body=app.slice(start,app.indexOf('function shoppingView',start));
  assert(body.includes('data-action="shopping-toggle"'));
  assert(body.includes('data-action="shopping-edit"'));
  assert((app.match(/shoppingRow\(item,placeById\)/g)||[]).length>=2);
}

function test_0_7_7_1_shopping_list_entry_can_be_edited(){
  // Mirrors task-form's own edit-in-place pattern: state.modal.shoppingId selects an existing
  // entry, pre-fills every field, and the form carries its id for the submit handler to find.
  const modalStart=app.indexOf("if(type==='shopping'){");
  const entryLineStart=app.indexOf('const entry=state.shopping.find',modalStart);
  const entryLine=app.slice(entryLineStart,app.indexOf('\n',entryLineStart));
  assert(entryLine.includes('state.modal.shoppingId'));
  assert(app.includes("action==='shopping-edit'){state.modal={type:'shopping',shoppingId:button.dataset.id};render()}"));
  const submitStart=app.indexOf("form.id==='shopping-form'");
  const submitBody=app.slice(submitStart,app.indexOf('save();state.modal=null;render();',submitStart));
  assert(submitBody.includes('existing=state.shopping.find'));
  assert(submitBody.includes('if(existing)Object.assign(existing,values)'));
}

function test_0_7_7_1_editing_an_entry_preserves_its_purchased_state(){
  // The update branch must never reset purchased -- only the create branch sets it to false, and
  // only for a genuinely new entry (no existing match).
  const submitStart=app.indexOf("form.id==='shopping-form'");
  const submitBody=app.slice(submitStart,app.indexOf('save();state.modal=null;render();',submitStart));
  const updateBranch=submitBody.slice(submitBody.indexOf('if(existing)'),submitBody.indexOf('else state.shopping.push'));
  assert(!updateBranch.includes('purchased'));
}

function test_0_7_7_1_purchased_items_move_to_a_collapsed_by_default_section(){
  // Mirrors packingView's own active/packed split and packedCollapsed's own defaulting exactly.
  const start=app.indexOf('function shoppingView');
  const body=app.slice(start,app.indexOf('\n}',start)+2);
  assert(body.includes("const active=state.shopping.filter(item=>!item.purchased),purchased=state.shopping.filter(item=>item.purchased);"));
  assert(body.includes('state.shoppingPurchasedCollapsed'));
  assert(body.includes('<details'));
  assert(operationalData.includes('state.shoppingPurchasedCollapsed=state.shoppingPurchasedCollapsed!==false;'));
  assert(operationalData.includes("TRIP_TOP_LEVEL_FIELDS=['timelineCursor','packedCollapsed','packingCollapsed','shoppingPurchasedCollapsed'];"));
}

function test_0_7_7_1_no_change_to_the_place_reference_relationship_itself(){
  // Out of scope for this correction, per its own kickoff prompt: the placeId field, its no-cascade
  // -delete behavior, and shoppingView's own list-entry-to-place lookup are all untouched.
  assert.equal((app.match(/placeId:String\(data\.get\('placeId'\)\|\|''\)\.trim\(\)/g)||[]).length,1);
  assert(app.includes('placeById.get(item.placeId)'));
}

const tests=[
  test_0_7_7_1_linkedShoppingListEntries_mirrors_insuranceCoveringItems_pattern,
  test_0_7_7_1_detailView_computes_linkedShoppingList_only_for_shoppingPlace,
  test_0_7_7_1_detailView_renders_the_reverse_lookup_section_after_ticketsSection,
  test_0_7_7_1_v2_reverse_lookup_rows_are_now_interactive_by_explicit_authorization,
  test_0_7_7_1_shoppingRow_is_one_shared_row_template_for_both_locations,
  test_0_7_7_1_shopping_list_entry_can_be_edited,
  test_0_7_7_1_editing_an_entry_preserves_its_purchased_state,
  test_0_7_7_1_purchased_items_move_to_a_collapsed_by_default_section,
  test_0_7_7_1_no_change_to_the_place_reference_relationship_itself,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.7.1 -- shopping place reverse lookup (V1) + edit/purchase-from-reverse-lookup/hidden-purchased-list (V2) (${tests.length} tests). No Firestore emulator is available in this environment; verified by source-inspection, matching the established pattern for this module throughout this project.`);
