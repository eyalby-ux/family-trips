// Beta 0.8 Phase 3.2 (correction package for the Phase 3.1 NO-GO): P31-F1 .. F6. Wiring is asserted from source (v5-app.js needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};

test('P31-F1: Settings is a home list of rows in three labelled groups; every row opens its own page; no tab bar',()=>{
  const home=fn('settingsHome');
  const order=['הטיול הנוכחי','חשבון','כללי'].map(label=>home.indexOf(`settingsGroup('${label}'`));
  assert(order.every(index=>index>0)&&order[0]<order[1]&&order[1]<order[2],'groups in order');
  const rows=['פרטי הטיול ויעדים','משתתפים','שיתוף הטיול','הטיולים שלי','ניהול מערכת','אודות','מחיקה'].map(title=>home.indexOf(`settingsRow('${title}'`));
  assert(rows.every(index=>index>0)&&rows.every((index,i)=>i===0||index>rows[i-1]),'rows in the board\'s order');
  assert(home.includes("if(isOwner)trip.push(settingsRow('שיתוף הטיול'"),'sharing is for the trip\'s owner');
  assert(home.includes("if(myInvitation?.isAdmin)account.push(settingsRow('ניהול מערכת','הרשאות גישה · למנהלים בלבד',{route:'admin'}))"),'managers only');
  assert(home.includes('<bdi dir="ltr">${esc(appVersionLabel())}</bdi>'),'the version value is an LTR isolate');
  assert(home.includes("settingsRow('מחיקה','',{page:'delete',danger:true})"),'a red delete row at the end (under כללי, as on the board)');
  assert(home.includes('${active===1?\'פעיל אחד\':`${active} פעילים`}')&&home.includes("'1 לא פעיל'"),'participants subtitle "N פעילים · N לא פעיל"');
  const row=app.slice(app.indexOf('const settingsRow='),app.indexOf('const settingsGroup='));
  assert(row.includes('<button class="srow')&&row.includes('data-route="${route}"')&&row.includes("tabler('chevron').replace('class=\"ti\"','class=\"ti icon-directional\"')"),'a real button, a mirrored chevron');
  assert(!home.includes('role="tab"')&&!home.includes('class="tabs"'),'no tab bar');
  assert.match(css,/\.srow\{[^}]*min-height:56px/);assert.match(css,/\.srow-sub\{font-size:13px;color:var\(--muted\)/);
  assert.match(css,/\.srow\.danger,\.srow\.danger \.srow-text b\{color:#A4442A\}/);
  // pages
  const page=fn('settingsPage');
  for(const key of ['trip','participants','sharing','trips','about','delete'])assert(page.includes(`${key}:`),`${key} page`);
  assert(page.includes("backRow('settings','','',esc(SETTINGS_TITLES[page]))"),'the screen back arrow + the page title share one row');
  assert(app.includes("function settingsView(){if(!state.trip)return empty();return SETTINGS_TITLES[state.settingsPage]?settingsPage(state.settingsPage):settingsHome()}"));
  assert(app.includes("state.settingsPage=view==='settings'?(options.page||''):'';"),'leaving or re-entering Settings goes back to the home list');
  assert(app.includes('anchor:routeButton.dataset.anchor,page:routeButton.dataset.page'),'a row\'s data-page reaches route()');
  assert(app.includes("const aboutSection=()=>`<section class=\"card\"><h2>אודות</h2><p class=\"muted small\"><bdi>${esc(appVersionLabel())}</bdi>${buildVersionLabel()?` · בנייה <bdi>${esc(buildVersionLabel())}</bdi>`:''}</p></section>`;"),'the About page shows the version and the full build');
  assert(app.includes('settingsPage,timelineCursor,taskFilters,shoppingFilters,gameFilter,docFilter,tasksDoneCollapsed}=state;'),'a remote update no longer throws you back to the home list');
  assert.match(css,/\.settings-sub:not\(\.settings-trip\) \.card>h2:first-child,\.settings-sub:not\(\.settings-trip\) \.section-head>h2\{display:none\}/,'a page\'s own title is the back row\'s');
});

test('P31-F2: the Today action row -- equal label-only buttons below a hairline: ניווט · אתר · התקשרות (phone only), two without a phone',()=>{
  const actions=fn('dayItemActions');
  // 0.8.1 (BL-ICONS-1): the buttons now carry icon + label (see beta-0-8-phase-0-8-1.mjs); the order and the conditions are unchanged.
  const order=["'compass','ניווט'","'world','אתר'","'phone','התקשרות'","'ticket','כרטיסים'"].map(label=>actions.indexOf(label));
  assert(order.every(index=>index>0)&&order.every((index,i)=>i===0||index>order[i-1]),'order');
  assert(actions.includes('item.phone&&String(item.phone).replace(/[^\\d+]/g,\'\')?')&&actions.includes('href="tel:'),'the third button needs a phone number and dials it');
  assert(actions.includes('actionButton(')&&!/>(ניווט|אתר|התקשרות|כרטיסים)</.test(actions),'built by the shared actionButton() (icon + label)');
  assert.match(css,/\.day-item-actions\{display:flex;flex-wrap:nowrap;gap:8px;padding:10px 12px;border-top:1px solid var\(--border\)\}/,'a hairline above a full-width row');
  assert.match(css,/\.day-item-actions \.btn\{flex:1 1 0;min-width:0;min-height:44px;[^}]*white-space:nowrap/,'equal, 44px, no wrap');
  assert.match(css,/\.day-item-time\{flex:0 0 96px;width:96px;align-items:center/,'the 96px time column; the action row is a separate row, so it cannot straddle the divider');
  assert(fn('dayItemCard').includes('<div class="day-item-actions">${actions}</div>')&&fn('dayItemCard').indexOf('</button>${actions?')>0,'the row sits after the header button, not inside it');
});

test('P31-F3: a Failed document row keeps its pill visible; "נסה שוב" / "מחק" are compact outline buttons under the name',()=>{
  const row=fn('documentRow');
  assert(row.includes('importStatusPill(stateName)')&&!row.includes('{actions:failedActions}'),'the pill carries no buttons');
  // PO 2026-10-12: the retry is in the "⋯" menu, and the pill sits where the retry button was -- nothing beside it, nothing covering the name.
  assert(row.includes("const retry=stateName==='failed'&&canRetry?menuButton('analyze-source',source,'נסה שוב'):'';")&&row.includes('const menu=[retry,open,')&&row.includes('<span class="doc-meta">${chip}${notes}</span>')&&!row.includes('doc-retry'),'"נסה שוב" is the first entry of the Failed row\'s menu');
  assert(row.includes("menuButton('source-delete',source,'מחק')"),'a Failed document\'s delete is in its "⋯" menu');
  assert.match(css,/\.doc-row \.doc-main\{flex:1 1 0\}/,'a long name can never push the content onto a second line');
  assert.match(css,/\.small-btn\{min-height:44px;[^}]*white-space:nowrap/,'44px, no wrap');
});

test('P31-F3 (PO, 2026-10-12): in a document row nothing shrinks, so the name can never be squeezed behind the pill (larger phone text sizes)',()=>{
  assert.match(css,/\.doc-main>\*\{flex:0 0 auto\}/,'the name and the meta line keep their height; the row grows instead');
  assert.match(css,/\.doc-name\{line-height:1\.4\}/);
  assert.match(css,/\.doc-row\{align-items:center\}/);
});

test('P31-F4: an archived proposal is a compact row -- the title on one LTR line, "נדחה" and the source name inside the card',()=>{
  const row=fn('archivedSuggestionRow');
  assert(row.includes('<div class="doc-row archived">')&&row.includes('<bdi class="doc-name" dir="ltr">${esc(suggestion.proposed.title)}</bdi>')&&row.includes('<span class="doc-chip rejected">נדחה</span>'));
  assert.match(css,/\.doc-name\{display:block;max-width:100%;[^}]*white-space:nowrap/,'one line with an ellipsis');
  assert.match(css,/\.doc-row\.archived \.doc-note\{[^}]*text-overflow:ellipsis/);
});

test('P31-F5: the category header never covers its title -- 26px title, label hides below 300px of header',()=>{
  assert.match(css,/\.detail-top\.with-title\{[^}]*container-type:inline-size\}/);
  assert.match(css,/\.detail-top\.with-title \.detail-title\{font-size:26px;[^}]*white-space:nowrap;overflow:hidden\}/);
  assert.match(css,/@container \(max-width:300px\)\{\.detail-top \.add-type \.btn-label\{display:none\}/,'the button shrinks to "+" on a narrow header');
  for(const source of [fn('center'),fn('documentsCategory')])assert(source.includes('class="btn ghost small-btn add-type" data-action="create" aria-label="הוספת ')&&source.includes('<span class="btn-label">'),'an accessible name for the icon-only state');
  assert.match(css,/\.detail-top \.add-type\{flex:0 0 auto/);
});

test('P31-F6: "הושלמו (N)" is a disclosure button with an arrow, open by default, remembered while you stay',()=>{
  const view=fn('tasksView');
  assert(view.includes('class="tasks-done-head" type="button" data-action="tasks-done-toggle" aria-expanded="${!state.tasksDoneCollapsed}"'));
  assert(view.includes('<i class="disc ${state.tasksDoneCollapsed?\'closed\':\'open\'}" aria-hidden="true"></i>')&&view.includes('<span>הושלמו (${doneTasks.length})</span>'),'the same triangle as the document archive\'s disclosure, at the start of the row');
  assert.match(css,/\.disc\.open\{border-width:8px 5px 0 5px/);assert.match(css,/\.disc\.closed\{border-width:5px 8px 5px 0/);
  assert(view.includes("${state.tasksDoneCollapsed?'':`<div class=\"list\">${doneTasks.map(taskRow).join('')}</div>`}"),'the done tasks show unless it was collapsed');
  assert(!view.includes('<details'),'not a native <details> (it rendered closed on the phone)');
  assert(app.includes("else if(action==='tasks-done-toggle'){state.tasksDoneCollapsed=!state.tasksDoneCollapsed;render()}"));
  assert.match(css,/\.tasks-done-head\{[^}]*min-height:44px/);
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 3.2 tests passed`);
