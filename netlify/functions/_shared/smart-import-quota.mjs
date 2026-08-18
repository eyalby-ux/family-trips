import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {httpError} from './smart-import-auth.mjs';

const store=()=>getStore({name:'familytrips-smart-import-control',consistency:'strong'});
export async function registerOrVerifyTrip(tripId,user){
  const key=`trip/${hash(tripId)}`;const existing=await store().get(key,{type:'json'});
  if(existing&&existing.ownerUid!==user.uid)throw httpError(403,'trip_not_owned','The active account does not own this Trip.');
  if(!existing)await store().setJSON(key,{ownerUid:user.uid,ownerEmailHash:user.emailHash,createdAt:new Date().toISOString()});
}
export async function consumeDailyQuota(user){
  const limit=Math.max(1,Math.min(100,Number(Netlify.env.get('FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA')||10)));
  const day=new Date().toISOString().slice(0,10);const key=`quota/${day}/${user.emailHash}`;const current=await store().get(key,{type:'json'})||{count:0};
  if(Number(current.count)>=limit)throw httpError(429,'daily_quota_exceeded','Daily Smart Import quota reached.');
  const next={count:Number(current.count)+1,limit,updatedAt:new Date().toISOString()};await store().setJSON(key,next);return next;
}
export async function writeAudit(record){
  const day=new Date().toISOString().slice(0,10);const attemptId=record.attemptId||crypto.randomUUID();
  await store().setJSON(`audit/${day}/${attemptId}`,{attemptId,userEmailHash:record.userEmailHash,tripHash:hash(record.tripId),sourceKind:record.sourceKind,sourceSize:Number(record.sourceSize||0),status:record.status,model:record.model||'',latencyMs:Number(record.latencyMs||0),estimatedVariableCostUsd:Number(record.estimatedVariableCostUsd||0),createdAt:new Date().toISOString()});
}
function hash(value){return crypto.createHash('sha256').update(String(value||'')).digest('hex')}

