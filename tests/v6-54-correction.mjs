import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcileStaleNeedsReview} from '../src/ingestion.js';

// V6-F54: a warning on a SAVED item previously had no way to ever clear, by any means -- neither
// dismiss (V6-F49's mechanism, wired only to the pre-approval suggestion screen) nor editing the
// underlying field (reconcileStaleNeedsReview, called only by updateSuggestion, never by the
// item-edit save handler). A repository-wide search for every `.warnings=` assignment confirmed
// this precisely: every one touched only suggestion.warnings, never an item's. Fix: (1) the
// item-edit save handler now computes the same changedFields set updateSuggestion already does
// and calls reconcileStaleNeedsReview on the item itself before saving; (2) detailView renders a
// dismiss control for isDismissibleWarning-shaped entries, mirroring suggestionView's own.

// --- reconcileStaleNeedsReview is generic over its input shape (it only reads
// proposed.details?.needsReviewFields and proposed.warnings) -- this proves it works identically
// on a real SAVED-ITEM shape (id, sourceIds, no `proposed` wrapper), not just a suggestion's
// `proposed` object, which is exactly what the item-edit handler now relies on. ---
function test_V6_F54_reconcile_clears_a_saved_items_own_stale_needs_review(){
  const item={
    id:'item-panvaree',type:'hotel',title:'Panvaree Resort',startAt:'2027-01-17T12:00',endAt:'2027-01-18T12:00',
    details:{needsReviewFields:[{key:'startDate',label:'תאריך התחלה',value:'2027-01-17',evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)'}]},
    warnings:['דורש בדיקה — תאריך התחלה: 2027-01-17 (זוהה בטקסט חופשי (unresolved/importantNotes))','some unrelated warning'],
  };
  const untouched=reconcileStaleNeedsReview(item,new Set(['location']));
  assert.equal(untouched.details.needsReviewFields.length,1,'editing an UNRELATED field must not clear a needs-review entry tied to a different one');

  const edited=reconcileStaleNeedsReview(item,new Set(['startAt']));
  assert.equal(edited.details.needsReviewFields.length,0,'editing the Arrival date field on a SAVED ITEM must clear its own needs-review entry, the same way editing it on the pre-approval suggestion screen already does');
  assert.deepEqual(edited.warnings,['some unrelated warning'],'the matching warning text must be removed from the item, the unrelated one must survive');
  console.log('PASS: V6-F54 reconcileStaleNeedsReview clears a saved item\'s own stale needs-review state exactly as it already does for a pre-approval suggestion -- proves the mechanism the item-edit handler now uses is correct, not just wired up');
}

// --- Source-inspection for the UI wiring itself, matching this codebase's established pattern
// for DOM-dependent code the plain-Node test harness cannot execute (v5-app.js exports nothing;
// every existing test that touches its behavior does this). ---
function test_V6_F54_item_edit_handler_calls_reconcile_before_saving(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const changedFields=new Set\(\['title','provider','confirmationNumber','location','website','phone','startAt','endAt','notes'\]\.filter\(key=>String\(item\[key\]\|\|''\)!==String\(values\[key\]\|\|''\)\)\);/,'the item-edit save handler must compute a changedFields set comparing the item\'s OLD values against the submitted NEW ones, the same way updateSuggestion already does for the pre-approval form');
  assert.match(app,/const reconciled=reconcileStaleNeedsReview\(item,changedFields\);/,'the item-edit save handler must actually call reconcileStaleNeedsReview -- computing changedFields alone does nothing without this');
  assert.match(app,/Object\.assign\(item,values,\{details:reconciled\.details,warnings:reconciled\.warnings\}\);/,'the reconciled details/warnings must actually be written back onto the item, not just computed and discarded');
  console.log('PASS: V6-F54 the item-edit save handler is wired to reconcile stale needs-review state before saving, not just the pre-approval suggestion form');
}
// V6-F55 correction pass: detailView's dismiss rendering and isDismissibleWarning's own signature
// both changed (a shared warningRow() helper now renders both suggestion- and item-scoped rows,
// and isDismissibleWarning takes a second `details` argument so it can also fall back to
// dismissible for a plain-string warning that isn't backed by a live needsReviewFields entry --
// see tests/v6-55-correction.mjs for the full V6-F55 coverage). These two regexes are updated to
// match the new structure; the underlying guarantee they check -- a dismiss control is offered for
// a dismissible item warning, scoped to state.items -- is unchanged and still verified here.
function test_V6_F54_detailView_offers_dismiss_for_dismissible_item_warnings(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function itemWarningEntries\(item\)\{/,'detailView must track the TRUE index into item.warnings (not just a deduplicated display list), so a dismiss action removes the correct real entry');
  assert.match(app,/function warningRow\(warning,details,scope,id,index\)\{\s*return `<div class="warning-row">⚠️ \$\{esc\(warningText\(warning\)\)\}\$\{isDismissibleWarning\(warning,details\)\?`<button class="link-button" type="button" data-action="\$\{scope==='item'\?'dismiss-item-warning':'dismiss-warning'\}" data-id="\$\{id\}" data-index="\$\{index\}">התעלמות<\/button>`:''\}<\/div>`;/,'the shared warningRow renderer must offer a dismiss control for a dismissible warning, routed to dismiss-item-warning when scope is "item" (mirroring suggestionView\'s own dismiss-warning control for scope "suggestion")');
  assert.match(app,/\$\{warningEntries\.length\?`<div class="warning-list">\$\{warningEntries\.map\(\(\{warning,index\}\)=>warningRow\(warning,item\.details,'item',item\.id,index\)\)\.join\(''\)\}<\/div>`:''\}/,'detailView must actually call warningRow for each of its own item-scoped warning entries, not just define the helper');
  console.log('PASS: V6-F54 detailView offers a dismiss control for a dismissible warning on a saved item, mirroring the pre-approval suggestion screen');
}
function test_V6_F54_dismiss_item_warning_action_exists_and_is_scoped_to_items(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/action==='dismiss-item-warning'\)\{const item=state\.items\.find\(candidate=>candidate\.id===button\.dataset\.id\);const index=Number\(button\.dataset\.index\);if\(item&&isDismissibleWarning\(item\.warnings\?\.\[index\],item\.details\)\)\{item\.warnings=item\.warnings\.filter\(\(_,i\)=>i!==index\);save\(\);render\(\)\}\}/,'a dedicated dismiss-item-warning action must exist, addressing state.items (not state.suggestions -- that is the pre-existing, separate dismiss-warning action), and must actually filter the item\'s own warnings array and save');
  console.log('PASS: V6-F54 the dismiss-item-warning action is wired to state.items specifically, distinct from the pre-existing suggestion-only dismiss-warning action');
}

test_V6_F54_reconcile_clears_a_saved_items_own_stale_needs_review();
test_V6_F54_item_edit_handler_calls_reconcile_before_saving();
test_V6_F54_detailView_offers_dismiss_for_dismissible_item_warnings();
test_V6_F54_dismiss_item_warning_action_exists_and_is_scoped_to_items();
