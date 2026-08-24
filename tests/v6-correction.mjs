import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportResultToSuggestion,preserveTrustedFieldsOnMerge} from '../src/smart-import-adapter.js';
import {normalizeUrlInput,suggestionToItem} from '../src/ingestion.js';
import {backfillTripDates} from '../src/operational-data.js';
import {normalizeProposalLifecycle} from '../src/proposal-lifecycle.js';
import {country} from '../netlify/functions/_shared/place-validation.mjs';

const source={id:'source-1',name:'panvaree.pdf',fingerprint:'abc'};
const now=new Date('2027-01-20T12:00:00Z');

// --- V6-F15: Attach-and-extract must never blank or silently overwrite a trusted saved date ---
{
  const targetItem={id:'item-1',type:'hotel',title:'Panvaree Hotel',provider:'',confirmationNumber:'',location:'Panvaree Hotel',website:'',phone:'',startAt:'2027-01-17T12:00',endAt:'2027-01-18T12:00',schedule:'range'};
  const result={attemptId:'attempt-2',usage:{},estimatedVariableCostUsd:0,latencyMs:1000,draft:{proposalState:'proposed',meaningfulTitle:'Panvaree Hotel',propertyName:'Panvaree Hotel',fields:[
    {key:'booking_number_primary',label:'Booking number',rawValue:'XYZ999',normalizedValue:'XYZ999',evidence:'Page 1',certainty:'exact'},
    {key:'property_phone_1',label:'Phone',rawValue:'+66 1 234 5678',normalizedValue:'+66 1 234 5678',evidence:'Page 1',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=preserveTrustedFieldsOnMerge(smartImportResultToSuggestion(result,source,now),targetItem);
  assert.equal(suggestion.proposed.startAt,'2027-01-17T12:00','trusted start date must be preserved, not blanked');
  assert.equal(suggestion.proposed.endAt,'2027-01-18T12:00','trusted end date must be preserved, not blanked');
  assert.equal(suggestion.proposed.confirmationNumber,'XYZ999','a genuinely new value must still fill a previously-blank trusted field');
  assert.equal(suggestion.proposed.phone,'+66 1 234 5678');

  // A differing new candidate must not silently replace the trusted value either.
  const conflictingResult=JSON.parse(JSON.stringify(result));
  conflictingResult.draft.fields.push({key:'check_in_date',label:'Check-in',rawValue:'2027-01-16',normalizedValue:'2027-01-16',evidence:'Page 2',certainty:'exact'});
  const conflicting=preserveTrustedFieldsOnMerge(smartImportResultToSuggestion(conflictingResult,source,now),targetItem);
  assert.equal(conflicting.proposed.startAt,'2027-01-17T12:00','a differing candidate date must not silently overwrite the trusted date');
  assert.equal(conflicting.proposed.details.mergeCandidates.startAt,'2027-01-16T12:00','the differing candidate must be offered separately for review');
  assert(conflicting.warnings.some(w=>w.includes('startAt')),'a review warning must call out the candidate value');
  console.log('PASS: V6-F15 merge preserves trusted dates, offers differing candidates for review');
}

// --- V6-F04 / V6-F08 / V6-F12 / V6-F09: extracted values reach structured fields, not just notes ---
{
  const result={attemptId:'attempt-3',usage:{},estimatedVariableCostUsd:0,latencyMs:1000,draft:{proposalState:'proposed',meaningfulTitle:'Panan Krabi Resort',propertyName:'Panan Krabi Resort',fields:[
    {key:'check_in_date',label:'Check-in date',rawValue:'2027-03-28',normalizedValue:'2027-03-28',evidence:'Page 1',certainty:'exact'},
    {key:'check_out_date',label:'Check-out date',rawValue:'2027-03-31',normalizedValue:'2027-03-31',evidence:'Page 1',certainty:'exact'},
    {key:'check_in_window',label:'Check-in window',rawValue:'2:00 PM–11:00 PM',normalizedValue:'2:00 PM–11:00 PM',evidence:'Page 1',certainty:'exact'},
    {key:'itinerary_number',label:'Itinerary number',rawValue:'IT-777',normalizedValue:'IT-777',evidence:'Page 1',certainty:'exact'},
    {key:'supplier',label:'Supplier',rawValue:'Booking.com',normalizedValue:'Booking.com',evidence:'Page 1',certainty:'exact'},
    {key:'hotel_website',label:'Website',rawValue:'https://panankrabi.example',normalizedValue:'https://panankrabi.example',evidence:'Page 2',certainty:'exact'},
    {key:'contact_number',label:'Phone',rawValue:'+66 7 555 1212',normalizedValue:'+66 7 555 1212',evidence:'Page 2',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  assert.equal(suggestion.proposed.startAt,'2027-03-28T14:00','the detected check-in date and window start time must both persist');
  assert.equal(suggestion.proposed.endAt,'2027-03-31T12:00','the detected check-out date must persist');
  assert.equal(suggestion.proposed.confirmationNumber,'IT-777','a non-canonical itinerary-number key must still map to the confirmation-number field');
  assert.equal(suggestion.proposed.provider,'Booking.com','supplier must pre-fill the provider field');
  assert.equal(suggestion.proposed.website,'https://panankrabi.example','a non-canonical website key must still be recognized');
  assert.equal(suggestion.proposed.phone,'+66 7 555 1212','a non-canonical phone key must still be recognized');

  const item=suggestionToItem(suggestion,{});
  assert.equal(item.confirmationNumber,'IT-777');
  assert.equal(item.provider,'Booking.com');
  assert.equal(item.phone,'+66 7 555 1212');
  assert.equal(item.startAt,'2027-03-28T14:00');
  console.log('PASS: V6-F04/V6-F08/V6-F09/V6-F12 detected dates, times, confirmation numbers, supplier, website and phone persist to structured fields and survive approval');
}

// --- V6-F13: an internally flagged needs_review field must be surfaced, not silently resolved ---
{
  const result={attemptId:'attempt-4',usage:{},estimatedVariableCostUsd:0,latencyMs:1000,draft:{proposalState:'needs_review',meaningfulTitle:'Panan Krabi Resort',propertyName:'Panan Krabi Resort',fields:[
    {key:'check_in_date',label:'Check-in date',rawValue:'2027-03-28',normalizedValue:'2027-03-28',evidence:'Page 1 vs Page 3 conflict',certainty:'needs_review'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source,now);
  assert.equal(suggestion.proposed.details.needsReviewFields.length,1,'the internally flagged field must be recorded for review');
  assert.equal(suggestion.proposed.details.needsReviewFields[0].key,'check_in_date');
  assert(suggestion.warnings.some(w=>w.includes('דורש בדיקה')&&w.includes('2027-03-28')),'the conflicting value must be visible in the review-form warning list');
  assert(suggestion.warnings.some(w=>w.includes('דורש בדיקה')),'a needs_review proposal state must also surface a general warning');
  const item=suggestionToItem(suggestion,{});
  assert(item.warnings.some(w=>w.includes('2027-03-28')),'the needs_review marker must remain inspectable on the saved item, not just at review time');
  console.log('PASS: V6-F13 internally resolved evidence conflicts are surfaced as needs_review on the proposal and the saved item');
}

// --- V6-F17: place validation must use address/country evidence already extracted in the proposal ---
{
  assert.equal(country({fields:[]},'Carrer Example 12, 08001 Barcelona, Spain'),'es','a full evidenced address containing the country name must resolve, not just a 2-letter code');
  assert.equal(country({fields:[{key:'country',label:'Country',rawValue:'Spain',normalizedValue:'Spain',evidence:'x',certainty:'exact'}]},''),'es','an explicit full country name field must resolve to its code');
  assert.equal(country({fields:[]},'Ban Ta Khun, Surat Thani, Thailand'),'th','existing Thailand resolution must keep working');
  assert.equal(country({fields:[{key:'country_code',label:'Country code',rawValue:'IL',normalizedValue:'IL',evidence:'x',certainty:'exact'}]},''),'il','an explicit 2-letter code must keep working');
  console.log('PASS: V6-F17 place validation resolves a country from evidenced address/country text, not only a fixed 2-country list');
}

// --- V4-F04 (retroactive) / V6-F06: new items default to the Trip start date; explicit dates are never overwritten ---
{
  const blankSuggestion={proposed:{type:'hotel',title:'New Hotel',schedule:'range',startAt:'',endAt:''},warnings:[]};
  const newItem=suggestionToItem(blankSuggestion,{},'2027-06-01');
  assert.equal(newItem.startAt,'2027-06-01T12:00','a brand-new item must default its start date to the Trip start date once Trip dates are set');
  assert.equal(newItem.endAt,'2027-06-01T12:00','a range-schedule new item must also default its end date');

  const explicitlyDatedItem={id:'item-9',type:'hotel',schedule:'range',startAt:'2027-05-10T09:00',endAt:'2027-05-12T09:00'};
  const mergedOverExisting=suggestionToItem(blankSuggestion,explicitlyDatedItem,'2027-06-01');
  assert.equal(mergedOverExisting.startAt,'2027-05-10T09:00','an existing item\'s explicit date must never be overwritten by the Trip-start default');
  assert.equal(mergedOverExisting.endAt,'2027-05-12T09:00');

  const items=[{id:'a',schedule:'range',startAt:'',endAt:''},{id:'b',schedule:'range',startAt:'2027-05-10T09:00',endAt:'2027-05-12T09:00'}];
  const changed=backfillTripDates(items,'2027-06-01');
  assert.equal(changed,1,'only the undated item is backfilled when Trip dates are set later');
  assert.equal(items[0].startAt,'2027-06-01T12:00');
  assert.equal(items[1].startAt,'2027-05-10T09:00','an existing item\'s explicit date must never be overwritten by a later Trip-date assignment');
  console.log('PASS: V4-F04 new-item Trip-start default and explicit-date preservation carve-out');
}
{
  const suggestion={proposed:{type:'hotel',title:'Panvaree Resort',schedule:'range',startAt:'',endAt:''},warnings:[]};
  const item=suggestionToItem(suggestion,{},'2027-01-17');
  assert.equal(item.startAt,'2027-01-17T12:00','once Trip dates are set, approving a dateless Smart Import suggestion must default to the Trip start date');
  assert.equal(item.endAt,'2027-01-17T12:00');
  console.log('PASS: V6-F06 Trip-start default applied after Trip dates are set (recurrence of V4-F04)');
}

// --- V6-F07: an approved proposal must never resurface as pending on Home or Trip Center ---
{
  const suggestions=[
    {id:'s-approved',status:'approved',proposed:{title:'Approved Hotel'}},
    {id:'s-pending',status:'pending',proposed:{title:'Pending Hotel'}},
  ];
  const first=normalizeProposalLifecycle(suggestions,[]);
  assert.equal(first.suggestions.length,1);
  assert.equal(first.suggestions[0].id,'s-pending','an approved suggestion must be dropped from the active/pending pool');
  assert(!first.rejectedSuggestions.some(s=>s.id==='s-approved'),'an approved suggestion is not a rejected one either');
  const second=normalizeProposalLifecycle(first.suggestions,first.rejectedSuggestions);
  assert.equal(second.suggestions.length,1,'a refresh (re-normalizing already-saved state) must not resurface the approved suggestion');
  console.log('PASS: V6-F07 approved proposal is never shown as pending on Home, including after refresh');
}

// --- V6-F05 / V6-F11: the selected file must survive a re-render, and Continue must be guarded against re-entry ---
{
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/id==='source-file'\)\{pendingSourceFile=event\.target\.files/,'the selected file must be captured into memory on selection, not re-read from the DOM later');
  assert.match(app,/async function smartIngest\(\)\{\s*\n\s*if\(ingestBusy\)return;/,'smartIngest must guard against a second concurrent invocation');
  assert.match(app,/async function attachIngest\(itemId\)\{\s*\n\s*if\(ingestBusy\)return;/,'attachIngest must guard against a second concurrent invocation');
  assert(!/async function smartIngest[\s\S]*?document\.querySelector\('#source-file'\)/.test(app.slice(app.indexOf('async function smartIngest'),app.indexOf('async function attachIngest'))),'smartIngest must not re-read the file input from the DOM');
  console.log('PASS: V6-F05 a selected file survives an intervening render and is accepted on the first attempt');
}
{
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function processingIndicator\(message\)/,'a visible processing/progress indicator must be rendered during analysis');
  assert.match(app,/function smartImportPanel\(source\)\{if\(ingestBusy\)return processingIndicator/,'the Add panel must show the progress indicator instead of the Continue button while busy');
  assert.match(app,/if\(ingestBusy\)return;/,'a second Continue invocation while analysis is in progress must be a no-op, never a false "no document selected" error');
  console.log('PASS: V6-F11 a progress indicator is shown during analysis and a duplicate Continue click cannot produce a false "no document selected" error');
}

// --- V6-F10: a save-only source must retain a later explicit "Analyze" action ---
{
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/canAnalyze=source\.kind!=='link'&&\['saved_only','failed'\]\.includes\(source\.processingState\)/,'a saved-only (or failed) source must expose a later explicit analyze action');
  assert.match(app,/data-action="analyze-source"/,'the Analyze action must be wired into the source row');
  assert.match(app,/async function analyzeSavedSource\(id\)\{/,'analyzing a saved source must run analysis on the already-saved source without requiring re-upload');
  assert.match(app,/action==='analyze-source'\)await analyzeSavedSource/);
  console.log('PASS: V6-F10 a save-only source keeps a later explicit Analyze action available');
}

// --- V6-F18: a bare-domain URL (no explicit https://) must be normalized, not rejected ---
function test_V6_F18_url_scheme_normalized(){
  assert.equal(normalizeUrlInput('www.phangan.co.il'),'https://www.phangan.co.il','a valid bare domain must be accepted with https:// prepended');
  assert.equal(normalizeUrlInput('phangan.co.il/hotels/panvaree'),'https://phangan.co.il/hotels/panvaree','a bare domain with a path must also be normalized');
  assert.equal(normalizeUrlInput('https://www.phangan.co.il'),'https://www.phangan.co.il','a URL that already has a scheme must be left unchanged');
  assert.equal(normalizeUrlInput('http://www.phangan.co.il'),'http://www.phangan.co.il','an explicit http:// scheme must also be left unchanged');
  assert.equal(normalizeUrlInput('not a url'),'not a url','text that is not a plausible domain must be left unchanged so normal validation still rejects it');
  const normalized=normalizeUrlInput('www.phangan.co.il');
  assert.doesNotThrow(()=>{const parsed=new URL(normalized);assert.equal(parsed.protocol,'https:')},'the normalized value must be accepted as a valid HTTPS URL, matching the client-side link validator');

  // Node's URL class implements the same WHATWG parser browsers use for type="url" constraint
  // validation. Proving it throws on the raw bare domain is the actual mechanism that produced
  // the "Please enter a URL." tooltip and blocked app code from ever running on a type="url"
  // field — this is why the field itself must not be that type, not just a style preference.
  assert.throws(()=>new URL('www.phangan.co.il'),'a bare domain is not a valid absolute URL to the WHATWG parser, which is exactly why a native type="url" field would have rejected it before any JS ran');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/url=normalizeUrlInput\(document\.querySelector\('#source-url'\)\?\.value\)/,'the Add → Link flow must normalize the entered URL before validating/saving it');

  // The field itself must not be type="url": a browser's native URL constraint validation
  // rejects a bare domain (e.g. shows a "Please enter a URL." tooltip) and blocks the click
  // handler from ever running, so normalizeUrlInput() never gets a chance to execute — this
  // is the exact path a real user hits, not just the underlying function in isolation.
  const sourceUrlTag=app.match(/<input id="source-url"[^>]*>/)?.[0];
  assert(sourceUrlTag,'the Add → Link URL field must exist');
  assert(!/\btype="url"/.test(sourceUrlTag),'the URL field must not be type="url", or the browser blocks the value before app code (and normalizeUrlInput) ever runs');
  assert.match(sourceUrlTag,/\btype="text"/,'the URL field must be a plain text field so the app\'s own normalization/validation runs on exactly what the user typed');
  console.log('PASS: V6-F18 a bare-domain URL entered without an explicit scheme is normalized to https:// and accepted, and the field itself cannot block it via native browser validation');
}
test_V6_F18_url_scheme_normalized();

// --- Native-validation audit: the website field (V6-F09) shares V6-F18's exact bug class ---
// It sits inside real <form> elements (suggestion-form/manual-form/edit-item-form), so a
// type="url" mismatch would block the browser's own submit event entirely, before the app's
// preventDefault()-guarded handler ever runs — an even more certain block than the modal
// button case V6-F18 fixed.
function test_website_field_avoids_native_url_gate(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  const websiteTag=app.match(/<input type="[^"]*"[^>]*name="website"[^>]*>/)?.[0];
  assert(websiteTag,'the website field must exist in proposalFields');
  assert(!/type="url"/.test(websiteTag),'the website field must not be type="url", or a bare-domain website (e.g. from a V6-F09 extraction) blocks form submission natively');
  assert.match(websiteTag,/type="text"/,'the website field must be a plain text field so the app\'s own normalization runs');
  const normalizeCalls=[...app.matchAll(/website:normalizeUrlInput\(data\.get\('website'\)\)/g)];
  assert.equal(normalizeCalls.length,2,'both the suggestion-review submit handler and the manual/edit-item submit handler must normalize the website value on save');
  console.log('PASS: website field (populated by V6-F09) avoids the same native type="url" gate as V6-F18 and normalizes its value on save');
}
test_website_field_avoids_native_url_gate();

// --- Native-validation audit: startAt/endAt (V6-F04/F08/F06) are type="datetime-local" ---
// A datetime-local field silently sanitizes an unparseable-or-nonexistent value to EMPTY, with
// no tooltip and no error — unlike type="url" it doesn't block a click, it just makes a
// captured date vanish from the review form without warning. dateTime() must reject a
// shape-valid but nonexistent calendar date (e.g. 2027-02-30) before it ever reaches the field.
function test_smart_import_rejects_invalid_calendar_date(){
  const source={id:'source-cal',name:'cal.pdf',fingerprint:'cal'};
  const badResult={attemptId:'a',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'proposed',meaningfulTitle:'Cal Hotel',propertyName:'Cal Hotel',fields:[
    {key:'check_in_date',label:'Check-in',rawValue:'2027-02-30',normalizedValue:'2027-02-30',evidence:'Page 1',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const badSuggestion=smartImportResultToSuggestion(badResult,source);
  assert.equal(badSuggestion.proposed.startAt,'','a shape-valid but nonexistent calendar date must not reach the datetime-local field, where the browser would silently blank it with no warning — reproducing V6-F04\'s symptom through a different mechanism');

  const goodResult=JSON.parse(JSON.stringify(badResult));
  goodResult.draft.fields[0].rawValue=goodResult.draft.fields[0].normalizedValue='2027-02-28';
  const goodSuggestion=smartImportResultToSuggestion(goodResult,source);
  assert.equal(goodSuggestion.proposed.startAt,'2027-02-28T12:00','a genuinely valid date must still persist normally');
  console.log('PASS: a shape-valid but nonexistent calendar date is rejected before it can reach the datetime-local field and be silently blanked');
}
test_smart_import_rejects_invalid_calendar_date();

console.log('ALL PASS: Alpha 0.6.4 correction package regression suite');
