// Beta 0.9.2 -- Games Interactive: the shared winner animation (P91-F3, also patched into the live 0.9.1 Trivia) and Bingo (six themes,
// per-participant 4x4 photo boards, per-board reset, ציד תמונות folded in). Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,pickWinnerAnimation,winnerHtml} from '../src/winner-animation.js';
import {BINGO_ID,BINGO_THEMES,BINGO_THEME_KEYS,LINE_CELLS,bingoPhotoLocation,boardPhotoPaths,completedLines,dropBoard,ensureBoard,foundCount,freshCompletions,newBoardLayout} from '../src/bingo.js';
import {BUILTIN_GAMES,backfillBuiltinGames,normalizeOperationalState} from '../src/operational-data.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),pkg=JSON.parse(read('../package.json')),cloud=read('../src/cloud-store.js'),storageRules=read('../storage.rules');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647};

test('winner animation: four directions, picked at random -- every direction can come up and none is hard-wired',()=>{
  assert.deepEqual(WINNER_ANIMATIONS,['confetti','stars','medal','burst']);
  assert.equal(pickWinnerAnimation(()=>0),'confetti');assert.equal(pickWinnerAnimation(()=>0.3),'stars');assert.equal(pickWinnerAnimation(()=>0.6),'medal');assert.equal(pickWinnerAnimation(()=>0.99),'burst');assert.equal(pickWinnerAnimation(()=>1),'burst','never out of range');
  const random=seeded(11),seen=new Set();for(let i=0;i<200;i++)seen.add(pickWinnerAnimation(random));
  assert.equal(seen.size,4,'a run of rounds shows all four');
  const kinds=new Set(Array.from({length:40},(_,i)=>winnerHtml({name:'אייל'},seeded(i*104729+17)).match(/data-animation="(\w+)"/)[1]));
  assert(kinds.size>=3,'winnerHtml itself picks at random when no direction is forced');
});

test('winner animation: the winner\'s NAME is in the middle of every direction, escaped, in its own isolate; the caption is optional; a bigger one lasts longer',()=>{
  for(const animation of WINNER_ANIMATIONS){
    const html=winnerHtml({name:'פאולה כהן',caption:'שורה הושלמה!',animation});
    assert(html.includes(`class="winner-overlay ${animation}"`)&&html.includes(`data-animation="${animation}"`),animation);
    assert(html.includes('<b class="winner-name"><bdi>פאולה כהן</bdi></b>')&&html.includes('<span class="winner-caption">שורה הושלמה!</span>'),'the name and the caption are in the card');
    assert(html.indexOf('winner-fx')<html.indexOf('winner-card'),'the moving layer sits behind the named card');
    assert(html.includes('role="status"')&&html.includes('aria-live="polite"'),'announced to screen readers');
    assert(html.includes('class="winner-fx" aria-hidden="true"'),'decoration hidden from them');
  }
  assert(!winnerHtml({name:'x',animation:'medal'}).includes('winner-caption'),'no caption, no empty span');
  const evil=winnerHtml({name:'<img src=x onerror=alert(1)>',animation:'stars'});
  assert(!evil.includes('<img')&&evil.includes('&lt;img'),'a name can never inject markup');
  assert(winnerHtml({name:'a',animation:'confetti',big:true}).includes('winner-overlay confetti big')&&winnerHtml({name:'a',animation:'confetti',big:true}).includes(`--total:${WINNER_MS.big/1000}s`));
  assert(WINNER_MS.big>WINNER_MS.normal);assert(winnerHtml({name:'a',animation:'burst'}).includes(`--total:${WINNER_MS.normal/1000}s`));
  // each direction draws its own thing, and a bigger one draws more
  assert((winnerHtml({name:'a',animation:'confetti'},seeded(1)).match(/<i /g)||[]).length>=20);
  assert((winnerHtml({name:'a',animation:'stars'},seeded(1)).match(/class="star"/g)||[]).length>=10);
  assert(winnerHtml({name:'a',animation:'medal'}).includes('class="medal"'));
  assert((winnerHtml({name:'a',animation:'burst'}).match(/class="ray"/g)||[]).length>=10);
  assert((winnerHtml({name:'a',animation:'confetti',big:true},seeded(1)).match(/<i /g)||[]).length>(winnerHtml({name:'a',animation:'confetti'},seeded(1)).match(/<i /g)||[]).length);
});

test('winner animation: reduced motion keeps only the card; it never blocks a tap; it is mounted outside #app so render() cannot wipe it; it removes itself',()=>{
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.winner-fx\{display:none\}\.winner-overlay\{animation:none\}\}/);
  assert.match(css,/#winner-host\{position:fixed;inset:0;[^}]*pointer-events:none\}/);
  const fire=fn('fireWinner');
  assert(fire.includes("document.querySelector('#winner-host')")&&fire.includes('document.body.append(host)'),'a host on <body>, not inside #app');
  assert(fire.includes('winnerHtml({name,caption,big},random)')&&fire.includes('clearTimeout(winnerTimer)')&&fire.includes("host.innerHTML=''"),'one at a time, and it clears itself');
  assert(fire.includes('big?WINNER_MS.big:WINNER_MS.normal'));
  for(const kind of ['fall','drop','pulse','ray'])assert(css.includes(`@keyframes winner-${kind}`),kind);
});

test('P91-F3 patch to the live 0.9.1 Trivia: scoring a point fires the shared animation naming that participant; taking the point back does not; scoring logic is untouched',()=>{
  const handler=app.slice(app.indexOf("else if(action==='trivia-score')"),app.indexOf("else if(action==='trivia-next')"));
  assert(handler.includes('wasMarked=triviaMarked.includes(button.dataset.participant)')&&handler.includes('if(!wasMarked)'),'only a newly given point celebrates');
  assert(handler.includes('fireWinner({name:winner.name})'),'the participant\'s own name');
  assert(handler.includes('toggleCorrect(game.triviaState,triviaMarked,button.dataset.participant)')&&handler.includes('game.triviaState={...game.triviaState,scores:result.scores};save();render();'),'the 0.9.1 scoring lines are unchanged');
  assert(handler.indexOf('save();render();')<handler.indexOf('fireWinner('),'drawn after the re-render, so it is not wiped');
  assert(app.includes("import {WINNER_MS,winnerHtml} from './winner-animation.js';"));
});

// ---------------------------------------------------------------- Bingo

test('Bingo content: six themes of 16 distinct spots each (the four reviewed pools + בדרכים / מסעדות from ציד תמונות), every icon exists in the app\'s set',()=>{
  assert.deepEqual(BINGO_THEME_KEYS,['airport','beach','city','hotel','onTheRoad','restaurant']);
  const ids=new Set();
  for(const key of BINGO_THEME_KEYS){
    const theme=BINGO_THEMES[key];
    assert.equal(theme.spots.length,16,key);assert.equal(new Set(theme.spots.map(spot=>spot.label)).size,16,`${key}: no duplicate label`);
    for(const spot of theme.spots){assert(spot.label.trim()&&!ids.has(spot.id),spot.id);ids.add(spot.id);assert(spot.id.startsWith(`${key}-`))}
    assert(theme.label&&theme.inLabel.startsWith('ב'),key);
    assert(new RegExp(`\\n  ${theme.icon}:'`).test(app.slice(app.indexOf('const TABLER={'),app.indexOf('const tabler=name=>'))),`${key}: icon "${theme.icon}" is in TABLER`);
  }
  assert.equal(ids.size,96);
  // the PO-reviewed replacements are in, the removed ones are not
  const labels=BINGO_THEME_KEYS.flatMap(key=>BINGO_THEMES[key].spots.map(spot=>spot.label));
  assert(labels.includes('טביעות רגליים בחול')&&labels.includes('שלט קבלה'));assert(!labels.includes('ילד בונה משהו בחול')&&!labels.includes('צוות קבלה'),'no photographing a non-consenting person');
  assert.equal(BINGO_THEMES.onTheRoad.label,'בדרכים');assert.equal(BINGO_THEMES.restaurant.label,'מסעדות');
});

test('Bingo boards: each participant gets their own shuffled 4x4 per theme, created lazily, found state strictly per participant',()=>{
  const random=seeded(5),a=newBoardLayout('beach',random),b=newBoardLayout('beach',random);
  assert.equal(a.length,16);assert.deepEqual([...a].sort(),BINGO_THEMES.beach.spots.map(spot=>spot.id).sort(),'a permutation of the theme\'s 16');
  assert.notDeepEqual(a,b,'two participants do not share an arrangement');
  const game={};
  assert.equal(game.boards,undefined);
  const dana=ensureBoard(game,'airport','p1',seeded(9));
  assert.deepEqual(Object.keys(game.boards),['airport'],'only the opened theme exists, nothing pre-generated');assert.deepEqual(Object.keys(game.boards.airport),['p1']);
  assert.equal(ensureBoard(game,'airport','p1'),dana,'opening it again returns the same board');
  dana.found['airport-1']={photoPath:'x',foundAt:'t'};
  const eyal=ensureBoard(game,'airport','p2',seeded(21));
  assert.deepEqual(eyal.found,{},'the same real-world object found by Dana is not found for Eyal');
  assert.notDeepEqual(eyal.layout,dana.layout);
  ensureBoard(game,'beach','p1');assert.deepEqual(game.boards.airport.p1.found,{'airport-1':{photoPath:'x',foundAt:'t'}},'another theme never touches this one');
  // a damaged board is replaced, a good one is kept
  game.boards.airport.p3={layout:['only-one']};assert.equal(ensureBoard(game,'airport','p3').layout.length,16);
});

test('Bingo lines: rows, columns and the full board only (no diagonals); each completion fires once -- the celebrated list stops a re-render replaying it',()=>{
  assert.equal(Object.keys(LINE_CELLS).length,9,'4 rows + 4 columns + the board');assert.deepEqual(LINE_CELLS['row-1'],[4,5,6,7]);assert.deepEqual(LINE_CELLS['col-2'],[2,6,10,14]);
  const board={layout:Array.from({length:16},(_,i)=>`s${i}`),found:{}};const photo=id=>{board.found[id]={photoPath:id,foundAt:'t'}};
  [0,1,2].forEach(i=>photo(`s${i}`));assert.deepEqual(completedLines(board),[]);
  photo('s3');assert.deepEqual(completedLines(board),['row-0']);
  const celebrated=[];let fresh=freshCompletions(board,celebrated);
  assert.deepEqual(fresh,{keys:['row-0'],caption:'שורה הושלמה!',big:false});celebrated.push(...fresh.keys);
  assert.deepEqual(freshCompletions(board,celebrated).keys,[],'a re-render / reopening never replays it');
  // a photo that finishes a row AND a column at once is ONE announcement
  ['s5','s9','s13','s4','s6','s7'].forEach(photo);
  // col-1 = s1,s5,s9,s13 done; row-1 = s4,s5,s6,s7 done
  fresh=freshCompletions(board,celebrated);assert.deepEqual(fresh.keys.sort(),['col-1','row-1']);assert.equal(fresh.caption,'שורה ועמודה הושלמו!');celebrated.push(...fresh.keys);
  // diagonal alone is nothing
  const diag={layout:board.layout,found:Object.fromEntries([0,5,10,15].map(i=>[`s${i}`,{photoPath:'x'}]))};assert.deepEqual(completedLines(diag),[],'no diagonals');
  // the full board is the big one and the only real endpoint
  board.layout.forEach(photo);
  fresh=freshCompletions(board,celebrated);assert.equal(fresh.big,true);assert.equal(fresh.caption,'הלוח הושלם!');assert(fresh.keys.includes('board'));
  celebrated.push(...fresh.keys);assert.deepEqual(freshCompletions(board,celebrated),{keys:[],caption:'',big:false});
  assert.equal(foundCount(board),16);
  // one photo at a time over a whole board: every line celebrates exactly once, the board last
  const walk={layout:Array.from({length:16},(_,i)=>`w${i}`),found:{}},done=[];let fired=0;
  walk.layout.forEach(id=>{walk.found[id]={photoPath:id};const f=freshCompletions(walk,done);if(f.keys.length){fired++;done.push(...f.keys)}});
  assert.equal(done.length,9);assert.equal(new Set(done).size,9);assert.equal(done.at(-1),'board'.length?done.at(-1):'');assert(done.includes('board'));assert(fired<=9);
});

test('photo → found, across all six themes: the photo is uploaded inside the Storage layout the rules ALREADY allow, then the cell flips, completions celebrate by name; a failed upload marks nothing',()=>{
  for(const theme of BINGO_THEME_KEYS){
    const location=bingoPhotoLocation(theme,'p-1789abc',BINGO_THEMES[theme].spots[3].id);
    assert.match(location.sourceId,/^bingo_[A-Za-z]+_p-1789abc$/);assert.match(location.filename,/^[A-Za-z]+-4\.jpg$/);
    assert(/^[A-Za-z0-9_-]+$/.test(location.sourceId),'a clean path segment');
  }
  assert(storageRules.includes('match /trips/{tripId}/sources/{sourceId}/{fileName}'),'the only path the rules allow');assert(storageRules.includes('match /{allPaths=**} { allow read, write: if false; }'),'everything else is denied -- the scope\'s trips/{tripId}/games/... path would have been refused');
  const choose=fn('bingoPhotoChosen');
  const order=['shrinkImage(file)','uploadAttachment(state.trip.id,location.sourceId','board.found[pending.spotId]={photoPath:path','freshCompletions(board,celebrated)','save();render();','fireWinner({name:'].map(token=>choose.indexOf(token));
  assert(order.every((index,i)=>index>0&&(i===0||index>order[i-1])),'shrink, upload, then mark found, then check completions, then save + render, then celebrate');
  assert(choose.includes('caption:fresh.caption,big:fresh.big')&&choose.includes('state.participants.find(person=>person.id===pending.pid)?.name'),'the animation names whose board it is, with the line caption, big for the full board');
  assert(choose.indexOf('uploadAttachment(')<choose.indexOf('board.found[pending.spotId]'),'nothing is marked found before the upload succeeded');
  assert(choose.includes("catch(error){bingoBusy=null;render();notify('העלאת התמונה נכשלה"),'a failure leaves the cell unfound and says so');
  assert(choose.includes('celebrated.push(...fresh.keys)'),'celebrations are remembered');
  const tap=fn('bingoCellTap');assert(tap.includes('navigator.onLine')&&tap.includes('found[spotId])return'),'offline and already-found taps do nothing');
  assert(fn('bingoView').includes('<input type="file" id="bingo-file" accept="image/*" capture="environment" hidden>'),'the device camera');
  assert(app.includes("addEventListener('change',event=>{if(event.target?.id==='bingo-file')bingoPhotoChosen(event.target)});"));
  assert(read('../src/image-utils.js').includes("canvas.toBlob(resolve,'image/jpeg'")&&choose.includes('new File([small],location.filename'));
});

test('photo display: the cell shows the REAL photo through downloadAttachment() (getBytes) -- getDownloadURL is never used (the already-fixed CORS bug)',()=>{
  const appCode=app.split(/\r?\n/).filter(line=>!line.trim().startsWith('//')).join(' ');
  assert(!/getDownloadURL/.test(appCode),'v5-app.js never calls getDownloadURL (comments aside)');
  assert(!/getDownloadURL/.test(read('../src/bingo.js'))&&!/getDownloadURL/.test(read('../src/game-content-client.js')));
  const hydrate=fn('hydrateBingoPhotos');
  assert(hydrate.includes("downloadAttachment(path,'image/jpeg')")&&hydrate.includes('URL.createObjectURL(blob)')&&hydrate.includes("element.style.backgroundImage=`url(\"${url}\")`"));
  const download=cloud.slice(cloud.indexOf('export async function downloadAttachment('),cloud.indexOf('export async function deleteAttachment('));
  assert(download.includes('await getBytes(reference)')&&!download.includes('getDownloadURL('),'and downloadAttachment itself is getBytes');
  assert(fn('bingoView').includes('<span class="bingo-photo" data-photo-path='),'a found cell is the photo, not a checkmark alone');
  assert(app.includes('fitActionRows();hydrateBingoPhotos();'),'photos are filled in after every render');
  assert(hydrate.includes('bingoFailed')&&hydrate.includes("classList.add('missing')"),'a photo that cannot load never retries forever');
  assert.match(css,/\.bingo-photo\{position:absolute;inset:0;border-radius:8px;background:var\(--teal-soft\) center\/cover no-repeat\}/);
  assert.match(css,/\.bingo-cell\{position:relative;aspect-ratio:1;/,'a square when the label fits; it grows rather than clips (no overflow:hidden on the cell)');
  assert(!/\.bingo-cell\{[^}]*overflow:hidden/.test(css));
});

test('reset: ONE (theme, participant) board -- Storage photos deleted first, then the board and its celebrations dropped; the next open is freshly shuffled',()=>{
  const game={boards:{airport:{p1:{layout:newBoardLayout('airport',seeded(2)),found:{'airport-1':{photoPath:'trips/t/sources/bingo_airport_p1/airport-1.jpg'},'airport-2':{photoPath:'trips/t/sources/bingo_airport_p1/airport-2.jpg'}}},p2:ensureBoard({},'airport','p2')},beach:{p1:{layout:newBoardLayout('beach'),found:{'beach-1':{photoPath:'b'}}}}},celebratedLines:{airport:{p1:['row-0'],p2:['col-1']},beach:{p1:['row-2']}}};
  const old=game.boards.airport.p1.layout;
  assert.deepEqual(boardPhotoPaths(game.boards.airport.p1),['trips/t/sources/bingo_airport_p1/airport-1.jpg','trips/t/sources/bingo_airport_p1/airport-2.jpg']);
  dropBoard(game,'airport','p1');
  assert.equal(game.boards.airport.p1,undefined);assert.equal(game.celebratedLines.airport.p1,undefined);
  assert(game.boards.airport.p2&&game.boards.beach.p1&&game.celebratedLines.airport.p2&&game.celebratedLines.beach.p1,'another participant and another theme are untouched');
  const fresh=ensureBoard(game,'airport','p1',seeded(77));assert.deepEqual(fresh.found,{});assert.notDeepEqual(fresh.layout,old,'a new arrangement');
  const reset=fn('resetBingoBoard');
  assert(reset.includes('confirm(`לאפס את הלוח של ${person.name} ${theme.inLabel}? כל התמונות שצולמו יימחקו לצמיתות.`)'),'the house confirm() with the specific, permanent wording');
  assert(reset.indexOf('await deleteAttachment(entry.photoPath)')>0&&reset.indexOf('await deleteAttachment(entry.photoPath)')<reset.indexOf('dropBoard(game,game.activeTheme,pid)'),'Storage first, then the board');
  assert(reset.includes('delete board.found[spotId]')&&reset.includes("catch(error){save();render();notify('מחיקת התמונות נכשלה"),'a failure part-way never orphans files: what is still stored stays on the board');
  assert(reset.includes('URL.revokeObjectURL(url)'));
  assert(fn('bingoView').includes('data-action="bingo-reset">${tabler(\'refresh\')} איפוס הלוח</button>')&&!app.includes('bingo-reset-all'),'a control on the board itself; no reset-everything action');
  assert(cloud.includes("const games=await getDocs(subRef(tripId,'games'));")&&cloud.includes('if(entry?.photoPath)await deleteAttachment(entry.photoPath)'),'"delete trip data" / "delete trip" also remove every Bingo photo (they have no sources record)');
});

test('the picker and the board screen: six tiles, the last theme remembered, a visible switch, the participant carousel reused with its own selection',()=>{
  const view=fn('bingoView');
  assert(view.includes('BINGO_THEME_KEYS.map(key=>`<button class="bingo-tile${key===game.activeTheme?\' on\':\'\'}" data-action="bingo-theme" data-theme="${key}">'),'one tile per theme');
  assert(view.includes('if(bingoPicking||!theme)'),'the picker shows first time (no activeTheme) or on request');
  assert(app.includes("else if(action==='bingo-theme'){const game=bingoGame();game.activeTheme=button.dataset.theme;bingoPicking=false;save();render()}"),'picking a theme is remembered (activeTheme) and saved');
  assert(app.includes("else if(action==='game-start'&&button.dataset.id===BINGO_ID){const game=bingoGame();game.started=true;gamePlaying=BINGO_ID;bingoPicking=!BINGO_THEMES[game.activeTheme];save();render()}"),'reopening goes straight to the remembered theme\'s board');
  assert(view.includes('data-action="bingo-switch">')&&view.includes('החלפת מקום'),'a visible, non-destructive way to switch');
  assert(view.includes("participantCarousel(people.map(person=>[person.id,person.name]),selected,'bingo-participant','bingo')"),'the existing carousel, as is');
  assert(fn('participantCarousel').includes('data-carousel data-scope="${scope}"')&&fn('selectParticipant').includes("const scope=carousel?.dataset.scope||'packing';"));
  assert(fn('commitParticipant').includes("if(scope==='bingo')bingoParticipant=value;else state.packingParticipantView=value;"),'Bingo\'s participant never changes Packing\'s view');
  assert(app.includes("else if(action==='bingo-participant')selectParticipant(button.closest('[data-carousel]'),button.dataset.participant);"));
  assert(view.includes('people.filter')||view.includes("state.participants.filter(person=>person.active!==false)"),'only active participants');
  assert(view.includes("emptyState('users','אין עדיין משתתפים'"),'no participants: a clear empty state');
  assert(app.includes('if(game.id===BINGO_ID)return bingoView(game);'));
  assert.match(css,/\.bingo-board\{display:grid;grid-template-columns:repeat\(4,1fr\);gap:6px\}/);assert.match(css,/\.bingo-label\{font-size:11px;/,'11px labels, not the mockup\'s 8.5px');
});

test('migration (the big one): an existing-by-id trip\'s old Bingo is OVERWRITTEN with six-key themes, never merged; ציד תמונות is removed from saved state, with no star carried over',()=>{
  const OLD={id:'game-airport-bingo',title:'בינגו שדה תעופה',instructions:'חפשו מזוודה אדומה, מטוס, מדים, מסוע, לוח המראות ושער עלייה.',items:'פתק או טלפון',participants:'2 ומעלה',duration:'15 דקות',favorite:true,started:true,spots:[{id:'old1',label:'מזוודה אדומה'}],bingoState:{found:['old1']}};
  const HUNT={id:'game-photo-hunt',onTheGo:true,title:'ציד תמונות',favorite:true};
  const state={games:[{...OLD},{...HUNT},{id:'game-road-story',title:'סיפור בהמשכים',favorite:false}],trip:{id:'t1'},items:[]};
  const before=JSON.parse(JSON.stringify(state.games.find(game=>game.id===BINGO_ID)));
  normalizeOperationalState(state);
  const after=state.games.find(game=>game.id===BINGO_ID);
  console.log('  bingo before:',JSON.stringify(before).slice(0,230));
  console.log('  bingo after: ',JSON.stringify({...after,themes:Object.fromEntries(Object.entries(after.themes).map(([k,t])=>[k,t.spots.length]))}));
  console.log('  game ids after:',JSON.stringify(state.games.map(game=>game.id)));
  assert(before.spots&&before.bingoState,'the old fields were there');
  assert.equal(after.spots,undefined);assert.equal(after.bingoState,undefined,'the old fields are gone, not merged');
  assert.deepEqual(Object.keys(after.themes),BINGO_THEME_KEYS);for(const key of BINGO_THEME_KEYS)assert.equal(after.themes[key].spots.length,16);
  assert.equal(after.interactive,true);assert.equal(after.title,'בינגו לפי מקום');assert.equal(after.id,BINGO_ID);assert.equal(after.items,'טלפון עם מצלמה');assert(!/מזוודה אדומה/.test(after.instructions));
  assert.deepEqual(after.boards,{});assert.deepEqual(after.celebratedLines,{});assert.equal(after.activeTheme,'');
  assert.equal(after.favorite,true,'Bingo\'s own star is kept');assert.equal(after.started,true);
  assert(!state.games.some(game=>game.id==='game-photo-hunt'),'ציד תמונות is actually removed from the saved games, not just hidden');
  assert.equal(state.games.filter(game=>game.favorite).length,1,'its star went with it: nothing else got starred');
  assert.equal(after.favorite,true);assert.equal(state.games.find(game=>game.id==='game-20-questions')?.favorite,false);
  assert(!BUILTIN_GAMES.some(game=>game.id==='game-photo-hunt'),'and new trips never get it');
  assert.equal(state.games.length,BUILTIN_GAMES.length,'five games');
  // photo-hunt starred but Bingo not: Bingo must NOT inherit the star
  const noStar=normalizeOperationalState({games:[{id:'game-airport-bingo',favorite:false},{id:'game-photo-hunt',favorite:true}],trip:{id:'t'},items:[]});
  assert.equal(noStar.games.find(game=>game.id===BINGO_ID).favorite,false,'no favourite carryover (unlike מי אני → 20 שאלות)');
  // idempotent; played boards, the last theme and a family\'s own text survive; a bad activeTheme is cleared
  const played=JSON.parse(JSON.stringify(after));played.boards={beach:{p1:{layout:newBoardLayout('beach'),found:{'beach-2':{photoPath:'x',foundAt:'t'}}}}};played.celebratedLines={beach:{p1:['row-0']}};played.activeTheme='beach';played.instructions='משלנו';
  backfillBuiltinGames([played,{id:'game-photo-hunt'}]);
  assert.equal(played.activeTheme,'beach');assert.equal(played.boards.beach.p1.found['beach-2'].photoPath,'x');assert.deepEqual(played.celebratedLines.beach.p1,['row-0']);assert.equal(played.instructions,'משלנו');
  const odd=backfillBuiltinGames([{id:BINGO_ID,activeTheme:'moon',boards:[],celebratedLines:null}])[0];assert.equal(odd.activeTheme,'');assert.deepEqual(odd.boards,{});assert.deepEqual(odd.celebratedLines,{});
  // a brand-new trip and each trip\'s own copies
  const fresh=normalizeOperationalState({trip:{id:'t2'},items:[]}),game=fresh.games.find(candidate=>candidate.id===BINGO_ID);
  assert.equal(Object.keys(game.themes).length,6);game.boards.beach={p1:{}};game.themes.beach.spots.pop();
  assert.deepEqual(BUILTIN_GAMES.find(candidate=>candidate.id===BINGO_ID).boards,{},'the built-in definition is never shared between trips');assert.equal(BINGO_THEMES.beach.spots.length,16);
});

test('the shared winner animation fires on Bingo completions (and only the first time) and is the ONLY celebration: no bespoke highlight sweep any more',()=>{
  const choose=fn('bingoPhotoChosen');
  assert(choose.includes('if(fresh.keys.length)fireWinner('),'only when a line or the board is newly complete');
  assert(!/line-sweep|highlight-sweep|row-win|bingo-sweep/.test(css+app),'the superseded highlight-sweep design was not built');
  assert(app.includes("import {BINGO_ID,BINGO_THEMES,BINGO_THEME_KEYS,bingoPhotoLocation,dropBoard,ensureBoard,foundCount,freshCompletions} from './bingo.js';"));
  assert(pkg.scripts.test.includes('tests/beta-0-9-2.mjs'));assert(pkg.version.startsWith('0.9.2'));
  const fired=[];
  // the exact data the firing receives, from the pure layer: who + which caption + how big
  const board={layout:Array.from({length:16},(_,i)=>`z${i}`),found:{z0:{},z1:{},z2:{},z3:{}}};
  const fresh=freshCompletions(board,[]);fired.push({name:'דניאל',caption:fresh.caption,big:fresh.big});
  const html=winnerHtml({name:fired[0].name,caption:fired[0].caption,big:fired[0].big},seeded(4));
  assert(html.includes('<bdi>דניאל</bdi>')&&html.includes('שורה הושלמה!')&&!html.includes(' big'),'a row: the participant\'s name and the row caption, the normal size');
  const all=Object.fromEntries(board.layout.map(id=>[id,{}]));
  const full=freshCompletions({layout:board.layout,found:all},['row-0']);assert.equal(full.big,true);
  assert(winnerHtml({name:'דניאל',caption:full.caption,big:full.big},seeded(4)).includes('הלוח הושלם!'));
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.2 tests passed`);
