import assert from 'node:assert/strict';
import fs from 'node:fs';
import {flagReversedFlightDirection} from '../src/ingestion.js';

// V6-F72: FL-003 reproduced FL-001's own already-once-confirmed RTL-layout misread -- both legs'
// departure/arrival were extracted exactly backwards, confidently, with no review flag at all.
// FL-001 (TLV->BKK, corrected to BKK->TLV in FLIGHT_SMART_IMPORT_DISCOVERY_V1.md V2) was never
// root-caused in the actual extraction behaviour, only in the benchmark document's own recorded
// ground truth -- so nothing changed in the code that could have caught the identical misread
// reproducing on FL-003's two legs (LY87 read as HKT->TLV, actually TLV->HKT; LY84 read as
// TLV->BKK, actually BKK->TLV).
//
// Why V6-F53's existing test coverage (tests/v6-52-53-correction.mjs) did not catch this: that
// mechanism (reconcileFlightSegmentDirections) makes a second independent model call for a
// multi-segment source and flags directionAmbiguous ONLY when the two calls DISAGREE with each
// other -- its own test (test_V6_F53_repetition_disagreement_routes_through_existing_picker)
// explicitly constructs two readings with the airports swapped BETWEEN calls to prove that
// disagreement case. A SYSTEMATIC RTL misread is not disagreement: both calls read the same
// combined-view layout the same wrong way and agree with each other, so this mechanism -- and
// nothing else that existed before this fix -- had any way to flag it. flagReversedFlightDirection
// (src/ingestion.js) closes that specific gap: it does not care whether two live-model calls
// agree with each other, only whether a NEW reading is the exact reverse of an ALREADY-SAVED item
// sharing the same flight number, which is precisely the FL-001/FL-003 failure signature and is
// fully deterministic (no live model call needed to test it).

function flightItem(flightNumber,departureCode,arrivalCode,location){
  return {type:'flight',location,details:{flightNumber,departureAirport:{code:departureCode},arrivalAirport:{code:arrivalCode}}};
}
function flightSuggestion(flightNumber,departureCode,arrivalCode){
  return {proposed:{type:'flight',warnings:[],details:{flightNumber,departureAirport:{code:departureCode},arrivalAirport:{code:arrivalCode}}}};
}

function test_V6_F72_FL003_leg1_LY87_reversed_reading_is_flagged_against_the_correct_saved_direction(){
  // Saved item holds the CORRECT, Product-Owner-confirmed direction: LY87 TLV -> HKT.
  const items=[flightItem('LY87','TLV','HKT','תל אביב - פוקט')];
  // A new extraction attempt reads it backwards, exactly as FL-003's own first leg did: HKT -> TLV.
  const backwards=flightSuggestion('LY87','HKT','TLV');
  const flagged=flagReversedFlightDirection(backwards,items);
  assert.ok(flagged.proposed.warnings.some(w=>w.includes('LY87')&&w.includes('כיוון הפוך')),'a reversed-direction reading of LY87 against the saved TLV->HKT item must be flagged as the exact-reverse signature, not silently trusted');
  console.log('PASS: V6-F72 FL-003 leg 1 (LY87) -- a backwards HKT->TLV reading is flagged against the saved correct TLV->HKT direction');
}
function test_V6_F72_FL003_leg2_LY84_reversed_reading_is_flagged_against_the_correct_saved_direction(){
  // Saved item holds the CORRECT direction for the return leg: LY84 BKK -> TLV.
  const items=[flightItem('LY84','BKK','TLV','בנגקוק - תל אביב')];
  // A new extraction attempt reads it backwards, exactly as FL-003's own second leg did: TLV -> BKK.
  const backwards=flightSuggestion('LY84','TLV','BKK');
  const flagged=flagReversedFlightDirection(backwards,items);
  assert.ok(flagged.proposed.warnings.some(w=>w.includes('LY84')&&w.includes('כיוון הפוך')),'a reversed-direction reading of LY84 against the saved BKK->TLV item must be flagged as the exact-reverse signature, not silently trusted');
  console.log('PASS: V6-F72 FL-003 leg 2 (LY84) -- a backwards TLV->BKK reading is flagged against the saved correct BKK->TLV direction');
}
function test_V6_F72_FL002_LY087_reversed_reading_is_flagged_against_the_now_confirmed_direction(){
  // FL-002 was catalogued (pre-fix) as LY087 HKT->TLV, but was never independently confirmed by
  // the Product Owner the way FL-001 was -- and FL-003's own confirmation of LY87 as TLV->HKT
  // makes FL-002's catalogued direction for the SAME flight number suspect. Once the saved item
  // reflects the corrected direction (TLV->HKT, per this fix's own FLIGHT_SMART_IMPORT_DISCOVERY_V1.md
  // update), a fresh extraction that reproduces FL-002's OLD (now known-backwards) reading must
  // itself be flagged, not trusted a second time.
  const items=[flightItem('LY087','TLV','HKT','תל אביב - פוקט')];
  const oldCatalogueReading=flightSuggestion('LY087','HKT','TLV');
  const flagged=flagReversedFlightDirection(oldCatalogueReading,items);
  assert.ok(flagged.proposed.warnings.some(w=>w.includes('LY087')&&w.includes('כיוון הפוך')),'a reading matching FL-002\'s old (now-corrected) catalogued direction must be flagged as the exact reverse of the corrected saved item');
  console.log('PASS: V6-F72 FL-002 (LY087) -- a reading matching the old, now-corrected catalogued direction is flagged against the corrected saved item');
}
function test_V6_F72_a_correct_matching_reading_is_never_flagged(){
  const items=[flightItem('LY87','TLV','HKT','תל אביב - פוקט')];
  const correct=flightSuggestion('LY87','TLV','HKT');
  const result=flagReversedFlightDirection(correct,items);
  assert.deepEqual(result.proposed.warnings,[],'a reading that matches (not reverses) an already-saved item\'s direction must never be flagged');
  console.log('PASS: V6-F72 a correctly-matching direction reading is never flagged');
}
function test_V6_F72_no_saved_item_with_the_same_flight_number_is_never_flagged(){
  // This is the known, accepted limitation stated in the function's own comment: it cannot help a
  // flight number's very first extraction, since there is nothing yet to compare it against --
  // which is exactly why the flightSystemPrompt worked-example strengthening still matters too.
  const flagged=flagReversedFlightDirection(flightSuggestion('LY999','TLV','HKT'),[]);
  assert.deepEqual(flagged.proposed.warnings,[],'a flight number with no existing saved item to compare against must never be flagged (nothing to detect a reversal against)');
  console.log('PASS: V6-F72 a flight number with no existing saved item is never flagged (documents the known first-extraction limitation)');
}
function test_V6_F72_non_flight_suggestions_are_untouched(){
  const hotel={proposed:{type:'hotel',warnings:['a pre-existing warning']}};
  const result=flagReversedFlightDirection(hotel,[flightItem('LY87','TLV','HKT')]);
  assert.equal(result,hotel,'a non-flight suggestion must be returned completely untouched');
  console.log('PASS: V6-F72 a non-flight suggestion is returned untouched');
}
function test_V6_F72_runSmartAnalysis_wires_the_flag_for_every_flight_suggestion(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/if\(category==='flight'\)suggestions=suggestions\.map\(suggestion=>flagReversedFlightDirection\(suggestion,state\.items\)\)/,'runSmartAnalysis must run every flight-category suggestion through flagReversedFlightDirection against the live saved items, not only on the attach-to-item path');
  console.log('PASS: V6-F72 runSmartAnalysis is wired to flagReversedFlightDirection for every flight suggestion');
}
function test_V6_F72_flightSystemPrompt_has_a_positive_worked_example_for_RTL_combined_views(){
  const schema=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-schema.mjs',import.meta.url),'utf8');
  assert.match(schema,/Worked example of a combined RTL itinerary view/,'flightSystemPrompt must contain a concrete worked example for reading direction in a combined RTL itinerary view, not only the prior negative-form warning');
  assert.match(schema,/LY 87.*LY 84|LY 84.*LY 87/s,'the worked example must use a concrete two-leg, same-airport-pair scenario (mirroring the real FL-003 case) so the opposite-direction-per-leg point is unambiguous');
  console.log('PASS: V6-F72 flightSystemPrompt contains a positive worked example for RTL combined-view direction reading');
}

test_V6_F72_FL003_leg1_LY87_reversed_reading_is_flagged_against_the_correct_saved_direction();
test_V6_F72_FL003_leg2_LY84_reversed_reading_is_flagged_against_the_correct_saved_direction();
test_V6_F72_FL002_LY087_reversed_reading_is_flagged_against_the_now_confirmed_direction();
test_V6_F72_a_correct_matching_reading_is_never_flagged();
test_V6_F72_no_saved_item_with_the_same_flight_number_is_never_flagged();
test_V6_F72_non_flight_suggestions_are_untouched();
test_V6_F72_runSmartAnalysis_wires_the_flag_for_every_flight_suggestion();
test_V6_F72_flightSystemPrompt_has_a_positive_worked_example_for_RTL_combined_views();
console.log('ALL PASS: V6-F72 a systematic RTL-misread reversal of an already-confirmed flight direction (FL-003 both legs, FL-002 by the same signature) is now caught by a deterministic code-level cross-check, independent of live-model agreement, plus a strengthened prompt with a concrete worked example');
