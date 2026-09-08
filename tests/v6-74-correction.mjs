import assert from 'node:assert/strict';
import fs from 'node:fs';
import {confirmNeedsReviewField,isDismissibleWarning} from '../src/ingestion.js';

// V6-F74: surfaced during the 0.6.6.3/V6-F73 retest -- Panvaree Resort's ambiguous-date-labeling
// warning (the exact case smart-import-schema.mjs's Hotel prompt names explicitly: "check-in/
// check-out dates printed inconsistently... report your best-supported reading... with certainty
// needs_review") now correctly CLEARS when the flagged date field is actually edited (V6-F55's
// existing reconcileStaleNeedsReview mechanism), but there was no way to say "I've reviewed this
// reading and it's already correct" WITHOUT editing the value -- the only action available was
// silence (isDismissibleWarning deliberately withholds a plain dismiss for a live needsReviewRef,
// since blindly hiding an unresolved reading would be worse) or a pointless edit-then-revert.
//
// Root cause, confirmed by reading isDismissibleWarning/reconcileStaleNeedsReview directly: a
// needsReviewFields-sourced warning has exactly ONE clearing mechanism (reconcileStaleNeedsReview),
// which only fires on an actual VALUE change to the mapped field. Unlike mergeCandidates (which
// got an explicit keep/accept picker in V6-F55, resolveMergeCandidate), needsReviewFields never
// received an equivalent "confirm the current value, no change needed" action. This is a real,
// general gap in V6-F55's own mechanism -- not specific to dates, but the date-ambiguity case is
// the one that surfaced it in practice, since it is exactly the shape of needs-review flag a
// reasonable value is likely to trigger (the model's own best-supported guess can easily already
// be correct).
//
// Fixed: confirmNeedsReviewField (src/ingestion.js) mirrors resolveMergeCandidate's 'keep' choice
// -- removes the matching needsReviewFields entry (exact key+value match, the same match
// isDismissibleWarning itself already uses to decide "still live") and its warning, WITHOUT
// touching the field's actual value. Wired into src/v5-app.js's warningRow (renders a "confirm
// as correct" button precisely when isDismissibleWarning withholds a plain dismiss) and a new
// confirm-needs-review click action, mirroring resolve-merge-candidate's scope/id convention.

function needsReviewItem(key,value,label='תאריך כניסה'){
  const evidence='page text labels these reversed vs. the rendered page image';
  return {
    id:'item-panvaree',type:'hotel',title:'Panvaree Resort',startAt:'2027-01-17T12:00',endAt:'2027-01-18T12:00',
    details:{needsReviewFields:[{key,label,value,evidence}]},
    warnings:[{message:`דורש בדיקה — ${label}: ${value} (${evidence})`,needsReviewRef:{key,value}}],
  };
}

function test_V6_F74_a_live_needsReviewRef_warning_has_no_dismiss_action_by_design(){
  const item=needsReviewItem('startDate','2027-01-17');
  assert.equal(isDismissibleWarning(item.warnings[0],item.details),false,'a warning backed by a still-live needsReviewFields entry must not be silently dismissible -- that would hide a genuinely unresolved reading, exactly the behavior V6-F55 deliberately withheld');
  console.log('PASS: V6-F74 a live needsReviewRef warning correctly has no plain-dismiss path (confirms the gap this fix addresses, not a regression to undo)');
}
function test_V6_F74_confirm_removes_the_needsReviewFields_entry_and_its_warning(){
  const item=needsReviewItem('startDate','2027-01-17');
  const confirmed=confirmNeedsReviewField(item,'startDate','2027-01-17');
  assert.deepEqual(confirmed.details.needsReviewFields,[],'confirming must remove the matching needsReviewFields entry');
  assert.deepEqual(confirmed.warnings,[],'confirming must remove the warning that was generated from that entry');
  console.log('PASS: V6-F74 confirmNeedsReviewField removes both the needsReviewFields entry and its warning for an exact key+value match');
}
function test_V6_F74_confirm_never_touches_the_fields_actual_value(){
  const item=needsReviewItem('startDate','2027-01-17');
  const confirmed=confirmNeedsReviewField(item,'startDate','2027-01-17');
  assert.equal(confirmed.startAt,'2027-01-17T12:00','confirming as correct must leave the item\'s actual startAt value completely untouched -- this is the entire point: reviewing/accepting a reading is not the same as editing it');
  console.log('PASS: V6-F74 confirming as correct never changes the underlying field value');
}
function test_V6_F74_confirm_is_a_safe_noop_for_a_non_matching_key_or_value(){
  const item=needsReviewItem('startDate','2027-01-17');
  const wrongKey=confirmNeedsReviewField(item,'endDate','2027-01-17');
  assert.deepEqual(wrongKey.details.needsReviewFields,item.details.needsReviewFields,'confirming a key with no matching needsReviewFields entry must be a no-op');
  const wrongValue=confirmNeedsReviewField(item,'startDate','2027-01-18');
  assert.deepEqual(wrongValue.details.needsReviewFields,item.details.needsReviewFields,'confirming a value that no longer matches the live entry (e.g. already resolved by an edit) must be a no-op, not accidentally clear an unrelated pending flag');
  console.log('PASS: V6-F74 confirmNeedsReviewField is a safe no-op when the key/value no longer matches a live entry');
}
function test_V6_F74_confirm_leaves_an_unrelated_needsReviewFields_entry_and_warning_untouched(){
  const item=needsReviewItem('startDate','2027-01-17');
  item.details.needsReviewFields.push({key:'confirmationNumber',label:'מספר הזמנה',value:'X-1',evidence:'e'});
  item.warnings.push({message:'דורש בדיקה — מספר הזמנה: X-1 (e)',needsReviewRef:{key:'confirmationNumber',value:'X-1'}});
  const confirmed=confirmNeedsReviewField(item,'startDate','2027-01-17');
  assert.deepEqual(confirmed.details.needsReviewFields,[{key:'confirmationNumber',label:'מספר הזמנה',value:'X-1',evidence:'e'}],'confirming one field must not clear a different, still-pending needsReviewFields entry on the same item');
  assert.equal(confirmed.warnings.length,1,'the unrelated warning must survive');
  console.log('PASS: V6-F74 confirming one needs-review entry leaves a different, unrelated one on the same item untouched');
}
function test_V6_F74_works_identically_on_a_pending_suggestions_proposed_object(){
  const suggestion={proposed:needsReviewItem('startDate','2027-01-17')};
  const confirmed=confirmNeedsReviewField(suggestion.proposed,'startDate','2027-01-17');
  assert.deepEqual(confirmed.details.needsReviewFields,[],'confirmNeedsReviewField must work identically on a suggestion\'s proposed object, not just an already-saved item, mirroring resolveMergeCandidate\'s own generality');
  console.log('PASS: V6-F74 confirmNeedsReviewField works identically on a pending suggestion\'s proposed object');
}
function test_V6_F74_ui_wiring_renders_a_confirm_action_for_a_live_needsReviewRef_warning(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/data-action="confirm-needs-review"/,'warningRow must render a confirm-needs-review action for a warning isDismissibleWarning withholds a plain dismiss for');
  assert.match(app,/const dismissible=isDismissibleWarning\(warning,details\);/,'warningRow must branch on isDismissibleWarning\'s own result rather than re-deriving the still-live check itself');
  console.log('PASS: V6-F74 warningRow renders the confirm-as-correct action for a live needsReviewRef warning');
}
function test_V6_F74_click_handler_is_wired_to_confirmNeedsReviewField_for_both_scopes(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/else if\(action==='confirm-needs-review'\)\{/,'a confirm-needs-review click handler must exist');
  assert.match(app,/suggestion\.proposed=confirmNeedsReviewField\(suggestion\.proposed,key,value\);/,'the suggestion-scope branch must call confirmNeedsReviewField on the suggestion\'s proposed object');
  assert.match(app,/Object\.assign\(item,confirmNeedsReviewField\(item,key,value\)\);/,'the item-scope branch must call confirmNeedsReviewField on the live item, mirroring resolve-merge-candidate\'s own item-scope pattern');
  console.log('PASS: V6-F74 the confirm-needs-review click handler is wired to confirmNeedsReviewField for both the suggestion and item scopes');
}

test_V6_F74_a_live_needsReviewRef_warning_has_no_dismiss_action_by_design();
test_V6_F74_confirm_removes_the_needsReviewFields_entry_and_its_warning();
test_V6_F74_confirm_never_touches_the_fields_actual_value();
test_V6_F74_confirm_is_a_safe_noop_for_a_non_matching_key_or_value();
test_V6_F74_confirm_leaves_an_unrelated_needsReviewFields_entry_and_warning_untouched();
test_V6_F74_works_identically_on_a_pending_suggestions_proposed_object();
test_V6_F74_ui_wiring_renders_a_confirm_action_for_a_live_needsReviewRef_warning();
test_V6_F74_click_handler_is_wired_to_confirmNeedsReviewField_for_both_scopes();
console.log('ALL PASS: V6-F74 a needsReviewFields-sourced warning (e.g. Panvaree Resort\'s ambiguous check-in/check-out date reading) can now be confirmed as correct without requiring its value to change, extending V6-F55\'s existing needsReviewRef mechanism rather than inventing a new one');
