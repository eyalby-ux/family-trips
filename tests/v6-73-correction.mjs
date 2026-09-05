import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preserveTrustedFieldsOnMerge} from '../src/smart-import-adapter.js';
import {resolveMergeCandidate,suggestionToItem} from '../src/ingestion.js';

// V6-F73: Panvaree Resort -- attach a second, date-conflicting source; the conflict-resolution
// picker correctly surfaces the conflict; the Product Owner resolves it and saves; the edit page
// reports success; but the item's own detail/view page still shows the OLD, unresolved values and
// the same conflict prompt reappears. Confirmed data loss: the Product Owner's deliberate
// resolution choice never actually reaches the item's persisted fields.
//
// Root cause, confirmed by tracing approveSuggestion's mode==='merge' branch (src/v5-app.js):
// preserveTrustedFieldsOnMerge is correctly called ONCE, at suggestion-creation time (when the
// second source is attached and extracted -- see runSmartAnalysis), which is what surfaces the
// conflict as a reviewable mergeCandidates entry in the first place. approveSuggestion's
// mode==='merge' branch then WRONGLY called it AGAIN, at approval time, before the target item has
// been assigned the suggestion's values (Object.assign happens two lines later). At that moment the
// suggestion's value is whatever the Product Owner just resolved it to, but the target item's own
// field is still its old, untouched value -- so preserveTrustedFieldsOnMerge reads this as a BRAND
// NEW conflict, silently reverts the suggestion's value back to the item's old one, and recreates a
// fresh mergeCandidates entry -- on the very item being saved. That exactly reproduces both
// symptoms: the detail page (reading the persisted item) shows the old value, and the same prompt
// reappears (because the item itself now carries a fresh, unresolved mergeCandidates entry).
//
// Fix: only call preserveTrustedFieldsOnMerge a second time when the suggestion has NOT already
// been through it once (i.e. suggestion.targetItemId is unset -- the general duplicate-merge-dialog
// path, whose target is chosen only at approval time and has genuinely never been protected
// before). A suggestion that already carries targetItemId (the attach-and-extract path, which is
// exactly the Panvaree scenario) is used as-is, so a resolution already applied to it survives
// unchanged into the item.
//
// These tests simulate approveSuggestion's mode==='merge' branch directly with the already-exported
// functions it actually calls (preserveTrustedFieldsOnMerge, suggestionToItem), since v5-app.js
// itself cannot be imported under the plain-Node test harness (a CSS import makes it unimportable
// outside a Vite build) -- the same constraint documented in prior correction test files.

function targetItem(){
  return {id:'item-panvaree',type:'hotel',title:'Panvaree Resort',provider:'',confirmationNumber:'PNV-100',location:'Ban Ta Khun',website:'',phone:'',startAt:'2027-02-10T14:00',endAt:'2027-02-14T11:00',participants:[],notes:'',details:{},dateMeta:{},fieldConfidence:{},warnings:[],sourceIds:['source-png']};
}
function conflictingAttachSuggestion(target){
  // Mirrors runSmartAnalysis: a second source's suggestion is run through preserveTrustedFieldsOnMerge
  // ONCE at creation, and stamped with targetItemId, exactly as the real attach-and-extract flow does.
  const raw={proposed:{type:'hotel',title:'Panvaree Resort',provider:'',confirmationNumber:'PNV-100',location:'Ban Ta Khun',website:'',phone:'',startAt:'2027-02-12T15:00',endAt:'2027-02-16T10:00',participants:[],notes:'',schedule:'range',details:{},dateMeta:{},fieldConfidence:{},warnings:[]},sourceIds:['source-pdf'],sourceId:'source-pdf'};
  const merged=preserveTrustedFieldsOnMerge(raw,target);
  merged.targetItemId=target.id;
  return merged;
}
// Reproduces approveSuggestion's mode==='merge' branch as it existed BEFORE this fix, for the test
// that documents the bug it fixed.
function approveMerge_buggy(suggestion,target){
  const protectedSuggestion=preserveTrustedFieldsOnMerge(suggestion,target);
  return suggestionToItem(protectedSuggestion,target);
}
// Reproduces the branch as it exists AFTER this fix.
function approveMerge_fixed(suggestion,target){
  const protectedSuggestion=suggestion.targetItemId?suggestion:preserveTrustedFieldsOnMerge(suggestion,target);
  return suggestionToItem(protectedSuggestion,target);
}

function test_V6_F73_repro_conflict_is_correctly_surfaced_at_attach_time(){
  const target=targetItem();
  const suggestion=conflictingAttachSuggestion(target);
  assert.equal(suggestion.proposed.startAt,target.startAt,'at creation time, the trusted (existing) startAt must win and be shown as the current value');
  assert.equal(suggestion.proposed.details.mergeCandidates.startAt,'2027-02-12T15:00','the conflicting new value from the second source must be recorded as a reviewable merge candidate');
  console.log('PASS: V6-F73 repro setup -- attaching the conflicting PDF source correctly surfaces a startAt merge conflict, matching the real Panvaree repro');
}
function test_V6_F73_buggy_double_invocation_silently_reverts_the_resolved_choice(){
  const target=targetItem();
  let suggestion=conflictingAttachSuggestion(target);
  // Product Owner resolves BOTH conflicting dates: accept the new (PDF) start and end dates.
  suggestion.proposed=resolveMergeCandidate(suggestion.proposed,'startAt','accept');
  suggestion.proposed=resolveMergeCandidate(suggestion.proposed,'endAt','accept');
  assert.equal(suggestion.proposed.startAt,'2027-02-12T15:00','resolveMergeCandidate must apply the accepted startAt candidate to the suggestion immediately');
  assert.equal(suggestion.proposed.endAt,'2027-02-16T10:00','resolveMergeCandidate must apply the accepted endAt candidate to the suggestion immediately');
  assert.equal(Object.keys(suggestion.proposed.details.mergeCandidates||{}).length,0,'both resolved candidates must be removed from mergeCandidates on the suggestion itself');
  // BUGGY approveSuggestion: re-runs preserveTrustedFieldsOnMerge against the target, which still
  // holds its OLD startAt/endAt (Object.assign has not happened yet) -- this is the exact defect.
  const savedItem=approveMerge_buggy(suggestion,target);
  assert.equal(savedItem.startAt,target.startAt,'BUG (documented, now fixed): the double-invocation silently reverts the Product Owner\'s resolved startAt choice back to the old value');
  assert.equal(savedItem.endAt,target.endAt,'BUG (documented, now fixed): the double-invocation silently reverts the Product Owner\'s resolved endAt choice back to the old value');
  assert.equal(savedItem.details.mergeCandidates.startAt,'2027-02-12T15:00','BUG (documented, now fixed): a fresh mergeCandidates entry is recreated on the saved item itself, which is exactly why the detail page re-shows the same conflict prompt');
  console.log('PASS: V6-F73 the OLD double-invocation code is confirmed to reproduce exactly the reported bug (silent revert + reappearing prompt) when exercised directly');
}
function test_V6_F73_fixed_single_invocation_persists_the_resolved_choice_with_no_reprompt(){
  const target=targetItem();
  let suggestion=conflictingAttachSuggestion(target);
  suggestion.proposed=resolveMergeCandidate(suggestion.proposed,'startAt','accept');
  suggestion.proposed=resolveMergeCandidate(suggestion.proposed,'endAt','accept');
  const savedItem=approveMerge_fixed(suggestion,target);
  assert.equal(savedItem.startAt,'2027-02-12T15:00','FIXED: the Product Owner\'s resolved startAt choice must actually reach the persisted item -- this is what the detail page reads');
  assert.equal(savedItem.endAt,'2027-02-16T10:00','FIXED: the Product Owner\'s resolved endAt choice must actually reach the persisted item');
  assert.equal(Object.keys(savedItem.details.mergeCandidates||{}).length,0,'FIXED: no mergeCandidates entry may remain once resolved, or the detail page will re-show the same conflict prompt');
  console.log('PASS: V6-F73 the FIXED single-invocation path persists the resolved value onto the item with no merge candidates left -- the detail page will show the correct value and never re-prompt');
}
function test_V6_F73_general_duplicate_merge_dialog_path_is_unaffected_by_the_fix(){
  // A suggestion reaching mode==='merge' via the general duplicate-detection dialog (no
  // targetItemId preset -- the target is only chosen at approval time) has never been through
  // preserveTrustedFieldsOnMerge before, and must still get it applied for the first time here.
  const target=targetItem();
  const freshSuggestion={proposed:{type:'hotel',title:'Panvaree Resort',provider:'',confirmationNumber:'PNV-100',location:'Ban Ta Khun',website:'',phone:'',startAt:'2027-02-12T15:00',endAt:'2027-02-16T10:00',participants:[],notes:'',schedule:'range',details:{},dateMeta:{},fieldConfidence:{},warnings:[]},sourceIds:['source-other']};
  assert.equal(freshSuggestion.targetItemId,undefined,'this path genuinely has no targetItemId preset, unlike the attach-and-extract path');
  const savedItem=approveMerge_fixed(freshSuggestion,target);
  assert.equal(savedItem.startAt,target.startAt,'the fix must not skip trusted-field protection for a suggestion that has never been protected before -- the existing trusted value must still win on first conflict, exactly as before this fix');
  assert.equal(savedItem.details.mergeCandidates.startAt,'2027-02-12T15:00','the conflict must still be surfaced as a reviewable candidate for this never-before-protected path, unchanged from before this fix');
  console.log('PASS: V6-F73 the general duplicate-merge-dialog path (no pre-set targetItemId) still gets trusted-field protection applied for the first time, unaffected by this fix');
}
function test_V6_F73_approveSuggestion_source_uses_the_fixed_conditional_form(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const protectedSuggestion=suggestion\.targetItemId\?suggestion:preserveTrustedFieldsOnMerge\(suggestion,target\);/,'approveSuggestion\'s mode==="merge" branch must use the conditional form that skips a redundant second preserveTrustedFieldsOnMerge call for an already-protected (targetItemId-bearing) suggestion');
  assert.doesNotMatch(app,/const protectedSuggestion=preserveTrustedFieldsOnMerge\(suggestion,target\);/,'the old unconditional double-invocation must be fully gone as actual code, not left alongside the new conditional form');
  console.log('PASS: V6-F73 src/v5-app.js\'s approveSuggestion uses the fixed conditional form, and the old unconditional double-invocation is gone');
}

test_V6_F73_repro_conflict_is_correctly_surfaced_at_attach_time();
test_V6_F73_buggy_double_invocation_silently_reverts_the_resolved_choice();
test_V6_F73_fixed_single_invocation_persists_the_resolved_choice_with_no_reprompt();
test_V6_F73_general_duplicate_merge_dialog_path_is_unaffected_by_the_fix();
test_V6_F73_approveSuggestion_source_uses_the_fixed_conditional_form();
console.log('ALL PASS: V6-F73 the Panvaree Resort conflict-resolution data-loss bug (a redundant second preserveTrustedFieldsOnMerge call at approval time silently reverting an already-resolved choice and re-surfacing the prompt) is fixed, with the general duplicate-merge path confirmed unaffected');
