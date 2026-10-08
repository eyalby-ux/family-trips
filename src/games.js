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
