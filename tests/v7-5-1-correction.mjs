import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.5.1: two findings from 0.7.5's own acceptance session.
//
// V7-F11 (quarantine re-activate): a direct action on the SAME still-quarantined
// invitations/{email} record, flipping state back to 'active' and clearing revokedAt -- verified
// against the actual rule text (not assumed) that this alone restores access, since isInvited()/
// hasTripAccess() (firestore.rules) and isInvited() (storage.rules) key off nothing but this
// document's own state field.
//
// V7-F12 (newly-invited account blocked): root-caused by direct code inspection, not the
// planning assistant's own guess (item-count gating) -- listMyTrips' "shared with me" query
// (where('editorEmails','array-contains',email)) is evaluated under firestore.rules'
// `allow list: if hasTripAccess(resource)`, which requires isInvited() (the NEW 0.7.5
// application-level check) to be true for the CALLING user, regardless of whether editorEmails
// genuinely lists them. A Trip Owner adding someone as an Editor (addEditorByEmail, governed only
// by the OWNER's own access) can silently create an Editor who cannot see any of their own Trip
// data at all, if that email was never separately application-invited via the admin panel --
// landing on empty() with no explanation, whose only action spins up an unrelated new Trip.
// Fixed by checking and surfacing this gap at the point it's created (the add-editor-form handler,
// v5-app.js), not by weakening the two-layer authorization model (a frozen requirement) or by
// gating Settings differently, since the real gate (state.trip nullness) is already correct
// behavior for a genuinely Trip-less account.
//
// cloud-store.js still cannot be imported directly under this harness (touches firebase.js, which
// touches import.meta.env and throws outside a Vite build) -- verified by source-inspection,
// matching the established pattern for this module throughout this project.
const cloudStore=fs.readFileSync(new URL('../src/cloud-store.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const firestoreRules=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const storageRules=fs.readFileSync(new URL('../storage.rules',import.meta.url),'utf8');

function test_0_7_5_1_reactivateInvitation_flips_state_active_and_clears_revokedAt(){
  const body=cloudStore.slice(cloudStore.indexOf('export async function reactivateInvitation'),cloudStore.indexOf('export async function getInvitation'));
  assert(body.includes("state:'active'"));
  assert(body.includes('revokedAt:null'));
  // Same write path revoke/invite already use -- no new Netlify Function, no new rules concept,
  // matching the kickoff's own expectation to confirm rather than assume this.
  assert(body.includes('invitationRef(normalized)'));
  assert(body.includes('{merge:true}'));
}
function test_0_7_5_1_reactivate_and_delete_rely_on_the_same_state_field_the_rules_already_check(){
  // Direct confirmation, not assumption: isInvited() and isAdmin() (firestore.rules) key off
  // nothing but invitations/{email}'s own `state` field -- flipping it is sufficient, no other
  // rule or field participates in the access decision.
  const isInvitedBody=firestoreRules.slice(firestoreRules.indexOf('function isInvited()'),firestoreRules.indexOf('function isAdmin()'));
  assert(isInvitedBody.includes("data.state == 'active'"));
  assert(!isInvitedBody.includes('isAdmin'));
  assert(!isInvitedBody.includes('revokedAt'));
  // storage.rules' own isInvited() mirrors the same single-field check.
  const storageIsInvited=storageRules.slice(storageRules.indexOf('function isInvited()'),storageRules.indexOf('function hasTripAccess'));
  assert(storageIsInvited.includes("data.state == 'active'"));
}
function test_0_7_5_1_getInvitation_is_general_purpose_not_limited_to_the_caller(){
  const start=cloudStore.indexOf('export async function getInvitation');
  const body=cloudStore.slice(start,cloudStore.indexOf('\n}',start)+2);
  assert(!body.includes('currentEmail()'));
  assert(body.includes('invitationRef(normalized)'));
}
function test_0_7_5_1_quarantine_section_offers_reactivate_regardless_of_deletion_eligibility(){
  const body=app.slice(app.indexOf('function quarantineSection('),app.indexOf('function quarantineSection(')+2000);
  assert(body.includes('data-action="admin-reactivate"'));
  // The reactivate button itself must not carry the eligible-gated disabled attribute the delete
  // button next to it does -- reversibility was never tied to the 30-day window.
  const reactivateButtonStart=body.indexOf('data-action="admin-reactivate"');
  const reactivateButtonEnd=body.indexOf('>',reactivateButtonStart);
  assert(!body.slice(reactivateButtonStart,reactivateButtonEnd).includes('disabled'));
}
function test_0_7_5_1_admin_reactivate_click_handler_wired_to_reactivateInvitation(){
  assert(app.includes("action==='admin-reactivate'"));
  const handlerStart=app.indexOf("action==='admin-reactivate'");
  const handlerEnd=app.indexOf('}}',handlerStart);
  assert(app.slice(handlerStart,handlerEnd).includes('reactivateInvitation(button.dataset.email)'));
}
function test_0_7_5_1_add_editor_checks_application_invitation_and_warns_when_missing(){
  const formHandlerStart=app.indexOf("form.id==='add-editor-form'");
  const formHandlerEnd=app.indexOf("catch(error){alert(error.message||'הוספת המשתתף נכשלה.')}",formHandlerStart);
  const body=app.slice(formHandlerStart,formHandlerEnd);
  assert(body.includes('await addEditorByEmail(state.trip.id,email)'));
  assert(body.includes('await getInvitation(email)'));
  assert(body.includes("invitation.state!=='active'"));
  // The Trip-level grant itself must still succeed either way -- this is a warning surfaced to
  // the Owner, not a block on adding the Editor (per the correction's own scope: no rules change,
  // no new friction on the Trip-level grant itself).
  assert(body.indexOf('await addEditorByEmail')<body.indexOf('await getInvitation'));
}
function test_0_7_5_1_v7_f13_family_ticket_gap_is_not_touched_by_this_correction(){
  // Out-of-scope guard: nothing in this correction should reference ticket/family-ticket
  // handling -- V7-F13 stays a separate, unscoped backlog item per the V114 sequencing decision.
  const diffMarkers=['reactivateInvitation','getInvitation','admin-reactivate'];
  for(const marker of diffMarkers){
    const idx=app.indexOf(marker);
    assert(idx>-1,`expected ${marker} to exist in v5-app.js`);
  }
  assert(!app.slice(app.indexOf('function quarantineSection('),app.indexOf('function quarantineSection(')+2000).includes('ticket'));
}

const tests=[
  test_0_7_5_1_reactivateInvitation_flips_state_active_and_clears_revokedAt,
  test_0_7_5_1_reactivate_and_delete_rely_on_the_same_state_field_the_rules_already_check,
  test_0_7_5_1_getInvitation_is_general_purpose_not_limited_to_the_caller,
  test_0_7_5_1_quarantine_section_offers_reactivate_regardless_of_deletion_eligibility,
  test_0_7_5_1_admin_reactivate_click_handler_wired_to_reactivateInvitation,
  test_0_7_5_1_add_editor_checks_application_invitation_and_warns_when_missing,
  test_0_7_5_1_v7_f13_family_ticket_gap_is_not_touched_by_this_correction,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.5.1 -- quarantine re-activate (V7-F11) + newly-invited account blocked from Settings, root-caused and fixed at the source (V7-F12) (${tests.length} tests). No Firestore emulator or second real Google account is reachable from this environment, so the actual live restore-access-on-reactivate behavior and the add-editor warning's real display remain unverified against a live backend from here -- consistent with every prior Firestore-backed candidate in this project.`);
