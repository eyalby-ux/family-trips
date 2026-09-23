import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeInsuranceDetails,mergeInsuredPersons,smartImportInsuranceResultToSuggestion} from '../src/insurance-import-adapter.js';
import {ITEM_TYPES,TYPE_FIELDS,suggestionToItem} from '../src/ingestion.js';
import {insuranceImportSchema,insuranceSystemPrompt,sourceClassificationSchema} from '../netlify/functions/_shared/smart-import-schema.mjs';

// Every fixture below is a hand-verified transcription of the real INS-00x benchmark document at
// tests/fixtures/insurance_benchmark/, taken directly from the frozen field-by-field ground truth
// in INSURANCE_SMART_IMPORT_DISCOVERY.md (V3, Frozen) -- not synthesized. It represents the
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
      // V6-F75 (0.6.7.1): the live QA session found this resolved silently to "IDI Insurance
      // Company Ltd." (the legal underwriting entity) with the "ביטוח ישיר" brand name dropped
      // entirely, no needs_review flag. The fixed prompt instructs combining both names when a
      // source shows both together for the one same insurer -- this fixture represents that
      // corrected reading.
      f('provider','Provider','ביטוח ישיר / IDI Insurance Company Ltd.'),
      f('policy_number','Policy number','1595783600'),
      f('start_date','Coverage start','2023-02-03'),
      f('end_date','Coverage end','2023-02-07'),
      f('phone','Emergency phone','972-3-5655999'),
      f('claims_phone','Claims/office fax','03-5555545'),
      f('sum_insured','Sum insured (medical)','$5,000,000'),
      // V6-F76/V6-F77 (0.6.7.1): the insurer website was extracted correctly but had nowhere
      // structured to land -- see the dedicated V6-F76/V6-F77 tests below for the isolated case;
      // included here too since INS-001 is one of the three real documents the QA session
      // actually confirmed this on.
      f('website','Website','www.555.co.il'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'ביטוח ישיר / IDI Insurance Company Ltd.','V6-F75: the brand name and the legal underwriting entity must both be preserved, combined, not one silently dropped for the other');
  assert.equal(suggestion.proposed.confirmationNumber,'1595783600');
  assert.equal(suggestion.proposed.startAt,'2023-02-03T12:00');
  assert.equal(suggestion.proposed.endAt,'2023-02-07T12:00');
  assert.equal(suggestion.proposed.phone,'972-3-5655999','the emergency line, not the claims/office fax, must land in phone');
  assert.equal(suggestion.proposed.website,'www.555.co.il','V6-F76: the insurer website must land in the structured website field, not only in notes text');
  assert.match(suggestion.proposed.notes,/03-5555545/,'the separate claims/office fax must still be preserved, just in notes rather than phone');
  assert.match(suggestion.proposed.notes,/5,000,000/,'sum insured goes to notes per Decision 4, not a new structured field');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzhak']);
  assert.equal(suggestion.proposed.details.insuredPersons[0].idNumber,'043119213');
  console.log('PASS: INS-001 Direct Insurance -- numeric/date fields captured reliably despite the source PDF\'s own Hebrew-font ToUnicode limitation, emergency phone correctly separated from the claims fax, brand+legal-entity provider combined, website in its own structured field');
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
      f('website','Website','www.harel-group.co.il'), // V6-F76/V6-F77 (0.6.7.1)
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'Harel Insurance Company Ltd.');
  assert.equal(suggestion.proposed.startAt,'2026-07-12T12:00');
  assert.equal(suggestion.proposed.endAt,'2026-07-19T12:00');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzhak','Daniel Ben Yitzhak'],'both named, ID+DOB-identified travelers must be captured, each their own participant');
  assert.equal(suggestion.proposed.details.insuredPersons[1].dob,'2011-09-20','the second traveler\'s own DOB must never be attached to the first traveler\'s entry');
  assert.equal(suggestion.proposed.website,'www.harel-group.co.il','V6-F76: the insurer website must land in the structured website field, not only in notes text');
  console.log('PASS: INS-002 Harel -- two named, ID+DOB-identified travelers correctly captured as separate insuredPersons/participants, website in its own structured field');
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
      // V6-F81 (0.6.7.1): the live QA session's actual result resolved provider to "DavidShield
      // Insurance Company LTD" alone with a needs_review flag about the dropped "PassportCard"
      // brand name -- honest, but incomplete, since the source shows both names together with no
      // genuine ambiguity about either. The fixed prompt (same paragraph that fixes V6-F75)
      // instructs combining both, matching the discovery document's own catalogued format below.
      f('provider','Provider','PassportCard / DavidShield Insurance Company Ltd.'),
      f('policy_number','Policy number','306117447'),
      f('start_date','Coverage start','2022-11-28'),
      f('end_date','Coverage end','2022-12-02'),
      f('phone','Emergency phone','+972-98920930'),
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'PassportCard / DavidShield Insurance Company Ltd.','V6-F81: both the customer-facing brand and the legal entity name must be combined, not one reported with a needs_review flag about the other, when the source shows both together with no genuine ambiguity');
  assert.equal(suggestion.proposed.confirmationNumber,'306117447');
  assert.equal(suggestion.proposed.startAt,'2022-11-28T12:00');
  assert.equal(suggestion.proposed.endAt,'2022-12-02T12:00');
  assert.equal(suggestion.proposed.phone,'+972-98920930');
  assert.deepEqual(suggestion.proposed.participants,['Kohan Paola','Ben Yitzhak Daniel']);
  console.log('PASS: INS-003 PassportCard -- a confirmation-letter shape (no premium/invoice content) still extracts cleanly, both travelers captured');
}

// ---------------------------------------------------------------------------------------------
// INS-004 -- Phoenix. 0.6.7.2 documentation correction: this document does NOT name Wobi at all
// (the V1-V4 discovery-document catalogue's "sold via agent Wobi Insurance Agencies Ltd." was a
// cross-document mix-up with INS-005, confirmed against the real source PDF during the 0.6.7.1
// acceptance session -- see INSURANCE_SMART_IMPORT_DISCOVERY.md V5). This fixture previously
// carried a fabricated `broker` field reflecting that wrong catalogue entry; removed. The document
// DOES show a distinct "SMART TRAVEL" plan/product name near the provider, which the live
// extraction incorrectly combined into provider ("הפניקס / SMART TRAVEL") during the 0.6.7.1
// session -- V6-F84, fixed via insuranceSystemPrompt (see the dedicated prompt-text regression
// test below; a plan-name-pollution bug lives entirely in the model's own reading of the prompt,
// not in this adapter, so it cannot be exercised by an adapter-level fixture like this one).
// ---------------------------------------------------------------------------------------------
function test_INS004_phoenix_provider_stays_clean_of_plan_name(){
  const source={id:'src-ins004',name:'INS-004',fingerprint:'ins004'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben-Yitzhak',idNumber:'43119213',dob:'1981-05-19',evidence:'policy holder section'})],
    fields:[
      f('provider','Insurer','Phoenix Insurance Company Ltd.'),
      f('policy_number','Policy number','21/121/667/1017370'),
      f('start_date','Coverage start','2021-06-17'),
      f('end_date','Coverage end','2021-06-20'),
      f('phone','Emergency phone (MEDASSIS)','+972-3-7331177'),
      // 0.6.7.1 documentation correction: the discovery document's originally-catalogued number
      // here, 03-7338141, was itself wrong -- confirmed against the real source PDF during the
      // 0.6.7 acceptance session. The correct printed number is 03-7332222.
      f('claims_phone','Customer service (office hours only)','03-7332222'),
      f('website','Website','WWW.FNX.CO.IL'), // V6-F76/V6-F77 (0.6.7.1)
    ],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'Phoenix Insurance Company Ltd.','provider must be the underwriting insurer alone, with no plan/product name (e.g. "SMART TRAVEL") appended -- V6-F84\'s exact failure mode, and no Wobi at all, which this document never names');
  assert.doesNotMatch(suggestion.proposed.notes,/Wobi/,'this document never names Wobi -- the 0.6.7.1-era fixture incorrectly asserted a Wobi broker note here, a documentation-catalogue mix-up with INS-005, corrected in INSURANCE_SMART_IMPORT_DISCOVERY.md V5');
  assert.equal(suggestion.proposed.phone,'+972-3-7331177','the 24/7 MEDASSIS emergency line, not the office-hours-only customer service number');
  assert.match(suggestion.proposed.notes,/03-7332222/,'the office-hours-only customer service line must land in notes, not phone');
  assert.equal(suggestion.proposed.website,'WWW.FNX.CO.IL','V6-F76: the insurer website must land in the structured website field, not only in notes text');
  console.log('PASS: INS-004 Phoenix -- provider resolves to the underwriting insurer alone (no Wobi, which this document never names, and no plan/product name pollution); emergency phone correctly separated from the office-hours customer service line; website in its own structured field');
}

// ---------------------------------------------------------------------------------------------
// INS-005 -- Wobi booking confirmation. A different document shape (broker/comparison-site order
// confirmation, not a final insurer-issued policy) -- the largest real case, five travelers.
// ---------------------------------------------------------------------------------------------
function test_INS005_wobi_five_traveler_family_case(){
  const source={id:'src-ins005',name:'INS-005',fingerprint:'ins005'};
  const result=draftResult({
    // 0.6.7.1 documentation correction: the discovery document originally had Daniel's and Amit's
    // IDs swapped -- confirmed against the real source PDF during the 0.6.7 acceptance session.
    // Correct: Daniel = 220990485 (consistent with the same person's ID on INS-002/INS-003),
    // Amit = 340255835.
    insuredPersons:[
      person({name:'Eyal Ben Yitzhak',idNumber:'043119213',evidence:'order confirmation, traveler 1'}),
      person({name:'Paola Cohen',idNumber:'303597751',evidence:'order confirmation, traveler 2'}),
      person({name:'Amit Ben Yitzhak',idNumber:'340255835',evidence:'order confirmation, traveler 3'}),
      person({name:'Daniel Ben Yitzhak',idNumber:'220990485',evidence:'order confirmation, traveler 4'}),
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
  // V6-F76 (0.6.7.1): a claims URL is a website-shaped value, so it now correctly lands in the
  // structured website field (previously it had nowhere structured to go and fell into notes).
  assert.equal(suggestion.proposed.website,'www.rentalcover.com/en/claim','the claims URL must be preserved even though there is no phone number to report -- now via the structured website field rather than notes');
  assert.equal(suggestion.proposed.schedule,'entire','a dedicated, asset-linked policy (rental-car excess protection, narrower than the whole trip) still uses the fixed entire-trip schedule');
  console.log('PASS: INS-008 RentalCover.com/Cover Genius -- a dedicated asset-linked policy with no phone at all (only a claims URL) correctly leaves phone empty rather than fabricating a number, ILS excess limit preserved in notes');
}

// ---------------------------------------------------------------------------------------------
// Data model (Section 1/3, discovery doc)
// ---------------------------------------------------------------------------------------------
function test_data_model_startAt_endAt_added_schedule_unchanged(){
  // V6-F76/V6-F77 (0.6.7.1): 'website' added alongside startAt/endAt -- see the dedicated tests
  // below for why this single addition fixes both findings at once.
  assert.deepEqual(TYPE_FIELDS.insurance,['provider','confirmationNumber','website','phone','startAt','endAt','participants','notes'],'startAt/endAt (0.6.7) and website (0.6.7.1, V6-F76/V6-F77) must be in TYPE_FIELDS.insurance');
  assert.equal(ITEM_TYPES.insurance.schedule,'entire','schedule must stay fixed at \'entire\' -- an explicit, deliberate Product Owner decision (Section 3a) -- never made computed/per-instance based on coverage dates');
  console.log('PASS: data model -- startAt/endAt/website added to TYPE_FIELDS.insurance, ITEM_TYPES.insurance.schedule unchanged at \'entire\'');
}
// ---------------------------------------------------------------------------------------------
// V6-F76/V6-F77 (0.6.7.1): root cause confirmed by direct code trace, not inference --
// proposalFields() (src/v5-app.js) only renders 'website' when TYPE_FIELDS[type] includes it OR
// p.website is already truthy; the insurance adapter never populated proposed.website at all
// (V6-F76's cause -- the value landed in notes via the otherFields fallback instead), so the
// field never appeared on the FIRST suggestion-review screen (V6-F77's cause). editModal() alone
// passes {alwaysWebsite:true}, which is why the field appeared only after save+reopen -- the one
// case that forces it regardless of TYPE_FIELDS/p.website. Fixing the adapter mapping (tested via
// the INS-001/INS-002/INS-004 fixtures above, all three real documents the QA session actually
// confirmed this on) also fixes the missing-field symptom, since it makes 'website' a permanent
// member of TYPE_FIELDS.insurance rather than depending on the alwaysWebsite special case.
// ---------------------------------------------------------------------------------------------
function test_V6_F76_website_lands_in_structured_field_not_only_notes(){
  const source={id:'src-website',name:'website-case',fingerprint:'website-case'};
  const result=draftResult({
    insuredPersons:[person({name:'Eyal Ben Yitzhak'})],
    fields:[f('provider','Provider','Test Insurer'),f('website','Website','www.example-insurer.co.il')],
  });
  const suggestion=smartImportInsuranceResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.website,'www.example-insurer.co.il','the website value must land in the structured proposed.website field');
  assert.doesNotMatch(suggestion.proposed.notes,/example-insurer/,'a website mapped to its own structured field must not ALSO be duplicated into notes via the otherFields fallback');
  console.log('PASS: V6-F76 a correctly-extracted insurer website lands in the structured website field, not only in notes text');
}
function test_V6_F77_website_field_is_a_permanent_TYPE_FIELDS_member_not_only_alwaysWebsite(){
  // Source-inspection: confirms proposalFields()'s own alwaysWebsite special case still exists
  // (unrelated to this fix, still needed for every other type), but that insurance no longer
  // DEPENDS on it -- 'website' being a genuine TYPE_FIELDS.insurance member (asserted directly
  // above, test_data_model_startAt_endAt_added_schedule_unchanged) is what makes the field render
  // on the very first suggestion-review screen, not only in the post-save edit form.
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/alwaysWebsite:true/,'editModal must still force the website field for every type (unchanged, unrelated to this fix)');
  assert(TYPE_FIELDS.insurance.includes('website'),'insurance must no longer rely solely on editModal\'s alwaysWebsite special case to ever show a website field -- it must be a genuine TYPE_FIELDS member, rendered on the first suggestion-review screen too');
  console.log('PASS: V6-F77 the website field no longer depends solely on the post-save edit form\'s alwaysWebsite special case -- it is now a genuine TYPE_FIELDS.insurance member, rendered from the first suggestion-review screen onward');
}
// ---------------------------------------------------------------------------------------------
// V6-F78 (0.6.7.1, hard blocker) -- .tif/.tiff rejected by a MIME/extension allowlist that never
// included TIFF, at three layers: the client-side accept attributes (global Add + attach-and-
// extract), the actual client-side validateSmartSource check that produced the reported alert,
// and the server-side prepareSource check. All three fixed together, plus inferMime's own
// fallback-MIME-guessing gap (would have mislabeled a .tif with an empty file.type as image/jpeg).
// ---------------------------------------------------------------------------------------------
function test_V6_F78_client_validation_accepts_tif(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function validateSmartSource\(kind,file,url\)\{/,'validateSmartSource must exist');
  const fn=app.slice(app.indexOf('function validateSmartSource(kind,file,url){'));
  const isImageLine=fn.slice(0,fn.indexOf(';if(kind'));
  assert(isImageLine.includes('png|jpeg|webp|tiff'),'validateSmartSource\'s isImage MIME check must recognize image/tiff, alongside the existing png/jpeg/webp');
  assert(isImageLine.includes('.tiff?$/i.test(file.name)'),'validateSmartSource\'s isImage check must also fall back to a .tif/.tiff filename check (mirroring isPdf\'s own MIME-or-filename fallback), since TIFF MIME-type detection is less universal across browsers/OS than PNG/JPEG');
  console.log('PASS: V6-F78 validateSmartSource (the actual source of the reported "must choose PDF or image" alert) now accepts TIFF, by MIME type and by filename fallback');
}
function test_V6_F78_file_inputs_accept_tif_for_both_entry_points(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  const acceptAttr='accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff"';
  const count=app.split(acceptAttr).length-1;
  assert.equal(count,2,'both file-input entry points -- global Add\'s smartImportPanel and the existing-item attachmentModal -- must accept TIFF, confirmed broken at both entry points during the 0.6.7 acceptance session');
  console.log('PASS: V6-F78 both confirmed-broken entry points (global Add and existing-item attach-and-extract) accept .tif/.tiff files');
}
function test_V6_F78_server_side_prepareSource_accepts_tiff_mime(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert(server.includes('png|jpeg|webp|tiff'),'the server-side prepareSource MIME check must also accept image/tiff, so a client fix alone cannot silently be undone by a server-side rejection later in the same pipeline');
  assert(server.includes('Only PNG, JPEG, WebP and TIFF images are supported.'),'the server-side error message must be updated to reflect that TIFF is now supported, not left describing the old, narrower allowlist');
  console.log('PASS: V6-F78 the server-side prepareSource MIME allowlist also accepts image/tiff, matching the client-side fix');
}
function test_V6_F78_inferMime_recognizes_tiff_filenames(){
  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert(client.includes("test(name)?'image/tiff'"),'inferMime must recognize a .tif/.tiff filename and return image/tiff -- previously it had no TIFF branch at all and would have mislabeled a .tif file with an empty file.type as image/jpeg, corrupting the actual bytes sent to the server/model even after the upload itself was no longer rejected');
  console.log('PASS: V6-F78 inferMime correctly recognizes a .tif/.tiff filename and reports image/tiff, not the image/jpeg default');
}
// ---------------------------------------------------------------------------------------------
// V6-F79 (0.6.7.1, Product Owner real-world feedback) -- the relatedItemIds picker's ADD-candidate
// list must exclude other Insurance items (insurance-covering-insurance isn't meaningful), while
// an already-existing link (however it got there) must still be shown/tappable regardless of type.
// ---------------------------------------------------------------------------------------------
function test_V6_F79_relatedItemsPanel_excludes_insurance_from_add_candidates(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/const candidates=state\.items\.filter\(candidate=>candidate\.id!==item\.id&&candidate\.type!=='insurance'\);/,'the ADD-candidate checklist must exclude other insurance items, per the Product Owner\'s real-world feedback during the 0.6.7 acceptance session -- Section 3a\'s frozen "no type restriction" wording still applies to every other type');
  assert.match(app,/const linkedItems=state\.items\.filter\(candidate=>candidate\.id!==item\.id&&linkedIds\.has\(candidate\.id\)\);/,'the already-LINKED list must remain unrestricted by type, so a pre-existing link is never silently hidden by this fix');
  console.log('PASS: V6-F79 the relatedItemIds picker\'s add-candidate list excludes other insurance items; already-linked items remain visible regardless of type');
}
// ---------------------------------------------------------------------------------------------
// V6-F75/V6-F81 (0.6.7.1) -- both are the same underlying pattern: a source names both a
// customer-facing brand and a distinct legal underwriting entity for the ONE same insurer.
// V6-F75 (INS-001) silently substituted the legal entity for the brand with no flag at all;
// V6-F81 (INS-003) reported one with an honest needs_review flag about the other. Neither is what
// Decision 4 actually wants when the source shows both together with no genuine ambiguity: this
// is prompt-only guidance (there is no adapter-level parsing of "which of two names is which" --
// the model itself must recognize and combine them), so regression coverage here is
// source-inspection of the prompt text, plus the end-to-end adapter fixtures above
// (INS-001/INS-003) proving a correctly-combined string flows through cleanly to proposed.provider.
// ---------------------------------------------------------------------------------------------
function test_V6_F75_V6_F81_insuranceSystemPrompt_instructs_combining_brand_and_legal_entity(){
  assert.match(insuranceSystemPrompt,/report provider as the combination "<brand name> \/ <legal entity name>"/,'the prompt must explicitly instruct combining a customer-facing brand name and a distinct legal underwriting entity name for the same insurer, rather than silently dropping one (V6-F75) or flagging needs_review about one while keeping only the other (V6-F81)');
  assert.match(insuranceSystemPrompt,/never drop one silently in favor of the other/,'the prompt must explicitly warn against silently dropping one of the two names -- V6-F75\'s exact observed failure mode');
  console.log('PASS: V6-F75/V6-F81 insuranceSystemPrompt explicitly instructs combining a brand name and a legal entity name for the same insurer, rather than silently dropping or flagging one');
}
// ---------------------------------------------------------------------------------------------
// V6-F84 (0.6.7.2) -- the V6-F75/V6-F81 brand+legal-entity combination fix over-fired on INS-004
// (Phoenix), appending its "SMART TRAVEL" plan/product name into provider as if it were a second
// entity name ("הפניקס / SMART TRAVEL"). Prompt-only, same reason V6-F75/V6-F81 above are: there is
// no adapter-level way to tell a plan name from a company name, only the model reading the prompt
// can. Regression coverage is source-inspection of the new distinguishing paragraph, plus the
// INS-004 fixture above (test_INS004_phoenix_provider_stays_clean_of_plan_name) proving a
// correctly-clean provider string flows through the adapter untouched.
// ---------------------------------------------------------------------------------------------
function test_V6_F84_insuranceSystemPrompt_distinguishes_plan_name_from_second_entity(){
  assert.match(insuranceSystemPrompt,/plan, product, coverage-tier or package name/i,'the prompt must explicitly name the plan/product/edition-name pattern as distinct from the brand+legal-entity pattern above it');
  assert.match(insuranceSystemPrompt,/do not combine it into provider at all/,'the prompt must explicitly instruct NOT combining a plan/product name into provider -- V6-F84\'s exact observed failure mode (the SMART TRAVEL plan name appended to Phoenix\'s provider)');
  assert.match(insuranceSystemPrompt,/SMART TRAVEL/,'the prompt should reference the actual real-world example that exposed this bug, mirroring how the brand+legal-entity paragraph above it cites PassportCard/DavidShield');
  console.log('PASS: V6-F84 insuranceSystemPrompt explicitly distinguishes a plan/product/edition name (must stay out of provider) from a genuine second entity name (must be combined), preventing the SMART TRAVEL-into-Phoenix pollution');
}
// ---------------------------------------------------------------------------------------------
// V6-F83 (0.6.7.2) -- INS-003's website field extracted correctly in only 1 of 4 identical live
// runs during the 0.6.7.1 acceptance session, a genuine model-sampling non-determinism issue (this
// benchmark's own fixture PDF, INS-003_PassportCard.pdf, shows no website value in its plain-text
// layer at all -- consistent with the Product Owner's own observation that the value is visually
// present but easy to miss, likely near a logo/signature rather than a labelled field, exactly the
// class of low-prominence placement this fix targets). No live-model verification is possible from
// this environment (no API access); the fix is prompt-tightening only, following this project's own
// established precedent (V6-F53/V6-F65/V6-F72) that a live-model consistency issue can only be
// addressed via strengthened prompt wording, never guaranteed fixed from static analysis alone.
// ---------------------------------------------------------------------------------------------
function test_V6_F83_insuranceSystemPrompt_reinforces_website_thoroughness(){
  assert.match(insuranceSystemPrompt,/website specifically deserves the same active-search diligence/,'the prompt must explicitly call out website as needing the same active-search diligence as any required-when-present field, not a best-effort glance -- V6-F83\'s exact failure mode (correctly read in only 1 of 4 identical runs)');
  assert.match(insuranceSystemPrompt,/footer band, beside a logo, next to a signature line, in a stamp/,'the prompt must name the specific low-prominence positions a website value is easy to miss in, not just a generic "look harder" instruction');
  console.log('PASS: V6-F83 insuranceSystemPrompt reinforces website-field thoroughness with specific low-prominence placement examples, targeting the observed 1-of-4-runs non-determinism (prompt-only fix -- full determinism cannot be verified without live-model access from this environment)');
}
// ---------------------------------------------------------------------------------------------
// V6-F85 (0.6.7.2, hard blocker, second attempt at the same mandatory wild-card) -- the V6-F78 fix
// (0.6.7.1) only cleared the upload-time allowlist; .tif now passes upload but the raw TIFF bytes
// were still handed directly to the vision model, which rejects TIFF outright ("does not represent
// a valid image... supported image formats: jpeg, png, gif, webp"). Fixed with a server-side
// TIFF->PNG conversion (convertTiffToPng, netlify/functions/smart-import.mjs) inserted into
// prepareSource before the extraction call, using pure-JS decode/encode (utif2/pngjs, no native
// binary -- safe inside an esbuild-bundled Netlify Function). Per this correction package's own
// explicit verification bar (this is a second attempt at the same mandatory test; V6-F78's own
// narrower test passed while this failure mode still existed underneath it), this test asserts a
// REAL completed conversion against the ACTUAL INS-006 fixture file -- not a mock, not merely the
// absence of an error -- decoding it back with an independent PNG reader (pngjs itself) and
// confirming the real pixel dimensions (1654x2339, confirmed via direct TIFF-header inspection of
// the fixture: little-endian, bps=1, CCITT Group 4, PhotometricInterpretation=WhiteIsZero -- a
// genuinely representative bi-level fax-style scan, exactly the shape a naive "any TIFF" test could
// miss). This does not and cannot verify the OpenAI vision call itself succeeds against the
// converted PNG (no live API access from this environment) -- that remains a Product Owner
// acceptance-session step, same honest limitation already recorded for the V6-F78/V6-F75/V6-F81
// live-model-dependent fixes above.
// ---------------------------------------------------------------------------------------------
async function test_V6_F85_tiff_conversion_produces_real_decodable_png_from_actual_fixture(){
  const {convertTiffToPng}=await import('../netlify/functions/smart-import.mjs');
  const {PNG}=await import('pngjs');
  const tiffBytes=fs.readFileSync(new URL('./fixtures/insurance_benchmark/INS-006_TorenInsurance.tif',import.meta.url));
  const pngBytes=await convertTiffToPng(tiffBytes);
  assert(pngBytes.length>0,'convertTiffToPng must return non-empty output for the real INS-006 fixture');
  assert.equal(pngBytes[0],0x89,'output must be a valid PNG (magic byte 1)');
  assert.equal(pngBytes[1],0x50,'output must be a valid PNG (magic byte 2, "P")');
  assert.equal(pngBytes[2],0x4e,'output must be a valid PNG (magic byte 3, "N")');
  assert.equal(pngBytes[3],0x47,'output must be a valid PNG (magic byte 4, "G")');
  const decoded=PNG.sync.read(pngBytes);
  assert.equal(decoded.width,1654,'the converted PNG must preserve the real fixture\'s actual pixel width -- a real completed conversion, not a mocked/stubbed format check');
  assert.equal(decoded.height,2339,'the converted PNG must preserve the real fixture\'s actual pixel height');
  console.log('PASS: V6-F85 convertTiffToPng produces a real, independently-decodable PNG from the actual INS-006 fixture (a genuine bi-level, CCITT Group 4-compressed 2010 scan), preserving its exact pixel dimensions -- a real completed conversion result, not merely the absence of an error');
}
function test_V6_F85_prepareSource_is_wired_to_convertTiffToPng(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert(server.includes("if(source.kind==='image'&&mime==='image/tiff'){outBytes=await convertTiffToPng(bytes);outMime='image/png'}"),'prepareSource must actually call convertTiffToPng and use its PNG output (and image/png mime) for a TIFF source -- the V6-F78 upload-allowlist fix alone is not sufficient, since the vision model itself rejects raw TIFF bytes regardless of what the upload layer allowed through');
  console.log('PASS: V6-F85 prepareSource is wired to convert a TIFF source to PNG before the extraction call, not merely to allow the upload through');
}
// ---------------------------------------------------------------------------------------------
// V6-F86 (0.6.7.3, hard blocker, third consecutive failure on the same mandatory wild-card) --
// INS-006 now extracts and converts correctly end-to-end (policy number, policyholder, coverage
// dates all correct per V6-F85), but provider resolved to "Harel Insurance Company Ltd." -- a
// completely unrelated company that appears nowhere in this document (the real source's own
// crystal-clear title bar reads "כלל חברה לביטוח בע\"מ", Clal). Confirmed by direct investigation:
// (1) the extraction pipeline is fully stateless per request (smart-import.mjs's callExtraction
// builds a fresh `input` array per call, store:false, no previous_response_id/shared context --
// literal cross-document leakage is not structurally possible); (2) the actual converted PNG was
// regenerated and visually inspected -- the "כלל חברה לביטוח בע\"מ" title bar is bold white-on-
// black, near-maximum contrast, unambiguously legible, ruling out V6-F85's TIFF->PNG conversion
// as a quality-degradation cause. This is a genuine model hallucination/pattern-completion failure
// (Harel is the provider for INS-002/INS-005 elsewhere in this same benchmark -- a plausible-
// sounding, real, commonly-seen name substituted for what this specific source actually shows),
// not a legibility or code-path bug. Fixed with a new insuranceSystemPrompt paragraph, mirroring
// activitySystemPrompt's own established anti-hallucination discipline: confidence is not
// evidence, a provider value must be traceable to literal visible text, and heightened scrutiny
// applies specifically to scanned/fax-quality sources. Deliberately does not name "Harel" or
// "Clal" in the prompt text itself (unlike this comment) -- naming either would risk biasing the
// model away from ever correctly reporting Harel on INS-002/INS-005, exactly the kind of
// overcorrection V6-F84 already demonstrated this exact code path is prone to.
// ---------------------------------------------------------------------------------------------
function test_V6_F86_insuranceSystemPrompt_warns_against_confident_provider_hallucination(){
  assert.match(insuranceSystemPrompt,/A wrong provider reported with confidence is worse than an honest needs_review flag/,'the prompt must explicitly warn that a confident wrong provider is worse than an honest needs_review flag -- V6-F86\'s exact failure mode (Harel reported for INS-006 with no flag at all)');
  assert.match(insuranceSystemPrompt,/confidence itself is not evidence/,'the prompt must explicitly state that confidence is not evidence, directly countering a fluent-but-wrong hallucination');
  assert.match(insuranceSystemPrompt,/heightened scrutiny/,'the prompt must call for heightened scrutiny specifically on scanned/fax-quality sources, where pattern-completion from general knowledge is most tempting');
  assert.doesNotMatch(insuranceSystemPrompt,/Harel|Clal/,'the prompt must not name the specific real companies involved in this bug -- doing so would risk biasing the model away from ever correctly reporting Harel on INS-002/INS-005 elsewhere in this same benchmark, the same overcorrection risk V6-F84 already demonstrated on this exact code path');
  console.log('PASS: V6-F86 insuranceSystemPrompt explicitly warns against confident provider hallucination, without naming the specific real companies involved (avoiding an INS-002/INS-005 Harel-reporting regression)');
}
// ---------------------------------------------------------------------------------------------
// V6-F86 (0.6.7.4, 4th consecutive round, same failure identically) -- the Product Owner re-tested
// 0.6.7.3 specifically against this finding and found provider STILL resolved to the exact same
// wrong "Harel Insurance Company Ltd." value, with no needs_review flag -- unchanged from before
// the 0.6.7.3 "fix". Root-cause investigation of the DISCONNECT between that report and live
// behavior (not just re-guessing at the extraction bug) found no evidence of a wrong deployed
// commit, a duplicate/shadow prompt file, or a broken import/wiring chain -- the 0.6.7.3 paragraph
// genuinely is present, correctly wired, and was deployed. What WAS a genuine gap: the 0.6.7.3
// regression test for this finding is pure source-inspection of the exported insuranceSystemPrompt
// string -- it never invokes callExtraction/prepareSource or the real model call at all, so a
// passing test there was only ever proof the STRING changed, never proof the MODEL'S BEHAVIOR
// changed. That gap is inherent to every prompt-only fix in this whole correction lineage (V6-F53/
// V6-F65/V6-F72/V6-F75/V6-F81/V6-F83/V6-F84 all carry the same honestly-recorded "cannot verify
// against the live model from this environment" caveat) -- V6-F86 is simply the first case where
// that unverified gap turned out to matter. Given a soft "be careful" paragraph evidently did not
// change this specific document's outcome at all, 0.6.7.4 adds a stronger, more OPERATIONAL
// requirement: provider's evidence must be a literal, verbatim transcription of the printed text,
// not a paraphrase or location description -- a concrete task that is only satisfiable by actually
// reading the source (fabricating a specific literal quote is a meaningfully harder failure mode
// to fall into than naming a plausible company from memory). This fix remains UNVERIFIED against
// the live model from this environment (no OpenAI API access, and the qa app requires Google
// sign-in restricted to authorized users, which this environment does not have) -- per this
// package's own strengthened closure bar, it is NOT reported as Fixed; see the correction report's
// own explicit statement of what could and could not be verified.
// ---------------------------------------------------------------------------------------------
function test_V6_F86_insuranceSystemPrompt_requires_literal_quoted_evidence_for_provider(){
  assert.match(insuranceSystemPrompt,/evidence must contain a literal, verbatim transcription of the actual company-name text/,'the prompt must require a literal, verbatim transcription of the printed provider text as evidence -- a concrete, checkable task rather than an abstract "be careful" instruction, since the softer 0.6.7.3 paragraph alone did not change this document\'s reported outcome at all (V6-F86, 4th consecutive round, identical failure)');
  assert(insuranceSystemPrompt.includes('copy the exact characters'),'the prompt must instruct copying the exact printed characters, not a paraphrase or description');
  assert(insuranceSystemPrompt.includes('not translated or normalized'),'the prompt must forbid a translated/normalized "transcription" -- that could still be fabricated without ever actually reading the source');
  assert.match(insuranceSystemPrompt,/that is proof you do not actually have the reading/,'the prompt must explicitly frame an unproducible literal quote as proof the model does not actually have a grounded reading, directing it to needs_review rather than inventing a quote to satisfy the requirement');
  assert.doesNotMatch(insuranceSystemPrompt,/Harel|Clal/,'the prompt must still not name the specific real companies involved in this bug (unchanged discipline from the first V6-F86 attempt)');
  console.log('PASS: V6-F86 (0.6.7.4 attempt) insuranceSystemPrompt now requires a literal, verbatim transcription of the printed provider text as evidence -- a concrete grounding mechanism, not merely restated caution -- though this remains unverified against the live model from this environment (no API access, and the qa app\'s Google sign-in is restricted to authorized users this environment does not have)');
}
// ---------------------------------------------------------------------------------------------
// V6-F87 (0.6.7.3, then a second attempt in 0.6.7.4) -- opening a .tif attachment silently
// downloads it instead of previewing inline, unlike every other supported type (PDF/PNG/JPEG/
// WebP), all of which every browser already renders inline from a blob: URL opened the same way
// openSource opens every attachment. No browser renders TIFF natively, so the download itself is
// correct/unavoidable behavior, not a bug in itself -- the bug is that it happens silently, with
// no explanation, inconsistent with every other type's working inline preview.
// The 0.6.7.3 fix explained the download via a notify() toast called AFTER open() -- confirmed
// (by fetching the actual live 0.6.7.3 qa bundle directly) to be genuinely present and correctly
// deployed, yet the Product Owner's 0.6.7.4 retest still saw no message at all, identically to
// before that fix. notify()'s toast auto-dismisses after 2.6s and open(url,'_blank') immediately
// shifts browser attention to a new tab/download -- a real, plausible reason the toast was
// technically firing but never actually seen. The 0.6.7.4 fix replaces it with a BLOCKING alert()
// (this codebase's own established pattern for a message that must not be missed -- see
// validateSmartSource's own alert(error.message) elsewhere in this file), shown BEFORE open()
// starts the download, not after -- removing the tab-focus race entirely rather than trying to
// out-time it.
// ---------------------------------------------------------------------------------------------
function test_V6_F87_openSource_explains_tiff_download_instead_of_silent_inconsistency(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  // 0.7.6: openSource() gained a few extra comment lines (DESIGN_V1.md §2's message-wording fix) --
  // widened from 2500 to keep both the isTiff/alert() logic and the open() call inside this window.
  const fn=app.slice(app.indexOf('async function openSource(id){'),app.indexOf('async function openSource(id){')+2900);
  assert(fn.includes("const isTiff=(record.type||'')==='image/tiff'||/\\.tiff?$/i.test(record.name||'');"),'openSource must detect a TIFF source by stored MIME type or filename fallback (mirroring validateSmartSource/inferMime\'s own established MIME-or-filename pattern), since record.type can be empty depending on browser/OS');
  assert(fn.includes("if(isTiff)alert('קובצי TIFF אינם נתמכים לתצוגה בדפדפן — הקובץ יורד למכשיר לאחר אישור זה');"),'openSource must alert() (a blocking, cannot-be-missed dialog -- this codebase\'s own established pattern) the user when a TIFF will download instead of preview inline -- 0.6.7.3\'s notify()-based fix was confirmed present in that build\'s live deployed bundle yet still went unnoticed, so this round upgrades to a mechanism that cannot be missed regardless of tab-focus timing');
  const alertIndex=fn.indexOf("if(isTiff)alert(");
  const openIndex=fn.indexOf("open(url,'_blank','noopener')");
  assert(alertIndex>-1&&openIndex>-1&&alertIndex<openIndex,'the alert() must fire BEFORE open()/the download starts, not after -- this is what actually eliminates the tab-focus race (0.6.7.3\'s notify() fired after open(), when attention had already shifted to the new tab/download)');
  console.log('PASS: V6-F87 openSource now blocks with an alert() BEFORE a TIFF attachment downloads, eliminating the tab-focus race that made 0.6.7.3\'s after-the-fact notify() toast go unseen despite being genuinely present in that build\'s live bundle');
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
// 0.7.4 (V6-F82): insuranceCoveringItem() returned only the FIRST matching policy (.find()) --
// an item covered by more than one policy silently had every additional one hidden from the
// reverse-lookup. Renamed insuranceCoveringItems() (plural), .filter() instead of .find(), and
// detailView renders one "insured by" line per match instead of at most one.
function test_relatedItemsPanel_and_reverse_lookup_are_wired(){
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  assert.match(app,/function insuranceCoveringItems\(item\)\{return state\.items\.filter\(candidate=>candidate\.type==='insurance'&&\(candidate\.relatedItemIds\|\|\[\]\)\.includes\(item\.id\)\)\}/,'insuranceCoveringItems must scan the trip\'s insurance items for EVERY one whose relatedItemIds includes this item\'s id (V6-F82: not just the first)');
  assert.match(app,/const insuredByList=item\.type!=='insurance'\?insuranceCoveringItems\(item\):\[\];/,'detailView must compute the reverse lookup for every non-insurance item');
  assert.match(app,/insuredByList\.map\(policy=>`<button class="row" data-route="detail" data-id="\$\{policy\.id\}">🛡️ מבוטח באמצעות \$\{esc\(policy\.title\)\}<\/button>`\)\.join\(''\)/,'a non-insurance item covered by one or more policies must show a tappable "insured by" line for EACH one, not just the first');
  assert.match(app,/function relatedItemsPanel\(item\)\{/,'relatedItemsPanel must exist to render the insurance item\'s own linked-items list and edit control');
  assert.match(app,/data-action="toggle-related-item"/,'relatedItemsPanel must offer a control to add/remove a linked item, wired through the toggle-related-item action');
  assert.match(app,/item\.type==='insurance'\?relatedItemsPanel\(item\):''/,'detailView must render relatedItemsPanel specifically for insurance items');
  console.log('PASS: V6-F82 relatedItemsPanel (edit) and insuranceCoveringItems (reverse lookup, ALL matches) are both wired into detailView, with a tappable two-way link in each direction');
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
test_INS004_phoenix_provider_stays_clean_of_plan_name();
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
test_V6_F76_website_lands_in_structured_field_not_only_notes();
test_V6_F77_website_field_is_a_permanent_TYPE_FIELDS_member_not_only_alwaysWebsite();
test_V6_F78_client_validation_accepts_tif();
test_V6_F78_file_inputs_accept_tif_for_both_entry_points();
test_V6_F78_server_side_prepareSource_accepts_tiff_mime();
test_V6_F78_inferMime_recognizes_tiff_filenames();
test_V6_F79_relatedItemsPanel_excludes_insurance_from_add_candidates();
test_V6_F75_V6_F81_insuranceSystemPrompt_instructs_combining_brand_and_legal_entity();
test_V6_F84_insuranceSystemPrompt_distinguishes_plan_name_from_second_entity();
test_V6_F83_insuranceSystemPrompt_reinforces_website_thoroughness();
test_V6_F85_prepareSource_is_wired_to_convertTiffToPng();
await test_V6_F85_tiff_conversion_produces_real_decodable_png_from_actual_fixture();
test_V6_F86_insuranceSystemPrompt_warns_against_confident_provider_hallucination();
test_V6_F86_insuranceSystemPrompt_requires_literal_quoted_evidence_for_provider();
test_V6_F87_openSource_explains_tiff_download_instead_of_silent_inconsistency();
console.log('ALL PASS: 0.6.7 Insurance Smart Import -- all 8 real INS-001-INS-008 benchmark cases (INS-006 as the mandatory wild-card), the data model (startAt/endAt/website added, schedule unchanged, relatedItemIds insurance-only and never extracted), the two-way relatedItemIds UI, the V6-F66-style per-person merge, and the 0.6.7.1/0.6.7.2/0.6.7.3/0.6.7.4 correction findings (V6-F75-V6-F87) all pass');
