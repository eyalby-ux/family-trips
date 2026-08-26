import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportFlightResultToSuggestions,isFlightSegmentUsable,isSameFlightNumberAndDate,mergeFlightPassengers,isSameFlightForDedup} from '../src/flight-import-adapter.js';
import {findPossibleDuplicates,suggestionToItem} from '../src/ingestion.js';
import {normalizeDateRange,normalizeFlightDateString} from '../src/operational-data.js';
import {flightImportSchema,flightSystemPrompt} from '../netlify/functions/_shared/smart-import-schema.mjs';

// Every fixture below is a hand-verified transcription of the real FL-00x benchmark document at
// tests/fixtures/flight_benchmark/ -- read directly, field by field, not synthesized. It
// represents the JSON a correct extraction (per flightImportSchema/flightSystemPrompt) should
// produce for that exact source, so these tests exercise the adapter/mapping pipeline
// end-to-end against all 8 real cases. They cannot exercise the live model itself (no API
// access from this environment) -- see the chat report for what still needs a live QA pass.
const BLANK_SEGMENT_FIELDS={status:'confirmed',flightNumber:'',operatingCarrier:'',marketingCarrier:'',departureAirportCode:'',departureAirportName:'',departureTerminal:'',arrivalAirportCode:'',arrivalAirportName:'',arrivalTerminal:'',departureDate:'',departureTime:'',arrivalDate:'',arrivalTime:'',aircraftType:'',classOfService:'',fareBasis:'',duration:'',gate:'',gateOpensTime:'',gateClosesTime:'',boardingSequenceNumber:'',passengerDetails:[],evidence:'',certainty:'exact'};
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
      segment({flightNumber:'6H568',operatingCarrier:'ISRAIR',marketingCarrier:'ISRAIR',departureAirportCode:'ATH',departureAirportName:'Athens',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2025-08-25',departureTime:'',arrivalDate:'2025-08-25',arrivalTime:'',certainty:'needs_review',evidence:'ISRAIR baggage matrix, times obscured by UI overlay',
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
  assert.match(app,/choices=\[\['manual','[^']*'\],\['document','[^']*'\],\['link','[^']*'\],\['json','[^']*'\],\['qr','[^']*'\]\]/,'the top-level Add options must be exactly Manual / Document / Link / QR / JSON, in that order -- PDF and Picture are no longer separate options there (attachmentModal, a different screen for adding a document to an existing item, intentionally keeps its own separate file/photo tabs and is out of this change\'s scope)');

  const documentInputMatch=app.match(/<input id="source-file" type="file" accept="application\/pdf,\.pdf,image\/png,image\/jpeg,image\/webp">/);
  assert(documentInputMatch,'the Document option must accept both PDF and image mime types in one input');
  assert(!/capture="environment"/.test(documentInputMatch[0]),'the Document input must not force a capture attribute -- letting the OS present its native camera/gallery/file choice is what "choose camera, gallery, or file as before" means here');

  assert.match(app,/kind==='document'&&!isPdf&&!isImage/,'validateSmartSource must accept a Document source as either a PDF or an image');
  console.log('PASS: PDF and Picture are merged into one Document option (camera/gallery/file left to the OS), JSON remains its own separate top-level option');
}
test_ux_document_option_merges_pdf_and_photo();

console.log('ALL PASS: Alpha 0.6.5 Flight Smart Import regression suite (8/8 benchmark cases)');
