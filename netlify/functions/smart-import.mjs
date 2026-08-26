import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import OpenAI from 'openai';
import {convert} from 'html-to-text';
import {authorize,httpError} from './_shared/smart-import-auth.mjs';
import {consumeDailyQuota,registerOrVerifyTrip,writeAudit} from './_shared/smart-import-quota.mjs';
import {flightImportSchema,flightSystemPrompt,hotelImportSchema,systemPrompt} from './_shared/smart-import-schema.mjs';
import {validateHotelPlace} from './_shared/place-validation.mjs';

const MODEL='gpt-5.6-luna';const MAX_BINARY_BYTES=4*1024*1024;const MAX_PAGE_BYTES=1024*1024;
// Flight Smart Import (0.6.5) has no public-URL source in its benchmark and no place-lookup
// step (airports are not validated against Google Places); it otherwise follows the exact same
// attempt/review/evidence pipeline as Hotel Smart Import.
const OPERATIONS={
  analyze_hotel:{schemaName:'familytrips_hotel_import',schema:hotelImportSchema,systemPrompt,instruction:'Extract all readable Hotel information under the frozen FamilyTrips rules.',allowUrl:true,validatePlace:true},
  analyze_flight:{schemaName:'familytrips_flight_import',schema:flightImportSchema,systemPrompt:flightSystemPrompt,instruction:'Extract all readable Flight information under the frozen FamilyTrips rules.',allowUrl:false,validatePlace:false},
};
export default async function handler(request){
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  let audit={attemptId:crypto.randomUUID(),status:'failed'};const started=Date.now();
  try{
    const user=await authorize(request);const body=await request.json();const tripId=String(body.tripId||'').trim();if(!tripId)throw httpError(400,'invalid_trip','tripId is required.');
    audit={...audit,userEmailHash:user.emailHash,tripId};
    if(body.operation==='register_trip'){await registerOrVerifyTrip(tripId,user);return json({registered:true},200)}
    const operation=OPERATIONS[body.operation];if(!operation)throw httpError(400,'invalid_operation','Unsupported operation.');
    await registerOrVerifyTrip(tripId,user);const quota=await consumeDailyQuota(user);const prepared=await prepareSource(body.source,operation.allowUrl);audit={...audit,sourceKind:prepared.kind,sourceSize:prepared.sourceSize};
    const client=new OpenAI();const response=await client.responses.create({model:MODEL,store:false,reasoning:{effort:'low',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:8000,input:[{role:'system',content:operation.systemPrompt},{role:'user',content:[...prepared.content,{type:'input_text',text:operation.instruction}]}],text:{format:{type:'json_schema',name:operation.schemaName,strict:true,schema:operation.schema}}});
    const draft=JSON.parse(response.output_text);const placeValidation=operation.validatePlace?await validateHotelPlace(draft):null;const usage=normalizeUsage(response.usage);const cost=estimateCost(usage);const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:response.model||MODEL,latencyMs,estimatedVariableCostUsd:cost};await writeAudit(audit);
    return json({attemptId:audit.attemptId,state:'proposal_ready',draft,placeValidation,usage,estimatedVariableCostUsd:cost,latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200);
  }catch(error){audit={...audit,status:error.code||'failed',latencyMs:Date.now()-started};if(audit.userEmailHash)await writeAudit(audit).catch(()=>{});console.error('FamilyTrips Smart Import failed',{code:error?.code||'',message:String(error?.message||error)});return json({error:error?.code||'smart_import_failed',message:safeMessage(error)},Number(error?.status)||500)}
}
export const config={path:'/api/familytrips-smart-import',method:'POST'};

async function prepareSource(source,allowUrl=true){
  if(!source||!['pdf','image','url'].includes(source.kind))throw httpError(400,'unsupported_source','Only PDF, image and (where supported) public URL sources are supported.');
  if(source.kind==='url'){
    if(!allowUrl)throw httpError(400,'unsupported_source','A public URL source is not supported for this category.');
    const page=await fetchPublicPage(source.url);return {kind:'url',sourceSize:page.text.length,content:[{type:'input_text',text:`OFFICIAL PUBLIC SOURCE ${page.finalUrl}\n${page.text}`}]}}
  const bytes=Buffer.from(String(source.dataBase64||''),'base64');if(!bytes.length||bytes.length>MAX_BINARY_BYTES)throw httpError(413,'source_too_large','The file is empty or exceeds 4MB.');
  const mime=String(source.mimeType||'');if(source.kind==='pdf'&&mime!=='application/pdf')throw httpError(400,'unsupported_source','Invalid PDF MIME type.');if(source.kind==='image'&&!/^image\/(?:png|jpeg|webp)$/.test(mime))throw httpError(400,'unsupported_source','Only PNG, JPEG and WebP images are supported.');
  const data=`data:${mime};base64,${bytes.toString('base64')}`;return {kind:source.kind,sourceSize:bytes.length,content:[source.kind==='pdf'?{type:'input_file',filename:safeFilename(source.name,'source.pdf'),file_data:data,detail:'high'}:{type:'input_image',image_url:data,detail:'high'}]};
}
async function fetchPublicPage(rawUrl){
  let current=validateUrl(rawUrl);for(let step=0;step<3;step+=1){await assertPublicHost(current.hostname);const response=await fetch(current,{redirect:'manual',headers:{'user-agent':'FamilyTrips-SmartImport/0.6'},signal:AbortSignal.timeout(12000)});if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw httpError(422,'protected_or_private_url','Invalid redirect.');current=validateUrl(new URL(location,current).toString());continue}if(!response.ok)throw httpError(response.status===401||response.status===403?422:502,'protected_or_private_url',`Public page returned HTTP ${response.status}.`);const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))throw httpError(415,'unsupported_source','The URL did not return an HTML page.');const html=await readLimited(response,MAX_PAGE_BYTES);const text=convert(html,{wordwrap:false,selectors:[{selector:'script',format:'skip'},{selector:'style',format:'skip'},{selector:'noscript',format:'skip'}]}).replace(/\n{3,}/g,'\n\n').trim();if(!text)throw httpError(422,'protected_or_private_url','The public page contained no readable content.');return {finalUrl:current.toString(),text}}throw httpError(422,'protected_or_private_url','Too many redirects.');
}
function validateUrl(value){let url;try{url=new URL(String(value||''))}catch{throw httpError(400,'invalid_url','Invalid URL.')}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw httpError(422,'protected_or_private_url','Only public HTTP/HTTPS URLs are supported.');return url}
async function assertPublicHost(hostname){if(hostname==='localhost'||hostname.endsWith('.local'))throw httpError(422,'protected_or_private_url','Private hosts are unsupported.');const addresses=net.isIP(hostname)?[{address:hostname}]:await dns.lookup(hostname,{all:true});if(!addresses.length||addresses.some(({address})=>isPrivateIp(address)))throw httpError(422,'protected_or_private_url','Private network addresses are unsupported.')}
function isPrivateIp(address){if(net.isIPv4(address)){const [a,b]=address.split('.').map(Number);return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a>=224)}const value=address.toLowerCase();return value==='::1'||value==='::'||value.startsWith('fc')||value.startsWith('fd')||value.startsWith('fe8')||value.startsWith('fe9')||value.startsWith('fea')||value.startsWith('feb')}
async function readLimited(response,limit){const reader=response.body.getReader();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw httpError(413,'source_too_large','The public page exceeds the bounded acquisition limit.')}chunks.push(value)}return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))))}
function normalizeUsage(usage){return {inputTokens:Number(usage?.input_tokens||0),outputTokens:Number(usage?.output_tokens||0),totalTokens:Number(usage?.total_tokens||0),cachedInputTokens:Number(usage?.input_tokens_details?.cached_tokens||0)}}
function estimateCost(usage){return Number((((usage.inputTokens-usage.cachedInputTokens)*0.25+usage.cachedInputTokens*0.025+usage.outputTokens*2)/1_000_000).toFixed(6))}
function safeFilename(value,fallback){return String(value||fallback).replace(/[^\p{L}\p{N}._ -]+/gu,'_').slice(0,120)||fallback}
function safeMessage(error){return Number(error?.status)>=500?'Smart Import could not complete this attempt. The original source was not uploaded for retention.':String(error?.message||'Smart Import request failed.')}
function json(value,status){return Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})}
