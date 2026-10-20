// Beta 0.9.1: AI-generated game content (Trivia now, Pantomime in 0.9.3) and the repeat-prevention mechanism both share.
// Pure and dependency-free so the suite can drive it with a mocked model call (tests/beta-0-9-1.mjs); the Netlify Function
// (../game-content.mjs) only wires auth, the shared daily quota, the audit log and the real OpenAI call around it.
//
// Repeat prevention (scope "Avoiding repeats across rebuilds"): the history the caller keeps (askedQuestions, capped at
// HISTORY_CAP) is sent to the model on every call as an exclusion list; after generation anything that still matches the
// history -- on the normalized question OR the normalized answer -- is dropped, then ONE bounded top-up call asks only for the
// missing count; whatever is still short ships short. Never loops, never fails the build over it.
export const HISTORY_CAP=60;
export const MAX_CONTEXT_ITEMS=60;

// trim / lowercase / strip punctuation, Unicode-aware (Hebrew letters and digits stay)
export const normalizeForMatch=text=>String(text??'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();

// Items of `list` that repeat the history (or an earlier item of the same list). `fields` are the keys compared: an item is a
// repeat when ANY listed field, normalized and non-empty, equals the same field of any history entry.
export function dropRepeats(list,history,fields){
  const seen=Object.fromEntries(fields.map(field=>[field,new Set((history||[]).map(entry=>normalizeForMatch(entry?.[field])).filter(Boolean))]));
  const kept=[];
  for(const item of list||[]){
    const keys=fields.map(field=>normalizeForMatch(item?.[field]));
    if(keys.some((key,index)=>key&&seen[fields[index]].has(key)))continue;
    keys.forEach((key,index)=>{if(key)seen[fields[index]].add(key)});
    kept.push(item);
  }
  return kept;
}

// callModel({count,exclude,topUp}) -> array of generated items; `exclude` is the explicit exclusion list for that call.
// Returns {items,shortBy,calls}. At most two calls: the build and one top-up.
export async function generateWithRepeatGuard({callModel,history=[],count,fields}){
  const past=(history||[]).slice(-HISTORY_CAP);
  let items=dropRepeats(await callModel({count,exclude:past,topUp:false}),past,fields).slice(0,count);
  let calls=1;
  if(items.length<count){
    items=[...items,...dropRepeats(await callModel({count:count-items.length,exclude:[...past,...items],topUp:true}),[...past,...items],fields)].slice(0,count);
    calls=2;
  }
  return {items,shortBy:count-items.length,calls};
}

// What a generation prompt may carry about the trip: the destinations, and for each hotel / activity its title and location
// ONLY -- never confirmation numbers, phones, participants or notes.
export function buildTripContext(body){
  const clip=(value,max)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
  const destinations=(Array.isArray(body?.destinations)?body.destinations:[]).map(value=>clip(value,80)).filter(Boolean).slice(0,10);
  const items=(Array.isArray(body?.items)?body.items:[]).map(item=>({title:clip(item?.title,120),location:clip(item?.location,160)})).filter(item=>item.title).slice(0,MAX_CONTEXT_ITEMS);
  return {destinations,items};
}
export function cleanHistory(history,fields){
  return (Array.isArray(history)?history:[]).map(entry=>Object.fromEntries(fields.map(field=>[field,String(entry?.[field]??'').slice(0,300)]))).filter(entry=>fields.some(field=>entry[field])).slice(-HISTORY_CAP);
}

export const TRIVIA_COUNT=10;
export const TRIVIA_FIELDS=['question','answer'];
export const triviaSchema={type:'object',additionalProperties:false,required:['questions'],properties:{questions:{type:'array',items:{type:'object',additionalProperties:false,required:['question','answer','explanation'],properties:{question:{type:'string'},answer:{type:'string'},explanation:{type:'string'}}}}}};
export const triviaSystemPrompt=`You write trivia questions for a family on a trip, in Hebrew.
Tone: kid-friendly -- simple vocabulary, playful, nothing scary or mature, suitable for the youngest child on the trip.
Content: places, culture and daily life in the trip's actual destination -- food, markets, transport, animals, festivals, customs, geography, things a traveller sees and does. NOT dates, rulers or statistics. Example of the right kind of question: "What is the market called where people sell food from boats on the water?".
You may also ask about the specific hotels and activities listed (use their names and locations as given) -- decide yourself how to balance general destination questions and questions about the listed places; do not force one question per place.
Every question has one short, clear, correct answer (a few words) and a short explanation of that answer: one or two simple, true sentences a child can enjoy reading after the answer is shown (what it is, why it is special). Questions must be self-contained and must not reveal their answer.
Never repeat, even rephrased or with the same answer, any question in the exclusion list.`;

export function triviaInstruction({destinations,items},{count,exclude,topUp}){
  const lines=[`Destination(s): ${destinations.join(', ')||'unknown'}`];
  if(items.length)lines.push('Hotels and activities on this trip:',...items.map(item=>`- ${item.title}${item.location?` (${item.location})`:''}`));
  lines.push(`Write exactly ${count} NEW trivia questions${topUp?' (a top-up: the first attempt repeated earlier questions)':''}.`);
  if(exclude.length)lines.push('Do NOT repeat any of the following, in substance, even rephrased:',...exclude.map(entry=>`- ${entry.question} => ${entry.answer}`));
  return lines.join('\n');
}
