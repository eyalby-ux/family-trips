import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import OpenAI from 'openai';
import {convert} from 'html-to-text';
import {PNG} from 'pngjs';
import UTIF from 'utif2';
// CR-002 (Pre-Beta Code Health & Security Review V1): undici's own fetch/Agent, not Node's global
// fetch -- confirmed directly (not assumed) that mixing an npm-installed undici Agent's dispatcher
// into Node's global fetch throws (`InvalidArgumentError: invalid onRequestStart method`), since
// global fetch uses Node's own internal, differently-versioned bundled undici. Only undici's own
// fetch export accepts this package's own Agent as a dispatcher.
import {Agent as UndiciAgent, fetch as undiciFetch} from 'undici';
import {authorize,httpError} from './_shared/smart-import-auth.mjs';
import {consumeDailyQuota,registerOrVerifyTrip,writeAudit} from './_shared/smart-import-quota.mjs';
import {activityImportSchema,activitySystemPrompt,classificationSystemPrompt,flightImportSchema,flightSystemPrompt,hotelImportSchema,insuranceImportSchema,insuranceSystemPrompt,sourceClassificationSchema,systemPrompt,transportGatePrompt,transportGateSchema,transportImportSchema,transportSystemPrompt} from './_shared/smart-import-schema.mjs';
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
  // Insurance (0.6.7): PDF/image only, no URL acquisition in this slice
  // (INSURANCE_SMART_IMPORT_DISCOVERY.md V3, Decision 7 -- no real insurer-portal URL example exists to validate a
  // bounded scope against). No place validation either -- an insurance policy has no venue/address.
  analyze_insurance:{schemaName:'familytrips_insurance_import',schema:insuranceImportSchema,systemPrompt:insuranceSystemPrompt,instruction:'Extract all readable Insurance policy information under the frozen FamilyTrips rules.',allowUrl:false,validatePlace:false},
  // Transport (0.7.8): PDF/image only, no URL acquisition (TRANSPORT_SMART_IMPORT_DISCOVERY.md V6,
  // Decision 7 -- no real Transport-provider portal URL was benchmarked). No place validation --
  // mirrors Flight's own precedent (no Google Places lookup for airports either), not Hotel/
  // Activity's: a rental-car pickup branch, rail station or ferry port is not the kind of
  // single-venue address Places validation was built to check, and this wasn't asked for in the
  // frozen scope document.
  analyze_car:{schemaName:'familytrips_transport_import',schema:transportImportSchema,systemPrompt:transportSystemPrompt,instruction:'Extract all readable Transport (rental car, rail or ferry/boat) information under the frozen FamilyTrips rules.',allowUrl:false,validatePlace:false},
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
    // 0.7.8 correction round 4 (Test 4, found live): rounds 2 and 3 both assumed a SYSTEMATIC
    // cause (prompt weighting, then reasoning budget) and both retests came back unchanged on the
    // type field while unrelated symptoms shifted (a self-contradiction warning appeared, then
    // disappeared) -- exactly the pattern of a cause that hadn't actually been isolated yet.
    // Per the round-3 correction's own explicit request, direct evidence was gathered against the
    // real live model for TR-005 specifically, before proposing anything else: dozens of repeated
    // real classification calls against the identical document/prompt/schema found this is NOT a
    // systematic bias fixable by wording or budget, and -- the first, honest surprise -- also not
    // simple run-to-run noise a self-consistency majority vote could out-vote either: 'car'
    // (correct) came back only ~30% of the time, with 'activity' (wrong -- what the Product
    // Owner's own two acceptance retests both happened to land on) actually the single MOST common
    // raw answer at ~36%. A 3-vote majority, tested directly, produced the wrong majority (or no
    // majority) in 3 of 5 real trials -- confirmed empirically insufficient, not assumed, before
    // being abandoned for a different approach. The real cause: this crowded five-way
    // classification prompt asks the model to pick TRANSPORT correctly against genuine competing
    // surface similarity to ATTRACTION/EVENT (a German rail ticket's own "ticket code," single
    // named traveler and validity window read a lot like Activity's ticketHolder/ticketNumber/
    // ticketQuantity concepts) -- no amount of resampling the SAME crowded choice reliably escapes
    // that. A separate, focused, binary TRANSPORT-vs-everything-else question with no competing
    // category on offer at all (transportGatePrompt) resolved the identical document correctly 8/8
    // times in direct real-model testing, and correctly said "no" 8/8 times against real Attraction
    // and Insurance benchmark documents (confirming no new false-positive risk) -- removing the
    // crowded choice, not resampling it, is what actually works. Fixed with a two-stage
    // classifySource: the gate question runs first (and in parallel with the existing five-way
    // classifier, for latency, not because the classifier's own answer is trusted when the gate
    // says yes); a "yes" answer wins outright as `category:'car'` regardless of what the five-way
    // classifier separately said; a "no" answer falls through to that classifier's own result
    // exactly as before (still allowed to return 'car' itself too, as defense-in-depth, though its
    // own job is now only to distinguish hotel/flight/activity/insurance/unrecognized for whatever
    // the gate has already confirmed is not transport). This also fully explains the round-2
    // warning that appeared then disappeared in round 3: classification and the subsequent
    // extraction call are genuinely separate, uncoupled calls (confirmed directly by running them
    // independently) -- both of those rounds' own classification calls independently landed on
    // 'activity' by chance (unsurprising, given it was already the single most likely raw outcome),
    // and that category's own extraction call independently happened to mention (round 2) or not
    // mention (round 3) the rail/attraction mismatch in its own free-text warnings, a second,
    // unrelated instance of ordinary per-call variation, not a shared code path or cache.
    if(body.operation==='analyze_source'){
      await registerOrVerifyTrip(tripId,user);const quota=await consumeDailyQuota(user);const prepared=await prepareSource(body.source,true);audit={...audit,sourceKind:prepared.kind,sourceSize:prepared.sourceSize};
      const{category,model:classifyModel}=await classifySource(client,prepared,user);
      if(!category){const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:classifyModel||MODEL,latencyMs};await writeAudit(audit);return json({attemptId:audit.attemptId,state:'no_match',category:'unrecognized',latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200)}
      const operation=OPERATIONS[{flight:'analyze_flight',hotel:'analyze_hotel',activity:'analyze_activity',insurance:'analyze_insurance',car:'analyze_car'}[category]];
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
// 0.7.8 correction round 4: a focused binary "is this TRANSPORT?" gate runs alongside the existing
// five-way classifier (in parallel, for latency) -- see the analyze_source handler's own comment
// above for the direct evidence (gathered against the real live model, not assumed) that motivated
// this specific design over a same-prompt self-consistency vote, which was tried first and
// confirmed empirically insufficient. A "yes" from the gate wins outright; a "no" falls through to
// the five-way classifier's own result unchanged.
async function classifySource(client,prepared,user){
  const gateCall=client.responses.create({model:MODEL,store:false,reasoning:{effort:'medium',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:1000,input:[{role:'system',content:transportGatePrompt},{role:'user',content:[...prepared.content,{type:'input_text',text:'Answer the question about this document.'}]}],text:{format:{type:'json_schema',name:'transport_gate',strict:true,schema:transportGateSchema}}});
  const classifyCall=client.responses.create({model:MODEL,store:false,reasoning:{effort:'medium',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:1000,input:[{role:'system',content:classificationSystemPrompt},{role:'user',content:[...prepared.content,{type:'input_text',text:'Classify this document.'}]}],text:{format:{type:'json_schema',name:'familytrips_source_classification',strict:true,schema:sourceClassificationSchema}}});
  const [gateResponse,classifyResponse]=await Promise.all([gateCall,classifyCall]);
  let gate;try{gate=JSON.parse(gateResponse.output_text)}catch{gate=null}
  if(gate?.is_transport==='yes')return {category:'car',model:gateResponse.model};
  let classification;try{classification=JSON.parse(classifyResponse.output_text)}catch{classification=null}
  const category=['flight','hotel','activity','insurance','car'].includes(classification?.category)?classification.category:null;
  return {category,model:classifyResponse.model};
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
  // V6-F78: never included TIFF, even though Decision 7 (INSURANCE_SMART_IMPORT_DISCOVERY.md)
  // explicitly confirms scanned/fax-quality images -- INS-006's own real format -- as in scope.
  // Mirrors the client-side fix (src/v5-app.js's validateSmartSource, src/smart-import-client.js's
  // inferMime) so the full pipeline agrees, not just the client-side alert.
  const mime=String(source.mimeType||'');if(source.kind==='pdf'&&mime!=='application/pdf')throw httpError(400,'unsupported_source','Invalid PDF MIME type.');if(source.kind==='image'&&!/^image\/(?:png|jpeg|webp|tiff)$/.test(mime))throw httpError(400,'unsupported_source','Only PNG, JPEG, WebP and TIFF images are supported.');
  // V6-F85 (0.6.7.2): the V6-F78 fix above only cleared the upload-time allowlist gap -- the raw
  // TIFF bytes were still handed straight to the vision model, which rejects TIFF outright ("The
  // image data you provided does not represent a valid image... supported image formats: jpeg,
  // png, gif, webp"). TIFF is not a format the vision API itself ever accepts, so allowing the
  // upload was necessary but not sufficient; the fix has to convert, not just allow. Converted
  // once, here, server-side -- never trust the client to do this, since a browser's own <canvas>
  // can't decode a bi-level/CCITT-compressed fax-style scan like INS-006's real fixture either, and
  // the conversion needs to happen exactly once regardless of which entry point (global Add,
  // existing-item attach) the file came through.
  let outMime=mime,outBytes=bytes;
  if(source.kind==='image'&&mime==='image/tiff'){outBytes=await convertTiffToPng(bytes);outMime='image/png'}
  const data=`data:${outMime};base64,${outBytes.toString('base64')}`;return {kind:source.kind,sourceSize:bytes.length,content:[source.kind==='pdf'?{type:'input_file',filename:safeFilename(source.name,'source.pdf'),file_data:data,detail:'high'}:{type:'input_image',image_url:data,detail:'high'}]};
}
// V6-F85: pure-JS TIFF decode (UTIF.js, published as utif2 -- confirmed to include CCITT Group 3/4
// fax-compression support, the exact compression INS-006's real 2010 scan uses) followed by a
// pure-JS PNG encode (pngjs). Deliberately not sharp: sharp ships a platform-specific native
// binary, which is a real risk inside an esbuild-bundled Netlify Function (no container image to
// pre-match the deploy target against) -- utif2/pngjs have no native dependency at all, so there is
// nothing for the bundler or the deploy target to get wrong.
export async function convertTiffToPng(bytes){
  let ifds;
  try{ifds=UTIF.decode(bytes)}catch(error){throw httpError(422,'unsupported_source',`The TIFF image could not be decoded: ${String(error?.message||error)}`)}
  if(!ifds.length)throw httpError(422,'unsupported_source','The TIFF image could not be decoded: no image directory found.');
  UTIF.decodeImage(bytes,ifds[0],ifds);
  const width=ifds[0].width,height=ifds[0].height;
  if(!width||!height)throw httpError(422,'unsupported_source','The TIFF image could not be decoded: no readable image data.');
  const rgba=UTIF.toRGBA8(ifds[0]);
  const png=new PNG({width,height});
  png.data=Buffer.from(rgba);
  return await new Promise((resolve,reject)=>{
    const chunks=[];
    png.pack().on('data',chunk=>chunks.push(chunk)).on('end',()=>resolve(Buffer.concat(chunks))).on('error',reject);
  });
}
async function fetchPublicPage(rawUrl){
  let current=validateUrl(rawUrl);for(let step=0;step<3;step+=1){
    const addresses=await assertPublicHost(current.hostname);
    // CR-002: one pinned dispatcher for this step, reused by both the robots.txt check and the
    // real content fetch below -- both happen after the same assertPublicHost() validation for
    // this exact hostname, so both get the same connection-pinning guarantee, not just one of them.
    const dispatcher=pinnedDispatcher(addresses);
    try{
      const robotsCheck=await assertRobotsAllowed(current,dispatcher);const response=await undiciFetch(current,{dispatcher,redirect:'manual',headers:{'user-agent':'FamilyTrips-SmartImport/0.6'},signal:AbortSignal.timeout(12000)});if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw httpError(422,'protected_or_private_url','Invalid redirect.');current=validateUrl(new URL(location,current).toString());continue}
    // V6-F70 (Product Owner decision): fail-open is unchanged -- an unverifiable robots.txt never
    // blocks this fetch from being attempted. But when the fetch that follows an unverifiable
    // check ALSO fails or comes back non-HTML, the user is told the honest reason (couldn't
    // confirm this site allows automated access) instead of the generic, potentially misleading
    // content-type/access message -- this is exactly the scenario this investigation could not
    // rule out for tickets.leaan.net (a bot-protection layer plausibly answering the robots.txt
    // check and the page fetch differently for this runtime than for a normal request).
    if(!response.ok)throw httpError(response.status===401||response.status===403?422:502,robotsCheck==='unverifiable'?'robots_unverifiable':'protected_or_private_url',robotsCheck==='unverifiable'?ROBOTS_UNVERIFIABLE_MESSAGE:`Public page returned HTTP ${response.status}.`);const type=response.headers.get('content-type')||'';
    // V6-F70: this call site had no logging of its own at all -- a robots_disallowed/
    // unsupported_source/protected_or_private_url failure was indistinguishable, after the fact,
    // from any other host or any other reason for the same code, and every SUCCESSFUL fetch left
    // no trace either, so a live investigation like this one had no way to tell which invocation
    // belonged to which URL, or what response a specific host actually returned to Netlify's own
    // runtime (as opposed to a manual fetch from a different network/IP, which a bot-protection
    // layer -- confirmed present here, tickets.leaan.net runs behind Cloudflare -- may treat
    // differently). This one bounded log line (host + status + content-type only, never the page
    // body) is enough to answer that question next time without needing a code change first.
    console.info('FamilyTrips Smart Import public page fetch',{host:current.hostname,status:response.status,contentType:type,robotsCheck});
    if(!type.includes('text/html'))throw httpError(415,robotsCheck==='unverifiable'?'robots_unverifiable':'unsupported_source',robotsCheck==='unverifiable'?ROBOTS_UNVERIFIABLE_MESSAGE:'The URL did not return an HTML page.');const html=await readLimited(response,MAX_PAGE_BYTES);const text=convert(html,{wordwrap:false,selectors:[{selector:'script',format:'skip'},{selector:'style',format:'skip'},{selector:'noscript',format:'skip'}]}).replace(/\n{3,}/g,'\n\n').trim();if(!text)throw httpError(422,'protected_or_private_url','The public page contained no readable content.');return {finalUrl:current.toString(),text}
    }finally{await dispatcher.close()}
  }throw httpError(422,'protected_or_private_url','Too many redirects.');
}
// V6-F71: this used to be Hebrew, as a workaround for the client's errorMessage() dictionary
// being dead code (src/smart-import-client.js's request() always preferred the server's own raw
// message). Now that request()'s precedence is fixed to check the dictionary by code FIRST, this
// English message is only ever an unreachable-in-practice fallback (used only if the dictionary
// somehow lacked a robots_unverifiable entry, or the response body failed to parse) -- restored to
// the same plain-English style every other httpError message in this file uses, matching e.g.
// 'The URL did not return an HTML page.' immediately below.
const ROBOTS_UNVERIFIABLE_MESSAGE=`Could not verify whether this site's robots.txt allows automated access, and the page fetch also failed.`;
// Attraction/Event (0.6.6): pre-implementation research found 4/4 real ticket-platform URLs
// (Ticketmaster, tickets.hapoelbc.com on two path shapes, tickets.leaan.net) blocked by
// robots.txt -- a distinct safe-failure reason from an authentication/login wall
// (protected_or_private_url), with a different remediation path, so it gets its own code
// (ROBOTS_DISALLOWED) rather than being folded into the existing one. Checked before every fetch
// in the redirect chain, since a redirect can land on a different host with its own policy.
// Missing/unreachable robots.txt default-allows, per standard robots convention -- this is a
// courtesy check, not a security boundary (assertPublicHost/URL validation remain the actual
// SSRF guard).
// V6-F70 (Product Owner decision): the fail-open default itself stays unchanged -- a fetch
// error, non-ok status or empty robots.txt still lets the caller proceed exactly as before,
// never blocking a legitimate site over a merely slow/flaky robots.txt endpoint. What changes is
// that this is no longer silently indistinguishable from a genuinely-checked "allowed" outcome:
// the return value tells fetchPublicPage whether THIS host's robots.txt was actively verified as
// allowing access ('verified') or could not be confirmed either way ('unverifiable') -- still
// throws exactly as before for the one case that IS confirmed, robots_disallowed.
async function assertRobotsAllowed(url,dispatcher){
  let robotsText='',status='fetch_error';
  try{
    const response=await undiciFetch(new URL('/robots.txt',url),{dispatcher,headers:{'user-agent':'FamilyTrips-SmartImport/0.6'},signal:AbortSignal.timeout(8000)});
    status=`${response.status} ${response.headers.get('content-type')||''}`.trim();
    if(response.ok)robotsText=await readLimited(response,MAX_PAGE_BYTES);
  }catch(error){
    // V6-F70: previously a silent, unlogged fail-open -- if the robots.txt fetch itself is
    // blocked/throttled by the target site specifically for this runtime's IP/UA (rather than
    // genuinely absent, which is the case this fail-open default is meant for), there was no way
    // to tell the two apart after the fact. Now logged AND surfaced as 'unverifiable' rather than
    // silently identical to a genuinely-checked-and-allowed site -- still proceeds exactly the
    // same either way (Product Owner decision: fail-open stays, but honestly so).
    console.info('FamilyTrips Smart Import robots.txt check',{host:url.hostname,outcome:'fetch_error',error:String(error?.message||error)});
    return 'unverifiable';
  }
  if(!robotsText){console.info('FamilyTrips Smart Import robots.txt check',{host:url.hostname,outcome:'empty_or_not_ok',status});return 'unverifiable'}
  const disallowed=isRobotsDisallowed(robotsText,url.pathname);
  console.info('FamilyTrips Smart Import robots.txt check',{host:url.hostname,pathname:url.pathname,status,disallowed,bodySnippet:robotsText.slice(0,200)});
  if(disallowed)throw httpError(422,'robots_disallowed',`This site's robots.txt disallows automated access to this page.`);
  return 'verified';
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
// CR-002: returns the validated address(es), not just a pass/fail -- fetchPublicPage pins the
// actual connection to this exact result (pinnedDispatcher, below) instead of letting the
// subsequent fetch re-resolve DNS independently, which is the real gap this closes: a
// DNS-rebinding attacker (a very-low-TTL domain answering differently across two lookups) could
// otherwise pass this check with a public address and then connect somewhere private.
async function assertPublicHost(hostname){if(hostname==='localhost'||hostname.endsWith('.local'))throw httpError(422,'protected_or_private_url','Private hosts are unsupported.');const addresses=net.isIP(hostname)?[{address:hostname,family:net.isIP(hostname)}]:await dns.lookup(hostname,{all:true});if(!addresses.length||addresses.some(({address})=>isPrivateIp(address)))throw httpError(422,'protected_or_private_url','Private network addresses are unsupported.');return addresses}
// A fresh undici Agent per redirect step, pinned to exactly the addresses assertPublicHost just
// validated for that step's hostname -- undici's own `connect.lookup` option only overrides which
// address the raw socket connects to; TLS SNI and the HTTP Host header still come from the
// original URL, so this is transparent to the target site (confirmed directly against a real
// HTTPS/Cloudflare-fronted site during implementation, not assumed from the API docs alone).
function pinnedDispatcher(addresses){return new UndiciAgent({connect:{lookup(hostname,options,callback){callback(null,addresses)}}})}
function isPrivateIp(address){if(net.isIPv4(address)){const [a,b]=address.split('.').map(Number);return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a>=224)}const value=address.toLowerCase();return value==='::1'||value==='::'||value.startsWith('fc')||value.startsWith('fd')||value.startsWith('fe8')||value.startsWith('fe9')||value.startsWith('fea')||value.startsWith('feb')}
async function readLimited(response,limit){const reader=response.body.getReader();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw httpError(413,'source_too_large','The public page exceeds the bounded acquisition limit.')}chunks.push(value)}return new TextDecoder().decode(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))))}
function normalizeUsage(usage){return {inputTokens:Number(usage?.input_tokens||0),outputTokens:Number(usage?.output_tokens||0),totalTokens:Number(usage?.total_tokens||0),cachedInputTokens:Number(usage?.input_tokens_details?.cached_tokens||0)}}
function estimateCost(usage){return Number((((usage.inputTokens-usage.cachedInputTokens)*0.25+usage.cachedInputTokens*0.025+usage.outputTokens*2)/1_000_000).toFixed(6))}
function safeFilename(value,fallback){return String(value||fallback).replace(/[^\p{L}\p{N}._ -]+/gu,'_').slice(0,120)||fallback}
function safeMessage(error){return Number(error?.status)>=500?'Smart Import could not complete this attempt. The original source was not uploaded for retention.':String(error?.message||'Smart Import request failed.')}
function json(value,status){return Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})}
