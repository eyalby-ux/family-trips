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
export async function generateWithRepeatGuard({callModel,history=[],count,fields,accept=()=>true}){
  const past=(history||[]).slice(-HISTORY_CAP);
  let items=dropRepeats((await callModel({count,exclude:past,topUp:false})).filter(accept),past,fields).slice(0,count);
  let calls=1;
  if(items.length<count){
    items=[...items,...dropRepeats((await callModel({count:count-items.length,exclude:[...past,...items],topUp:true})).filter(accept),[...past,...items],fields)].slice(0,count);
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

// ---- Beta 0.9.3: Pantomime phrases. The generation, the exclusion-list history and the dedup / top-up guard are the SAME engine as Trivia's
// (generateWithRepeatGuard / dropRepeats / cleanHistory above), parameterized by `fields`; only the schema, prompt and context differ. ----
export const PANTOMIME_COUNT=12;
// The client asks for as many phrases as the game needs (players x rounds per player); the server keeps it between 6 and 40.
export const clampCount=(value,fallback,min=6,max=40)=>{const n=Math.round(Number(value));return Number.isFinite(n)&&n>0?Math.min(max,Math.max(min,n)):fallback};
export const PANTOMIME_FIELDS=['text'];
export const pantomimeSchema={type:'object',additionalProperties:false,required:['phrases'],properties:{phrases:{type:'array',items:{type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string'}}}}}};
export const pantomimeSystemPrompt=`You write phrases for a family charades (pantomime) game on a trip, in Hebrew. One person acts a phrase out silently, using only body movements, and the others guess.
Every phrase must be something ONE person can act out without words or props: a scene at a market, an animal doing something, a daily activity or a custom of the destination, a kind of food being prepared or eaten, a place or a vehicle. NOT an abstract idea, NOT a name of a person, NOT something that needs speech or a written word.
Tone: kid-friendly, playful, nothing scary or mature, understandable by the youngest child on the trip. Short: two to six words each.
Content: places, culture and daily life of the trip's actual destination.
NO PLACE NAMES: never write the name of a country, city, region, landmark, street, venue or any other named place inside a phrase -- a name cannot be acted out and it gives the answer away. Describe the activity, animal, food or scene itself ('dancing a tango', not 'dancing a tango in <city>'; 'watching a huge waterfall', not the waterfall's name). Generic kinds of places and things ARE fine and welcome ('a floating market', 'a beach', 'a train station', 'a night market', 'a temple') -- only the PROPER name of a specific place or landmark is forbidden, because a specific name is very hard to act out. The destination should show through WHAT is acted, never through a name.
GENERIC, NOT SPECIFIC: prefer the generic thing over a specific named one. A generic food is fine ('cheese', 'soup', 'bread', 'ice cream', 'a sandwich'); a specific named dish, product or regional speciality is NOT ('feta', 'sufganiyah', 'empanada', 'alfajor', a named cake or cheese). The same for drinks, instruments, dances and animals: 'playing a drum', 'a guitar', 'dancing with a scarf', 'a penguin' -- not a specific foreign name that nobody can mime. A phrase must be something a child can picture and act out at once.
Never repeat, even rephrased or with the same meaning, any phrase in the exclusion list.`;
// A hard rule on top of the prompt for the one name we always know -- the trip's own destination(s): a phrase that contains one is dropped (the bounded top-up
// refills it). Cities and landmarks cannot be recognized from text alone, so for those the prompt is the only guard.
export const mentionsDestination=(text,destinations)=>{const flat=normalizeForMatch(text);return (destinations||[]).some(name=>{const n=normalizeForMatch(name);return n.length>=3&&flat.includes(n)})};
export const pantomimeAccept=({destinations})=>item=>!mentionsDestination(item?.text,destinations);
// Pantomime is destination-only content: no hotels, no activities, nothing from the itinerary ever reaches its prompt.
export const buildPantomimeContext=body=>({destinations:buildTripContext(body).destinations,items:[]});
export function pantomimeInstruction({destinations},{count,exclude,topUp}){
  const lines=[`Destination(s): ${destinations.join(', ')||'unknown'}`,`Write exactly ${count} NEW charades phrases${topUp?' (a top-up: the first attempt repeated earlier phrases)':''}. No place names in any phrase.`];
  if(exclude.length)lines.push('Do NOT repeat any of the following, in substance, even rephrased:',...exclude.map(entry=>`- ${entry.text}`));
  return lines.join('\n');
}

// ---- Beta 0.9.3: מזכיר לי -- one AI-suggested starting word OR one real song, the family's chosen mode first. One mode per call, never both. ----
export const REMIND_ME_MODES=['word','song'];
export const REMIND_ME_HISTORY_CAP=10;
export const remindMeSchema=mode=>mode==='song'
  ?{type:'object',additionalProperties:false,required:['song'],properties:{song:{type:'object',additionalProperties:false,required:['title','artist'],properties:{title:{type:'string'},artist:{type:'string'}}}}}
  :{type:'object',additionalProperties:false,required:['word'],properties:{word:{type:'string'}}};
// The song must be REAL. This is a prompt-only guarantee (no external check, no curated list -- both declined by the Product Owner): it lowers the
// risk of a made-up title or a wrong artist, it cannot remove it.
export const remindMeSystemPrompt=mode=>mode==='song'
  ?`You suggest ONE real, existing song to start a family "song chain" game on a trip (each person in turn picks a song that reminds them of the previous one), in Hebrew context.
HARD REQUIREMENT -- THE SONG MUST BE REAL. Never invent a song title. Never guess an artist. Name a song ONLY if you are genuinely confident that exactly this title by exactly this artist exists; if you are not sure, choose a different song you ARE sure about. Prefer very famous, widely known songs over obscure ones (a famous song is far less likely to be a fabrication), and never pair a title with another artist's name.
Relevance: lean towards the trip destination's own country, culture or language -- a famous song from there or a famous song about it.
Suitable for the whole family: kid-friendly, nothing violent, sexual or scary.
Write the title and the artist as they are commonly written (original language is fine; Hebrew for Hebrew songs).
Never suggest a song that is in the exclusion list.`
  :`You suggest ONE simple starting word for a family word-association chain game on a trip (each person in turn says a word the previous word reminds them of), in Hebrew.
The word is concrete and kid-friendly, easy to associate from: a place, a food, an animal, an object or a daily thing connected to the trip's destination. One word (or a very short two-word name), no explanation.
Never suggest a word that is in the exclusion list.`;
export function remindMeInstruction({destinations},{mode,exclude}){
  const lines=[`Destination(s): ${destinations.join(', ')||'unknown'}`,mode==='song'?'Suggest one real song (title and artist).':'Suggest one starting word.'];
  if(exclude.length)lines.push('Do NOT suggest any of the following again:',...exclude.map(entry=>typeof entry==='string'?`- ${entry}`:`- ${entry.title} -- ${entry.artist}`));
  return lines.join('\n');
}
// The history sent back by the client: the 10 most recent for THIS mode only, prompt-only (no server dedup safety net at this volume).
export function cleanStartHistory(history,mode){
  const list=Array.isArray(history)?history:[];
  const clipped=mode==='song'
    ?list.map(entry=>({title:String(entry?.title??'').slice(0,120),artist:String(entry?.artist??'').slice(0,120)})).filter(entry=>entry.title)
    :list.map(entry=>String(typeof entry==='string'?entry:entry?.word??'').slice(0,80)).filter(Boolean);
  return clipped.slice(-REMIND_ME_HISTORY_CAP);
}
// Only the requested mode's field ever leaves the server, whatever the model returned.
export function extractRemindMe(mode,raw){
  if(mode==='song'){const title=String(raw?.song?.title??'').trim(),artist=String(raw?.song?.artist??'').trim();return title&&artist?{song:{title,artist}}:null}
  const word=String(raw?.word??'').trim();return word?{word}:null;
}
