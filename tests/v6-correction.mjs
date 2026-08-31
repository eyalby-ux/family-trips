import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportResultToSuggestion,preserveTrustedFieldsOnMerge} from '../src/smart-import-adapter.js';
import {buildItemFormValues,manualCreateDefaults,normalizeUrlInput,suggestionToItem} from '../src/ingestion.js';
import {backfillTripDates,isValidCalendarDate,sanitizeTripDates,sortItemsByStartAt} from '../src/operational-data.js';
import {normalizeProposalLifecycle} from '../src/proposal-lifecycle.js';
import {APP_VERSION_PLACEHOLDER,PLACEHOLDER,injectIndexHtmlVersion,injectServiceWorkerVersion,resolveBuildVersion} from '../scripts/inject-build-version.mjs';
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
  // V6-F49: keyed by the RESOLVED proposed-field name ('startDate', which NEEDS_REVIEW_FIELD_MAP
  // maps to startAt) rather than the raw model-authored canonical key ('check_in_date', which the
  // map has no entry for) -- otherwise a manual edit of the check-in date could never clear this
  // exact warning. See tests/v6-49-51-correction.mjs for the full regression coverage.
  assert.equal(suggestion.proposed.details.needsReviewFields[0].key,'startDate');
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
  assert.match(app,/function smartImportPanel\(source\)\{\s*\n\s*if\(ingestBusy\)return processingIndicator/,'the Add panel must show the progress indicator instead of the Continue button while busy');
  assert.match(app,/if\(ingestBusy\)return;/,'a second Continue invocation while analysis is in progress must be a no-op, never a false "no document selected" error');
  console.log('PASS: V6-F11 a progress indicator is shown during analysis and a duplicate Continue click cannot produce a false "no document selected" error');
}

// --- V6-F10: a save-only source must retain a later explicit "Analyze" action ---
{
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/canAnalyze=!analyzing&&source\.kind!=='link'&&\['saved_only','failed'\]\.includes\(source\.processingState\)/,'a saved-only (or failed), not-already-analyzing source must expose a later explicit analyze action');
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
  assert.match(app,/website:normalizeUrlInput\(data\.get\('website'\)\)/,'the suggestion-review submit handler (updateSuggestion) must normalize the website value on save');
  const ingestion=fs.readFileSync(new URL('../src/ingestion.js',import.meta.url),'utf8');
  assert.match(ingestion,/website:normalizeUrlInput\(data\.get\('website'\)\)/,'buildItemFormValues (the manual-create/edit-item submit path, shared with the UI since V6-F23) must also normalize the website value on save');
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

// --- Incident: service-worker cache version was never bumped across three V6-F18/audit fix
// commits (all shipped byte-identical service-worker.js), so a browser that had already
// registered the service worker from any earlier 0.6.4 deploy never detected an update and
// kept serving a precached shell/bundle from before those fixes existed — no amount of
// redeploying reached it. Manually bumping a -vN suffix relies on someone remembering to do it
// every single release, which is exactly what failed. The cache name is now a build-time
// template resolved automatically from package.json's version plus the git commit SHA
// (scripts/inject-build-version.mjs), so every build gets a distinct cache name with no manual
// step to forget.
function test_service_worker_cache_auto_busts_every_build(){
  const sw=fs.readFileSync(new URL('../public/service-worker.js',import.meta.url),'utf8');
  assert(!sw.includes('family-trips-alpha-0.6.4-shell-v1'),'the stale 0.6.4-shell-v1 cache name (shipped unchanged across the V6-F18/website/date fix deploys, silently hiding all of them from already-registered browsers) must never return');
  assert(!/shell-v\d+'/.test(sw),'the cache name must not go back to a manually-numbered -vN suffix — that convention is exactly what produced the incident');
  assert.match(sw,/const CACHE = 'family-trips-alpha-__BUILD_VERSION__-shell';/,'the source template must declare the placeholder CACHE constant that inject-build-version.mjs resolves at build time, not a hardcoded literal');

  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(pkg.scripts.build,/node scripts\/inject-build-version\.mjs/,'the build script must run the injector after vite build so every dist/ output gets cache-busted automatically');

  // Exercise the actual resolution logic the build uses, without depending on a real build
  // having already run or on git being available in this environment.
  assert.equal(resolveBuildVersion('0.6.4','a1b2c3d4'),'0.6.4-a1b2c3d4','version and commit SHA must combine into one distinct build identifier');
  assert.equal(resolveBuildVersion('0.6.4',''),'0.6.4','a missing SHA (e.g. no git available) must still fall back to the version alone rather than crash the build');

  const resolved=injectServiceWorkerVersion(sw,resolveBuildVersion(pkg.version,'a1b2c3d4'));
  assert(!resolved.includes(PLACEHOLDER),'the placeholder must be fully resolved in the built output');
  assert.match(resolved,new RegExp(`const CACHE = 'family-trips-alpha-${pkg.version}-a1b2c3d4-shell';`),'the resolved cache name must embed both the current package.json version and the commit SHA');

  assert.throws(()=>injectServiceWorkerVersion('const CACHE = \'no-placeholder-here\';','1.0.0-abcd1234'),'if the placeholder is ever accidentally removed from the template, the build must fail loudly rather than silently ship an unbusted cache again');

  console.log('PASS: the service worker cache name is derived automatically from package.json version + git SHA on every build, with no manual step to forget');
}
test_service_worker_cache_auto_busts_every_build();

// --- V6-F21: bare check_in/check_out keys (no date/time/window suffix) must still populate dates ---
function test_V6_F21_bare_check_in_check_out_keys_populate_dates(){
  const source={id:'source-chatrium',name:'chatrium.pdf',fingerprint:'chatrium'};
  const result={attemptId:'a',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'proposed',meaningfulTitle:'Chatrium Grand Bangkok',propertyName:'Chatrium Grand Bangkok',fields:[
    {key:'check_in',label:'Check-in',rawValue:'2027-01-23',normalizedValue:'2027-01-23',evidence:'Page 1',certainty:'exact'},
    {key:'check_out',label:'Check-out',rawValue:'2027-01-26',normalizedValue:'2027-01-26',evidence:'Page 1',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const suggestion=smartImportResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.startAt,'2027-01-23T12:00','a bare "check_in" key (no date/time/window suffix) must still populate startAt, not just the evidence panel');
  assert.equal(suggestion.proposed.endAt,'2027-01-26T12:00','a bare "check_out" key must still populate endAt');

  const unrelated={attemptId:'b',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'proposed',meaningfulTitle:'X',propertyName:'X',fields:[
    {key:'check_in_instructions',label:'Check-in instructions',rawValue:'Front desk closes at 23:00',normalizedValue:'Front desk closes at 23:00',evidence:'Page 2',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null};
  const unrelatedSuggestion=smartImportResultToSuggestion(unrelated,source);
  assert.equal(unrelatedSuggestion.proposed.startAt,'','a field that merely contains the check-in root as part of a longer, unrelated key must not be misread as the check-in date');

  const withTime=smartImportResultToSuggestion({attemptId:'c',usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{proposalState:'proposed',meaningfulTitle:'X',propertyName:'X',fields:[
    {key:'check_in_date',label:'Check-in date',rawValue:'2027-01-23',normalizedValue:'2027-01-23',evidence:'p1',certainty:'exact'},
    {key:'check_in_time',label:'Check-in time',rawValue:'2:00 PM',normalizedValue:'2:00 PM',evidence:'p1',certainty:'exact'},
  ],importantNotes:[],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:null},source);
  assert.equal(withTime.proposed.startAt,'2027-01-23T14:00','check_in_time must still combine with the date, not be misread as a second date field');

  console.log('PASS: V6-F21 bare check_in/check_out keys populate startAt/endAt, without misreading unrelated check-in-adjacent fields');
}
test_V6_F21_bare_check_in_check_out_keys_populate_dates();

// --- V6-F22: Trip Center's category view must sort chronologically like Timeline, for any item type ---
function test_V6_F22_trip_center_sorts_chronologically_by_type(){
  const hotels=[
    {id:'h-panan',type:'hotel',title:'Panan Krabi',schedule:'range',startAt:'2027-01-18T14:00',endAt:'2027-01-23T11:00'},
    {id:'h-panvaree',type:'hotel',title:'Panvaree',schedule:'range',startAt:'2027-01-17T12:00',endAt:'2027-01-18T12:00'},
  ];
  assert.deepEqual(sortItemsByStartAt(hotels).map(i=>i.id),['h-panvaree','h-panan'],'hotels must render in check-in order regardless of the order they were approved in');

  // A second, unrelated item type approved out of order too, proving the sort is generic to
  // whatever category is currently selected in Trip Center, not hotel-specific.
  const flights=[
    {id:'f-return',type:'flight',title:'Return flight',schedule:'single',startAt:'2027-01-26T09:00',endAt:''},
    {id:'f-outbound',type:'flight',title:'Outbound flight',schedule:'single',startAt:'2027-01-15T06:00',endAt:''},
  ];
  assert.deepEqual(sortItemsByStartAt(flights).map(i=>i.id),['f-outbound','f-return'],'flights must also render in date order — the sort must not be specific to one item type');

  const mixed=[
    {id:'m-dated-2',type:'contact',schedule:'none',startAt:'',endAt:''},
    {id:'m-hotel',type:'hotel',schedule:'range',startAt:'2027-01-17T12:00',endAt:'2027-01-18T12:00'},
    {id:'m-dated-1',type:'contact',schedule:'none',startAt:'',endAt:''},
  ];
  assert.deepEqual(sortItemsByStartAt(mixed).map(i=>i.id),['m-hotel','m-dated-2','m-dated-1'],'dateless items must be pushed to the end, in their original relative order, without crashing');

  // center() must call the shared sort on the type-filtered list, not a reimplementation, and
  // .list must be a plain single-column grid with no CSS "order" property that could reorder
  // items visually on one breakpoint independently of DOM order — otherwise this JS-level sort
  // would not reliably reflect on screen on both desktop and phone layouts.
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const items=sortItemsByStartAt\(state\.items\.filter\(item=>item\.type===state\.category\)\)/,'center() must sort its type-filtered item list through the shared sortItemsByStartAt helper, for every category');
  const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
  assert(!/\.list[^}]*order\s*:/.test(css),'no CSS "order" property may reorder .list items independently of DOM order across breakpoints, or the JS-level sort would not reflect on screen');

  console.log('PASS: V6-F22 Trip Center category view sorts chronologically for any item type, handles dateless items gracefully, and the same list renders identically on desktop and mobile');
}
test_V6_F22_trip_center_sorts_chronologically_by_type();

// --- V6-F23 investigation: the manual "create new item" flow was a separate, untested code
// path from suggestionToItem(). Extracted into manualCreateDefaults() (the form's initial
// pre-fill) and buildItemFormValues() (what submit reads back), so the SAME functions the real
// UI calls are exercised here end-to-end, instead of only testing suggestionToItem() in
// isolation — closing the coverage gap regardless of whether a further bug is found.
function test_V6_F23_manual_create_flow_defaults_to_trip_start_end_to_end(){
  const trip={id:'trip-1',name:'Test Trip',startDate:'2027-06-01',endDate:'2027-06-10'};

  const defaults=manualCreateDefaults(trip);
  assert.equal(defaults.startAt,'2027-06-01T12:00','the create-item form must pre-fill the Trip start date the moment it opens');
  assert.equal(defaults.endAt,'2027-06-01T12:00');

  // The user submits without touching the date fields — the most direct "create a new item"
  // interaction. Simulate exactly what FormData.get() would return: the pre-filled defaults
  // from above, untouched, run through the real submit-time value builder.
  const formData=new Map([
    ['type','hotel'],['title','New Hotel'],['provider',''],['confirmationNumber',''],
    ['location',''],['website',''],['phone',''],
    ['startAt',defaults.startAt],['endAt',defaults.endAt],
    ['participants',''],['notes',''],
  ]);
  const values=buildItemFormValues({get:key=>formData.get(key)??null});
  assert.equal(values.startAt,'2027-06-01T12:00','submitting the manual-create form unchanged must persist the Trip-start default onto the created item');
  assert.equal(values.endAt,'2027-06-01T12:00');
  assert.equal(values.schedule,'range','a hotel must keep its range schedule through the manual-create path');

  // Explicit-date carve-out: if the user did type a different date, it must never be silently
  // replaced by the Trip start default.
  const editedFormData=new Map(formData);
  editedFormData.set('startAt','2027-06-05T09:00');
  editedFormData.set('endAt','2027-06-06T09:00');
  const editedValues=buildItemFormValues({get:key=>editedFormData.get(key)??null});
  assert.equal(editedValues.startAt,'2027-06-05T09:00','an explicitly user-edited date must be preserved exactly, not overwritten');

  console.log('PASS: V6-F23 the manual create-item flow (form pre-fill + submit), exercised end-to-end through the same functions the UI calls, correctly defaults to the Trip start date');
}
test_V6_F23_manual_create_flow_defaults_to_trip_start_end_to_end();

// --- V6-F23 defensive fix (a): manual item creation must never produce an empty/malformed
// datetime-local value, even if the Trip's own startDate is missing or malformed. ---
function test_V6_F23_manual_create_defaults_fallback_on_malformed_trip_date(){
  const knownToday='2027-03-15';

  const malformed=manualCreateDefaults({startDate:'2027-01-17T00:00:00Z'},knownToday);
  assert.equal(malformed.startAt,`${knownToday}T12:00`,'a malformed trip.startDate (e.g. a full ISO datetime that slipped in via an unvalidated import) must fall back to today, not produce a garbage concatenated value');
  assert(isValidCalendarDate(malformed.startAt.slice(0,10)),'the produced default must always be a real, well-formed calendar date');

  const missing=manualCreateDefaults({startDate:''},knownToday);
  assert.equal(missing.startAt,`${knownToday}T12:00`,'a missing trip.startDate must also fall back to today rather than leaving the field blank');

  const noTripAtAll=manualCreateDefaults(null,knownToday);
  assert.equal(noTripAtAll.startAt,`${knownToday}T12:00`,'creating an item before any Trip exists must still produce a valid default, not crash on trip being null');

  const valid=manualCreateDefaults({startDate:'2027-06-01'},knownToday);
  assert.equal(valid.startAt,'2027-06-01T12:00','a genuinely valid trip.startDate must still be used in preference to today');

  console.log('PASS: V6-F23(a) manual item creation falls back to today when the Trip start date is missing or malformed, and never produces an empty/invalid value');
}
test_V6_F23_manual_create_defaults_fallback_on_malformed_trip_date();

// --- V6-F23 defensive fix (b): a Trip's start/end dates must be validated before storage,
// whatever their origin -- including an externally-supplied tripContext.startDate from a
// QR/JSON import, which was previously stored completely unvalidated. ---
function test_V6_F23_import_rejects_malformed_trip_context_date(){
  const malformed=sanitizeTripDates({startDate:'17/01/2027',endDate:'2027-01-17T00:00:00Z'});
  assert.equal(malformed.startDate,'','a malformed tripContext.startDate (wrong format) must be rejected to blank, not stored as-is');
  assert.equal(malformed.endDate,'','a malformed tripContext.endDate (a full ISO datetime instead of a plain date) must also be rejected');

  const nonexistent=sanitizeTripDates({startDate:'2027-02-30',endDate:'2027-06-10'});
  assert.equal(nonexistent.startDate,'','a shape-valid but nonexistent calendar date (Feb 30) must be rejected, matching the same isValidCalendarDate() rule used for Smart Import dates (V6-F19)');
  assert.equal(nonexistent.endDate,'2027-06-10','a genuinely valid endDate alongside an invalid startDate must still be kept — validation is per-field, not all-or-nothing');

  const valid=sanitizeTripDates({startDate:'2027-06-01',endDate:'2027-06-10'});
  assert.deepEqual(valid,{startDate:'2027-06-01',endDate:'2027-06-10'},'genuinely valid dates must pass through unchanged');

  const missing=sanitizeTripDates({});
  assert.deepEqual(missing,{startDate:'',endDate:''},'no dates supplied at all must remain blank — Trip dates stay optional, per the frozen architecture — not be defaulted to today at the Trip level');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const dates=sanitizeTripDates\(seed\)/,'ensureTrip() must route every Trip creation (manual, and importBatch()\'s QR/JSON tripContext) through sanitizeTripDates() before storing');

  console.log('PASS: V6-F23(b) a Trip\'s start/end dates are validated before storage, so an externally-imported tripContext.startDate can no longer be stored malformed');
}
test_V6_F23_import_rejects_malformed_trip_context_date();

// --- V6-F24: index.html's <title>/<meta description> must never drift from the shipped
// version again -- resolved automatically at build time from package.json, the same pattern
// established for the service worker's cache name (V6-F19/F23's lesson: a hand-maintained
// version string is exactly what drifts). ---
function test_V6_F24_index_html_version_synced_to_package_json(){
  const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(source,new RegExp(`<title>Family Trips · Alpha ${APP_VERSION_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</title>`),'index.html must hold the version placeholder in <title>, not a hardcoded literal that can go stale');
  assert.match(source,new RegExp(`<meta name="description" content="Family Trips Alpha ${APP_VERSION_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">`),'index.html must hold the version placeholder in <meta name="description">, not a hardcoded literal');
  assert(!/0\.5\.6|0\.6\.[0-3]\b/.test(source),'index.html must not contain a hardcoded stale version number');

  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const resolved=injectIndexHtmlVersion(source,pkg.version);
  assert(!resolved.includes(APP_VERSION_PLACEHOLDER),'the placeholder must be fully resolved in the built output');
  assert.match(resolved,new RegExp(`<title>Family Trips · Alpha ${pkg.version}</title>`),'the resolved title must reflect the current package.json version');
  assert.match(resolved,new RegExp(`<meta name="description" content="Family Trips Alpha ${pkg.version}">`),'the resolved description must reflect the current package.json version');

  assert.throws(()=>injectIndexHtmlVersion('<title>no placeholder</title>','1.0.0'),'if the placeholder is ever accidentally removed from index.html, the build must fail loudly rather than silently shipping a stale title again');

  assert.match(pkg.scripts.build,/node scripts\/inject-build-version\.mjs/,'the build script must run the injector, which now also resolves index.html');

  console.log('PASS: V6-F24 index.html\'s title/description are resolved from package.json at build time and can no longer drift from the shipped version');
}
test_V6_F24_index_html_version_synced_to_package_json();

console.log('ALL PASS: Alpha 0.6.4 correction package regression suite');
