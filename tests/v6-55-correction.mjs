import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveMergeCandidate,reconcileStaleNeedsReview} from '../src/ingestion.js';
import {MERGE_CONFLICT_WARNING_PREFIX,preserveTrustedFieldsOnMerge} from '../src/smart-import-adapter.js';

// V6-F55 (merged with V6-F54): a merge-conflict warning (preserveTrustedFieldsOnMerge) previously
// had no way to ever clear -- the trusted value was silently kept, the new value silently
// discarded except for a plain-string warning that neither a dismiss control nor any field edit
// could ever remove. Per the Product Owner's own requested fix direction, resolveMergeCandidate
// (ingestion.js) now gives an explicit keep/accept choice per conflicting field, wired to a real
// UI picker (mergeCandidatePanel, v5-app.js) instead of a permanent, unresolvable notice.

// --- resolveMergeCandidate is generic over its input shape (suggestion.proposed or a saved item),
// exercised directly here against both real preserveTrustedFieldsOnMerge output and a saved-item
// shape, not just asserted in prose. ---
function test_V6_F55_resolve_merge_candidate_keep_preserves_trusted_value(){
  const suggestion={proposed:{type:'hotel',title:'Panvaree Resort',startAt:'2027-01-17T12:00',details:{},warnings:[]}}; // the new, incoming suggestion
  const target={title:'Panvaree Resort',startAt:'2027-01-16T12:00'}; // the existing, already-trusted item
  const merged=preserveTrustedFieldsOnMerge(suggestion,target);
  assert(merged.proposed.details.mergeCandidates.startAt,'a genuine conflict must produce a mergeCandidates entry');
  assert(merged.warnings.some(w=>String(w).startsWith(`${MERGE_CONFLICT_WARNING_PREFIX}startAt`)),'a merge-conflict warning must be generated with the shared, importable prefix');

  const resolved=resolveMergeCandidate(merged.proposed,'startAt','keep');
  assert.equal(resolved.startAt,'2027-01-16T12:00','choosing "keep" must leave the already-applied trusted value untouched');
  assert(!('startAt' in resolved.details.mergeCandidates),'the resolved key must be removed from mergeCandidates once a choice is made');
  assert(!resolved.warnings.some(w=>String(w).startsWith(`${MERGE_CONFLICT_WARNING_PREFIX}startAt`)),'the matching merge-conflict warning must be cleared once resolved, regardless of which choice was made');
  console.log('PASS: V6-F55 resolveMergeCandidate("keep") clears the conflict and warning while preserving the trusted value');
}
function test_V6_F55_resolve_merge_candidate_accept_applies_new_value_and_reconciles_needs_review(){
  const suggestion={proposed:{type:'hotel',title:'Panvaree Resort',startAt:'2027-01-17T12:00',details:{needsReviewFields:[{key:'startDate',label:'תאריך התחלה',value:'2027-01-17',evidence:'x'}]},warnings:['דורש בדיקה — תאריך התחלה: 2027-01-17 (x)']}};
  const target={title:'Panvaree Resort',startAt:'2027-01-16T12:00'};
  const merged=preserveTrustedFieldsOnMerge(suggestion,target);
  // A real field-value change: choosing "accept" must overwrite the field with the discovered new
  // value AND run reconcileStaleNeedsReview for that key, since a merge conflict and a stale
  // needs-review flag on the same field are two separate mechanisms that can both be pointing at
  // the one value the Product Owner just resolved.
  const resolved=resolveMergeCandidate(merged.proposed,'startAt','accept');
  assert.equal(resolved.startAt,'2027-01-17T12:00','choosing "accept" must overwrite the field with the newly discovered value');
  assert(!('startAt' in resolved.details.mergeCandidates),'the resolved key must be removed from mergeCandidates');
  assert.equal(resolved.details.needsReviewFields.length,0,'accepting a genuine field-value change must also clear a needs-review flag mapped to the same field, not leave two separate stale-warning mechanisms both pointing at the resolved value');
  console.log('PASS: V6-F55 resolveMergeCandidate("accept") applies the new value and reconciles a needs-review flag on the same field');
}
function test_V6_F55_resolve_merge_candidate_is_a_noop_for_an_unknown_key(){
  const target={title:'x',details:{mergeCandidates:{title:'y'}},warnings:[`${MERGE_CONFLICT_WARNING_PREFIX}title: y — kept.`]};
  const resolved=resolveMergeCandidate(target,'startAt','accept');
  assert.equal(resolved,target,'resolving a key with no matching mergeCandidates entry must return the input unchanged, not throw or silently mutate an unrelated field');
  console.log('PASS: V6-F55 resolveMergeCandidate is a safe no-op for a key that has no pending conflict');
}
// --- Works identically on a saved-item shape (no `proposed` wrapper), the same generality
// reconcileStaleNeedsReview already proved for V6-F54. ---
function test_V6_F55_resolve_merge_candidate_works_on_a_saved_item_shape(){
  const item={id:'item-1',type:'hotel',title:'Panvaree Resort',phone:'',details:{mergeCandidates:{phone:'+66-1234567'}},warnings:[`${MERGE_CONFLICT_WARNING_PREFIX}phone: +66-1234567 — kept.`]};
  const resolved=resolveMergeCandidate(item,'phone','accept');
  assert.equal(resolved.phone,'+66-1234567');
  assert(!('phone' in resolved.details.mergeCandidates));
  console.log('PASS: V6-F55 resolveMergeCandidate works identically on an already-saved item, not just a pending suggestion');
}

// --- Source-inspection for the UI wiring, matching this codebase's established pattern for
// DOM-dependent code the plain-Node test harness cannot execute (v5-app.js exports nothing). ---
function test_V6_F55_merge_candidate_panel_wired_into_both_screens(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function mergeCandidatePanel\(scope,id,current,details\)\{/,'a dedicated picker renderer must exist for merge conflicts');
  assert.match(app,/data-action="resolve-merge-candidate"/,'the picker must wire a resolve-merge-candidate action, mirroring directionPickerPanel\'s own radio pattern');
  assert.match(app,/\$\{mergeCandidatePanel\('item',item\.id,item,item\.details\)\}/,'detailView must render the merge-conflict picker for a saved item');
  assert.match(app,/\$\{mergeCandidatePanel\('suggestion',suggestion\.id,p,p\.details\)\}/,'suggestionView must render the merge-conflict picker for a pending suggestion');
  assert.match(app,/action==='resolve-merge-candidate'\)\{/,'a click handler for resolve-merge-candidate must exist');
  assert.match(app,/suggestion\.proposed=resolveMergeCandidate\(suggestion\.proposed,key,choice\);/,'the suggestion-scoped branch must actually call resolveMergeCandidate and write the result back');
  assert.match(app,/Object\.assign\(item,resolveMergeCandidate\(item,key,choice\)\);/,'the item-scoped branch must actually call resolveMergeCandidate and write the result back onto the live item');
  console.log('PASS: V6-F55 the merge-conflict picker is rendered on both the suggestion review screen and the saved item detail view, and its resolve action is wired to resolveMergeCandidate');
}
function test_V6_F55_merge_conflict_warnings_excluded_from_generic_dismiss_list(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function isMergeConflictWarningText\(text,details\)\{/,'a merge-conflict warning must be recognized and filtered out of the plain warning list, since mergeCandidatePanel handles it instead of a plain dismiss button');
  assert.match(app,/if\(isMergeConflictWarningText\(text,item\.details\)\)return false;/,'itemWarningEntries must exclude merge-conflict warnings from the generic list');
  console.log('PASS: V6-F55 merge-conflict warnings render only through the explicit picker, never doubled as inert dismissible text');
}
// --- V6-F55's general fallback: a plain-string warning not backed by a live needsReviewFields
// label must always be dismissible, closing the "third category, never clearable by any means"
// gap for draft.warnings/the place-not-validated notice/any other model-authored free text,
// across every Smart Import vertical (Hotel/Flight/Activity), without needing to enumerate and
// wrap every generation site individually. ---
function test_V6_F55_plain_string_warning_dismissible_unless_backed_by_live_needs_review(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function isDismissibleWarning\(value,details\)\{/,'isDismissibleWarning must accept a details argument to check against live needsReviewFields labels');
  assert.match(app,/const needsReviewLabels=\(details\?\.needsReviewFields\|\|\[\]\)\.map\(field=>field\.label\);/,'must compute the current, live set of needs-review labels from details, not a stale/cached list');
  assert.match(app,/return !needsReviewLabels\.some\(label=>text\.includes\(label\)\);/,'a plain-string warning must be dismissible UNLESS it currently matches a live needs-review label -- this is the fallback that guarantees every warning shape can eventually be cleared by some explicit action');
  console.log('PASS: V6-F55 a plain-string warning (draft.warnings, the place-not-validated notice, or any other model-authored text) is dismissible by default, deferring only to a field edit while a live needs-review flag actually covers it');
}

// V6-F60: a date-only value's synthetic "12:00" default (dateTime(), activity-import-adapter.js/
// smart-import-adapter.js/flight-import-adapter.js) was visually indistinguishable from a real
// extracted time anywhere in the app, since fmt() never consulted dateMeta.start/endPrecision.
function test_V6_F60_fmt_omits_synthetic_time_for_date_only_precision(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function fmt\(value,withTime=true,precision=''\)\{/,'fmt must accept a precision argument');
  assert.match(app,/const showTime=withTime&&precision!=='date';/,'fmt must not show a time component when precision is "date" (no real time was extracted), even if withTime is true');
  assert.match(app,/fmt\(item\.startAt,true,item\.dateMeta\?\.startPrecision\)/,'itemRow/detailView must pass the item\'s own startPrecision through to fmt so a date-only value renders without a synthetic time');
  assert.match(app,/fmt\(item\.endAt,true,item\.dateMeta\?\.endPrecision\)/,'the endAt side must be handled the same way as startAt');
  console.log('PASS: V6-F60 a date-only value renders without a synthetic time component, distinguishable from a genuinely extracted one');
}

// V6-F62: activity items had no attach-existing-document control at all (hardcoded to
// ['hotel','flight'] only), confirmed as the actual root cause of AE-003/AE-004 never linking as
// a companion pair -- the existing duplicate-detection logic is real and tested, it simply never
// had an attach event to fire on for this item type.
function test_V6_F62_activity_items_have_attach_document_control(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/\['hotel','flight','activity'\]\.includes\(item\.type\)\?`<button class="btn" data-action="attach-source" data-id="\$\{item\.id\}">הוספת מסמך<\/button>`:''/,'detailView must render an attach-document control for activity items too, mirroring the existing Hotel/Flight control');
  console.log('PASS: V6-F62 activity items now have an attach-existing-document control, matching Hotel/Flight');
}

// V6-F57: details.ticketHolders/amount/currency were correctly captured by the adapter but had
// zero rendering code anywhere -- confirmed uniform across every tested Activity case. Proves the
// new activitySummaryBlock/activityTicketHoldersTable actually exist and are called from both
// screens, not just defined; the adapter-side capture is already exercised by the AE-00x tests in
// tests/v6-6-attraction-event-import.mjs.
function test_V6_F57_activity_summary_block_wired_into_both_screens(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function activitySummaryBlock\(details\)\{/,'a dedicated read-only summary block must exist for Activity, mirroring flightSummaryBlock');
  assert.match(app,/function activityTicketHoldersTable\(ticketHolders\)\{/,'a dedicated per-ticket-holder table must exist for Activity, mirroring flightPassengersTable');
  assert.match(app,/holder\.dni\?`ת\.ז\.\/דרכון \$\{esc\(holder\.dni\)\}`:''/,'the ticket-holder table must render dni once V6-F56 makes it available');
  assert.match(app,/\$\{item\.type==='activity'\?activitySummaryBlock\(item\.details\):''\}/,'detailView must actually call activitySummaryBlock for a saved activity item, not just define it');
  assert.match(app,/\$\{p\.type==='activity'\?activitySummaryBlock\(p\.details\):''\}/,'suggestionView must actually call activitySummaryBlock for a pending activity suggestion');
  console.log('PASS: V6-F57 details.ticketHolders/amount/currency now have a real rendering path on both the suggestion review screen and the saved item detail view');
}

test_V6_F57_activity_summary_block_wired_into_both_screens();
test_V6_F55_resolve_merge_candidate_keep_preserves_trusted_value();
test_V6_F55_resolve_merge_candidate_accept_applies_new_value_and_reconciles_needs_review();
test_V6_F55_resolve_merge_candidate_is_a_noop_for_an_unknown_key();
test_V6_F55_resolve_merge_candidate_works_on_a_saved_item_shape();
test_V6_F55_merge_candidate_panel_wired_into_both_screens();
test_V6_F55_merge_conflict_warnings_excluded_from_generic_dismiss_list();
test_V6_F55_plain_string_warning_dismissible_unless_backed_by_live_needs_review();
test_V6_F60_fmt_omits_synthetic_time_for_date_only_precision();
test_V6_F62_activity_items_have_attach_document_control();
console.log('ALL PASS: 0.6.6.1 correction package -- V6-F55 (merged V6-F54) warning-lifecycle explicit decision point, V6-F60 date-only display, V6-F62 activity attach-document control');
