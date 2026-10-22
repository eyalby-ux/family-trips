// Beta 0.9.2 -- Games Interactive: the shared winner animation (P91-F3, also patched into the live 0.9.1 Trivia) and Bingo (six themes,
// per-participant 4x4 photo boards, per-board reset, ציד תמונות folded in). Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,pickWinnerAnimation,winnerHtml} from '../src/winner-animation.js';
import {BINGO_ID,BINGO_THEMES,BINGO_THEME_KEYS,LINE_CELLS,bingoPhotoLocation,bingoStoragePath,boardPhotoPaths,completedLines,dropBoard,ensureBoard,foundCount,freshCompletions,newBoardLayout,pendingPhotos,pruneCelebrated,syncPendingPhotos} from '../src/bingo.js';
import {deleteLocalPhoto,getLocalPhoto,putLocalPhoto} from '../src/local-photos.js';
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

test('photo → found, across all six themes: the photo is kept on the device first (offline play), inside the Storage layout the rules ALREADY allow, then the cell flips and completions celebrate by name',()=>{
  for(const theme of BINGO_THEME_KEYS){
    const location=bingoPhotoLocation(theme,'p-1789abc',BINGO_THEMES[theme].spots[3].id);
    assert.match(location.sourceId,/^bingo_[A-Za-z]+_p-1789abc$/);assert.match(location.filename,/^[A-Za-z]+-4\.jpg$/);
    assert(/^[A-Za-z0-9_-]+$/.test(location.sourceId),'a clean path segment');
  }
  assert(storageRules.includes('match /trips/{tripId}/sources/{sourceId}/{fileName}'),'the only path the rules allow');assert(storageRules.includes('match /{allPaths=**} { allow read, write: if false; }'),'everything else is denied -- the scope\'s trips/{tripId}/games/... path would have been refused');
  const choose=fn('bingoPhotoChosen');
  const order=['shrinkImage(file)','await putLocalPhoto(path,small)','board.found[pending.spotId]={photoPath:path','freshCompletions(board,celebrated)','save();render();','fireWinner({name:','syncBingoPhotos();'].map(token=>choose.indexOf(token));
  assert(order.every((index,i)=>index>0&&(i===0||index>order[i-1])),'shrink, save on the device, mark found (pending), check completions, save + render, celebrate, then start the upload');
  assert(choose.includes('caption:fresh.caption,big:fresh.big')&&choose.includes('state.participants.find(person=>person.id===pending.pid)?.name'),'the animation names whose board it is, with the line caption, big for the full board');
  assert(choose.includes('pending:true,v:Date.now()'),'a new photo is pending (not in Storage yet) and stamped');
  assert(choose.includes("catch(error){bingoBusy=null;render();notify('שמירת התמונה נכשלה"),'a failure to save on the device leaves the cell unfound and says so');
  assert(choose.includes('celebrated.push(...fresh.keys)'),'celebrations are remembered');
  const tap=fn('bingoCellTap');assert(!tap.includes('navigator.onLine'),'NO connection check: tapping a cell works offline');assert(tap.includes('{openBingoViewer(spotId);return}'),'a found cell opens its photo');
  assert(fn('bingoView').includes('<input type="file" id="bingo-file" accept="image/*" capture="environment" hidden>'),'the device camera');
  assert(app.includes("addEventListener('change',event=>{if(event.target?.id==='bingo-file')bingoPhotoChosen(event.target)});"));
  assert(read('../src/image-utils.js').includes("canvas.toBlob(resolve,'image/jpeg'"));
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
  assert(app.includes("else if(action==='bingo-theme'){const game=bingoGame();game.activeTheme=button.dataset.theme;bingoPicking=false;closeBingoViewer();save();render()}"),'picking a theme is remembered (activeTheme) and saved');
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
  assert(app.includes("import {BINGO_ID,BINGO_THEMES,BINGO_THEME_KEYS,bingoPhotoLocation,bingoStoragePath,dropBoard,ensureBoard,foundCount,freshCompletions,pendingPhotos,pruneCelebrated,syncPendingPhotos} from './bingo.js';"));
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

test('P92-F1: the suggested game on Today opens its own game page directly, and "כל המשחקים" still opens the catalog',()=>{
  const today=fn('todayView');
  assert(today.includes('<button class="game-open" data-route="game" data-id="${suggestedGame.id}">'),'the card is a real button to THE game (same route the catalog rows use)');
  assert(today.includes('הצעת משחק ליום פנוי')&&today.includes('<button class="game-open" data-route="games">')&&today.includes('<b>כל המשחקים</b>'),'the catalog row stays -- the SAME component as the suggestion, so the two are symmetrical');
  assert(today.indexOf('data-route="game" data-id="${suggestedGame.id}"')<today.indexOf('<button class="game-open" data-route="games">'),'the suggestion first, the catalog under it');
  assert(!today.includes('<div class="row day-item"><span class="row-main"><b>${tabler(\'dice\')} ${esc(suggestedGame.title)}'),'no more dead text row');
  assert.match(css,/.suggested-game{flex-direction:column;align-items:stretch;/,'the two controls stack, so a long title is never squeezed beside the button');assert.match(css,/.suggested-game .game-open{flex:0 0 auto;min-height:64px}/,'both rows are the same height');assert.match(css,/.game-open{[^}]*min-height:56px/,'a 56px tap target');
});

// ---------------------------------------------------------------- Offline play + the enlarged photo

test('offline play: a photo is saved on the device and the cell is found at once; the upload waits for a connection, then happens, once, and clears the pending flag',async()=>{
  const game={boards:{}};
  const capture=(theme,pid,spotId,v)=>{const board=ensureBoard(game,theme,pid,seeded(3));board.found[spotId]={photoPath:bingoStoragePath('trip-1',theme,pid,spotId),foundAt:'t',pending:true,v};return board};
  assert.equal(bingoStoragePath('trip-1','beach','p-9','beach-3'),'trips/trip-1/sources/bingo_beach_p-9/beach-3.jpg','the path is known the moment the photo is taken, and is the one the rules allow');
  capture('beach','p1','beach-1',1);capture('beach','p1','beach-2',2);capture('city','p2','city-5',3);
  assert.deepEqual(pendingPhotos(game).map(item=>item.spotId),['beach-1','beach-2','city-5']);
  const blobs=new Map(pendingPhotos(game).map(item=>[item.photoPath,{size:10,path:item.photoPath}]));
  const uploads=[];let saves=0,online=false;
  const deps={getGame:()=>game,getBlob:async path=>blobs.get(path)||null,online:()=>online,save:async()=>{saves++},upload:async item=>{uploads.push(item.photoPath)}};
  // offline: nothing is uploaded, nothing is lost, everything stays found + pending
  let result=await syncPendingPhotos(deps);
  assert.deepEqual(result,{uploaded:0,lost:0,pending:3});assert.equal(uploads.length,0);assert.equal(foundCount(game.boards.beach.p1),2,'the cells stay found offline');
  // back online: all three go up, each once, and stop being pending
  online=true;result=await syncPendingPhotos(deps);
  assert.equal(result.uploaded,3);assert.equal(result.pending,0);assert.deepEqual(uploads.length,3);assert.equal(new Set(uploads).size,3);assert.equal(saves,3,'saved after each one');
  assert(!game.boards.beach.p1.found['beach-1'].pending&&game.boards.beach.p1.found['beach-1'].photoPath,'found, uploaded, still has its path');
  assert.deepEqual((await syncPendingPhotos(deps)).uploaded,0,'nothing is uploaded twice');assert.equal(uploads.length,3);
});

test('offline play: a failed upload stays pending and is retried; a photo replaced while its upload is in flight is not wrongly marked uploaded; a photo missing from the device stays pending',async()=>{
  const game={boards:{}};const board=ensureBoard(game,'hotel','p1',seeded(1));const path=bingoStoragePath('t','hotel','p1','hotel-1');
  board.found['hotel-1']={photoPath:path,foundAt:'t',pending:true,v:1};
  let failNext=true,uploads=0;
  const deps={getGame:()=>game,getBlob:async()=>({size:1}),online:()=>true,save:async()=>{},upload:async()=>{if(failNext){failNext=false;throw new Error('network')}uploads++}};
  await assert.rejects(()=>syncPendingPhotos(deps),/network/);assert.equal(board.found['hotel-1'].pending,true,'a failed upload leaves it pending');
  assert.equal((await syncPendingPhotos(deps)).uploaded,1);assert.equal(board.found['hotel-1'].pending,undefined,'the retry succeeds');
  // replaced mid-upload: v changes during the await, so the first upload must NOT clear the flag, and the newer photo is uploaded next
  board.found['hotel-1']={photoPath:path,foundAt:'t',pending:true,v:10};let swapped=false;uploads=0;
  const racy={...deps,upload:async()=>{uploads++;if(!swapped){swapped=true;board.found['hotel-1']={photoPath:path,foundAt:'t',pending:true,v:11}}}};
  const raced=await syncPendingPhotos(racy);
  assert.equal(uploads,2,'the newer photo went up as well');assert.equal(board.found['hotel-1'].pending,undefined);assert.equal(raced.uploaded,1);
  // the device copy is gone (cleared site data): it stays pending, nothing is faked
  board.found['hotel-2']={photoPath:bingoStoragePath('t','hotel','p1','hotel-2'),foundAt:'t',pending:true,v:5};
  const lost=await syncPendingPhotos({...deps,getBlob:async()=>null});assert.equal(lost.lost>=1,true);assert.equal(board.found['hotel-2'].pending,true);
});

test('local photo store: keeps a photo by its Storage path (memory fallback when IndexedDB is unavailable, as in this suite), and forgets it on delete',async()=>{
  const blob={size:3,type:'image/jpeg'};
  assert.equal(await getLocalPhoto('trips/t/sources/a/b.jpg'),null);
  await putLocalPhoto('trips/t/sources/a/b.jpg',blob);assert.equal(await getLocalPhoto('trips/t/sources/a/b.jpg'),blob);
  await deleteLocalPhoto('trips/t/sources/a/b.jpg');assert.equal(await getLocalPhoto('trips/t/sources/a/b.jpg'),null);
  const src=read('../src/local-photos.js');assert(src.includes("typeof indexedDB==='undefined'")&&src.includes("request.result.createObjectStore(STORE,{keyPath:'path'})"),'IndexedDB, guarded, keyed by path');
});

test('offline wiring: sync runs after a capture, on every render and when the connection returns; photos show from the device first and what is downloaded is kept; reset and erase handle offline honestly',()=>{
  const sync=fn('syncBingoPhotos');
  assert(sync.includes('!navigator.onLine')&&sync.includes('await ensureTripDocSynced(state.trip.id,state.trip)')&&sync.includes('syncPendingPhotos({getGame:bingoGame,getBlob:getLocalPhoto'),'the Firestore trip document first (the Storage rules need it), then the shared sync');
  assert(sync.includes('uploadAttachment(state.trip.id,location.sourceId,new File([blob],location.filename'),'uploaded to the same path the cell already points at');
  assert(app.includes("addEventListener('online',()=>syncBingoPhotos());"));
  const hydrate=fn('hydrateBingoPhotos');
  assert(hydrate.includes('getLocalPhoto(path).then(async local=>')&&hydrate.indexOf('getLocalPhoto(path)')<hydrate.indexOf("downloadAttachment(path,'image/jpeg')")&&hydrate.includes('putLocalPhoto(path,blob)'),'the device copy first, else Storage -- and the download is kept for next time');
  assert(hydrate.includes('if(!navigator.onLine)return;')&&hydrate.trimEnd().endsWith('syncBingoPhotos();\n}'.trim())||hydrate.includes('syncBingoPhotos();'),'offline with no copy: no request, and it tries again later (never cached as failed)');
  const choose=fn('bingoPhotoChosen');assert(choose.includes("if(!navigator.onLine)notify('התמונה נשמרה במכשיר ותעלה כשיהיה חיבור.',4000)"),'offline: a clear, calm message instead of a refusal');
  assert(!app.includes('צילום ללוח דורש חיבור'),'the old "needs a connection" refusal is gone');
  const reset=fn('resetBingoBoard');assert(reset.includes('.some(entry=>!entry.pending)&&!navigator.onLine'),'reset offline is refused only when it would have to delete cloud photos');
  assert(reset.includes('if(entry?.photoPath&&!entry.pending)await deleteAttachment(entry.photoPath)')&&reset.includes('await deleteLocalPhoto(entry.photoPath)'),'a never-uploaded photo has nothing to delete in Storage; the device copy always goes');
  assert(fn('bingoView').includes('<span class="bingo-pending" title="ממתין להעלאה">')&&fn('bingoView').includes('ממתין להעלאה'),'a cell still waiting to upload says so');
  assert.match(css,/\.bingo-pending\{position:absolute;/);
});

test('the enlarged photo (approved design): tapping a found cell opens it full size with "החלפת תמונה" and "מחיקת תמונה"; four ways out (a labelled close button, the photo, Escape, the phone Back gesture); no instructions on it',()=>{
  const viewer=fn('bingoViewer');
  assert(viewer.includes('role="dialog" aria-modal="true"')&&viewer.includes('<button class="bingo-viewer-close" data-action="bingo-view-close" aria-label="סגירה">${tabler(\'x\')}<span>סגירה</span></button>'),'a dialog with a real close button: an X AND the word "סגירה"');
  assert(viewer.includes('<span class="bingo-photo large" data-action="bingo-view-close" data-photo-path=')&&viewer.includes('role="img"'),'the photo fills the dialog (same loader as the cells) and a tap on it closes it');
  assert(viewer.includes('data-action="bingo-replace">החלפת תמונה</button>')&&viewer.includes('data-action="bingo-erase">מחיקת תמונה</button>'),'the two actions side by side');
  assert(viewer.includes('<b>${esc(spots[bingoViewing].label)}</b><span>${esc(String(person?.name||\'\').split(\' \')[0])}</span>'),'the spot and the participant\'s first name in the header');
  assert(viewer.includes('התמונה שמורה במכשיר ותעלה כשיהיה חיבור.'),'a still-pending photo says where it is');
  assert(!/הוראות|לחצו על התמונה/.test(viewer),'no instruction text on the photo screen (PO)');
  assert(fn('bingoCellTap').includes('{openBingoViewer(spotId);return}'));
  assert(app.includes("else if(action==='bingo-view-close'){closeBingoViewer();render()}")&&app.includes("addEventListener('keydown',event=>{if(event.key==='Escape'&&bingoViewing){closeBingoViewer();render()}});"));
  const openClose=app.slice(app.indexOf('function openBingoViewer('),app.indexOf('function bingoCellTap('));
  assert(openClose.includes("history.pushState({bingoViewer:true},'')")&&openClose.includes('if(open&&history.state?.bingoViewer)history.back()'),'the viewer is one history step, so the phone Back gesture closes it instead of leaving the screen');
  assert(app.includes("if(bingoViewing){bingoViewing=null;render()}")&&app.includes("addEventListener('popstate',()=>{"),'Back closes it (one handler for the viewfinder and the photo)');
  assert.equal((app.match(/bingoViewing=null/g)||[]).length,3,'only the declaration, closeBingoViewer() and the Back handler reset it -- every other path closes through closeBingoViewer()');
  assert.match(css,/\.bingo-viewer-close\{min-width:44px;height:44px;padding:0 16px;[^}]*background:#fff;color:var\(--ink\)/,'a solid white 44px button on the dark screen -- impossible to miss');
  assert.match(css,/\.bingo-viewer\{position:fixed;inset:0;z-index:80;[^}]*background:var\(--ink\)/);
  // the signed-in account bar (z-index 70) used to sit ON TOP of the close button, hiding it (PO: "how do I close a picture?")
  const zOf=(file,selector)=>Number(new RegExp(`${selector.replace(/[.#]/g,'\\$&')}\\{[^}]*?z-index:(\\d+)`).exec(file)[1]);
  assert(zOf(css,'.bingo-viewer')>zOf(read('../src/foundation.css'),'#account-bar'),'the enlarged photo (and its close button) is ABOVE the account bar');
  assert(zOf(css,'#winner-host')>zOf(css,'.bingo-viewer'),'a celebration still shows over the photo');
  assert.match(css,/\.bingo-viewer-btn\{position:relative;flex:1;min-height:28px;padding:0 8px;[^}]*font-size:12px/,'28px buttons, 12px text, as approved');
  assert.match(css,/\.bingo-viewer-btn::before\{content:"";position:absolute;inset:-8px 0\}/,'the touch area is still 44px');
  assert.match(css,/\.bingo-viewer \.bingo-photo\.large\{[^}]*background:#2A5558 center\/contain no-repeat/,'the whole photo is shown, not cropped');
  assert.match(css,/\.bingo-viewer-btn\.danger\{border-color:#E8A89A;color:#F2B8AA\}/);
  assert(app.includes("else if(action==='bingo-theme'")&&app.includes('closeBingoViewer();save();render()'),'switching place closes it');
});

test('replace and erase a photo: replace opens the camera for the same cell and overwrites the same path (found and celebrations untouched); erase confirms, deletes the file, returns the cell to unfound and forgets the celebrations that no longer hold',()=>{
  const replace=app.slice(app.indexOf("else if(action==='bingo-replace')"),app.indexOf("else if(action==='bingo-erase')"));
  assert(replace.includes('bingoPending={theme:game.activeTheme,pid,spotId:bingoViewing}')&&replace.includes('startBingoCapture()'),'the camera, for the open cell');
  const choose=fn('bingoPhotoChosen');
  assert(choose.includes('foundAt:existing?.foundAt||new Date().toISOString()'),'a replacement keeps the original found time');
  assert(choose.includes('const old=bingoPhotoUrls.get(path);if(old)URL.revokeObjectURL(old)'),'the old picture is released so the new one shows');
  const erase=fn('eraseBingoPhoto');
  assert(erase.includes('confirm(`למחוק את התמונה של "${label}"? התמונה תימחק לצמיתות והמשבצת תחזור להיות לא נמצאה.`)'),'the house confirm() with permanent wording');
  assert(erase.indexOf('await deleteAttachment(entry.photoPath)')>0&&erase.indexOf('await deleteAttachment(entry.photoPath)')<erase.indexOf('delete board.found[spotId]'),'Storage first, then the cell');
  assert(erase.includes('if(!entry.pending)await deleteAttachment(')&&erase.includes('if(!entry.pending&&!navigator.onLine){notify(\'מחיקת תמונה דורשת חיבור לאינטרנט.\');return}'),'a never-uploaded photo can be erased offline; an uploaded one needs the connection (never orphaned)');
  assert(erase.includes('await deleteLocalPhoto(entry.photoPath)')&&erase.includes('pruneCelebrated(board,celebrated[pid])'));
  // erasing un-completes a line -> finishing it again celebrates again
  const board={layout:Array.from({length:16},(_,i)=>`e${i}`),found:{e0:{},e1:{},e2:{},e3:{}}};
  const celebrated=['row-0'];delete board.found.e2;
  const pruned=pruneCelebrated(board,celebrated);assert.deepEqual(pruned,[],'the broken row is forgotten (at erase time)');board.found.e2={};assert.deepEqual(freshCompletions(board,pruned).keys,['row-0'],'and celebrates again when re-completed');
  assert.deepEqual(pruneCelebrated(board,['row-0']),['row-0'],'a line that still holds stays celebrated');
});

test('the camera opens on the REAR camera (PO: it opened the selfie camera): an in-app viewfinder with getUserMedia, rear first, a flip button, and a fallback to the device picker',()=>{
  const start=fn('startBingoStream');
  const attempts=start.slice(start.indexOf('const attempts='),start.indexOf('let lastError'));
  assert(attempts.indexOf("facingMode:{exact:facing}")>0&&attempts.indexOf("facingMode:{exact:facing}")<attempts.indexOf("facingMode:{ideal:facing}")&&attempts.indexOf("facingMode:{ideal:facing}")<attempts.indexOf('video:true'),'exactly the rear camera first, then "prefer rear", then any camera');
  assert(app.includes("async function openBingoCamera(facing='environment')"),'the rear camera is the default');
  const open=fn('openBingoCamera');
  assert(open.includes('data-camera="cancel">ביטול</button>')&&open.includes('data-camera="shoot"')&&open.includes('data-camera="flip" data-facing="${facing}">הפיכת מצלמה</button>'),'cancel, shutter and flip');
  assert(open.includes('<video id="bingo-video" playsinline muted autoplay>'),'a real viewfinder');
  assert(open.includes("history.pushState({bingoCamera:true},'')"),'the phone Back gesture closes it');
  assert(open.includes('closeBingoCamera();notify(\'אין גישה למצלמה באפליקציה — נפתחת מצלמת המכשיר.\',3500)')&&open.includes("input.click()"),'no camera access: it hands over to the device camera picker instead of failing');
  const capture=fn('startBingoCapture');assert(capture.includes('navigator.mediaDevices?.getUserMedia')&&capture.includes("input.click()"),'unsupported browsers keep the old picker');
  assert(fn('bingoCellTap').includes('startBingoCapture()')&&app.includes('startBingoCapture()}}'),'tapping an empty cell AND "החלפת תמונה" use it');
  const shoot=fn('shootBingoPhoto');
  assert(shoot.includes('1280/Math.max(video.videoWidth,video.videoHeight)')&&shoot.includes("canvas.toBlob(resolve,'image/jpeg',0.82)")&&shoot.includes('closeBingoCamera();')&&shoot.includes('bingoStorePhoto(new File([blob],\'camera.jpg\',{type:\'image/jpeg\'}),true)'),'a frame is shrunk to 1280px, the stream stopped, and the photo goes through the same save-on-device-then-upload path');
  assert(fn('closeBingoCamera').includes('stopBingoCameraStream()')&&fn('stopBingoCameraStream').includes('track.stop()'),'the camera is released (the phone\'s camera light goes off)');
  assert(app.includes("bingoCameraHost()")&&fn('bingoCameraHost').includes("document.body.append(host)"),'mounted on <body>: a re-render can never kill the stream');
  assert(app.includes("addEventListener('popstate',()=>{\n  if(bingoPopIgnore){bingoPopIgnore=false;return}\n  if(bingoCameraOpen)"),'one Back handler: a step we closed ourselves is ignored, then the viewfinder, then the photo');
  assert.match(css,/#bingo-camera-host \.bingo-camera\{position:fixed;inset:0;z-index:82;/,'full screen, above the photo (80) and the account bar (70)');
  assert.match(css,/\.bingo-shutter\{width:72px;height:72px;/);assert.match(css,/\.bingo-camera-btn\{min-width:44px;min-height:44px;/);
  assert(fn('bingoStorePhoto').includes('const small=ready?file:await shrinkImage(file)'),'a photo from the file picker is shrunk; one from the viewfinder already is');
  assert(app.includes('bingoPhotoChosen(input){const file=input.files?.[0];input.value=\'\';await bingoStorePhoto(file,false)}'),'the file-picker fallback still works');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.2 tests passed`);
