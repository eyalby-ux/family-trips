// Beta 0.9.3 -- (A) Pantomime, (B) מזכיר לי, (C) new-user onboarding, (D) the end-of-round winner animation plays twice (carried from 0.9.2).
// The AI call is always mocked. Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,WINNER_REPEATS,createWinnerPlayer,winnerHtml} from '../src/winner-animation.js';
import {REMIND_ME_HISTORY_CAP,REMIND_ME_MODES as SERVER_MODES,cleanStartHistory,extractRemindMe,remindMeInstruction,remindMeSchema,remindMeSystemPrompt,PANTOMIME_COUNT,PANTOMIME_FIELDS,buildPantomimeContext,clampCount,cleanHistory,generateWithRepeatGuard,mentionsDestination,pantomimeAccept,pantomimeInstruction,pantomimeSchema,pantomimeSystemPrompt} from '../netlify/functions/_shared/game-content.mjs';
import {REMIND_ME_CAP,REMIND_ME_ID,REMIND_ME_MODES,applyRemindMeResult,chooseRemindMeMode,emptyRemindMe,remindMeHistory,remindMeSuggestion,PANTOMIME_ID,TRIVIA_ID,PANTOMIME_MAX_ROUNDS,capHistory,clampRounds,pantomimeActor,pantomimeBuildCount,pantomimeTurns,gameBuildGate,newPantomimeDeck,newPantomimeState,pantomimeFinished,pantomimeNext,pantomimePhrase,pantomimePlayable,pantomimePlayers,pantomimeSummaryLine,gamePlayers,songSearchLinks,TRIVIA_QUESTION_COUNTS,clampQuestionCount,triviaSummaryLine,newTriviaDeck,newTriviaState,toggleCorrect,triviaWinners} from '../src/games.js';
import {BUILTIN_GAMES,diffById,normalizeOperationalState,sanitizeTripDates,syncBaseline} from '../src/operational-data.js';
import {onboardingTripFrom,showsOnboarding} from '../src/onboarding.js';

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
  assert(read('../src/game-content-client.js').includes("generatePantomime=({trip,history,count})=>generateContent('generate_pantomime',{trip,items:[],history,count})"),'the client never even sends items');
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

test('(A) P93-P1 the actor rule: round 1 a random player, then the remaining ones one per round, then the SAME order repeats (A B C A B C)',()=>{
  const ids=['a','b','c'],deck=newPantomimeDeck(Array.from({length:12},(_,i)=>({text:`ב${i}`})));
  // the first actor can be any of the players (random), the order is a permutation of ALL of them
  const firsts=new Set();for(let seed=1;seed<=80;seed++){const st=newPantomimeState(deck,{activeIds:ids,rounds:2,random:seeded(seed*7919+3)});firsts.add(st.actorOrder[0]);assert.deepEqual([...st.actorOrder].sort(),ids,'everyone is in the order exactly once')}
  assert.deepEqual([...firsts].sort(),ids,'round 1 can be any player');
  // a whole game: 3 players x 2 rounds = 6 turns; nobody acts twice before everybody acted once; the second pass repeats the first
  const st=newPantomimeState(deck,{activeIds:ids,rounds:2,random:seeded(5)});const actors=[];let cur=st;
  for(let r=0;r<6;r++){actors.push(pantomimeActor(cur,ids));cur=pantomimeNext(cur)}
  assert.equal(st.order.length,6,'3 players x 2 rounds = 6 turns');assert(pantomimeFinished({deck,pantomimeState:cur}),'finished after 6');
  assert.deepEqual(actors.slice(0,3).sort(),ids,'the first three rounds are all different players');assert.deepEqual(actors.slice(3),actors.slice(0,3),'then the same order again');
  console.log('  actors, 3 players x 2 rounds:',actors.join(' '));
  // fixed draw -> concrete order: the draw decides the order, nothing else does
  const fixed=newPantomimeState(deck,{activeIds:ids,rounds:1,random:()=>0});assert.equal(fixed.actorOrder.length,3);
  // two players alternate strictly; one player acts every round without a crash
  const two=newPantomimeState(deck,{activeIds:['a','b'],rounds:3,random:seeded(9)});let seq=[],t=two;for(let r=0;r<6;r++){seq.push(pantomimeActor(t,['a','b']));t=pantomimeNext(t)}
  assert(seq.every((x,i)=>i===0||x!==seq[i-1]),'two players alternate: '+seq.join(''));
  assert.equal(pantomimeActor({actorOrder:['solo'],position:3},['solo']),'solo');assert.equal(pantomimeActor({},[]),'');
  // the actor depends only on the SAVED order and position: reopening or reloading the app cannot change it
  assert.equal(pantomimeActor(cur,ids),pantomimeActor(JSON.parse(JSON.stringify(cur)),ids));
  const mid={actorOrder:['a','b','c'],position:4};assert.equal(pantomimeActor(mid,ids),'b','position 4 of A B C A B C is B');
  // a participant who left is skipped; a game saved before the rule (no order) falls back to the participants' order, still cycling
  assert.equal(pantomimeActor({actorOrder:['a','b','c'],position:0},['b','c']),'b');assert.equal(pantomimeActor({position:4},ids),'b');
  assert.equal(pantomimePlayable([{id:'a'}]),false);assert.equal(pantomimePlayable([{id:'a'},{id:'b',active:false}]),false);assert.equal(pantomimePlayable([{id:'a'},{id:'b'}]),true,'needs an actor and a guesser');
});

test('(A) P93-P2/P3 rounds per player: 1-5, turns = players x rounds, the deck is built for it and never shorter than 12; the game plays exactly that many turns',()=>{
  assert.equal(PANTOMIME_MAX_ROUNDS,5);assert.equal(clampRounds(0),2,'garbage falls back to the default of 2');assert.equal(clampRounds('x'),2);assert.equal(clampRounds(-3),1);assert.equal(clampRounds(9),5);assert.equal(clampRounds('3'),3);assert.equal(clampRounds(1),1);assert.equal(clampRounds(5),5);
  assert.equal(pantomimeTurns(3,2),6,'the PO example');assert.equal(pantomimeTurns(5,5),25);assert.equal(pantomimeTurns(0,2),0);
  assert.equal(pantomimeBuildCount(3,2),12,'never fewer than the usual 12');assert.equal(pantomimeBuildCount(5,5),25);assert.equal(pantomimeBuildCount(10,5),40,'capped at 40');
  const deck=newPantomimeDeck(Array.from({length:25},(_,i)=>({text:`ב${i}`})));
  for(const [players,rounds] of [[2,1],[3,2],[4,3],[5,5]]){const ids=Array.from({length:players},(_,i)=>`p${i}`),st=newPantomimeState(deck,{activeIds:ids,rounds,random:seeded(players*rounds)});
    assert.equal(st.order.length,players*rounds,`${players} players x ${rounds} rounds`);assert.equal(new Set(st.order).size,st.order.length,'no phrase twice in a game');assert.equal(st.rounds,rounds);
    const counts={};let cur=st;for(let r=0;r<st.order.length;r++){const who=pantomimeActor(cur,ids);counts[who]=(counts[who]||0)+1;cur=pantomimeNext(cur)}
    assert(ids.every(id=>counts[id]===rounds),'everyone acts exactly "rounds" times: '+JSON.stringify(counts))}
  // a deck shorter than the turns: the game simply has as many turns as phrases
  assert.equal(newPantomimeState(deck.slice(0,4),{activeIds:['a','b','c'],rounds:5,random:seeded(1)}).order.length,4);
  assert.equal(newPantomimeState(deck,{activeIds:['a','b'],random:seeded(1)}).order.length,4,'default 2 rounds');
  // server: the requested count is clamped, anything else falls back to 12
  assert.equal(clampCount(25,12),25);assert.equal(clampCount(500,12),40);assert.equal(clampCount(1,12),6);assert.equal(clampCount(undefined,12),12);assert.equal(clampCount('abc',12),12);assert.equal(clampCount(-4,12),12);
  const fnSrc=read('../netlify/functions/game-content.mjs');assert(fnSrc.includes('count:kind.size?clampCount(body.count,kind.count,...kind.size):kind.count')&&/generate_pantomime[^\n]*size:\[6,40\]/.test(fnSrc)&&/generate_trivia[^\n]*size:\[5,20\]/.test(fnSrc),'Pantomime (6-40) and Trivia (5-20) accept a client count; nothing else does');
  assert(read('../src/game-content-client.js').includes("generateContent('generate_pantomime',{trip,items:[],history,count})"));
  // wiring: the picker, the persisted setting, the build asks for what the game needs, replay uses it, no leftovers of the old rule
  const view=fn('pantomimeView');assert(view.includes('setupEntryRows(game)')&&app.includes('data-action="game-setup-open"')&&app.includes("row('כמה סיבובים לכל משתתף'")&&app.includes('סה"כ ${pantomimeTurns(roster.length,rounds)} סיבובים'),'the instructions page has the two entry rows (P93-P4 Option 2a); the rounds are picked on the sub-page');
  assert(app.includes("game.roundsPerPlayer=clampRounds(gameSetupDraft.rounds)"),'the choice is saved on the game (and synced with it)');
  assert(fn('buildPantomime').includes('count:pantomimeBuildCount(pantomimePlayerIds(game).length,game.roundsPerPlayer)')&&fn('buildPantomime').includes('newPantomimeStateFor(live,deck)'));
  assert(app.includes('newPantomimeState(deck,{activeIds:pantomimePlayerIds(game),rounds:game.roundsPerPlayer})'));
  assert(!/lastActorId|currentActorId:|actorPosition|pickActor|beginPantomimeRound/.test(app+read('../src/games.js')),'the "never twice in a row" rule is gone');
  assert(fn('pantomimePlayView').includes('pantomimeActor(ps,players.map(person=>person.id))'));
});

test('(A) P93-P4 participant selection (PO design, Option 2): who plays is saved per game; the actor order, guessers, turns and tally use only them; the setup sub-page saves and starts',()=>{
  const people=[{id:'a',name:'פאולה'},{id:'b',name:'דניאל'},{id:'c',name:'עמית'},{id:'d',name:'עפרי',active:false},{id:'e',name:'אייל'}];
  // [] / missing = everybody active; a pick is filtered to active participants; if nobody picked is left, everybody active plays
  assert.deepEqual(pantomimePlayers(people,[]).map(p=>p.id),['a','b','c','e']);assert.deepEqual(pantomimePlayers(people).map(p=>p.id),['a','b','c','e']);
  assert.deepEqual(pantomimePlayers(people,['a','e']).map(p=>p.id),['a','e']);assert.deepEqual(pantomimePlayers(people,['a','d']).map(p=>p.id),['a'],'an inactive participant cannot play');
  assert.deepEqual(pantomimePlayers(people,['d']).map(p=>p.id),['a','b','c','e'],'nobody left -> everybody');
  assert.equal(pantomimePlayable(pantomimePlayers(people,['a'])),false,'one picked player cannot start (the page also refuses to save fewer than 2)');
  // the game with a subset: only they act, 2 players x 3 rounds = 6 turns, alternating
  const deck=newPantomimeDeck(Array.from({length:12},(_,i)=>({text:`ב${i}`}))),ids=pantomimePlayers(people,['a','e']).map(p=>p.id);
  const st=newPantomimeState(deck,{activeIds:ids,rounds:3,random:seeded(3)});assert.equal(st.order.length,6);assert.deepEqual([...st.actorOrder].sort(),['a','e']);
  let cur=st;const seq=[];for(let r=0;r<6;r++){seq.push(pantomimeActor(cur,ids));cur=pantomimeNext(cur)}assert(seq.every((x,i)=>i===0||x!==seq[i-1])&&seq.every(x=>ids.includes(x)),'only the two chosen players act: '+seq.join(''));
  assert.equal(pantomimeBuildCount(2,3),12,'the build still asks for at least 12');assert.equal(pantomimeSummaryLine(4,2),'4 משתתפים × 2 תורות לכל משתתף = סה"כ 8 סיבובים למשחק',"the PO's example");assert.equal(pantomimeSummaryLine(5,5),'5 משתתפים × 5 תורות לכל משתתף = סה"כ 25 סיבובים למשחק',"the PO's wording for more than one round");assert.equal(pantomimeSummaryLine(5,1),'5 משתתפים × תור 1 לכל משתתף = סה"כ 5 סיבובים למשחק');
  // wiring
  const setup=fn('gameSetupView');
  assert(setup.includes('מי משחק?')&&setup.includes('בחירת כולם')&&setup.includes('כמה סיבובים לכל משתתף?')&&setup.includes('pantomimeSummaryLine(picked,draft.rounds)')&&setup.includes('שמירה והתחלה')&&setup.includes('משתתפים וסיבובים'),'the sub-page copy of the design');
  assert(setup.includes("${ok?'':' disabled'}")&&setup.includes('בחרו לפחות שני משתתפים')&&setup.includes('role="checkbox"'),'start is disabled below two participants; the rows are real checkbox buttons');
  assert(fn('pantomimeView').includes('if(gameSetup===game.id)return gameSetupView(game);'));
  const save=app.slice(app.indexOf("else if(action==='game-setup-save')"),app.indexOf('\n',app.indexOf("else if(action==='game-setup-save')")+400));
  assert(save.includes('ids.length>=gameSetupMin(game)')&&save.includes('game.playerIds=ids.length===active.length?[]:ids')&&save.includes('newPantomimeStateFor(game,game.deck)')&&save.includes('game.started=true'),'saved on the game (all picked = [] = everybody, even people added later); a built deck starts a fresh game');
  assert(app.includes("else if(action==='game-setup-back'){gameSetup=null;render()}")&&app.includes('participantDeleteArmed=null;gameSetup=null;'),'back discards the draft; leaving the game resets the sub-page');
  assert(fn('pantomimePlayView').includes('const guessers=players.filter(person=>person.id!==currentActorId)')&&fn('pantomimePlayView').includes('triviaTally(ps.scores,pantomimePlayerList(game))'),'only players guess and appear in the tally');
  assert(!app.includes('pantomime-rounds'),'the inline picker is replaced by the sub-page');
  assert.deepEqual(BUILTIN_GAMES.find(game=>game.id===PANTOMIME_ID).playerIds,[]);
  assert.match(css,/\.pick-row\{min-height:52px/);assert.match(css,/\.rounds-picker \.trivia-chip\{flex:1 1 0/);
});

test('(B) P93-P5 song links: Spotify and YouTube, each a SEARCH for the title and artist (no AI-made link), on the song card only',()=>{
  const links=songSearchLinks({title:'Volver a los 17',artist:'Mercedes Sosa'});
  assert.equal(links.spotify,'https://open.spotify.com/search/Volver%20a%20los%2017%20Mercedes%20Sosa');assert.equal(links.youtube,'https://www.youtube.com/results?search_query=Volver%20a%20los%2017%20Mercedes%20Sosa');
  const nasty=songSearchLinks({title:'a&b=c#d "x"<script>',artist:'  /?  '});assert(nasty.spotify.startsWith('https://open.spotify.com/search/')&&nasty.youtube.startsWith('https://www.youtube.com/results?search_query=')&&!/[<>"# ]/.test(nasty.spotify.slice(32)+nasty.youtube.slice(45)),'whatever the model wrote is URL-encoded; the hosts are fixed');
  assert.equal(songSearchLinks({}).spotify,'https://open.spotify.com/search/');
  const card=fn('remindMeCard'),song=card.slice(card.indexOf("mode==='song'"),card.indexOf(':`<div class="smart-suggestion"><span class="q-label">מילה להתחלה'));
  assert(song.includes('songSearchLinks(suggestion.song)')&&song.includes('חיפוש ב-Spotify')&&song.includes('חיפוש ב-YouTube')&&song.includes('target="_blank" rel="noopener noreferrer"'),'two links on the song card, opened in a new tab');
  assert(!card.slice(card.indexOf('q-label\">מילה להתחלה')).includes('songSearchLinks'),'the word card has no links');
  assert(!/spotify|youtube/i.test(read('../netlify/functions/_shared/game-content.mjs')+read('../netlify/functions/game-content.mjs')),'the server and the model never produce a link');
  assert.match(css,/\.song-links\{display:flex/);
});

test('(A) P93-P6 participants (and Trivia\'s question count) for every relevant game: Bingo and Trivia use the same sub-page, 20 questions and מזכיר לי do not',()=>{
  const people=[{id:'a',name:'א'},{id:'b',name:'ב'},{id:'c',name:'ג',active:false},{id:'d',name:'ד'}];
  assert.equal(gamePlayers,pantomimePlayers);assert.deepEqual(gamePlayers(people,['b','d']).map(p=>p.id),['b','d']);assert.deepEqual(gamePlayers(people,[]).map(p=>p.id),['a','b','d']);assert.deepEqual(gamePlayers(people,['c']).map(p=>p.id),['a','b','d']);
  // Trivia: 5 / 10 / 15 / 20, default 10
  assert.deepEqual(TRIVIA_QUESTION_COUNTS,[5,10,15,20]);assert.equal(clampQuestionCount(15),15);assert.equal(clampQuestionCount('20'),20);assert.equal(clampQuestionCount(7),10);assert.equal(clampQuestionCount(undefined),10);assert.equal(clampQuestionCount(0),10);
  assert.equal(triviaSummaryLine(3,15),'3 משתתפים · 15 שאלות במשחק');
  const deck=newTriviaDeck(Array.from({length:20},(_,i)=>({question:`ש${i}`,answer:`ת${i}`})));
  for(const n of TRIVIA_QUESTION_COUNTS){const st=newTriviaState(deck,seeded(n),n);assert.equal(st.order.length,n);assert.equal(new Set(st.order).size,n,'no repeats')}
  assert.equal(newTriviaState(deck,seeded(1)).order.length,20,'the old call shape still plays the whole deck');assert.equal(newTriviaState(deck.slice(0,8),seeded(1),15).order.length,8,'a shorter deck simply has fewer questions');
  // server: Trivia asks for the chosen number
  assert.equal(clampCount(15,10,5,20),15);assert.equal(clampCount(99,10,5,20),20);assert.equal(clampCount(1,10,5,20),5);assert.equal(clampCount(undefined,10,5,20),10);
  assert(read('../src/game-content-client.js').includes("generateTrivia=({trip,items,history,count})=>generateContent('generate_trivia',{trip,items,history,count})"));
  // the built-in games
  const trivia=BUILTIN_GAMES.find(g=>g.id===TRIVIA_ID),bingo=BUILTIN_GAMES.find(g=>g.id==='game-airport-bingo'),others=BUILTIN_GAMES.filter(g=>['game-20-questions',REMIND_ME_ID].includes(g.id));
  assert.deepEqual(trivia.playerIds,[]);assert.equal(trivia.questionCount,10);assert.deepEqual(bingo.playerIds,[]);assert(bingo.questionCount===undefined&&bingo.roundsPerPlayer===undefined,'Bingo has no number option');assert(others.every(g=>g.playerIds===undefined),'20 שאלות and מזכיר לי are out of scope');
  // wiring: the shared rows and sub-page
  assert(app.includes('const gameSetupMin=game=>game.id===PANTOMIME_ID?2:1;')&&app.includes("if(game.id===TRIVIA_ID)rows.push(row('כמה שאלות במשחק'"),'Trivia gets a question-count row, Bingo only the participants row');
  const setup=fn('gameSetupView');assert(setup.includes("isTrivia?'משתתפים ושאלות':'משתתפים'")&&setup.includes('TRIVIA_QUESTION_COUNTS')&&setup.includes("'game-setup-count'")&&setup.includes('לכל משתתף לוח משלו')&&setup.includes('בחרו לפחות משתתף אחד.'),'the sub-page adapts: title, question chips, Bingo summary, minimum one');
  assert(setup.includes("startsGame?'שמירה והתחלה':'שמירה'")&&setup.includes('const startsGame=(isPantomime||isTrivia)&&(game.deck||[]).length>0;'),'Bingo only saves; Trivia / Pantomime with a deck start a fresh game');
  const saveH=app.slice(app.indexOf("else if(action==='game-setup-save')"),app.indexOf('save();render()}}',app.indexOf("else if(action==='game-setup-save')")));assert(saveH.includes('game.questionCount=clampQuestionCount(gameSetupDraft.count)')&&saveH.includes('newTriviaStateFor(game,game.deck)'),'saved on the game');
  assert(fn('triviaView').includes('setupEntryRows(game)')&&fn('bingoView').includes('setupEntryRows(game)'));
  assert(fn('gameView').indexOf('if(gameSetup===game.id)return gameSetupView(game);')>-1&&fn('gameView').indexOf('if(gameSetup===game.id)')<fn('gameView').indexOf('if(game.id===TRIVIA_ID)'),'the sub-page opens for every game, not only Pantomime');
  const play=fn('triviaPlayView');assert(play.includes('people=gamePlayers(state.participants,game.playerIds)')&&play.includes('triviaTally(ts.scores,gamePlayers(state.participants,game.playerIds))'),'only the chosen players answer and are tallied');
  assert(fn('buildTrivia').includes('count:clampQuestionCount(game.questionCount)')&&app.includes('const newTriviaStateFor=(game,deck)=>newTriviaState(deck,Math.random,clampQuestionCount(game.questionCount));'),'a build asks for the chosen number of questions');
  assert(app.includes('const bingoPlayers=game=>gamePlayers(state.participants,(game||bingoGame())?.playerIds);')&&fn('bingoCurrentParticipant').includes('bingoPlayers()')&&fn('bingoView').includes('const people=bingoPlayers(game)'),'only the chosen players have a board on screen');
  assert(!fn('remindMeView').includes('setupEntryRows'),'מזכיר לי has no participants choice');
});

test('(F3) only the Owner can delete a trip: the button is replaced by a note for an Editor, and the handler refuses BEFORE erasing anything (firestore.rules allows delete to the owner only)',()=>{
  const section=app.slice(app.indexOf('const isTripOwner='),app.indexOf('\n',app.indexOf('const deleteSection=')));
  assert(section.includes('state.trip?.ownerUid===currentUid()')&&section.includes("${isTripOwner()?")&&section.includes('רק בעל הטיול יכול למחוק אותו'),'an Editor sees a note, not the button');
  assert(section.indexOf('data-action="delete-current-trip"')<section.indexOf('רק בעל הטיול'),'the button is on the owner branch');
  const body=fn('resetCurrentTrip');
  assert(body.indexOf('if(removeTrip&&state.trip.ownerUid&&!isTripOwner())throw')>-1&&body.indexOf('!isTripOwner())throw')<body.indexOf('deleteTripCompletely(tripId)')&&body.indexOf('!isTripOwner())throw')<body.indexOf('clearAllTripContent(tripId)'),'refused before any deletion');
  assert(read('../firestore.rules').includes('allow delete: if isInvited() && isOwner(resource);'),'the rule the guard mirrors');
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
  assert(build.includes('generatePantomime({trip:state.trip,history:game.askedPhrases||[],count:')&&build.includes("live.askedPhrases=capHistory(live.askedPhrases,deck,undefined,['text'])")&&build.includes('live.pantomimeState=newPantomimeStateFor(live,deck)'),'full rebuild: history kept, deck and state reset');
  assert(build.indexOf('generatePantomime(')<build.indexOf('live.deck=deck'),'nothing is discarded before the new deck exists');
  // the three screens of a round
  const play=fn('pantomimePlayView');
  assert(play.includes("pantomimeStage==='away'")&&play.includes('מעבירים את הטלפון ל<bdi>${esc(actorName)}</bdi> — כל השאר, תביטו לכיוון אחר!')&&play.includes('data-action="pantomime-reveal"')&&play.includes('>הצג את הביטוי</button>'),'the look-away screen names the automatically picked actor; the phrase is NOT in it');
  const away=play.slice(play.indexOf("if(pantomimeStage==='away')"),play.indexOf("if(pantomimeStage==='reveal')"));assert(!away.includes('phrase.text'),'the phrase is hidden until the actor taps');
  assert(play.includes('נבחר/ה אוטומטית להציג')&&!play.includes('בחירת משתתף'),'the automatic pick is shown; there is no manual picker');
  const reveal=play.slice(play.indexOf("if(pantomimeStage==='reveal')"),play.indexOf('const guessers='));
  assert(reveal.includes('${esc(phrase.text)}')&&reveal.includes('data-action="pantomime-ready"')&&reveal.includes('הצגתי, עברו לניחוש')&&!/timer|setInterval|countdown/.test(play),'the private reveal; no round timer');
  assert(play.includes('data-action="pantomime-score"')&&play.includes('מי ניחש נכון?')&&play.includes('data-action="pantomime-skip"')&&play.includes('דילוג — לא ניחשו'),'tap who guessed, and the explicit דילוג button');
  assert(play.includes('person.id!==currentActorId'),'the actor cannot be marked as guessing their own phrase');
  assert(play.includes('data-action="pantomime-replay"')&&play.includes('class="btn ghost game-secondary" data-action="pantomime-build"'),'the end screen: שחקו שוב (no AI) and the real rebuild');
  // simulate a game with the pure pieces: reveal-and-score, skip, tally, winners
  const deck=newPantomimeDeck(Array.from({length:4},(_,i)=>({text:`ביטוי ${i}`})));let ps=newPantomimeState(deck,{activeIds:['a','b','c'],rounds:1,random:seeded(4)});ps={...ps,order:[0,1,2,3]};const game={deck};const people=[{id:'a',name:'אייל'},{id:'b',name:'דנה'},{id:'c',name:'נועה'}];
  const marks=[];const play1=(guessers,skip)=>{let marked=[];for(const g of guessers){const r=toggleCorrect(ps,marked,g);marked=r.marked;ps={...ps,scores:r.scores}}ps=pantomimeNext(ps);marks.push(skip?'skip':guessers.join('+'))};
  play1(['b']);play1(['b','c']);play1([],true);play1(['c']);
  game.pantomimeState=ps;assert(pantomimeFinished(game));assert.equal(pantomimePhrase(game),null);
  assert.deepEqual(ps.scores,{b:2,c:2},'two points each; the skipped round scored nobody');
  assert.deepEqual(triviaWinners(ps.scores,people),['דנה','נועה'],'a tie names every top scorer');
  const next=app.slice(app.indexOf("else if(action==='pantomime-next'"),app.indexOf("else if(action==='pantomime-replay')"));
  assert(next.includes("else if(action==='pantomime-next'||action==='pantomime-skip')pantomimeAdvance(button.dataset.id)"),'next and skip share one path');
  const adv=fn('pantomimeAdvance');
  assert(adv.includes('if(pantomimeFinished(game)){const winners=triviaWinners(game.pantomimeState.scores,pantomimePlayerList(game));if(winners.length)fireWinner(')&&adv.includes("caption:winners.length>1?'ניצחון משותף בסיבוב!':'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS"),'after the last phrase: the shared animation, the winner(s) named, TWICE');
  assert(adv.indexOf('save();render();')<adv.indexOf('fireWinner('),'drawn after the render');
  assert(!fn('pantomimePlayView').includes('fireWinner')&&!app.slice(app.indexOf("else if(action==='pantomime-replay')"),app.indexOf("else if(action==='pantomime-exit')")).includes('fireWinner'),'reopening or replaying never repeats it');
  const replay=app.slice(app.indexOf("else if(action==='pantomime-replay')"),app.indexOf("else if(action==='pantomime-exit')"));assert(replay.includes('newPantomimeStateFor(game,game.deck)')&&!replay.includes('generatePantomime')&&!replay.includes('buildPantomime'),'שחקו שוב never calls the AI');
  // the winner overlay itself, for the tie, twice
  const queue=[];const mounted=[];createWinnerPlayer({mount:h=>mounted.push(h),clear:()=>mounted.push('cleared'),schedule:f=>{queue.push(f);return queue.length},cancel:()=>{}}).play({name:'דנה · נועה',caption:'ניצחון משותף בסיבוב!',big:true,times:WINNER_REPEATS});
  queue.shift()();assert.equal(mounted.filter(h=>h!=='cleared').length,2);assert(mounted.every(h=>h==='cleared'||h.includes('<bdi>דנה · נועה</bdi>')));
});

test('(A) a brand-new id: pushed into every saved trip by the existing push-if-missing logic -- no backfill; a trip that already has it is untouched; Pantomime is not "בנסיעה"',()=>{
  const entry=BUILTIN_GAMES.find(game=>game.id===PANTOMIME_ID);
  assert(entry&&entry.interactive===true&&entry.title==='פנטומימה'&&entry.items==='ללא ציוד'&&entry.participants==='2 ומעלה'&&entry.duration==='20 דקות');
  assert.equal(entry.onTheGo,undefined,'needs everyone watching: not tagged "בנסיעה"');
  assert.deepEqual(entry.deck,[]);assert.deepEqual(entry.askedPhrases,[]);assert.deepEqual(entry.pantomimeState,{order:[],position:0,scores:{},actorOrder:[],rounds:2});assert.equal(entry.roundsPerPlayer,2);
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

test('(B) the new game pushes into saved trips with no backfill; the instructions are the PO\'s final text, verbatim (Test 9); it keeps the plain activity page (no interactive plumbing)',()=>{
  const entry=BUILTIN_GAMES.find(game=>game.id===REMIND_ME_ID);
  assert(entry);assert.equal(entry.title,'מזכיר לי');assert.equal(entry.onTheGo,true);assert.equal(entry.interactive,undefined,'no interactive flag: the chain is free-form, the app tracks nothing');
  assert.equal(entry.participants,'2 ומעלה');assert.equal(entry.duration,'לפי הצורך');assert.equal(entry.items,'ללא ציוד (למצב השירים: טלפון עם נגן מוזיקה)');
  assert(entry.instructions.startsWith('שני אופנים לשחק: (1) מילים — משתתף ראשון אומר מילה')&&entry.instructions.includes('(2) שירים — משתתף ראשון בוחר שיר ומשמיע אותו')&&entry.instructions.endsWith('או להמשיך להאזין עד הסוף.'));
  assert.deepEqual({mode:entry.remindMeMode,start:entry.smartStart,asked:entry.askedStarts},{mode:'',start:{word:'',song:{title:'',artist:''}},asked:{words:[],songs:[]}});
  const odSource=read('../src/operational-data.js');const bf=odSource.slice(odSource.indexOf('export function backfillBuiltinGames'),odSource.indexOf('const freshBuiltin='));assert(bf.split('game-remind-me').length===2&&bf.includes('OLD_REMIND_ME_INSTRUCTIONS'),'the only backfill is the one-time text swap');
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

// ---------------------------------------------------------------- (C) new-user onboarding

test('(C) the two-path screen appears ONLY for an account that has never had a trip; a returning user keeps the original screen',()=>{
  assert.equal(showsOnboarding({trip:null,myTripCount:0}),true,'first ever launch');
  assert.equal(showsOnboarding({trip:null,myTripCount:2}),false,'a returning user with trips (e.g. tapping a tab before opening one)');
  assert.equal(showsOnboarding({trip:{id:'t'},myTripCount:0}),false,'a trip is open (a returning user starting their 2nd trip has state.trip set by startNewTripFlow)');
  assert.equal(showsOnboarding({trip:{id:'t'},myTripCount:1}),false);assert.equal(showsOnboarding({trip:null,myTripCount:undefined}),false,'unknown is not "first time"');
  // wiring: empty() asks that one question; the original markup is still there for everyone else
  const empty=fn('empty');
  assert(empty.includes('if(showsOnboarding({trip:state.trip,myTripCount:myTrips.length}))return onboardingScreen();')&&empty.includes('מתחילים מטיול ריק')&&empty.includes('data-action="create">הוספה</button>'),'the original one-button screen is untouched');
  const startNew=fn('startNewTripFlow');assert(startNew.includes("ensureTrip({name:'טיול חדש'})"),'a returning user starting a new trip gets state.trip immediately -- they never reach the empty screen');
  assert(read('../src/onboarding.js').includes('!trip&&Number(myTripCount)===0'));
  // no new "has this user ever had a trip" flag was invented
  assert(!/hasEverHadTrip|firstTimeUser|isFirstTrip/.test(app));
});

test('(C) the screen: two equally weighted cards (upload the first document / add dates and destination), with the approved copy; a quick inline form; a דילוג button',()=>{
  const screen=fn('onboardingScreen');
  for(const text of ['ברוכים הבאים ל-FamilyTrips','איך תרצו להתחיל את הטיול הראשון שלכם?','העלאת המסמך הראשון','כרטיס טיסה, אישור הזמנה או כל מסמך אחר — נזין את הפרטים בשבילכם','הוספת תאריכים ויעד','בלי מסמך — קובעים מתי ולאן נוסעים, ומתחילים מכאן','אפשר גם להוסיף פריט ידנית או לסרוק קוד QR — זה נשאר בתוך אפשרות ההעלאה.'])assert(screen.includes(text),text);
  assert(screen.includes("choiceCard('create','upload','העלאת המסמך הראשון'")&&screen.includes("choiceCard('onboarding-form','calendar','הוספת תאריכים ויעד'"),'both through the SAME card component: equal weight');
  assert.equal((app.match(/const choiceCard=/g)||[]).length,1);
  for(const text of ['לאן נוסעים?','למשל: תאילנד','תאריך התחלה','תאריך סיום','אפשר לשנות או להוסיף יעדים נוספים בהמשך, מתוך הגדרות הטיול.','יצירת הטיול','דילוג — אעדכן בהמשך','חזרה לבחירה'])assert(screen.includes(text),text);
  assert(screen.includes('<input name="country" type="text" required')&&screen.includes('<input name="startDate" type="date">')&&screen.includes('<input name="endDate" type="date">'),'one destination, two dates, right on this screen');
  assert(screen.includes('<form id="onboarding-form"'),'inline: not a route to the יעדים / settings screens');
  assert.match(css,/\.choice-card\{display:flex;align-items:center;gap:12px;min-height:76px;/,'tall tap targets');assert.match(css,/\.onboarding-form input\{min-height:44px;/);
  assert.match(css,/\.choice-stack\{display:grid;grid-template-rows:1fr auto 1fr;/,'the two cards are always the same height (equally weighted)');
});

test('(C) the quick form: ensureTrip() is called with the date seed and the destination lands in destinationCountries (the field the יעדים form writes); dates are sanitized; a destination is required',()=>{
  assert.deepEqual(onboardingTripFrom({country:'  תאילנד ',startDate:'2026-12-20',endDate:'2027-01-03'}),{country:'תאילנד',seed:{name:'טיול לתאילנד',startDate:'2026-12-20',endDate:'2027-01-03'}});
  assert.deepEqual(onboardingTripFrom({country:'ספרד'}).seed,{name:'טיול לספרד',startDate:'',endDate:''},'dates are optional');
  assert.deepEqual(onboardingTripFrom({country:'יפן',startDate:'2026-13-45',endDate:'לא תאריך'}).seed,{name:'טיול ליפן',startDate:'',endDate:''},'not real calendar dates: dropped');
  assert.deepEqual(onboardingTripFrom({country:'איטליה',startDate:'2026-12-20',endDate:'2026-12-10'}).seed,{name:'טיול לאיטליה',startDate:'2026-12-20',endDate:'2026-12-20'},'an end before the start is pulled up to the start (the settings rule)');
  assert.deepEqual(onboardingTripFrom({country:'   ',startDate:'2026-12-20'}),{error:'missing_country'});assert.deepEqual(onboardingTripFrom({}),{error:'missing_country'});
  assert.deepEqual(sanitizeTripDates({startDate:'2026-12-20',endDate:'2027-01-03'}),{startDate:'2026-12-20',endDate:'2027-01-03'},'ensureTrip\'s existing seed support');
  const submit=app.slice(app.indexOf("else if(form.id==='onboarding-form')"),app.indexOf("else if(form.id==='destination-add-form')"));
  assert(submit.includes("onboardingTripFrom({country:data.get('country'),startDate:data.get('startDate'),endDate:data.get('endDate')})")&&submit.includes("if(made.error){notify('כתבו לאן נוסעים.');return}"),'a missing destination creates nothing');
  assert(submit.includes('ensureTrip(made.seed);state.trip.destinationCountries=[made.country];onboardingForm=false;save();render();'),'ensureTrip with the seed, the destination into the same field the יעדים form writes, then save');
  assert(app.includes("else if(form.id==='destination-add-form'){const country=String(data.get('country')||'').trim();if(country){state.trip.destinationCountries=[...(state.trip.destinationCountries||[]),country]"),'the יעדים form is untouched: same field');
  assert(app.includes("function ensureTrip(seed={}){if(!state.trip){const dates=sanitizeTripDates(seed);state.trip={id:uid('trip'),name:seed.name||"),'ensureTrip already takes the date seed (unchanged)');
});

test('(C) דילוג and the back arrow return to the two-choice screen creating NOTHING (also the answer for a form left partway); the document path is unchanged',()=>{
  assert(app.includes("else if(action==='onboarding-form'){onboardingForm=true;render()}")&&app.includes("else if(action==='onboarding-back'){onboardingForm=false;render()}"));
  const back=app.slice(app.indexOf("else if(action==='onboarding-back')"),app.indexOf("else if(action==='onboarding-back')")+80);assert(!/ensureTrip|save\(\)/.test(back),'going back neither creates a trip nor saves');
  const screen=fn('onboardingScreen');
  assert((screen.match(/data-action="onboarding-back"/g)||[]).length===2,'the back arrow AND "דילוג" both go back');
  assert(screen.includes('<button class="btn ghost game-secondary" type="button" data-action="onboarding-back">דילוג — אעדכן בהמשך</button>'),'דילוג is a ghost button, not a submit');
  // the upload path: the first card is today's "הוספה" action, untouched
  assert(app.includes("if(action==='create'){state.modal={type:'intake',source:'manual'};render()}"),'the existing intake modal (upload, QR or manual entry) opens exactly as before');
  assert(screen.includes("choiceCard('create','upload'"),'the first card IS that action -- nothing is pre-filled from the document, no behaviour change beyond being one of two options');
  assert(!/prefill|preFill|pre-fill/i.test(screen),'no pre-fill of dates / destination from the uploaded document');
  // a skipped form means the screen shows the choices again (state only)
  assert(screen.indexOf('if(onboardingForm)')<screen.indexOf('ברוכים הבאים ל-FamilyTrips'));
});

// ---------------------------------------------------------------- the sync-baseline bug found live on qa (Pantomime could not save to the cloud)

test('sync baseline: a built-in game that is NEW to a trip is created in Firestore on the next save (it used to look "already synced", so its first edit failed with "No document to update"); a game the normalizer removed is deleted',()=>{
  // what Firestore holds for a trip that predates 0.9.3: no Pantomime, no מזכיר לי, and still the old ציד תמונות
  const remote={games:[{id:'game-thailand-trivia',title:'טריוויה על היעד',interactive:true,favorite:false,deck:[],askedQuestions:[],triviaState:{order:[],position:0,scores:{}}},{id:'game-photo-hunt',title:'ציד תמונות',favorite:true},{id:'game-road-story',title:'סיפור בהמשכים',favorite:false}]};
  // the app loads it: mergeRemoteState shares the games ARRAY with the remote object, and the normalizer edits it in place
  const remoteGames=JSON.parse(JSON.stringify(remote.games));
  const state={...remote,trip:{id:'t'},items:[]};normalizeOperationalState(state);
  assert(state.games.some(game=>game.id===PANTOMIME_ID)&&state.games.some(game=>game.id===REMIND_ME_ID),'the normalizer pushed the two new games');assert(!state.games.some(game=>game.id==='game-photo-hunt'),'and removed the old one');
  assert(!remote.games.some(game=>game.id==='game-photo-hunt'),'(the in-place edit also changed the remote object -- which is why the remote list has to be captured BEFORE normalizing)');
  const baseline=syncBaseline({games:remoteGames},state);
  assert.deepEqual(baseline.games.map(game=>game.id).sort(),['game-photo-hunt','game-road-story','game-thailand-trivia'],'the baseline lists exactly what Firestore holds');
  // the user builds a Pantomime deck: the next save must CREATE the game (set), not update a document that does not exist
  const pantomime=state.games.find(game=>game.id===PANTOMIME_ID);pantomime.deck=[{id:'p1',text:'פיל שרוחץ בנהר'}];
  const diff=diffById(baseline.games,state.games);
  assert.deepEqual(diff.toCreate.map(game=>game.id).sort(),['game-20-questions','game-airport-bingo','game-pantomime','game-remind-me'],'every built-in that Firestore lacks (here also two this test trip never had) is created, with its full record');
  assert.equal(diff.toCreate.find(game=>game.id===PANTOMIME_ID).deck.length,1);
  assert.deepEqual(diff.toDelete,['game-photo-hunt'],'the folded-in game\'s document is deleted');
  assert.equal(diff.toUpdate.find(entry=>entry.id===PANTOMIME_ID),undefined,'NEVER an update of a document that was never created');
  // the OLD behaviour, to document the bug: a baseline cloned after normalizing makes the new game look synced
  const oldBaseline=JSON.parse(JSON.stringify(state));
  const edited=JSON.parse(JSON.stringify(state));edited.games.find(game=>game.id===PANTOMIME_ID).deck=[{id:'p2',text:'ב'}];
  assert(diffById(oldBaseline.games,edited.games).toUpdate.some(entry=>entry.id===PANTOMIME_ID),'(the old baseline produced exactly the failing update)');
  // a trip that already has every game: nothing is created or deleted, only real edits are diffed
  const full={games:BUILTIN_GAMES.map(game=>({...structuredClone(game),favorite:false}))};const fullRemote=JSON.parse(JSON.stringify(full.games));
  const fullState={...full,trip:{id:'t'},items:[]};normalizeOperationalState(fullState);
  const fullBaseline=syncBaseline({games:fullRemote},fullState);assert.deepEqual(diffById(fullBaseline.games,fullState.games),{toCreate:[],toUpdate:[],toDelete:[]},'no spurious writes on a trip that is already complete');
  fullState.games.find(game=>game.id==='game-road-story').favorite=true;
  assert.deepEqual(diffById(fullBaseline.games,fullState.games).toUpdate.map(entry=>entry.id),['game-road-story'],'a star is a plain update');
  // a trip with no game documents at all: every built-in is created
  const bare={games:[],trip:{id:'t'},items:[]};normalizeOperationalState(bare);
  assert.equal(diffById(syncBaseline({games:[]},bare).games,bare.games).toCreate.length,BUILTIN_GAMES.length);
  // wiring
  const merge=fn('mergeRemoteState');
  assert(merge.includes('const remoteGames=clone(remoteState.games||[]);')&&merge.indexOf('const remoteGames=')<merge.indexOf('normalizeOperationalState(state)'),'the remote games are captured before the normalizer edits them');
  assert(merge.includes('lastSyncedSnapshot=syncBaseline({games:remoteGames},state);')&&!merge.includes('lastSyncedSnapshot=clone(state)'),'the baseline is the remote games, not the normalized ones');
});

test('(A) Pantomime phrases carry NO place names (PO, 2026-10-23): the prompt forbids them with examples, the instruction repeats it, and a phrase naming the trip\'s own destination is dropped and refilled by the bounded top-up',async()=>{
  for(const required of ['NO PLACE NAMES','never write the name of a country, city, region, landmark, street, venue or any other named place','a name cannot be acted out and it gives the answer away','Describe the activity, animal, food or scene itself','The destination should show through WHAT is acted, never through a name',"Generic kinds of places and things ARE fine and welcome ('a floating market'",'only the PROPER name of a specific place or landmark is forbidden','a specific name is very hard to act out'])assert(pantomimeSystemPrompt.includes(required),required);
  assert(pantomimeInstruction({destinations:['ארגנטינה']},{count:12,exclude:[],topUp:false}).includes('No place names in any phrase.'),'repeated in the per-call instruction');
  // the hard rule for the one name we always know
  assert.equal(mentionsDestination('רוקדים טנגו בארגנטינה',['ארגנטינה']),true,'also with a Hebrew prefix glued on ("בארגנטינה")');
  assert.equal(mentionsDestination('רוקדים טנגו',['ארגנטינה']),false);assert.equal(mentionsDestination('מי אני בארגנטינה?!',['  ארגנטינה ']),true,'punctuation and spacing do not hide it');
  assert.equal(mentionsDestination('אוכלים פרוסה',['פו']),false,'a very short destination string is not used (it would match inside ordinary words)');assert.equal(mentionsDestination('כל ביטוי',[]),false);
  const accept=pantomimeAccept({destinations:['ארגנטינה','ספרד']});
  assert.equal(accept({text:'שוק בספרד'}),false);assert.equal(accept({text:'שוק צף'}),true);
  // end to end through the shared engine (AI mocked): phrases that name the destination never reach the deck; the top-up refills them; the exclusion list still goes out
  const payloads=[];
  const callModel=async request=>{payloads.push(request);return payloads.length===1?[{text:'רוקדים טנגו בארגנטינה'},{text:'אוכלים אמפנדה חמה'},{text:'שותים מאטה בארגנטינה'},...Array.from({length:9},(_,i)=>({text:`ביטוי ${i}`}))]:[{text:'מטפסים על סלע'},{text:'רוכבים על סוס'}]};
  const result=await generateWithRepeatGuard({callModel,history:[],count:12,fields:PANTOMIME_FIELDS,accept});
  assert.equal(result.items.length,12,'refilled to the full count');assert.equal(result.calls,2);assert.equal(payloads[1].count,2,'the top-up asked for exactly the two that were dropped');
  assert(!result.items.some(item=>item.text.includes('ארגנטינה')),'none names the destination');
  assert(result.items.some(item=>item.text==='אוכלים אמפנדה חמה'),'the clean ones are kept');
  // without a rule nothing changes for the other games (Trivia passes no accept)
  const trivia=await generateWithRepeatGuard({callModel:async()=>[{question:'ש',answer:'ת'}],history:[],count:1,fields:['question','answer']});assert.equal(trivia.items.length,1);
  const fnSource=read('../netlify/functions/game-content.mjs');
  assert(fnSource.includes('context:buildPantomimeContext,accept:pantomimeAccept,size:[6,40]}')&&fnSource.includes('accept:kind.accept?kind.accept(context):undefined'),'wired for Pantomime only');
  // P93-F1: generic foods / items only, never a specific named dish, product or speciality
  assert(pantomimeSystemPrompt.includes('GENERIC, NOT SPECIFIC')&&pantomimeSystemPrompt.includes("'cheese'")&&pantomimeSystemPrompt.includes("is NOT ('feta'"),'generic food is welcome, a specific named one is not');
  assert(!/accept:/.test(fnSource.slice(fnSource.indexOf('generate_trivia:{'),fnSource.indexOf('generate_pantomime:{'))),'Trivia is untouched');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.3 tests passed`);
