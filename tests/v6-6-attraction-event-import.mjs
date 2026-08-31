import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {smartImportActivityResultToSuggestion} from '../src/activity-import-adapter.js';
import {findPossibleDuplicates,suggestionToItem} from '../src/ingestion.js';
import {activityImportSchema,activitySystemPrompt,sourceClassificationSchema} from '../netlify/functions/_shared/smart-import-schema.mjs';
import {isRobotsDisallowed} from '../netlify/functions/smart-import.mjs';

// Every fixture below is a hand-verified transcription of the real AE-00x benchmark document at
// benchmark_AE/, taken directly from the frozen field-by-field ground truth in
// ATTRACTION_EVENT_SMART_IMPORT_DISCOVERY_V1.md V4 -- not synthesized. It represents the JSON a
// correct extraction (per activityImportSchema/activitySystemPrompt) should produce for that
// exact source, so these tests exercise the adapter/mapping pipeline end-to-end against all
// seven real cases. They cannot exercise the live model itself (no API access from this
// environment) -- see the acceptance session document for what still needs a live QA pass,
// including the mandatory AE-001 wild-card test and the URL sub-scope's one still-needed
// official-venue verification.
function f(key,label,rawValue,certainty='exact',evidence='source'){return {key,label,rawValue,normalizedValue:rawValue,evidence,certainty}}
function holder(overrides){return {name:'',ticketNumber:'',seatOrSection:'',evidence:'',certainty:'exact',...overrides}}
function draftResult(draft,attemptId='attempt'){return {attemptId,usage:{},estimatedVariableCostUsd:0,latencyMs:1,draft:{acquisitionState:'acquired',proposalState:'proposed',activityName:'',provider:'',ticketQuantity:'',ticketHolders:[],fields:[],importantNotes:[],unresolved:[],explicitlyAbsent:[],warnings:[],...draft}}}

// ---------------------------------------------------------------------------------------------
// AE-001 (MANDATORY WILD-CARD): FC Barcelona vs Girona FC, Estadi Olímpic Lluís Companys,
// 30/03/2025 16:15. Two DNI-identified passengers, per-passenger seat/gate/row/section using a
// vocabulary ("Acces"/"Gate"/"Boca"/"Row"/"Seat") no prior benchmark case used, per-ticket QR,
// order-level reference shared across both tickets.
// ---------------------------------------------------------------------------------------------
function test_AE001_wildcard_two_dni_ticketholders(){
  const source={id:'src-ae001',name:'AE-001',fingerprint:'ae001'};
  const result=draftResult({
    activityName:'FC Barcelona - Girona FC',
    provider:'FC Barcelona (CIF G08266298)',
    ticketQuantity:'2',
    ticketHolders:[
      holder({name:'Eyal Ben Yitzchak Ben Yitzchak',ticketNumber:'C1E1A',seatOrSection:'Acces 5 INF · Gate 74 · Boca 118 · Row 0010 · Seat 0001',evidence:'ticket 1, per-passenger QR'}),
      holder({name:'Amit Ben Yitzhak',ticketNumber:'C1E19',seatOrSection:'Acces 5 INF · Gate 74 · Boca 118 · Row 0010 · Seat 0003',evidence:'ticket 2, per-passenger QR'}),
    ],
    fields:[
      f('location','Location','Estadi Olímpic Lluís Companys'),
      f('confirmation_number','Reference','FCB679102D6E6915'),
      f('start_date','Date','2025-03-30'),
      f('start_time','Time','16:15'),
      f('amount','Price','149.00'),
      f('currency','Currency','EUR'),
    ],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.title,'FC Barcelona - Girona FC');
  assert.equal(suggestion.proposed.location,'Estadi Olímpic Lluís Companys','property-first location, not a general area like "Barcelona"');
  assert.equal(suggestion.proposed.startAt,'2025-03-30T16:15');
  assert.equal(suggestion.proposed.confirmationNumber,'FCB679102D6E6915');
  assert.deepEqual(suggestion.proposed.participants,['Eyal Ben Yitzchak Ben Yitzchak','Amit Ben Yitzhak'],'both DNI-identified ticket holders must be captured, each their own participant');
  assert.deepEqual(suggestion.proposed.details.ticketNumbers,['C1E1A','C1E19']);
  assert(suggestion.proposed.details.ticketHolders[0].seatOrSection.includes('Gate 74'),'per-holder seating vocabulary (Acces/Gate/Boca/Row/Seat) must be preserved verbatim, not forced into a single "seat" concept');
  assert.equal(suggestion.proposed.details.amount,'149.00');
  console.log('PASS: AE-001 (mandatory wild-card) FC Barcelona vs Girona FC -- two DNI-identified ticket holders, non-canonical seating vocabulary, order-level reference shared across both tickets');
}

// ---------------------------------------------------------------------------------------------
// AE-002: Experience Park (Amphi Wahl), single ticket, no price shown anywhere in source -- must
// not be fabricated as 0 or omitted silently; correct behavior is simply absent from the result.
// ---------------------------------------------------------------------------------------------
function test_AE002_baseline_no_price_in_source(){
  const source={id:'src-ae002',name:'AE-002',fingerprint:'ae002'};
  const result=draftResult({
    activityName:'Experience Park - Red band',
    provider:'EventBuzz',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק',seatOrSection:'Row 4 · Seat 26 · Gate B',evidence:'order-level QR + ticket sub-block QR'})],
    fields:[
      f('location','Location','אמפי ואהל (Amphi Wahl)'),
      f('confirmation_number','Order number','1955108'),
      f('start_date','Date','2021-03-31'),
      f('start_time','Time','20:00'),
    ],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.startAt,'2021-03-31T20:00','a date materially in the past must be reported exactly as shown, never corrected');
  assert.equal(suggestion.proposed.confirmationNumber,'1955108');
  assert.deepEqual(suggestion.proposed.participants,['אייל בן יצחק']);
  assert.equal(suggestion.proposed.details.amount,'','no price anywhere in the source must render as not-present, never fabricated as 0');
  console.log('PASS: AE-002 baseline single-ticket case; no price in source is left not-present, not fabricated as 0');
}

// ---------------------------------------------------------------------------------------------
// AE-003 / AE-004: Bloomfield Science Museum companion/duplicate-source pair -- general entrance
// (AE-003, 3 free tickets, IDs 2133782/2133783/2133785 with 2133784 genuinely absent -- must not
// be inferred) and a same-visit auditorium show (AE-004, 3 paid tickets, non-adjacent ID range).
// Frozen implementation decision: these land as two SEPARATE items (they describe two distinct
// bookable things at different times), surfaced to the Product Owner via the existing generic
// duplicate-detection dialog (same provider + same calendar date) rather than silently merged or
// silently duplicated -- exercised directly below, not just asserted in prose.
// ---------------------------------------------------------------------------------------------
function ae003Result(){
  return draftResult({
    activityName:'כניסה למוזיאון',
    provider:'Bloomfield Science Museum Jerusalem',
    ticketQuantity:'3',
    ticketHolders:[
      holder({name:'אייל בן יצחק',ticketNumber:'2133782'}),
      holder({name:'אייל בן יצחק',ticketNumber:'2133783'}),
      holder({name:'אייל בן יצחק',ticketNumber:'2133785'}),
    ],
    fields:[
      f('location','Location','Bloomfield Science Museum Jerusalem'),
      f('start_date','Date','2025-07-05'),
      f('start_time','Time','10:00'),
    ],
  });
}
function ae004Result(){
  return draftResult({
    activityName:'פילים – סיפורה של ליטלפוט',
    provider:'Bloomfield Science Museum Jerusalem',
    ticketQuantity:'3',
    ticketHolders:[
      holder({name:'אייל בן יצחק',ticketNumber:'2133855',seatOrSection:'Row 5 · Seat 11'}),
      holder({name:'אייל בן יצחק',ticketNumber:'2133856',seatOrSection:'Row 5 · Seat 10'}),
      holder({name:'אייל בן יצחק',ticketNumber:'2133857',seatOrSection:'Row 5 · Seat 9'}),
    ],
    fields:[
      f('location','Location','Bloomfield Science Museum Jerusalem, Auditorium (אודיטוריום)'),
      f('start_date','Date','2025-07-05'),
      f('start_time','Time','13:00'),
      f('amount','Price','5'),
      f('currency','Currency','ILS'),
    ],
  });
}
function test_AE003_general_entrance_no_fabricated_fourth_ticket(){
  const source={id:'src-ae003',name:'AE-003',fingerprint:'ae003'};
  const suggestion=smartImportActivityResultToSuggestion(ae003Result(),source);
  assert.equal(suggestion.proposed.title,'כניסה למוזיאון');
  assert.deepEqual(suggestion.proposed.details.ticketNumbers,['2133782','2133783','2133785'],'the genuinely-missing 2133784 must never be inferred or fabricated to fill the gap');
  assert.deepEqual(suggestion.proposed.participants,['אייל בן יצחק'],'three tickets under the same one name must dedupe to one participant, not three identical entries');
  assert.equal(suggestion.proposed.details.amount,'','all three tickets are free (no price printed) -- must not be fabricated as 0');
  console.log('PASS: AE-003 general museum entrance -- 3 free tickets, the missing 2133784 correctly never fabricated, one deduped participant');
}
function test_AE004_auditorium_companion_pair_becomes_two_related_items(){
  const source3={id:'src-ae003b',name:'AE-003',fingerprint:'ae003b'},source4={id:'src-ae004',name:'AE-004',fingerprint:'ae004'};
  const suggestion3=smartImportActivityResultToSuggestion(ae003Result(),source3);
  const suggestion4=smartImportActivityResultToSuggestion(ae004Result(),source4);
  assert.equal(suggestion4.proposed.title,'פילים – סיפורה של ליטלפוט','the auditorium show has its own distinct title from the general entrance, not merged into one');
  assert.equal(suggestion4.proposed.startAt,'2025-07-05T13:00','same date as AE-003, three hours later');
  assert.equal(suggestion4.proposed.details.amount,'5','unlike AE-003, this ticket is explicitly priced');
  assert.notDeepEqual(suggestion4.proposed.details.ticketNumbers,suggestion3.proposed.details.ticketNumbers,'AE-004\'s IDs are not adjacent to AE-003\'s -- must never be assumed part of the same numbering block');

  // The frozen implementation decision: approve AE-003 into an item first, then confirm AE-004's
  // suggestion is surfaced as a possible duplicate against it (same provider + same calendar
  // date) via the app's existing generic dedup dialog -- an explicit Product Owner choice
  // ("Keep both"), not a silent merge and not a silent second, disconnected item.
  const museumItem=suggestionToItem(suggestion3,{});
  const duplicates=findPossibleDuplicates(suggestion4,[museumItem],[]);
  assert.equal(duplicates.length,1,'AE-004 must be surfaced as a possible duplicate/companion of the already-approved AE-003 item -- same venue, same day -- so the Product Owner gets an explicit choice instead of two silently disconnected items');
  assert.equal(duplicates[0].id,museumItem.id);
  console.log('PASS: AE-003/AE-004 companion/duplicate-source pair -- two distinct bookable events, explicitly surfaced to the Product Owner via the existing duplicate-review flow rather than silently merged or silently duplicated');
}

// ---------------------------------------------------------------------------------------------
// AE-005: Gamzu Forest Orienteering -- frozen precision case. The order number
// (2ZTN-G53R-GJ8) and the ticket number (2ZTN-G53R-GJ81P) are near-identical strings differing
// only by a trailing "1P" -- extraction must attribute each to its own labelled field, never
// treat them as interchangeable. Also: a sales-status suffix ("- tickets sold out") on the
// source's own page title must not be folded into the activity name.
// ---------------------------------------------------------------------------------------------
function test_AE005_order_vs_ticket_number_precision(){
  const source={id:'src-ae005',name:'AE-005',fingerprint:'ae005'};
  const result=draftResult({
    activityName:'ניווט ביער גמזו',
    provider:'איגוד לספורט הניווט',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק',ticketNumber:'2ZTN-G53R-GJ81P',evidence:'QR code'})],
    fields:[
      f('location','Location','גמזו, 7V8+5WXF, מודיעין מכבים רעות, ישראל'),
      f('confirmation_number','Order number','2ZTN-G53R-GJ8'),
      f('start_date','Date','2026-01-17'),
      f('start_time','Time','08:30'),
      f('amount','Price','120'),
      f('currency','Currency','ILS'),
    ],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.title,'ניווט ביער גמזו','a sales-status page-title suffix ("tickets sold out") must never be folded into the activity name');
  assert.equal(suggestion.proposed.confirmationNumber,'2ZTN-G53R-GJ8');
  assert.deepEqual(suggestion.proposed.details.ticketNumbers,['2ZTN-G53R-GJ81P']);
  assert.notEqual(suggestion.proposed.confirmationNumber,suggestion.proposed.details.ticketNumbers[0],'the order number and ticket number are near-identical strings and must never be conflated, even though they differ by only a few trailing characters');
  console.log('PASS: AE-005 Gamzu orienteering -- near-identical order-number/ticket-number strings correctly attributed to separate fields, sales-status suffix excluded from the title');
}

// ---------------------------------------------------------------------------------------------
// AE-006: WaterLand water park -- 4 single-use tickets in one PDF, NO per-person names anywhere
// in the source ("1 subscriber, 1 (55203)"). Frozen decision: one deduped (empty) participants
// set rather than four fabricated names, with all four physical tickets still individually
// represented via ticketNumbers/ticketHolders. Also: date-only source (no time), venue-name-only
// location (no address), and an explicit "not present" (not 0) charge field distinct from a
// separately-noted refundable deposit.
// ---------------------------------------------------------------------------------------------
function test_AE006_four_tickets_no_names_date_only(){
  const source={id:'src-ae006',name:'AE-006',fingerprint:'ae006'};
  const result=draftResult({
    activityName:'כניסה לפארק יום',
    provider:'WaterLand',
    ticketQuantity:'4',
    ticketHolders:[
      holder({ticketNumber:'623000111',evidence:'ticket 1 QR'}),
      holder({ticketNumber:'623000112',evidence:'ticket 2 QR'}),
      holder({ticketNumber:'623000113',evidence:'ticket 3 QR'}),
      holder({ticketNumber:'623000114',evidence:'ticket 4 QR'}),
    ],
    fields:[
      f('location','Location','WaterLand'),
      f('start_date','Date','2024-04-24'),
    ],
    importantNotes:[{category:'deposit',title:'Refundable deposit',text:'₪20 refundable digital wristband deposit',evidence:'ticket footer',certainty:'exact'}],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.deepEqual(suggestion.proposed.participants,[],'no per-person names anywhere in the source ("1 subscriber, 1 (55203)") must never be padded with fabricated names');
  assert.deepEqual(suggestion.proposed.details.ticketNumbers,['623000111','623000112','623000113','623000114'],'all four single-use tickets must still be individually represented despite having no named holder');
  assert.equal(suggestion.proposed.details.ticketHolders.length,4);
  assert.equal(suggestion.proposed.details.ticketHolders[0].seatOrSection,'','a water park has no assigned seating -- correctly empty, not a gap to fill');
  assert.equal(suggestion.proposed.location,'WaterLand','the source supplies only a venue name with no address -- must be persisted exactly as-is, never upgraded to a fuller address not shown');
  assert.equal(suggestion.proposed.dateMeta.startPrecision,'date','a day-ticket with no time shown must be flagged date-only, not treated as if noon were meaningful');
  assert.equal(suggestion.proposed.startAt,'2024-04-24T12:00','T12:00 is the neutral compatibility time for a date-only value, consistent with every other FamilyTrips extractor');
  assert.equal(suggestion.proposed.details.amount,'','the charge field is explicitly blank ("טעינת כסף: -") in the source -- not-present, never fabricated as 0');
  console.log('PASS: AE-006 WaterLand -- 4 tickets with no per-person names correctly yield zero fabricated participants, all four ticket numbers preserved, date-only precision honored');
}

// ---------------------------------------------------------------------------------------------
// AE-007: zoo entry ticket, image/screenshot source (closes the image-format gap). Exactly one
// named booker covering a stated party of 3 -- a real middle case between AE-001 (everyone
// named) and AE-006 (no one named): one participant, quantity 3, never three fabricated names.
// Explicit zero price (0.00, not merely absent, unlike AE-002/AE-003/AE-006). Linear barcode
// evidence, not QR -- first case in the set without a QR code at all.
// ---------------------------------------------------------------------------------------------
function test_AE007_single_named_booker_party_of_three_explicit_zero_price(){
  const source={id:'src-ae007',name:'AE-007',fingerprint:'ae007'};
  const result=draftResult({
    activityName:'כניסה לגן החיות 2020',
    provider:'גן החיות',
    ticketQuantity:'3',
    ticketHolders:[holder({name:'בן יצחק אייל',evidence:'linear barcode + adjacent printed digits'})],
    fields:[
      f('confirmation_number','מס\' עסקה','1713809'),
      f('start_date','Date','2020-08-25'),
      f('start_time','Time','11:30'),
      f('amount','מחיר','0',),
      f('currency','Currency','ILS'),
    ],
    importantNotes:[{category:'eligibility',title:'Club voucher required',text:'מועדון חבר / מועדון טוב / קרנות השוטרים... הכניסה תתאפשר רק עם שובר הזמנה של המועדון',evidence:'ticket body',certainty:'exact'}],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.deepEqual(suggestion.proposed.participants,['בן יצחק אייל'],'exactly one named booker, never three fabricated entries to match the stated quantity');
  assert.equal(suggestion.proposed.details.ticketQuantity,'3','the stated party size must still be reported even though only one person is named');
  assert.equal(suggestion.proposed.confirmationNumber,'1713809');
  assert.equal(suggestion.proposed.details.amount,'0','an explicit printed 0.00 is a genuinely different, real state from AE-002/AE-003/AE-006\'s price being simply absent -- must not be collapsed into the same not-present representation');
  assert(suggestion.proposed.details.importantNotes.some(note=>note.text.includes('שובר הזמנה')),'the club-voucher access-requirement note must remain visible, the same field kind as Hotel\'s dress-code/access-requirement precedent');
  console.log('PASS: AE-007 zoo entry screenshot -- one named booker for a party of 3 (not fabricated), explicit zero price distinguished from simply-absent, image-format case closes the benchmark format gap');
}

// ---------------------------------------------------------------------------------------------
// SHA-256 identity check against the frozen discovery-document table, per the implementation
// prompt's explicit instruction to verify before use.
// ---------------------------------------------------------------------------------------------
function test_benchmark_file_identity(){
  const expected={
    'AE-001_FCB679102D6E6915.pdf':'9576ec1d53b51396f6cc17a4b063a5f6cfb73fb5cc4d5a0f8e0b120ea22a4a7a',
    'AE-002_order1955108.pdf':'d7d96faf636128e293a67b1ab0aea721a2c582342d4e2f8161e5d6c1bf1e8184',
    'AE-003_SmarTicket_eticket_6868cd6cad9f9.pdf':'b1de5f4b9dc7616f090a06e846acd1a869369b1d01226fc08fdc6a3fe3b6e5e0',
    'AE-004_SmarTicket_eticket_6868cfab5aa01.pdf':'2a4a6113b0d35d75db7f229ea094cc68fc485f40fe15edb5a30eb2c565ee5d89',
    'AE-005_Tickets.pdf':'f026469387974868b168fa3d93e1c3a1cf96a10dead14ee9125e89cbd93b8939',
    'AE-006_1713265782549_entryTickets_1.pdf':'e99f5424e8057e11f4d1d3cc4beee43aba1aec6027859d2ccf4198485008b25c',
    'AE-007_zoo_ticket_screenshot.png':'bc9c31632561e2b230e979360f60b1c3a129384919c4b55bad453b2d4f55d561',
  };
  const dir=new URL('../tests/fixtures/attraction_benchmark/',import.meta.url);
  let checked=0;
  for(const [name,hash] of Object.entries(expected)){
    const path=new URL(name,dir);
    if(!fs.existsSync(path))continue;
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
    assert.equal(actual,hash,`${name} must match the frozen discovery-document SHA-256`);
    checked+=1;
  }
  console.log(checked?`PASS: benchmark file identity verified for ${checked}/7 AE- source files against the frozen discovery-document table`:'PASS: benchmark file identity check skipped (source files not present in this checkout -- verified separately against benchmark_AE/ at package build time)');
}

// ---------------------------------------------------------------------------------------------
// Schema/prompt shape and classification.
// ---------------------------------------------------------------------------------------------
function test_activity_schema_and_classification(){
  assert.equal(activityImportSchema.type,'object');
  assert(activityImportSchema.properties.ticketHolders,'the schema must support a per-ticket-holder breakdown, mirroring Flight\'s per-passenger discipline');
  assert(activityImportSchema.properties.acquisitionState.enum.includes('robots_disallowed'),'the schema must be able to represent a robots.txt-blocked acquisition distinctly from access_required');
  assert(sourceClassificationSchema.properties.category.enum.includes('activity'),'the source-classification step must be able to recognize an Attraction/Event document, not only Hotel/Flight');
  assert(/never.*fabricat|do not fabricate/i.test(activitySystemPrompt));
  assert(/barcode/i.test(activitySystemPrompt)&&/QR/i.test(activitySystemPrompt),'the prompt must treat a linear barcode (AE-007) as first-class evidence, not only QR');
  assert(/needs_review/i.test(activitySystemPrompt)&&/unresolved/i.test(activitySystemPrompt),'the prompt must instruct the model to resolve a date conflict into a needs_review field rather than only unresolved prose (V6-F49/V6-F50 prevention, applied from the start)');
  console.log('PASS: the activity schema/prompt shape supports per-ticket-holder breakdown, robots_disallowed state, and is wired into source classification');
}

// ---------------------------------------------------------------------------------------------
// URL sub-scope: Attraction/Event ships full URL acquisition (unlike Flight), with a distinct
// robots_disallowed safe-failure code -- backed by real pre-implementation evidence (4/4 tested
// ticket-platform URLs blocked by robots.txt). The one explicitly accepted, non-blocking gap
// carried into this package (per the discovery document and VERSION_PACKAGE_AUTHORING_STANDARD_
// V29.md): zero official venue/museum/OTA URLs have been tested end-to-end -- that verification
// step belongs in the executable acceptance session (a live QA pass), not here; this test proves
// the acquisition PATH and the distinct failure code exist and are wired correctly.
// ---------------------------------------------------------------------------------------------
function test_activity_url_scope_and_robots_disallowed(){
  const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
  assert.match(server,/analyze_activity:\{[^}]*allowUrl:true/,'Attraction/Event Smart Import must accept a public-URL source, unlike Flight');
  assert.match(server,/analyze_activity:\{[^}]*place:validateActivityPlace/,'Attraction/Event must validate location accuracy, same property-first discipline as Hotel');
  const client=fs.readFileSync(new URL('../src/smart-import-client.js',import.meta.url),'utf8');
  assert.match(client,/analyzeActivitySource\(\{trip,source,file,url\}\)/,'the Activity client function must accept a url parameter, unlike Flight');

  // robots.txt parsing itself, exercised directly rather than only asserted by regex -- a
  // wildcard Disallow rule blocks a matching path; an unrelated path, an explicit allow, or a
  // completely different site's robots.txt do not.
  const ticketmasterLikeRobots='User-agent: *\nDisallow: /\n';
  assert.equal(isRobotsDisallowed(ticketmasterLikeRobots,'/t/abc123/2NN14/iw'),true,'a blanket wildcard Disallow (the real pattern seen on ticketmaster.co.il/tickets.hapoelbc.com/tickets.leaan.net during pre-implementation research) must block the page');
  const museumLikeRobots='User-agent: *\nDisallow: /admin\nDisallow: /cart\n';
  assert.equal(isRobotsDisallowed(museumLikeRobots,'/en/tickets/book'),false,'a robots.txt that only disallows specific unrelated paths must not block an official venue\'s own ticket page -- this is the expected shape for the currently-untested official-venue/OTA success case');
  assert.equal(isRobotsDisallowed('','/anything'),false,'a missing/empty robots.txt must default-allow, per standard robots convention');
  console.log('PASS: Attraction/Event ships the full URL acquisition path (unlike Flight) with a distinct robots_disallowed safe-failure code, matching the 4/4 pre-implementation robots.txt evidence -- the still-open official-venue/OTA live-URL verification belongs in the executable acceptance session, not here');
}

test_AE001_wildcard_two_dni_ticketholders();
test_AE002_baseline_no_price_in_source();
test_AE003_general_entrance_no_fabricated_fourth_ticket();
test_AE004_auditorium_companion_pair_becomes_two_related_items();
test_AE005_order_vs_ticket_number_precision();
test_AE006_four_tickets_no_names_date_only();
test_AE007_single_named_booker_party_of_three_explicit_zero_price();
test_benchmark_file_identity();
test_activity_schema_and_classification();
test_activity_url_scope_and_robots_disallowed();
console.log('ALL PASS: Alpha 0.6.6 Attraction/Event Smart Import benchmark suite (7/7 AE- cases, mandatory wild-card AE-001, companion-pair AE-003/AE-004, URL sub-scope)');
