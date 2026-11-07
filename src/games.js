// Beta 0.8 Phase 3 (design spec V7 S6): pure logic behind the games catalog -- the five filters, the favourite-first
// order and the game page's primary action. The DOM wiring lives in v5-app.js.
import {BUILTIN_GAMES} from './operational-data.js';

export const GAME_FILTERS=[['all','הכול'],['favorites','מועדפים'],['quick','10 דקות'],['onTheGo','בנסיעה'],['everyone','לכולם']];

// The first number in a duration text ("10–20 דקות" -> 10); null when the text carries none ("במהלך היום").
export function gameMinutes(duration){
  const match=String(duration||'').match(/\d+/);
  return match?Number(match[0]):null;
}
// "בנסיעה" is a property of the built-in game; a game stored before the field existed is looked up by id.
const onTheGo=game=>game.onTheGo??BUILTIN_GAMES.find(base=>base.id===game.id)?.onTheGo??false;

export function gameMatchesFilter(game,filter){
  if(filter==='favorites')return Boolean(game.favorite);
  if(filter==='quick'){const minutes=gameMinutes(game.duration);return minutes!==null&&/דקות/.test(game.duration)&&minutes<=10}
  if(filter==='onTheGo')return Boolean(onTheGo(game));
  if(filter==='everyone')return game.participants==='כל המשפחה';
  return true;
}
// Favourites first, otherwise the catalog's own order.
export function filterGames(games,filter='all'){
  const list=(Array.isArray(games)?games:[]).filter(game=>gameMatchesFilter(game,filter));
  return list.map((game,index)=>({game,index})).sort((left,right)=>Number(Boolean(right.game.favorite))-Number(Boolean(left.game.favorite))||left.index-right.index).map(entry=>entry.game);
}
// An interactive game runs in the app: "התחל משחק", then "המשך משחק" once started. Anything else is an activity.
export function gamePrimaryAction(game){
  if(game?.interactive)return game.started?'המשך משחק':'התחל משחק';
  return 'התחל פעילות';
}

// ---- Beta 0.9.1: Trivia -- an AI-built deck per trip, played reveal-and-self-judge (the app never grades an answer). ----
export const TRIVIA_ID='game-thailand-trivia';
export const HISTORY_CAP=60;
// Every question ever generated for the trip, newest last, capped at the 60 most recent (oldest dropped first).
// `fields` names what a history entry keeps -- Trivia's {question,answer} by default, Pantomime's {text}.
export const capHistory=(history,added,cap=HISTORY_CAP,fields=['question','answer'])=>[...(Array.isArray(history)?history:[]),...(Array.isArray(added)?added:[])].map(entry=>Object.fromEntries(fields.map(field=>[field,entry?.[field]]))).slice(-cap);
// "בנה טריוויה" needs a destination; without one the button stays visible but disabled, with a hint.
export const gameBuildGate=(trip,what)=>(trip?.destinationCountries||[]).length>0?{allowed:true,hint:''}:{allowed:false,hint:`הוסיפו יעד לטיול כדי לבנות ${what}`};
export const triviaBuildGate=trip=>gameBuildGate(trip,'טריוויה');
export const newTriviaDeck=questions=>(questions||[]).map((entry,index)=>({id:`q${index+1}`,question:String(entry.question).trim(),answer:String(entry.answer).trim(),explanation:String(entry.explanation??'').trim()})).filter(entry=>entry.question&&entry.answer);
// "קראו עוד": a Hebrew Wikipedia search for the answer -- always a working page, never a link the model made up.
export const readMoreUrl=answer=>`https://he.wikipedia.org/w/index.php?search=${encodeURIComponent(String(answer||'').trim())}`;
export function shuffleOrder(length,random=Math.random){
  const order=Array.from({length},(_,index)=>index);
  for(let index=order.length-1;index>0;index-=1){const other=Math.floor(random()*(index+1));[order[index],order[other]]=[order[other],order[index]]}
  return order;
}
// A fresh playthrough of the same deck: new order, back to the first question, nobody has points. Also what a rebuild resets to.
export const newTriviaState=(deck,random=Math.random)=>({order:shuffleOrder((deck||[]).length,random),position:0,scores:{}});
export const triviaFinished=game=>!(game.deck||[]).length||(game.triviaState?.position||0)>=(game.triviaState?.order||[]).length;
export const triviaQuestion=game=>triviaFinished(game)?null:game.deck[game.triviaState.order[game.triviaState.position]]||null;
// Tapping a participant's chip marks them as having answered this question; tapping again takes it back. `marked` is the
// current question's marked ids (kept by the caller, not persisted); returns the new marked list and scores.
export function toggleCorrect(triviaState,marked,participantId){
  const has=marked.includes(participantId),scores={...(triviaState.scores||{})};
  scores[participantId]=Math.max(0,(scores[participantId]||0)+(has?-1:1));
  return {marked:has?marked.filter(id=>id!==participantId):[...marked,participantId],scores};
}
export const triviaNext=triviaState=>({...triviaState,position:triviaState.position+1});
// Who won the ROUND (a full pass through the deck): everyone on the top score, if anyone scored at all. One entry = the winner; several = a shared win.
export const triviaWinners=(scores,participants)=>triviaTally(scores,participants).filter(row=>row.medal==='🥇').map(row=>row.name);
// High to low (ties keep the participants' own order); a medal for the top three ranks that scored, ties share one.
export function triviaTally(scores,participants){
  const list=(participants||[]).filter(person=>person.active!==false||(scores?.[person.id]||0)>0).map(person=>({id:person.id,name:person.name,score:scores?.[person.id]||0}));
  const sorted=list.map((entry,index)=>({entry,index})).sort((left,right)=>right.entry.score-left.entry.score||left.index-right.index).map(({entry})=>entry);
  return sorted.map(entry=>{const rank=sorted.filter(other=>other.score>entry.score).length;return {...entry,medal:entry.score>0&&rank<3?['🥇','🥈','🥉'][rank]:''}});
}

// ---- Beta 0.9.3: Pantomime -- the same generated-deck game as Trivia, plus a private "pass the phone" reveal and an automatically picked actor. ----
export const PANTOMIME_ID='game-pantomime';
export const newPantomimeDeck=phrases=>(phrases||[]).map((entry,index)=>({id:`p${index+1}`,text:String(entry.text??'').trim()})).filter(entry=>entry.text);
export const PANTOMIME_DEFAULT_ROUNDS=2,PANTOMIME_MAX_ROUNDS=5,PANTOMIME_MIN_PHRASES=12,PANTOMIME_MAX_PHRASES=40;
// The organiser picks 1-5 rounds per player; a playthrough is players x rounds turns (3 players x 2 rounds = 6 turns).
export const clampRounds=value=>Math.min(PANTOMIME_MAX_ROUNDS,Math.max(1,Math.round(Number(value))||PANTOMIME_DEFAULT_ROUNDS));
export const pantomimeTurns=(playerCount,rounds)=>Math.max(0,playerCount)*clampRounds(rounds);
// How many phrases a build asks for: enough for every turn, never fewer than the usual 12.
export const pantomimeBuildCount=(playerCount,rounds)=>Math.min(PANTOMIME_MAX_PHRASES,Math.max(PANTOMIME_MIN_PHRASES,pantomimeTurns(playerCount,rounds)));
export const emptyPantomimeState=()=>({order:[],position:0,scores:{},actorOrder:[],rounds:PANTOMIME_DEFAULT_ROUNDS});
// A fresh playthrough. The ONLY randomness in who acts is here: the players are put in a random order once (round 1 = a random one of all of them, round 2 = a random
// one of the rest, ...); after everyone has acted once the same order repeats. The turns are the first players x rounds phrases of a shuffled deck (fewer if the deck is shorter).
export function newPantomimeState(deck,{activeIds=[],rounds=PANTOMIME_DEFAULT_ROUNDS,random=Math.random}={}){
  const length=(deck||[]).length,turns=Math.min(length,pantomimeTurns(activeIds.length,rounds));
  return {...emptyPantomimeState(),order:shuffleOrder(length,random).slice(0,turns),actorOrder:shuffleOrder(activeIds.length,random).map(index=>activeIds[index]),rounds:clampRounds(rounds)};
}
export const pantomimeFinished=game=>!(game.deck||[]).length||(game.pantomimeState?.position||0)>=(game.pantomimeState?.order||[]).length;
export const pantomimePhrase=game=>pantomimeFinished(game)?null:game.deck[game.pantomimeState.order[game.pantomimeState.position]]||null;
// Who performs the open round: the saved order, cycled -- A B C A B C ... -- so closing and reopening the app can never change it. A participant who has left is skipped;
// a game saved before this rule (no order) falls back to the participants' own order.
export function pantomimeActor(state,activeIds){
  const active=activeIds||[],saved=(state?.actorOrder||[]).filter(id=>active.includes(id)),ids=saved.length?saved:active;
  return ids.length?ids[(state?.position||0)%ids.length]:'';
}
export const pantomimeNext=state=>({...state,position:state.position+1});
// Pantomime needs an actor and at least one guesser.
// P93-P4: who plays. game.playerIds = the participants the family picked for THIS game; [] means everybody active (so a participant added later joins in).
// Only active participants can play; if every picked participant has left, everybody active plays.
export const pantomimePlayers=(participants,playerIds)=>{const active=(participants||[]).filter(person=>person.active!==false),picked=Array.isArray(playerIds)?playerIds:[],chosen=picked.length?active.filter(person=>picked.includes(person.id)):active;return chosen.length?chosen:active};
// The agreed wording (PO): game / round = one phrase / turn = one player's turn. One round each reads "תור 1", more reads "N תורות" (PO, 2026-11-07).
export const pantomimeSummaryLine=(players,rounds)=>`${players} משתתפים × ${clampRounds(rounds)===1?'תור 1':clampRounds(rounds)+' תורות'} לכל משתתף = סה"כ ${pantomimeTurns(players,rounds)} סיבובים למשחק`;
export const pantomimePlayable=participants=>(participants||[]).filter(person=>person.active!==false).length>=2;

// ---- Beta 0.9.3: מזכיר לי -- an optional smart start; the chain itself stays free-form (the app tracks nothing). ----
export const REMIND_ME_ID='game-remind-me';
export const REMIND_ME_MODES=[['word','מילים'],['song','שירים']];
export const REMIND_ME_CAP=10;
export const emptyRemindMe=()=>({remindMeMode:'',smartStart:{word:'',song:{title:'',artist:''}},askedStarts:{words:[],songs:[]}});
// What the game page shows for a mode: the cached suggestion, or nothing (an explicit tap -- never a silent AI call -- is needed to get one).
export function remindMeSuggestion(game,mode){
  const start=game?.smartStart||{};
  if(mode==='word')return start.word?{word:start.word}:null;
  return start.song?.title&&start.song?.artist?{song:{title:start.song.title,artist:start.song.artist}}:null;
}
// Picking a mode (or switching back to one): a suggestion that already exists is shown again for free; only a mode with none needs a (quota) call.
export const chooseRemindMeMode=(game,mode)=>({mode,needsCall:!remindMeSuggestion(game,mode)});
// The history sent with a call: only this mode's, the 10 most recent.
export const remindMeHistory=(game,mode)=>mode==='song'?(game?.askedStarts?.songs||[]).slice(-REMIND_ME_CAP):(game?.askedStarts?.words||[]).slice(-REMIND_ME_CAP);
// A generated suggestion writes ONLY its own mode's sub-field and appends to ONLY that mode's history (capped at 10, oldest dropped); the other mode is untouched.
export function applyRemindMeResult(game,mode,result){
  const start=game.smartStart||emptyRemindMe().smartStart,asked=game.askedStarts||emptyRemindMe().askedStarts;
  if(mode==='song'){const song={title:result.song.title,artist:result.song.artist};return {smartStart:{...start,song},askedStarts:{...asked,songs:[...(asked.songs||[]),song].slice(-REMIND_ME_CAP)}}}
  return {smartStart:{...start,word:result.word},askedStarts:{...asked,words:[...(asked.words||[]),result.word].slice(-REMIND_ME_CAP)}};
}
