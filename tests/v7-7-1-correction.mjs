import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.7.1: correction for a non-blocking finding logged during 0.7.7's own acceptance session
// (Test 6) -- linking a shopping-list entry to a shopping place worked correctly in the
// list-entry-to-place direction (shoppingView's own placeById lookup), but a shopping place's own
// detail view had no reverse lookup at all, showing no indication of which list entries reference
// it. Mirrors the existing insuranceCoveringItems() pattern exactly, one level simpler: a
// shopping-list entry isn't independently routable (no detail page of its own), so plain rows are
// rendered, not clickable buttons. No data model change, no rules change -- a pure read-side
// addition, confirmed by direct code inspection before writing this correction, not assumed.
//
// v5-app.js still cannot be imported directly under this harness (touches firebase.js, which
// touches import.meta.env and throws outside a Vite build) -- verified by source-inspection below,
// matching the established pattern for this module throughout this project.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

function test_0_7_7_1_linkedShoppingListEntries_mirrors_insuranceCoveringItems_pattern(){
  const start=app.indexOf('function linkedShoppingListEntries');
  const line=app.slice(start,app.indexOf('\n',start));
  assert(line.includes("state.shopping.filter(entry=>entry.placeId===item.id)"));
}

function test_0_7_7_1_detailView_computes_linkedShoppingList_only_for_shoppingPlace(){
  const start=app.indexOf('function detailView');
  const body=app.slice(start,app.indexOf('\n',start));
  assert(body.includes("const linkedShoppingList=item.type==='shoppingPlace'?linkedShoppingListEntries(item):[];"));
}

function test_0_7_7_1_detailView_renders_the_reverse_lookup_section_after_ticketsSection(){
  const start=app.indexOf('function detailView');
  const body=app.slice(start,app.indexOf('\n',start));
  const ticketsIndex=body.indexOf('${ticketsSection(item)}');
  const sectionIndex=body.indexOf('linkedShoppingList.map(entry=>');
  const documentsHeadingIndex=body.indexOf('<h3>מסמכים</h3>');
  assert(ticketsIndex>-1&&sectionIndex>-1&&documentsHeadingIndex>-1);
  // Must sit between ticketsSection and the Documents heading, exactly the confirmed insertion point.
  assert(ticketsIndex<sectionIndex&&sectionIndex<documentsHeadingIndex);
  // Plain rows, no click-through -- shopping-list entries aren't independently routable, unlike
  // insuredByList's own <button data-route="detail">.
  const sectionStart=body.indexOf('${linkedShoppingList.length?');
  const sectionText=body.slice(sectionStart,body.indexOf('<h3>מסמכים</h3>',sectionStart));
  assert(!sectionText.includes('data-route'));
  assert(sectionText.includes('check-row'));
  assert(sectionText.includes("entry.purchased?'done':''"));
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
  test_0_7_7_1_no_change_to_the_place_reference_relationship_itself,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.7.1 -- shopping place reverse lookup of linked shopping-list entries (${tests.length} tests). No Firestore emulator is available in this environment; this correction is a pure read-side rendering addition, verified by source-inspection, matching the established pattern for this module throughout this project.`);
