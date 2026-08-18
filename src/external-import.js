const BATCH_SCHEMA='familytrips.import';
const ITEM_SCHEMA='familytrips.qr.item';
const VERSION='1.0';
const TYPES=new Set(['flight','hotel','car','activity','restaurant','insurance','contact','participant','document']);
const SCHEDULES=new Set(['single','range','entire','none']);

export function validateImportBatch(value){
  requireObject(value,'קובץ היבוא');
  if(value.schema!==BATCH_SCHEMA)fail('הקובץ אינו familytrips.import');
  if(value.schemaVersion!==VERSION)fail(`גרסת יבוא לא נתמכת: ${value.schemaVersion||'חסרה'}`);
  if(!Array.isArray(value.sources)||!Array.isArray(value.items))fail('חסרים מערכי sources או items');
  const sourceIds=new Set();
  for(const source of value.sources){
    requireObject(source,'מקור');
    requireText(source.sourceId,'sourceId');
    if(sourceIds.has(source.sourceId))fail(`sourceId כפול: ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    requireText(source.originalFileName,'originalFileName');
    if(!Array.isArray(source.linkedItemIds)||!Array.isArray(source.warnings))fail('מבנה מקור לא תקין');
  }
  const itemIds=new Set();
  for(const item of value.items){
    validateItem(item);
    if(itemIds.has(item.externalId))fail(`externalId כפול: ${item.externalId}`);
    itemIds.add(item.externalId);
    for(const ref of item.sourceRefs)if(!sourceIds.has(ref))fail(`הפריט ${item.externalId} מפנה למקור לא קיים: ${ref}`);
  }
  for(const source of value.sources)for(const id of source.linkedItemIds)if(!itemIds.has(id))fail(`המקור ${source.sourceId} מפנה לפריט לא קיים: ${id}`);
  return structuredCloneSafe(value);
}

export function validateQrEnvelope(value){
  requireObject(value,'מעטפת QR');
  if(value.schema!==ITEM_SCHEMA)fail('ה־QR אינו familytrips.qr.item');
  if(value.schemaVersion!==VERSION)fail(`גרסת QR לא נתמכת: ${value.schemaVersion||'חסרה'}`);
  validateItem(value.item);
  if(!Array.isArray(value.sources))fail('חסר מערך sources ב־QR');
  const ids=new Set();
  for(const source of value.sources){
    requireObject(source,'מקור QR');
    requireText(source.sourceId,'sourceId');
    requireText(source.originalFileName,'originalFileName');
    if(ids.has(source.sourceId))fail(`sourceId כפול ב־QR: ${source.sourceId}`);
    ids.add(source.sourceId);
  }
  for(const ref of value.item.sourceRefs)if(!ids.has(ref))fail(`ה־QR מפנה למקור לא קיים: ${ref}`);
  return structuredCloneSafe(value);
}

export async function decodeExternalText(text){
  const value=String(text||'').trim();
  if(!value)fail('לא התקבל תוכן לייבוא');
  if(value.startsWith('FTI1C|'))return {kind:'chunk',chunk:parseChunk(value)};
  if(value.startsWith('FTI1:')){
    const json=decodeBase64Url(value.slice(5));
    const envelope=validateQrEnvelope(parseJson(json,'תוכן ה־QR אינו JSON תקין'));
    return {kind:'batch',batch:envelopeToBatch(envelope),transport:'qr'};
  }
  const batch=validateImportBatch(parseJson(value,'קובץ ה־JSON אינו תקין'));
  return {kind:'batch',batch,transport:'json'};
}

export class MultipartQrCollector{
  constructor(){this.reset()}
  reset(){this.bundleId='';this.total=0;this.sha256='';this.parts=new Map()}
  get progress(){return {bundleId:this.bundleId,collected:this.parts.size,total:this.total,missing:Array.from({length:this.total},(_,i)=>i+1).filter(i=>!this.parts.has(i)),complete:this.total>0&&this.parts.size===this.total}}
  add(text){
    const chunk=typeof text==='string'?parseChunk(text):text;
    if(!this.bundleId){this.bundleId=chunk.bundleId;this.total=chunk.total;this.sha256=chunk.sha256}
    if(chunk.bundleId!==this.bundleId||chunk.total!==this.total||chunk.sha256!==this.sha256)fail('חלק ה־QR שייך לסדרה אחרת');
    const previous=this.parts.get(chunk.part);
    if(previous&&previous!==chunk.chunk)fail('התקבל חלק כפול עם תוכן שונה');
    this.parts.set(chunk.part,chunk.chunk);
    return this.progress;
  }
  async finish(){
    if(!this.progress.complete)fail(`סדרת QR אינה שלמה. חסרים חלקים: ${this.progress.missing.join(', ')}`);
    const encoded=Array.from({length:this.total},(_,i)=>this.parts.get(i+1)).join('');
    const bytes=base64UrlBytes(encoded);
    const actual=await sha256Hex(bytes);
    if(actual.toLowerCase()!==this.sha256.toLowerCase())fail('בדיקת checksum נכשלה; לא נשמר מידע');
    if(actual.slice(0,12).toLowerCase()!==this.bundleId.toLowerCase())fail('מזהה סדרת QR אינו תואם לתוכן');
    const envelope=validateQrEnvelope(parseJson(new TextDecoder().decode(bytes),'תוכן סדרת ה־QR אינו JSON תקין'));
    return envelopeToBatch(envelope);
  }
}

export function importBatchToApp(batch,{idFactory=defaultId,now=new Date()}={}){
  const valid=validateImportBatch(batch);
  const sourceMap=new Map();
  const sources=valid.sources.map(source=>{
    const id=idFactory('src');
    sourceMap.set(source.sourceId,id);
    return {id,kind:'external',name:source.originalFileName,type:source.mediaType||'',size:source.sizeBytes??null,status:'מידע חיצוני — קובץ המקור לא צורף',createdAt:now.toISOString(),storedOffline:false,externalSourceId:source.sourceId,fingerprint:source.sha256||'',externalMetadata:source,binaryIncluded:false};
  });
  const suggestions=valid.items.map(item=>{
    const sourceIds=item.sourceRefs.map(ref=>sourceMap.get(ref)).filter(Boolean);
    const warnings=[...(item.warnings||[])];
    if(sourceIds.length)warnings.push({code:'SOURCE_BYTES_NOT_INCLUDED',field:'sourceRefs',message:'הנתונים המובנים נקלטו, אך קובצי ה־PDF/תמונה המקוריים אינם כלולים ב־QR/JSON.',sourceRefs:item.sourceRefs});
    return {id:idFactory('suggestion'),sourceId:sourceIds[0]||'',sourceIds,status:'pending',origin:'external-import',externalId:item.externalId,proposed:{type:item.type,title:item.title,provider:item.provider||'',confirmationNumber:item.confirmationNumber||'',participants:[...(item.participants||[])],location:item.location||'',website:item.website||'',phone:item.phone||'',schedule:item.schedule,startAt:item.startAt||'',endAt:item.endAt||'',notes:item.notes||'',details:structuredCloneSafe(item.details||{}),dateMeta:structuredCloneSafe(item.dateMeta||{}),fieldConfidence:structuredCloneSafe(item.fieldConfidence||{}),warnings:structuredCloneSafe(warnings)},confidence:overallConfidence(item.fieldConfidence),warnings,externalMetadata:{details:item.details||{},dateMeta:item.dateMeta||{},fieldConfidence:item.fieldConfidence||{},warnings},createdAt:now.toISOString(),updatedAt:now.toISOString(),requiresReview:true};
  });
  return {sources,suggestions,summary:{sources:sources.length,suggestions:suggestions.length,warnings:suggestions.reduce((n,s)=>n+s.warnings.length,0)}};
}

export function canonicalJson(value){
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}';
  return JSON.stringify(value);
}

export async function createQrPayload(envelope){
  const valid=validateQrEnvelope(envelope);
  const json=canonicalJson(valid);
  const bytes=new TextEncoder().encode(json);
  const sha=await sha256Hex(bytes);
  const encoded=encodeBase64Url(bytes);
  if(encoded.length<=1800)return {kind:'single',payloads:[`FTI1:${encoded}`],sha256:sha};
  const chunks=encoded.match(/.{1,1600}/g)||[];
  return {kind:'multipart',payloads:chunks.map((chunk,index)=>`FTI1C|${sha.slice(0,12)}|${index+1}|${chunks.length}|${sha}|${chunk}`),sha256:sha};
}

function envelopeToBatch(envelope){
  return {schema:BATCH_SCHEMA,schemaVersion:VERSION,createdAt:new Date().toISOString(),generator:{kind:'external-language-model',name:'QR import'},tripContext:{name:'',startDate:'',endDate:'',defaultTimeZone:''},sources:envelope.sources.map(source=>({...source,sizeBytes:source.sizeBytes??null,pageCount:source.pageCount??null,status:source.status||'processed',extractionMethod:source.extractionMethod||'external',languages:source.languages||[],linkedItemIds:[envelope.item.externalId],warnings:source.warnings||[]})),items:[envelope.item],duplicateCandidates:[],unresolved:[],batchWarnings:[]};
}

function validateItem(item){
  requireObject(item,'פריט');
  requireText(item.externalId,'externalId');
  if(!TYPES.has(item.type))fail(`סוג פריט לא נתמך: ${item.type}`);
  requireText(item.title,'title');
  if(!SCHEDULES.has(item.schedule))fail(`schedule לא נתמך: ${item.schedule}`);
  if(!Array.isArray(item.participants)||!Array.isArray(item.sourceRefs)||!Array.isArray(item.warnings))fail('מערכי הפריט אינם תקינים');
  if(item.requiresReview!==true)fail('requiresReview חייב להיות true');
  for(const key of ['provider','confirmationNumber','location','website','phone','startAt','endAt','notes'])if(typeof item[key]!=='string')fail(`השדה ${key} חייב להיות מחרוזת`);
  for(const key of ['details','dateMeta','fieldConfidence'])requireObject(item[key],key);
}
function parseChunk(text){
  const parts=String(text).trim().split('|');
  if(parts.length!==6||parts[0]!=='FTI1C')fail('מבנה חלק QR אינו תקין');
  const [,bundleId,partText,totalText,sha256,chunk]=parts;
  const part=Number(partText),total=Number(totalText);
  if(!/^[a-f0-9]{12}$/i.test(bundleId)||!/^[a-f0-9]{64}$/i.test(sha256))fail('מזהה או checksum אינם תקינים');
  if(!Number.isInteger(part)||!Number.isInteger(total)||part<1||total<1||part>total||total>200)fail('מספור חלקי QR אינו תקין');
  if(!/^[A-Za-z0-9_-]+$/.test(chunk))fail('תוכן חלק QR אינו Base64URL תקין');
  return {bundleId,part,total,sha256,chunk};
}
function parseJson(text,message){try{return JSON.parse(text)}catch{fail(message)}}
function decodeBase64Url(value){return new TextDecoder().decode(base64UrlBytes(value))}
function base64UrlBytes(value){
  if(!/^[A-Za-z0-9_-]+$/.test(value))fail('תוכן Base64URL אינו תקין');
  const base64=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  try{return Uint8Array.from(atobCompat(base64),c=>c.charCodeAt(0))}catch{fail('פענוח Base64URL נכשל')}
}
function encodeBase64Url(bytes){return btoaCompat(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256Hex(bytes){const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function overallConfidence(value){const vals=Object.values(value||{}).map(v=>typeof v==='string'?v:v?.confidence).filter(Boolean);return vals.includes('low')?'low':vals.includes('medium')?'medium':vals.length?'high':'medium'}
function requireObject(value,label){if(!value||typeof value!=='object'||Array.isArray(value))fail(`${label} חייב להיות אובייקט`)}
function requireText(value,label){if(typeof value!=='string'||!value.trim())fail(`חסר שדה ${label}`)}
function fail(message){throw new Error(message)}
function defaultId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function structuredCloneSafe(value){return JSON.parse(JSON.stringify(value))}
function atobCompat(value){if(typeof atob==='function')return atob(value);return Buffer.from(value,'base64').toString('binary')}
function btoaCompat(value){if(typeof btoa==='function')return btoa(value);return Buffer.from(value,'binary').toString('base64')}
