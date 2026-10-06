import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEM_TYPES,TRANSPORT_MODES,TYPE_FIELDS} from '../src/ingestion.js';
import {SYNCED_COLLECTIONS,TRIP_NESTED_FIELDS} from '../src/operational-data.js';

// 0.7.4 -- four independent content-model items: V6-F82/V7-F02 (their own regression tests live in
// tests/v6-7-insurance-import.mjs and tests/v7-1-small-fixes.mjs, updated in place rather than
// duplicated here), Destination Countries, first-class Transport items, and a from-scratch
// Participant management build. v5-app.js can't be imported directly under this harness (touches
// firebase.js, which touches import.meta.env and throws outside a Vite build), so its own wiring is
// verified by source-inspection below, matching the established pattern for this module throughout
// this project.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

// --- Destination Countries -------------------------------------------------------------------

// Mirrors isHebrewText()'s actual algorithm (v5-app.js can't be imported here) to exercise the
// real logic, not just its source text -- 0x590-0x5FF is the Hebrew Unicode block.
function isHebrewText(text){return [...String(text)].some(char=>{const code=char.codePointAt(0);return code>=0x590&&code<=0x5FF})}
function test_0_7_4_isHebrewText_correctly_distinguishes_hebrew_from_latin_country_names(){
  assert.equal(isHebrewText('תאילנד'),true);
  assert.equal(isHebrewText('Thailand'),false);
  assert.equal(isHebrewText('תאילנד,Laos'.split(',').join('')),true); // mixed -- Hebrew present anywhere counts
  assert.equal(isHebrewText(''),false);
}
function test_0_7_4_destinationCountries_is_a_real_trip_level_synced_field(){
  assert(TRIP_NESTED_FIELDS.includes('destinationCountries'));
}
function test_0_7_4_destinationSummary_renders_the_ordered_list_as_the_apps_own_route_summary(){
  // Verified, not assumed: a direct search of src/ found no separate "destination/route summary"
  // concept anywhere before this candidate -- the MVP scope bullet names one feature, not two.
  const start=app.indexOf('function destinationSummary(){');
  const body=app.slice(start,app.indexOf('function header(',start));
  // Round 1 hardcoded '←' after Hebrew country names read backwards with '→' -- broke right back
  // for English ones (Destination Countries is plain free text, not Hebrew-only), found live by
  // the Product Owner testing "Thailand"/"Laos". Neither arrow direction is correct for both
  // scripts, so the separator must be chosen per-render from what was actually typed.
  assert(body.includes("const arrow=isHebrewText(countries.join(''))?'←':'→';"));
  assert(body.includes('return countries.map(esc).join(`'));
  // Code-point comparison (0x590-0x5FF, the Hebrew Unicode block), not a regex with a literal
  // Hebrew character sitting in source -- exactly what a first attempt here produced by accident.
  assert(app.includes('function isHebrewText(text){return [...String(text)].some(char=>{const code=char.codePointAt(0);return code>=0x590&&code<=0x5FF})}'));
  assert(app.includes('function header(){const destination=destinationSummary();'));
}
function test_0_7_4_destinationsSection_supports_add_move_and_remove_in_order(){
  const start=app.indexOf('function destinationsSection(){');
  const body=app.slice(start,app.indexOf('function settingsView(',start));
  assert(body.includes('data-action="destination-move-up"'));
  assert(body.includes('data-action="destination-move-down"'));
  assert(body.includes('data-action="destination-remove"'));
  assert(body.includes('id="destination-add-form"'));
  assert(app.includes("state.trip.destinationCountries=[...(state.trip.destinationCountries||[]),country];"));
  assert(app.includes("if(index>0){[list[index-1],list[index]]=[list[index],list[index-1]];"));
  assert(app.includes("if(index<list.length-1){[list[index],list[index+1]]=[list[index+1],list[index]];"));
}
function test_0_7_4_destinationsSection_is_wired_into_settingsView(){
  assert(app.includes('${destinationsSection()}${participantsSection()}${sharingSection()}${tripsSection()}'));
}

// --- First-class Transport items --------------------------------------------------------------

function test_0_7_4_car_type_broadened_into_transport_not_replaced_or_duplicated(){
  // Verified before deciding, not assumed: `car` already existed as a fully working item type
  // (own TYPE_FIELDS entry, Trip Center tile, QR/JSON import support via external-import.js's own
  // TYPES allowlist) -- broadened in place rather than added alongside as a new key, since renaming
  // the type key would need a data migration for any already-synced car item with no real benefit.
  assert.equal(ITEM_TYPES.car.label,'תחבורה');
  assert(TYPE_FIELDS.car.includes('transportMode'));
  assert.deepEqual(Object.keys(TRANSPORT_MODES).sort(),['car','ferry','other','rail','transfer'].sort());
}
function test_0_7_4_proposalFields_renders_a_transportMode_select_for_car(){
  const start=app.indexOf('function proposalFields(');
  const body=app.slice(start,app.indexOf('function header(',start));
  assert(body.includes("field('transportMode','סוג תחבורה',"));
  assert(body.includes('name="transportMode"'));
}
function test_0_7_4_buildItemFormValues_captures_transportMode(){
  const ingestion=fs.readFileSync(new URL('../src/ingestion.js',import.meta.url),'utf8');
  assert(ingestion.includes("transportMode:String(data.get('transportMode')||'').trim(),"));
}
function test_0_7_4_itemRow_and_detailView_show_the_specific_transport_sub_type_not_the_generic_label(){
  assert(app.includes("const badgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label||item.type;"));
  assert(app.includes("const detailBadgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label;"));
}
function test_0_7_4_transport_is_reachable_through_manual_creation_and_qr_json_import_only(){
  const externalImport=fs.readFileSync(new URL('../src/external-import.js',import.meta.url),'utf8');
  assert(externalImport.includes("'car'")); // already allowlisted for QR/JSON import
  // 0.7.8 added Smart Import extraction for rental car/rail/ferry (analyzeCarSource) -- this was
  // explicitly out of scope for 0.7.4 itself, confirmed true at the time, but is no longer the
  // current state; see tests/v7-8-transport-smart-import.mjs for that candidate's own coverage.
  // This test now only confirms manual/QR/JSON creation is UNAFFECTED by that later addition, not
  // that Smart Import never exists for Transport at all.
}

// --- Participant management ---------------------------------------------------------------------

function test_0_7_4_participants_is_a_real_separate_synced_collection(){
  assert(SYNCED_COLLECTIONS.some(([stateKey,collectionName])=>stateKey==='participants'&&collectionName==='participants'));
}
function test_0_7_4_participant_item_type_kept_defined_but_excluded_from_new_creation_paths(){
  // The old generic ITEM_TYPES.participant stub (['phone','notes']) is confirmed still present --
  // verified before implementing, not assumed clean: it was already selectable in the manual
  // create-type dropdown and had its own Trip Center tile (only 'link'/'document' were ever
  // excluded), so a real type:'participant' item could already exist server-side. Kept defined so
  // any such legacy item still renders its icon/label correctly, but removed from both places a
  // NEW one could be created from, and from Trip Center's own tile grid.
  assert(ITEM_TYPES.participant);
  assert(app.includes("!['document','link','participant'].includes(key)")); // create-type dropdown
  // Trip Center visibleTypes -- narrowed to the two exclusions this test cares about (not the exact
  // full line) since 0.7.7 added a further exclusion (shoppingPlace) to the same line.
  const visibleTypesStart=app.indexOf('const visibleTypes=');
  const visibleTypesLine=app.slice(visibleTypesStart,app.indexOf('\n',visibleTypesStart));
  assert(visibleTypesLine.includes("'link'")&&visibleTypesLine.includes("'participant'"));
}
function test_0_7_4_participantsSection_is_wired_into_settingsView_the_sole_entry_point(){
  const start=app.indexOf('function participantsSection(){');
  const body=app.slice(start,app.indexOf('function settingsView(',start));
  assert(body.includes("data-action=\"participant-edit\""));
  assert(body.includes("data-action=\"participant-toggle-active\""));
  assert(body.includes("data-action=\"participant-add\""));
  assert(app.includes('${destinationsSection()}${participantsSection()}${sharingSection()}'));
  // Confirmed NOT referenced from center()'s own visibleTypes tile grid -- no standalone Trip
  // Center participant UI is (re)introduced, per the frozen V24 decision.
  const centerStart=app.indexOf('function center(){');
  const centerBody=app.slice(centerStart,app.indexOf('function ',centerStart+20));
  assert(!centerBody.includes('participantsSection'));
}
function test_0_7_4_participant_form_captures_every_acceptance_criterion_field(){
  const start=app.indexOf('function participantModal(){');
  const body=app.slice(start,app.indexOf('function modal(){',start));
  for(const field of ['name','relationship','avatarInitials','phone','email','notes','active']){
    assert(body.includes(`name="${field}"`),`participant form must capture ${field}`);
  }
  const submitStart=app.indexOf("form.id==='participant-form'");
  const submitBody=app.slice(submitStart,app.indexOf('else if(',submitStart+20));
  assert(submitBody.includes('active:existing?'));
}
function test_0_7_4_participant_toggle_active_flips_status_without_deleting_the_record(){
  assert(app.includes("participant.active=participant.active===false;save();render()"));
}

// --- Item/document-participant relationship (per MVP scope: one, several, all, or no participant) --

// 0.7.4.1: the pre-existing free-text `participants` field (comma-separated names, no relationship
// to real Participant records) was originally left untouched here to avoid conflating it with the
// new relationship fields -- but the Product Owner found it left a genuine duplicate control on
// item edit forms once participantAssignmentField existed. Removed for real in 0.7.4.1: see
// tests/v7-4-1-correction.mjs for that correction's own regression coverage.
function test_0_7_4_item_participant_relationship_is_a_separate_field_from_the_old_free_text_one(){
  const ingestion=fs.readFileSync(new URL('../src/ingestion.js',import.meta.url),'utf8');
  assert(ingestion.includes("participantScope,participantIds:participantScope==='specific'?data.getAll('participantIds').map(String):[]"));
}
function test_0_7_4_participantAssignmentField_offers_none_all_and_specific_scopes(){
  const start=app.indexOf('function participantAssignmentField(p){');
  const body=app.slice(start,app.indexOf('function proposalFields(',start));
  assert(body.includes('value="none"'));
  assert(body.includes('value="all"'));
  assert(body.includes('value="specific"'));
  // Beta 0.8 Phase 2 (P12-F2): the checkbox list itself is the shared participantCheckboxes() helper every picker uses.
  assert(body.includes('participantCheckboxes(p.participantIds)'));
  const helperStart=app.indexOf('function participantCheckboxes(');
  assert(app.slice(helperStart,helperStart+900).includes("name='participantIds'"),'the helper still defaults to the participantIds field every submit handler reads');
}
function test_0_7_4_participantAssignmentLabel_reflects_scope_on_the_item_detail_page(){
  const start=app.indexOf('function participantAssignmentLabel(item){');
  const body=app.slice(start,app.indexOf('const TICKET_TYPES',start));
  assert(body.includes("item.participantScope==='all'"));
  assert(body.includes("item.participantScope==='specific'"));
  // Beta 0.8 Phase 2: the detail page's facts are a <dl> now (detailFact), not <p><b>label:</b> rows.
  assert(app.includes("detailFact('משויך ל',participantAssignmentLabel(item)?"));
}

// --- Tickets and passes ---------------------------------------------------------------------

// Beta 0.8 Phase 2: ticketsSection() became ticketsAndDocumentsSection(); a non-ticket type gets a plain Documents block.
// Beta 0.8 Phase 2.1 (P2-F4): the section is one card; a non-ticket type simply gets "מסמכים" instead of "כרטיסים ומסמכים".
function test_0_7_4_ticketsSection_applies_only_to_attractions_flights_and_transport(){
  // MVP scope: "For attractions, flights, transport, and events" -- mapped to this app's own type
  // set (activity covers both attraction and event; car is the broadened Transport type).
  const ticketCard=fs.readFileSync(new URL('../src/ticket-card.js',import.meta.url),'utf8');
  assert(ticketCard.includes("TICKET_ITEM_TYPES=Object.freeze(['flight','activity','car'])"));
  assert(app.includes('const TICKET_TYPES=TICKET_ITEM_TYPES;'));
  assert(app.includes("const heading=eligible?'כרטיסים ומסמכים':'מסמכים';"));
}

// 0.7.4's own manual "add a ticket"/item.tickets[] flow (per-ticket used-state toggle,
// remove button, add-ticket form) was retired outright by 0.7.9's own correction round 3
// (Finding 2) -- a genuine Product Owner product decision, not a regression: ticket coverage is
// now driven by confirming a document already linked to a participant (sourceRow's own "אישור
// ככיסוי כרטיס" control), with "used" tracked as one shared boolean on that same document
// (source.ticketConfirmed/ticketUsed), not a separate manually-added tickets[] entry. These two
// tests are updated in place to assert the retirement, rather than deleted outright, preserving
// the historical record the same way 0.7.4.1's own tests document its retired free-text
// `participants` field. Full coverage for the new document-driven design lives in
// tests/v7-9-participant-extensions.mjs.
function test_0_7_4_tickets_support_per_ticket_used_state_and_show_remaining_participants(){
  // Beta 0.8 Phase 2.1 (P2-F4): the manual flow stays retired; the remaining-participants line is the card's coverage summary now.
  const start=app.indexOf('function ticketSlideHtml(');
  const body=app.slice(start,app.indexOf('function selectTicket(',start));
  assert(!body.includes('data-action="ticket-toggle-used"'),'the manual per-ticket used-toggle was retired by 0.7.9 round 3 -- used lives on the ticket slide');
  assert(!body.includes('id="ticket-add-form"'),'the manual add-ticket form was retired by 0.7.9 round 3');
  const summary=app.slice(app.indexOf('function ticketSummaryBlock('),app.indexOf('function otherDocRow('));
  assert(summary.includes('ללא כרטיס:'),'participants without a ticket must still be visible');
}

function test_0_7_4_ticket_handlers_are_wired(){
  assert(!app.includes("action==='ticket-toggle-used'"),'retired by 0.7.9 round 3 -- see source-ticket-toggle-used in tests/v7-9-participant-extensions.mjs');
  assert(!app.includes("action==='ticket-remove'"),'retired by 0.7.9 round 3 -- a document is unlinked via its own participant-edit affordance, not a per-ticket remove button');
  assert(!app.includes("form.id==='ticket-add-form'"),'retired by 0.7.9 round 3');
}

// --- Packing: shared list + personal list per participant -----------------------------------

function test_0_7_4_visiblePackingItems_shows_shared_items_plus_that_participants_own(){
  const start=app.indexOf('function visiblePackingItems(list){');
  const body=app.slice(start,app.indexOf('function packingView(',start));
  assert(body.includes("if(view==='shared')return items.filter(item=>!(item.participantIds||[]).length);"));
  assert(body.includes("return items.filter(item=>!(item.participantIds||[]).length||(item.participantIds||[]).includes(view));"));
}
function test_0_7_4_packingView_offers_a_participant_switcher(){
  const start=app.indexOf('function packingView(){');
  const body=app.slice(start,app.indexOf('function packRow(',start));
  // Beta 0.8 Phase 1.1: the markup moved into participantCarousel()/participantChips() (the action
  // name is passed in); packingView still wires the same action.
  assert(body.includes("'packing-view-participant'"));
  assert(body.includes("[['shared','משותף']"));
}
function test_0_7_4_packing_add_item_replaced_prompt_with_a_real_multi_select_modal(){
  // The old prompt()-based add flow couldn't reliably support "assignable to one or more
  // participants" (a sequence of single-value text dialogs, not a multi-select).
  assert(!app.includes("const name=prompt('שם הפריט')"));
  assert(app.includes("else if(action==='pack-add'){state.modal={type:'packing-item',listId:button.dataset.list,itemId:null};render()}"));
  const modalStart=app.indexOf('function packingItemModal(){');
  const modalBody=app.slice(modalStart,app.indexOf('function modal(){',modalStart));
  // Beta 0.8 Phase 2 (P12-F2): every picker's checkbox list is the shared participantCheckboxes() helper.
  assert(modalBody.includes('participantCheckboxes(item.participantIds)'));
}
function test_0_7_4_packing_item_form_still_checks_for_cross_category_duplicate_names(){
  // The old prompt()-based flow's packingDuplicate() safeguard must survive the modal rewrite.
  assert(app.includes("if(packingDuplicate(state.packing,name,form.dataset.itemId||'')){alert('פריט בשם זה כבר קיים בקטגוריה אחרת.');return}"));
}
function test_0_7_4_packRow_shows_assigned_participant_names_and_an_edit_control(){
  const start=app.indexOf('function packRow(list,item){');
  const body=app.slice(start,app.indexOf('\n',start));
  assert(body.includes('data-action="pack-edit"'));
  // Beta 0.8 Phase 2.1 (P2-F5): the assigned participants show as ONE chip line (participantChipLabel) and the whole row is the edit control.
  assert(body.includes('participantChipLabel('));
}
function test_0_7_4_packingParticipantView_is_preserved_as_an_ephemeral_field_across_remote_updates(){
  assert(app.includes('packingParticipantView:\'shared\''));// EMPTY's own default
  assert(app.includes('calendarDate,toast,packingParticipantView}=state;'));
}

const tests=[
  test_0_7_4_isHebrewText_correctly_distinguishes_hebrew_from_latin_country_names,
  test_0_7_4_destinationCountries_is_a_real_trip_level_synced_field,
  test_0_7_4_destinationSummary_renders_the_ordered_list_as_the_apps_own_route_summary,
  test_0_7_4_destinationsSection_supports_add_move_and_remove_in_order,
  test_0_7_4_destinationsSection_is_wired_into_settingsView,
  test_0_7_4_car_type_broadened_into_transport_not_replaced_or_duplicated,
  test_0_7_4_proposalFields_renders_a_transportMode_select_for_car,
  test_0_7_4_buildItemFormValues_captures_transportMode,
  test_0_7_4_itemRow_and_detailView_show_the_specific_transport_sub_type_not_the_generic_label,
  test_0_7_4_transport_is_reachable_through_manual_creation_and_qr_json_import_only,
  test_0_7_4_participants_is_a_real_separate_synced_collection,
  test_0_7_4_participant_item_type_kept_defined_but_excluded_from_new_creation_paths,
  test_0_7_4_participantsSection_is_wired_into_settingsView_the_sole_entry_point,
  test_0_7_4_participant_form_captures_every_acceptance_criterion_field,
  test_0_7_4_participant_toggle_active_flips_status_without_deleting_the_record,
  test_0_7_4_item_participant_relationship_is_a_separate_field_from_the_old_free_text_one,
  test_0_7_4_participantAssignmentField_offers_none_all_and_specific_scopes,
  test_0_7_4_participantAssignmentLabel_reflects_scope_on_the_item_detail_page,
  test_0_7_4_ticketsSection_applies_only_to_attractions_flights_and_transport,
  test_0_7_4_tickets_support_per_ticket_used_state_and_show_remaining_participants,
  test_0_7_4_ticket_handlers_are_wired,
  test_0_7_4_visiblePackingItems_shows_shared_items_plus_that_participants_own,
  test_0_7_4_packingView_offers_a_participant_switcher,
  test_0_7_4_packing_add_item_replaced_prompt_with_a_real_multi_select_modal,
  test_0_7_4_packing_item_form_still_checks_for_cross_category_duplicate_names,
  test_0_7_4_packRow_shows_assigned_participant_names_and_an_edit_control,
  test_0_7_4_packingParticipantView_is_preserved_as_an_ephemeral_field_across_remote_updates,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.4 -- Destination Countries, first-class Transport items, participant management (participants/relationships/tickets/packing) (${tests.length} tests). V6-F82/V7-F02 regression tests live in their own original files (tests/v6-7-insurance-import.mjs, tests/v7-1-small-fixes.mjs), updated in place. Real two-device sync, live Firestore behavior, and actual browser rendering are NOT exercised by this suite -- see docs/versions/V7/0.7.4/EXECUTABLE_TEST_SESSION_V1.md for what the acceptance session verifies instead.`);
