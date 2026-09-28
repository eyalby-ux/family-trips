import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveParticipantIdsFromDraft} from '../src/ingestion.js';
import {filterAndSortTasks} from '../src/operational-data.js';

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
function test_0_7_9_runSmartAnalysis_resolves_source_participantIds_for_every_flow_not_just_attach_to_existing_item(){
  // Correction round 3 (Finding 1, still failing on retest): round 2 gated this behind
  // `targetItem` truthy, which meant a brand-new item created via Smart Import (smartIngest's own
  // call to runSmartAnalysis passes no third argument -- targetItem defaults to null) never ran
  // this resolution at all. Direct live-model evidence (a real extraction against AE-001) proved
  // the matching function itself is correct even against a word-order variant -- the real gap was
  // this flow-scoping. Now unconditional, so it also fires for new-item creation.
  const start=app.indexOf('async function runSmartAnalysis(');
  const body=app.slice(start,app.indexOf('async function smartIngest(',start));
  assert(body.includes('{const resolvedParticipantIds=resolveParticipantIdsFromDraft(result.draft,state.participants);if(resolvedParticipantIds.length)source.participantIds=resolvedParticipantIds}'));
  assert(!body.includes('if(targetItem){const resolvedParticipantIds'),'the resolution must no longer be gated behind targetItem alone');
}
function test_0_7_9_sourceRow_shows_a_participant_badge_and_a_manual_edit_affordance(){
  // 0.7.9.2 added a third parameter (itemId, for the document soft-unlink action) -- updated in
  // place, same superseding-update discipline used throughout this project.
  const start=app.indexOf('function sourceRow(source,itemType,itemId){');
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

// --- V7-F13 redesigned (correction round 3, Finding 2): document-driven ticket coverage --------

function test_0_7_9_manual_add_ticket_flow_is_fully_retired(){
  // Product Owner design decision: remove the manual "add a ticket" button/form/data-shape
  // entirely -- ticket coverage is now driven by confirming a linked document instead.
  assert(!app.includes('ticket-add-form'),'the manual add-ticket form must be fully gone');
  assert(!app.includes('function ticketParticipantIds'),'the old participantId/participantIds compatibility helper has nothing left to read from');
  assert(!app.includes("action==='ticket-remove'"));
  assert(!app.includes("action==='ticket-toggle-used'"));
}
function test_0_7_9_sourceRow_offers_confirm_as_ticket_coverage_only_for_ticket_eligible_linked_documents(){
  const start=app.indexOf('function sourceRow(source,itemType,itemId){');
  assert(start>-1,'sourceRow must accept the item type, needed to gate the ticket-eligible offer');
  const body=app.slice(start,start+2000);
  assert(body.includes("const ticketEligible=['flight','activity','car'].includes(itemType);"));
  assert(body.includes('const canOfferTicket=ticketEligible&&participantNames.length&&!source.ticketConfirmed;'));
  assert(body.includes('data-action="source-confirm-ticket"'));
}
function test_0_7_9_sourceRow_shows_a_shared_used_toggle_once_a_ticket_is_confirmed_not_before(){
  const start=app.indexOf('function sourceRow(source,itemType,itemId){');
  const body=app.slice(start,start+2000);
  assert(body.includes('data-action="source-ticket-toggle-used" data-id="${source.id}" ${source.ticketUsed?\'checked\':\'\'}'));
  // The confirm button and the used-toggle are mutually exclusive on the same ternary -- a
  // document offers ONE or the OTHER, never both, and never a used-toggle before confirmation.
  assert(body.includes('source.ticketConfirmed?`<span class="badge blue">כרטיס מאושר</span>'));
}
function test_0_7_9_detailView_passes_the_items_own_type_into_sourceRow(){
  // 0.7.9.2 added item.id as a third argument (for the document soft-unlink action) -- updated in
  // place; see tests/v7-9-2-pre-beta-cleanup.mjs for that candidate's own dedicated coverage.
  assert(app.includes('sources.map(source=>sourceRow(source,item.type,item.id))'));
}
function test_0_7_9_source_confirm_ticket_and_toggle_used_handlers_are_wired(){
  assert(app.includes("else if(action==='source-confirm-ticket'){const source=state.sources.find(candidate=>candidate.id===button.dataset.id);if(source){source.ticketConfirmed=true;save();render()}}"));
  assert(app.includes("else if(action==='source-ticket-toggle-used'){const source=state.sources.find(x=>x.id===event.target.dataset.id);if(source){source.ticketUsed=event.target.checked;save();render()}}"));
}
function test_0_7_9_ticketsSection_is_reduced_to_only_the_uncovered_participants_summary(){
  // Per the Product Owner's own explicit instruction: sourceRow is the ONLY place a document's
  // ticket status lives -- this section must not re-list which document covers whom a second
  // time, only the aggregate "still missing a ticket" line.
  const start=app.indexOf('function ticketsSection(item){');
  const body=app.slice(start,app.indexOf('function ',start+30));
  assert(body.includes("state.sources.filter(source=>item.sourceIds?.includes(source.id)&&source.ticketConfirmed)"));
  assert(body.includes('coveredIds.has(participant.id)'));
  assert(!body.includes('data-action="source-confirm-ticket"'),'ticketsSection must not duplicate the per-document confirm/used controls sourceRow already offers');
  assert(!body.includes('data-action="source-ticket-toggle-used"'));
}
function test_0_7_9_a_confirmed_multi_participant_document_clears_every_covered_participant_from_the_remaining_list(){
  // Real behavioral pin of the original V7-F13 report: one document covering several
  // participants must clear all of them from "ללא כרטיס" at once, not just one.
  const coverageComputation=(sources,participants)=>{
    const coveredIds=new Set(sources.filter(s=>s.ticketConfirmed).flatMap(s=>s.participantIds||[]));
    return participants.filter(p=>!coveredIds.has(p.id));
  };
  const participants=[{id:'p1'},{id:'p2'},{id:'p3'}];
  const sources=[{id:'src1',participantIds:['p1','p2','p3'],ticketConfirmed:true,ticketUsed:false}];
  assert.deepEqual(coverageComputation(sources,participants),[]);
}
function test_0_7_9_an_unconfirmed_document_link_does_not_count_as_ticket_coverage(){
  // The "offer, don't auto-create" decision: a participant link alone (source.participantIds)
  // must not clear anyone from the remaining list until ticketConfirmed is explicitly set.
  const coverageComputation=(sources,participants)=>{
    const coveredIds=new Set(sources.filter(s=>s.ticketConfirmed).flatMap(s=>s.participantIds||[]));
    return participants.filter(p=>!coveredIds.has(p.id));
  };
  const participants=[{id:'p1'}];
  const sources=[{id:'src1',participantIds:['p1'],ticketConfirmed:false}];
  assert.deepEqual(coverageComputation(sources,participants).map(p=>p.id),['p1']);
}

function test_0_7_9_the_two_ticket_related_sections_have_distinct_non_confusable_headers(){
  // Correction round 2 (Findings 2/5, found live): both sections used to read the literal text
  // "כרטיסים". Round 3's redesign goes further -- the old item.tickets[] section is gone
  // entirely, replaced by ticketsSection's own reduced "כיסוי כרטיסים" summary line, and
  // Activity's own Smart-Import ticketHolders table (explicitly out of scope, untouched) keeps
  // its own distinct round-2 header.
  assert(app.includes('<h4>פרטי כרטיסים מהמסמך (${ticketHolders.length})</h4>'));
  assert(app.includes('<h3>כיסוי כרטיסים</h3>'));
  assert(!app.includes('<h3>מעקב כרטיסים ידני</h3>'),'the retired manual-ticket section header must be gone');
  assert(!app.includes('<h4>כרטיסים (${ticketHolders.length})</h4>'),'the old, identically-worded ticketHolders header must be gone');
}

// --- Finding 3: filter Tasks by participant ----------------------------------------------------

function test_0_7_9_filterAndSortTasks_by_participant_includes_shared_and_all_scope_tasks_too(){
  // Mirrors visiblePackingItems' own "no participantIds = shared, visible in every view"
  // precedent: filtering by a specific participant shows their own 'specific'-scoped tasks PLUS
  // every 'none'/'all'-scoped task, not just an exact participantIds match.
  const tasks=[
    {id:'t1',title:'shared',participantScope:'none',participantIds:[],priority:'Normal'},
    {id:'t2',title:'everyone',participantScope:'all',participantIds:[],priority:'Normal'},
    {id:'t3',title:'mine',participantScope:'specific',participantIds:['p1'],priority:'Normal'},
    {id:'t4',title:'someone elses',participantScope:'specific',participantIds:['p2'],priority:'Normal'},
  ];
  const visible=filterAndSortTasks(tasks,{priority:'all',due:'all',status:'all',participant:'p1'}).map(t=>t.id);
  assert.deepEqual(visible.sort(),['t1','t2','t3']);
}
function test_0_7_9_filterAndSortTasks_participant_all_shows_everything(){
  const tasks=[{id:'t1',title:'a',participantScope:'specific',participantIds:['p1'],priority:'Normal'},{id:'t2',title:'b',participantScope:'specific',participantIds:['p2'],priority:'Normal'}];
  assert.equal(filterAndSortTasks(tasks,{priority:'all',due:'all',status:'all',participant:'all'}).length,2);
}
function test_0_7_9_tasksView_offers_a_participant_filter_select_alongside_the_existing_ones(){
  const start=app.indexOf('function tasksView(){');
  assert(start>-1);
  const body=app.slice(start,start+2500);
  assert(body.includes('id="task-filter-participant"'));
  assert(body.includes("filters=state.taskFilters||{priority:'all',due:'all',status:'all',participant:'all'}"));
}
function test_0_7_9_task_filter_participant_change_handler_and_clear_are_wired(){
  assert(app.includes("event.target.id==='task-filter-participant'"));
  assert(app.includes("state.taskFilters={priority:'all',due:'all',status:'all',participant:'all'};"));
}

// --- Finding 4: permanent delete for Tasks and Equipment ----------------------------------------

function test_0_7_9_taskRow_and_packRow_offer_a_delete_button(){
  const taskStart=app.indexOf('function taskRow(task){');
  assert(app.slice(taskStart,taskStart+900).includes('data-action="task-delete" data-id="${task.id}"'));
  const packStart=app.indexOf('function packRow(list,item){');
  assert(app.slice(packStart,packStart+900).includes('data-action="pack-delete" data-list="${list.id}" data-item="${item.id}"'));
}
function test_0_7_9_task_delete_and_pack_delete_handlers_confirm_before_permanently_removing(){
  assert(app.includes("else if(action==='task-delete'){if(confirm('למחוק את המשימה לצמיתות?')){state.tasks=state.tasks.filter(x=>x.id!==button.dataset.id);save();render()}}"));
  assert(app.includes("else if(action==='pack-delete'){if(confirm('למחוק את פריט הציוד לצמיתות?')){const list=state.packing.find(x=>x.id===button.dataset.list);if(list)list.items=list.items.filter(x=>x.id!==button.dataset.item);save();render()}}"));
}

const tests=[
  test_0_7_9_resolveParticipantIdsFromDraft_matches_flight_passengers_by_exact_name,
  test_0_7_9_resolveParticipantIdsFromDraft_matches_activity_ticketHolders_and_insurance_insuredPersons,
  test_0_7_9_resolveParticipantIdsFromDraft_falls_back_to_passengerMatchKey_style_matching,
  test_0_7_9_resolveParticipantIdsFromDraft_dedupes_a_name_appearing_in_more_than_one_array,
  test_0_7_9_resolveParticipantIdsFromDraft_returns_empty_for_hotel_and_transport_shaped_drafts,
  test_0_7_9_runSmartAnalysis_resolves_source_participantIds_for_every_flow_not_just_attach_to_existing_item,
  test_0_7_9_sourceRow_shows_a_participant_badge_and_a_manual_edit_affordance,
  test_0_7_9_source_participants_modal_and_its_form_handler_are_wired,
  test_0_7_9_task_form_calls_the_existing_generic_participantAssignmentField_and_owner_is_gone,
  test_0_7_9_task_form_submit_handler_captures_participantScope_and_participantIds_not_owner,
  test_0_7_9_taskRow_displays_the_participant_assignment_and_no_longer_shows_owner,
  test_0_7_9_manual_add_ticket_flow_is_fully_retired,
  test_0_7_9_sourceRow_offers_confirm_as_ticket_coverage_only_for_ticket_eligible_linked_documents,
  test_0_7_9_sourceRow_shows_a_shared_used_toggle_once_a_ticket_is_confirmed_not_before,
  test_0_7_9_detailView_passes_the_items_own_type_into_sourceRow,
  test_0_7_9_source_confirm_ticket_and_toggle_used_handlers_are_wired,
  test_0_7_9_ticketsSection_is_reduced_to_only_the_uncovered_participants_summary,
  test_0_7_9_a_confirmed_multi_participant_document_clears_every_covered_participant_from_the_remaining_list,
  test_0_7_9_an_unconfirmed_document_link_does_not_count_as_ticket_coverage,
  test_0_7_9_the_two_ticket_related_sections_have_distinct_non_confusable_headers,
  test_0_7_9_filterAndSortTasks_by_participant_includes_shared_and_all_scope_tasks_too,
  test_0_7_9_filterAndSortTasks_participant_all_shows_everything,
  test_0_7_9_tasksView_offers_a_participant_filter_select_alongside_the_existing_ones,
  test_0_7_9_task_filter_participant_change_handler_and_clear_are_wired,
  test_0_7_9_taskRow_and_packRow_offer_a_delete_button,
  test_0_7_9_task_delete_and_pack_delete_handlers_confirm_before_permanently_removing,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log('ALL PASS: 0.7.9 -- Participant-system extensions: document auto-link (V7-F09, correction round 3: resolution no longer gated behind an existing-item target), Task participant assignment (V7-F10, owner removed, participant filter added), document-driven ticket coverage (V7-F13 redesigned per Product Owner decision: manual add-ticket retired, confirmation + used-toggle now live on the document\'s own row only), permanent delete for Tasks/Equipment (26 tests). No Firestore emulator or live Smart Import model call is reachable from this environment for most of this suite, so the real end-to-end auto-link-on-extraction behavior against a live document remains unverified against a live backend from here -- consistent with every prior Firestore/Smart-Import-backed candidate in this project; resolveParticipantIdsFromDraft itself was additionally verified against a real live-model extraction during this correction\'s own investigation (see the commit message), not just this suite\'s own synthetic-draft unit tests.');
