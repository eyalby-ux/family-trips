import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import OpenAI from 'openai';
import {convert} from 'html-to-text';
import {authorize,httpError} from './_shared/smart-import-auth.mjs';
import {consumeDailyQuota,registerOrVerifyTrip,writeAudit} from './_shared/smart-import-quota.mjs';
import {activityImportSchema,activitySystemPrompt,classificationSystemPrompt,flightImportSchema,flightSystemPrompt,hotelImportSchema,sourceClassificationSchema,systemPrompt} from './_shared/smart-import-schema.mjs';
import {validateActivityPlace,validateHotelPlace} from './_shared/place-validation.mjs';

const MODEL='gpt-5.6-luna';const MAX_BINARY_BYTES=4*1024*1024;const MAX_PAGE_BYTES=1024*1024;
// Flight Smart Import (0.6.5) has no public-URL source in its benchmark and no place-lookup
// step (airports are not validated against Google Places); it otherwise follows the exact same
// attempt/review/evidence pipeline as Hotel Smart Import. Attraction/Event (0.6.6) DOES ship the
// URL path (official venue/museum/OTA URLs are the intended target -- see fetchPublicPage's
// robots.txt handling below) and DOES validate place accuracy, same as Hotel.
const OPERATIONS={
  analyze_hotel:{schemaName:'familytrips_hotel_import',schema:hotelImportSchema,systemPrompt,instruction:'Extract all readable Hotel information under the frozen FamilyTrips rules.',allowUrl:true,validatePlace:true,place:validateHotelPlace},
  analyze_flight:{schemaName:'familytrips_flight_import',schema:flightImportSchema,systemPrompt:flightSystemPrompt,instruction:'Extract all readable Flight information under the frozen FamilyTrips rules.',allowUrl:false,validatePlace:false,reconcileDirectionByRepetition:true},
  analyze_activity:{schemaName:'familytrips_activity_import',schema:activityImportSchema,systemPrompt:activitySystemPrompt,instruction:'Extract all readable Attraction/Event ticket information under the frozen FamilyTrips rules.',allowUrl:true,validatePlace:true,place:validateActivityPlace},
};
export default async function handler(request){
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  let audit={attemptId:crypto.randomUUID(),status:'failed'};const started=Date.now();
  try{
    const user=await authorize(request);const body=await request.json();const tripId=String(body.tripId||'').trim();if(!tripId)throw httpError(400,'invalid_trip','tripId is required.');
    audit={...audit,userEmailHash:user.emailHash,tripId};
    if(body.operation==='register_trip'){await registerOrVerifyTrip(tripId,user);return json({registered:true},200)}
    const client=new OpenAI();
    // "analyze_source": the Add flow no longer asks the user Hotel vs. Flight -- one small
    // classification call determines it from content, then the matching category's existing
    // extraction call runs exactly as it always has (analyze_hotel/analyze_flight stay
    // available directly for attach-and-extract, where the target item's own type already
    // makes classification unnecessary).
    if(body.operation==='analyze_source'){
      await registerOrVerifyTrip(tripId,user);const quota=await consumeDailyQuota(user);const prepared=await prepareSource(body.source,true);audit={...audit,sourceKind:prepared.kind,sourceSize:prepared.sourceSize};
      const classifyResponse=await client.responses.create({model:MODEL,store:false,reasoning:{effort:'low',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:200,input:[{role:'system',content:classificationSystemPrompt},{role:'user',content:[...prepared.content,{type:'input_text',text:'Classify this document.'}]}],text:{format:{type:'json_schema',name:'familytrips_source_classification',strict:true,schema:sourceClassificationSchema}}});
      const classification=JSON.parse(classifyResponse.output_text);
      const category=['flight','hotel','activity'].includes(classification.category)?classification.category:null;
      if(!category){const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:classifyResponse.model||MODEL,latencyMs};await writeAudit(audit);return json({attemptId:audit.attemptId,state:'no_match',category:'unrecognized',latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200)}
      const operation=OPERATIONS[{flight:'analyze_flight',hotel:'analyze_hotel',activity:'analyze_activity'}[category]];
      const result=await runExtraction(operation,prepared,user);
      const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:result.response.model||MODEL,latencyMs,estimatedVariableCostUsd:result.cost};await writeAudit(audit);
      return json({attemptId:audit.attemptId,state:'proposal_ready',category,draft:result.draft,placeValidation:result.placeValidation,usage:result.usage,estimatedVariableCostUsd:result.cost,latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200);
    }
    const operation=OPERATIONS[body.operation];if(!operation)throw httpError(400,'invalid_operation','Unsupported operation.');
    await registerOrVerifyTrip(tripId,user);const quota=await consumeDailyQuota(user);const prepared=await prepareSource(body.source,operation.allowUrl);audit={...audit,sourceKind:prepared.kind,sourceSize:prepared.sourceSize};
    const result=await runExtraction(operation,prepared,user);
    const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:result.response.model||MODEL,latencyMs,estimatedVariableCostUsd:result.cost};await writeAudit(audit);
    return json({attemptId:audit.attemptId,state:'proposal_ready',draft:result.draft,placeValidation:result.placeValidation,usage:result.usage,estimatedVariableCostUsd:result.cost,latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200);
  }catch(error){audit={...audit,status:error.code||'failed',latencyMs:Date.now()-started};if(audit.userEmailHash)await writeAudit(audit).catch(()=>{});console.error('FamilyTrips Smart Import failed',{code:error?.code||'',message:String(error?.message||error)});return json({error:error?.code||'smart_import_failed',message:safeMessage(error)},Number(error?.status)||500)}
}
async function runExtraction(operation,prepared,user){
  const client=new OpenAI();
  const response=await callExtraction(client,operation,prepared,user);
  let draft=JSON.parse(response.output_text);
  let usage=normalizeUsage(response.usage);
  // V6-F53: a source describing more than one flight segment with no explicit per-segment
  // departure/arrival labels (FL-003: an itinerary summary showing both legs) was root-caused to
  // genuine run-to-run non-determinism in the raw model call (commit 716f950) -- the same
  // unchanged source can read correctly, confidently wrong, or refuse, across separate attempts,
  // and no prompt wording closes that gap because it depends on the model correctly recognizing
  // its own uncertainty, which is itself not guaranteed. Rather than trust a single sample for
  // exactly this higher-risk shape, a second independent call is made and the two readings are
  // cross-checked per segment (matched by flight number, the one identifier direction disputes
  // don't affect); a disagreement is routed through the EXISTING directionAmbiguous/
  // directionCandidates picker (V6-F32/V6-F34) instead of ever silently trusting whichever guess
  // happened to come first -- no new UI, the same mechanism the model itself already uses when it
  // self-diagnoses ambiguity. A source's segment count isn't knowable before the first call
  // returns, so this can only be decided here, after that call, never before it. Scoped to
  // multi-segment flight sources only -- the Product Owner-accepted 2x cost/latency for this
  // shape, not a blanket doubling of every Smart Import call.
  if(operation.reconcileDirectionByRepetition&&Array.isArray(draft.segments)&&draft.segments.length>1){
    const secondResponse=await callExtraction(client,operation,prepared,user);
    const secondDraft=JSON.parse(secondResponse.output_text);
    draft={...draft,segments:reconcileFlightSegmentDirections(draft.segments,secondDraft.segments)};
    usage=combineUsage(usage,normalizeUsage(secondResponse.usage));
  }
  const placeValidation=operation.validatePlace?await operation.place(draft):null;const cost=estimateCost(usage);
  return {response,draft,placeValidation,usage,cost};
}
function callExtraction(client,operation,prepared,user){
  return client.responses.create({model:MODEL,store:false,reasoning:{effort:'low',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:8000,input:[{role:'system',content:operation.systemPrompt},{role:'user',content:[...prepared.content,{type:'input_text',text:operation.instruction}]}],text:{format:{type:'json_schema',name:operation.schemaName,strict:true,schema:operation.schema}}});
}
// Matches segments between the two calls by flight number -- the one identifier that doesn't
// depend on which airport is departure vs. arrival, so it stays stable even when direction
// itself is exactly what's disagreeing. A segment already self-flagged directionAmbiguous by
// either call is left alone (the model already did the right thing on its own); a segment with
// no committed direction on either side has nothing to cross-check. Comparing the full
// departure/arrival airport+date tuple (not just airports alone) catches both an outright
// swap and a same-airports-wrong-dates disagreement.
export function reconcileFlightSegmentDirections(firstSegments,secondSegments){
  const bySecondFlightNumber=new Map((secondSegments||[]).map(segment=>[normalizeFlightNumberForMatch(segment.flightNumber),segment]));
  return (firstSegments||[]).map(segment=>{
    if(segment.directionAmbiguous)return segment;
    const departureCode=String(segment.departureAirportCode||'').trim(),arrivalCode=String(segment.arrivalAirportCode||'').trim();
    if(!departureCode||!arrivalCode)return segment;
    const match=bySecondFlightNumber.get(normalizeFlightNumberForMatch(segment.flightNumber));
    if(!match||match.directionAmbiguous)return segment;
    const matchDeparture=String(match.departureAirportCode||'').trim(),matchArrival=String(match.arrivalAirportCode||'').trim();
    if(!matchDeparture||!matchArrival)return segment;
    const agrees=departureCode===matchDeparture&&arrivalCode===matchArrival&&String(segment.departureDate||'')===String(match.departureDate||'')&&String(segment.arrivalDate||'')===String(match.arrivalDate||'');
    if(agrees)return segment;
    return {
      ...segment,
      directionAmbiguous:true,
      directionCandidates:[
        {departureAirportCode:segment.departureAirportCode,departureAirportName:segment.departureAirportName,arrivalAirportCode:segment.arrivalAirportCode,arrivalAirportName:segment.arrivalAirportName,departureDate:segment.departureDate,departureTime:segment.departureTime,arrivalDate:segment.arrivalDate,arrivalTime:segment.arrivalTime},
        {departureAirportCode:match.departureAirportCode,departureAirportName:match.departureAirportName,arrivalAirportCode:match.arrivalAirportCode,arrivalAirportName:match.arrivalAirportName,departureDate:match.departureDate,departureTime:match.departureTime,arrivalDate:match.arrivalDate,arrivalTime:match.arrivalTime},
      ],
      departureAirportCode:'',departureAirportName:'',arrivalAirportCode:'',arrivalAirportName:'',departureDate:'',departureTime:'',arrivalDate:'',arrivalTime:'',
      evidence:[segment.evidence,'Direction differed between two independent extraction passes over the same source (automated consistency check).'].filter(Boolean).join(' '),
    };
  });
}
function normalizeFlightNumberForMatch(value){return String(value||'').toUpperCase().replace(/\s+/g,'')}
function combineUsage(a,b){return {inputTokens:a.inputTokens+b.inputTokens,outputTokens:a.outputTokens+b.outputTokens,totalTokens:a.totalTokens+b.totalTokens,cachedInputTokens:a.cachedInputTokens+b.cachedInputTokens}}
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
  let current=validateUrl(rawUrl);for(let step=0;step<3;step+=1){await assertPublicHost(current.hostname);await assertRobotsAllowed(current);const response=await fetch(current,{redirect:'manual',headers:{'user-agent':'FamilyTrips-SmartImport/0.6'},signal:AbortSignal.timeout(12000)});if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw httpError(422,'protected_or_private_url','Invalid redirect.');current=validateUrl(new URL(location,current).toString());continue}if(!response.ok)throw httpError(response.status===401||response.status===403?422:502,'protected_or_private_url',`Public page returned HTTP ${response.status}.`);const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))throw httpError(415,'unsupported_source','The URL did not return an HTML page.');const html=await readLimited(response,MAX_PAGE_BYTES);const text=convert(html,{wordwrap:false,selectors:[{selector:'script',format:'skip'},{selector:'style',format:'skip'},{selector:'noscript',format:'skip'}]}).replace(/\n{3,}/g,'\n\n').trim();if(!text)throw httpError(422,'protected_or_private_url','The public page contained no readable content.');return {finalUrl:current.toString(),text}}throw httpError(422,'protected_or_private_url','Too many redirects.');
}
// Attraction/Event (0.6.6): pre-implementation research found 4/4 real ticket-platform URLs
// (Ticketmaster, tickets.hapoelbc.com on two path shapes, tickets.leaan.net) blocked by
// robots.txt -- a distinct safe-failure reason from an authentication/login wall
// (protected_or_private_url), with a different remediation path, so it gets its own code
// (ROBOTS_DISALLOWED) rather than being folded into the existing one. Checked before every fetch
// in the redirect chain, since a redirect can land on a different host with its own policy.
// Missing/unreachable robots.txt default-allows, per standard robots convention -- this is a
// courtesy check, not a security boundary (assertPublicHost/URL validation remain the actual
// SSRF guard).
async function assertRobotsAllowed(url){
  let robotsText='';
  try{
    const response=await fetch(new URL('/robots.txt',url),{headers:{'user-agent':'FamilyTrips-SmartImport/0.6'},signal:AbortSignal.timeout(8000)});
    if(response.ok)robotsText=await readLimited(response,MAX_PAGE_BYTES);
  }catch{return}
  if(!robotsText)return;
  if(isRobotsDisallowed(robotsText,url.pathname))throw httpError(422,'robots_disallowed',`This site's robots.txt disallows automated access to this page.`);
}
export function isRobotsDisallowed(robotsText,pathname){
  const lines=robotsText.split(/\r?\n/).map(line=>line.replace(/#.*/,'').trim());
  let inWildcardBlock=false;const disallowRules=[];
  for(const line of lines){
    const uaMatch=/^user-agent:\s*(.+)$/i.exec(line);
    if(uaMatch){inWildcardBlock=uaMatch[1].trim()==='*';continue}
    if(!inWildcardBlock)continue;
    const disallowMatch=/^disallow:\s*(.*)$/i.exec(line);
    if(disallowMatch)disallowRules.push(disallowMatch[1].trim());
  }
  return disallowRules.some(rule=>rule&&pathname.startsWith(rule));
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
