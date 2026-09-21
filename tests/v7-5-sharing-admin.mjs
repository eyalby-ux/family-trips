import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isDeletionEligible as clientIsDeletionEligible,QUARANTINE_DELETION_ELIGIBLE_DAYS} from '../src/operational-data.js';
import {isDeletionEligible as serverIsDeletionEligible} from '../netlify/functions/admin-delete-account.mjs';

// 0.7.5 (DESIGN_V1.md): administer the sharing model -- invitations/{email} collection replacing
// config/appInvitations, quarantine via that same collection's state, a new admin-delete-account.mjs
// Netlify Function (this project's first Firebase Admin SDK credential), and Editor-level Smart
// Import authorization. isDeletionEligible is deliberately duplicated (client display vs. server
// re-verification, per §4/§5's own "never trust what the client displayed" reasoning) -- both real,
// importable, dependency-free functions, tested directly and against each other, not by
// source-inspection, since neither touches import.meta.env or Netlify.env at module scope.

function test_0_7_5_isDeletionEligible_false_for_an_active_never_revoked_account(){
  assert.equal(clientIsDeletionEligible({state:'active',revokedAt:null}),false);
  assert.equal(clientIsDeletionEligible(null),false);
  assert.equal(clientIsDeletionEligible(undefined),false);
}
function test_0_7_5_isDeletionEligible_false_before_30_days_have_passed(){
  const revokedAt=new Date('2026-09-01T00:00:00Z').toISOString();
  const justUnder30Days=new Date('2026-09-30T23:59:59Z').toISOString();
  assert.equal(clientIsDeletionEligible({state:'revoked',revokedAt},justUnder30Days),false);
}
function test_0_7_5_isDeletionEligible_true_at_exactly_30_days_and_beyond(){
  const revokedAt=new Date('2026-09-01T00:00:00Z').toISOString();
  const exactly30Days=new Date('2026-10-01T00:00:00Z').toISOString();
  const wellPast30Days=new Date('2026-11-01T00:00:00Z').toISOString();
  assert.equal(clientIsDeletionEligible({state:'revoked',revokedAt},exactly30Days),true);
  assert.equal(clientIsDeletionEligible({state:'revoked',revokedAt},wellPast30Days),true);
}
function test_0_7_5_isDeletionEligible_false_for_an_active_state_even_with_an_old_revokedAt(){
  // A stale/leftover revokedAt on an account that was later re-invited (state flipped back to
  // 'active') must never make it look eligible for deletion -- state is the authoritative gate,
  // not merely the presence of a timestamp.
  const longAgo=new Date('2020-01-01T00:00:00Z').toISOString();
  assert.equal(clientIsDeletionEligible({state:'active',revokedAt:longAgo}),false);
}
function test_0_7_5_client_and_server_eligibility_checks_agree(){
  // Deliberately duplicated logic (DESIGN_V1.md §4/§5) -- this is the test that keeps the two
  // independent implementations honest against each other, not just each against its own spec.
  const cases=[
    {state:'active',revokedAt:null},
    {state:'revoked',revokedAt:new Date(Date.now()-1*24*60*60*1000).toISOString()},
    {state:'revoked',revokedAt:new Date(Date.now()-29*24*60*60*1000).toISOString()},
    {state:'revoked',revokedAt:new Date(Date.now()-30*24*60*60*1000).toISOString()},
    {state:'revoked',revokedAt:new Date(Date.now()-45*24*60*60*1000).toISOString()},
    null,
  ];
  for(const invitation of cases)assert.equal(clientIsDeletionEligible(invitation),serverIsDeletionEligible(invitation),`client/server disagree for ${JSON.stringify(invitation)}`);
}
function test_0_7_5_quarantine_eligible_days_constant_is_30(){
  assert.equal(QUARANTINE_DELETION_ELIGIBLE_DAYS,30);
}

// Every other 0.7.5 module either imports firebase.js (cloud-store.js, v5-app.js -- touches
// import.meta.env, throws outside a Vite build) or firebase-admin/app's Netlify.env.get() inside a
// function body only reachable with real credentials -- both fully importable at MODULE level
// (confirmed above), but their actual runtime behavior against a live Firestore/Auth backend is
// unverifiable from this environment (the same standing limitation as every prior Firestore-backed
// candidate in this project). Verified by source-inspection instead, matching the established
// pattern for these exact modules throughout this project.
const firestoreRules=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const storageRules=fs.readFileSync(new URL('../storage.rules',import.meta.url),'utf8');
const authShared=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-auth.mjs',import.meta.url),'utf8');
const quotaShared=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-quota.mjs',import.meta.url),'utf8');
const adminFn=fs.readFileSync(new URL('../netlify/functions/admin-delete-account.mjs',import.meta.url),'utf8');
const cloudStore=fs.readFileSync(new URL('../src/cloud-store.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

function test_0_7_5_firestore_rules_invitations_collection_replaces_config_appInvitations(){
  // config/appInvitations survives only in this file's own explanatory comment (the "what this
  // replaced" note) -- the active rule logic itself must never reference it as a real path.
  assert(!firestoreRules.includes('get(/databases/$(database)/documents/config/appInvitations)'));
  assert(!firestoreRules.includes('match /config/'));
  assert(firestoreRules.includes('match /invitations/{email}'));
  assert(firestoreRules.includes('function isAdmin()'));
  // Read is broad (every invited user), write is admin-gated -- matches the read-broad/
  // write-narrow pattern DESIGN_V1.md §2's own comment establishes.
  const invitationsBlock=firestoreRules.slice(firestoreRules.indexOf('match /invitations/{email}'),firestoreRules.indexOf('match /trips/{tripId}'));
  assert(invitationsBlock.includes('allow read: if request.auth != null;'));
  assert(invitationsBlock.includes('allow write: if isAdmin();'));
}
function test_0_7_5_firestore_isInvited_guards_a_nonexistent_invitation_document_explicitly(){
  // Unlike the old single always-existing config/appInvitations document, an arbitrary email may
  // have no invitations/{email} document at all -- exists() must guard the get() before .data is
  // ever dereferenced, not rely on implicit fail-closed-on-error semantics.
  const isInvitedBody=firestoreRules.slice(firestoreRules.indexOf('function isInvited()'),firestoreRules.indexOf('function isAdmin()'));
  assert(isInvitedBody.includes('exists(callerInvitationPath())'));
  assert(isInvitedBody.includes("data.state == 'active'"));
}
function test_0_7_5_storage_rules_read_the_same_invitations_collection(){
  assert(!storageRules.includes('firestore.get(/databases/(default)/documents/config/appInvitations)'));
  assert(storageRules.includes('firestore.exists(/databases/(default)/documents/invitations/'));
  assert(storageRules.includes("data.state == 'active'"));
}
function test_0_7_5_smart_import_auth_reads_invitations_collection_not_the_env_var_allowlist(){
  assert(authShared.includes('function isActivelyInvited('));
  assert(authShared.includes('await isActivelyInvited(email,token,projectId)'));
  assert(authShared.includes('/documents/invitations/'));
  // The env var allowlist mechanism itself (parseEmails/allowed.has) must be gone, not merely
  // unused dead code sitting alongside the new check -- FAMILYTRIPS_ALLOWED_EMAILS survives only
  // in this file's own explanatory comment, never as a real Netlify.env.get() call.
  assert(!authShared.includes('parseEmails'));
  assert(!authShared.includes("Netlify.env.get('FAMILYTRIPS_ALLOWED_EMAILS')"));
}
function test_0_7_5_registerOrVerifyTrip_accepts_an_editor_not_only_the_owner(){
  const body=quotaShared.slice(quotaShared.indexOf('export async function registerOrVerifyTrip'));
  const foundBranch=body.slice(0,body.indexOf("if(firestoreResult.status==='forbidden')"));
  assert(foundBranch.includes('firestoreResult.editorEmails.includes(user.email)'));
  assert(quotaShared.includes('editorEmails'));
}
function test_0_7_5_admin_delete_account_requires_explicit_target_and_confirmation(){
  assert(adminFn.includes("body.confirm!==true"));
  assert(adminFn.includes('targetEmail'));
  // Cannot be a no-op self-service deletion path -- an admin must not be able to delete their own
  // account through this specific action.
  assert(adminFn.includes('targetEmail===user.email'));
}
function test_0_7_5_admin_delete_account_reverifies_eligibility_and_caller_admin_status_server_side(){
  assert(adminFn.includes('isDeletionEligible(targetInvitation)'));
  assert(adminFn.includes('callerInvitation.isAdmin!==true'));
}
function test_0_7_5_admin_delete_account_never_touches_trips_it_does_not_own(){
  assert(adminFn.includes("collection('trips').where('ownerUid','=='"));
  // No query keyed by editorEmails/editorHistory anywhere in this function -- the frozen
  // non-negotiable that another Owner's Trip content survives a revoked Editor's own account
  // deletion untouched depends on this function never querying by those fields (the substring
  // appears only in this file's own explanatory comment, never in a real .where()/collection()
  // call).
  assert(!adminFn.includes("where('editorEmails'"));
  assert(!adminFn.includes("collection('editorHistory'"));
}
function test_0_7_5_admin_delete_account_uses_recursiveDelete_not_a_hand_rolled_collection_sweep(){
  assert(adminFn.includes('firestore.recursiveDelete(tripDoc.ref)'));
}
function test_0_7_5_admin_delete_account_writes_an_audit_record_before_removing_the_invitation(){
  const deleteIndex=adminFn.indexOf('await targetInvitationRef.delete()');
  const auditIndex=adminFn.indexOf("firestore.collection('deletionAudit')");
  assert(auditIndex>-1&&deleteIndex>-1&&auditIndex<deleteIndex);
}
function test_0_7_5_admin_delete_account_uses_its_own_admin_sdk_credential_env_var(){
  assert(adminFn.includes("Netlify.env.get('FIREBASE_ADMIN_SERVICE_ACCOUNT')"));
  assert(adminFn.includes('missing_server_configuration'));
}
function test_0_7_5_client_endpoint_path_matches_the_function_config_path(){
  const configPath=/config=\{path:'([^']+)'/.exec(adminFn)?.[1];
  assert(configPath);
  assert(app.includes(`fetch('${configPath}'`));
}
function test_0_7_5_cloud_store_invitation_crud_and_editor_history_functions_exist(){
  assert(cloudStore.includes('export async function listInvitations()'));
  assert(cloudStore.includes('export async function inviteByEmail(email)'));
  assert(cloudStore.includes('export async function revokeInvitation(email)'));
  assert(cloudStore.includes('export async function getMyInvitation()'));
  assert(cloudStore.includes('export async function listEditorHistory(tripId)'));
  // isAdmin must never be written by inviteByEmail's own payload -- merge:true would otherwise
  // silently reset a genuinely re-invited former admin's isAdmin flag back to falsy, since
  // Firestore's merge only preserves fields the write OMITS, not fields explicitly set to false.
  const inviteBody=cloudStore.slice(cloudStore.indexOf('export async function inviteByEmail'),cloudStore.indexOf('export async function revokeInvitation'));
  assert(!inviteBody.includes('isAdmin'));
}
function test_0_7_5_v5_app_admin_view_is_gated_on_myInvitation_isAdmin(){
  assert(app.includes('function adminView()'));
  assert(app.includes('if(!myInvitation?.isAdmin)'));
  assert(app.includes('admin:adminView'));
  // The Trip-independent exception list in render()'s own top-level gate must include 'admin'
  // alongside 'trips' -- an admin with zero Trips yet must still be able to reach this screen.
  assert(app.includes("!['trips','admin'].includes(state.view)"));
}
function test_0_7_5_delete_account_confirmation_requires_typing_the_exact_email(){
  const fnBody=app.slice(app.indexOf('async function deleteAccountViaAdmin'),app.indexOf('async function deleteAccountViaAdmin')+1200);
  assert(fnBody.includes('prompt('));
  assert(fnBody.includes('typed'));
  assert(fnBody.includes('targetEmail.toLowerCase()'));
}

const tests=[
  test_0_7_5_isDeletionEligible_false_for_an_active_never_revoked_account,
  test_0_7_5_isDeletionEligible_false_before_30_days_have_passed,
  test_0_7_5_isDeletionEligible_true_at_exactly_30_days_and_beyond,
  test_0_7_5_isDeletionEligible_false_for_an_active_state_even_with_an_old_revokedAt,
  test_0_7_5_client_and_server_eligibility_checks_agree,
  test_0_7_5_quarantine_eligible_days_constant_is_30,
  test_0_7_5_firestore_rules_invitations_collection_replaces_config_appInvitations,
  test_0_7_5_firestore_isInvited_guards_a_nonexistent_invitation_document_explicitly,
  test_0_7_5_storage_rules_read_the_same_invitations_collection,
  test_0_7_5_smart_import_auth_reads_invitations_collection_not_the_env_var_allowlist,
  test_0_7_5_registerOrVerifyTrip_accepts_an_editor_not_only_the_owner,
  test_0_7_5_admin_delete_account_requires_explicit_target_and_confirmation,
  test_0_7_5_admin_delete_account_reverifies_eligibility_and_caller_admin_status_server_side,
  test_0_7_5_admin_delete_account_never_touches_trips_it_does_not_own,
  test_0_7_5_admin_delete_account_uses_recursiveDelete_not_a_hand_rolled_collection_sweep,
  test_0_7_5_admin_delete_account_writes_an_audit_record_before_removing_the_invitation,
  test_0_7_5_admin_delete_account_uses_its_own_admin_sdk_credential_env_var,
  test_0_7_5_client_endpoint_path_matches_the_function_config_path,
  test_0_7_5_cloud_store_invitation_crud_and_editor_history_functions_exist,
  test_0_7_5_v5_app_admin_view_is_gated_on_myInvitation_isAdmin,
  test_0_7_5_delete_account_confirmation_requires_typing_the_exact_email,
];
for(const test of tests){test();console.log(`PASS: ${test.name}`)}
console.log(`ALL PASS: 0.7.5 -- administer the sharing model (${tests.length} tests). No Firestore emulator or Firebase Auth Admin API is reachable from this environment, so registerOrVerifyTrip's Editor-acceptance branch, the invitations/{email} rules' actual server-side enforcement, and admin-delete-account.mjs's real deletion sweep remain unverified against a live backend from here -- consistent with every prior Firestore-backed candidate in this project.`);
