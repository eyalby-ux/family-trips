import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcileFlightSegmentDirections} from '../netlify/functions/smart-import.mjs';

// Two real defects found during Eyal's own 0.6.6 QA acceptance testing (build 0.6.6-3925bb20),
// investigated and registered per VERSION_PACKAGE_AUTHORING_STANDARD_V29.md's mandatory finding
// register, MVP_DELIVERY_PLAN_CURRENT_STATE_V1.md V54.

// --- V6-F52: sign-in screen hardcoded a stale "Alpha 0.6.5" literal (src/main.js), disconnected
// from the build-injected source (document.title, set by scripts/inject-build-version.mjs) every
// other version label in the app already used -- direct recurrence of the V5-F05/V6-F31 defect
// class. Fix: extracted the shared source into its own module (app-version.js) so main.js and
// v5-app.js structurally cannot diverge again -- there is only one function that knows how to
// read the version, not two hand-synced copies. ---
function test_V6_F52_signin_version_matches_about(){
  const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(main,/auth-kicker">Alpha 0\.\d/,'the sign-in screen must never hardcode a literal Alpha version string again -- that is exactly how it drifted from the shipped build in the first place');
  assert.match(main,/import\s*\{\s*appVersionLabel\s*\}\s*from\s*['"]\.\/app-version\.js['"]/,'the sign-in screen must import the shared version-label source, not a private copy');
  assert.match(main,/auth-kicker">\$\{appVersionLabel\(\)\}/,'the sign-in screen must actually render the shared version label, not just import it unused');

  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/import\s*\{\s*appVersionLabel\s*\}\s*from\s*['"]\.\/app-version\.js['"]/,'the landing banner (v5-app.js) must use the SAME shared module as the sign-in screen, not its own separate copy of the function -- two independent copies is exactly the shape of bug that let them drift apart');
  assert.doesNotMatch(app,/function appVersionLabel\(\)/,'v5-app.js must no longer define its own private appVersionLabel -- a second definition anywhere is a second thing that can drift');

  const versionModule=fs.readFileSync(new URL('../src/app-version.js',import.meta.url),'utf8');
  assert.match(versionModule,/document\.title/,'the one shared source must derive the label from document.title, the same build-injected value scripts/inject-build-version.mjs writes into index.html -- not a third hardcoded literal in yet another file');
  console.log('PASS: V6-F52 the sign-in screen and the landing banner share one version-label source (app-version.js) and cannot drift apart again, replacing the hardcoded literal that caused the original defect');
}

test_V6_F52_signin_version_matches_about();

// --- V6-F53: FL-003 (an itinerary summary describing two legs, no explicit per-segment
// departure/arrival labels) produced a different segment direction/order across two immediate,
// unchanged re-imports, with the existing directionAmbiguous/directionCandidates picker
// (V6-F32/V6-F34, commit 716f950) never triggering either time. Root cause: that commit already
// documented genuine run-to-run non-determinism in the raw model call for exactly this source
// shape -- not a deterministic code defect, and not fixable by further prompt-tuning per that
// commit's own conclusion. Fix: for a multi-segment flight source, make a second independent
// model call and cross-check the two readings per segment (matched by flight number); a
// disagreement is routed through the SAME existing picker mechanism instead of ever trusting
// whichever guess happened to come first. reconcileFlightSegmentDirections is the pure,
// deterministic reconciliation logic -- exported and tested directly with hand-constructed
// "first call"/"second call" segment arrays, the same pattern every other adapter test in this
// suite already uses (never invoking the live model or smart-import.mjs's handler()). ---
function segment(overrides){return {status:'confirmed',flightNumber:'LY84',operatingCarrier:'EL AL',marketingCarrier:'EL AL',departureAirportCode:'TLV',departureAirportName:'Tel Aviv',departureTerminal:'',arrivalAirportCode:'BKK',arrivalAirportName:'Bangkok',arrivalTerminal:'',departureDate:'2027-01-26',departureTime:'22:45',arrivalDate:'2027-01-26',arrivalTime:'16:30',directionAmbiguous:false,directionCandidates:[],aircraftType:'',classOfService:'',fareBasis:'',duration:'',gate:'',gateOpensTime:'',gateClosesTime:'',boardingSequenceNumber:'',passengerDetails:[],evidence:'itinerary summary',certainty:'exact',arrivalCertainty:'exact',...overrides}}

function test_V6_F53_repetition_disagreement_routes_through_existing_picker(){
  // Two calls disagree on direction for the SAME real segment (same flight number, airports
  // swapped between the two readings) -- exactly the FL-003 shape.
  const first=[segment({flightNumber:'LY87',departureAirportCode:'HKT',departureAirportName:'Phuket',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-08',departureTime:'14:30',arrivalDate:'2027-01-07',arrivalTime:'22:30'})];
  const second=[segment({flightNumber:'LY87',departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'HKT',arrivalAirportName:'Phuket',departureDate:'2027-01-07',departureTime:'22:30',arrivalDate:'2027-01-08',arrivalTime:'14:30'})];
  const [reconciled]=reconcileFlightSegmentDirections(first,second);
  assert.equal(reconciled.directionAmbiguous,true,'a disagreement between the two independent calls must set directionAmbiguous, routing through the existing picker instead of silently trusting either guess');
  assert.equal(reconciled.directionCandidates.length,2,'both readings must be offered as candidates, the same shape the model itself produces when it self-diagnoses ambiguity');
  assert.deepEqual(reconciled.directionCandidates.map(c=>c.departureAirportCode).sort(),['HKT','TLV'],'the two candidates must be the two ACTUAL differing readings, not fabricated');
  assert.equal(reconciled.departureAirportCode,'','the direction-dependent fields on the segment itself must be left blank, exactly like a model-self-diagnosed ambiguous segment, so the existing adapter/UI code needs no changes at all');
  assert.equal(reconciled.arrivalAirportCode,'');
  assert(reconciled.evidence.includes('two independent extraction passes'),'the evidence must honestly say why this was flagged, not look identical to a model-self-diagnosed case');
  console.log('PASS: V6-F53 two independent calls disagreeing on direction for the same segment routes through the existing directionAmbiguous/directionCandidates picker, no new UI needed');
}
function test_V6_F53_agreement_leaves_segment_unchanged(){
  const first=[segment()];
  const second=[segment()]; // identical reading
  const [reconciled]=reconcileFlightSegmentDirections(first,second);
  assert.equal(reconciled.directionAmbiguous,false,'when both independent calls agree, nothing must change -- no added picker, no user-visible difference');
  assert.equal(reconciled.departureAirportCode,'TLV');
  assert.equal(reconciled.arrivalAirportCode,'BKK');
  console.log('PASS: V6-F53 two independent calls that agree leave the segment exactly as extracted, no unnecessary picker');
}
function test_V6_F53_already_self_flagged_segment_left_alone(){
  const first=[segment({directionAmbiguous:true,departureAirportCode:'',arrivalAirportCode:'',directionCandidates:[{departureAirportCode:'HKT',departureAirportName:'Phuket',arrivalAirportCode:'TLV',arrivalAirportName:'Tel Aviv',departureDate:'2027-01-08',departureTime:'14:30',arrivalDate:'2027-01-07',arrivalTime:'22:30'},{departureAirportCode:'TLV',departureAirportName:'Tel Aviv',arrivalAirportCode:'HKT',arrivalAirportName:'Phuket',departureDate:'2027-01-07',departureTime:'22:30',arrivalDate:'2027-01-08',arrivalTime:'14:30'}]})];
  const second=[segment()];
  const [reconciled]=reconcileFlightSegmentDirections(first,second);
  assert.equal(reconciled.directionCandidates.length,2,'a segment the model already correctly self-flagged as ambiguous must be left exactly as it was, not reprocessed or overwritten by the second call');
  console.log('PASS: V6-F53 a segment already self-flagged ambiguous by the model is left alone, not reprocessed');
}
function test_V6_F53_no_matching_segment_in_second_call_fails_open(){
  const first=[segment({flightNumber:'LY84'})];
  const second=[segment({flightNumber:'LY87',departureAirportCode:'HKT',arrivalAirportCode:'TLV'})]; // a different real flight, no match
  const [reconciled]=reconcileFlightSegmentDirections(first,second);
  assert.equal(reconciled.directionAmbiguous,false,'with no comparable second reading for this exact flight number, the original call must be trusted as-is -- this only ADDS a safety net, it never removes the existing behavior');
  assert.equal(reconciled.departureAirportCode,'TLV');
  console.log('PASS: V6-F53 a segment with no matching flight number in the second call fails open to the original reading');
}
function test_V6_F53_scoped_to_multi_segment_sources_only(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/reconcileDirectionByRepetition\s*&&\s*Array\.isArray\(draft\.segments\)\s*&&\s*draft\.segments\.length>1/,'the second call must only be made for a source that already produced more than one segment on the first call -- a single-segment source must never pay the extra cost/latency');
  assert.match(server,/analyze_flight:\{[^}]*reconcileDirectionByRepetition:true/,'only the Flight operation opts into this -- Hotel/Activity extraction must be unaffected');
  console.log('PASS: V6-F53 the repetition check is scoped to multi-segment flight sources only, not a blanket doubling of every Smart Import call');
}

test_V6_F53_repetition_disagreement_routes_through_existing_picker();
test_V6_F53_agreement_leaves_segment_unchanged();
test_V6_F53_already_self_flagged_segment_left_alone();
test_V6_F53_no_matching_segment_in_second_call_fails_open();
test_V6_F53_scoped_to_multi_segment_sources_only();
