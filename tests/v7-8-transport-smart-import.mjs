import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportTransportResultToSuggestion} from '../src/transport-import-adapter.js';
import {ITEM_TYPES,TYPE_FIELDS,inferItemType} from '../src/ingestion.js';
import {sourceClassificationSchema,transportImportSchema,transportSystemPrompt,classificationSystemPrompt} from '../netlify/functions/_shared/smart-import-schema.mjs';

// 0.7.8: Transport Smart Import (rental car, rail, ferry/boat), per
// TRANSPORT_SMART_IMPORT_DISCOVERY.md (V6, FROZEN) and FAMILY_TRIPS_ALPHA_0_7_8_SCOPE_V1.md.
// Transfer is explicitly out of scope for extraction this slice (no real benchmark document, the
// Product Owner decided directly not to wait for one) -- transportMode:'transfer' remains a real,
// honest classification output the model can return, but the adapter rejects building a proposal
// from it, same discipline as analyzeSource's own 'unrecognized' throw.
//
// Fixtures below are representative test data grounded directly in the frozen per-sub-type field
// contracts (Section 3 of the discovery document, each CHECKED against a real document:
// TR-001-TR-004 for rental car, TR-005 for rail, TR-006 for ferry/boat) -- not hand-transcribed
// character-for-character from the real PDFs the way the Insurance vertical's own fixtures are
// (tests/v6-7-insurance-import.mjs), since that would need re-reading six real documents from
// scratch; the shape and field vocabulary they exercise is the same either way. netlify/functions/
// smart-import.mjs's own OPERATIONS wiring is verified by source-inspection below, matching the
// established pattern for that module throughout this project (it imports openai at module scope,
// which this harness can load, but exercising the live model call itself needs real API access,
// not available here -- an acceptance-session step, per every prior Smart Import vertical).
function f(key,label,rawValue,certainty='exact',evidence='source'){return {key,label,rawValue,normalizedValue:rawValue,evidence,certainty}}
function draftResult(draft,attemptId='attempt'){return {attemptId,usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{acquisitionState:'acquired',proposalState:'proposed',transportMode:'car',transportModeCertainty:'exact',fields:[],importantNotes:[],unresolved:[],explicitlyAbsent:[],warnings:[],...draft}}}
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const smartImportFn=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');

function test_0_7_8_TYPE_FIELDS_car_gains_website_and_email(){
  assert(TYPE_FIELDS.car.includes('website'));
  assert(TYPE_FIELDS.car.includes('email'));
  // schedule stays fixed 'range' for every Transport sub-type, per 0.7.4's own decision, not
  // re-litigated by this candidate.
  assert.equal(ITEM_TYPES.car.schedule,'range');
}

function test_0_7_8_TYPE_RULES_recognizes_rail_ferry_transfer_language(){
  assert.equal(inferItemType('Deutsche Bahn train ticket Berlin Hbf').type,'car');
  assert.equal(inferItemType('Stena Line ferry booking confirmation Kiel Goteborg').type,'car');
  assert.equal(inferItemType('Airport transfer booking confirmation shuttle service').type,'car');
  // Existing rental-car recognition (0.7.4) must remain unaffected by the new patterns.
  assert.equal(inferItemType('rental car agreement Alamo pickup dropoff').type,'car');
}

function test_0_7_8_classification_recognizes_transport_as_a_real_category(){
  assert(sourceClassificationSchema.properties.category.enum.includes('car'));
  assert(classificationSystemPrompt.includes('TRANSPORT'));
  // Transfer stays an "unrecognized" example, not part of the TRANSPORT bucket -- confirmed
  // directly in the prompt text, not assumed.
  assert(classificationSystemPrompt.includes('transfer/shuttle/taxi confirmation'));
}

function test_0_7_8_transportImportSchema_allows_transfer_and_other_as_honest_non_extraction_outputs(){
  assert.deepEqual(transportImportSchema.properties.transportMode.enum,['car','rail','ferry','transfer','other']);
  assert(transportSystemPrompt.includes('recognition-only outputs, not extraction targets'));
}

function test_0_7_8_rental_car_maps_origin_to_location_and_startAt_endAt_from_date_time_pairs(){
  const source={id:'src-tr001',name:'TR-001',fingerprint:'tr001'};
  const result=draftResult({
    transportMode:'car',
    fields:[
      f('provider','Provider','Alamo'),
      f('confirmation_number','Confirmation number','RA123456'),
      f('origin_location','Pickup location','Athens Airport'),
      f('origin_date','Pickup date','2027-03-10'),
      f('origin_time','Pickup time','10:00'),
      f('destination_location','Drop-off location','Athens Airport'),
      f('destination_date','Drop-off date','2027-03-17'),
      f('destination_time','Drop-off time','10:00'),
      f('vehicle_class','Vehicle class','Compact'),
      f('website','Website','https://alamo.gr'),
      f('email','Email','reservations@alamo.gr'),
    ],
  });
  const suggestion=smartImportTransportResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.type,'car');
  assert.equal(suggestion.proposed.transportMode,'car');
  assert.equal(suggestion.proposed.provider,'Alamo');
  assert.equal(suggestion.proposed.confirmationNumber,'RA123456');
  assert.equal(suggestion.proposed.location,'Athens Airport');
  assert.equal(suggestion.proposed.startAt,'2027-03-10T10:00');
  assert.equal(suggestion.proposed.endAt,'2027-03-17T10:00');
  assert.equal(suggestion.proposed.website,'https://alamo.gr');
  assert.equal(suggestion.proposed.email,'reservations@alamo.gr');
  assert.equal(suggestion.proposed.schedule,'range');
  // destination_location and vehicle_class have no dedicated item field -- must not be silently
  // dropped, only demoted to notes (the same otherFields fallback Insurance's sum_insured/broker
  // already use).
  assert.match(suggestion.proposed.notes,/Drop-off location/);
  assert.match(suggestion.proposed.notes,/Compact/);
}

function test_0_7_8_rail_maps_departure_station_and_resolves_endAt_for_overnight_ferry_style_dates(){
  const source={id:'src-tr005',name:'TR-005',fingerprint:'tr005'};
  const result=draftResult({
    transportMode:'rail',
    fields:[
      f('provider','Provider','Deutsche Bahn'),
      f('confirmation_number','Order number','576743004135'),
      f('origin_location','Departure station','Berlin Hbf'),
      f('origin_date','Departure date','2025-12-07'),
      f('origin_time','Departure time','14:00'),
      f('destination_location','Arrival station','Braunschweig Hbf'),
      f('destination_date','Arrival date','2025-12-07'),
      f('destination_time','Arrival time','15:10'),
      f('train_number','Train number','ICE 646'),
      f('seat_class','Class','Flexpreis, 2nd class'),
    ],
  });
  const suggestion=smartImportTransportResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.transportMode,'rail');
  assert.equal(suggestion.proposed.location,'Berlin Hbf');
  assert.equal(suggestion.proposed.startAt,'2025-12-07T14:00');
  assert.equal(suggestion.proposed.endAt,'2025-12-07T15:10');
  assert.match(suggestion.proposed.notes,/Braunschweig Hbf/);
  assert.match(suggestion.proposed.notes,/ICE 646/);
}

function test_0_7_8_ferry_supports_a_next_day_arrival_and_no_vehicle_carried(){
  const source={id:'src-tr006',name:'TR-006',fingerprint:'tr006'};
  const result=draftResult({
    transportMode:'ferry',
    fields:[
      f('provider','Provider','Stena Line'),
      f('confirmation_number','Booking number','081225162'),
      f('origin_location','Departure port','Kiel'),
      f('origin_date','Departure date','2025-12-08'),
      f('origin_time','Departure time','19:00'),
      f('destination_location','Arrival port','Göteborg'),
      f('destination_date','Arrival date','2025-12-09'),
      f('destination_time','Arrival time','09:00'),
      f('vessel_name','Vessel','Stena Scandinavica'),
    ],
  });
  const suggestion=smartImportTransportResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.transportMode,'ferry');
  // Overnight crossing -- destination date is a real day after origin date, must not be "corrected".
  assert.equal(suggestion.proposed.startAt,'2025-12-08T19:00');
  assert.equal(suggestion.proposed.endAt,'2025-12-09T09:00');
  // vehicle_carriage genuinely absent (foot-passenger booking) -- must not appear as an invented
  // "none" value anywhere, and must not block the rest of the proposal.
  assert(!suggestion.proposed.notes.includes('vehicle_carriage'));
}

function test_0_7_8_transfer_and_other_are_rejected_not_silently_turned_into_a_low_quality_proposal(){
  const source={id:'src-transfer',name:'transfer-doc',fingerprint:'xfer'};
  assert.throws(()=>smartImportTransportResultToSuggestion(draftResult({transportMode:'transfer'}),source),/הסעה \(Transfer\) אינו נתמך/);
  assert.throws(()=>smartImportTransportResultToSuggestion(draftResult({transportMode:'other'}),source),/לא נוצרה הצעה/);
}

function test_0_7_8_needs_review_fields_surface_as_warnings(){
  const source={id:'src-needsreview',name:'blurry-scan',fingerprint:'blur'};
  const result=draftResult({
    fields:[
      f('provider','Provider','Sixt',),
      f('confirmation_number','Confirmation number','ABC123','needs_review','faint stamp'),
    ],
  });
  const suggestion=smartImportTransportResultToSuggestion(result,source);
  assert(suggestion.warnings.some(warning=>warning.message.includes('דורש בדיקה')&&warning.message.includes('ABC123')));
}

function test_0_7_8_runSmartAnalysis_routes_car_through_the_transport_adapter_not_the_hotel_fallback(){
  assert.match(app,/category==='car'\?\[smartImportTransportResultToSuggestion\(result,source\)\]/,'a suggestion classified as car (via the generic global-Add classification path) must route through smartImportTransportResultToSuggestion, not the Hotel adapter');
  assert(app.includes("targetItem.type==='car'?analyzeCarSource({trip:state.trip,source,file})"),'attach-and-extract on an existing Transport item must call analyzeCarSource directly, not fall through to analyzeHotelSource');
}

function test_0_7_8_attach_source_button_reachable_for_car_items(){
  assert(app.includes("['hotel','flight','activity','insurance','car'].includes(item.type)"));
}

function test_0_7_8_updateSuggestion_captures_transportMode_and_email_for_review_edits(){
  // Found live (needed for reviewing a Transport suggestion): transportMode/email were rendered by
  // proposalFields() but never captured back out of the suggestion-review form -- unreachable
  // until this candidate made a real car-type suggestion possible for the first time.
  const start=app.indexOf('function updateSuggestion');
  const body=app.slice(start,app.indexOf('\n',app.indexOf('changedFields',start)));
  assert(body.includes("email:String(data.get('email')||'').trim()"));
  assert(body.includes("transportMode:String(data.get('transportMode')||'').trim()||before.transportMode"));
}

function test_0_7_8_smart_import_operations_wiring(){
  assert(smartImportFn.includes('analyze_car:{schemaName:'));
  assert(smartImportFn.includes("['flight','hotel','activity','insurance','car'].includes(classification.category)"));
  assert(smartImportFn.includes("car:'analyze_car'"));
  // No place validation for Transport, mirroring Flight's own precedent (no Google Places lookup
  // for airports either) -- not requested in the frozen scope document.
  const operationsStart=smartImportFn.indexOf('analyze_car:{');
  const operationsLine=smartImportFn.slice(operationsStart,smartImportFn.indexOf('\n',operationsStart));
  assert(operationsLine.includes('allowUrl:false'));
  assert(operationsLine.includes('validatePlace:false'));
}

function test_0_7_8_merge_fields_protects_email_like_website_and_phone(){
  const adapterCommon=fs.readFileSync(new URL('../src/smart-import-adapter.js',import.meta.url),'utf8');
  assert(adapterCommon.includes("const MERGE_FIELDS=['title','provider','confirmationNumber','location','website','phone','email','startAt','endAt'];"));
}

const tests=[
  test_0_7_8_TYPE_FIELDS_car_gains_website_and_email,
  test_0_7_8_TYPE_RULES_recognizes_rail_ferry_transfer_language,
  test_0_7_8_classification_recognizes_transport_as_a_real_category,
  test_0_7_8_transportImportSchema_allows_transfer_and_other_as_honest_non_extraction_outputs,
  test_0_7_8_rental_car_maps_origin_to_location_and_startAt_endAt_from_date_time_pairs,
  test_0_7_8_rail_maps_departure_station_and_resolves_endAt_for_overnight_ferry_style_dates,
  test_0_7_8_ferry_supports_a_next_day_arrival_and_no_vehicle_carried,
  test_0_7_8_transfer_and_other_are_rejected_not_silently_turned_into_a_low_quality_proposal,
  test_0_7_8_needs_review_fields_surface_as_warnings,
  test_0_7_8_runSmartAnalysis_routes_car_through_the_transport_adapter_not_the_hotel_fallback,
  test_0_7_8_attach_source_button_reachable_for_car_items,
  test_0_7_8_updateSuggestion_captures_transportMode_and_email_for_review_edits,
  test_0_7_8_smart_import_operations_wiring,
  test_0_7_8_merge_fields_protects_email_like_website_and_phone,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.8 -- Transport Smart Import: rental car, rail, ferry/boat (${tests.length} tests). No live model API access from this environment -- these tests exercise the adapter/schema/wiring pipeline against representative fixtures grounded in the frozen field contracts, not the live model call itself, consistent with every prior Smart Import vertical's own test file. Real extraction quality against the actual TR-001-TR-006/WC-001 benchmark documents is an acceptance-session step.`);
