import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportResultToSuggestion} from '../src/smart-import-adapter.js';
import {reconcileStaleNeedsReview,suggestionReviewDefaults} from '../src/ingestion.js';

// Real post-launch 0.6.5 Production findings, folded into 0.6.6 per
// MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md V51 / VERSION_PACKAGE_AUTHORING_STANDARD_V29.md. All
// three trace to one root cause: the model sometimes resolves a conflict into free-text
// draft.unresolved prose instead of a structured field, and the app only trusts structured
// fields. Confirmed live on a real Hyatt Regency Phuket Voucher source (2026-08-31).
const source={id:'source-hyatt',name:'Hyatt Regency Phuket Voucher.pdf',fingerprint:'hyatt'};
const now=new Date('2027-01-15T12:00:00Z');

// --- V6-F49: a needsReviewFields-sourced warning must actually clear when its mapped field is
// edited (the root defect: it was keyed by the raw model-authored canonical key, which
// NEEDS_REVIEW_FIELD_MAP had no entries for at all, so it could never match). ---
{
  const result={attemptId:'a1',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'needs_review',meaningfulTitle:'Hyatt Regency Phuket',propertyName:'Hyatt Regency Phuket',fields:[
    {key:'check_in_date',label:'Check-in date',rawValue:'2027-01-18',normalizedValue:'2027-01-18',evidence:'page text vs. page image conflict',certainty:'needs_review'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  assert.equal(suggestion.proposed.details.needsReviewFields.length,1);
  assert.equal(suggestion.proposed.details.needsReviewFields[0].key,'startDate','must be keyed by the resolved proposed-field name (startDate), which NEEDS_REVIEW_FIELD_MAP maps to startAt -- not the raw model key (check_in_date), which the map had no entry for');
  assert(suggestion.warnings.some(w=>typeof w==='string'&&w.includes('דורש בדיקה')),'the needs-review warning must be visible before the field is edited');

  // The Product Owner edits startAt in the review form -- updateSuggestion() computes exactly
  // this changedFields set and calls reconcileStaleNeedsReview with it.
  const edited=reconcileStaleNeedsReview(suggestion.proposed,new Set(['startAt']));
  assert.equal(edited.details.needsReviewFields.length,0,'editing the mapped field (startAt) must clear the needs-review entry -- this is the exact defect: previously nothing could ever match, so this array never emptied');
  assert(!edited.warnings.some(w=>typeof w==='string'&&w.includes('דורש בדיקה')&&w.includes('2027-01-18')),'the cleared field\'s own warning text must be removed once resolved');
  console.log('PASS: V6-F49 (structured path) a needs-review warning backed by a real field now clears when that field is edited, via the resolved proposed-field-name key');
}

// --- V6-F49 (unresolved path): a warning sourced from draft.unresolved carries no field key at
// all, so it can never be auto-matched and cleared by reconcileStaleNeedsReview no matter what
// changes -- it is wrapped as a dismissible object instead, and the review screen offers a
// manual dismiss control specifically for this otherwise-unclearable kind. ---
{
  const result={attemptId:'a2',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'needs_review',meaningfulTitle:'Hyatt Regency Phuket',propertyName:'Hyatt Regency Phuket',fields:[],importantNotes:[],warnings:[],unresolved:['The separate "Island Haven" name, address, and phone appear in the document header and are not identified as the hotel\'s property location or contact information.'],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  const unresolvedWarning=suggestion.proposed.warnings.find(w=>typeof w==='object'&&w!==null);
  assert(unresolvedWarning,'an unresolved-sourced warning must be present');
  assert.equal(unresolvedWarning.dismissible,true,'an unresolved-sourced warning must be marked dismissible, since it can never be auto-cleared');
  assert(unresolvedWarning.message.includes('Island Haven'));

  // No amount of field-editing can clear it automatically -- proving the manual dismiss backstop
  // is genuinely needed, not redundant with the structured-field fix above.
  const edited=reconcileStaleNeedsReview({...suggestion.proposed,details:{...suggestion.proposed.details,needsReviewFields:[]}},new Set(['startAt','endAt','location','title','provider','confirmationNumber','website','phone']));
  assert(edited.warnings.some(w=>typeof w==='object'&&w!==null&&w.dismissible),'an unresolved-sourced warning must survive reconcileStaleNeedsReview regardless of which fields changed -- it has no key to match against');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function isDismissibleWarning\(value\)\{return typeof value==='object'&&value!==null&&value\.dismissible===true\}/,'the review screen must recognize a dismissible warning object');
  assert.match(app,/action==='dismiss-warning'/,'the review screen must offer a manual dismiss action for a dismissible warning');
  console.log('PASS: V6-F49 (unresolved path) a warning with no field key never auto-clears and is marked dismissible; the review screen wires a manual dismiss control for exactly this case');
}

// --- V6-F50: a date the model resolves correctly but states only in free text must still reach
// startAt -- confirmed on the real Hyatt Regency case, whose unresolved text read exactly
// "Check-in date: 18 Jan 2027 (Page 1 parsed text labels the dates as "Check-out 18 Jan 2027"
// and "Check-in 23 Jan 2027", while the page 2 image visibly labels 18 Jan 2027 as Check-in and
// 23 Jan 2027 as Check-out.)" with a matching check-out sentence -- leaving startAt/endAt blank
// with no structured `fields` entry for either side at all. ---
{
  const result={attemptId:'a3',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'needs_review',meaningfulTitle:'Hyatt Regency Phuket',propertyName:'Hyatt Regency Phuket',fields:[],importantNotes:[],warnings:[],unresolved:[
    'The parsed text reverses the check-in and check-out labels, while the rendered page image shows check-in on 18 Jan 2027 and check-out on 23 Jan 2027; date labels require review.',
    'Check-in date: 18 Jan 2027 (Page 1 parsed text labels the dates as "Check-out 18 Jan 2027" and "Check-in 23 Jan 2027", while the page 2 image visibly labels 18 Jan 2027 as Check-in and 23 Jan 2027 as Check-out.)',
    'Check-out date: 23 Jan 2027 (Page 1 parsed text labels the dates as "Check-out 18 Jan 2027" and "Check-in 23 Jan 2027", while the page 2 image visibly labels 23 Jan 2027 as Check-out and 18 Jan 2027 as Check-in.)',
  ],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  assert.equal(suggestion.proposed.startAt,'2027-01-18T12:00','a date resolved only in free text must still reach startAt, not render blank');
  assert.equal(suggestion.proposed.endAt,'2027-01-23T12:00','the same fallback must independently cover endAt/check-out');
  assert(suggestion.proposed.details.needsReviewFields.some(field=>field.key==='startDate'),'the fallback-derived date must itself be flagged needs_review, not presented as a confident field');
  assert(suggestion.proposed.details.needsReviewFields.some(field=>field.key==='endDate'));
  assert(suggestion.proposed.details.smartImportFields.some(field=>field.key==='startDate'&&field.certainty==='needs_review'),'the fallback-derived value must be visible in the evidence panel too');
  console.log('PASS: V6-F50 a date resolved only in draft.unresolved prose still reaches startAt/endAt (flagged needs_review), instead of silently rendering blank');
}
{
  // A negative case: free text with no recognizable labelled date must not fabricate one.
  const result={attemptId:'a4',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'needs_review',meaningfulTitle:'Some Hotel',propertyName:'Some Hotel',fields:[],importantNotes:[],warnings:[],unresolved:['The property phone number is smudged and cannot be confirmed against the booking platform.'],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  assert.equal(suggestion.proposed.startAt,'','free text with no labelled date must never be misread into a fabricated startAt');
  console.log('PASS: V6-F50 the fallback scan stays inert when the free text carries no recognizable labelled date');
}

// --- V6-F51: the Smart Import review screen must pre-fill a blank date with the Trip start
// date for a genuinely new-item suggestion, mirroring manualCreateDefaults/suggestionToItem's
// own trip-start fallback -- previously it rendered blank with no defaulting at all. ---
{
  const blank={startAt:'',endAt:'',schedule:'range'};
  const filled=suggestionReviewDefaults(blank,'2027-06-01',true);
  assert.equal(filled.startAt,'2027-06-01T12:00');
  assert.equal(filled.endAt,'2027-06-01T12:00','a range-schedule suggestion must default both sides, matching suggestionToItem\'s own approval-time fallback');

  const single={startAt:'',endAt:'',schedule:'single'};
  const filledSingle=suggestionReviewDefaults(single,'2027-06-01',true);
  assert.equal(filledSingle.startAt,'2027-06-01T12:00');
  assert.equal(filledSingle.endAt,'','a single-schedule suggestion (e.g. Attraction/Event) has no end date concept to default');

  const alreadyDated={startAt:'2027-05-10T09:00',endAt:'2027-05-12T09:00',schedule:'range'};
  const unchanged=suggestionReviewDefaults(alreadyDated,'2027-06-01',true);
  assert.equal(unchanged.startAt,'2027-05-10T09:00','a genuinely extracted date must never be overwritten by the trip-start default');
  assert.equal(unchanged.endAt,'2027-05-12T09:00');

  const updateSuggestion=suggestionReviewDefaults(blank,'2027-06-01',false);
  assert.equal(updateSuggestion.startAt,'','an update/attach-and-extract suggestion (targeting an existing item) must never get the new-item trip-start default -- mirrors suggestionToItem\'s own isNewItem gate');

  const noTripYet=suggestionReviewDefaults(blank,'',true);
  assert.equal(noTripYet.startAt,'','with no Trip start date yet set, the field must stay blank rather than defaulting to an invalid value');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/suggestionReviewDefaults\(p,state\.trip\?\.startDate\|\|'',!isUpdate\)/,'suggestionView must actually apply the prefill when rendering the review form');
  console.log('PASS: V6-F51 the Smart Import review screen pre-fills a blank date with the Trip start date for a new-item suggestion, matching the same fallback approval already applied');
}
