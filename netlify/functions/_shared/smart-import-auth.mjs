import crypto from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';

let cachedJwks;
export async function authorize(request){
  const projectId=Netlify.env.get('FAMILYTRIPS_FIREBASE_PROJECT_ID')||Netlify.env.get('VITE_FIREBASE_PROJECT_ID');
  const allowed=parseEmails(Netlify.env.get('FAMILYTRIPS_ALLOWED_EMAILS'));
  if(!projectId||!allowed.size)throw httpError(424,'missing_server_configuration','Server authorization is not configured.');
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)throw httpError(401,'authentication_required','A Firebase ID token is required.');
  cachedJwks||=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
  const {payload}=await jwtVerify(token,cachedJwks,{issuer:`https://securetoken.google.com/${projectId}`,audience:projectId});
  const email=String(payload.email||'').trim().toLowerCase();
  if(payload.email_verified!==true||!allowed.has(email))throw httpError(403,'not_invited','The verified email is not actively invited.');
  // 0.7.2: `token` (the raw, already-verified Firebase ID token) is returned so
  // registerOrVerifyTrip (smart-import-quota.mjs) can make a rules-respecting Firestore REST read
  // as this same caller, rather than a separate service-account/Admin SDK credential -- see
  // docs/versions/V7/0.7.2/DESIGN_V1.md §2.4's reconciliation note and the 0.7.2 implementation
  // report for why this was chosen over the originally-proposed Admin client.
  return {uid:String(payload.sub),email,emailHash:crypto.createHash('sha256').update(email).digest('hex'),token,projectId};
}
export function httpError(status,code,message){const error=new Error(message);error.status=status;error.code=code;return error}
function parseEmails(value){return new Set(String(value||'').split(/[\s,;]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))}

