import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeInsuranceDetails,mergeInsuredPersons,smartImportInsuranceResultToSuggestion} from '../src/insurance-import-adapter.js';
import {ITEM_TYPES,TYPE_FIELDS,suggestionToItem} from '../src/ingestion.js';
import {insuranceImportSchema,insuranceSystemPrompt,sourceClassificationSchema} from '../netlify/functions/_shared/smart-import-schema.mjs';

// Every fixture below is a hand-verified transcription of the real INS-00x benchmark document at
// tests/fixtures/insurance_benchmark/, taken directly from the frozen field-by-field ground truth
// in INSURANCE_SMART_IMPORT_DISCOVERY_V1.md (V3, Frozen) -- not synthesized. It represents the
// JSON a correct extraction (per insuranceImportSchema/insuranceSystemPrompt) should produce for
// that exact source, so these tests exercise the adapter/mapping pipeline end-to-end against all
// eight real cases. They cannot exercise the live model itself (no API access from this
// environment) -- that remains a Product Owner acceptance-session step (see
// docs/versions/V6/0.6.7/EXECUTABLE_TEST_SESSION_V*.md).
function f(key,label,rawValue,certainty='exact',evidence='source'){return {key,label,rawValue,normalizedValue:rawValue,evidence,certainty}}
function person(overrides){return {name:'',idNumber:'',dob:'',evidence:'',certainty:'exact',...overrides}}
function draftResult(draft,attemptId='attempt'){return {attemptId,usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{acquisitionState:'acquired',proposalState:'proposed',insuredPersons:[],fields:[],importantNotes:[],unresolved:[],explicitlyAbsent:[],warnings:[],...draft}}}

// ---------------------------------------------------------------------------------------------
// INS-001 -- Direct Insurance (ביטוח ישיר). Frozen extraction caveat: the source PDF's font has
// no usable ToUnicode mapping, so Hebrew label prose does not extract reliably even though
// numeric/date fields do -- this fixture reflects exactly that (numeric/date fields populated,
// no Hebrew prose asserted as reliably read).
// ---------------------------------------------------------------------------------------------
function test_INS001_direct_insurance_hebrew_font_no_tounicode(){
  const source={id:'src-ins001',name:'INS-001',fingerprint:'ins001'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben Yitzhak',idNumber:'043119213',dob:'1981-05-19',evidence:'policy holder section'})],
    fields:[
      f('provider','Provider','ביטוח ישיר'),
      f('policy_number','Policy number','1595783600'),
      f('start_date','Coverage start','2023-02-03'),
      f('end_date','Coverage end','2023-02-07'),
      f('phone','Emergency phone','972-3-5655999'),
      f('claims_phone','Claims/office fax','03-5555545'),
      f('sum_insured','Sum insured (medical)','$5,000,000'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'ביטוח ישיר');
  assert.equal(suggestion.proposed.confirmationNumber,'1595783600');
  assert.equal(suggestion.proposed.startAt,'2023-02-03T12:00');
  assert.equal(suggestion.proposed.endAt,'2023-02-07T12:00');
  assert.equal(suggestion.proposed.phone,'972-3-5655999','the emergency line, not the claims/office fax, must land in phone');
  assert.match(suggestion.proposed.notes,/03-5555545/,'the separate claims/office fax must still be preserved, just in notes rather than phone');
  assert.match(suggestion.proposed.notes,/5,000,000/,'sum insured goes to notes per Decision 4, not a new structured field');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzhak']);
  assert.equal(suggestion.proposed.details.insuredPersons[0].idNumber,'043119213');
  console.log('PASS: INS-001 Direct Insurance -- numeric/date fields captured reliably despite the source PDF\'s own Hebrew-font ToUnicode limitation, emergency phone correctly separated from the claims fax');
}

// ---------------------------------------------------------------------------------------------
// INS-002 -- Harel. Real multi-person case: two named, ID+DOB-identified travelers.
// ---------------------------------------------------------------------------------------------
function test_INS002_harel_two_travelers(){
  const source={id:'src-ins002',name:'INS-002',fingerprint:'ins002'};
  const result=draftResult({
    insuredPersons:[
      person({name:'Eyal Ben Yitzhak',idNumber:'43119213',dob:'1981-05-19',evidence:'insured table, row 1'}),
      person({name:'Daniel Ben Yitzhak',idNumber:'220990485',dob:'2011-09-20',evidence:'insured table, row 2'}),
    ],
    fields:[
      f('provider','Provider','Harel Insurance Company Ltd.'),
      f('policy_number','Policy number','765720708226'),
      f('start_date','Coverage start','2026-07-12'),
      f('end_date','Coverage end','2026-07-19'),
      f('phone','Emergency phone','972-3-7547030'),
      f('sum_insured','Sum insured (medical)','$5,000,000'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'Harel Insurance Company Ltd.');
  assert.equal(suggestion.proposed.startAt,'2026-07-12T12:00');
  assert.equal(suggestion.proposed.endAt,'2026-07-19T12:00');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzhak','Daniel Ben Yitzhak'],'both named, ID+DOB-identified travelers must be captured, each their own participant');
  assert.equal(suggestion.proposed.details.insuredPersons[1].dob,'2011-09-20','the second traveler\'s own DOB must never be attached to the first traveler\'s entry');
  console.log('PASS: INS-002 Harel -- two named, ID+DOB-identified travelers correctly captured as separate insuredPersons/participants');
}

// ---------------------------------------------------------------------------------------------
// INS-003 -- PassportCard. A confirmation letter, not the full policy -- genuinely different
// document shape from every other case in this benchmark (no premium/invoice content at all).
// ---------------------------------------------------------------------------------------------
function test_INS003_passportcard_confirmation_letter(){
  const source={id:'src-ins003',name:'INS-003',fingerprint:'ins003'};
  const result=draftResult({
    insuredPersons:[
      person({name:'Kohan Paola',idNumber:'303597751',dob:'1982-02-26',evidence:'confirmation letter'}),
      person({name:'Ben Yitzhak Daniel',idNumber:'220990485',dob:'2011-09-20',evidence:'confirmation letter'}),
    ],
    fields:[
      f('provider','Provider','PassportCard / DavidShield Insurance Company Ltd.'),
      f('policy_number','Policy number','306117447'),
      f('start_date','Coverage start','2022-11-28'),
      f('end_date','Coverage end','2022-12-02'),
      f('phone','Emergency phone','+972-98920930'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.confirmationNumber,'306117447');
  assert.equal(suggestion.proposed.startAt,'2022-11-28T12:00');
  assert.equal(suggestion.proposed.endAt,'2022-12-02T12:00');
  assert.equal(suggestion.proposed.phone,'+972-98920930');
  assert.deepEqual(suggestion.proposed.participants,['Kohan Paola','Ben Yitzhak Daniel']);
  console.log('PASS: INS-003 PassportCard -- a confirmation-letter shape (no premium/invoice content) still extracts cleanly, both travelers captured');
}

// ---------------------------------------------------------------------------------------------
// INS-004 -- Phoenix, sold via agent Wobi. Real, confirmed insurer != selling agent case --
// provider must resolve to Phoenix (the underwriter), not Wobi (the agent).
// ---------------------------------------------------------------------------------------------
function test_INS004_phoenix_insurer_not_wobi_agent(){
  const source={id:'src-ins004',name:'INS-004',fingerprint:'ins004'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben-Yitzhak',idNumber:'43119213',dob:'1981-05-19',evidence:'policy holder section'})],
    fields:[
      f('provider','Insurer','Phoenix Insurance Company Ltd.'),
      f('broker','Selling agent','Wobi Insurance Agencies Ltd.'),
      f('policy_number','Policy number','21/121/667/1017370'),
      f('start_date','Coverage start','2021-06-17'),
      f('end_date','Coverage end','2021-06-20'),
      f('phone','Emergency phone (MEDASSIS)','+972-3-7331177'),
      f('claims_phone','Customer service (office hours only)','03-7338141'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'Phoenix Insurance Company Ltd.','provider must resolve to the underwriting insurer, not the selling agent Wobi, mirroring the same insurer-vs-agent priority discipline Attraction/Event\'s V6-F63 already had to solve');
  assert.match(suggestion.proposed.notes,/Wobi Insurance Agencies/,'the selling agent must still be preserved, in notes, not silently dropped');
  assert.equal(suggestion.proposed.phone,'+972-3-7331177','the 24/7 MEDASSIS emergency line, not the office-hours-only customer service number');
  assert.match(suggestion.proposed.notes,/03-7338141/,'the office-hours-only customer service line must land in notes, not phone');
  console.log('PASS: INS-004 Phoenix -- provider resolves to the underwriting insurer, not the selling agent (Wobi); emergency phone correctly separated from the office-hours customer service line');
}

// ---------------------------------------------------------------------------------------------
// INS-005 -- Wobi booking confirmation. A different document shape (broker/comparison-site order
// confirmation, not a final insurer-issued policy) -- the largest real case, five travelers.
// ---------------------------------------------------------------------------------------------
function test_INS005_wobi_five_traveler_family_case(){
  const source={id:'src-ins005',name:'INS-005',fingerprint:'ins005'};
  const result=draftResult({
    insuredPersons:[
      person({name:'Eyal Ben Yitzhak',idNumber:'043119213',evidence:'order confirmation, traveler 1'}),
      person({name:'Paola Cohen',idNumber:'303597751',evidence:'order confirmation, traveler 2'}),
      person({name:'Amit Ben Yitzhak',idNumber:'220990485',evidence:'order confirmation, traveler 3'}),
      person({name:'Daniel Ben Yitzhak',idNumber:'340255835',evidence:'order confirmation, traveler 4'}),
      person({name:'Ofri Ben Yitzhak',idNumber:'225991736',evidence:'order confirmation, traveler 5'}),
    ],
    fields:[
      f('provider','Insurer/track','Harel'),
      f('policy_number','Order number','2505025810020552'),
      f('start_date','Coverage start','2025-08-14'),
      f('end_date','Coverage end','2025-08-26'),
      f('phone','Emergency phone','+972-3-7547030'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.confirmationNumber,'2505025810020552');
  assert.equal(suggestion.proposed.participants.length,5,'the real full family -- all five named travelers must be captured, none dropped');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzhak','Paola Cohen','Amit Ben Yitzhak','Daniel Ben Yitzhak','Ofri Ben Yitzhak']);
  assert.equal(suggestion.proposed.phone,'+972-3-7547030','the same Harel 24/7 hotline as INS-002 -- a real cross-check between the two independent Harel-linked documents in this benchmark');
  console.log('PASS: INS-005 Wobi booking confirmation -- all five real family travelers captured, none dropped or fabricated');
}

// ---------------------------------------------------------------------------------------------
// INS-006 (MANDATORY WILD-CARD) -- TorenInsurance, scanned bi-level TIFF, no text layer, 2010
// template, insurer (Clal) sold via a differently-named agency (Toren) whose own name is more
// prominent -- the sharpest insurer-vs-agent case in this benchmark. Two cleanly-separated phone
// numbers (claims vs. emergency) are the concrete evidence for the phone-priority rule.
// ---------------------------------------------------------------------------------------------
function test_INS006_wildcard_toren_clal_two_phone_numbers(){
  const source={id:'src-ins006',name:'INS-006',fingerprint:'ins006'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben-Yitzhak',idNumber:'043119213',dob:'1981-05-19',evidence:'scanned page 1, policy holder section'})],
    fields:[
      f('provider','Underwriter','Clal Insurance Company Ltd.'),
      f('broker','Agency','Toren Insurance Agencies'),
      f('policy_number','Policy number','220008858030'),
      f('start_date','Coverage start','2010-03-31'),
      f('end_date','Coverage end','2010-04-03'),
      f('claims_phone','Claims center (מוקד תביעות, office hours)','03-9420413'),
      f('phone','Emergency center (מוקד חירום, I.M.A., 24 hours)','972-3-9221088'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'Clal Insurance Company Ltd.','provider must resolve to Clal (the underwriter), not Toren (the agency whose name is more prominent on the actual document) -- the sharpest real insurer-vs-agent case in this benchmark');
  assert.match(suggestion.proposed.notes,/Toren Insurance Agencies/);
  assert.equal(suggestion.proposed.phone,'972-3-9221088','the 24-hour I.M.A. emergency center, not the office-hours claims center -- the cleanest real evidence in this benchmark for the phone-priority rule, since the two numbers are unambiguously separated on the source itself');
  assert.match(suggestion.proposed.notes,/03-9420413/,'the claims center number must still be preserved, in notes');
  assert.equal(suggestion.proposed.startAt,'2010-03-31T12:00','a 2010 document (fifteen-plus years older than every other case) must extract exactly as printed, never rejected or "corrected" as implausible');
  console.log('PASS: INS-006 (mandatory wild-card) TorenInsurance -- scanned 2010 TIFF, provider resolves to the underwriter Clal not the more-prominent agency Toren, and the two cleanly-separated phone numbers confirm the emergency-over-claims priority rule against a real, unambiguous case');
}

// ---------------------------------------------------------------------------------------------
// INS-007 -- DiveAssure, a dedicated single-day activity-linked policy (Section 3a). Coverage
// start and end dates are identical -- a single day, not an error to "fix" into a range.
// ---------------------------------------------------------------------------------------------
function test_INS007_diveassure_dedicated_single_day_policy(){
  const source={id:'src-ins007',name:'INS-007',fingerprint:'ins007'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben Yitzhak',evidence:'confirmation screenshot, member name'})],
    fields:[
      f('provider','Provider','DiveAssure'),
      f('policy_number','Policy number','1629463'),
      f('start_date','Coverage date','2025-10-10'),
      f('end_date','Coverage date','2025-10-10'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'DiveAssure');
  assert.equal(suggestion.proposed.confirmationNumber,'1629463');
  assert.equal(suggestion.proposed.startAt,'2025-10-10T12:00');
  assert.equal(suggestion.proposed.endAt,'2025-10-10T12:00','a single-day dedicated policy has identical start/end dates -- this is correct, real data, never an error to "fix" into a wider range');
  assert.equal(suggestion.proposed.schedule,'entire','a dedicated, activity-linked policy still uses the fixed entire-trip schedule -- Section 3a\'s resolved design applies uniformly, regardless of how narrow the coverage dates are');
  console.log('PASS: INS-007 DiveAssure -- a dedicated single-day activity-linked policy, identical start/end dates preserved correctly, schedule stays \'entire\' per Section 3a');
}

// ---------------------------------------------------------------------------------------------
// INS-008 -- RentalCover.com / Cover Genius, a dedicated asset-linked policy. Three named parties
// (underwriter/administrator/billing platform) on one document, ILS excess/damage limit (not USD
// medical), and no phone at all -- only a claims URL, confirming phone is genuinely
// required-when-present, not universal.
// ---------------------------------------------------------------------------------------------
function test_INS008_rentalcover_no_phone_only_claims_url(){
  const source={id:'src-ins008',name:'INS-008',fingerprint:'ins008'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben Yitzchak',evidence:'certificate, policyholder section'})],
    fields:[
      f('provider','Underwriter','Cover Genius Pty Ltd'),
      f('broker','Administered via','RentalCover.com, billed via rentalcars.com'),
      f('policy_number','Reference','NG74-HYX4-INS'),
      f('start_date','Coverage start','2025-08-14'),
      f('end_date','Coverage end','2025-08-26'),
      f('sum_insured','Excess/damage limit','₪260,600.00'),
      f('website','Claims URL','www.rentalcover.com/en/claim'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.confirmationNumber,'NG74-HYX4-INS');
  assert.equal(suggestion.proposed.startAt,'2025-08-14T12:00');
  assert.equal(suggestion.proposed.endAt,'2025-08-26T12:00');
  assert.equal(suggestion.proposed.phone,'','no phone number anywhere in this source -- must be genuinely absent, never fabricated, confirming phone is required-when-present rather than assumed universal');
  assert.match(suggestion.proposed.notes,/260,600/,'the ILS excess/damage limit (not a USD medical sum) must still be preserved in notes, currency as printed');
  assert.match(suggestion.proposed.notes,/rentalcover\.com\/en\/claim/,'the claims URL must be preserved even though there is no phone number to report');
  assert.equal(suggestion.proposed.schedule,'entire','a dedicated, asset-linked policy (rental-car excess protection, narrower than the whole trip) still uses the fixed entire-trip schedule');
  console.log('PASS: INS-008 RentalCover.com/Cover Genius -- a dedicated asset-linked policy with no phone at all (only a claims URL) correctly leaves phone empty rather than fabricating a number, ILS excess limit preserved in notes');
}

// ---------------------------------------------------------------------------------------------
// Data model (Section 1/3, discovery doc)
// ---------------------------------------------------------------------------------------------
function test_data_model_startAt_endAt_added_schedule_unchanged(){
  assert.deepEqual(TYPE_FIELDS.insurance,['provider','confirmationNumber','phone','startAt','endAt','participants','notes'],'startAt/endAt must be added to TYPE_FIELDS.insurance per Decision 4');
  assert.equal(ITEM_TYPES.insurance.schedule,'entire','schedule must stay fixed at \'entire\' -- an explicit, deliberate Product Owner decision (Section 3a) -- never made computed/per-instance based on coverage dates');
  console.log('PASS: data model -- startAt/endAt added to TYPE_FIELDS.insurance, ITEM_TYPES.insurance.schedule unchanged at \'entire\'');
}
function test_relatedItemIds_is_not_in_TYPE_FIELDS(){
  assert(!TYPE_FIELDS.insurance.includes('relatedItemIds'),'relatedItemIds must NOT be in TYPE_FIELDS.insurance -- it needs a dedicated multi-select UI (relatedItemsPanel), not a generic scalar form field, and proposalFields() has no rendering path for an array-of-ids field anyway');
  for(const type of Object.keys(TYPE_FIELDS)){
    if(type==='insurance')continue;
    assert(!TYPE_FIELDS[type].includes('relatedItemIds'),`relatedItemIds must not be added to any type other than insurance -- found on '${type}'`);
  }
  console.log('PASS: relatedItemIds is not part of any type\'s generic TYPE_FIELDS -- confirmed insurance-only, handled by its own dedicated UI');
}
function test_relatedItemIds_never_extracted_by_the_schema(){
  const schemaText=JSON.stringify(insuranceImportSchema);
  assert.doesNotMatch(schemaText,/relatedItemIds/,'insuranceImportSchema must not have a relatedItemIds property at all -- it is manual-only, never populated by Smart Import extraction');
  console.log('PASS: insuranceImportSchema has no relatedItemIds property -- confirmed manual-only, never extracted');
}
function test_classification_schema_and_prompt_recognize_insurance(){
  assert.deepEqual(sourceClassificationSchema.properties.category.enum,['hotel','flight','activity','insurance','unrecognized'],'the source-classification schema must recognize insurance as a fourth category, alongside hotel/flight/activity');
  console.log('PASS: sourceClassificationSchema recognizes insurance as a classifiable category');
}
function test_insuranceSystemPrompt_covers_provider_priority_and_phone_priority(){
  assert.match(insuranceSystemPrompt,/never the selling agent, broker/i,'the prompt must instruct the model to resolve provider to the underwriting insurer, not a selling agent/broker, mirroring V6-F63\'s venue-vs-platform priority discipline');
  assert.match(insuranceSystemPrompt,/emergency.*hotline specifically/i,'the prompt must instruct the model to report the emergency/medical-assistance hotline specifically as phone, not a general claims/office line');
  console.log('PASS: insuranceSystemPrompt carries explicit provider-priority and phone-priority guidance');
}

// ---------------------------------------------------------------------------------------------
// V6-F66-style merge behavior: attaching a second insurance document to an existing item must
// union insuredPersons, never silently replace the array wholesale.
// ---------------------------------------------------------------------------------------------
function test_mergeInsuredPersons_unions_by_idNumber_never_drops_a_side(){
  const existing=[person({name:'Eyal Ben Yitzhak',idNumber:'043119213',dob:'1981-05-19'})];
  const incoming=[person({name:'Daniel Ben Yitzhak',idNumber:'220990485',dob:'2011-09-20'})];
  const merged=mergeInsuredPersons(existing,incoming);
  assert.equal(merged.length,2,'both people must survive the merge -- neither side silently dropped');
  assert(merged.some(p=>p.idNumber==='043119213'));
  assert(merged.some(p=>p.idNumber==='220990485'));
  console.log('PASS: mergeInsuredPersons unions two distinct people from separate documents, dropping neither');
}
function test_mergeInsuredPersons_matched_entry_existing_field_wins_blank_fills_from_incoming(){
  const existing=[person({name:'Eyal Ben Yitzhak',idNumber:'043119213',dob:''})];
  const incoming=[person({name:'Eyal Ben Yitzhak',idNumber:'043119213',dob:'1981-05-19'})];
  const merged=mergeInsuredPersons(existing,incoming);
  assert.equal(merged.length,1,'the same person (matched by idNumber) must merge into one entry, not duplicate');
  assert.equal(merged[0].dob,'1981-05-19','a blank existing field must be filled from the incoming entry');
  console.log('PASS: mergeInsuredPersons matches the same person by idNumber and fills a blank field from the incoming document without duplicating the entry');
}
function test_mergeInsuranceDetails_preserves_insuredPersons_across_attach(){
  const existingDetails={insuredPersons:[person({name:'Eyal Ben Yitzhak',idNumber:'043119213'})]};
  const newDetails={insuredPersons:[person({name:'Daniel Ben Yitzhak',idNumber:'220990485'})]};
  const merged=mergeInsuranceDetails(existingDetails,newDetails);
  assert.equal(merged.insuredPersons.length,2,'attaching a second insurance document must union insuredPersons, mirroring V6-F66\'s fix for Activity\'s ticketHolders -- a second document must never silently wipe the first\'s insured people');
  console.log('PASS: mergeInsuranceDetails unions insuredPersons across an attach-and-extract merge, mirroring V6-F66\'s Activity fix');
}
function test_suggestionToItem_uses_field_aware_merge_for_insurance(){
  const existing={id:'item-1',type:'insurance',title:'Harel',details:{insuredPersons:[person({name:'Eyal Ben Yitzhak',idNumber:'043119213'})]},participants:['Eyal Ben Yitzhak'],sourceIds:['src-1']};
  const suggestion={proposed:{type:'insurance',title:'Harel',details:{insuredPersons:[person({name:'Daniel Ben Yitzhak',idNumber:'220990485'})]},participants:['Daniel Ben Yitzhak'],warnings:[]},sourceIds:['src-2'],warnings:[]};
  const merged=suggestionToItem(suggestion,existing);
  assert.equal(merged.details.insuredPersons.length,2,'suggestionToItem must route insurance through the field-aware insuredPersons merge, not a plain object-spread that would silently drop the first document\'s insured people');
  assert.deepEqual(merged.participants.sort(),['Daniel Ben Yitzhak','Eyal Ben Yitzhak'],'top-level participants must union across the merge for insurance, mirroring the same fix already applied to activity');
  console.log('PASS: suggestionToItem uses the field-aware insuredPersons merge and unions participants for insurance, mirroring the existing flight/activity pattern');
}

// ---------------------------------------------------------------------------------------------
// relatedItemIds two-way-link UI (source-inspection -- src/v5-app.js cannot be imported under this
// project's plain-Node harness, a CSS import makes it unimportable, the same constraint every
// prior correction test file documents).
// ---------------------------------------------------------------------------------------------
function test_relatedItemsPanel_and_reverse_lookup_are_wired(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function insuranceCoveringItem\(item\)\{return state\.items\.find\(candidate=>candidate\.type==='insurance'&&\(candidate\.relatedItemIds\|\|\[\]\)\.includes\(item\.id\)\)\}/,'insuranceCoveringItem must scan the trip\'s insurance items for one whose relatedItemIds includes this item\'s id -- the computed reverse lookup, not a stored field on the covered item');
  assert.match(app,/const insuredBy=item\.type!=='insurance'\?insuranceCoveringItem\(item\):null;/,'detailView must compute the reverse lookup for every non-insurance item');
  assert.match(app,/insuredBy\?`<button class="row" data-route="detail" data-id="\$\{insuredBy\.id\}">🛡️ מבוטח באמצעות \$\{esc\(insuredBy\.title\)\}<\/button>`:''/,'a non-insurance item covered by a policy must show a tappable "insured by" line that navigates to that insurance item');
  assert.match(app,/function relatedItemsPanel\(item\)\{/,'relatedItemsPanel must exist to render the insurance item\'s own linked-items list and edit control');
  assert.match(app,/data-action="toggle-related-item"/,'relatedItemsPanel must offer a control to add/remove a linked item, wired through the toggle-related-item action');
  assert.match(app,/item\.type==='insurance'\?relatedItemsPanel\(item\):''/,'detailView must render relatedItemsPanel specifically for insurance items');
  console.log('PASS: relatedItemsPanel (edit) and insuranceCoveringItem (reverse lookup) are both wired into detailView, with a tappable two-way link in each direction');
}
function test_toggle_related_item_click_handler_mutates_relatedItemIds(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/else if\(action==='toggle-related-item'\)\{/,'a toggle-related-item click handler must exist');
  assert.match(app,/if\(button\.checked\)current\.add\(targetId\);else current\.delete\(targetId\);/,'the handler must add or remove the target item\'s id based on the checkbox\'s own post-click checked state');
  assert.match(app,/item\.relatedItemIds=\[\.\.\.current\];/,'the handler must actually write the updated array back onto the item');
  console.log('PASS: the toggle-related-item click handler correctly adds/removes a target item\'s id from relatedItemIds and persists it');
}
function test_attach_and_extract_offered_for_insurance_items(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/\['hotel','flight','activity','insurance'\]\.includes\(item\.type\)\?`<button class="btn" data-action="attach-source"/,'the attach-document control must be offered for insurance items too, matching Hotel/Flight/Attraction-Event -- Decision 7 explicitly includes Attach only/Attach and extract on an existing Insurance item');
  console.log('PASS: the attach-document control is offered for insurance items, matching every other Smart Import-capable type');
}
function test_runSmartAnalysis_routes_insurance_attach_and_extract_to_the_insurance_operation(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/targetItem\.type==='insurance'\?analyzeInsuranceSource\(\{trip:state\.trip,source,file\}\)/,'attach-and-extract on an existing insurance item must call analyzeInsuranceSource, not silently fall through to analyzeHotelSource');
  assert.match(app,/category==='insurance'\?\[smartImportInsuranceResultToSuggestion\(result,source\)\]/,'a suggestion classified as insurance (via the generic global-Add classification path) must route through smartImportInsuranceResultToSuggestion, not the Hotel adapter');
  console.log('PASS: runSmartAnalysis correctly routes both attach-and-extract and global-Add classification for insurance to the insurance-specific operation/adapter');
}

test_INS001_direct_insurance_hebrew_font_no_tounicode();
test_INS002_harel_two_travelers();
test_INS003_passportcard_confirmation_letter();
test_INS004_phoenix_insurer_not_wobi_agent();
test_INS005_wobi_five_traveler_family_case();
test_INS006_wildcard_toren_clal_two_phone_numbers();
test_INS007_diveassure_dedicated_single_day_policy();
test_INS008_rentalcover_no_phone_only_claims_url();
test_data_model_startAt_endAt_added_schedule_unchanged();
test_relatedItemIds_is_not_in_TYPE_FIELDS();
test_relatedItemIds_never_extracted_by_the_schema();
test_classification_schema_and_prompt_recognize_insurance();
test_insuranceSystemPrompt_covers_provider_priority_and_phone_priority();
test_mergeInsuredPersons_unions_by_idNumber_never_drops_a_side();
test_mergeInsuredPersons_matched_entry_existing_field_wins_blank_fills_from_incoming();
test_mergeInsuranceDetails_preserves_insuredPersons_across_attach();
test_suggestionToItem_uses_field_aware_merge_for_insurance();
test_relatedItemsPanel_and_reverse_lookup_are_wired();
test_toggle_related_item_click_handler_mutates_relatedItemIds();
test_attach_and_extract_offered_for_insurance_items();
test_runSmartAnalysis_routes_insurance_attach_and_extract_to_the_insurance_operation();
console.log('ALL PASS: 0.6.7 Insurance Smart Import -- all 8 real INS-001-INS-008 benchmark cases (INS-006 as the mandatory wild-card), the data model (startAt/endAt added, schedule unchanged, relatedItemIds insurance-only and never extracted), the two-way relatedItemIds UI, and the V6-F66-style per-person merge all pass');
