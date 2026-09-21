import crypto from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';

let cachedJwks;
export async function authorize(request){
  const projectId=Netlify.env.get('FAMILYTRIPS_FIREBASE_PROJECT_ID')||Netlify.env.get('VITE_FIREBASE_PROJECT_ID');
  if(!projectId)throw httpError(424,'missing_server_configuration','Server authorization is not configured.');
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)throw httpError(401,'authentication_required','A Firebase ID token is required.');
  cachedJwks||=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  const {payload}=await jwtVerify(token,cachedJwks,{issuer:`https://securetoken.google.com/${projectId}`,audience:projectId});
  const email=String(payload.email||'').trim().toLowerCase();
  if(payload.email_verified!==true)throw httpError(403,'not_invited','The verified email is not actively invited.');
  // 0.7.5 (DESIGN_V1.md §0.1/§7): replaces the FAMILYTRIPS_ALLOWED_EMAILS env-var check --
  // previously a SEPARATE, unsynced store from the Firestore config/appInvitations mirror rules
  // themselves checked, so revoking an account here required two independent updates (this env var
  // AND the Firestore doc) to actually block both application and Smart Import access. Now both
  // read the exact same invitations/{email} Firestore collection, so one write (firestore.rules'
  // own isAdmin()-gated invitations collection) blocks everywhere at once, closing the frozen
  // "revoking immediately blocks application AND AI-service access" requirement for real.
  if(!(await isActivelyInvited(email,token,projectId)))throw httpError(403,'not_invited','The verified email is not actively invited.');
  // 0.7.2: `token` (the raw, already-verified Firebase ID token) is returned so
  // registerOrVerifyTrip (smart-import-quota.mjs) can make a rules-respecting Firestore REST read
  // as this same caller, rather than a separate service-account/Admin SDK credential -- see
  // docs/versions/V7/0.7.2/DESIGN_V1.md §2.4's reconciliation note and the 0.7.2 implementation
  // report for why this was chosen over the originally-proposed Admin client.
  return {uid:String(payload.sub),email,emailHash:crypto.createHash('sha256').update(email).digest('hex'),token,projectId};
}
// Same rules-respecting REST-as-caller pattern registerOrVerifyTrip (smart-import-quota.mjs) uses
// for Trip ownership -- no Admin SDK credential needed here either. firestore.rules' own
// invitations/{email} `allow read: if request.auth != null` covers this caller reading their own
// record, so a plain authenticated REST GET (using the same already-verified token) succeeds
// exactly the way a client-side getDoc() would.
async function isActivelyInvited(email,token,projectId){
  const url=`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invitations/${encodeURIComponent(email)}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(response.status===404)return false;
  if(!response.ok)throw httpError(502,'invitation_check_failed','Could not verify application invitation.');
  const body=await response.json();
  return body?.fields?.state?.stringValue==='active';
}
export function httpError(status,code,message){const error=new Error(message);error.status=status;error.code=code;return error}

