// Beta 0.8 Phase 3: games, Shopping, P12-F3 / P12-F7, P23-F1 / F2, the empty / loading / offline states, and the S9 contrast bar.
// Pure logic runs for real; v5-app.js wiring is asserted from source (it needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BUILTIN_GAMES,filterShoppingItems,isSharedShoppingItem,isTaskOverdue,participantAssignments} from '../src/operational-data.js';
import {GAME_FILTERS,filterGames,gameMatchesFilter,gameMinutes,gamePrimaryAction} from '../src/games.js';
import {syncStripText} from '../src/ui-states.js';
import {canDeleteSource,suggestionsAfterSourceDelete} from '../src/import-status.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};

test('P23-F1: a category page puts the back arrow, the type icon and the title on one line',()=>{
  const back=fn('backRow');
  assert(back.includes("title?`<h2 class=\"detail-title\">${title}</h2>`:''")&&back.includes("' with-title'"),'the title is inside the same detail-top row');
  assert(app.includes("${backRow('center','',`<button class=\"btn ghost small-btn add-type\" data-action=\"create\" aria-label=\"הוספת ${esc(ITEM_TYPES[state.category]?.label||'')}\">${tabler('plus')}<span class=\"btn-label\">${ITEM_TYPES[state.category]?.label||''}</span></button>`,`${typeIcon(state.category)} ${ITEM_TYPE_PLURALS[state.category]||ITEM_TYPES[state.category]?.label||''}`)}"));
  assert(!app.includes("${backRow('center')}<h2>${typeIcon(state.category)}"),'no separate <h2> row below the arrow any more');
  assert.match(css,/\.detail-top\.with-title\{justify-content:flex-start;/);
  assert.match(css,/\.detail-top\.with-title \.detail-title\{[^}]*min-width:0/,'a long title can shrink instead of pushing the row');
});

test('P23-F2: only an OPEN task whose shown date has passed is overdue; a done task never is',()=>{
  const when='2026-10-08';
  assert.equal(isTaskOverdue({dueDate:'2026-10-07',mode:'date'},when),true);
  assert.equal(isTaskOverdue({dueDate:'2026-10-08',mode:'date'},when),false,'due today is not overdue');
  assert.equal(isTaskOverdue({dueDate:'2026-10-09'},when),false);
  assert.equal(isTaskOverdue({dueDate:'2020-01-01',done:true},when),false,'a done task is never highlighted, however old its date');
  assert.equal(isTaskOverdue({dueDate:'2020-01-01',mode:'entire'},when),false,'a task shown as "for the whole trip" has no shown date');
  assert.equal(isTaskOverdue({dueDate:'2020-01-01',mode:'none'},when),false);
  assert.equal(isTaskOverdue({title:'x'},when),false);assert.equal(isTaskOverdue(null,when),false);
  const row=app.slice(app.indexOf('function taskRow('),app.indexOf('\n',app.indexOf('function taskRow(')));
  assert(row.includes('const overdue=isTaskOverdue(task);')&&row.includes("${overdue?'overdue':''}")&&row.includes('באיחור'));
  assert.match(css,/\.task-compact\.overdue\{background:var\(--accent-soft\);border-color:var\(--accent\)\}/);
  assert.match(css,/\.overdue-flag\{[^}]*color:var\(--ink\)/,'the words stay --ink: --accent on white is under 4.5:1');
});

test('P22-F9: the owner and place filters combine; "הכול" is everything; the count is visible',()=>{
  const items=[{id:1,owner:'shared',placeId:'a'},{id:2,owner:'',placeId:''},{id:3,owner:'פאולה',placeId:'a'},{id:4,owner:'פאולה',placeId:'b'},{id:5,owner:'דניאל'}];
  const ids=filters=>filterShoppingItems(items,filters).map(item=>item.id);
  assert.deepEqual(ids({}),[1,2,3,4,5]);assert.deepEqual(ids({owner:'all',place:'all'}),[1,2,3,4,5]);
  assert.deepEqual(ids({owner:'shared'}),[1,2],'"משותף" is an empty owner or "shared"');
  assert.deepEqual(ids({owner:'פאולה'}),[3,4]);
  assert.deepEqual(ids({place:'a'}),[1,3]);
  assert.deepEqual(ids({place:'none'}),[2,5],'"ללא מקום"');
  assert.deepEqual(ids({owner:'פאולה',place:'a'}),[3],'combined with AND');
  assert.deepEqual(ids({owner:'דניאל',place:'a'}),[]);
  assert.equal(isSharedShoppingItem({owner:'shared'}),true);assert.equal(isSharedShoppingItem({owner:'פאולה'}),false);
  const view=fn('shoppingFilters');
  assert(view.includes("option('all','הכול',filters.owner)")&&view.includes("option('shared','משותף',filters.owner)")&&view.includes("option('all','הכול',filters.place)")&&view.includes("option('none','ללא מקום',filters.place)"));
  assert(view.includes("filter(participant=>participant.active!==false)"),'owners: active participants only');
  assert(view.includes('מתוך ${total} פריטים')&&view.includes('aria-live="polite"'),'a visible, announced match count');
  assert(app.includes("else if(event.target.id==='shopping-filter-owner'){state.shoppingFilters={...state.shoppingFilters,owner:event.target.value};render()}"));
  assert(app.includes("else if(event.target.id==='shopping-filter-place'){state.shoppingFilters={...state.shoppingFilters,place:event.target.value};render()}"));
});

test('P2-F8 / P21-F7: Shopping has no emoji, quiet place rows, identical section headers, Packing-style rows',()=>{
  const view=fn('shoppingView');
  assert(!/[🛒📍🎲]/u.test(app.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n')),'no emoji anywhere in the app code');
  assert(view.includes('<div class="page-head"><h2>קניות</h2></div>'));
  assert(view.includes("shoppingHead('מקומות קניות','shopping-place-add','מקום חדש')")&&view.includes("shoppingHead('רשימת קניות','shopping-add','פריט חדש')"));
  assert(app.includes('const shoppingHead=(title,action,label)=>`<div class="section-head shop-head"><h3>${title}</h3><button class="btn ghost small-btn" data-action="${action}">${tabler(\'plus\')} ${label}</button></div>`;'),'one helper -> the same size, the same outline "+"');
  const place=fn('shoppingPlaceRow');
  assert(place.includes("tabler('store')")&&place.includes("tabler('pin')")&&!place.includes('class="badge"'),'a line icon, no type badge');
  const row=fn('shoppingRow');
  assert(row.includes('<span class="row-line"><b>')&&row.includes('badge chip-participants')&&row.includes('data-action="shopping-edit"'),'checkbox + name + owner chip on one line, tap to edit');
  assert(!row.includes('shopping-delete'),'delete lives inside the edit screen');
});

test('P12-F3: a participant with any assignment cannot be deleted; an unassigned one needs a named confirmation',()=>{
  const state={participants:[{id:'p1',name:'פאולה'},{id:'p2',name:'דניאל'},{id:'p3',name:'עמית'}],
    sources:[{participantIds:['p1']}],items:[{participantIds:['p1','p2']}],tasks:[{participantIds:['p2']}],
    packing:[{items:[{participantIds:['p2']},{participantIds:[]}]}],shopping:[{owner:'עמית'},{owner:'shared'}]};
  assert.deepEqual(participantAssignments(state,'p1'),{documents:1,items:1,tasks:0,packing:0,shopping:0,total:2});
  assert.equal(participantAssignments(state,'p2').total,3,'item + task + packing item');
  assert.equal(participantAssignments(state,'p3').total,1,'a shopping item they own counts');
  assert.equal(participantAssignments({participants:[{id:'p9',name:'x'}]},'p9').total,0);
  assert.equal(participantAssignments({participants:[{id:'p9',name:'x'}],tasks:[{participantScope:'all'}]},'p9').total,0,'"everyone" names nobody');
  const row=fn('participantRow');
  assert(row.includes('participantAssignments(state,participant.id).total'));
  // Phase 3.1 (P3-F7): the reason lives in the participant's own row (status line); the blocked bin's name also points to deactivation.
  assert(row.includes('disabled aria-disabled="true"')&&row.includes('לא ניתן למחוק (')&&row.includes('אפשר להשבית את המשתתף במקום'),'a visibly disabled button + the reason pointing to deactivation');
  assert(row.includes('data-action="participant-delete-ask"')&&row.includes('data-action="participant-delete"')&&row.includes('למחוק את <b>${esc(participant.name)}</b> לצמיתות'),'two steps; the second names the participant');
  assert(app.includes("else if(action==='participant-delete-ask'){participantDeleteArmed=button.dataset.id;render()}"));
  assert(app.includes('if(!participant||participantAssignments(state,participant.id).total){render();return}'),'re-checked at the moment of deleting');
  assert(app.includes('notify(`המשתתף ${participant.name} נמחק`)'),'a transient success notification');
  assert(app.includes('function route(view,options={}){triviaPlaying=null;extraOpenFor=null;participantDeleteArmed=null;'),'an open confirmation never survives navigation');
});

test('P12-F7: any source that is not confirmed ticket coverage and not already Failed can be deleted',()=>{
  assert.equal(canDeleteSource({id:'s',processingState:'proposal_ready'},null),true,'needs review / partial / rejected');
  assert.equal(canDeleteSource({id:'s',processingState:'saved_only'},'queued'),true);
  assert.equal(canDeleteSource({id:'s',kind:'link'},null),true);
  assert.equal(canDeleteSource({id:'s',ticketConfirmed:true},null),false,'confirmed ticket coverage is excluded');
  assert.equal(canDeleteSource({id:'s',processingState:'failed'},'failed'),false,'Failed keeps the delete inside its own pill');
  assert.equal(canDeleteSource(null),false);
  const suggestions=[{id:1,status:'pending',sourceId:'s'},{id:2,status:'deferred',sourceIds:['s']},{id:3,status:'pending',sourceIds:['s','t']},{id:4,status:'accepted',sourceId:'s'},{id:5,status:'pending',sourceId:'t'}];
  assert.deepEqual(suggestionsAfterSourceDelete(suggestions,'s').map(item=>item.id),[3,4,5],'open proposals from ONLY this source go; merged and accepted ones stay');
  const row=fn('sourceRow');
  assert(row.includes("canDeleteSource(source,stateName)?`<button class=\"btn danger\" data-action=\"source-delete\" data-id=\"${source.id}\">מחק</button>`:''"));
  assert(app.includes("canDeleteSource(source,'')?menuButton('source-delete',source,'מחק'):''"),'the ticket slide menu');
  // 0.8.2: a Failed row's "מחק" moved from the pill into the menu, so the item page's menu offers delete whenever the source is not a confirmed ticket (see beta-0-8-2.mjs).
  assert(app.includes("canDeleteSource(source,'')?menuButton('source-delete',source,'מחק'):''"),'the other-document row menu');
  const handler=app.slice(app.indexOf("else if(action==='source-delete')"),app.indexOf('notify(\'המקור נמחק\')'));
  assert(handler.includes('confirm(')&&handler.includes('suggestionsAfterSourceDelete(state.suggestions,source.id)'),'the same single confirmation as the Failed delete');
});

test('S6: the games catalog -- five filters, favourites first, a uniform game page, the right primary action',()=>{
  assert.deepEqual(GAME_FILTERS.map(([,label])=>label),['הכול','מועדפים','10 דקות','בנסיעה','לכולם']);
  const games=BUILTIN_GAMES.map((game,index)=>({...game,favorite:index===2}));
  const titles=filter=>filterGames(games,filter).map(game=>game.id);
  assert.equal(titles('all').length,games.length);assert.equal(titles('all')[0],'game-airport-bingo','favourites first');
  assert.deepEqual(titles('favorites'),['game-airport-bingo']);
  assert(titles('quick').every(id=>gameMinutes(games.find(game=>game.id===id).duration)<=10)&&titles('quick').includes('game-who-am-i'),'"10 דקות": a first number of 10 or less');
  assert(!titles('quick').includes('game-photo-hunt'),'"במהלך היום" has no minutes');
  assert(titles('onTheGo').includes('game-road-story')&&!titles('onTheGo').includes('game-airport-bingo'));
  assert(titles('everyone').every(id=>games.find(game=>game.id===id).participants==='כל המשפחה'));
  assert.equal(gameMatchesFilter({id:'game-road-story',favorite:false,duration:'15 דקות',participants:'x'},'onTheGo'),true,'a game saved before the field existed is looked up by id');
  assert.equal(gameMinutes('10–20 דקות'),10);assert.equal(gameMinutes('במהלך היום'),null);
  assert.equal(gamePrimaryAction({interactive:true}),'התחל משחק');assert.equal(gamePrimaryAction({interactive:true,started:true}),'המשך משחק');
  assert.equal(gamePrimaryAction({id:'x'}),'התחל פעילות','a non-interactive activity');
  const row=fn('gameRow');
  assert(row.includes('class="game-open"')&&row.includes('data-route="game"')&&row.includes('class="game-star ')&&row.includes('aria-pressed=')&&row.includes('data-action="game-favorite"'),'the star is its own button, not inside the row button');
  assert(row.indexOf('</button><button class="game-star')>0,'the two buttons are siblings');
  assert.match(css,/\.game-row\{display:flex;align-items:center;gap:8px\}/,'8px between the row and the star');
  assert.match(css,/\.game-open\{[^}]*min-height:56px/);assert.match(css,/\.game-star\{[^}]*width:44px;height:44px/);
  assert.match(css,/\.filter-chip\.active\{background:var\(--ink\)[^}]*color:#fff/);assert.match(css,/\.filter-chip\{[^}]*border:1px solid var\(--border\)/);
  assert(fn('gameView').includes('gamePrimaryAction(game)')&&fn('gameView').includes("backRow('games'"));
  assert(app.includes("game:gameView,")&&app.includes("'games','game','tasks'"),'the game page is routed and keeps Trip Center active');
  assert(!app.includes('Games / Activities'),'no English UI copy');
});

test('S7: the offline strip counts waiting changes, uses the soft accent, and is gone once synced',()=>{
  assert.deepEqual(syncStripText({online:false,pending:2}),{icon:'wifioff',text:'אופליין — 2 שינויים ימתינו לסנכרון'});
  assert.equal(syncStripText({online:false,pending:1}).text,'אופליין — שינוי אחד ימתין לסנכרון');
  assert.equal(syncStripText({online:false,pending:0}).text,'אופליין — המידע המקומי זמין');
  assert.equal(syncStripText({online:true,pending:3}).text,'3 שינויים ממתינים לסנכרון');
  assert.equal(syncStripText({online:true,pending:0}),null,'no success message');
  assert.match(css,/\.offline\{display:flex;[^}]*background:var\(--accent-soft\);color:var\(--ink\)/);
});

test('S7: empty states are an icon + headline + line; loading content is a skeleton, not a spinner; no English headings remain',()=>{
  assert(app.includes("const emptyState=(icon,headline,line='',action='')=>`<div class=\"empty-state\">${tabler(icon)}<h3>${headline}</h3>"));
  assert.match(css,/\.empty-state \.ti\{[^}]*color:var\(--muted\)/);assert.match(css,/\.empty-state h3\{[^}]*color:var\(--ink\)/);
  for(const view of ['tasksView','shoppingView','locationsView','tlDayView','center','participantsSection','destinationsSection','gamesView'])assert(fn(view).includes('emptyState('),`${view} uses the empty state`);
  assert(app.includes('const skeletonList=')&&app.includes('!adminInvitationsLoaded?skeletonList()')&&app.includes('adminInvitationsLoaded=true;render()'),'the admin list shows a skeleton until it first answers');
  assert.match(css,/\.skeleton\{[^}]*border:1px solid var\(--border\)[^}]*background:var\(--surface\)[^}]*animation:skeleton-pulse/);
  assert.match(css,/prefers-reduced-motion:reduce\)\{\.skeleton\{animation:none\}/);
  const code=app.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n');
  for(const english of ['<h2>Timeline</h2>','<h3>Calendar</h3>','<h2>Trip Center</h2>','Games / Activities'])assert(!code.includes(english),english);
  assert(!code.includes('✕</button>')&&code.includes("${tabler('x')}</button>"),'the dialog close is a line icon, not a text glyph');
  const nav=fn('timelineCalendar');
  assert(nav.includes("tabler(name).replace('class=\"ti\"','class=\"ti icon-directional\"')")&&nav.includes("arrow(-1,'chevleft')")&&!nav.includes('>הקודם<')&&!nav.includes('>הבא<'),'the period arrows are mirrored icons');
});

test('P22-F10 (follow-up): a long chosen file name can never widen the file box past its dialog',()=>{
  assert.match(css,/\.file-drop\{position:relative;min-width:0;max-width:100%/);
  assert.match(css,/\.file-field\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('Settings on the tokens: a screen title, section-scale titles; Tasks has the Packing/Shopping header',()=>{
  const settings=fn('settingsHome'); // Phase 3.2 (P31-F1): the home list
  assert(settings.includes('<div class="settings-page"><h2 class="screen-title">הגדרות</h2>')&&settings.includes('</div>`;'),'the page is titled');
  assert.match(css,/\.settings-page \.card>h2\{font-size:22px;font-weight:600/,'sections at the 22px section scale');
  const tasks=fn('tasksView');
  assert(tasks.includes('<div class="page-head"><h2>משימות</h2><button class="btn ghost small-btn" data-action="task-add">'),'the Tasks header is the Packing/Shopping header');
  assert.match(css,/\.task-filters,\.shopping-filters\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/,'filters in two columns, not four stacked rows');
});

test('S3 bidi: an e-mail address is one left-to-right line in a row of its own (Phase 3.1 P3-F12: sharing, admin, history)',()=>{
  const code=app.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n');
  assert(code.includes('<button class="access-email" type="button" dir="ltr" data-action="email-expand"'),'the shared accessRow()');
  assert(fn('sharingSection').includes('accessRow(')&&fn('adminView').includes('accessRow('));
  assert.match(css,/\.access-email bdi\{[^}]*white-space:nowrap/,'never broken mid-word');
});

test('S9 audit: every tappable control is at least 44px',()=>{
  assert.match(css,/\.close\{width:44px;height:44px/);
  assert.match(css,/\.import-status \.import-actions \.btn,\.pack-actions \.btn,\.doc \.btn\{min-height:44px\}/);
  assert.match(css,/\.task-compact-main\{align-self:stretch;justify-content:center;min-height:44px\}/,'the whole row, not a 29px strip of it, opens the editor');
  assert.match(css,/\.game-star\{[^}]*width:44px;height:44px/);assert.match(css,/\.filter-chip\{min-height:44px/);assert.match(css,/\.small-btn\{min-height:44px/);
});

test('S9: every token pair used for text meets 4.5:1, and --accent is never used as text colour',()=>{
  const channel=value=>{const c=value/255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
  const luminance=hex=>{const [r,g,b]=[1,3,5].map(i=>channel(parseInt(hex.slice(i,i+2),16)));return 0.2126*r+0.7152*g+0.0722*b};
  const ratio=(a,b)=>{const [x,y]=[luminance(a),luminance(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
  const T={bg:'#FCFAF7',surface:'#FFFFFF',ink:'#123F42',muted:'#726B66',accentSoft:'#F9ECE7',tealSoft:'#E8F3F1',white:'#FFFFFF'};
  const pairs=[['ink','bg'],['ink','surface'],['ink','accentSoft'],['ink','tealSoft'],['white','ink'],['muted','bg'],['muted','surface'],['muted','accentSoft'],['muted','tealSoft']];
  for(const [fg,bg] of pairs)assert(ratio(T[fg],T[bg])>=4.5,`${fg} on ${bg}: ${ratio(T[fg],T[bg]).toFixed(2)}`);
  assert(ratio('#C86442',T.surface)<4.5,'documents why --accent is a marker (icon / border / dot) and never body text');
  const textUses=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([,,body])=>/(^|;)\s*color:\s*var\(--accent\)/.test(body)).map(([,selector])=>selector.trim());
  assert(textUses.every(selector=>/\.ti\b|\bsvg\b|\.dot\b/.test(selector)),`--accent as a text colour on: ${textUses.join(' | ')}`);
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 3 tests passed`);
