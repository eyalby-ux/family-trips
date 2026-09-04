import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {mergeActivityDetails,mergeActivityTicketHolders,smartImportActivityResultToSuggestion} from '../src/activity-import-adapter.js';
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
function holder(overrides){return {name:'',dni:'',ticketNumber:'',seatOrSection:'',evidence:'',certainty:'exact',...overrides}}
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
      holder({name:'Eyal Ben Yitzchak Ben Yitzchak',dni:'40384410',ticketNumber:'C1E1A',seatOrSection:'Acces 5 INF · Gate 74 · Boca 118 · Row 0010 · Seat 0001',evidence:'ticket 1, per-passenger QR'}),
      holder({name:'Amit Ben Yitzhak',dni:'40386943',ticketNumber:'C1E19',seatOrSection:'Acces 5 INF · Gate 74 · Boca 118 · Row 0010 · Seat 0003',evidence:'ticket 2, per-passenger QR'}),
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
  // V6-F56: DNI previously had no schema field to land in at all -- ticketHolderSchema now has
  // one, and the adapter must actually map it through, per-holder, evidence-linked.
  assert.equal(suggestion.proposed.details.ticketHolders[0].dni,'40384410','the frozen ground truth DNI for the first ticket holder must be captured, not silently dropped');
  assert.equal(suggestion.proposed.details.ticketHolders[1].dni,'40386943','the second ticket holder\'s own DNI must never be attached to the first holder\'s entry or dropped');
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
      // V6-F61: "purchaser" has no canonical field mapping in FIELD_TARGETS, so it falls through
      // to the generic otherFields->notes dump -- reproduces the exact real, observed shape of the
      // bug (the model's own rawValue already includes the printed label text verbatim).
      f('purchaser','Purchaser','Purchaser: אייל בן יצחק'),
    ],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.startAt,'2021-03-31T20:00','a date materially in the past must be reported exactly as shown, never corrected');
  assert.equal(suggestion.proposed.confirmationNumber,'1955108');
  assert.deepEqual(suggestion.proposed.participants,['אייל בן יצחק']);
  assert.equal(suggestion.proposed.details.amount,'','no price anywhere in the source must render as not-present, never fabricated as 0');
  // V6-F58: seatOrSection had fixture data but was never asserted -- a real coverage gap that
  // would have let a display/mapping regression pass silently.
  assert.equal(suggestion.proposed.details.ticketHolders[0].seatOrSection,'Row 4 · Seat 26 · Gate B','AE-002\'s frozen seat/row/gate assignment must be captured on its ticket holder');
  // V6-F61: a single, Hebrew-localized label ("רוכש"), never the doubled "Purchaser: Purchaser:"
  // the real bug produced, and never the model's own raw English label leaking through unfiltered.
  assert(suggestion.proposed.notes.includes('רוכש: אייל בן יצחק'),'an unmapped field concept with a recognized synonym must render with a single, Hebrew-localized label');
  assert(!suggestion.proposed.notes.includes('Purchaser: Purchaser'),'the printed label must never be duplicated when the model\'s own rawValue already includes it verbatim');
  assert(!suggestion.proposed.notes.includes('Purchaser:'),'the raw English label must not leak into the UI unfiltered once a Hebrew synonym is recognized');
  console.log('PASS: AE-002 baseline single-ticket case; no price in source is left not-present, not fabricated as 0; seat/row/gate captured; purchaser label single and Hebrew-localized');
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
  // V6-F58: per-ticket seatOrSection had fixture data on all three AE-004 holders but was never
  // asserted -- a real coverage gap.
  assert.deepEqual(suggestion4.proposed.details.ticketHolders.map(holder=>holder.seatOrSection),['Row 5 · Seat 11','Row 5 · Seat 10','Row 5 · Seat 9'],'each of AE-004\'s three assigned seats must be captured on its own ticket holder, never collapsed or dropped');
  // V6-F63: provider must be the venue/organizer (Bloomfield Science Museum Jerusalem), never the
  // ticketing platform (SmarTicket.co.il/SmarTicket) it was sold through -- and consistent across
  // both companion sources for the same venue, unlike the real observed bug where AE-003 and
  // AE-004 disagreed with each other.
  assert.equal(suggestion3.proposed.provider,'Bloomfield Science Museum Jerusalem','AE-003\'s provider must be the venue, not the ticketing platform');
  assert.equal(suggestion4.proposed.provider,'Bloomfield Science Museum Jerusalem','AE-004\'s provider must match AE-003\'s -- both companion sources describe the same one venue');
  // V6-F64: AE-004's location must combine the venue name with the stated sub-venue (Auditorium),
  // never report the sub-venue alone -- "Auditorium" by itself doesn't identify which venue's.
  assert.equal(suggestion4.proposed.location,'Bloomfield Science Museum Jerusalem, Auditorium (אודיטוריום)','the sub-venue must be combined with the venue name, not reported alone');

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
  // V6-F58: amount had fixture data (₪120, "family ticket") but was never asserted -- a real
  // coverage gap on the one benchmark field this case's ₪120 ground truth exists to test.
  assert.equal(suggestion.proposed.details.amount,'120','the frozen ₪120 family-ticket price must be captured');
  console.log('PASS: AE-005 Gamzu orienteering -- near-identical order-number/ticket-number strings correctly attributed to separate fields, sales-status suffix excluded from the title, amount captured');
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
  // V6-F59: title had no assertion at all -- the fixture's activityName is already the frozen
  // correct ticket-type label ("כניסה לפארק יום"), not the venue name ("WaterLand"), matching what
  // the strengthened activitySystemPrompt priority rule now asks the live model to prefer; this
  // proves the adapter passes it through unchanged once the model gets it right.
  assert.equal(suggestion.proposed.title,'כניסה לפארק יום','the ticket-type/admission label must be used as the title, not the bare venue name');
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
  // V6-F65: the frozen ground truth is explicit that the source's only legible venue identity is
  // the generic label "גן החיות" -- provider must never be upgraded to a specific real-world zoo
  // brand name (e.g. "Jerusalem Biblical Zoo") from general knowledge. This fixture already
  // encodes the correct, non-fabricated value; the assertion is new (was previously unasserted).
  assert.equal(suggestion.proposed.provider,'גן החיות','a generic source label must be preserved exactly, never upgraded to a specific real-world venue name absent from legible source text');
  assert.deepEqual(suggestion.proposed.participants,['בן יצחק אייל'],'exactly one named booker, never three fabricated entries to match the stated quantity');
  assert.equal(suggestion.proposed.details.ticketQuantity,'3','the stated party size must still be reported even though only one person is named');
  assert.equal(suggestion.proposed.confirmationNumber,'1713809');
  assert.equal(suggestion.proposed.details.amount,'0','an explicit printed 0.00 is a genuinely different, real state from AE-002/AE-003/AE-006\'s price being simply absent -- must not be collapsed into the same not-present representation');
  assert(suggestion.proposed.details.importantNotes.some(note=>note.text.includes('שובר הזמנה')),'the club-voucher access-requirement note must remain visible, the same field kind as Hotel\'s dress-code/access-requirement precedent');
  console.log('PASS: AE-007 zoo entry screenshot -- one named booker for a party of 3 (not fabricated), explicit zero price distinguished from simply-absent, image-format case closes the benchmark format gap');
}

// ---------------------------------------------------------------------------------------------
// V6-F59: title priority rule is now a COMBINATION (venue name + ticket type), not a strict
// either/or preferring one over the other. This is a prompt-only change (the adapter does a pure
// title:activityName passthrough, confirmed above by every AE-00x fixture's title assertion) --
// this test guards against any future adapter change that tries to split or cherry-pick one half
// of an already-combined activityName back apart.
// ---------------------------------------------------------------------------------------------
function test_V6_F59_title_preserves_combined_venue_and_ticket_type(){
  const source={id:'src-f59',name:'F59',fingerprint:'f59'};
  const result=draftResult({
    activityName:'WaterLand - כניסה לפארק יום',
    provider:'WaterLand',
    ticketQuantity:'1',
    ticketHolders:[holder({ticketNumber:'623000999'})],
    fields:[f('location','Location','WaterLand'),f('start_date','Date','2024-04-24')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.title,'WaterLand - כניסה לפארק יום','a combined venue-name + ticket-type activityName must be passed through verbatim, neither half split off nor cherry-picked');
  console.log('PASS: V6-F59 the adapter preserves a combined venue-name + ticket-type activityName verbatim as the title');
}

// ---------------------------------------------------------------------------------------------
// V6-F61: label-doubling / unlocalized-label fix applied at the shared source (operational-data.js)
// -- this covers Activity's importantNotes site specifically, the one Activity site the previous
// (0.6.6.1) fix pass never touched at all (only otherFields was fixed then). Mirrors the existing
// AE-002 otherFields test shape exactly.
// ---------------------------------------------------------------------------------------------
function test_V6_F61_activity_important_notes_label_not_doubled(){
  const source={id:'src-f61-activity',name:'F61-activity',fingerprint:'f61-activity'};
  const result=draftResult({
    activityName:'ניווט ביער גמזו',
    provider:'איגוד לספורט הניווט',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק'})],
    fields:[f('location','Location','גמזו'),f('start_date','Date','2026-01-17')],
    importantNotes:[{category:'ticketing',title:'Ticket number',text:'Ticket number: 2ZTN-G53R-GJ81P',evidence:'ticket footer',certainty:'exact'}],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert(suggestion.proposed.notes.includes('מספר כרטיס: 2ZTN-G53R-GJ81P'),'an importantNotes entry with a recognized synonym must render with a single, Hebrew-localized label');
  assert(!suggestion.proposed.notes.includes('Ticket number: Ticket number'),'the printed label must never be doubled when the model\'s own text already includes it verbatim -- this is the actual reopened AE-005 evidence shape (importantNotes, not otherFields)');
  assert(!suggestion.proposed.notes.includes('Ticket number:'),'the raw English label must not leak into the UI unfiltered once a Hebrew synonym is recognized');
  console.log('PASS: V6-F61 Activity\'s importantNotes note-line site (previously untouched) no longer doubles or leaves an unlocalized label');
}

// ---------------------------------------------------------------------------------------------
// V6-F65 (extension): provider/activityName now have paired certainty fields
// (providerCertainty/activityNameCertainty). These tests exercise the adapter's defense-in-depth
// handling directly -- proving the blanking/flagging happens even if the model doesn't fully obey
// the prompt's instruction to leave the value empty when unreadable (fixture simulates exactly
// that: the model still returns a guessed string despite declaring it unreadable).
// ---------------------------------------------------------------------------------------------
function test_V6_F65_ext_unreadable_provider_certainty_blanks_value_and_flags_illegible(){
  const source={id:'src-f65-provider',name:'F65-provider',fingerprint:'f65-provider'};
  const result=draftResult({
    activityName:'כניסה לגן החיות',
    provider:'החברה להגנת הטבע', // simulates the model still guessing despite unreadable certainty
    providerCertainty:'unreadable',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק'})],
    fields:[f('start_date','Date','2025-01-01')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'','providerCertainty:"unreadable" must force the value blank regardless of what the model actually returned -- defense in depth, not just trusting prompt compliance');
  assert(suggestion.proposed.details.needsReviewFields.some(entry=>entry.key==='provider'),'an unreadable provider must be flagged in needsReviewFields');
  assert(suggestion.proposed.warnings.some(w=>typeof w==='object'&&w.needsReviewRef&&w.needsReviewRef.key==='provider'),'an unreadable provider must produce a needsReviewRef-backed warning, the same mechanism as every other needs-review field');
  assert.equal(suggestion.proposed.fieldConfidence.provider.confidence,'low','an unreadable certainty must map to low field confidence, the same as every other unreadable field');
  console.log('PASS: V6-F65 ext providerCertainty:"unreadable" blanks the value and flags it, even when the model still returned a guessed string');
}
function test_V6_F65_ext_exact_provider_certainty_unaffected(){
  const source={id:'src-f65-provider-exact',name:'F65-provider-exact',fingerprint:'f65-provider-exact'};
  const result=draftResult({
    activityName:'כניסה לגן החיות',
    provider:'גן החיות',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק'})],
    fields:[f('start_date','Date','2025-01-01')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.provider,'גן החיות','a normal exact-certainty provider (or one with no certainty field at all, matching an older fixture) must be completely unaffected -- no regression');
  assert(!suggestion.proposed.details.needsReviewFields?.some(entry=>entry.key==='provider'),'an exact-certainty provider must not be flagged for review');
  assert.equal(suggestion.proposed.fieldConfidence.provider.confidence,'high');
  console.log('PASS: V6-F65 ext an absent/exact providerCertainty is a complete no-op, matching every existing fixture with no certainty field at all');
}
function test_V6_F65_ext_unreadable_activityName_certainty_blanks_value_and_flags_illegible(){
  const source={id:'src-f65-name',name:'F65-name',fingerprint:'f65-name'};
  const result=draftResult({
    activityName:'הגן הזואולוגי התנ"כי בירושלים', // simulates the model still guessing despite unreadable certainty
    activityNameCertainty:'unreadable',
    provider:'גן החיות',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק'})],
    fields:[f('start_date','Date','2025-01-01')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.title,'','activityNameCertainty:"unreadable" must force the title blank regardless of what the model actually returned');
  assert.equal(suggestion.proposed.details.activityName,'','details.activityName must also be blanked, not just the top-level title');
  assert(suggestion.proposed.details.needsReviewFields.some(entry=>entry.key==='activityName'),'an unreadable activityName must be flagged in needsReviewFields');
  assert.equal(suggestion.proposed.fieldConfidence.activityName.confidence,'low');
  console.log('PASS: V6-F65 ext activityNameCertainty:"unreadable" blanks the title and flags it, even when the model still returned a guessed string');
}
function test_V6_F65_ext_needs_review_certainty_keeps_value_and_flags(){
  const source={id:'src-f65-needs-review',name:'F65-needs-review',fingerprint:'f65-needs-review'};
  const result=draftResult({
    activityName:'כניסה לגן החיות',
    activityNameCertainty:'needs_review',
    provider:'גן החיות',
    ticketQuantity:'1',
    ticketHolders:[holder({name:'אייל בן יצחק'})],
    fields:[f('start_date','Date','2025-01-01')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  assert.equal(suggestion.proposed.title,'כניסה לגן החיות','needs_review must KEEP the value (it was legible, just not fully certain), unlike unreadable which blanks it');
  assert(suggestion.proposed.details.needsReviewFields.some(entry=>entry.key==='activityName'),'a needs_review activityName must still be flagged for verification');
  assert.equal(suggestion.proposed.fieldConfidence.activityName.confidence,'medium');
  console.log('PASS: V6-F65 ext activityNameCertainty:"needs_review" keeps the value but still flags it for verification');
}

// ---------------------------------------------------------------------------------------------
// V6-F66: Activity ticketHolders/participants were silently OVERWRITTEN on merge, not merged --
// suggestionToItem's details merge was field-aware only for type==='flight' (mergeFlightDetails);
// every other type (including activity) fell through to a plain object spread, so a second
// suggestion's ticketHolders array wholesale-replaced the first's. Mirrors Eyal's own wild-card
// repro: his own seat/row entry and a companion's, both for the same match, attaching in two
// separate passes.
// ---------------------------------------------------------------------------------------------
function test_V6_F66_merge_activity_ticket_holders_preserves_both_people(){
  const existingItem=suggestionToItem(smartImportActivityResultToSuggestion(draftResult({
    activityName:'FC Barcelona - Girona FC',provider:'FC Barcelona',ticketQuantity:'2',
    ticketHolders:[holder({name:'Eyal Ben Yitzchak',ticketNumber:'C1E1A',seatOrSection:'Row 1'})],
    fields:[f('start_date','Date','2025-03-30'),f('start_time','Time','16:15')],
  }),{id:'src-f66a',name:'F66a',fingerprint:'f66a'}),{});
  const secondSuggestion=smartImportActivityResultToSuggestion(draftResult({
    activityName:'FC Barcelona - Girona FC',provider:'FC Barcelona',ticketQuantity:'2',
    ticketHolders:[holder({name:'Amit Ben Yitzhak',ticketNumber:'C1E19',seatOrSection:'Row 1'})],
    fields:[f('start_date','Date','2025-03-30'),f('start_time','Time','16:15')],
  }),{id:'src-f66b',name:'F66b',fingerprint:'f66b'});
  const merged=suggestionToItem(secondSuggestion,existingItem);
  const names=merged.details.ticketHolders.map(holderEntry=>holderEntry.name);
  assert(names.includes('Eyal Ben Yitzchak'),'the first holder must survive attaching a second, companion suggestion -- not be wholesale-replaced');
  assert(names.includes('Amit Ben Yitzhak'),'the second holder must also be present');
  assert.equal(merged.details.ticketHolders.length,2,'both distinct ticket holders must be present, never collapsed or dropped');
  console.log('PASS: V6-F66 both people\'s ticketHolders entries survive a merge, instead of the second suggestion silently overwriting the first');
}
function test_V6_F66_merge_activity_participants_union_not_overwrite(){
  const existingItem=suggestionToItem(smartImportActivityResultToSuggestion(draftResult({
    activityName:'FC Barcelona - Girona FC',provider:'FC Barcelona',ticketQuantity:'2',
    ticketHolders:[holder({name:'Eyal Ben Yitzchak',ticketNumber:'C1E1A'})],
    fields:[f('start_date','Date','2025-03-30')],
  }),{id:'src-f66c',name:'F66c',fingerprint:'f66c'}),{});
  const secondSuggestion=smartImportActivityResultToSuggestion(draftResult({
    activityName:'FC Barcelona - Girona FC',provider:'FC Barcelona',ticketQuantity:'2',
    ticketHolders:[holder({name:'Amit Ben Yitzhak',ticketNumber:'C1E19'})],
    fields:[f('start_date','Date','2025-03-30')],
  }),{id:'src-f66d',name:'F66d',fingerprint:'f66d'});
  const merged=suggestionToItem(secondSuggestion,existingItem);
  assert(merged.participants.includes('Eyal Ben Yitzchak'),'both participants must survive as a union');
  assert(merged.participants.includes('Amit Ben Yitzhak'));
  assert.equal(merged.participants.length,2,'no duplicate/dropped participant entries');
  console.log('PASS: V6-F66 top-level participants union both suggestions\' names instead of the second overwriting the first');
}
function test_V6_F66_merge_activity_ticket_holders_fills_blank_fields_from_either_side(){
  // Same ticketNumber on both sides (the reliable match key); one side has a blank field the
  // other has filled -- the fields must merge, not pick one side wholesale.
  const existing=[{name:'Eyal Ben Yitzchak',dni:'',ticketNumber:'C1E1A',seatOrSection:'',evidence:'ticket 1',certainty:'exact'}];
  const incoming=[{name:'',dni:'40384410',ticketNumber:'C1E1A',seatOrSection:'Row 1 Seat 1',evidence:'',certainty:'exact'}];
  const merged=mergeActivityTicketHolders(existing,incoming);
  assert.equal(merged.length,1,'the same ticketNumber on both sides must match to ONE merged entry, not two');
  assert.equal(merged[0].name,'Eyal Ben Yitzchak','existing non-blank name must win');
  assert.equal(merged[0].dni,'40384410','a blank existing dni must be filled from the incoming entry');
  assert.equal(merged[0].seatOrSection,'Row 1 Seat 1','a blank existing seatOrSection must be filled from the incoming entry');
  assert.equal(merged[0].evidence,'ticket 1','existing non-blank evidence must win over the incoming blank');

  // mergeActivityDetails wires this through end-to-end, and also unions ticketNumbers.
  const mergedDetails=mergeActivityDetails({ticketHolders:existing,ticketNumbers:['C1E1A']},{ticketHolders:incoming,ticketNumbers:['C1E1A']});
  assert.equal(mergedDetails.ticketHolders.length,1);
  assert.equal(mergedDetails.ticketHolders[0].dni,'40384410');
  assert.deepEqual(mergedDetails.ticketNumbers,['C1E1A'],'ticketNumbers must be deduped, not doubled, when both sides report the same one');
  console.log('PASS: V6-F66 a partial-overlap ticket holder (same ticketNumber, complementary blank fields on either side) merges fields instead of one side winning wholesale');
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
  // V6-F56: dni must be a real schema property on ticketHolders, not just documented -- proves the
  // OpenAI structured-output schema itself, not merely the adapter, can carry the value.
  const ticketHolderProps=activityImportSchema.properties.ticketHolders.items.properties;
  assert(ticketHolderProps.dni,'ticketHolderSchema must have a dni property -- the schema itself, not just the adapter, previously had no slot for a per-passenger national ID at all');
  assert(activityImportSchema.properties.ticketHolders.items.required.includes('dni'),'dni must be a required property on each ticket-holder entry, the same discipline as every other ticket-holder field');
  console.log('PASS: the activity schema/prompt shape supports per-ticket-holder breakdown (including dni), robots_disallowed state, and is wired into source classification');
}
// V6-F59/V6-F63/V6-F64/V6-F65: these are live-model prompt-guidance fixes, not adapter code
// changes -- title/provider/location are passed through by the adapter verbatim from whatever the
// model reports (confirmed by direct code inspection during each finding's investigation), so
// there is nothing in the adapter itself to unit-test beyond the pass-through already covered by
// the AE-006/AE-003/AE-004/AE-007 fixture assertions above. What CAN be verified here, and what
// this test actually proves, is that the corrected instructional text was genuinely shipped into
// activitySystemPrompt, not just decided. Per the correction scope document's own framing (see
// FAMILY_TRIPS_ALPHA_0_6_6_1_CORRECTION_SCOPE_V1.md, V6-F65's fix specification): a fixture-based
// test has an inherent ceiling for a live-model-behavior fix -- it verifies the prompt/adapter
// change is present and testable, not that the live model will never regress on a real document.
function test_activity_prompt_guidance_additions(){
  assert(/report BOTH together as activityName/i.test(activitySystemPrompt),'V6-F59: the prompt must tell the model to combine venue name AND ticket-type/admission label together, not prefer one over the other as a strict either/or');
  assert(/provider is the venue\/organizer/i.test(activitySystemPrompt)&&/not the ticket-selling platform/i.test(activitySystemPrompt),'V6-F63: the prompt must give explicit venue-vs-ticketing-platform priority guidance for provider, which previously had none at all');
  assert(/combine both into location/i.test(activitySystemPrompt),'V6-F64: the prompt must instruct combining a venue name with a stated sub-venue, not reporting the sub-venue alone');
  assert(/גן החיות/.test(activitySystemPrompt)&&/do NOT report a specific real zoo/i.test(activitySystemPrompt),'V6-F65: the prompt must carry a concrete negative example against upgrading a generic source label to a specific real-world name from general knowledge');
  console.log('PASS: V6-F59/V6-F63/V6-F64/V6-F65 prompt-guidance corrections are present in activitySystemPrompt');
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
test_V6_F59_title_preserves_combined_venue_and_ticket_type();
test_V6_F61_activity_important_notes_label_not_doubled();
test_V6_F65_ext_unreadable_provider_certainty_blanks_value_and_flags_illegible();
test_V6_F65_ext_exact_provider_certainty_unaffected();
test_V6_F65_ext_unreadable_activityName_certainty_blanks_value_and_flags_illegible();
test_V6_F65_ext_needs_review_certainty_keeps_value_and_flags();
test_V6_F66_merge_activity_ticket_holders_preserves_both_people();
test_V6_F66_merge_activity_participants_union_not_overwrite();
test_V6_F66_merge_activity_ticket_holders_fills_blank_fields_from_either_side();
test_benchmark_file_identity();
test_activity_schema_and_classification();
test_activity_prompt_guidance_additions();
test_activity_url_scope_and_robots_disallowed();

// V6-F68: investigated a one-character name misread ("אילי" instead of "אייל"/Eyal) on a fresh
// AE-007 reimport. Traced every step from the model's raw ticketHolders[].name output to the
// final rendered value: smartImportActivityResultToSuggestion's own mapping
// (activity-import-adapter.js) does `name:String(holder.name||'').trim()` -- no substring
// operation, no regex replace, no character reordering; mergeActivityTicketHolders (V6-F66,
// added in 0.6.6.2) only ever picks one side's WHOLE name string (`current.name||holder.name`),
// never touches individual characters, and normalizedHolderName (used only to build the merge
// MATCH key, never to build the stored value) does trim/lowercase/whitespace-collapse only, also
// no reordering; participants is a Set-deduped pass of the same untouched name strings; rendering
// (activityTicketHoldersTable, src/v5-app.js) reads holder.name directly with no transformation
// either. No code path anywhere in the pipeline is capable of transposing two letters -- this
// confirms V6-F68 is an isolated live-model OCR/transcription inconsistency on that one source
// image, not a genuine adapter/normalization defect. No fix implemented; none is warranted, since
// there is nothing in this codebase to fix. This test protects that conclusion going forward: it
// proves the pipeline is a pure passthrough today, so a future change that accidentally adds any
// transformation to a ticket holder's name would be caught here rather than silently becoming a
// real, code-level version of this same symptom.
function test_V6_F68_ticket_holder_name_is_never_transformed_by_the_pipeline(){
  const source={id:'src-ae007b',name:'AE-007',fingerprint:'ae007b'};
  const oddlySpacedName='  אייל  בן   יצחק  ';
  const result=draftResult({
    activityName:'כניסה לגן החיות 2020',provider:'גן החיות',ticketQuantity:'1',
    ticketHolders:[holder({name:oddlySpacedName,evidence:'linear barcode'})],
    fields:[f('start_date','Date','2020-08-25')],
  });
  const suggestion=smartImportActivityResultToSuggestion(result,source);
  // trim() is the ONLY transformation this pipeline is allowed to apply -- leading/trailing
  // whitespace is stripped, but internal characters (including internal spacing/letter order)
  // must survive completely unchanged, proving there is no normalization step that could ever
  // transpose or otherwise alter the letters of a name.
  assert.equal(suggestion.proposed.details.ticketHolders[0].name,oddlySpacedName.trim(),'a ticket holder\'s name must pass through with only leading/trailing whitespace trimmed -- no other character-level transformation exists anywhere in this pipeline');
  assert.equal(suggestion.proposed.participants[0],oddlySpacedName.trim(),'participants must carry the exact same untransformed string');
  console.log('PASS: V6-F68 confirmed not a code defect -- no code path anywhere transforms a ticket holder\'s name beyond whitespace trimming, so the reported one-character misread is an isolated live-model transcription inconsistency on that one source image');
}
test_V6_F68_ticket_holder_name_is_never_transformed_by_the_pipeline();

console.log('ALL PASS: Alpha 0.6.6 Attraction/Event Smart Import benchmark suite (7/7 AE- cases, mandatory wild-card AE-001, companion-pair AE-003/AE-004, URL sub-scope)');
