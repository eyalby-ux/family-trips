// Beta 0.9.1 -- Games Interactive: Trivia. An AI-built deck per trip, the repeat-prevention mechanism (shared with Pantomime in
// 0.9.3), the build gate, the play flow, and the existing-by-id migration backfill. The AI call is always mocked here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HISTORY_CAP,MAX_CONTEXT_ITEMS,TRIVIA_COUNT,TRIVIA_FIELDS,triviaSchema,triviaSystemPrompt,buildTripContext,cleanHistory,dropRepeats,generateWithRepeatGuard,normalizeForMatch,triviaInstruction} from '../netlify/functions/_shared/game-content.mjs';
import {TRIVIA_ID,capHistory,newTriviaDeck,readMoreUrl,newTriviaState,shuffleOrder,toggleCorrect,triviaBuildGate,triviaFinished,triviaNext,triviaQuestion,triviaTally} from '../src/games.js';
import {BUILTIN_GAMES,backfillBuiltinGames,normalizeOperationalState} from '../src/operational-data.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),fnSource=read('../netlify/functions/game-content.mjs'),client=read('../src/game-content-client.js'),pkg=JSON.parse(read('../package.json'));
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const q=(question,answer)=>({question,answer});
const seeded=()=>{let seed=7;return()=>{seed=(seed*16807)%2147483647;return seed/2147483647}};

test('normalizeForMatch / dropRepeats: case, punctuation and spacing do not hide a repeat; a repeated ANSWER is a repeat too; within one batch as well',()=>{
  assert.equal(normalizeForMatch('  איך קוראים לשוק הצף?! '),'איך קוראים לשוק הצף');
  assert.equal(normalizeForMatch('Floating  Market.'),'floating market');
  const history=[q('מהו החיה הלאומית של תאילנד?','הפיל')];
  const batch=[q('מהו החיה הלאומית של תאילנד','פיל'),q('איזו חיה היא סמל תאילנד?','הפיל!'),q('מה אוכלים בשוק צף?','נודלס'),q('מה אוכלים בשוק צף??','נודלס'),q('מה שם המטבע?','באט')];
  const kept=dropRepeats(batch,history,TRIVIA_FIELDS);
  assert.deepEqual(kept.map(item=>item.answer),['נודלס','באט'],'same question (punctuation aside) and same answer both dropped; the in-batch duplicate dropped');
  assert.deepEqual(dropRepeats([q('שאלה','')],[q('אחרת','')],TRIVIA_FIELDS).length,1,'an empty answer never matches another empty answer');
});

test('repeat prevention: the exclusion list is in the request payload of EVERY generation call, including the second (top-up) call -- AI call mocked',async()=>{
  const history=[q('שאלה ישנה א','תשובה א'),q('שאלה ישנה ב','תשובה ב')];
  const payloads=[];
  const callModel=async request=>{
    payloads.push(request);
    // the first call repeats the history twice and gives 8 new ones; the top-up returns the 2 missing
    return payloads.length===1?[q('שאלה ישנה א','משהו אחר'),q('חדש','תשובה ב'),...Array.from({length:8},(_,i)=>q(`שאלה חדשה ${i}`,`תשובה חדשה ${i}`))]:[q('עוד אחת','עוד תשובה'),q('ועוד אחת','ועוד תשובה')];
  };
  const result=await generateWithRepeatGuard({callModel,history,count:10,fields:TRIVIA_FIELDS});
  assert.equal(result.items.length,10);assert.equal(result.calls,2);assert.equal(result.shortBy,0);
  assert.deepEqual(payloads[0].exclude,history,'first call carries the whole history');
  assert.equal(payloads[0].topUp,false);assert.equal(payloads[0].count,10);
  assert.equal(payloads[1].topUp,true);assert.equal(payloads[1].count,2,'the top-up asks only for the missing count');
  assert(history.every(entry=>payloads[1].exclude.some(other=>other.question===entry.question)),'the SECOND call\'s payload still carries the history');
  assert(payloads[1].exclude.some(entry=>entry.question==='שאלה חדשה 3'),'and the questions kept from the first call');
  // and the text the model actually reads
  const text=triviaInstruction({destinations:['תאילנד'],items:[]},payloads[1]);
  assert(text.includes('שאלה ישנה א => תשובה א')&&text.includes('Do NOT repeat'),'the exclusion list is part of the instruction text');
  assert.equal(new Set(result.items.map(item=>normalizeForMatch(item.question))).size,10);
});

test('repeat prevention: one bounded top-up, then it ships short -- it never loops and never throws',async()=>{
  let calls=0;
  const history=[q('חוזר','חוזר')];
  const callModel=async()=>{calls+=1;return [q('חוזר','חוזר'),q('חדש 1','א1')]};
  const result=await generateWithRepeatGuard({callModel,history,count:5,fields:TRIVIA_FIELDS});
  assert.equal(calls,2,'exactly two calls: the build and one top-up');
  assert.equal(result.items.length,1,'the top-up returned only repeats of the history and of what was kept');assert.equal(result.shortBy,4);
  const none=await generateWithRepeatGuard({callModel:async()=>[],history:[],count:3,fields:TRIVIA_FIELDS});
  assert.equal(none.items.length,0);assert.equal(none.shortBy,3);
  let single=0;const enough=await generateWithRepeatGuard({callModel:async()=>{single+=1;return Array.from({length:12},(_,i)=>q(`ש${i}`,`ת${i}`))},history:[],count:10,fields:TRIVIA_FIELDS});
  assert.equal(single,1,'no top-up when the first call is enough');assert.equal(enough.items.length,10,'never more than asked');
});

test('a rebuild keeps the history: capHistory appends, caps at the 60 most recent, drops the oldest first, and keeps only question/answer',()=>{
  assert.equal(HISTORY_CAP,60);
  const first=Array.from({length:10},(_,i)=>q(`a${i}`,`x${i}`));
  const afterOne=capHistory([],first);assert.equal(afterOne.length,10);
  let history=afterOne;for(let build=1;build<=7;build+=1)history=capHistory(history,Array.from({length:10},(_,i)=>({...q(`b${build}-${i}`,`y${build}-${i}`),id:'ignored'})));
  assert.equal(history.length,60);
  assert.equal(history[0].question,'b2-0','the oldest were dropped first (a* and b1*)');assert.equal(history.at(-1).question,'b7-9');
  assert(history.every(entry=>Object.keys(entry).join()==='question,answer'));
  assert.deepEqual(cleanHistory(Array.from({length:90},(_,i)=>q(`h${i}`,`z${i}`)),TRIVIA_FIELDS).length,60,'the server also caps what it is sent');
});

test('privacy: the prompt context carries the destinations and each hotel / activity\'s title and location ONLY',()=>{
  const ctx=buildTripContext({destinations:['תאילנד','  ויאטנם '],items:[{title:'Hyatt Regency Phuket',location:'Phuket',confirmationNumber:'ABC123',phone:'+66 1',participants:['p1'],notes:'secret',startAt:'2026-10-01T10:00'},{title:'',location:'x'}]});
  assert.deepEqual(ctx,{destinations:['תאילנד','ויאטנם'],items:[{title:'Hyatt Regency Phuket',location:'Phuket'}]});
  assert.equal(buildTripContext({items:Array.from({length:200},(_,i)=>({title:`t${i}`}))}).items.length,MAX_CONTEXT_ITEMS);
  const text=triviaInstruction(ctx,{count:10,exclude:[],topUp:false});
  assert(!/ABC123|secret|\+66/.test(text));
  // the client sends the same shape: hotels and activities, title + location
  assert(client.includes("['hotel','activity'].includes(item.type)")&&client.includes('items.filter')||client.includes(".filter(item=>['hotel','activity'].includes(item.type)).map(item=>({title:item.title||'',location:item.location||''}))"),'client trims before sending');
  assert(!/confirmationNumber|phone|participants|notes/.test(client.slice(client.indexOf('tripContextForGames'),client.indexOf('export async function'))),'the client never reads the private fields');
});

test('the function: a SIBLING of smart-import reusing the shared auth, the SAME daily quota (one consume per build) and the audit log; Pantomime can add a kind',()=>{
  assert(fnSource.includes("from './_shared/smart-import-auth.mjs'")&&fnSource.includes("from './_shared/smart-import-quota.mjs'")&&fnSource.includes("from './_shared/game-content.mjs'"));
  assert.equal((fnSource.match(/consumeDailyQuota\(user\)/g)||[]).length,1,'one quota consume per request -- the top-up inside a build is not a second tap');
  assert(fnSource.includes('registerOrVerifyTrip(tripId,user)')&&fnSource.includes('writeAudit(audit)'));
  assert(fnSource.includes('const KINDS={')&&fnSource.includes('generate_trivia:{')&&fnSource.includes("export const config={path:'/api/familytrips-game-content',method:'POST'}"));
  assert(fnSource.includes("type:'json_schema',name:kind.schemaName,strict:true,schema:kind.schema"),'the same structured-output pattern as every Smart Import operation');
  assert(fnSource.includes('no_destination'),'a trip without a destination is refused before any quota is spent');
  assert(fnSource.indexOf("'no_destination'")<fnSource.indexOf('consumeDailyQuota(user)'));
  assert(client.includes("'/api/familytrips-game-content'")&&client.includes("operation:'generate_trivia'"));
  assert(!read('../netlify/functions/smart-import.mjs').includes('generate_trivia'),'smart-import.mjs itself is untouched');
  assert.equal(TRIVIA_COUNT,10);
});

test('the build gate: "בנה טריוויה" is disabled with a hint until the trip has a destination, then enabled',()=>{
  assert.deepEqual(triviaBuildGate({destinationCountries:[]}),{allowed:false,hint:'הוסיפו יעד לטיול כדי לבנות טריוויה'});
  assert.equal(triviaBuildGate(undefined).allowed,false);
  assert.deepEqual(triviaBuildGate({destinationCountries:['תאילנד']}),{allowed:true,hint:''});
  const view=fn('triviaView');
  assert(view.includes('triviaBuildGate(state.trip)'));
  assert(view.includes('data-action="trivia-build" data-id="${game.id}"${gate.allowed?\'\':\' disabled\'}>בנה טריוויה</button>${hint}'),'a visible, disabled button plus the hint -- not a hidden one');
  assert(view.includes("largePalm({phrases,label:'בונים טריוויה…'"),'the app\'s own swaying-palm "in process" display, no new spinner');
  assert(!/spinner/i.test(view));
  assert(view.includes('מוסיפים שאלה על <bdi>${esc(first.title.length>24?')&&view.includes('</bdi>…`'),'an item name of another script stays an isolate inside the Hebrew phrase');
  assert(app.includes("if(!game||triviaBuilding||!triviaBuildGate(state.trip).allowed)return;"),'the handler enforces the gate too');
});

test('rebuild: a successful build REPLACES the deck, resets triviaState, appends to the history and un-starts the game; a failed build leaves the old deck alone',()=>{
  const build=fn('buildTrivia');
  assert(build.includes('live.deck=deck;live.askedQuestions=capHistory(live.askedQuestions,deck);live.triviaState=newTriviaState(deck);live.started=false;'));
  assert(build.includes('generateTrivia({trip:state.trip,items:state.items,history:game.askedQuestions||[]})'),'the accumulated history goes out with every build');
  assert(build.indexOf('generateTrivia(')<build.indexOf('live.deck=deck'),'nothing is discarded before the new deck exists');
  assert(build.includes('catch(error){triviaBuilding=null;render();notify('));
  assert(build.includes('confirm(')&&build.includes('!triviaFinished(game)'),'a stray tap cannot wipe a game in progress');
  assert(build.includes('result.shortBy>0'),'a short deck is surfaced, not silent');
  assert.deepEqual(newTriviaDeck([q(' א ',' ב '),q('','x'),{...q('ג','ד'),explanation:' כי כך '}]),[{id:'q1',question:'א',answer:'ב',explanation:''},{id:'q3',question:'ג',answer:'ד',explanation:'כי כך'}],'the explanation is kept on the deck (empty for a deck built before it existed)');
});

test('the play flow end to end: shuffled order with no repeats, reveal, tap who answered (toggle, many or none), advance, tally, replay without the AI',()=>{
  const deck=newTriviaDeck(Array.from({length:6},(_,i)=>q(`שאלה ${i}`,`תשובה ${i}`)));
  const game={deck,triviaState:newTriviaState(deck,seeded())};
  assert.equal([...game.triviaState.order].sort().join(),[0,1,2,3,4,5].join(),'every question exactly once');
  assert.equal(game.triviaState.position,0);assert.deepEqual(game.triviaState.scores,{});
  const people=[{id:'p1',name:'אייל'},{id:'p2',name:'דנה'},{id:'p3',name:'נועה'},{id:'p4',name:'ישן',active:false}];
  const seen=[];let marked=[];
  while(!triviaFinished(game)){
    seen.push(triviaQuestion(game).id);
    if(game.triviaState.position===0){let r=toggleCorrect(game.triviaState,marked,'p1');marked=r.marked;game.triviaState={...game.triviaState,scores:r.scores};r=toggleCorrect(game.triviaState,marked,'p2');marked=r.marked;game.triviaState={...game.triviaState,scores:r.scores};r=toggleCorrect(game.triviaState,marked,'p2');marked=r.marked;game.triviaState={...game.triviaState,scores:r.scores};assert.deepEqual(marked,['p1'],'a second tap takes the mark back');assert.equal(game.triviaState.scores.p2,0)}
    if(game.triviaState.position===1){const r=toggleCorrect(game.triviaState,[],'p1');game.triviaState={...game.triviaState,scores:r.scores}}
    if(game.triviaState.position===2){const r=toggleCorrect(game.triviaState,[],'p3');game.triviaState={...game.triviaState,scores:r.scores}}
    // positions 3..5: nobody answered correctly -- allowed
    game.triviaState=triviaNext(game.triviaState);marked=[];
  }
  assert.equal(new Set(seen).size,6,'no question twice in one playthrough');
  assert.deepEqual(game.triviaState.scores,{p1:2,p2:0,p3:1});
  const tally=triviaTally(game.triviaState.scores,people);
  assert.deepEqual(tally.map(row=>[row.name,row.score,row.medal]),[['אייל',2,'🥇'],['נועה',1,'🥈'],['דנה',0,''],],'high to low; the inactive participant with no points is left out; no medal for zero');
  assert.deepEqual(triviaTally({p1:3,p2:3,p3:1},people).map(row=>row.medal),['🥇','🥇','🥉'],'ties share a medal; the next rank skips (1, 1, 3), as in a podium');
  assert.deepEqual(triviaTally({},people).map(row=>row.medal),['','',''],'nobody scored: no medals');
  // play again: same deck, a fresh order and an empty tally, and no network call involved
  const again=newTriviaState(game.deck,seeded());
  assert.equal(again.position,0);assert.deepEqual(again.scores,{});assert.equal(again.order.length,6);
  const replayHandler=app.slice(app.indexOf("action==='trivia-replay'"),app.indexOf("action==='trivia-exit'"));
  assert(replayHandler.includes('newTriviaState(game.deck)')&&!replayHandler.includes('generateTrivia')&&!replayHandler.includes('buildTrivia'),'"שחקו שוב" never calls the AI');
  assert.deepEqual(shuffleOrder(0),[]);
});

test('the screens: question N/M, reveal in place, chips with running scores, end screen with the two actions of different weight; offline-playable',()=>{
  const play=fn('triviaPlayView'),view=fn('triviaView');
  assert(play.includes('data-action="trivia-reveal"')&&play.includes('>הצג תשובה</button>')&&play.includes('triviaRevealed?'),'the answer is revealed in place');
  assert(play.includes('מי ענה נכון?')&&play.includes('data-action="trivia-score"')&&play.includes('aria-pressed='),'a row of participant chips, many taps or none');
  assert(play.includes("person.active!==false"),'only active participants are offered');
  assert(play.includes('class="btn game-primary" data-action="trivia-replay"')&&play.includes('class="btn ghost game-secondary" data-action="trivia-build"'),'"שחקו שוב" primary, "בנה טריוויה מחדש" secondary/ghost');
  assert(play.includes('<bdi dir="ltr">${ts.position+1}/${total}</bdi>'));
  assert(view.includes("gamePrimaryAction(game)")&&view.includes('אפשר לשחק גם בלי חיבור לאינטרנט'));
  assert(app.includes("else if(action==='game-start'&&button.dataset.id===TRIVIA_ID)")&&app.indexOf("button.dataset.id===TRIVIA_ID")<app.indexOf("else if(action==='game-start'){"),'Trivia\'s start opens the play screen; it is no longer the generic no-op');
  assert(app.includes("function route(view,options={}){triviaPlaying=null;"),'opening a game always lands on its detail page');
  assert.match(css,/\.trivia-chip\{min-height:44px/,'44px tap targets');
  assert.match(css,/\.trivia-chip\.on\{border-color:var\(--ink\);background:var\(--teal-soft\)\}/);
  assert.match(css,/\.answer-box\{[^}]*background:var\(--accent-soft\)/);
});

test('migration: a pre-0.9.1 trip that already holds game-thailand-trivia BY ID gets every new field -- before / after',()=>{
  const OLD_RECORD={id:'game-thailand-trivia',onTheGo:true,title:'טריוויה תאילנד',instructions:'כל משתתף שואל שאלה על תאילנד. נקודה על תשובה ונקודה נוספת על עובדה מעניינת.',items:'ללא ציוד',participants:'כל המשפחה',duration:'20 דקות',favorite:true,started:true};
  const state={games:[{...OLD_RECORD},{id:'game-road-story',title:'סיפור בהמשכים',favorite:false}],trip:{id:'t1'},items:[]};
  const before=JSON.parse(JSON.stringify(state.games.find(game=>game.id===TRIVIA_ID)));
  normalizeOperationalState(state);
  const after=state.games.find(game=>game.id===TRIVIA_ID);
  console.log('  before:',JSON.stringify(before));console.log('  after: ',JSON.stringify(after));
  assert.equal(before.interactive,undefined);assert.equal(before.deck,undefined);
  assert.equal(after.interactive,true);assert.equal(after.title,'טריוויה על היעד');assert(!/תאילנד/.test(after.title+after.instructions),'destination-neutral wording');
  assert.deepEqual(after.deck,[]);assert.deepEqual(after.askedQuestions,[]);assert.deepEqual(after.triviaState,{order:[],position:0,scores:{}});
  assert.equal(after.favorite,true,'the family\'s own favourite flag survives');assert.equal(after.started,true);assert.equal(after.id,TRIVIA_ID,'the id is unchanged');
  assert.equal(state.games.length,BUILTIN_GAMES.length,'no duplicate was pushed');
  assert.deepEqual(state.games.find(game=>game.id==='game-road-story'),{id:'game-road-story',title:'סיפור בהמשכים',favorite:false},'other games are untouched');
  // idempotent, and it never overwrites a deck that already exists
  const withDeck={games:[{...after,deck:[{id:'q1',question:'א',answer:'ב'}],askedQuestions:[q('א','ב')],triviaState:{order:[0],position:1,scores:{p1:1}}}],trip:{id:'t1'},items:[]};
  normalizeOperationalState(withDeck);
  assert.equal(withDeck.games.find(game=>game.id===TRIVIA_ID).deck.length,1);assert.equal(withDeck.games.find(game=>game.id===TRIVIA_ID).triviaState.scores.p1,1);
  // a title the family had changed is left alone; a record with damaged fields is repaired
  const custom=backfillBuiltinGames([{id:TRIVIA_ID,title:'שלנו',instructions:'משלנו',deck:'x',askedQuestions:null,triviaState:{order:'bad'}}])[0];
  assert.equal(custom.title,'שלנו');assert.equal(custom.instructions,'משלנו');assert.deepEqual(custom.deck,[]);assert.deepEqual(custom.askedQuestions,[]);assert.deepEqual(custom.triviaState,{order:[],position:0,scores:{}});
});

test('migration: a brand-new trip gets the full record, and building on one trip can never touch the shared built-in definition',()=>{
  const state=normalizeOperationalState({trip:{id:'t2'},items:[]});
  const game=state.games.find(candidate=>candidate.id===TRIVIA_ID);
  assert.equal(game.interactive,true);assert.equal(game.title,'טריוויה על היעד');assert(Array.isArray(game.deck)&&Array.isArray(game.askedQuestions)&&Array.isArray(game.triviaState.order));
  game.deck.push({id:'q1'});game.askedQuestions.push(q('א','ב'));game.triviaState.scores.p1=5;
  const builtin=BUILTIN_GAMES.find(candidate=>candidate.id===TRIVIA_ID);
  assert.deepEqual(builtin.deck,[]);assert.deepEqual(builtin.askedQuestions,[]);assert.deepEqual(builtin.triviaState.scores,{},'each trip gets its own copies');
  const second=normalizeOperationalState({trip:{id:'t3'},items:[]}).games.find(candidate=>candidate.id===TRIVIA_ID);
  assert.deepEqual(second.deck,[]);
  assert.equal(BUILTIN_GAMES.find(candidate=>candidate.id===TRIVIA_ID).id,TRIVIA_ID);
  assert(pkg.scripts.test.includes('tests/beta-0-9-1.mjs'),'registered in the suite');
  assert.equal(pkg.version.startsWith('0.9.1'),true);
});

test('answer explanation: every generated question carries a short explanation; it shows under the revealed answer with a "קראו עוד" link that is a search, never a model-made URL; the history stays question + answer',()=>{
  assert.deepEqual(triviaSchema.properties.questions.items.required,['question','answer','explanation']);
  assert(triviaSystemPrompt.includes('short explanation')&&triviaSystemPrompt.includes('one or two simple, true sentences'));
  assert.equal(readMoreUrl(' שוק צף '),'https://he.wikipedia.org/w/index.php?search='+encodeURIComponent('שוק צף'));
  const play=fn('triviaPlayView');
  assert(play.includes('<p class="a-why">${esc(question.explanation)}</p>')&&play.includes("question.explanation?"),'shown only when there is one (older decks have none)');
  assert(play.includes('class="a-more" href="${esc(readMoreUrl(question.answer))}" target="_blank" rel="noopener"'));
  assert(play.indexOf('a-why')>play.indexOf('a-text')&&play.indexOf('a-more')>play.indexOf('a-why'),'answer, then why, then read more -- all inside the revealed box');
  assert.match(css,/.answer-box .a-more{[^}]*min-height:44px/,'a 44px tap target');
  assert.deepEqual(capHistory([],[{...q('א','ב'),explanation:'למה'}]),[q('א','ב')],'the exclusion history never carries explanations');
});

test('the building screen can no longer be pushed wider than the phone by a long item name (PO screenshot): the phrase is clipped and the name shortened',()=>{
  assert.match(css,/.palm-loader .import-phrases{[^}]*align-self:stretch;overflow:hidden/);
  assert.match(css,/.palm-loader .import-phrases span{[^}]*overflow:hidden;text-overflow:ellipsis/);
  assert(fn('triviaView').includes('first.title.length>24?'),'long names are shortened in the phrase');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.1 tests passed`);
