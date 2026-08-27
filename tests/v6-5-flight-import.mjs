import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportFlightResultToSuggestions,isFlightSegmentUsable,isSameFlightNumberAndDate,isSameFlightAcrossDirectionCandidates,mergeFlightPassengers,mergeFlightDetails,clearResolvedDirectionWarning,isSameFlightForDedup} from '../src/flight-import-adapter.js';
import {findPossibleDuplicates,reconcileStaleNeedsReview,suggestionToItem} from '../src/ingestion.js';
import {currentOperational,isItemOutsideTrip,normalizeDateRange,normalizeFlightDateString} from '../src/operational-data.js';
import {preserveTrustedFieldsOnMerge} from '../src/smart-import-adapter.js';
import {flightImportSchema,flightSystemPrompt} from '../netlify/functions/_shared/smart-import-schema.mjs';

// Every fixture below is a hand-verified transcription of the real FL-00x benchmark document at
// tests/fixtures/flight_benchmark/ -- read directly, field by field, not synthesized. It
// represents the JSON a correct extraction (per flightImportSchema/flightSystemPrompt) should
// produce for that exact source, so these tests exercise the adapter/mapping pipeline
// end-to-end against all 8 real cases. They cannot exercise the live model itself (no API
// access from this environment) -- see the chat report for what still needs a live QA pass.
const BLANK_SEGMENT_FIELDS={status:'confirmed',flightNumber:'',operatingCarrier:'',marketingCarrier:'',departureAirportCode:'',departureAirportName:'',departureTerminal:'',arrivalAirportCode:'',arrivalAirportName:'',arrivalTerminal:'',departureDate:'',departureTime:'',arrivalDate:'',arrivalTime:'',directionAmbiguous:false,directionCandidates:[],aircraftType:'',classOfService:'',fareBasis:'',duration:'',gate:'',gateOpensTime:'',gateClosesTime:'',boardingSequenceNumber:'',passengerDetails:[],evidence:'',certainty:'exact',arrivalCertainty:'exact'};
function segment(overrides){return {...BLANK_SEGMENT_FIELDS,...overrides}}
function draftResult(draft,attemptId='attempt'){return {attemptId,usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{bookingReference:'',passengers:[],segments:[],unresolved:[],explicitlyAbsent:[],warnings:[],acquisitionState:'acquired',...draft}}}

// ---------------------------------------------------------------------------------------------
// FL-001: EL AL app screenshot, outbound TLV -> BKK. LY084, 2027-01-26 22:45 -> 16:30 (same
// date, short eastward flight). One passenger visible (Paola Kohan), seat 43H, no PNR shown.
// ---------------------------------------------------------------------------------------------
function test_FL001_outbound_no_pnr_single_passenger(){
  const source={id:'src-fl001',name:'FL-001',fingerprint:'fl001'};
  const result=draftResult({
    passengers:[{name:'Paola Kohan',eTicketNumber:'',certainty:'exact'}],
    segments:[segment({flightNumber:'LY084',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30',duration:'11h 15m',passengerDetails:[{passengerName:'Paola Kohan',seat:'43H',mealRequest:'',baggage:[],certainty:'exact'}],evidence:'EL AL app, my trips'})],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert(suggestion,'a usable segment must produce a suggestion');
  assert.equal(suggestion.proposed.confirmationNumber,'','a PNR genuinely absent from the source must not be fabricated');
  assert.equal(suggestion.proposed.location,'TLV → BKK');
  assert.equal(suggestion.proposed.startAt,'2027-01-26T22:45');
  assert.equal(suggestion.proposed.endAt,'2027-01-26T16:30');
  assert.equal(suggestion.proposed.provider,'EL AL');
  assert.equal(suggestion.proposed.details.passengers[0].seat,'43H');
  assert.equal(suggestion.proposed.participants[0],'Paola Kohan');
  console.log('PASS: FL-001 outbound TLV->BKK, no PNR fabricated, seat captured');
}

// ---------------------------------------------------------------------------------------------
// FL-002: EL AL app screenshot, return HKT -> TLV. LY087, departs 2027-01-08 14:30, ARRIVES
// 2027-01-07 22:20 -- arrival date earlier than departure date (timezone crossing). Must be
// kept exactly as shown, never "corrected" or rejected.
// ---------------------------------------------------------------------------------------------
function test_FL002_timezone_crossing_arrival_before_departure(){
  const source={id:'src-fl002',name:'FL-002',fingerprint:'fl002'};
  const result=draftResult({
    passengers:[{name:'Eyal Ben Yitzhak',eTicketNumber:'',certainty:'exact'}],
    segments:[segment({flightNumber:'LY087',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'HKT',departureAirportName:'Phuket',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-08',departureTime:'14:30',arrivalDate:'2027-01-07',arrivalTime:'22:20',duration:'11h 10m',passengerDetails:[{passengerName:'Eyal Ben Yitzhak',seat:'41C',mealRequest:'',baggage:[],certainty:'exact'}],evidence:'EL AL app, my trips'})],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.startAt,'2027-01-08T14:30','departure date/time must be reported exactly as shown');
  assert.equal(suggestion.proposed.endAt,'2027-01-07T22:20','an arrival date earlier than the departure date is valid real data and must not be corrected, rejected or swapped');
  assert(suggestion.proposed.endAt.slice(0,10)<suggestion.proposed.startAt.slice(0,10),'sanity: this fixture genuinely has arrival-before-departure by date');
  console.log('PASS: FL-002 timezone-crossing arrival date (earlier than departure) preserved exactly');
}

// ---------------------------------------------------------------------------------------------
// FL-003: itinerary summary showing BOTH legs (HKT->TLV LY87, TLV->BKK LY84) in one source.
// Must split into two separate suggestions, both traceable to the same source.
// ---------------------------------------------------------------------------------------------
function test_FL003_multi_segment_split(){
  const source={id:'src-fl003',name:'FL-003',fingerprint:'fl003'};
  const result=draftResult({
    segments:[
      segment({flightNumber:'LY87',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'HKT',arrivalAirportCode:'TLV',departureDate:'2027-01-08',departureTime:'14:30',arrivalDate:'2027-01-07',arrivalTime:'22:30',classOfService:'(V) CLASSIC',duration:'11h 00m',evidence:'itinerary summary, leg 1'}),
      segment({flightNumber:'LY84',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',arrivalAirportCode:'BKK',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30',classOfService:'(L) CLASSIC',aircraftType:'787 Dreamliner',duration:'11h 15m',evidence:'itinerary summary, leg 2'}),
    ],
  });
  const suggestions=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestions.length,2,'a source describing two real segments must produce two suggestions, not one combined item');
  assert(suggestions.every(s=>s.sourceId===source.id),'every segment-derived suggestion must trace back to the same source');
  assert.equal(suggestions[0].proposed.details.flightNumber,'LY87');
  assert.equal(suggestions[1].proposed.details.flightNumber,'LY84');
  assert.equal(suggestions[1].proposed.details.aircraftType,'787 Dreamliner');
  assert.equal(suggestions[0].proposed.details.segmentCount,2);
  assert.equal(suggestions[1].proposed.details.segmentIndex,2);
  console.log('PASS: FL-003 two real segments in one source become two separate, source-linked suggestions');
}

// ---------------------------------------------------------------------------------------------
// FL-004: THAI booking confirmation, TG246 KBV->BKK, PNR EV7JXO, 5 passengers (3 adults + 2
// children), full per-passenger baggage/meal. Every passenger must be captured, not just the
// primary traveler.
// ---------------------------------------------------------------------------------------------
const FL004_PASSENGERS=[
  {name:'Eyal Ben Yitzhak',eTicketNumber:'2172349886353',meal:''},
  {name:'Paola Kohan',eTicketNumber:'2172349886354',meal:'FRUIT PLATTER MEAL'},
  {name:'Daniel Ben Yitzhak',eTicketNumber:'2172349886352',meal:''},
  {name:'Amit Ben Yitzhak',eTicketNumber:'2172349886355',meal:''},
  {name:'Ofri Ben Yitzhak',eTicketNumber:'2172349886356',meal:'CHILD MEAL'},
];
function fl004Result(){
  return draftResult({
    bookingReference:'EV7JXO',
    passengers:FL004_PASSENGERS.map(p=>({name:p.name,eTicketNumber:p.eTicketNumber,certainty:'exact'})),
    segments:[segment({flightNumber:'TG 246',operatingCarrier:'Thai Airways International',marketingCarrier:'Thai Airways International',departureAirportCode:'KBV',departureAirportName:'Krabi',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok Suvarnabhumi International Airport',departureDate:'2027-01-23',departureTime:'12:45',arrivalDate:'2027-01-23',arrivalTime:'14:10',aircraftType:'Airbus A320',classOfService:'Economy(Q)',duration:'1h 25min',evidence:'THAI booking confirmation EV7JXO',
      passengerDetails:FL004_PASSENGERS.map(p=>({passengerName:p.name,seat:'',mealRequest:p.meal,baggage:[{bagType:'checked',weight:'23 kg',included:'included'},{bagType:'carry_on',weight:'7 kg',included:'included'}],certainty:'exact'})),
    })],
  });
}
function test_FL004_five_passengers_full_booking(){
  const source={id:'src-fl004',name:'FL-004',fingerprint:'fl004'};
  const [suggestion]=smartImportFlightResultToSuggestions(fl004Result(),source);
  assert.equal(suggestion.proposed.confirmationNumber,'EV7JXO');
  assert.equal(suggestion.proposed.details.passengers.length,5,'all 5 passengers must be captured, not just the primary traveler');
  assert.deepEqual(suggestion.proposed.participants,FL004_PASSENGERS.map(p=>p.name));
  const paola=suggestion.proposed.details.passengers.find(p=>p.name==='Paola Kohan');
  assert.equal(paola.eTicketNumber,'2172349886354');
  assert.equal(paola.mealRequest,'FRUIT PLATTER MEAL');
  assert.equal(paola.baggage.find(b=>b.bagType==='checked').weight,'23 kg');
  const ofri=suggestion.proposed.details.passengers.find(p=>p.name==='Ofri Ben Yitzhak');
  assert.equal(ofri.mealRequest,'CHILD MEAL','a per-passenger field must belong to the exact passenger it is printed under, not be attached to the wrong one');
  assert.equal(suggestion.proposed.details.passengers.find(p=>p.name==='Eyal Ben Yitzhak').mealRequest,'','a passenger with no meal request in the source must show blank, not another passenger\'s meal');
  console.log('PASS: FL-004 all 5 passengers captured with correct per-passenger e-ticket/meal/baggage');
}

// ---------------------------------------------------------------------------------------------
// FL-005/FL-006: individual e-tickets for Paola and Ofri, SAME booking/flight as FL-004. Must
// dedupe against the FL-004-derived item (same PNR + same flight number) and MERGE without
// losing the other passengers -- zero duplicate final items across the companion set.
// ---------------------------------------------------------------------------------------------
function test_FL004_FL005_FL006_companion_set_dedup_and_merge(){
  const masterSuggestion=smartImportFlightResultToSuggestions(fl004Result(),{id:'src-fl004',name:'FL-004',fingerprint:'fl004'})[0];
  const item=suggestionToItem(masterSuggestion,{});
  assert.equal(item.details.passengers.length,5);

  // FL-005: Paola's individual e-ticket, richer fare-basis detail but sparser baggage (no weight
  // restated) and still no seat assignment.
  const fl005=draftResult({bookingReference:'EV7JXO',passengers:[{name:'Paola Kohan',eTicketNumber:'2172349886354',certainty:'exact'}],segments:[segment({flightNumber:'TG 246',operatingCarrier:'Thai Airways International',marketingCarrier:'Thai Airways International',departureAirportCode:'KBV',arrivalAirportCode:'BKK',departureDate:'2027-01-23',departureTime:'12:45',arrivalDate:'2027-01-23',arrivalTime:'14:10',aircraftType:'Airbus A320',classOfService:'Economy(Q)',fareBasis:'QLOFX',evidence:'THAI e-ticket EV7JXO Paola',passengerDetails:[{passengerName:'Paola Kohan',seat:'',mealRequest:'FRUIT PLATTER MEAL',baggage:[{bagType:'checked',weight:'',included:'included'}],certainty:'exact'}]})]});
  const fl005Suggestion=smartImportFlightResultToSuggestions(fl005,{id:'src-fl005',name:'FL-005',fingerprint:'fl005'})[0];

  assert.equal(findPossibleDuplicates(fl005Suggestion,[item],[]).length,1,'FL-005 (same PNR + same flight number as the FL-004-derived item) must be recognized as a duplicate/companion, not create a second item');

  const merged=suggestionToItem(fl005Suggestion,item);
  assert.equal(merged.details.passengers.length,5,'merging a single-passenger companion e-ticket must never drop the other 4 passengers already on the item');
  const mergedPaola=merged.details.passengers.find(p=>p.name==='Paola Kohan');
  assert.equal(mergedPaola.baggage.find(b=>b.bagType==='checked').weight,'23 kg','the existing, more detailed baggage weight must be kept rather than overwritten by the companion ticket\'s sparser baggage entry');
  assert.equal(mergedPaola.mealRequest,'FRUIT PLATTER MEAL');

  // FL-006: Ofri's individual e-ticket, same pattern.
  const fl006=draftResult({bookingReference:'EV7JXO',passengers:[{name:'Ofri Ben Yitzhak',eTicketNumber:'2172349886356',certainty:'exact'}],segments:[segment({flightNumber:'TG 246',operatingCarrier:'Thai Airways International',marketingCarrier:'Thai Airways International',departureAirportCode:'KBV',arrivalAirportCode:'BKK',departureDate:'2027-01-23',departureTime:'12:45',arrivalDate:'2027-01-23',arrivalTime:'14:10',fareBasis:'QLOFX/CH',evidence:'THAI e-ticket EV7JXO Ofri',passengerDetails:[{passengerName:'Ofri Ben Yitzhak',seat:'',mealRequest:'CHILD MEAL',baggage:[],certainty:'exact'}]})]});
  const fl006Suggestion=smartImportFlightResultToSuggestions(fl006,{id:'src-fl006',name:'FL-006',fingerprint:'fl006'})[0];
  assert.equal(findPossibleDuplicates(fl006Suggestion,[merged],[]).length,1);
  const mergedAgain=suggestionToItem(fl006Suggestion,merged);
  assert.equal(mergedAgain.details.passengers.length,5,'merging the second companion e-ticket must still keep all 5 passengers -- zero duplicate items, zero lost passengers');

  console.log('PASS: FL-004/FL-005/FL-006 companion set dedupes to one item and merges without ever losing a passenger');
}

// A hypothetical outbound+return sharing one PNR must NOT be deduped against each other --
// only the specific same flight number (or date) counts as the same flight.
function test_shared_pnr_different_flights_are_not_deduped(){
  const outbound={type:'flight',confirmationNumber:'ABC123',startAt:'2027-01-10T10:00',details:{flightNumber:'LY001'}};
  const returnLeg={type:'flight',confirmationNumber:'ABC123',startAt:'2027-01-20T10:00',details:{flightNumber:'LY002'}};
  assert.equal(isSameFlightForDedup(returnLeg,outbound),false,'a shared PNR alone must not flag two genuinely different flights (different flight number and date) as duplicates');
  console.log('PASS: a shared PNR alone does not dedupe two different flight numbers/dates against each other');
}

// ---------------------------------------------------------------------------------------------
// FL-007: wildcard. Flight #1 is explicitly VOID and must never become an item. Flight #2
// (ISRAIR ATH->TLV) is real and must be captured, including its baggage-inclusion matrix and a
// genuinely obscured field left as needs_review rather than guessed.
// ---------------------------------------------------------------------------------------------
function test_FL007_void_segment_skipped_and_wildcard_captured(){
  const source={id:'src-fl007',name:'FL-007',fingerprint:'fl007'};
  const voidSegment=segment({status:'void'});
  assert.equal(isFlightSegmentUsable(voidSegment),false,'an explicitly VOID segment must never be usable');
  const result=draftResult({
    bookingReference:'1172207',
    passengers:[],
    segments:[
      voidSegment,
      segment({flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',departureAirportCode:'ATH',departureAirportName:'Athens',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2025-08-25',departureTime:'',arrivalDate:'2025-08-25',arrivalTime:'',certainty:'needs_review',arrivalCertainty:'needs_review',evidence:'ISRAIR baggage matrix, times obscured by UI overlay',
        passengerDetails:[{passengerName:'',seat:'',mealRequest:'',certainty:'needs_review',baggage:[{bagType:'carry_on',weight:'3 kg',included:'included'},{bagType:'checked',weight:'23 kg',included:'not_included'},{bagType:'trolley',weight:'10 kg',included:'included'}]}],
      }),
    ],
  });
  const suggestions=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestions.length,1,'the VOID segment must never become an item; only the real ISRAIR segment does');
  const [suggestion]=suggestions;
  assert.equal(suggestion.proposed.details.flightNumber,'6H568');
  assert.equal(suggestion.proposed.location,'ATH → TLV');
  const baggage=suggestion.proposed.details.passengers[0].baggage;
  assert.equal(baggage.find(b=>b.bagType==='carry_on').included,'included');
  assert.equal(baggage.find(b=>b.bagType==='checked').included,'not_included','a checked bag explicitly marked X/not-included must be reported as not_included, not silently included');
  assert.equal(baggage.find(b=>b.bagType==='trolley').included,'included');
  assert(suggestion.warnings.some(warning=>warning.includes('VOID')||warning.includes('מקטע')),'a warning must note that a VOID/invalid segment from this source was skipped, not silently dropped with no trace');
  assert(suggestion.proposed.details.needsReviewFields?.length>0,'a genuinely obscured field (departure/arrival time hidden by the UI zoom control) must be surfaced as needs_review, not guessed');
  console.log('PASS: FL-007 VOID segment skipped and flagged, real ISRAIR segment captured with its baggage-inclusion matrix and an honest needs_review for the obscured time');
}

// ---------------------------------------------------------------------------------------------
// FL-008: EL AL boarding pass, LY2373 TLV->BER. Gate/boarding-sequence/terminal fields that ARE
// present must be captured; arrival date/time and PNR are genuinely absent from a boarding pass
// and must stay blank rather than being fabricated.
// ---------------------------------------------------------------------------------------------
function test_FL008_boarding_pass_gate_and_boarding_sequence(){
  const source={id:'src-fl008',name:'FL-008',fingerprint:'fl008'};
  const result=draftResult({
    passengers:[{name:'Ben Yitzhak Eyal',eTicketNumber:'TL11287389',certainty:'exact'}],
    segments:[segment({flightNumber:'LY2373',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',arrivalAirportCode:'BER',departureTerminal:'3',departureDate:'2025-09-16',departureTime:'17:30',classOfService:'Economy CLSC',gate:'',gateOpensTime:'16:50',gateClosesTime:'17:15',boardingSequenceNumber:'0090',evidence:'EL AL boarding pass',
      passengerDetails:[{passengerName:'Ben Yitzhak Eyal',seat:'38H',mealRequest:'',baggage:[],certainty:'exact'}],
    })],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.confirmationNumber,'','a PNR not shown on a boarding pass must not be fabricated');
  assert.equal(suggestion.proposed.endAt,'','an arrival date/time not shown on a boarding pass must stay blank, not guessed');
  assert.equal(suggestion.proposed.details.departureAirport.terminal,'3');
  assert.equal(suggestion.proposed.details.gateOpensAt,'16:50');
  assert.equal(suggestion.proposed.details.gateClosesAt,'17:15');
  assert.equal(suggestion.proposed.details.boardingSequenceNumber,'0090');
  assert.equal(suggestion.proposed.details.passengers[0].seat,'38H');
  console.log('PASS: FL-008 boarding pass gate/terminal/boarding-sequence captured; absent PNR and arrival time left blank, not fabricated');
}

// ---------------------------------------------------------------------------------------------
// Cross-cutting acceptance criteria
// ---------------------------------------------------------------------------------------------
function test_no_omission_blockers_flagged_when_missing(){
  const source={id:'src-blockers',name:'blockers',fingerprint:'x'};
  const result=draftResult({segments:[segment({flightNumber:'',departureAirportCode:'TLV',arrivalAirportCode:'BKK',departureDate:'2027-01-01',departureTime:'10:00',arrivalDate:'2027-01-01',arrivalTime:'20:00',evidence:'x'})]});
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert(suggestion.warnings.some(w=>w.includes('flightNumber')),'a missing no-omission-blocker field must be visibly flagged, not silently absent with no trace');
  console.log('PASS: a missing no-omission-blocker field is flagged with a visible warning');
}
function test_evidence_visible_for_every_proposed_value(){
  const [suggestion]=smartImportFlightResultToSuggestions(fl004Result(),{id:'src-ev',name:'ev',fingerprint:'ev'});
  const fields=suggestion.proposed.details.smartImportFields;
  assert(fields.length>10,'a rich multi-passenger segment must produce many individually evidenced fields, not one opaque blob');
  assert(fields.every(field=>field.evidence&&field.label&&field.rawValue),'every proposed value exposed in the evidence panel must carry a label, a value and an evidence citation');
  assert(fields.some(field=>field.key.startsWith('passenger:')),'per-passenger values (seat/meal/baggage) must each be their own evidenced row, not collapsed into the segment-level fields');
  console.log('PASS: every proposed value (segment-level and per-passenger) is exposed with visible evidence');
}
function test_flight_schema_and_prompt_shape(){
  assert.equal(flightImportSchema.type,'object');
  assert(flightImportSchema.properties.segments,'the schema must support multiple segments per source');
  assert.equal(flightImportSchema.properties.segments.items.properties.status.enum.includes('void'),true,'the schema must let the model mark a segment void rather than inventing values for it');
  assert(flightImportSchema.properties.segments.items.properties.passengerDetails,'the schema must support a per-passenger breakdown within each segment');
  assert(/timezone|International Date Line|earlier than the departure/i.test(flightSystemPrompt),'the prompt must explicitly tell the model that an arrival date before the departure date is valid, not an error to correct');
  assert(/never.*fabricat|do not fabricate/i.test(flightSystemPrompt));
  assert(/every passenger|Never collapse multiple passengers/i.test(flightSystemPrompt));
  console.log('PASS: the flight schema/prompt shape supports multi-segment, multi-passenger, VOID-marking and timezone-crossing dates');
}
function test_no_public_flight_url_source(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/analyze_flight:\{[^}]*allowUrl:false/,'Flight Smart Import must not accept a public-URL source (out of scope for 0.6.5)');
  assert.match(server,/analyze_hotel:\{[^}]*allowUrl:true/,'Hotel Smart Import must keep accepting a public-URL source (unchanged from 0.6.x)');
  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert.match(client,/analyzeFlightSource\(\{trip,source,file\}\)/,'the Flight client function must not accept a url parameter');
  console.log('PASS: no public Flight URL source is accepted, client or server side');
}

test_FL001_outbound_no_pnr_single_passenger();
test_FL002_timezone_crossing_arrival_before_departure();
test_FL003_multi_segment_split();
test_FL004_five_passengers_full_booking();
test_FL004_FL005_FL006_companion_set_dedup_and_merge();
test_shared_pnr_different_flights_are_not_deduped();
test_FL007_void_segment_skipped_and_wildcard_captured();
test_FL008_boarding_pass_gate_and_boarding_sequence();
test_no_omission_blockers_flagged_when_missing();
test_evidence_visible_for_every_proposed_value();
test_flight_schema_and_prompt_shape();
test_no_public_flight_url_source();

// ===============================================================================================
// Live-QA fix pass: V6-F25-V6-F30, found testing all 8 real documents against the live model
// (the fixtures above use hand-verified extraction shapes and therefore could not catch these --
// they are exactly the class of bug a fixture-only suite structurally cannot see).
// ===============================================================================================

// --- V6-F26 (data-corruption, highest priority): normalizeDateRange's force-equalize silently
// destroyed a Flight's legitimate arrival date/time whenever it was "before" departure --
// FL-002's genuine timezone-crossing case, and routinely even a same-day flight whose arrival
// clock-time is numerically smaller than its departure clock-time. ---
function test_V6_F26_flight_end_before_start_not_force_equalized(){
  const timezoneCrossing=normalizeDateRange('2027-01-08T14:30','2027-01-07T22:20',{allowEndBeforeStart:true});
  assert.equal(timezoneCrossing.end,'2027-01-07T22:20','a Flight\'s arrival date/time earlier than departure must be preserved exactly, not forced to equal the departure value');

  const sameDayLateNight=normalizeDateRange('2027-01-26T22:45','2027-01-26T16:30',{allowEndBeforeStart:true});
  assert.equal(sameDayLateNight.end,'2027-01-26T16:30','a same-day flight whose arrival clock-time is numerically earlier than departure must also be preserved, not just the date-crossing case');

  // The old, unconditional behavior must still protect a Hotel checkout from a real input
  // mistake -- allowEndBeforeStart defaults to false, so nothing about Hotel/Car changes.
  const hotelMistake=normalizeDateRange('2027-06-10T12:00','2027-06-05T12:00');
  assert.equal(hotelMistake.end,'2027-06-10T12:00','without allowEndBeforeStart, end-before-start must still be corrected -- this is a real error for a Hotel checkout, unlike a Flight');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  const ingestionSrc=fs.readFileSync(new URL('../src/ingestion.js',import.meta.url),'utf8');
  assert.match(app,/normalizeDateRange\(data\.get\('startAt'\),data\.get\('endAt'\),\{allowEndBeforeStart:type==='flight'\}\)/,'the suggestion-review submit handler must pass allowEndBeforeStart for a flight');
  assert.match(ingestionSrc,/normalizeDateRange\(data\.get\('startAt'\),data\.get\('endAt'\),\{allowEndBeforeStart:type==='flight'\}\)/,'the manual-create/edit-item submit path must also pass allowEndBeforeStart for a flight');
  assert.match(app,/isFlight=form\?\.elements\?\.namedItem\('type'\)\?\.value==='flight'/,'the live startAt->endAt clamp while typing must also recognize a flight form and not force-equalize it');

  console.log('PASS: V6-F26 a Flight\'s legitimate end-before-start dates are never force-equalized, while Hotel/Car end-before-start is still corrected');
}
test_V6_F26_flight_end_before_start_not_force_equalized();

// --- V6-F25/F27/F28: departureDate/arrivalDate is a free-text field in the schema, not
// constrained to a wire format -- a source's own display convention (THAI's "Sat, 23 Jan 2027",
// a day-first numeric date) came back unconverted and was silently rejected by a strict
// YYYY-MM-DD check, going blank even though the raw text was correct and visible in the
// evidence panel the whole time. ---
function test_V6_F25_F27_F28_non_canonical_date_formats_normalized(){
  assert.equal(normalizeFlightDateString('Sat, 23 Jan 2027'),'2027-01-23','the exact THAI e-ticket date format (FL-004/005/006) must normalize to canonical form, not go blank');
  assert.equal(normalizeFlightDateString('23 Jan 2027'),'2027-01-23');
  assert.equal(normalizeFlightDateString('26/01/2027'),'2027-01-26','a day-first numeric date must also normalize');
  assert.equal(normalizeFlightDateString('2027-01-23'),'2027-01-23','an already-canonical date must pass through unchanged');
  assert.equal(normalizeFlightDateString('not a date'),'','text that genuinely isn\'t a date must still be rejected, not guessed');
  assert.equal(normalizeFlightDateString('2027-13-40'),'','a shape-valid but impossible date must still be rejected');

  const source={id:'src-thai-format',name:'thai',fingerprint:'thai'};
  const result=draftResult({bookingReference:'EV7JXO',segments:[segment({flightNumber:'TG 246',operatingCarrier:'Thai Airways International',marketingCarrier:'Thai Airways International',departureAirportCode:'KBV',arrivalAirportCode:'BKK',departureDate:'Sat, 23 Jan 2027',departureTime:'12:45',arrivalDate:'Sat, 23 Jan 2027',arrivalTime:'14:10',evidence:'THAI e-ticket, unconverted source date format'})]});
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.startAt,'2027-01-23T12:45','the date must reach the saved field even when the raw extraction used the source\'s own display format instead of YYYY-MM-DD');
  assert.equal(suggestion.proposed.endAt,'2027-01-23T14:10');

  assert.match(flightSystemPrompt,/YYYY-MM-DD/,'the prompt must explicitly require the canonical date format, not leave it to the model\'s own convention');
  console.log('PASS: V6-F25/F27/F28 a non-canonical source date format (e.g. "Sat, 23 Jan 2027") is normalized instead of silently producing a blank date');
}
test_V6_F25_F27_F28_non_canonical_date_formats_normalized();

// --- V6-F25: a passenger present in the top-level roster under one name presentation but in
// this segment's passengerDetails under another (a source literally printed "KOHAN PAOLA MRS
// (ADT)", last-name-first with a title) was not matched -- the seat the source clearly showed
// silently never reached that passenger. ---
function test_V6_F25_passenger_name_order_and_title_mismatch_still_matches(){
  const source={id:'src-name-mismatch',name:'name-mismatch',fingerprint:'nm'};
  const result=draftResult({
    passengers:[{name:'Paola Kohan',eTicketNumber:'',certainty:'exact'}],
    segments:[segment({flightNumber:'LY084',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',arrivalAirportCode:'BKK',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30',evidence:'EL AL app',
      passengerDetails:[{passengerName:'KOHAN PAOLA MRS (ADT)',seat:'43H',mealRequest:'',baggage:[],certainty:'exact'}],
    })],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.details.passengers.length,1);
  assert.equal(suggestion.proposed.details.passengers[0].seat,'43H','the seat must be matched to the passenger despite the last-name-first, title-suffixed presentation in passengerDetails differing from the top-level roster\'s "Paola Kohan"');
  console.log('PASS: V6-F25 a passenger is matched across a first/last-name-order and title-suffix mismatch, so seat/meal/baggage are never silently lost');
}
test_V6_F25_passenger_name_order_and_title_mismatch_still_matches();

// --- V6-F25: the compact list-row date format now shows the year for a date outside the
// current year (a Flight is routinely booked far enough ahead to cross one), instead of always
// omitting it. ---
function test_V6_F25_year_shown_for_out_of_current_year_dates(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/showYear=date\.getFullYear\(\)!==new Date\(\)\.getFullYear\(\)/,'the compact date format must show the year whenever the date is not in the current year');
  console.log('PASS: V6-F25 the compact date display includes the year for a date outside the current year');
}
test_V6_F25_year_shown_for_out_of_current_year_dates();

// --- V6-F29: FL-008 (a clean, fully legible boarding pass) produced a false "no valid flight
// segment" alert. A boarding pass normally shows no arrival date/time at all -- the old prompt
// wording ("has no readable A, B, C, D or E at all") could be misread as "missing even one of
// these" rather than "missing every one of these", over-voiding a segment that is actually fine.
// isFlightSegmentUsable() itself was already correct (any one blocker present is enough); this
// closes the prompt-wording gap that could cause the model to mark such a segment void anyway. ---
function test_V6_F29_partial_segment_not_treated_as_void(){
  const boardingPassLikeSegment=segment({flightNumber:'LY2373',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',arrivalAirportCode:'BER',departureDate:'2025-09-16',departureTime:'17:30',arrivalDate:'',arrivalTime:'',status:'confirmed'});
  assert.equal(isFlightSegmentUsable(boardingPassLikeSegment),true,'a segment with 4 of 5 no-omission-blockers present (everything but arrival date/time, normal for a boarding pass) must be usable, not void');

  assert.doesNotMatch(flightSystemPrompt,/has no readable flight number, departure airport, arrival airport, departure date\/time or arrival date\/time at all must be returned/,'the old, ambiguous VOID wording ("no readable A, B, C, D or E at all") must be gone');
  assert.match(flightSystemPrompt,/NONE of/,'the prompt must explicitly say ALL five fields must be missing before a segment is void');
  assert.match(flightSystemPrompt,/boarding pass, which normally shows no arrival date\/time/,'the prompt must give the boarding-pass case as an explicit example of a segment that is confirmed despite a missing field, not void');
  console.log('PASS: V6-F29 a segment missing only some fields (e.g. a boarding pass\' arrival date/time) is never treated as void');
}
test_V6_F29_partial_segment_not_treated_as_void();

// --- V6-F30: FL-003's two segments matched real flights already represented by the FL-001/
// FL-002 items, but no PNR is shown on any of these three EL AL sources -- reconciliation must
// not depend on one. Flight-number formatting also differs across sources ("LY084" vs "LY84"). ---
function test_V6_F30_cross_source_dedup_without_shared_pnr(){
  const existingFromFL001={id:'item-fl001',type:'flight',title:'LY084 TLV → BKK',confirmationNumber:'',provider:'EL AL',startAt:'2027-01-26T22:45',endAt:'2027-01-26T16:30',details:{flightNumber:'LY084'}};
  const proposedFromFL003Leg2={type:'flight',title:'LY84 TLV → BKK',confirmationNumber:'',provider:'EL AL',startAt:'2027-01-26T22:45',endAt:'2027-01-26T16:30',details:{flightNumber:'LY84'}};

  assert.equal(isSameFlightNumberAndDate(proposedFromFL003Leg2,existingFromFL001),true,'"LY84" and "LY084" (a leading-zero formatting difference between sources) on the same date must be recognized as the same flight');
  assert.equal(findPossibleDuplicates({proposed:proposedFromFL003Leg2,sourceId:'src-fl003'},[existingFromFL001],[]).length,1,'findPossibleDuplicates must catch this without either source ever having a booking reference');

  const genuinelyDifferentFlight={id:'item-other',type:'flight',title:'LY200 TLV → LHR',confirmationNumber:'',provider:'EL AL',startAt:'2027-01-26T09:00',endAt:'2027-01-26T13:00',details:{flightNumber:'LY200'}};
  assert.equal(isSameFlightNumberAndDate(proposedFromFL003Leg2,genuinelyDifferentFlight),false,'a different flight number on the same date must not be conflated as a duplicate');

  console.log('PASS: V6-F30 cross-source reconciliation matches on flight number (leading-zero-tolerant) + date even with no shared PNR on either source');
}
test_V6_F30_cross_source_dedup_without_shared_pnr();

// --- Regression guard: PNR-based matching (FL-004/FL-005/FL-006) must keep working exactly as
// before -- this fallback is additive, not a replacement. ---
function test_V6_F30_pnr_based_matching_still_works_unchanged(){
  const item={id:'item-pnr',type:'flight',confirmationNumber:'EV7JXO',provider:'Thai Airways International',startAt:'2027-01-23T12:45',endAt:'2027-01-23T14:10',details:{flightNumber:'TG246'}};
  const companion={proposed:{type:'flight',confirmationNumber:'EV7JXO',provider:'Thai Airways International',startAt:'2027-01-23T12:45',endAt:'2027-01-23T14:10',details:{flightNumber:'TG 246'}},sourceId:'src-fl005'};
  assert.equal(findPossibleDuplicates(companion,[item],[]).length,1,'PNR-based dedup for the FL-004/005/006 companion set must still work unchanged after adding the flight-number/date fallback');
  console.log('PASS: PNR-based dedup/merge (FL-004/FL-005/FL-006) is unaffected by the new fallback');
}
test_V6_F30_pnr_based_matching_still_works_unchanged();

// --- UX change: the manual Hotel/Flight picker is gone; the app auto-detects category from
// content via one classification call, then routes to the matching extraction -- the same
// pattern already used to distinguish VOID vs. real segments. ---
function test_ux_category_picker_removed_and_auto_detected(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/SMART_IMPORT_CATEGORIES/,'the manual category-picker fieldset must be fully removed from the Add flow');
  assert.doesNotMatch(app,/name="smart-category"/,'no smart-category radio input may remain in the rendered form');
  assert.match(app,/await analyzeSource\(\{trip:state\.trip,source,file\}\)/,'a brand-new source (no target item yet) must go through the auto-detecting analyzeSource, not a pre-chosen category');
  assert.match(app,/category===\s*'unrecognized'/,'an unrecognized document must be handled with a clear message, not a raw/false "no valid flight segment" error');

  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert.match(client,/operation:'analyze_source'/,'the client must call the new analyze_source operation for auto-detection');

  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/body\.operation==='analyze_source'/,'the server must handle analyze_source: classify first, then run the matching extraction');
  assert.match(server,/classificationSystemPrompt/,'the server must use a dedicated classification prompt before extraction');

  console.log('PASS: the manual Hotel/Flight picker is removed; category is auto-detected from content via one classification call before extraction, the same pattern as VOID-segment detection');
}
test_ux_category_picker_removed_and_auto_detected();

// --- UX change: attach-and-extract on an EXISTING item still calls the category-specific
// analyze function directly (the item's own type is already certain), avoiding a pointless
// extra classification call -- this must not regress alongside the create-flow auto-detect. ---
function test_ux_attach_and_extract_still_uses_known_category(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/targetItem\.type==='flight'\?analyzeFlightSource\(\{trip:state\.trip,source,file\}\):analyzeHotelSource\(\{trip:state\.trip,source,file\}\)/,'attach-and-extract must still call the known-category analyze function directly, not re-classify a source whose target item type is already known');
  console.log('PASS: attach-and-extract still uses the already-known target item category directly, without an unnecessary classification call');
}
test_ux_attach_and_extract_still_uses_known_category();

// --- UX change: PDF/Picture merged into one "Document" option; camera/gallery/file choice is
// left to the OS via a broad-accept file input with no forced capture attribute. JSON stays its
// own separate top-level option (a different, non-AI, schema-validated code path). ---
function test_ux_document_option_merges_pdf_and_photo(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/choices=\[\['manual','[^']*'\],\['document','[^']*'\],\['link','[^']*'\],\['json','[^']*'\],\['qr','[^']*'\]\]/,'the top-level Add options must be exactly Manual / Document / Link / QR / JSON, in that order -- PDF and Picture are no longer separate options there (attachmentModal, the per-item "add document" screen, got the same merge separately in fix pass 4 / V6-F38, see test_V6_F38_attachment_modal_merges_pdf_and_photo)');

  const documentInputMatch=app.match(/<input id="source-file" type="file" accept="application\/pdf,\.pdf,image\/png,image\/jpeg,image\/webp">/);
  assert(documentInputMatch,'the Document option must accept both PDF and image mime types in one input');
  assert(!/capture="environment"/.test(documentInputMatch[0]),'the Document input must not force a capture attribute -- letting the OS present its native camera/gallery/file choice is what "choose camera, gallery, or file as before" means here');

  assert.match(app,/kind==='document'&&!isPdf&&!isImage/,'validateSmartSource must accept a Document source as either a PDF or an image');
  console.log('PASS: PDF and Picture are merged into one Document option (camera/gallery/file left to the OS), JSON remains its own separate top-level option');
}
test_ux_document_option_merges_pdf_and_photo();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import regression suite (8/8 benchmark cases)');

// ===============================================================================================
// Second live-QA fix pass: V6-F31/F32/F33, plus a small Today-page addition. Found retesting all
// 8 real documents against the live model on top of the first fix pass -- again the exact class
// of bug a fixture-only suite structurally cannot catch on its own (a live-model misreading, and
// a merge-path regression the first pass's own fix exposed).
// ===============================================================================================

// --- V6-F32 (highest priority): on a two-leg EL AL itinerary screenshot (and even a standalone
// one), departure/arrival airport AND their paired date/time came back fully transposed at
// extraction -- the segment's own evidence text asserted the wrong direction, so this is a
// live-model misreading, not an adapter/mapping bug (dateTime() just passes through whatever
// departureDate/arrivalDate the model returned -- see flight-import-adapter.js). The only lever
// available for a live-model failure like this is the prompt; this locks in that the specific
// guidance requested is present. ---
// Fix pass 3 revised this: two days of live retesting showed the same unchanged FL-002 source
// producing three different outcomes (correct, confidently wrong with a hallucinated "explicit
// label" claim, and a refusal) across separate runs, and a filename-bias hypothesis was tested
// and ruled out -- this source genuinely has no explicit direction signal, so no amount of prompt
// wording can make the model "correctly guess" it deterministically. The fix pass 2 prompt's
// self-check instruction ("re-verify... not swapped") assumed a correct guess was achievable and
// has been removed; it is superseded by directionAmbiguous/directionCandidates below, which asks
// the model to surface genuine ambiguity instead of resolving it one way or another.
function test_V6_F32_prompt_guards_against_transposed_direction(){
  assert.match(flightSystemPrompt,/own explicit departure\/arrival labels/i,'the prompt must tell the model to determine direction from each flight\'s own explicit labels, not screen position');
  assert.match(flightSystemPrompt,/right-to-left \(Hebrew\) app layout/i,'the prompt must explicitly call out that an RTL layout does not place departure before arrival in left-to-right visual order -- the specific failure mode reported for the EL AL app');
  assert.match(flightSystemPrompt,/never combine an airport or date\/time that visually belongs to one leg with a value that belongs to a different leg/i,'the prompt must explicitly forbid mixing a value from one leg into another leg\'s departure/arrival group');
  assert.match(flightSystemPrompt,/do not assume the first leg shown on the screen is the earlier-departing one/i,'the prompt must warn against inferring a two-leg itinerary\'s leg order from screen position');
  assert.doesNotMatch(flightSystemPrompt,/re-verify that its departureAirportCode/i,'fix pass 3: the fix-pass-2 self-check instruction assumed a single correct guess was achievable and is now superseded by directionAmbiguous -- retesting showed it doesn\'t make the guess deterministic, so it should no longer be asked for');
  console.log('PASS: V6-F32 the prompt still guards against transposed direction where it IS determinable (RTL layout, multi-leg itinerary, cross-leg value mixing), and no longer asks for an unachievable deterministic self-check');
}
test_V6_F32_prompt_guards_against_transposed_direction();

// --- Revised V6-F32 strategy (fix pass 3): a genuinely ambiguous source must never get a single
// guessed direction (or a refusal to populate) written into it -- the model instead reports
// directionAmbiguous + both candidate readings, and the app presents them to the Product Owner
// as a pickable needs-review item (the frozen source-relative completeness/evidence contract:
// unreadable/ambiguous/conflicting values stay visible as unresolved/needs-review, never
// silently guessed or dropped). ---
function test_V6_F32_ambiguous_source_produces_needs_review_direction_candidates(){
  const source={id:'src-fl002-ambiguous',name:'FL-002',fingerprint:'fl002amb'};
  const result=draftResult({
    segments:[segment({
      flightNumber:'LY087',operatingCarrier:'EL AL',marketingCarrier:'EL AL',
      directionAmbiguous:true,
      directionCandidates:[
        {departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'HKT',arrivalAirportName:'Phuket',departureDate:'2027-01-08',departureTime:'14:30',arrivalDate:'2027-01-07',arrivalTime:'22:20'},
        {departureAirportCode:'HKT',departureAirportName:'Phuket',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-07',departureTime:'22:20',arrivalDate:'2027-01-08',arrivalTime:'14:30'},
      ],
      duration:'11h 10m',evidence:'EL AL app, my trips -- no explicit departure/arrival label on this screen',
    })],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert(suggestion,'an ambiguous-but-otherwise-real segment must still produce a suggestion, not be dropped');
  assert.equal(suggestion.proposed.location,'','the route must stay blank rather than writing in a guessed direction');
  assert.equal(suggestion.proposed.startAt,'','startAt must stay blank rather than writing in one guessed candidate\'s date/time');
  assert.equal(suggestion.proposed.endAt,'');
  const candidates=suggestion.proposed.details.directionCandidates;
  assert.equal(candidates.length,2,'both candidate readings must be exposed for the Product Owner to pick between');
  assert.equal(candidates[0].label,'TLV → HKT');
  assert.equal(candidates[0].startAt,'2027-01-08T14:30');
  assert.equal(candidates[0].endAt,'2027-01-07T22:20');
  assert.equal(candidates[1].label,'HKT → TLV');
  assert.equal(candidates[1].startAt,'2027-01-07T22:20');
  assert.equal(candidates[1].endAt,'2027-01-08T14:30');
  assert(suggestion.warnings.some(w=>w.includes('כיוון הטיסה')),'a visible warning must invite the Product Owner to resolve the direction, not silently leave it blank with no explanation');
  assert(!suggestion.warnings.some(w=>w.includes('שדות חובה חסרים')&&w.includes('departureAirportCode')),'the direction-dependent fields must not ALSO be reported as "missing from the source" -- the data is present, just ambiguous, and the direction warning already says so');
  assert.equal(isFlightSegmentUsable(result.draft.segments[0]),true,'an ambiguous segment with real candidate data must still count as a usable segment, not be dropped as empty');

  assert.equal(flightImportSchema.properties.segments.items.properties.directionAmbiguous.type,'boolean','the schema must let the model flag genuine direction ambiguity');
  assert(flightImportSchema.properties.segments.items.properties.directionCandidates,'the schema must let the model report both candidate readings for an ambiguous segment');
  assert(flightImportSchema.properties.segments.items.required.includes('directionAmbiguous'));
  assert(flightImportSchema.properties.segments.items.required.includes('directionCandidates'));
  assert.match(flightSystemPrompt,/set directionAmbiguous to true/,'the prompt must instruct the model to use the ambiguity flag instead of guessing');
  assert.match(flightSystemPrompt,/populate directionCandidates with exactly the two readings/,'the prompt must instruct the model to report both candidate readings, not one guessed reading');
  assert.match(flightSystemPrompt,/instead of asserting a single guessed direction or refusing to populate the segment/,'the prompt must explicitly rule out both a guess and a refusal, which is exactly the non-deterministic behavior retesting found');

  console.log('PASS: revised V6-F32 an ambiguous source produces a needs-review item with both candidate readings instead of a guess, and the schema/prompt support it');
}
test_V6_F32_ambiguous_source_produces_needs_review_direction_candidates();

// --- V6-F34: direction ambiguity (or any other coarse segment-level read-quality note) must
// never withhold or downgrade a field that has no logical dependency on it. Live retesting found
// seat/baggage coming back blank on an ambiguous-direction segment with evidence citing
// "direction not explicit" as the reason, even though seat/baggage have no relationship to
// departure/arrival direction at all. ---
function test_V6_F34_unrelated_fields_populate_despite_direction_ambiguity(){
  const source={id:'src-fl001-ambiguous',name:'FL-001',fingerprint:'fl001amb'};
  const result=draftResult({
    passengers:[{name:'Paola Kohan',eTicketNumber:'',certainty:'exact'}],
    segments:[segment({
      flightNumber:'LY084',operatingCarrier:'EL AL',marketingCarrier:'EL AL',aircraftType:'737-900',classOfService:'Economy',duration:'11h 15m',
      directionAmbiguous:true,
      directionCandidates:[
        {departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30'},
        {departureAirportCode:'BKK',departureAirportName:'Bangkok',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-26',departureTime:'16:30',arrivalDate:'2027-01-26',arrivalTime:'22:45'},
      ],
      passengerDetails:[{passengerName:'Paola Kohan',seat:'43H',mealRequest:'',baggage:[{bagType:'checked',weight:'23 kg',included:'included'}],certainty:'exact'}],
      evidence:'EL AL app, my trips',
    })],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.details.flightNumber,'LY084','flightNumber has no dependency on direction and must still populate');
  assert.equal(suggestion.proposed.details.aircraftType,'737-900');
  assert.equal(suggestion.proposed.details.classOfService,'Economy');
  assert.equal(suggestion.proposed.details.duration,'11h 15m');
  assert.equal(suggestion.proposed.details.passengers[0].seat,'43H','seat has no dependency on direction and must still populate, even though direction itself is ambiguous on this same segment');
  assert.equal(suggestion.proposed.details.passengers[0].baggage[0].weight,'23 kg','baggage has no dependency on direction and must still populate');
  assert.equal(suggestion.proposed.participants[0],'Paola Kohan');

  const flightNumberField=suggestion.proposed.details.smartImportFields.find(f=>f.key==='flightNumber');
  assert.equal(flightNumberField.certainty,'exact','flightNumber\'s own evidence certainty must not be downgraded just because a DIFFERENT field on the same segment (direction) is ambiguous');
  const seatField=suggestion.proposed.details.smartImportFields.find(f=>f.key.endsWith(':seat'));
  assert.equal(seatField.certainty,'exact','seat\'s own evidence certainty must not be downgraded by an unrelated field\'s ambiguity either');

  console.log('PASS: V6-F34 fields with no logical dependency on direction (flightNumber, aircraft, class, duration, seat, baggage) populate normally on a segment whose direction is ambiguous');
}
test_V6_F34_unrelated_fields_populate_despite_direction_ambiguity();

// --- V6-F34: the underlying design flaw was a single shared segment.certainty fallback that
// every field's evidence-certainty inherited when not given its own -- so ANY coarse read-quality
// note (not just direction, now handled separately) could make an unrelated, fully-present value
// look suspect. Only departureDateTime is genuinely tied to certainty's read-quality concern
// (FL-007's "times obscured by UI overlay" case); everything else, INCLUDING departureAirport
// (further refined in fix pass 6 -- see V6-F35 root cause #2: airport identity is a separate
// concern from date/time validity, even on the same side), needs the WHOLE segment marked
// unreadable before its certainty gets pulled down. ---
function test_V6_F34_coarse_segment_certainty_no_longer_downgrades_unrelated_fields(){
  const source={id:'src-coarse-certainty',name:'coarse',fingerprint:'coarse'};
  const result=draftResult({
    segments:[segment({
      flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',
      departureAirportCode:'ATH',arrivalAirportCode:'TLV',departureDate:'2025-08-25',departureTime:'',arrivalDate:'2025-08-25',arrivalTime:'',
      certainty:'needs_review',evidence:'times obscured by UI overlay, unrelated to flight number/aircraft which are clearly printed',
    })],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  const fields=suggestion.proposed.details.smartImportFields;
  assert.equal(fields.find(f=>f.key==='flightNumber').certainty,'exact','flightNumber must default to exact certainty even when the segment carries a coarse needs_review, since obscured TIMES have no bearing on how legible the flight number is');
  assert.equal(fields.find(f=>f.key==='departureDateTime').certainty,'needs_review','the field genuinely tied to the segment\'s date/time legibility must still inherit the coarse certainty when it IS relevant (this is FL-007\'s real case, not a regression to fix)');
  assert.equal(fields.find(f=>f.key==='departureAirport').certainty,'exact','airport identity is a separate concern from date/time legibility, even on the same (departure) side -- fix pass 6 refined this further after V6-F35\'s root cause #2');
  console.log('PASS: V6-F34 a coarse segment-level read-quality note only downgrades the field it is actually about (date/time), not every field on the segment -- including not the airport on the same side');
}
test_V6_F34_coarse_segment_certainty_no_longer_downgrades_unrelated_fields();

// --- UI wiring: the review screen must let the Product Owner pick between the two candidate
// readings, and picking one must actually update the suggestion (location/startAt/endAt, and the
// departure/arrival airport shown in the flight summary) rather than only being cosmetic. ---
function test_direction_pick_ui_wiring(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function directionPickerPanel\(suggestionId,p\)\{/,'a dedicated panel must render the candidate readings for the Product Owner to pick between');
  assert.match(app,/p\.type==='flight'\?directionPickerPanel\(suggestion\.id,p\):''/,'the direction picker must be rendered in the suggestion review screen for a flight suggestion');
  assert.match(app,/data-action="pick-direction"/,'each candidate must be a clickable/selectable control wired through the existing data-action click-delegation pattern');
  assert.match(app,/action==='pick-direction'\)\{pickFlightDirection\(suggestionById\(button\.dataset\.id\),Number\(button\.dataset\.index\)\);render\(\)\}/,'picking a candidate must call pickFlightDirection and re-render so the change is immediately visible');
  assert.match(app,/function pickFlightDirection\(suggestion,index\)\{/,'pickFlightDirection must exist to apply the chosen candidate to the suggestion');
  assert.match(app,/location:candidate\.label,startAt:candidate\.startAt,endAt:candidate\.endAt/,'picking a candidate must update location/startAt/endAt together as one linked group, matching how the candidate itself was built');
  console.log('PASS: the direction picker is wired into the suggestion review screen and picking a candidate updates the suggestion in place');
}
test_direction_pick_ui_wiring();

// --- V6-F33 (regression from V6-F30's new cross-source dedup fallback): merging a new suggestion
// into an already-approved item let a conflicting non-blank new value silently become the item's
// primary value -- confirmed live when V6-F32-reversed FL-003 segments merged into the correct
// FL-001/FL-002 items and flipped their displayed direction/dates. Reusing
// preserveTrustedFieldsOnMerge (already used for attach-and-extract) at the general duplicate-
// merge callsite keeps the existing item's value primary on conflict and records the new value as
// a reviewable candidate instead. ---
function test_V6_F33_merge_preserves_existing_trusted_values_on_conflict(){
  const existingItem={id:'item-fl001',type:'flight',title:'LY084 TLV → BKK',provider:'EL AL',confirmationNumber:'',location:'TLV → BKK',startAt:'2027-01-26T22:45',endAt:'2027-01-26T16:30',details:{flightNumber:'LY084',passengers:[{name:'Paola Kohan',eTicketNumber:'',seat:'43H',mealRequest:'',baggage:[]}]},warnings:[]};
  // A conflicting re-read of the SAME flight (reproducing the reversed direction/dates V6-F32
  // could previously produce) -- V6-F33 is about protecting the merge regardless of why a
  // conflicting value showed up.
  const conflictingSuggestion={proposed:{type:'flight',title:'LY084 BKK → TLV',provider:'EL AL',confirmationNumber:'',location:'BKK → TLV',startAt:'2027-01-26T16:30',endAt:'2027-01-26T22:45',details:{flightNumber:'LY084',passengers:[]},warnings:[]},warnings:[]};

  const protectedSuggestion=preserveTrustedFieldsOnMerge(conflictingSuggestion,existingItem);
  const merged=suggestionToItem(protectedSuggestion,existingItem);

  assert.equal(merged.location,'TLV → BKK','the existing item\'s correct route must remain primary, not be silently replaced by a conflicting new value');
  assert.equal(merged.startAt,'2027-01-26T22:45','the existing item\'s correct departure time must remain primary on conflict');
  assert.equal(merged.endAt,'2027-01-26T16:30','the existing item\'s correct arrival time must remain primary on conflict');
  assert(merged.details.mergeCandidates,'a conflicting new value must be recorded as a reviewable candidate, not silently discarded');
  assert.equal(merged.details.mergeCandidates.location,'BKK → TLV');
  assert(merged.warnings.some(w=>w.includes('location')),'the conflict must be surfaced as a visible warning on the merged item');
  assert.equal(merged.details.passengers.length,1,'a conflicting merge must still preserve passengers already on the item, unrelated to the scalar-field conflict');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const protectedSuggestion=preserveTrustedFieldsOnMerge\(suggestion,target\)/,'the general duplicate-merge path in approveSuggestion (not just attach-and-extract) must also run new suggestions through preserveTrustedFieldsOnMerge before merging into an already-approved item');
  assert.match(app,/item\.warnings\?\.length/,'the item detail view must render item.warnings so a flagged merge conflict is actually visible to the user afterwards, not just stored');

  console.log('PASS: V6-F33 merging into an already-approved item preserves its existing values as primary on conflict and flags the new value for review, instead of silently overwriting');
}
test_V6_F33_merge_preserves_existing_trusted_values_on_conflict();

// --- Regression guard: a genuinely blank existing field must still be filled from a merged
// suggestion -- V6-F33's conflict protection must not turn into "existing always wins outright". ---
function test_V6_F33_merge_still_fills_genuinely_blank_existing_fields(){
  const existingItem={id:'item-fl008',type:'flight',title:'LY2373',provider:'EL AL',confirmationNumber:'',location:'TLV → BER',startAt:'2025-09-16T17:30',endAt:'',details:{flightNumber:'LY2373',passengers:[]},warnings:[]};
  const companionSuggestion={proposed:{type:'flight',title:'LY2373',provider:'EL AL',confirmationNumber:'ABC999',location:'TLV → BER',startAt:'2025-09-16T17:30',endAt:'',details:{flightNumber:'LY2373',passengers:[]},warnings:[]},warnings:[]};

  const protectedSuggestion=preserveTrustedFieldsOnMerge(companionSuggestion,existingItem);
  const merged=suggestionToItem(protectedSuggestion,existingItem);

  assert.equal(merged.confirmationNumber,'ABC999','a PNR genuinely absent from the existing item must still be filled from a companion source, not blocked by the new conflict protection');
  assert(!merged.details.mergeCandidates,'a field that was genuinely blank on the existing item is a fill, not a conflict, and must not be flagged as one');
  console.log('PASS: V6-F33 the conflict protection still lets a genuinely blank existing field be filled from a merged suggestion, matching the pre-existing blank-preserving merge behavior');
}
test_V6_F33_merge_still_fills_genuinely_blank_existing_fields();

// --- V6-F31 (low priority): the landing banner's fallback subtitle was a hand-maintained literal
// ("Alpha 0.6.3 · Hotel Smart Import") that had already drifted -- wired to the same build-
// version source already used for the tab title/description (V6-F24's __APP_VERSION__
// injection), read back via document.title so it cannot drift independently again, and updated
// to mention Flight support too. ---
function test_V6_F31_landing_banner_synced_to_build_version_and_mentions_flight(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/:'Alpha 0\.6\.3 · Hotel Smart Import'\}/,'the hardcoded stale "Alpha 0.6.3" literal must be gone from the landing banner\'s live template (a code comment may still mention it historically)');
  assert.match(app,/function appVersionLabel\(\)\{const match=String\(document\.title\|\|''\)\.match\(\/Alpha\\s\+/,'the banner\'s version label must be derived from document.title (the same source __APP_VERSION__ resolves into at build time), not a second hardcoded literal');
  assert.match(app,/\$\{appVersionLabel\(\)\} · Hotel \+ Flight Smart Import/,'the fallback subtitle must use the derived version label and mention Flight support, not just Hotel');
  console.log('PASS: V6-F31 the landing banner\'s version label is derived from the same build-version source as the tab title, and now mentions Flight support');
}
test_V6_F31_landing_banner_synced_to_build_version_and_mentions_flight();

// --- Small addition: Today surfaces out-of-Trip-range items (the existing "מחוץ לטווח" badge,
// see isItemOutsideTrip/conflict()) instead of the empty state, but ONLY when Today has no other
// relevant item to show at all -- a Today with genuinely relevant content must never have an
// out-of-range item mixed in. ---
function test_today_out_of_range_fallback_wiring(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const outOfRange=shown\.length\?\[\]:sortItemsByStartAt\(state\.items\.filter\(item=>isItemOutsideTrip\(item,state\.trip\)\)\)/,'Today must compute the out-of-range fallback list only when shown is empty, from items flagged by the same isItemOutsideTrip used for the Trip Center/Timeline badge');
  assert.match(app,/const todayList=shown\.length\?shown\.map\(itemRow\)\.join\(''\):outOfRange\.length\?outOfRange\.map\(itemRow\)\.join\(''\):/,'Today must render the real shown items first, only falling back to out-of-range items (reusing itemRow, which already renders the "מחוץ לטווח" badge) when shown is empty, and only then falling back further to the empty-state message');
  console.log('PASS: Today\'s out-of-range fallback is wired to show only when there is nothing else relevant, reusing the existing out-of-range badge/row rendering');
}
test_today_out_of_range_fallback_wiring();

function test_today_out_of_range_fallback_data(){
  const trip={startDate:'2027-01-20',endDate:'2027-01-30'};
  const outOfRangeItem={id:'i1',type:'flight',schedule:'single',startAt:'2025-09-16T17:30',endAt:''};
  const inRangeUpcoming={id:'i2',type:'hotel',schedule:'range',startAt:'2027-01-22T12:00',endAt:'2027-01-24T12:00'};

  assert.equal(isItemOutsideTrip(outOfRangeItem,trip),true,'sanity: this fixture (FL-008\'s real 2025 boarding-pass date shape) is genuinely outside the Trip range');

  const opNothingRelevant=currentOperational([outOfRangeItem],'2027-06-01');
  assert.equal(opNothingRelevant.todayItems.length,0);
  assert.equal(opNothingRelevant.next,undefined,'with only an out-of-range item and no other items, there is genuinely nothing relevant for Today to find on its own -- this is exactly when the fallback should trigger');

  const opWithRealUpcoming=currentOperational([outOfRangeItem,inRangeUpcoming],'2027-01-01');
  assert.equal(opWithRealUpcoming.next.id,'i2','a genuinely relevant upcoming item must still be found normally, unaffected by an out-of-range item also being present');

  console.log('PASS: the underlying Today data supports falling back to an out-of-range item only when nothing else is relevant, never displacing real upcoming content');
}
test_today_out_of_range_fallback_data();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import second fix pass (V6-F31/F32/F33 + Today out-of-range fallback)');

// ===============================================================================================
// Third fix pass: V6-F34, plus the revised V6-F32 strategy (needs-review direction pick instead
// of a guess), plus a re-verification (not a code change) that duplicate consolidation
// self-resolves once direction/dates are stable. V6-F33 is explicitly out of scope for this pass
// per the report -- it could not be independently confirmed while direction was still unstable,
// and will be retested separately now that it is.
// ===============================================================================================

// ===============================================================================================
// Fourth fix pass: V6-F35 (resolved-direction warnings not clearing), V6-F36 (duplicate/merge
// screen had no way to resolve direction ambiguity -- fixed by candidate-aware dedup matching +
// inheriting the trusted item's already-resolved direction, no picker needed there), V6-F37
// (Hotel-specific wording on a Flight screen), V6-F38 (per-item attachment modal not updated to
// the merged Document option), and V6-F39 (the most important: a manually-resolved direction,
// and any field populated as a result like seat, silently reverted when a new source was
// attached -- the remaining scope of V6-F33, applied to the whole flight-details merge, not only
// direction). The QA daily Smart Import quota was also raised separately (Netlify branch-deploy
// context env var, not a code change -- see the chat report).
// ===============================================================================================

// --- Duplicate-matching re-verification (item #3, superseded by V6-F36 in fix pass 4): FL-003
// wasn't consolidating with FL-001/FL-002 for two compounding reasons. The one identified at the
// end of fix pass 3 -- which date got labeled departure vs. arrival flipping between extraction
// attempts -- would have self-resolved once a pick stabilized the dates, with the existing V6-F30
// flight-number+date matcher unchanged. But retesting found a second, deeper reason: an
// AMBIGUOUS suggestion has a blank primary startAt (nothing to guess into it), so
// isSameFlightNumberAndDate never even got a chance to fire until AFTER a pick -- meaning
// duplicateModal never appeared unprompted, with no picker on that screen to make a pick
// there either (V6-F36). isSameFlightAcrossDirectionCandidates closes that gap: it matches an
// ambiguous suggestion straight away, before any pick, using its two candidate dates instead of
// one committed date. ---
function test_V6_F36_ambiguous_suggestion_matches_and_inherits_trusted_direction_without_a_pick(){
  const existingFromFL001={id:'item-fl001',type:'flight',title:'LY084 TLV → BKK',confirmationNumber:'',provider:'EL AL',location:'TLV → BKK',startAt:'2027-01-26T22:45',endAt:'2027-01-26T16:30',details:{flightNumber:'LY084',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirport:{code:'TLV',name:'Tel Aviv',terminal:''},arrivalAirport:{code:'BKK',name:'Bangkok',terminal:''},aircraftType:'787 Dreamliner',classOfService:'',fareBasis:'',duration:'11h 15m',gate:'',gateOpensAt:'',gateClosesAt:'',boardingSequenceNumber:'',passengers:[{name:'Paola Kohan',eTicketNumber:'',seat:'43H',mealRequest:'',baggage:[]}]},warnings:[]};

  const source={id:'src-fl003-leg2',name:'FL-003',fingerprint:'fl003'};
  const result=draftResult({segments:[segment({
    flightNumber:'LY84',operatingCarrier:'EL AL',marketingCarrier:'EL AL',
    directionAmbiguous:true,
    directionCandidates:[
      {departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30'},
      {departureAirportCode:'BKK',departureAirportName:'Bangkok',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-26',departureTime:'16:30',arrivalDate:'2027-01-26',arrivalTime:'22:45'},
    ],
    evidence:'itinerary summary, leg 2',
  })]});
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);

  assert.equal(isSameFlightAcrossDirectionCandidates(suggestion.proposed,existingFromFL001),true,'the same flight number with a shared date on either candidate must match, with no pick required first');
  assert.equal(findPossibleDuplicates(suggestion,[existingFromFL001],[]).length,1,'findPossibleDuplicates must catch this BEFORE any direction pick -- this is the actual root cause of FL-003 not consolidating, not a merge-logic gap');

  const genuinelyDifferentFlight={id:'item-other',type:'flight',startAt:'2027-01-26T09:00',endAt:'2027-01-26T13:00',details:{flightNumber:'LY200'}};
  assert.equal(isSameFlightAcrossDirectionCandidates(suggestion.proposed,genuinelyDifferentFlight),false,'a different flight number must not match even if a date happens to coincide');

  // "Or better: have it inherit the direction already resolved on the matching trusted item" --
  // reproduces the exact merge pipeline approveSuggestion's merge branch runs (v5-app.js):
  // preserveTrustedFieldsOnMerge fills the still-blank location/startAt/endAt from the trusted
  // target, mergeFlightDetails does the same for the nested departureAirport/arrivalAirport, and
  // no separate direction-picker UI is needed on the duplicate screen at all.
  const protectedSuggestion=preserveTrustedFieldsOnMerge(suggestion,existingFromFL001);
  const merged=suggestionToItem(protectedSuggestion,existingFromFL001);
  assert.equal(merged.location,'TLV → BKK','the ambiguous new source must inherit the existing item\'s already-resolved direction, not stay blank or get a picker of its own');
  assert.equal(merged.startAt,'2027-01-26T22:45');
  assert.equal(merged.endAt,'2027-01-26T16:30');
  assert.equal(merged.details.departureAirport.code,'TLV');
  assert.equal(merged.details.arrivalAirport.code,'BKK');

  console.log('PASS: V6-F36 an ambiguous suggestion is matched as a duplicate of an already-resolved item via its candidate dates (no pick required), and inherits that item\'s trusted direction on merge instead of needing its own picker');
}
test_V6_F36_ambiguous_suggestion_matches_and_inherits_trusted_direction_without_a_pick();

// --- V6-F35: a direction-ambiguity warning must clear once resolved -- whether by an explicit
// Product Owner pick, or by the V6-F36 inheritance above -- and this must work for BOTH the
// app's own Hebrew label and a model-authored English warning (retesting found phrasing like
// "Direction ambiguity prevents assigning..." in draft.warnings/unresolved, which the old
// Hebrew-only substring filter missed entirely). An unrelated warning must never be touched. ---
function test_V6_F35_direction_warnings_clear_without_touching_unrelated_ones(){
  const warnings=[
    'דורש בדיקה — כיוון הטיסה (דורש בחירה): TLV → BKK / BKK → TLV (EL AL app)',
    'Direction ambiguity prevents assigning departure and arrival with confidence for this segment.',
    'Departure and arrival direction for this flight are not explicitly indicated in the source.',
    'דורש בדיקה — חברת תפעול: ISRAIR (unclear logo)',
    'שדות חובה חסרים במקור: gate',
  ];
  const cleared=clearResolvedDirectionWarning(warnings);
  assert.equal(cleared.length,2,'only the three direction-related warnings must be removed');
  assert(cleared.includes('דורש בדיקה — חברת תפעול: ISRAIR (unclear logo)'),'an unrelated carrier warning must be left exactly as-is');
  assert(cleared.includes('שדות חובה חסרים במקור: gate'),'an unrelated missing-field warning must be left exactly as-is');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/warnings:clearResolvedDirectionWarning\(reconciled\.warnings\)/,'pickFlightDirection (the suggestion-review AND attach-and-extract review screens share this same function) must use the broadened filter as a catch-all after the general reconciliation, so the suggestion review screen itself looks clean immediately after a pick (fix pass 5 layered reconcileStaleNeedsReview in front of this -- see test_V6_F35_reopened_manual_edit_clears_stale_needs_review)');
  const ingestionSrc=fs.readFileSync(new URL('../src/ingestion.js',import.meta.url),'utf8');
  assert.match(ingestionSrc,/directionNowResolved=value\('type',''\)==='flight'&&Boolean\(p\.details\?\.directionCandidates\?\.length\)&&Boolean\(location\)/,'suggestionToItem itself must detect a now-resolved direction (regardless of which merge path led to it) and clear the stale warning before it reaches the merged item -- this is what actually fixes the item-level warning reappearing, not just the pre-approval suggestion display');
  assert.match(ingestionSrc,/directionNowResolved\?clearResolvedDirectionWarning\(incomingWarnings\):incomingWarnings/,'the clearing must only apply when the direction is actually resolved, otherwise a genuinely still-ambiguous merge must keep showing its warning');

  console.log('PASS: V6-F35 a resolved direction-ambiguity warning clears in both Hebrew and English phrasing, in both the pick and the merge-inherit path, without touching an unrelated warning');
}
test_V6_F35_direction_warnings_clear_without_touching_unrelated_ones();

// --- V6-F37: the update-confirmation screen hardcoded Hotel-specific copy ("המלון הקיים לא
// ישתנה", "אישור ועדכון המלון") regardless of the suggestion's actual type, so a Flight update
// review incorrectly talked about a hotel. ---
function test_V6_F37_flight_update_wording_is_not_hotel_specific(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/isUpdate\?'המלון הקיים לא ישתנה עד לאישור מפורש\.'/,'the old hardcoded Hotel-only notice ternary must be gone from the live template');
  assert.doesNotMatch(app,/isUpdate\?'אישור ועדכון המלון'/,'the old hardcoded Hotel-only approve-button ternary must be gone from the live template');
  assert.match(app,/function existingItemUnchangedNotice\(type\)\{/,'a type-aware helper must supply the update-notice copy');
  assert.match(app,/flight:'הטיסה הקיימת לא תשתנה עד לאישור מפורש\.'/,'the Flight-specific phrasing must exist (with correct Hebrew gender agreement -- טיסה is feminine)');
  assert.match(app,/isUpdate\?`אישור ועדכון ה\$\{ITEM_TYPES\[p\.type\]\?\.label\|\|'פריט'\}`/,'the approve button must build its label from the suggestion\'s own type, not assume hotel');
  console.log('PASS: V6-F37 the update-confirmation screen\'s copy is type-aware and no longer references "hotel" for a Flight update');
}
test_V6_F37_flight_update_wording_is_not_hotel_specific();

// --- V6-F38: the per-item "add document" modal (attachmentModal) didn't get the PDF/Picture ->
// Document merge that the global Add flow got earlier -- applying the same merge there too. ---
function test_V6_F38_attachment_modal_merges_pdf_and_photo(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  const attachmentModalStart=app.indexOf('function attachmentModal(');
  const attachmentModalSrc=app.slice(attachmentModalStart,app.indexOf('\n',app.indexOf('data-action="attach-ingest"',attachmentModalStart))+1);
  assert.doesNotMatch(attachmentModalSrc,/source-choice/,'the separate PDF/תמונה tab toggle must be gone from attachmentModal');
  assert.doesNotMatch(attachmentModalSrc,/📄 PDF/,'no separate PDF tab label may remain in attachmentModal');
  assert.doesNotMatch(attachmentModalSrc,/📷 תמונה/,'no separate תמונה (Picture) tab label may remain in attachmentModal');
  assert.match(attachmentModalSrc,/<input id="source-file" type="file" accept="application\/pdf,\.pdf,image\/png,image\/jpeg,image\/webp">/,'attachmentModal must use the same single broad-accept Document input as the Add screen');
  assert.doesNotMatch(attachmentModalSrc,/capture="environment"/,'attachmentModal must not force a capture attribute -- letting the OS present its native camera/gallery/file choice');
  assert.match(app,/state\.modal=\{type:'attachment',itemId:button\.dataset\.id,source:'document'\}/,'opening the attachment modal must default its source kind to \'document\', matching the merged Add-screen option');
  console.log('PASS: V6-F38 the per-item attachment modal merges PDF/Picture into one Document option, matching the global Add flow');
}
test_V6_F38_attachment_modal_merges_pdf_and_photo();

// --- V6-F39 (the most important item, remaining scope of V6-F33): a manually-resolved flight
// direction is a trusted value exactly like a manually-entered title or date -- attaching a new,
// still-ambiguous companion source must not silently revert it. Confirmed live: attaching FL-003
// to the already-resolved FL-001 item (BKK -> TLV, seat 43H) reverted the direction to
// unresolved and lost the seat. Root cause: suggestionToItem's flight-details merge did a plain
// object spread for everything except passengers, so a new source's own blank
// departureAirport/arrivalAirport (and any other blank detail) silently overwrote the existing,
// already-resolved ones. mergeFlightDetails fixes this generically, not just for direction. ---
function test_V6_F39_resolved_direction_and_seat_survive_attaching_a_new_companion_source(){
  const existingItem={id:'item-fl001',type:'flight',title:'LY084',provider:'EL AL',confirmationNumber:'',location:'BKK → TLV',startAt:'2027-01-26T16:30',endAt:'2027-01-26T22:45',details:{flightNumber:'LY084',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirport:{code:'BKK',name:'Bangkok',terminal:''},arrivalAirport:{code:'TLV',name:'Tel Aviv',terminal:''},aircraftType:'737-900',classOfService:'Economy',fareBasis:'',duration:'11h 15m',gate:'',gateOpensAt:'',gateClosesAt:'',boardingSequenceNumber:'',passengers:[{name:'Paola Kohan',eTicketNumber:'',seat:'43H',mealRequest:'',baggage:[]}]},warnings:[]};

  const source={id:'src-fl003',name:'FL-003',fingerprint:'fl003'};
  const result=draftResult({segments:[segment({
    flightNumber:'LY84',operatingCarrier:'EL AL',marketingCarrier:'EL AL',
    directionAmbiguous:true,
    directionCandidates:[
      {departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30'},
      {departureAirportCode:'BKK',departureAirportName:'Bangkok',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-26',departureTime:'16:30',arrivalDate:'2027-01-26',arrivalTime:'22:45'},
    ],
    evidence:'itinerary summary leg 2 -- no passenger info shown at all on this view',
  })]});
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);

  // Reproduces the exact two-step attach-and-extract pipeline: preserveTrustedFieldsOnMerge runs
  // first (in runSmartAnalysis), suggestionToItem runs at final approval (in approveSuggestion).
  const protectedSuggestion=preserveTrustedFieldsOnMerge(suggestion,existingItem);
  const merged=suggestionToItem(protectedSuggestion,existingItem);

  assert.equal(merged.location,'BKK → TLV','the manually-resolved direction must survive attaching a new, still-ambiguous companion source');
  assert.equal(merged.startAt,'2027-01-26T16:30');
  assert.equal(merged.endAt,'2027-01-26T22:45');
  assert.equal(merged.details.departureAirport.code,'BKK','the resolved departure airport must not be reverted to blank by the new source\'s own (still-ambiguous) departureAirport');
  assert.equal(merged.details.arrivalAirport.code,'TLV');
  assert.equal(merged.details.aircraftType,'737-900','an existing detail the new source didn\'t also report must not be silently wiped -- the same underlying merge bug, not limited to direction');
  assert.equal(merged.details.passengers.find(p=>p.name==='Paola Kohan').seat,'43H','the seat populated earlier must survive attaching a companion source with no passenger info at all for this leg');
  assert(!merged.warnings.some(w=>/כיוון|direction/i.test(w)),'the stale "pick one" ambiguity warning from the new source\'s own unresolved extraction must not reappear on an item whose direction is actually already resolved');

  console.log('PASS: V6-F39 a manually-resolved flight direction (and dependent fields like seat/aircraft) survives attaching a new companion source, instead of being silently reverted to unresolved');
}
test_V6_F39_resolved_direction_and_seat_survive_attaching_a_new_companion_source();

// --- Regression guard: mergeFlightDetails must still be a "fill gaps, don't block fills" merge,
// not "existing always wins outright" -- a genuinely blank existing detail must still be filled
// from a companion source (matching the pre-existing FL-004/005/006 fareBasis behavior). ---
function test_mergeFlightDetails_still_fills_genuinely_blank_existing_fields(){
  const existing={flightNumber:'TG246',operatingCarrier:'Thai Airways',marketingCarrier:'Thai Airways',aircraftType:'Airbus A320',classOfService:'',fareBasis:'',duration:'1h 25m',gate:'',gateOpensAt:'',gateClosesAt:'',boardingSequenceNumber:'',departureAirport:{code:'KBV',name:'',terminal:''},arrivalAirport:{code:'',name:'',terminal:''},passengers:[]};
  const incoming={flightNumber:'TG246',operatingCarrier:'Thai Airways',marketingCarrier:'Thai Airways',aircraftType:'',classOfService:'Economy(Q)',fareBasis:'QLOFX',duration:'1h 25m',gate:'',gateOpensAt:'',gateClosesAt:'',boardingSequenceNumber:'',departureAirport:{code:'',name:'',terminal:''},arrivalAirport:{code:'BKK',name:'Bangkok Suvarnabhumi International Airport',terminal:''},passengers:[]};
  const merged=mergeFlightDetails(existing,incoming);
  assert.equal(merged.classOfService,'Economy(Q)','a genuinely blank existing field must still be filled from the new source');
  assert.equal(merged.fareBasis,'QLOFX');
  assert.equal(merged.aircraftType,'Airbus A320','an existing non-blank field must not be blanked by the new source\'s own blank value');
  assert.equal(merged.departureAirport.code,'KBV','an existing non-blank airport must survive even though the SAME key is present-but-blank on the new source');
  assert.equal(merged.arrivalAirport.code,'BKK','a genuinely blank existing airport must still be filled from the new source');
  console.log('PASS: mergeFlightDetails fills genuine gaps from a companion source without letting a blank existing field block the fill, mirroring preserveTrustedFieldsOnMerge\'s existing semantics');
}
test_mergeFlightDetails_still_fills_genuinely_blank_existing_fields();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import third fix pass (V6-F34 + revised V6-F32 needs-review direction pick, dedup re-verified)');
console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import fourth fix pass (V6-F35/F36/F37/F38/F39)');

// ===============================================================================================
// Fifth fix pass: V6-F35 reopened (the fix-pass-4 version only covered a direction pick; a manual
// form edit needed the same treatment), V6-F43 (an invalid-value warning misattributed onto
// unrelated fields -- the same class of bug as V6-F34, one endpoint further), V6-F41 (map search
// resolving to the wrong airport), V6-F42 (no loading indicator on retry), and V6-F40 (no
// build-specific identifier visible in the UI). Full retest of the fourth fix pass confirmed
// V6-F36-V6-F39 all fixed; these five came out of that same retest.
// ===============================================================================================

// --- V6-F35 (reopened): a needs-review flag is tied to a specific field's value at the moment it
// was generated -- once that field's actual value changes, by ANY of a picker selection, a
// manual form edit, or a merge, the flag and its warning are stale and must clear. The fix-pass-4
// version only handled the picker case via a narrow "כיוון"/"direction" text filter; retesting
// FL-007 found a manual arrival-date/time correction leaving its warning displayed. ---
function test_V6_F35_reopened_manual_edit_clears_stale_needs_review(){
  const proposed={
    type:'flight',startAt:'2025-08-25T21:30',endAt:'',location:'ATH → TLV',confirmationNumber:'',
    details:{needsReviewFields:[{key:'arrivalDateTime',label:'מועד נחיתה',value:'2025-08-25 23:75',evidence:'ISRAIR boarding pass'}]},
    warnings:['דורש בדיקה — מועד נחיתה: 2025-08-25 23:75 (ISRAIR boarding pass)','דורש בדיקה — חברת תפעול: ISRAIR (unclear logo)'],
  };
  // The Product Owner manually corrects the arrival date/time in the review form -- endAt
  // changed, so the stale warning about the ORIGINAL (invalid) value must clear.
  const corrected={...proposed,endAt:'2025-08-25T23:15'};
  const reconciled=reconcileStaleNeedsReview(corrected,new Set(['endAt']));
  assert.equal(reconciled.details.needsReviewFields.length,0,'the resolved needsReviewFields entry must be dropped once its mapped field (endAt) changes');
  assert.equal(reconciled.warnings.length,1,'only the warning about the now-corrected field must clear');
  assert(reconciled.warnings[0].includes('חברת תפעול'),'an unrelated warning (about a different field entirely) must survive untouched');

  const untouched=reconcileStaleNeedsReview(proposed,new Set(['location']));
  assert.equal(untouched.details.needsReviewFields.length,1,'a needs-review flag whose mapped field was NOT part of this edit must remain -- this is reconciliation, not a blanket clear-all');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const changedFields=new Set\(\['title','provider','confirmationNumber','location','website','phone','startAt','endAt','notes'\]\.filter\(key=>String\(before\[key\]\|\|''\)!==String\(next\[key\]\|\|''\)\)\)/,'updateSuggestion (the manual-edit submit handler) must compute which fields actually changed');
  assert.match(app,/suggestion\.proposed=reconcileStaleNeedsReview\(\{\.\.\.before,\.\.\.next\},changedFields\)/,'updateSuggestion must route the edit through the general reconciliation, not just overwrite the fields');
  assert.match(app,/const reconciled=reconcileStaleNeedsReview\(updated,new Set\(\['location','startAt','endAt'\]\)\)/,'pickFlightDirection must use the SAME general mechanism as a manual edit, not a separate direction-only path');

  console.log('PASS: V6-F35 (reopened) a manual field edit clears the needs-review flag/warning tied to that specific field, general to any flagged field -- not scoped to direction, and shared with the picker path');
}
test_V6_F35_reopened_manual_edit_clears_stale_needs_review();

// --- V6-F43: an invalid value (arrival time "23:75", not a valid minute) correctly stayed
// unfabricated (blank), but the warning explaining it was duplicated onto departureDateTime too,
// because certainty used to be one shared segment-wide flag covering both departure and arrival
// fields. Splitting it into certainty (departure + general) and arrivalCertainty (arrival-only,
// independent) scopes the resulting warning to only the field it is actually about -- the same
// class of fix as V6-F34, one endpoint further. ---
function test_V6_F43_invalid_value_warning_scoped_to_its_own_field(){
  const source={id:'src-fl007-invalid-arrival',name:'FL-007',fingerprint:'fl007b'};
  const result=draftResult({
    bookingReference:'1172207',
    segments:[segment({flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',departureAirportCode:'ATH',departureAirportName:'Athens',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2025-08-25',departureTime:'21:30',arrivalDate:'2025-08-25',arrivalTime:'23:75',certainty:'exact',arrivalCertainty:'needs_review',evidence:'ISRAIR boarding pass'})],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  assert.equal(suggestion.proposed.startAt,'2025-08-25T21:30','the valid departure date/time must populate normally');
  assert.equal(suggestion.proposed.endAt,'','an invalid arrival minute value (23:75) must not be fabricated into a value -- correctly left blank, as already confirmed working');

  const fields=suggestion.proposed.details.smartImportFields;
  const departureField=fields.find(f=>f.key==='departureDateTime'),arrivalField=fields.find(f=>f.key==='arrivalDateTime');
  assert.equal(departureField.certainty,'exact','the departure date/time is genuinely fine and must not inherit a warning about a problem that is only about arrival');
  assert.equal(arrivalField.certainty,'needs_review','the arrival date/time is the one genuinely affected field and must correctly stay flagged');

  assert(!suggestion.warnings.some(w=>w.includes('מועד יציאה')),'no warning may be generated for the departure date/time -- it was never actually a needs-review field');
  assert(suggestion.warnings.some(w=>w.includes('מועד נחיתה')),'a warning must still be generated for the arrival date/time, which is genuinely affected');

  assert.equal(flightImportSchema.properties.segments.items.properties.arrivalCertainty.type,'string','the schema must support an arrival-specific certainty independent of the segment-wide one');
  assert(flightImportSchema.properties.segments.items.required.includes('arrivalCertainty'));
  assert.match(flightSystemPrompt,/arrivalCertainty describes your confidence in the arrival date\/time specifically/,'the prompt must explain when to use arrivalCertainty instead of certainty');
  assert.match(flightSystemPrompt,/do not lower certainty \(the departure-side confidence\) over a problem that is only about arrival/,'the prompt must explicitly warn against letting an arrival-only problem pull down departure certainty');

  console.log('PASS: V6-F43 an invalid-value warning is scoped to the field it is actually about (arrival), and no longer misattributed onto the departure date/time');
}
test_V6_F43_invalid_value_warning_scoped_to_its_own_field();

// --- V6-F41: a Flight's item.location is a route string ("BKK → TLV"), which Google Maps
// resolved ambiguously as a search query (observed landing on the arrival airport instead of the
// departure one). Search the departure airport specifically. ---
function test_V6_F41_map_search_wiring(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function mapSearchLocation\(item\)\{/,'a dedicated helper must decide the map-search query');
  assert.match(app,/if\(item\.type==='flight'\)return item\.details\?\.departureAirport\?\.code\|\|item\.details\?\.departureAirport\?\.name\|\|item\.location/,'a Flight must search its DEPARTURE airport specifically, not the raw combined route string');
  assert.match(app,/mapsUrl\(mapSearchLocation\(item\)\)/,'the detail view\'s map-search link must use the new helper instead of the raw item.location');
  console.log('PASS: V6-F41 the map-search action uses a Flight\'s departure airport specifically, not the ambiguous combined route string');
}
test_V6_F41_map_search_wiring();

// --- V6-F42: retrying a failed analysis from the document list already sets
// source.processingState to 'processing' and re-renders immediately (runSmartAnalysis), but
// nothing in that row reflected it -- it looked stuck until it suddenly completed. ---
function test_V6_F42_retry_analysis_shows_loading_indicator(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const analyzing=source\.processingState==='processing'/,'sourceRow must detect an in-flight (re)analysis');
  assert.match(app,/analyzing\?'<span class="badge blue">מנתח…<\/span>':''/,'sourceRow must render a visible loading indicator while an analysis (initial or retry) is in progress');
  assert.match(app,/const canAnalyze=!analyzing&&/,'the retry button itself must not remain clickable while an analysis is already in flight');
  console.log('PASS: V6-F42 retrying a failed analysis now shows a loading indicator instead of looking stuck');
}
test_V6_F42_retry_analysis_shows_loading_indicator();

// --- V6-F40: the tab title/landing banner only ever showed the Alpha version, which does not
// change between fix passes -- there was no visual way to confirm exactly which build is
// deployed without checking the network tab. A build-specific identifier (the same
// package.json-version+git-SHA already embedded in the service worker's cache name) is now also
// embedded in index.html and surfaced in Settings. ---
function test_V6_F40_build_specific_identifier_visible(){
  const indexHtml=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(indexHtml,/<meta name="build-version" content="__BUILD_VERSION__">/,'index.html must carry a build-version meta tag using the same __BUILD_VERSION__ placeholder already resolved for the service worker\'s cache name');

  const injectScript=fs.readFileSync(new URL('../scripts/inject-build-version.mjs',import.meta.url),'utf8');
  assert.match(injectScript,/resolvedIndex = injectServiceWorkerVersion\(resolvedIndex, buildVersion\)/,'the build script must also resolve __BUILD_VERSION__ inside index.html, not only inside service-worker.js');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function buildVersionLabel\(\)\{return document\.querySelector\('meta\[name="build-version"\]'\)\?\.content\|\|''\}/,'a helper must read the build-version meta tag back out at runtime');
  assert.match(app,/בנייה \$\{esc\(buildVersionLabel\(\)\)\}/,'Settings must surface the build-specific identifier somewhere checkable, per V6-F40 (it does not need to be prominent)');

  console.log('PASS: V6-F40 a build-specific identifier (package.json version + git SHA) is embedded at build time and surfaced in Settings for QA to check');
}
test_V6_F40_build_specific_identifier_visible();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import fifth fix pass (V6-F35 reopened, V6-F40/F41/F42/F43)');

// ===============================================================================================
// Sixth fix pass: V6-F35, reopened a second time. Live retest against the ACTUAL
// tests/fixtures/flight_benchmark/FL-007_wildcard_VOID_plus_ISRAIR_baggage_matrix.png file (read
// directly for this pass, not a synthetic simplification) found the fix-pass-5 version of
// reconcileStaleNeedsReview still didn't clear the stale warning after a manual arrival-time
// correction. Root cause traced to TWO real bugs the earlier, oversimplified single-warning
// fixture never exercised -- see the two tests below.
// ===============================================================================================

// --- Root cause #1: the actual warning text the Product Owner saw ("Flight #2 arrival time is
// printed as 23:75, not a valid minute value") is natural-language prose that the model wrote
// into draft.warnings/unresolved -- a field with NO key of its own. reconcileStaleNeedsReview
// only ever looks at needsReviewFields entries (which DO have a key); a free-text warning was
// never reachable by field-mapping no matter how the mapping table was tuned, because there was
// nothing to map FROM. The general fix is to stop emitting the redundant free-text copy at
// creation time when it just restates a value the structured mechanism already covers (and can
// already clear). ---
function test_V6_F35_fix_pass_6_freetext_draft_warning_deduped_against_structured_field(){
  const source={id:'src-fl007-real-shape',name:'FL-007_wildcard_VOID_plus_ISRAIR_baggage_matrix.png',fingerprint:'fl007real'};
  const result=draftResult({
    bookingReference:'1172207',
    // The exact free-text pattern reported live -- quoting just the bad token ("23:75"), not our
    // internal combined "date time" rawValue string.
    warnings:['Flight #2 arrival time is printed as 23:75, which is not a valid minute value (00-59) -- reported exactly as shown, not corrected.'],
    segments:[
      segment({status:'void'}), // Flight #1, exactly as in the real file
      segment({flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',departureAirportCode:'ATH',departureAirportName:'Athens',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2025-08-25',departureTime:'21:30',arrivalDate:'2025-08-25',arrivalTime:'23:75',certainty:'exact',arrivalCertainty:'needs_review',evidence:'ISRAIR e-ticket, Flight #2 row',
        passengerDetails:[{passengerName:'',seat:'',mealRequest:'',certainty:'exact',baggage:[{bagType:'carry_on',weight:'3 kg',included:'included'},{bagType:'checked',weight:'23 kg',included:'not_included'},{bagType:'trolley',weight:'10 kg',included:'included'}]}],
      }),
    ],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);

  // Matched on the free-text sentence's own distinctive wording -- NOT on "23:75" alone, since
  // the legitimate structured warning below also cites "23:75" (that's the point: the real value
  // survives via the clearable structured copy, only the redundant free-text one must go).
  assert(!suggestion.warnings.some(w=>w.includes('not a valid minute value')),'the redundant free-text warning restating an already-flagged field\'s value must not be surfaced as a second, unclearable copy');
  assert(suggestion.warnings.some(w=>w.includes('מועד נחיתה')),'the structured, clearable arrival-time warning must still be present -- nothing about the real problem is lost, only the un-clearable duplicate');

  const corrected=reconcileStaleNeedsReview({...suggestion.proposed,endAt:'2025-08-25T19:04'},new Set(['endAt']));
  assert.equal(corrected.details.needsReviewFields.length,0,'the arrival-time needs-review entry must clear once the Product Owner corrects it (the value from the live retest: 25 Aug 2025, 19:04), even on this multi-segment (VOID + real flight) source shape');
  assert(!corrected.warnings.some(w=>w.includes('מועד נחיתה')),'no warning about arrival time may remain after the correction');

  console.log('PASS: V6-F35 (fix pass 6, root cause #1) a free-text draft-level warning that restates an already-flagged field\'s value is deduped at creation time, so only the clearable structured warning remains');
}
test_V6_F35_fix_pass_6_freetext_draft_warning_deduped_against_structured_field();

// --- Root cause #2: "the שדה נחיתה (arrival airport) needs-review entry also remained
// displayed" after the arrival-time-only correction. Not a reconciliation bug -- reconcileStaleNeedsReview
// correctly left it alone, because the Product Owner only edited endAt (arrival time), not
// location (arrival airport). The REAL bug was one level upstream: arrivalCertainty was one
// shared flag covering BOTH the arrival airport's identity AND the arrival time's validity, so an
// arrival-time-only problem (an invalid minute value) also pulled the airport's certainty down
// with it, even though the airport code/name was clearly legible on its own. Fixed by tying
// certainty/arrivalCertainty's "needs_review" tier to date/time specifically; airport/terminal
// fields now only inherit a downgrade at the stronger "unreadable" tier (the whole region is
// illegible), which is the only case where an airport code genuinely becomes uncertain too. ---
function test_V6_F35_fix_pass_6_arrival_airport_not_coupled_to_arrival_time_certainty(){
  const source={id:'src-fl007-airport-decouple',name:'FL-007',fingerprint:'fl007c'};
  const result=draftResult({
    bookingReference:'1172207',
    segments:[segment({flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',departureAirportCode:'ATH',departureAirportName:'Athens',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2025-08-25',departureTime:'21:30',arrivalDate:'2025-08-25',arrivalTime:'23:75',certainty:'exact',arrivalCertainty:'needs_review',evidence:'ISRAIR e-ticket'})],
  });
  const [suggestion]=smartImportFlightResultToSuggestions(result,source);
  const fields=suggestion.proposed.details.smartImportFields;
  assert.equal(fields.find(f=>f.key==='arrivalDateTime').certainty,'needs_review','the arrival date/time itself must still correctly stay flagged');
  assert.equal(fields.find(f=>f.key==='arrivalAirport').certainty,'exact','the arrival airport is a separate concern from arrival time validity (a clearly-legible airport code) and must not be dragged into needs_review by a time-only problem');
  assert(!suggestion.proposed.details.needsReviewFields.some(f=>f.key==='arrivalAirport'),'the arrival airport must not appear in needsReviewFields at all when only the time is the actual problem');

  // A genuinely illegible whole region (the stronger 'unreadable' tier) must still correctly take
  // the airport down with it -- this is the one case airport/terminal legitimately inherits.
  const obscured=draftResult({segments:[segment({flightNumber:'6H568',departureAirportCode:'ATH',arrivalAirportCode:'TLV',departureDate:'2025-08-25',arrivalDate:'2025-08-25',certainty:'exact',arrivalCertainty:'unreadable',evidence:'ISRAIR e-ticket, arrival block fully obscured'})]});
  const [obscuredSuggestion]=smartImportFlightResultToSuggestions(obscured,{id:'src-fl007-unreadable',name:'FL-007',fingerprint:'fl007d'});
  assert.equal(obscuredSuggestion.proposed.details.smartImportFields.find(f=>f.key==='arrivalAirport').certainty,'unreadable','when the whole arrival region is genuinely illegible (not just one value being invalid), the airport correctly inherits that too');

  console.log('PASS: V6-F35 (fix pass 6, root cause #2) an arrival-time-only problem no longer leaves the arrival airport stuck flagged as needs-review; a genuinely illegible whole region still correctly flags the airport too');
}
test_V6_F35_fix_pass_6_arrival_airport_not_coupled_to_arrival_time_certainty();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import sixth fix pass (V6-F35, root-caused and fixed against the real FL-007 file\'s structure)');
