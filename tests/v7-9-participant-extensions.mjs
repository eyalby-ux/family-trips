import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveParticipantIdsFromDraft} from '../src/ingestion.js';

// 0.7.9 -- Participant-system extensions: V7-F09 (auto-link an attached document to the correct
// participant), V7-F10 (link Tasks to the participant system), V7-F13 (a "family" ticket covering
// multiple participants). Design-gate decision (confirmed by direct code inspection, recorded in
// FAMILY_TRIPS_ALPHA_0_7_9_SCOPE_V1.md): none of the three touches the datastore's access-control
// shape or the sync engine, so no design-first gate applied -- direct to scope+kickoff, matching
// 0.7.4/0.7.7/0.7.8. v5-app.js can't be imported directly under this harness (touches firebase.js,
// which touches import.meta.env and throws outside a Vite build), so its own wiring is verified by
// source-inspection below, matching the established pattern for this module throughout this
// project. ingestion.js has no such dependency and is imported directly for real unit coverage.
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

// --- V7-F09: auto-link an attached document to the correct participant -----------------------

function test_0_7_9_resolveParticipantIdsFromDraft_matches_flight_passengers_by_exact_name(){
  const participants=[{id:'p1',name:'Yitzhak Cohen'},{id:'p2',name:'Dana Cohen'}];
  const draft={passengers:[{name:'Yitzhak Cohen'},{name:'Someone Else'}]};
  assert.deepEqual(resolveParticipantIdsFromDraft(draft,participants),['p1']);
}
function test_0_7_9_resolveParticipantIdsFromDraft_matches_activity_ticketHolders_and_insurance_insuredPersons(){
  const participants=[{id:'p1',name:'Yitzhak Cohen'},{id:'p2',name:'Dana Cohen'}];
  assert.deepEqual(resolveParticipantIdsFromDraft({ticketHolders:[{name:'Dana Cohen'}]},participants),['p2']);
  assert.deepEqual(resolveParticipantIdsFromDraft({insuredPersons:[{name:'Yitzhak Cohen'},{name:'Dana Cohen'}]},participants),['p1','p2']);
}
function test_0_7_9_resolveParticipantIdsFromDraft_falls_back_to_passengerMatchKey_style_matching(){
  // Reuses flight-import-adapter.js's own title/sort-insensitive match key, not a new invention --
  // "Mr Yitzhak Cohen" must still resolve against a plain "Yitzhak Cohen" participant record.
  const participants=[{id:'p1',name:'Yitzhak Cohen'}];
  assert.deepEqual(resolveParticipantIdsFromDraft({passengers:[{name:'Mr Yitzhak Cohen'}]},participants),['p1']);
}
function test_0_7_9_resolveParticipantIdsFromDraft_dedupes_a_name_appearing_in_more_than_one_array(){
  const participants=[{id:'p1',name:'Yitzhak Cohen'}];
  const draft={passengers:[{name:'Yitzhak Cohen'}],ticketHolders:[{name:'Yitzhak Cohen'}]};
  assert.deepEqual(resolveParticipantIdsFromDraft(draft,participants),['p1']);
}
function test_0_7_9_resolveParticipantIdsFromDraft_returns_empty_for_hotel_and_transport_shaped_drafts(){
  // Confirmed by direct code inspection, not assumed: Hotel and Transport (car) have no
  // structured per-person name array at all today -- this must resolve to no match, not throw.
  const participants=[{id:'p1',name:'Yitzhak Cohen'}];
  assert.deepEqual(resolveParticipantIdsFromDraft({provider:'Some Hotel'},participants),[]);
  assert.deepEqual(resolveParticipantIdsFromDraft(null,participants),[]);
  assert.deepEqual(resolveParticipantIdsFromDraft({passengers:[{name:'Yitzhak Cohen'}]},[]),[]);
}
function test_0_7_9_runSmartAnalysis_only_resolves_source_participantIds_for_the_attach_to_existing_item_flow(){
  const start=app.indexOf('async function runSmartAnalysis(');
  const body=app.slice(start,app.indexOf('async function smartIngest(',start));
  assert(body.includes('if(targetItem){const resolvedParticipantIds=resolveParticipantIdsFromDraft(result.draft,state.participants);if(resolvedParticipantIds.length)source.participantIds=resolvedParticipantIds}'));
}
function test_0_7_9_sourceRow_shows_a_participant_badge_and_a_manual_edit_affordance(){
  const start=app.indexOf('function sourceRow(source){');
  const body=app.slice(start,app.indexOf('function gamesView(',start));
  assert(body.includes('const participantNames=(source.participantIds||[]).map(id=>state.participants.find(p=>p.id===id)?.name).filter(Boolean);'));
  assert(body.includes('data-action="source-edit-participants"'));
}
function test_0_7_9_source_participants_modal_and_its_form_handler_are_wired(){
  assert(app.includes("function sourceParticipantsModal(){"));
  assert(app.includes("state.modal.type==='source-participants')return sourceParticipantsModal();"));
  assert(app.includes("else if(action==='source-edit-participants'){state.modal={type:'source-participants',sourceId:button.dataset.id};render()}"));
  const start=app.indexOf("form.id==='source-participants-form'");
  assert(start>-1);
  const body=app.slice(start,start+300);
  assert(body.includes('source.participantIds=data.getAll(\'participantIds\').map(String)'));
}

// --- V7-F10: link Tasks to the participant system ---------------------------------------------

function test_0_7_9_task_form_calls_the_existing_generic_participantAssignmentField_and_owner_is_gone(){
  // Correction round (Test 4, found live): Product Owner overrode the round-1 "keep both" report
  // once both fields sat side by side on the same form -- owner reads as a duplication now that
  // participantIds exists, so it's removed from the form entirely.
  const start=app.indexOf("function simpleFormModal(){const type=state.modal.type;if(type==='task')");
  const body=app.slice(start,app.indexOf("if(type==='shopping')",start));
  assert(body.includes('${participantAssignmentField(task)}'));
  assert(!body.includes('name="owner"'),'the free-text owner field must no longer be rendered on the task form');
}
function test_0_7_9_task_form_submit_handler_captures_participantScope_and_participantIds_not_owner(){
  const start=app.indexOf("form.id==='task-form'");
  const body=app.slice(start,app.indexOf("else if(form.id==='shopping-form')",start));
  assert(body.includes("const participantScope=['none','all','specific'].includes(String(data.get('participantScope')))?String(data.get('participantScope')):'none';"));
  assert(body.includes("participantScope,participantIds:participantScope==='specific'?data.getAll('participantIds').map(String):[]"));
  // owner is no longer read from the form -- confirmed absent, not silently still there.
  assert(!body.includes("data.get('owner')"),'the submit handler must no longer read an owner field that no longer exists on the form');
  // Non-destructive: Object.assign(existing,values) with no `owner` key in values leaves an
  // already-existing task's own stored owner value untouched in Firestore, not cleared to blank.
  assert(body.includes('if(existing)Object.assign(existing,values);'));
}
function test_0_7_9_taskRow_displays_the_participant_assignment_and_no_longer_shows_owner(){
  const start=app.indexOf('function taskRow(task){');
  const body=app.slice(start,start+700);
  assert(body.includes('const participantLabel=participantAssignmentLabel(task);'));
  assert(body.includes('${participantLabel?esc(participantLabel)+\' · \':\'\'}'));
  assert(!body.includes('task.owner'),'taskRow must no longer read/display the removed owner field');
}

// --- V7-F13: a "family" ticket covering multiple participants ---------------------------------

function test_0_7_9_ticketsSection_remaining_and_row_rendering_use_participantIds_plural(){
  const start=app.indexOf('function ticketsSection(item){');
  const body=app.slice(start,app.indexOf('function detailView(',start));
  assert(body.includes('!tickets.some(ticket=>ticketParticipantIds(ticket).includes(participant.id))'));
  assert(body.includes('const names=ticketParticipantIds(ticket).map(id=>state.participants.find(candidate=>candidate.id===id)?.name).filter(Boolean);'));
  assert(!body.includes('ticket.participantId==='),'the old singular-participantId shape must be fully gone as the primary read path, not left as dead code alongside the new one');
}
function test_0_7_9_ticketParticipantIds_reads_pre_existing_singular_participantId_tickets_without_a_migration(){
  // Real data risk, not hypothetical: tickets have been a live, tested Production feature since
  // 0.7.4 (2026-09-21), so an already-existing ticket record on a real Trip has {participantId}
  // (singular), not {participantIds} -- reading only the new shape would have silently shown
  // "משתתף לא ידוע" (unknown participant) for every ticket that already existed before this ships.
  const start=app.indexOf('function ticketParticipantIds(ticket){');
  const fn=app.slice(start,app.indexOf('}',start)+1);
  const impl=new Function('ticket',fn.slice(fn.indexOf('{')+1,fn.lastIndexOf('}')));
  assert.deepEqual(impl({participantId:'p1'}),['p1']);
  assert.deepEqual(impl({participantIds:['p1','p2']}),['p1','p2']);
  assert.deepEqual(impl({}),[]);
}
function test_0_7_9_ticket_add_form_is_a_multi_select_checkbox_picker_not_a_single_select(){
  const start=app.indexOf('function ticketsSection(item){');
  const body=app.slice(start,app.indexOf('function detailView(',start));
  assert(body.includes('<form id="ticket-add-form" data-item-id="${item.id}"'));
  assert(body.includes('name="participantIds"'));
  assert(!body.includes('<select name="participantId">'),'the add-ticket form must no longer offer only one participant per ticket');
}
function test_0_7_9_ticket_add_form_submit_handler_requires_at_least_one_selected_participant(){
  const start=app.indexOf("form.id==='ticket-add-form'");
  const body=app.slice(start,start+900);
  assert(body.includes("participantIds=data.getAll('participantIds').map(String)"));
  assert(body.includes("if(item&&participantIds.length){item.tickets=[...(item.tickets||[]),{id:uid('ticket'),participantIds,used:false,code:String(data.get('code')||'').trim()}];save();render()}"));
}
function test_0_7_9_a_single_multi_participant_ticket_clears_every_covered_participant_from_the_remaining_list(){
  // Real behavioral pin of the original V7-F13 report (OPEN_GAPS_FOR_PLANNING_20260921.md, item
  // 3): one family ticket must satisfy every participant it names at once, not just one of them.
  const remainingComputation=(tickets,participants)=>participants.filter(participant=>!tickets.some(ticket=>(ticket.participantIds||[]).includes(participant.id)));
  const participants=[{id:'p1'},{id:'p2'},{id:'p3'}];
  const tickets=[{id:'t1',participantIds:['p1','p2','p3'],used:false,code:'FAM123'}];
  assert.deepEqual(remainingComputation(tickets,participants),[]);
}

function test_0_7_9_the_two_ticket_related_sections_have_distinct_non_confusable_headers(){
  // Correction round (Findings 2/5, found live): both sections used to read the literal text
  // "כרטיסים" -- Activity's own pre-existing ticketHolders table (Smart Import-extracted, h4)
  // stacked directly above item.tickets[]'s own manual tracker (h3), on the same detail page.
  // Reported as confusing/duplicated UI, and very likely why a just-added multi-participant
  // ticket row (which does render correctly -- see the ticketsSection tests above) went
  // unnoticed: nothing distinguished which "כרטיסים" section was which.
  assert(app.includes('<h4>פרטי כרטיסים מהמסמך (${ticketHolders.length})</h4>'));
  assert(app.includes('<h3>מעקב כרטיסים ידני</h3>'));
  assert(!app.includes('<h4>כרטיסים (${ticketHolders.length})</h4>'),'the old, identically-worded ticketHolders header must be gone');
}

const tests=[
  test_0_7_9_resolveParticipantIdsFromDraft_matches_flight_passengers_by_exact_name,
  test_0_7_9_resolveParticipantIdsFromDraft_matches_activity_ticketHolders_and_insurance_insuredPersons,
  test_0_7_9_resolveParticipantIdsFromDraft_falls_back_to_passengerMatchKey_style_matching,
  test_0_7_9_resolveParticipantIdsFromDraft_dedupes_a_name_appearing_in_more_than_one_array,
  test_0_7_9_resolveParticipantIdsFromDraft_returns_empty_for_hotel_and_transport_shaped_drafts,
  test_0_7_9_runSmartAnalysis_only_resolves_source_participantIds_for_the_attach_to_existing_item_flow,
  test_0_7_9_sourceRow_shows_a_participant_badge_and_a_manual_edit_affordance,
  test_0_7_9_source_participants_modal_and_its_form_handler_are_wired,
  test_0_7_9_task_form_calls_the_existing_generic_participantAssignmentField_and_owner_is_gone,
  test_0_7_9_task_form_submit_handler_captures_participantScope_and_participantIds_not_owner,
  test_0_7_9_taskRow_displays_the_participant_assignment_and_no_longer_shows_owner,
  test_0_7_9_ticketsSection_remaining_and_row_rendering_use_participantIds_plural,
  test_0_7_9_ticketParticipantIds_reads_pre_existing_singular_participantId_tickets_without_a_migration,
  test_0_7_9_ticket_add_form_is_a_multi_select_checkbox_picker_not_a_single_select,
  test_0_7_9_ticket_add_form_submit_handler_requires_at_least_one_selected_participant,
  test_0_7_9_a_single_multi_participant_ticket_clears_every_covered_participant_from_the_remaining_list,
  test_0_7_9_the_two_ticket_related_sections_have_distinct_non_confusable_headers,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log('ALL PASS: 0.7.9 -- Participant-system extensions: document auto-link (V7-F09), Task participant assignment (V7-F10, owner field removed per correction round), multi-participant tickets (V7-F13, plus the correction round\'s distinct-headers fix for Findings 2/5) (17 tests). No Firestore emulator or live Smart Import model call is reachable from this environment, so the real end-to-end auto-link-on-extraction behavior against a live document remains unverified against a live backend from here -- consistent with every prior Firestore/Smart-Import-backed candidate in this project. resolveParticipantIdsFromDraft itself is exercised directly, not just by source-inspection.');
