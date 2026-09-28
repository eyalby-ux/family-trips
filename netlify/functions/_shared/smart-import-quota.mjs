import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {httpError} from './smart-import-auth.mjs';

const store=()=>getStore({name:'familytrips-smart-import-control',consistency:'strong'});
// 0.7.2: reconciled with Firestore's own ownerUid instead of maintaining two independent
// ownership records that could disagree (DESIGN_V1.md §2.4). Reads /trips/{tripId} via Firestore's
// REST API using the CALLER's own already-verified Firebase ID token (user.token) -- an ordinary,
// rules-respecting read, exactly what firestore.rules already allows an Owner/Editor to do
// themselves, not an admin/service-account bypass. This was chosen over the originally-proposed
// Admin-SDK/service-account approach specifically to avoid introducing a new standing credential
// for this -- see the 0.7.2 implementation report.
//
// A Trip not yet migrated to Firestore (readTripFromFirestore returns null, meaning the read
// failed with 404 -- the document doesn't exist) falls back to the pre-0.7.2 Netlify Blobs
// first-writer-wins record, unchanged, so Smart Import keeps working exactly as before for any
// Trip whose owner hasn't run the 0.7.2 migration yet. A Trip that DOES exist in Firestore is
// authoritative there, permanently -- registerOrVerifyTrip never falls back to Blobs for a
// migrated Trip, even if the Firestore read itself errors for some other reason (a transient
// failure must not silently re-open a check that Firestore's own rules already settled).
async function readTripOwnerFromFirestore(tripId,user){
  if(!user.projectId||!user.token)return {status:'unavailable'};
  const url=`https://firestore.googleapis.com/v1/projects/${user.projectId}/databases/(default)/documents/trips/${encodeURIComponent(tripId)}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${user.token}`}});
  if(response.status===404)return {status:'not_found'};
  if(response.status===403)return {status:'forbidden'};
  if(!response.ok)return {status:'error',httpStatus:response.status};
  const body=await response.json();
  const ownerUid=body?.fields?.ownerUid?.stringValue||null;
  // 0.7.5 (DESIGN_V1.md §7): the same REST body already fetched above carries editorEmails too --
  // parsed here alongside ownerUid rather than issuing a second Firestore read, since Editor-level
  // Smart Import permission (frozen deferral, MVP_DELIVERY_HISTORY.md V54) is exactly "accept the
  // same caller check firestore.rules' own isOwner(trip)||isEditor(trip) already allows the caller
  // to do themselves for ordinary Trip reads/writes."
  const editorEmails=(body?.fields?.editorEmails?.arrayValue?.values||[]).map(value=>String(value?.stringValue||'').trim().toLowerCase());
  return {status:'found',ownerUid,editorEmails};
}
export async function registerOrVerifyTrip(tripId,user){
  const firestoreResult=await readTripOwnerFromFirestore(tripId,user);
  if(firestoreResult.status==='found'){
    if(firestoreResult.ownerUid!==user.uid&&!firestoreResult.editorEmails.includes(user.email))throw httpError(403,'trip_not_owned','The active account is neither the Owner nor an Editor on this Trip.');
    return;
  }
  if(firestoreResult.status==='forbidden')throw httpError(403,'trip_not_owned','The active account is neither the Owner nor an Editor on this Trip.');
  // status is 'not_found' (genuinely not yet migrated) or 'unavailable'/'error' (Firestore
  // unreachable/misconfigured) -- both fall back to the legacy Blobs check rather than blocking
  // Smart Import outright, matching this function's pre-0.7.2 behavior for every caller who
  // hasn't touched the new datastore at all yet. A pre-migration Trip has no concept of Editors at
  // all (Blobs' own first-writer-wins record predates 0.7.2's Owner/Editor model entirely), so this
  // fallback path stays Owner-only, unchanged -- Editor access here is exclusively a Firestore-Trip
  // concern, matching firestore.rules' own scope.
  const key=`trip/${hash(tripId)}`;const existing=await store().get(key,{type:'json'});
  if(existing&&existing.ownerUid!==user.uid)throw httpError(403,'trip_not_owned','The active account does not own this Trip.');
  if(!existing)await store().setJSON(key,{ownerUid:user.uid,ownerEmailHash:user.emailHash,createdAt:new Date().toISOString()});
}
// CR-003 (Pre-Beta Code Health & Security Review V1): the old read-check-write was three separate
// steps, not atomic -- two requests from the same account arriving near-simultaneously could both
// read a count just under the limit and both be let through. Fixed with optimistic concurrency
// using @netlify/blobs' own documented compare-and-swap primitives (onlyIfNew/onlyIfMatch), not a
// new dependency: a missing record is created with onlyIfNew (fails if another caller created it
// first); an existing one is updated with onlyIfMatch against the ETag just read (fails if another
// caller already wrote since that read). Either failure means a concurrent caller won the race --
// re-read the fresh state and retry, so the loser's own retry correctly either succeeds (there was
// still room) or hits the real, now-accurate quota-exceeded check (there wasn't), never silently
// overshooting. 10 attempts is generous headroom for this app's real-world (low, personal-scale)
// contention; exhausting it fails closed (denies the request) rather than risking an unmetered
// request through, matching this being a cost-control boundary, not a security one.
export async function consumeDailyQuota(user){
  const limit=Math.max(1,Math.min(100,Number(Netlify.env.get('FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA')||10)));
  const day=new Date().toISOString().slice(0,10);const key=`quota/${day}/${user.emailHash}`;
  for(let attempt=0;attempt<10;attempt+=1){
    const existing=await store().getWithMetadata(key,{type:'json'});
    const current=existing?.data||{count:0};
    if(Number(current.count)>=limit)throw httpError(429,'daily_quota_exceeded','Daily Smart Import quota reached.');
    const next={count:Number(current.count)+1,limit,updatedAt:new Date().toISOString()};
    const result=existing?await store().setJSON(key,next,{onlyIfMatch:existing.etag}):await store().setJSON(key,next,{onlyIfNew:true});
    if(result.modified)return next;
  }
  throw httpError(503,'quota_check_conflict','Could not confirm Smart Import quota due to concurrent requests. Please try again.');
}
export async function writeAudit(record){
  const day=new Date().toISOString().slice(0,10);const attemptId=record.attemptId||crypto.randomUUID();
  await store().setJSON(`audit/${day}/${attemptId}`,{attemptId,userEmailHash:record.userEmailHash,tripHash:hash(record.tripId),sourceKind:record.sourceKind,sourceSize:Number(record.sourceSize||0),status:record.status,model:record.model||'',latencyMs:Number(record.latencyMs||0),estimatedVariableCostUsd:Number(record.estimatedVariableCostUsd||0),createdAt:new Date().toISOString()});
}
function hash(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex')}

