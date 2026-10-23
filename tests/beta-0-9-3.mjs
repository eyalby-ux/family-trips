// Beta 0.9.3 -- (A) Pantomime, (B) מזכיר לי, (C) new-user onboarding, (D) the end-of-round winner animation plays twice (carried from 0.9.2).
// The AI call is always mocked. Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,WINNER_REPEATS,createWinnerPlayer,winnerHtml} from '../src/winner-animation.js';
import {REMIND_ME_HISTORY_CAP,REMIND_ME_MODES as SERVER_MODES,cleanStartHistory,extractRemindMe,remindMeInstruction,remindMeSchema,remindMeSystemPrompt,PANTOMIME_COUNT,PANTOMIME_FIELDS,buildPantomimeContext,cleanHistory,generateWithRepeatGuard,pantomimeInstruction,pantomimeSchema,pantomimeSystemPrompt} from '../netlify/functions/_shared/game-content.mjs';
import {REMIND_ME_CAP,REMIND_ME_ID,REMIND_ME_MODES,applyRemindMeResult,chooseRemindMeMode,emptyRemindMe,remindMeHistory,remindMeSuggestion,PANTOMIME_ID,beginPantomimeRound,capHistory,gameBuildGate,newPantomimeDeck,newPantomimeState,pantomimeFinished,pantomimeNext,pantomimePhrase,pantomimePlayable,pickActor,toggleCorrect,triviaWinners} from '../src/games.js';
import {BUILTIN_GAMES,normalizeOperationalState} from '../src/operational-data.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),pkg=JSON.parse(read('../package.json'));
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647};

// ---------------------------------------------------------------- (D) the animation plays twice

test('(D) the end-of-round winner animation plays TWICE in succession, each pass with its own random direction; a new celebration cancels a running one',()=>{
  assert.equal(WINNER_REPEATS,2);
  const log=[];let clock=0;const queue=[];let id=0;
  const player=createWinnerPlayer({mount:html=>log.push({at:clock,html}),clear:()=>log.push({at:clock,cleared:true}),schedule:(fn,ms)=>{queue.push({id:++id,at:clock+ms,fn});return id},cancel:handle=>{const i=queue.findIndex(item=>item.id===handle);if(i>=0)queue.splice(i,1);log.push({at:clock,cancelled:handle})},random:seeded(7)});
  const advance=()=>{queue.sort((a,b)=>a.at-b.at);const next=queue.shift();clock=next.at;next.fn()};
  player.play({name:'דנה',caption:'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS});
  assert.equal(log.filter(entry=>entry.html).length,1,'the first pass starts at once');
  advance();
  assert.equal(log.filter(entry=>entry.html).length,2,'a second pass follows when the first one ends');assert.equal(log.at(-1).at,WINNER_MS.big,'right after the first (big) pass');
  assert(!log.some(entry=>entry.cleared),'the card does not blink off in between');
  advance();
  assert(log.at(-1).cleared&&log.at(-1).at===WINNER_MS.big*2,'cleared once, after the second pass: twice as long in total');
  const passes=log.filter(entry=>entry.html);
  assert(passes.every(entry=>entry.html.includes('<bdi>דנה</bdi>')&&entry.html.includes('ניצחון בסיבוב!')),'the winner is named in both passes');
  assert.equal(queue.length,0);
  // each pass picks its own direction: over many celebrations every direction shows up in both slots, and the pair is not always identical
  const seenFirst=new Set(),seenSecond=new Set();let differing=0;
  for(let seed=1;seed<=60;seed++){
    const got=[];const q=[];const p=createWinnerPlayer({mount:html=>got.push(html.match(/data-animation="(\w+)"/)[1]),clear:()=>{},schedule:fn=>{q.push(fn);return q.length},cancel:()=>{},random:seeded(seed*104729+13)});
    p.play({name:'x',times:2});q.shift()();seenFirst.add(got[0]);seenSecond.add(got[1]);if(got[0]!==got[1])differing++;
  }
  assert.equal(seenFirst.size,4);assert.equal(seenSecond.size,4);assert(differing>10,'two independent random picks');
  // a single pass stays a single pass (Bingo lines / board)
  const one=[];const q1=[];createWinnerPlayer({mount:html=>one.push(html),clear:()=>one.push('cleared'),schedule:fn=>{q1.push(fn);return 1},cancel:()=>{}}).play({name:'y'});q1.shift()();
  assert.equal(one.length,2,'one pass, then cleared');
  // starting a new celebration while one is running cancels it (no stacked timers)
  const cancelled=[];const q2=[];const p2=createWinnerPlayer({mount:()=>{},clear:()=>{},schedule:fn=>{q2.push(fn);return q2.length},cancel:h=>cancelled.push(h)});
  p2.play({name:'a',times:2});p2.play({name:'b',times:2});assert.deepEqual(cancelled,[1]);
});

test('(D) wiring: Trivia\'s end-of-round celebration asks for the two passes; Bingo\'s lines and board stay a single pass; the old per-answer behaviour stays gone',()=>{
  const next=app.slice(app.indexOf("else if(action==='trivia-next')"),app.indexOf("else if(action==='trivia-replay')"));
  assert(next.includes("caption:winners.length>1?'ניצחון משותף בסיבוב!':'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS"),'Trivia: the winner(s), the big version, twice');
  const choose=fn('bingoStorePhoto');assert(!choose.includes('WINNER_REPEATS')&&!choose.includes('times:'),'Bingo completions: one pass');
  const score=app.slice(app.indexOf("else if(action==='trivia-score')"),app.indexOf("else if(action==='trivia-next')"));assert(!score.includes('fireWinner'),'not per answer');
  assert(app.includes("import {WINNER_REPEATS,createWinnerPlayer} from './winner-animation.js';"));
  assert(app.includes('const winnerPlayer=createWinnerPlayer({mount:')&&app.includes('function fireWinner(spec){winnerPlayer.play(spec)}'));
  assert.deepEqual(WINNER_ANIMATIONS,['confetti','stars','medal','burst']);
  assert(winnerHtml({name:'a',animation:'burst'}).includes('data-animation="burst"'));
});

// ---------------------------------------------------------------- (A) Pantomime

test('(A) generate_pantomime REUSES 0.9.1\'s engine (one dedup implementation, one function), is destination-only, and sends the exclusion list on every call',async()=>{
  const shared=read('../netlify/functions/_shared/game-content.mjs'),fnSource=read('../netlify/functions/game-content.mjs');
  assert.equal((shared.match(/export function dropRepeats\(/g)||[]).length,1,'ONE dedup implementation');
  assert.equal((shared.match(/export async function generateWithRepeatGuard\(/g)||[]).length,1,'ONE repeat guard');
  assert.equal((fnSource.match(/generateWithRepeatGuard\(\{/g)||[]).length,1,'the function calls it once, for every kind');
  assert(fnSource.includes('generate_pantomime:{')&&fnSource.includes('fields:PANTOMIME_FIELDS')&&fnSource.includes("listKey:'phrases'")&&fnSource.includes('context:buildPantomimeContext'));
  assert.equal((fnSource.match(/consumeDailyQuota\(user\)/g)||[]).length,1,'the same shared quota, one consume per build');
  assert(!/normalizeForMatch|dropRepeats/.test(app)&&!/normalizeForMatch|dropRepeats/.test(fnSource),'no parallel copy of the dedup anywhere else');
  // destination-only: no itinerary item can reach the prompt, even if a caller sent some
  const ctx=buildPantomimeContext({destinations:['תאילנד'],items:[{title:'Hyatt Regency Phuket',location:'Phuket',confirmationNumber:'X1'}]});
  assert.deepEqual(ctx,{destinations:['תאילנד'],items:[]});
  const text=pantomimeInstruction(ctx,{count:12,exclude:[],topUp:false});assert(!/Hyatt|Phuket|X1/.test(text)&&text.includes('תאילנד')&&text.includes('exactly 12'));
  assert(read('../src/game-content-client.js').includes("generatePantomime=({trip,history})=>generateContent('generate_pantomime',{trip,items:[],history})"),'the client never even sends items');
  // the exclusion list is in the request payload of every call -- including the top-up (AI call mocked), through the SAME guard
  const history=[{text:'פיל שרוחץ בנהר'},{text:'מוכר בשוק צף'}];const payloads=[];
  const callModel=async request=>{payloads.push(request);return payloads.length===1?[{text:'פיל שרוחץ בנהר!'},...Array.from({length:10},(_,i)=>({text:`ביטוי חדש ${i}`}))]:[{text:'עוד ביטוי'},{text:'ועוד אחד'}]};
  const result=await generateWithRepeatGuard({callModel,history,count:12,fields:PANTOMIME_FIELDS});
  assert.equal(result.items.length,12);assert.equal(result.calls,2);assert.equal(payloads[1].count,2,'the top-up asks only for the missing count');
  assert.deepEqual(payloads[0].exclude,history);assert(history.every(entry=>payloads[1].exclude.some(other=>other.text===entry.text)),'the second call still carries the history');
  assert(pantomimeInstruction(ctx,payloads[1]).includes('- מוכר בשוק צף'),'and the text the model reads names it');
  assert(!result.items.some(item=>item.text==='פיל שרוחץ בנהר!'),'a repeat that differs only by punctuation is dropped');
  assert(pantomimeSystemPrompt.includes('act out without words or props')&&pantomimeSystemPrompt.includes('kid-friendly')&&pantomimeSystemPrompt.includes('places, culture and daily life'),'kid-oriented, destination-themed, actable');
  assert.deepEqual(pantomimeSchema.properties.phrases.items.required,['text']);assert.equal(PANTOMIME_COUNT,12);
  // the history that comes back from the client keeps only {text}, capped at 60 oldest-first -- the generic capHistory
  assert.deepEqual(capHistory([],[{id:'p1',text:'א',extra:1}],undefined,['text']),[{text:'א'}]);
  let h=[];for(let i=0;i<8;i++)h=capHistory(h,Array.from({length:10},(_,j)=>({text:`b${i}-${j}`})),undefined,['text']);
  assert.equal(h.length,60);assert.equal(h[0].text,'b2-0');assert.equal(h.at(-1).text,'b7-9');
  assert.deepEqual(cleanHistory(Array.from({length:90},(_,i)=>({text:`t${i}`})),PANTOMIME_FIELDS).length,60,'the server caps it too');
});

test('(A) the actor is picked automatically at random with a re-roll on an immediate repeat -- concrete examples, including the exactly-two-participants alternation',()=>{
  const ids=['a','b','c'];
  // the pick comes from the participants
  const seen=new Set();for(let seed=1;seed<=80;seed++)seen.add(pickActor(ids,'',seeded(seed*7919+3)));assert.deepEqual([...seen].sort(),['a','b','c'],'every participant can be picked');
  // a random pick that equals the previous actor is re-rolled among the others, so the same person never performs two rounds in a row
  assert.equal(pickActor(ids,'a',()=>0),'b','first draw is "a" = the last actor, so it is re-rolled: the first of the others');
  assert.equal(pickActor(ids,'a',()=>0.99),'c','a draw that is already someone else stands');
  for(let seed=1;seed<=300;seed++)assert.notEqual(pickActor(ids,'b',seeded(seed*104729+11)),'b','never the same actor twice in a row');
  // exactly two participants: a strict alternation
  let last='',sequence=[];for(let round=0;round<10;round++){const pick=pickActor(['a','b'],last,seeded(round*31+5));sequence.push(pick);last=pick}
  assert(sequence.every((pick,i)=>i===0||pick!==sequence[i-1]),'two participants alternate strictly: '+sequence.join(''));
  // one participant: no loop, no crash
  assert.equal(pickActor(['solo'],'solo',()=>0),'solo');assert.equal(pickActor([],'',()=>0),'');
  // across a whole game, via the round opener (the state records lastActorId / currentActorId)
  let state={...newPantomimeState(newPantomimeDeck(Array.from({length:6},(_,i)=>({text:`ב${i}`}))),seeded(2))};const actors=[];const rnd=seeded(99);
  for(let r=0;r<6;r++){state=beginPantomimeRound(state,ids,rnd);actors.push(state.currentActorId);assert.equal(state.actorPosition,state.position);state=pantomimeNext(state)}
  assert(actors.every((a,i)=>i===0||a!==actors[i-1]),'no repeats across a game: '+actors.join(''));
  console.log('  actors over a 6-round game with a,b,c:',actors.join(' '),'| two players:',sequence.join(' '));
  // reopening mid-round keeps the same actor; an actor who left is replaced
  const mid=beginPantomimeRound({...newPantomimeState([{id:'p1'}],seeded(1))},ids,seeded(5));
  assert.equal(beginPantomimeRound(mid,ids,seeded(123)).currentActorId,mid.currentActorId,'same round, same actor after a reload');
  assert.notEqual(beginPantomimeRound(mid,ids.filter(id=>id!==mid.currentActorId),seeded(1)).currentActorId,mid.currentActorId,'a participant who left is not kept');
  assert.equal(pantomimePlayable([{id:'a'}]),false);assert.equal(pantomimePlayable([{id:'a'},{id:'b',active:false}]),false);assert.equal(pantomimePlayable([{id:'a'},{id:'b'}]),true,'needs an actor and a guesser');
});

test('(A) the round flow end to end: build gate, look-away screen naming the actor, private reveal, performance, tap who guessed, דילוג, tally, winner animation twice',()=>{
  // build gate: visible, disabled with the hint until a destination exists
  assert.deepEqual(gameBuildGate({destinationCountries:[]},'פנטומימה'),{allowed:false,hint:'הוסיפו יעד לטיול כדי לבנות פנטומימה'});assert.equal(gameBuildGate({destinationCountries:['תאילנד']},'פנטומימה').allowed,true);
  const view=fn('pantomimeView');
  assert(view.includes("data-action=\"pantomime-build\" data-id=\"${game.id}\"${gate.allowed?'':' disabled'}>בנה פנטומימה</button>${hint}"),'a visible, disabled button plus the hint');
  assert(view.includes("largePalm({phrases,label:'בונים פנטומימה…'"),'the same swaying-palm loader as Trivia');
  assert(view.includes('game-start')&&view.includes("${playable?'':' disabled'}")&&view.includes('פנטומימה צריכה לפחות שני משתתפים'),'it cannot start with fewer than two participants');
  assert(app.includes("if(!game||pantomimeBuilding||!gameBuildGate(state.trip,'פנטומימה').allowed)return;"),'the handler enforces the gate too');
  const build=fn('buildPantomime');
  assert(build.includes('generatePantomime({trip:state.trip,history:game.askedPhrases||[]})')&&build.includes("live.askedPhrases=capHistory(live.askedPhrases,deck,undefined,['text'])")&&build.includes('live.pantomimeState=newPantomimeState(deck)'),'full rebuild: history kept, deck and state reset');
  assert(build.indexOf('generatePantomime(')<build.indexOf('live.deck=deck'),'nothing is discarded before the new deck exists');
  // the three screens of a round
  const play=fn('pantomimePlayView');
  assert(play.includes("pantomimeStage==='away'")&&play.includes('מעבירים את הטלפון ל<bdi>${esc(actorName)}</bdi> — כולם אחרים, תביטו לכיוון אחר!')&&play.includes('data-action="pantomime-reveal"')&&play.includes('>הצג את הביטוי</button>'),'the look-away screen names the automatically picked actor; the phrase is NOT in it');
  const away=play.slice(play.indexOf("if(pantomimeStage==='away')"),play.indexOf("if(pantomimeStage==='reveal')"));assert(!away.includes('phrase.text'),'the phrase is hidden until the actor taps');
  assert(play.includes('נבחר/ה אוטומטית להציג')&&!play.includes('בחירת משתתף'),'the automatic pick is shown; there is no manual picker');
  const reveal=play.slice(play.indexOf("if(pantomimeStage==='reveal')"),play.indexOf('const guessers='));
  assert(reveal.includes('${esc(phrase.text)}')&&reveal.includes('data-action="pantomime-ready"')&&reveal.includes('הצגתי, עברו לניחוש')&&!/timer|setInterval|countdown/.test(play),'the private reveal; no round timer');
  assert(play.includes('data-action="pantomime-score"')&&play.includes('מי ניחש נכון?')&&play.includes('data-action="pantomime-skip"')&&play.includes('דילוג — לא ניחשו'),'tap who guessed, and the explicit דילוג button');
  assert(play.includes('person.id!==ps.currentActorId'),'the actor cannot be marked as guessing their own phrase');
  assert(play.includes('data-action="pantomime-replay"')&&play.includes('class="btn ghost game-secondary" data-action="pantomime-build"'),'the end screen: שחקו שוב (no AI) and the real rebuild');
  // simulate a game with the pure pieces: reveal-and-score, skip, tally, winners
  const deck=newPantomimeDeck(Array.from({length:4},(_,i)=>({text:`ביטוי ${i}`})));let ps=newPantomimeState(deck,seeded(4));const game={deck};const people=[{id:'a',name:'אייל'},{id:'b',name:'דנה'},{id:'c',name:'נועה'}];
  const marks=[];const play1=(guessers,skip)=>{ps=beginPantomimeRound(ps,['a','b','c'],seeded(ps.position*13+1));let marked=[];for(const g of guessers){const r=toggleCorrect(ps,marked,g);marked=r.marked;ps={...ps,scores:r.scores}}ps=pantomimeNext(ps);marks.push(skip?'skip':guessers.join('+'))};
  play1(['b']);play1(['b','c']);play1([],true);play1(['c']);
  game.pantomimeState=ps;assert(pantomimeFinished(game));assert.equal(pantomimePhrase(game),null);
  assert.deepEqual(ps.scores,{b:2,c:2},'two points each; the skipped round scored nobody');
  assert.deepEqual(triviaWinners(ps.scores,people),['דנה','נועה'],'a tie names every top scorer');
  const next=app.slice(app.indexOf("else if(action==='pantomime-next'"),app.indexOf("else if(action==='pantomime-replay')"));
  assert(next.includes("else if(action==='pantomime-next'||action==='pantomime-skip')pantomimeAdvance(button.dataset.id)"),'next and skip share one path');
  const adv=fn('pantomimeAdvance');
  assert(adv.includes('if(pantomimeFinished(game)){const winners=triviaWinners(game.pantomimeState.scores,state.participants);if(winners.length)fireWinner(')&&adv.includes("caption:winners.length>1?'ניצחון משותף בסיבוב!':'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS"),'after the last phrase: the shared animation, the winner(s) named, TWICE');
  assert(adv.indexOf('save();render();')<adv.indexOf('fireWinner('),'drawn after the render');
  assert(!fn('pantomimePlayView').includes('fireWinner')&&!app.slice(app.indexOf("else if(action==='pantomime-replay')"),app.indexOf("else if(action==='pantomime-exit')")).includes('fireWinner'),'reopening or replaying never repeats it');
  const replay=app.slice(app.indexOf("else if(action==='pantomime-replay')"),app.indexOf("else if(action==='pantomime-exit')"));assert(replay.includes('newPantomimeState(game.deck)')&&!replay.includes('generatePantomime')&&!replay.includes('buildPantomime'),'שחקו שוב never calls the AI');
  // the winner overlay itself, for the tie, twice
  const queue=[];const mounted=[];createWinnerPlayer({mount:h=>mounted.push(h),clear:()=>mounted.push('cleared'),schedule:f=>{queue.push(f);return queue.length},cancel:()=>{}}).play({name:'דנה · נועה',caption:'ניצחון משותף בסיבוב!',big:true,times:WINNER_REPEATS});
  queue.shift()();assert.equal(mounted.filter(h=>h!=='cleared').length,2);assert(mounted.every(h=>h==='cleared'||h.includes('<bdi>דנה · נועה</bdi>')));
});

test('(A) a brand-new id: pushed into every saved trip by the existing push-if-missing logic -- no backfill; a trip that already has it is untouched; Pantomime is not "בנסיעה"',()=>{
  const entry=BUILTIN_GAMES.find(game=>game.id===PANTOMIME_ID);
  assert(entry&&entry.interactive===true&&entry.title==='פנטומימה'&&entry.items==='ללא ציוד'&&entry.participants==='2 ומעלה'&&entry.duration==='20 דקות');
  assert.equal(entry.onTheGo,undefined,'needs everyone watching: not tagged "בנסיעה"');
  assert.deepEqual(entry.deck,[]);assert.deepEqual(entry.askedPhrases,[]);assert.deepEqual(entry.pantomimeState,{order:[],position:0,scores:{},lastActorId:'',currentActorId:'',actorPosition:-1});
  assert(entry.instructions.includes('בלי מילים ובלי קול'));
  const odSource=read('../src/operational-data.js');assert(!/game-pantomime/.test(odSource.slice(odSource.indexOf('export function backfillBuiltinGames'),odSource.indexOf('const freshBuiltin='))),'no backfill for it');
  // a pre-0.9.3 trip: Bingo, Trivia etc. exist, Pantomime does not -> it appears, the rest is untouched
  const before={games:[{id:'game-road-story',title:'סיפור בהמשכים',favorite:true},{id:'game-airport-bingo',favorite:false}],trip:{id:'t1'},items:[]};
  const snapshot=JSON.stringify(before.games.find(game=>game.id==='game-road-story'));
  normalizeOperationalState(before);
  assert(before.games.some(game=>game.id===PANTOMIME_ID)&&before.games.find(game=>game.id===PANTOMIME_ID).favorite===false,'pushed, not starred');
  assert.equal(JSON.stringify(before.games.find(game=>game.id==='game-road-story')),snapshot,'other games untouched');
  // a trip that already has a built Pantomime keeps its deck
  const withDeck={games:[{...structuredClone(entry),favorite:true,deck:[{id:'p1',text:'א'}],askedPhrases:[{text:'א'}],pantomimeState:{order:[0],position:1,scores:{a:2},lastActorId:'a',currentActorId:'b',actorPosition:0}}],trip:{id:'t'},items:[]};
  normalizeOperationalState(withDeck);const kept=withDeck.games.find(game=>game.id===PANTOMIME_ID);
  assert.equal(kept.deck.length,1);assert.equal(kept.pantomimeState.scores.a,2);assert.equal(kept.favorite,true);assert.equal(withDeck.games.filter(game=>game.id===PANTOMIME_ID).length,1,'never pushed twice');
  // each trip has its own copy
  const fresh=normalizeOperationalState({trip:{id:'t2'},items:[]}).games.find(game=>game.id===PANTOMIME_ID);fresh.deck.push({id:'x'});fresh.pantomimeState.scores.z=1;
  assert.deepEqual(BUILTIN_GAMES.find(game=>game.id===PANTOMIME_ID).deck,[]);assert.deepEqual(BUILTIN_GAMES.find(game=>game.id===PANTOMIME_ID).pantomimeState.scores,{});
  assert(app.includes('if(game.id===PANTOMIME_ID)return pantomimeView(game);'));
  assert.match(css,/\.lookaway\{display:flex;flex-direction:column;align-items:center;/);assert.match(css,/\.reveal-text\{margin:0;font-size:26px;/);
});

// ---------------------------------------------------------------- (B) מזכיר לי

test('(B) the new game pushes into saved trips with no backfill; the draft instructions are the kickoff\'s, verbatim; it keeps the plain activity page (no interactive plumbing)',()=>{
  const entry=BUILTIN_GAMES.find(game=>game.id===REMIND_ME_ID);
  assert(entry);assert.equal(entry.title,'מזכיר לי');assert.equal(entry.onTheGo,true);assert.equal(entry.interactive,undefined,'no interactive flag: the chain is free-form, the app tracks nothing');
  assert.equal(entry.participants,'2 ומעלה');assert.equal(entry.duration,'לפי הצורך');assert.equal(entry.items,'ללא ציוד (למצב השירים: טלפון עם נגן מוזיקה)');
  assert(entry.instructions.startsWith('שני אופנים לשחק: (1) מילים — משתתף ראשון אומר מילה')&&entry.instructions.includes('(2) שירים — משתתף ראשון בוחר שיר ומשמיע אותו')&&entry.instructions.endsWith('או להמשיך להאזין עד הסוף.'));
  assert.deepEqual({mode:entry.remindMeMode,start:entry.smartStart,asked:entry.askedStarts},{mode:'',start:{word:'',song:{title:'',artist:''}},asked:{words:[],songs:[]}});
  const odSource=read('../src/operational-data.js');assert(!/game-remind-me/.test(odSource.slice(odSource.indexOf('export function backfillBuiltinGames'),odSource.indexOf('const freshBuiltin='))),'no backfill');
  const trip=normalizeOperationalState({games:[{id:'game-road-story',title:'סיפור בהמשכים',favorite:true}],trip:{id:'t'},items:[]});
  assert(trip.games.some(game=>game.id===REMIND_ME_ID&&game.favorite===false),'pushed into a trip that never had it');assert.equal(trip.games.filter(game=>game.id===REMIND_ME_ID).length,1);
  const kept=normalizeOperationalState({games:[{...structuredClone(entry),remindMeMode:'song',smartStart:{word:'',song:{title:'א',artist:'ב'}}}],trip:{id:'t'},items:[]}).games.find(game=>game.id===REMIND_ME_ID);
  assert.equal(kept.remindMeMode,'song');assert.equal(kept.smartStart.song.title,'א','an existing suggestion is never overwritten');
  assert.deepEqual(emptyRemindMe(),{remindMeMode:'',smartStart:{word:'',song:{title:'',artist:''}},askedStarts:{words:[],songs:[]}});
  // the bespoke card on the game's own instructions page, not the interactive play plumbing
  assert(app.includes('if(game.id===REMIND_ME_ID)return remindMeView(game);'));
  const view=fn('remindMeView');assert(view.includes('gamePrimaryAction(game)')&&view.includes('data-action="game-start"')&&view.includes('${remindMeCard(game)}'));
  assert(!app.includes("action==='game-start'&&button.dataset.id===REMIND_ME_ID"),'the generic start stays as for סיפור בהמשכים');
});

test('(B) generate_remind_me_start: a SINGLE mode per call -- only the requested field comes back, never both; one quota call; gated on a destination; same engine file as the other games',async()=>{
  const fnSource=read('../netlify/functions/game-content.mjs');
  assert(fnSource.includes("body.operation==='generate_remind_me_start'")&&fnSource.includes("throw httpError(400,'invalid_mode'")&&fnSource.includes('single:true'));
  assert.equal((fnSource.match(/consumeDailyQuota\(user\)/g)||[]).length,1,'the same shared 10-a-day pool, one consume');
  assert(fnSource.indexOf("'no_destination'")<fnSource.indexOf('consumeDailyQuota(user)'),'no destination: refused before any quota is spent');
  assert(fnSource.includes('context:buildPantomimeContext'),'destination-only context');
  assert(fnSource.includes('const suggestion=extractRemindMe(body.mode,await callModel({exclude:cleanStartHistory(body.history,body.mode)}))'),'one model call, the history of THIS mode only');
  assert(!/generateWithRepeatGuard|dropRepeats/.test(fnSource.slice(fnSource.indexOf('if(kind.single){'),fnSource.indexOf('const result=await generateWithRepeatGuard('))),'no dedup guard / top-up for a single suggestion (prompt-only exclusion)');
  // schemas: one field each
  assert.deepEqual(remindMeSchema('word').required,['word']);assert.deepEqual(Object.keys(remindMeSchema('word').properties),['word']);
  assert.deepEqual(remindMeSchema('song').required,['song']);assert.deepEqual(Object.keys(remindMeSchema('song').properties),['song']);assert.deepEqual(remindMeSchema('song').properties.song.required,['title','artist']);
  // extraction: only the asked-for field, whatever the model sent
  assert.deepEqual(extractRemindMe('word',{word:' שוק ',song:{title:'x',artist:'y'}}),{word:'שוק'},'a word call never returns a song, even if the model added one');
  assert.deepEqual(extractRemindMe('song',{word:'w',song:{title:' ש ',artist:' א '}}),{song:{title:'ש',artist:'א'}},'a song call never returns a word');
  assert.equal(extractRemindMe('song',{song:{title:'x',artist:''}}),null,'a title without an artist is not accepted');assert.equal(extractRemindMe('word',{word:'  '}),null);assert.equal(extractRemindMe('song',{}),null);
  assert.deepEqual(REMIND_ME_MODES.length,2);
});

test('(B) the real-song requirement: the system prompt forbids inventing a song or guessing an artist, demands genuine confidence, prefers famous songs, leans to the destination, stays family-friendly; the exclusion list is per mode and capped at 10',()=>{
  const song=remindMeSystemPrompt('song'),word=remindMeSystemPrompt('word');
  for(const required of ['HARD REQUIREMENT -- THE SONG MUST BE REAL','Never invent a song title','Never guess an artist','genuinely confident','exactly this title by exactly this artist exists','choose a different song you ARE sure about','Prefer very famous, widely known songs over obscure ones','never pair a title with another artist','destination\'s own country, culture or language','kid-friendly','Never suggest a song that is in the exclusion list'])assert(song.includes(required),required);
  assert(!/real, existing song/.test(word)&&word.includes('ONE simple starting word')&&word.includes('kid-friendly'),'the word prompt is its own');
  const ctx=buildPantomimeContext({destinations:['תאילנד'],items:[{title:'secret hotel'}]});
  const text=remindMeInstruction(ctx,{mode:'song',exclude:[{title:'שיר ישן',artist:'זמר'}]});
  assert(text.includes('Suggest one real song (title and artist).')&&text.includes('תאילנד')&&text.includes('- שיר ישן -- זמר')&&!text.includes('secret hotel'));
  assert(remindMeInstruction(ctx,{mode:'word',exclude:['פיל']}).includes('- פיל'));assert(!remindMeInstruction(ctx,{mode:'word',exclude:[]}).includes('Do NOT'));
  // per-mode history, capped at 10, oldest dropped
  const words=Array.from({length:14},(_,i)=>`מילה${i}`);assert.deepEqual(cleanStartHistory(words,'word'),words.slice(-10));
  const songs=Array.from({length:14},(_,i)=>({title:`ש${i}`,artist:`א${i}`}));assert.deepEqual(cleanStartHistory(songs,'song'),songs.slice(-10));
  assert.deepEqual(cleanStartHistory([{title:'',artist:'x'},{title:'ש',artist:'א'}],'song'),[{title:'ש',artist:'א'}]);assert.deepEqual(cleanStartHistory(undefined,'word'),[]);
  assert.equal(REMIND_ME_HISTORY_CAP,10);assert.equal(REMIND_ME_CAP,10);
  // the client keeps each mode's own history and sends only that one
  let game={...emptyRemindMe()};
  for(let i=0;i<13;i++)Object.assign(game,applyRemindMeResult(game,'word',{word:`מילה${i}`}));
  for(let i=0;i<3;i++)Object.assign(game,applyRemindMeResult(game,'song',{song:{title:`ש${i}`,artist:`א${i}`}}));
  assert.equal(game.askedStarts.words.length,10);assert.equal(game.askedStarts.words[0],'מילה3');assert.equal(game.askedStarts.songs.length,3,'the song history is separate from the word history');
  assert.deepEqual(remindMeHistory(game,'word'),game.askedStarts.words);assert.deepEqual(remindMeHistory(game,'song'),game.askedStarts.songs);
  assert.deepEqual(game.smartStart,{word:'מילה12',song:{title:'ש2',artist:'א2'}},'each call wrote only its own field');
});

test('(B) mode first, remembered, non-destructive: a cached suggestion is shown for free when switching back; only the first pick of a mode or an explicit replace spends a call',()=>{
  let game=emptyRemindMe();let calls=0;
  const pick=mode=>{const choice=chooseRemindMeMode(game,mode);game.remindMeMode=choice.mode;if(choice.needsCall){calls++;Object.assign(game,applyRemindMeResult(game,mode,mode==='song'?{song:{title:`ש${calls}`,artist:'א'}}:{word:`מילה${calls}`}))}};
  pick('word');assert.equal(calls,1,'the first pick of a mode generates ONLY that mode');assert.equal(remindMeSuggestion(game,'song'),null,'the song was never generated');assert.deepEqual(remindMeSuggestion(game,'word'),{word:'מילה1'});
  pick('song');assert.equal(calls,2,'trying the other mode is a second call (two calls to see both -- traded on purpose)');
  pick('word');assert.equal(calls,2,'switching BACK shows the cached word: no call');assert.deepEqual(remindMeSuggestion(game,'word'),{word:'מילה1'},'the same word as before');
  pick('song');assert.equal(calls,2,'and back again');assert.deepEqual(remindMeSuggestion(game,'song'),{song:{title:'ש2',artist:'א'}});
  assert.equal(game.remindMeMode,'song','the mode is remembered');
  // replace = a fresh call for the SAME mode, the other mode untouched
  calls++;Object.assign(game,applyRemindMeResult(game,'song',{song:{title:'שיר חדש',artist:'אמן'}}));
  assert.deepEqual(remindMeSuggestion(game,'song'),{song:{title:'שיר חדש',artist:'אמן'}});assert.deepEqual(remindMeSuggestion(game,'word'),{word:'מילה1'},'the word is untouched by a song replace');assert.equal(game.askedStarts.songs.length,2,'the history survives a replace');
  // wiring
  const mode=app.slice(app.indexOf("else if(action==='remind-me-mode')"),app.indexOf("else if(action==='remind-me-switch')"));
  assert(mode.includes('chooseRemindMeMode(game,button.dataset.mode)')&&mode.includes('if(choice.needsCall)await remindMeGenerate(choice.mode)')&&mode.includes('game.remindMeMode=choice.mode;remindMePicking=false;save()'),'pick → remembered and saved; a call only when that mode has no suggestion');
  assert(app.includes("else if(action==='remind-me-switch'){remindMePicking=true;render()}"),'the pill reopens the picker without touching anything');
  assert(app.includes("else if(action==='remind-me-generate')await remindMeGenerate(button.dataset.mode);"),'the replace / get button is an explicit call');
  const gen=fn('remindMeGenerate');
  assert(gen.includes('generateRemindMeStart({trip:state.trip,mode,history:remindMeHistory(game,mode)})')&&gen.includes('Object.assign(live,applyRemindMeResult(live,mode,result))'),'one mode, that mode\'s history, that mode\'s field');
  assert(gen.indexOf('generateRemindMeStart(')<gen.indexOf('applyRemindMeResult('),'a failed call changes nothing');
  assert(gen.includes("!gameBuildGate(state.trip,'הצעה').allowed")&&gen.includes('remindMeBuilding||'),'gated on a destination; one call at a time');
});

test('(B) the card: gated on a destination (disabled + hint), a two-tile mode picker, a mode pill, one suggestion; the song-accuracy caption is shown under a song only',()=>{
  const card=fn('remindMeCard');
  assert(card.includes('הוסיפו יעד לטיול כדי לקבל הצעה להתחלה')&&card.includes("${gate.allowed?'':' disabled'}"),'visible but disabled, with the hint, until a destination exists');
  assert(card.includes('REMIND_ME_MODES.map(([key,label])=>`<button class="bingo-tile${key===mode?\' on\':\'\'}" data-action="remind-me-mode" data-mode="${key}"'),'two tiles, the same component as Bingo\'s place picker');
  assert(card.includes('if(remindMePicking||!mode)'),'the picker shows first time, or on request, never otherwise');
  assert(card.includes('data-action="remind-me-switch" aria-label="שינוי אופן המשחק">')&&card.includes('מצב ${label} · שינוי'),'the pill');
  assert(card.includes('${suggestion?\'החלפת ההצעה\':\'קבלו הצעה\'}'),'"get" when there is none, "replace" when there is');
  assert(card.includes('ההצעה נוצרת בבינה מלאכותית — כדאי לוודא שהשיר קיים לפני שמשמיעים אותו.'),'the song-accuracy caption');
  const wordBody=card.slice(card.indexOf('`<div class="smart-suggestion"><span class="q-label">מילה להתחלה'),card.indexOf('`<div class="smart-suggestion"><span class="q-label">מילה להתחלה')+160);assert(!wordBody.includes('בינה מלאכותית'),'no caption under a word');
  assert(card.includes("largePalm({phrases:[remindMeBuilding==='song'"),'the same palm loader while it builds');
  assert.match(css,/\.smart-card\{margin:16px 0;padding:14px;/);assert.match(css,/\.mode-pill\{[^}]*min-height:44px/);assert(app.includes("  music:'<path d="),'the music-note icon');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.3 tests passed`);
