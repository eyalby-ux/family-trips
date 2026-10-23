// Beta 0.9.1: per-trip AI game content. A sibling of smart-import.mjs, not another entry in its OPERATIONS map: that map is
// built around reading a document (prepareSource, place validation, classification), none of which applies to "write
// questions". It reuses the same _shared/ auth, the SAME daily quota pool (one build tap = one of the 10 calls; the bounded
// top-up inside a build is not a second tap) and the same audit log. Pantomime (0.9.3) adds a `generate_pantomime` kind here.
import crypto from 'node:crypto';
import OpenAI from 'openai';
import {authorize,httpError} from './_shared/smart-import-auth.mjs';
import {consumeDailyQuota,registerOrVerifyTrip,writeAudit} from './_shared/smart-import-quota.mjs';
import {REMIND_ME_MODES,cleanStartHistory,extractRemindMe,remindMeInstruction,remindMeSchema,remindMeSystemPrompt,PANTOMIME_COUNT,PANTOMIME_FIELDS,TRIVIA_COUNT,TRIVIA_FIELDS,buildPantomimeContext,buildTripContext,cleanHistory,generateWithRepeatGuard,pantomimeAccept,pantomimeInstruction,pantomimeSchema,pantomimeSystemPrompt,triviaInstruction,triviaSchema,triviaSystemPrompt} from './_shared/game-content.mjs';

const MODEL='gpt-5.6-luna';
const KINDS={
  generate_trivia:{schemaName:'familytrips_trivia',schema:triviaSchema,systemPrompt:triviaSystemPrompt,instruction:triviaInstruction,fields:TRIVIA_FIELDS,count:TRIVIA_COUNT,listKey:'questions',needsDestination:true,context:buildTripContext},
  // 0.9.3: destination-only phrases for Pantomime; the same engine, the same quota, the same audit
  generate_pantomime:{schemaName:'familytrips_pantomime',schema:pantomimeSchema,systemPrompt:pantomimeSystemPrompt,instruction:pantomimeInstruction,fields:PANTOMIME_FIELDS,count:PANTOMIME_COUNT,listKey:'phrases',needsDestination:true,context:buildPantomimeContext,accept:pantomimeAccept},
};
export default async function handler(request){
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  let audit={attemptId:crypto.randomUUID(),status:'failed'};const started=Date.now();
  try{
    const user=await authorize(request);const body=await request.json();const tripId=String(body.tripId||'').trim();if(!tripId)throw httpError(400,'invalid_trip','tripId is required.');
    audit={...audit,userEmailHash:user.emailHash,tripId,sourceKind:body.operation};
    // 0.9.3: מזכיר לי's smart start is one suggestion for ONE mode (word or song) -- a single call, no deck, no dedup guard
    const remindMe=body.operation==='generate_remind_me_start';
    if(remindMe&&!REMIND_ME_MODES.includes(body.mode))throw httpError(400,'invalid_mode','mode must be word or song.');
    const kind=remindMe?{schemaName:`familytrips_remind_me_${body.mode}`,schema:remindMeSchema(body.mode),systemPrompt:remindMeSystemPrompt(body.mode),instruction:(ctx,request)=>remindMeInstruction(ctx,{mode:body.mode,exclude:request.exclude}),needsDestination:true,context:buildPantomimeContext,single:true}:KINDS[body.operation];
    if(!kind)throw httpError(400,'invalid_operation','Unsupported operation.');
    const context=kind.context(body);if(kind.needsDestination&&!context.destinations.length)throw httpError(400,'no_destination','The trip has no destination yet.');
    await registerOrVerifyTrip(tripId,user);const quota=await consumeDailyQuota(user);
    const client=new OpenAI();let usage={inputTokens:0,outputTokens:0};
    const callModel=async request=>{
      const response=await client.responses.create({model:MODEL,store:false,reasoning:{effort:'low',context:'current_turn'},safety_identifier:user.emailHash,max_output_tokens:4000,input:[{role:'system',content:kind.systemPrompt},{role:'user',content:[{type:'input_text',text:kind.instruction(context,request)}]}],text:{format:{type:'json_schema',name:kind.schemaName,strict:true,schema:kind.schema}}});
      usage={inputTokens:usage.inputTokens+Number(response.usage?.input_tokens||0),outputTokens:usage.outputTokens+Number(response.usage?.output_tokens||0)};
      const parsed=JSON.parse(response.output_text);return kind.single?parsed:parsed[kind.listKey]||[];
    };
    if(kind.single){
      const suggestion=extractRemindMe(body.mode,await callModel({exclude:cleanStartHistory(body.history,body.mode)}));
      if(!suggestion)throw httpError(502,'empty_generation','No suggestion was generated.');
      const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:MODEL,latencyMs,estimatedVariableCostUsd:Number(((usage.inputTokens*0.25+usage.outputTokens*2)/1_000_000).toFixed(6))};await writeAudit(audit);
      return json({mode:body.mode,...suggestion,latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200);
    }
    const result=await generateWithRepeatGuard({callModel,history:cleanHistory(body.history,kind.fields),count:kind.count,fields:kind.fields,accept:kind.accept?kind.accept(context):undefined});
    const latencyMs=Date.now()-started;audit={...audit,status:'completed',model:MODEL,latencyMs,estimatedVariableCostUsd:Number(((usage.inputTokens*0.25+usage.outputTokens*2)/1_000_000).toFixed(6))};await writeAudit(audit);
    return json({[kind.listKey]:result.items,shortBy:result.shortBy,calls:result.calls,latencyMs,quota:{remaining:Math.max(0,quota.limit-quota.count),limit:quota.limit}},200);
  }catch(error){audit={...audit,status:error.code||'failed',latencyMs:Date.now()-started};if(audit.userEmailHash)await writeAudit(audit).catch(()=>{});console.error('FamilyTrips game content failed',{code:error?.code||'',message:String(error?.message||error)});return json({error:error?.code||'game_content_failed',message:Number(error?.status)>=500||!error?.status?'Game content could not be generated.':String(error.message)},Number(error?.status)||500)}
}
export const config={path:'/api/familytrips-game-content',method:'POST'};
function json(value,status){return Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})}
