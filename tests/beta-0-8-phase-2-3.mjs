// Beta 0.8 Phase 2.3 (correction package for the Phase 2.2 NO-GO: P22-F1..F5, F7, F8, F10; F6 is a planning note, F9 is Phase 3).
// Pure logic runs for real; v5-app.js wiring is asserted from source (it needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {additionalDetails} from '../src/ticket-card.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const line=prefix=>app.split('\n').find(l=>l.startsWith(prefix))||'';

test('P22-F1: the Packing title is "אריזה" -- short enough never to truncate beside "+ קטגוריה"',()=>{
  assert(line('function packingView(').includes('<div class="page-head"><h2>אריזה</h2>'));
  assert(!line('function packingView(').includes('רשימות אריזה'));
});

test('P22-F2: no coverage bar, no peek -- text only, every slide a full-width card; the counter stays (P22-F6)',()=>{
  const summary=fn('ticketSummaryBlock');
  assert(!summary.includes('cover-bar')&&summary.includes('כרטיסים: <bdi dir="ltr">${summary.covered}/${summary.total}</bdi>')&&summary.includes('ללא כרטיס:'));
  assert(!css.includes('.cover-bar'));
  assert.match(css,/\.t-carousel\{margin:0;/,'the carousel is no longer bled past the card edge');
  assert.match(css,/\.t-track\{display:flex;gap:12px;padding:0;transform:translateX\(calc\(var\(--before,0\) \* \(100cqw \+ 12px\)\)\)\}/);
  assert.match(css,/\.t-track \.ticket\{flex:0 0 100cqw;/);
  assert(app.includes("const TICKET_STRIDE='(100cqw + 12px)';"));
  // the gap exceeds zero, so with a viewport-wide slide the neighbours are always fully outside the clipped viewport
  assert.match(css,/\.t-viewport\{[^}]*overflow:hidden/);
  const carousel=fn('ticketCarousel');
  assert(carousel.includes('<bdi class="muted" dir="ltr" aria-live="polite">${index+1} / ${count}</bdi>')&&carousel.includes('t-dots-row'),'the dots and the "1 / N" counter remain');
});

test('P22-F3: a globe icon only at the end of the provider row (44px, accessible name, no visible label); no "שם לחיפוש" chip',()=>{
  const detail=fn('detailView');
  assert(detail.includes('class="icon-link" href="${esc(item.website)}" target="_blank" rel="noopener" aria-label="אתר">${tabler(\'world\')}</a>'));
  assert(!detail.includes('link(item.website,\'world\',\'אתר\')'),'no visible "אתר" label text');
  assert(detail.includes('<dd class="fact-split"><span>${esc(item.provider)}</span>${siteLink}</dd>'));
  assert(!detail.includes('שם לחיפוש')&&!detail.includes('badge warn')&&!detail.includes('אומת'),'no chip under the location -- it stays the underlined map link on its own');
  assert.match(css,/\.icon-link\{[^}]*width:44px;height:44px/);
  assert.match(css,/\.fact-split>span\{[^}]*white-space:nowrap/,'the provider row stays on one line');
  assert(!/item\.type===/.test(detail.slice(detail.indexOf('const siteLink'),detail.indexOf('const providerRow'))),'applies to every item type');
});

test('P22-F4: the collapsed "פרטים נוספים" row -- only values that exist, none -> no row, closed on every page open',()=>{
  assert.deepEqual(additionalDetails(undefined),[]);assert.deepEqual(additionalDetails({}),[]);
  assert.deepEqual(additionalDetails({meetingPoint:'  ',duration:'',amount:'',included:'',notIncluded:''}),[],'blank values do not count');
  const full=additionalDetails({meetingPoint:'שער 3',duration:'שעתיים',amount:'120',currency:'ILS',ageRestrictions:'מגיל 6',included:'הדרכה',notIncluded:'אוכל',ticketQuantity:'5'});
  assert.deepEqual(full.map(r=>r.label),['נקודת מפגש','משך','מחיר','הגבלת גיל','כלול','כמות כרטיסים']);
  assert.equal(full[0].map,true,'the meeting point is a map link');
  assert.equal(full[2].value,'120 ILS');
  assert.equal(full[4].notIncluded,'אוכל','"לא כלול" is the muted second line of the "כלול" row');
  const some=additionalDetails({duration:'שעה',notIncluded:'אוכל'});
  assert.deepEqual(some.map(r=>r.label),['משך','לא כלול'],'only what has a value; "לא כלול" stands alone when nothing is included');
  assert.equal(additionalDetails({amount:'50'})[0].value,'50');
  const block=fn('additionalDetailsBlock');
  assert(block.includes("if(item.type!=='activity')return '';")&&block.includes('if(!rows.length)return \'\';'),'activities only; no values -> no row');
  assert(block.includes('aria-expanded="${open}"')&&block.includes('data-action="extra-toggle"')&&block.includes("tabler(open?'chevup':'chevdown')"));
  assert(block.includes('${tabler(\'pin\')}')&&block.includes('mapsUrl(row.value)'),'the meeting point links to the map');
  assert(block.includes('לא כלול: ${esc(row.notIncluded)}'));
  assert(app.includes("function route(view,options={}){triviaPlaying=null;extraOpenFor=null;"),'closed every time a page opens'); // 0.9.1: route() also leaves a Trivia play screen
  assert(app.includes("else if(action==='extra-toggle'){extraOpenFor=extraOpenFor===button.dataset.id?null:button.dataset.id;render()}"));
  const section=fn('ticketsAndDocumentsSection');
  assert(section.indexOf('ticketCarousel(item,tickets)')<section.indexOf('additionalDetailsBlock(item)')&&section.indexOf('additionalDetailsBlock(item)')<section.indexOf('canAttach?'),'after the carousel, before "+ הוספת מסמך"');
  assert(!fn('additionalDetailsBlock').includes('ticketHolders')&&!fn('additionalDetailsBlock').includes('passengers'),'no ticket / holder information in it');
  assert.match(css,/\.extra\.open \.extra-head\{background:var\(--teal-soft\)/);
});

test('P22-F5: the unconfirmed slide\'s confirm action is "אישור" with a check icon; the row fits on one line',()=>{
  const slide=fn('ticketSlideHtml');
  assert(slide.includes('data-action="source-confirm-ticket" data-id="${source.id}" aria-label="אישור ככרטיס">${tabler(\'check\')} אישור</button>'));
  assert(!slide.includes('>אישור ככרטיס<'),'the long label is gone');
  assert.match(css,/\.ticket-actions\{display:flex;flex-wrap:nowrap/);
  assert.match(css,/\.ticket-actions \.btn\{[^}]*white-space:nowrap/);
  assert(slide.includes('confirmed?`<label class="used">'),'a confirmed slide keeps "נוצל"');
});

test('P22-F7: every page with a back action uses the compact header -- no "חזרה" button, no "פריטים" label',()=>{
  const back=fn('backRow');
  assert(back.includes('<div class="detail-top${title?\' with-title\':\'\'}"><button class="icon-btn back-btn"')&&back.includes('aria-label="חזרה"')&&back.includes('class="ti icon-directional"'));
  // every page the audit found with a back action
  assert(fn('detailView').includes("${backRow('center',item.type,"),'item page, every type');
  // Beta 0.8 Phase 3 (P23-F1): the category page's back arrow, type icon and title share the one backRow() line.
  assert(app.includes("<section class=\"card\">${backRow('center','',`<button class=\"btn ghost small-btn add-type\" data-action=\"create\" aria-label=\"הוספת ${esc(ITEM_TYPES[state.category]?.label||'')}\">${tabler('plus')}<span class=\"btn-label\">${ITEM_TYPES[state.category]?.label||''}</span></button>`,`${typeIcon(state.category)} ${ITEM_TYPE_PLURALS[state.category]||ITEM_TYPES[state.category]?.label||''}`)}"),'category pages (Phase 3.2: the plural title and the "+ type" button share the back row; the label hides on a narrow header)');
  assert(app.includes("${backRow('center','document',`<span class=\"badge\">"),'the proposal review screen, its chip on the same row');
  assert(app.includes("<section class=\"card\">${backRow('settings')}<h2>ניהול הרשאות גישה</h2>")&&app.includes("<section class=\"card\">${backRow('settings')}<p class=\"muted\">מסך זה זמין"),'both admin screens');
  // and nothing in the app builds a labelled back button or the "פריטים" heading any more
  const code=app.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
  assert(!/>חזרה<\/button>/.test(code),'no labelled "חזרה" button anywhere');
  assert(!/<h3>פריטים<\/h3>/.test(code),'no "פריטים" label anywhere');
  assert.equal((code.match(/data-route="[a-z]+"[^>]*>\s*(חזרה|←)/g)||[]).length,0);
  // every remaining aria-label="חזרה" lives inside the one helper
  assert.equal((code.match(/aria-label="חזרה"/g)||[]).length,1);
  assert.match(css,/\.detail-top\{display:flex;align-items:center;justify-content:space-between;margin:-6px 0 0\}/);
});

test('P22-F8: a Packing / task row gives the name more room and lets it wrap to two lines before it is cut; the chip stays whole',()=>{
  assert.match(css,/\.packing-card\{padding:10px\}/);
  assert.match(css,/\.packing-card \.card\.nested\{padding:8px\}/,'one layer of card padding less (16 -> 8)');
  assert.match(css,/\.task-compact input\[type="checkbox"\]\{margin:8px\}/);
  assert.match(css,/\.row-line b\{[^}]*-webkit-line-clamp:2[^}]*\}/,'up to two lines, then an ellipsis');
  assert.match(css,/\.row-line \.chip-participants\{flex:0 0 auto;max-width:55%/,'the chip keeps its width');
  assert.match(css,/\.task-compact\{height:auto;/,'a two-line row may grow');
  assert(line('function packRow(').includes('<span class="row-line"><b>')&&line('function taskRow(').includes('<span class="row-line"><b>'),'Packing and tasks share the rule');
});

test('P22-F10: a styled dashed file field with an upload icon, the chosen name in <bdi> with "החלפה" -- in both dialogs',()=>{
  const drop=fn('fileDrop');
  assert(drop.includes('class="file-drop ${name?\'has-file\':\'\'}"')&&drop.includes('<input id="source-file" type="file" accept="${FILE_ACCEPT}">')&&drop.includes("tabler('upload')")&&drop.includes('בחירת קובץ')&&drop.includes('<bdi class="file-name">')&&drop.includes('החלפה'));
  assert(drop.includes("const name=pendingSourceFile?.name||'';"),'a render never forgets a chosen file');
  assert(fn('smartImportPanel').includes('fileDrop()'),'the "+" dialog\'s מסמך option');
  assert(fn('attachmentModal').includes('${fileDrop()}'),'the item page\'s own "הוספת מסמך" dialog');
  assert(app.includes("else if(event.target.id==='source-file'){pendingSourceFile=event.target.files?.[0]||null;syncFileDrop(event.target)}"));
  assert.match(css,/\.file-drop\{[^}]*min-height:52px;[^}]*border:1\.5px dashed var\(--border\)/);
  assert.match(css,/\.file-drop input\[type="file"\]\{position:absolute;inset:0;width:100%;height:100%;[^}]*opacity:0/,'the whole box is the tap target');
  assert.match(css,/\.file-name\{[^}]*text-overflow:ellipsis/);
  assert.match(css,/\.file-drop\.has-file \.file-chosen\{display:flex\}/);
  // the browser's bare control is not rendered anywhere else
  assert.equal((app.match(/<input id="source-file" type="file"/g)||[]).length,1);
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 2.3 tests passed`);
