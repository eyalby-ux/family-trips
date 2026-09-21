import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {SignJWT,importPKCS8} from 'jose';
import {authorize,httpError} from './_shared/smart-import-auth.mjs';

// 0.7.5 (DESIGN_V1.md §5): the one function in this project allowed a Firebase Admin SDK
// credential -- every other server-side Firestore access (registerOrVerifyTrip, this function's
// own caller-authorization step below) deliberately uses the CALLER's own rules-respecting ID
// token instead, specifically to avoid a standing admin credential (0.7.2 DESIGN_V1.md §2.4).
// Deleting another account's data by admin fiat cannot be done as that account's own caller, so a
// privileged credential is unavoidable here -- flagged in the design as the candidate's single
// biggest new risk, and the one thing here that most needs scrutiny before this ships.
//
// FIREBASE_ADMIN_SERVICE_ACCOUNT (new Netlify env var, JSON string of a service-account key) must
// be created by the Product Owner directly in the Firebase Console (Project Settings > Service
// Accounts > Generate new private key) and set as a Netlify environment variable -- this cannot be
// done from this environment, the same standing limitation as every other secret this project has
// ever needed (see smart-import-auth.mjs's own FAMILYTRIPS_ALLOWED_EMAILS history). Until that
// variable is set, this function refuses every request with missing_server_configuration rather
// than silently failing partway through a deletion.
let cachedServiceAccount;
function serviceAccount(){
  if(cachedServiceAccount)return cachedServiceAccount;
  const raw=Netlify.env.get('FIREBASE_ADMIN_SERVICE_ACCOUNT');
  if(!raw)throw httpError(424,'missing_server_configuration','Server admin credentials are not configured.');
  try{cachedServiceAccount=JSON.parse(raw)}catch{throw httpError(424,'missing_server_configuration','Server admin credentials are malformed.')}
  return cachedServiceAccount;
}
function adminApp(){
  if(getApps().length)return getApps()[0];
  return initializeApp({credential:cert(serviceAccount())},'admin-delete-account');
}

// 0.7.5 correction (found live during the qa deploy itself, not by design review or the local
// quality gate -- neither could reproduce this): firebase-admin/auth cannot be imported at all
// inside Netlify's actual bundled Function runtime. It unconditionally `require`s jwks-rsa at
// jwt.js's own top level (part of its token-VERIFICATION machinery -- something this function
// never used; the only thing ever called from firebase-admin/auth was getUserByEmail), and every
// published jwks-rsa 4.x version has its own unfixed upstream bug: it `require`s this project's
// own jose 6.x (already a real, working, unrelated dependency of smart-import-auth.mjs's JWT
// verification), which is ESM-only -- crashing every invocation with ERR_REQUIRE_ESM the instant
// firebase-admin/auth is imported, confirmed via a live 502 on this exact endpoint, not merely a
// theoretical incompatibility. Plain Node (this repo's own test harness, and a bare `node -e`
// import check) does NOT reproduce this -- it is specific to how Netlify's esbuild bundling
// resolves this exact require() chain. firebase-admin/app, /firestore and /storage do not carry
// this same broken import and are unaffected. Fixed by resolving targetEmail -> uid via a direct,
// hand-signed REST call to Google's Identity Toolkit accounts:lookup endpoint instead of
// firebase-admin/auth -- the same "plain REST over heavy SDK surface, using the same credential
// already in hand" pattern this project already established in smart-import-quota.mjs's own
// ownership-reconciliation read (0.7.2 DESIGN_V1.md §2.4), not a new philosophy invented just for
// this fix. jose is already a proven, working dependency for exactly this kind of JWT signing --
// used here for a standard Google OAuth2 service-account JWT-bearer token exchange.
async function accessToken(){
  const account=serviceAccount();
  const now=Math.floor(Date.now()/1000);
  const key=await importPKCS8(account.private_key,'RS256');
  const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/identitytoolkit'})
    .setProtectedHeader({alg:'RS256',typ:'JWT'})
    .setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now+3600)
    .sign(key);
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!response.ok)throw httpError(502,'admin_sdk_error','Could not authenticate the server admin credential.');
  const body=await response.json();
  return body.access_token;
}
// Identity Toolkit's accounts:lookup returns 200 with no `users` field (not a 404) when the email
// matches no account -- an invited-but-never-signed-in target is a legitimate, expected case here,
// not an error; resolveUidByEmail returns null for it, exactly like admin-delete-account's own
// caller already expected from the removed firebase-admin/auth path.
async function resolveUidByEmail(targetEmail){
  const token=await accessToken();
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup',{method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({email:[targetEmail]})});
  if(!response.ok)throw httpError(502,'admin_sdk_error','Could not resolve the target account.');
  const body=await response.json();
  return body?.users?.[0]?.localId||null;
}

// 0.7.5 (DESIGN_V1.md §4): the 30-day quarantine-to-deletion-eligibility check, restated here
// independently from src/operational-data.js's isDeletionEligible -- deliberate duplication, not
// an oversight. This function must never trust whatever the admin UI displayed a moment earlier;
// it re-verifies server-side, against its own fresh Admin SDK read, immediately before the
// irreversible action. Netlify Functions bundle via esbuild and COULD reach across to src/, but
// nothing in this project's netlify/functions tree has ever imported from src/ -- kept
// self-contained here instead, matching every other _shared module's own independence.
const QUARANTINE_DELETION_ELIGIBLE_DAYS=30;
export function isDeletionEligible(invitation,nowIso=new Date().toISOString()){
  if(!invitation||invitation.state!=='revoked'||!invitation.revokedAt)return false;
  const revokedAt=new Date(invitation.revokedAt).getTime();
  const now=new Date(nowIso).getTime();
  if(!Number.isFinite(revokedAt)||!Number.isFinite(now))return false;
  return now-revokedAt>=QUARANTINE_DELETION_ELIGIBLE_DAYS*24*60*60*1000;
}

export default async function handler(request){
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  try{
    // Same caller-token verification and application-invitation check every other Netlify
    // Function in this project uses -- confirms the caller is a real, actively-invited FamilyTrips
    // user before anything admin-specific is even considered.
    const user=await authorize(request);
    const app=adminApp();
    const firestore=getFirestore(app);

    const callerInvitationSnap=await firestore.doc(`invitations/${user.email}`).get();
    const callerInvitation=callerInvitationSnap.exists?callerInvitationSnap.data():null;
    if(!callerInvitation||callerInvitation.state!=='active'||callerInvitation.isAdmin!==true)throw httpError(403,'not_admin','The active account is not an administrator.');

    const body=await request.json();
    const targetEmail=String(body.targetEmail||'').trim().toLowerCase();
    // Explicit naming, per the frozen requirement's literal wording ("a separate, explicit Product
    // Owner confirmation naming the specific account and scope") -- confirm:true alone, with no
    // targetEmail, or the reverse, is refused; there is no implicit "the currently revoked one".
    if(!targetEmail||body.confirm!==true)throw httpError(400,'invalid_request','targetEmail and confirm:true are both required.');
    if(targetEmail===user.email)throw httpError(400,'invalid_request','An administrator cannot delete their own account through this action.');

    const targetInvitationRef=firestore.doc(`invitations/${targetEmail}`);
    const targetInvitationSnap=await targetInvitationRef.get();
    const targetInvitation=targetInvitationSnap.exists?targetInvitationSnap.data():null;
    if(!isDeletionEligible(targetInvitation))throw httpError(409,'not_eligible','This account is not yet eligible for deletion (must be revoked for at least 30 days).');

    const targetUid=await resolveUidByEmail(targetEmail);

    const deletedTripIds=[];
    if(targetUid){
      const ownedTripsSnapshot=await firestore.collection('trips').where('ownerUid','==',targetUid).get();
      for(const tripDoc of ownedTripsSnapshot.docs){
        deletedTripIds.push(tripDoc.id);
        // Storage first, then the Firestore document tree -- so a failure partway through never
        // leaves a Firestore-orphaned Storage prefix with nothing left to explain it (same
        // before-doc-deletion ordering cloud-store.js's own deleteTripCompletely already uses).
        await getStorage(app).bucket().deleteFiles({prefix:`trips/${tripDoc.id}/`}).catch(error=>{
          // A prefix with zero matching objects is not an error worth failing the whole deletion
          // over (a Trip with no attachments at all is a normal, expected case); anything else is
          // reported, not swallowed.
          if(!/no objects/i.test(String(error?.message||'')))throw error;
        });
        // recursiveDelete removes the Trip document AND every subcollection under it (items,
        // sources, suggestions, tasks, participants, editorHistory, every SYNCED_COLLECTIONS
        // entry) in one call -- this is exactly why the client-side SYNCED_COLLECTIONS list never
        // needed enumerating here.
        await firestore.recursiveDelete(tripDoc.ref);
      }
    }

    // Per the frozen non-negotiable (scope document item 2): a revoked user's prior Editor
    // contributions on OTHER people's Trips are never touched by their own account's deletion --
    // only Trips this account itself OWNED were queried/deleted above. Their entry in any other
    // Owner's editorEmails/editorHistory is deliberately left exactly as it is.
    const auditRef=firestore.collection('deletionAudit').doc();
    await auditRef.set({targetEmail,targetUid:targetUid||null,deletedTripIds,confirmedByEmail:user.email,confirmedByUid:user.uid,deletedAt:new Date().toISOString()});
    await targetInvitationRef.delete();

    return json({deleted:true,targetEmail,deletedTripIds},200);
  }catch(error){
    console.error('FamilyTrips admin account deletion failed',{code:error?.code||'',message:String(error?.message||error)});
    return json({error:error?.code||'admin_delete_failed',message:String(error?.message||'Account deletion failed.')},Number(error?.status)||500);
  }
}
export const config={path:'/api/familytrips-admin-delete-account',method:'POST'};
function json(value,status){return Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})}
