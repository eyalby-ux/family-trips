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
export const capHistory=(history,added,cap=HISTORY_CAP)=>[...(Array.isArray(history)?history:[]),...(Array.isArray(added)?added:[])].map(({question,answer})=>({question,answer})).slice(-cap);
// "בנה טריוויה" needs a destination; without one the button stays visible but disabled, with a hint.
export const triviaBuildGate=trip=>(trip?.destinationCountries||[]).length>0?{allowed:true,hint:''}:{allowed:false,hint:'הוסיפו יעד לטיול כדי לבנות טריוויה'};
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
// High to low (ties keep the participants' own order); a medal for the top three ranks that scored, ties share one.
export function triviaTally(scores,participants){
  const list=(participants||[]).filter(person=>person.active!==false||(scores?.[person.id]||0)>0).map(person=>({id:person.id,name:person.name,score:scores?.[person.id]||0}));
  const sorted=list.map((entry,index)=>({entry,index})).sort((left,right)=>right.entry.score-left.entry.score||left.index-right.index).map(({entry})=>entry);
  return sorted.map(entry=>{const rank=sorted.filter(other=>other.score>entry.score).length;return {...entry,medal:entry.score>0&&rank<3?['🥇','🥈','🥉'][rank]:''}});
}
