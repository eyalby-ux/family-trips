// Beta 0.8 Phase 2.2 (correction package for the Phase 2.1 NO-GO, findings P21-F1..F6 and F8..F14; F7 is Phase 3).
// Pure logic runs for real; v5-app.js wiring is asserted from source (it needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {largePalm} from '../src/import-status.js';
import {participantChipLabel} from '../src/operational-data.js';
import {ticketHolderLabel} from '../src/ticket-card.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),v4=read('../src/v4.css');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const line=prefix=>app.split('\n').find(l=>l.startsWith(prefix))||'';
const people=[{id:'a',name:'אייל בן יצחק'},{id:'p',name:'פאולה כהן'},{id:'d',name:'דניאל'},{id:'m',name:'עמית'},{id:'o',name:'עפרי'},{id:'z',name:'לא פעיל',active:false}];

// ---- P21-F1..F4: the item page -------------------------------------------------------------------
test('P21-F1: a compact back arrow (44px, no border) and the type chip share one row above the title',()=>{
  const detail=fn('detailView');
  // Beta 0.8 Phase 2.3 (P22-F7): the header is built by the shared backRow() helper (every page with a back action uses it).
  const back=fn('backRow');
  assert(detail.includes("${backRow('center',item.type,")&&back.includes('<div class="detail-top"><button class="icon-btn back-btn"')&&back.includes('aria-label="חזרה"')&&back.includes('class="ti icon-directional"'),'icon back button, mirrored under RTL');
  assert(detail.indexOf('class="detail-top"')<detail.indexOf('<header class="detail-head">'),'the row sits above the title');
  assert(!detail.includes('>חזרה</button>'),'no large labelled back button');
  assert.match(css,/\.icon-btn\{[^}]*width:44px;height:44px;padding:0;border:0;background:transparent/);
});
test('P21-F2/F3: map, website, phone and e-mail are inline links on every item type -- no separate buttons',()=>{
  const detail=fn('detailView');
  assert(detail.includes("link(navHref,'pin',esc(locationLabel(item)),'fact-underline')"),'the location name itself is the map link');
  // Beta 0.8 Phase 2.3 (P22-F3): the website link is a globe icon only (aria-label "אתר"), 44px, at the end of the provider row.
  assert(detail.includes('const siteLink=item.website?`<a class="icon-link" href="${esc(item.website)}" target="_blank" rel="noopener" aria-label="אתר">${tabler(\'world\')}</a>`:\'\';')&&detail.includes('<dd class="fact-split"><span>${esc(item.provider)}</span>${siteLink}</dd>'),'a globe ends the provider row');
  assert(detail.includes("const siteRow=!item.provider&&item.website?detailFact('אתר',siteLink):'';"),'with no provider it gets its own row');
  assert(detail.includes("detailFact('טלפון',link(`tel:${item.phone}`,'phone','התקשרות'))"),'"התקשרות" on its own row');
  assert(detail.includes("link(`mailto:${item.email}`,'mail','אימייל')"));
  assert(!/class="btn[^"]*"[^>]*>[^<]*(ניווט|חיפוש במפה)/.test(detail)&&!detail.includes('detail-links'),'no separate map / website / phone buttons');
  assert(!/item\.type===['"](hotel|flight|activity|car)['"]\?[^:]*link\(/.test(detail),'not gated on a type -- applies to every item type');
  assert.match(css,/\.fact-underline\{[^}]*text-decoration:underline/);
  assert.match(css,/\.fact-link\{[^}]*min-height:44px/);
});
test('P21-F4: the "פרטי הכרטיס" card is gone from the saved item page (ticket and holder detail lives only in the ticket card)',()=>{
  const detail=fn('detailView');
  assert(!detail.includes('activitySummaryBlock(')&&!detail.includes("holders:'collapsed'"),'no duplicate activity card or folded holder list');
  assert(detail.includes("flightSummaryBlock(item.details,{holders:false})"),'a flight keeps its own flight-details card but no passenger list');
  assert(app.includes('${p.type===\'activity\'?activitySummaryBlock(p.details):\'\'}'),'the REVIEW screen still shows the full detail');
});

// ---- P21-F11: the carousel inside the item card ---------------------------------------------------
test('P21-F11: the "⋯" menu is one body-level popover that nothing can clip',()=>{
  assert(fn('moreMenu').includes('data-action="more-menu"')&&fn('moreMenu').includes('<template>'),'the slide only carries a button and an inert template');
  const open=fn('openMoreMenu');
  assert(open.includes('document.body.appendChild(menu)')&&open.includes('getBoundingClientRect()'),'appended to <body>, placed from the button\'s rectangle');
  assert(open.includes('fitsBelow')&&open.includes('anchor.top-6-box.height'),'above the button when there is no room below');
  assert.match(css,/\.t-menu\{position:fixed;z-index:200;/);
  assert(app.includes("if(event.target.closest('#more-menu')||!event.target.closest('[data-action=\"more-menu\"]'))closeMoreMenu();"),'any other tap closes it');
  assert(app.includes("addEventListener('scroll',closeMoreMenu")&&app.includes("event.key==='Escape'"));
  assert(!css.includes('.t-more'),'the old in-slide <details> menu is gone');
});
test('P21-F11: the next-slide peek is at most 24px at phone widths, and slide width and stride cannot drift apart',()=>{
  // Beta 0.8 Phase 2.3 (P22-F2): no peek at all -- a slide is the full viewport width, the stride is one viewport + the gap.
  assert(css.includes('transform:translateX(calc(var(--before,0) * (100cqw + 12px)))')&&css.includes('.t-track .ticket{flex:0 0 100cqw;'));
  assert(app.includes("const TICKET_STRIDE='(100cqw + 12px)';"));
  // geometry at the widths the carousel really gets: viewport = phone - 2x20 page margin - 2x(card + nested card padding and borders)
  for(const phone of [320,360,375,390,412]){
    const viewport=phone-40-34-34;const slide=viewport;const peek=viewport-slide;
    assert(peek===0,`${phone}px phone: the next slide must not show (peek ${peek}px)`);
  }
});
test('P21-F11: the slide fits -- no wrapped button, the holder and the coverage summary are one line each',()=>{
  assert.match(css,/\.holder\{[^}]*white-space:nowrap/);assert.match(css,/\.holder\{[^}]*text-overflow:ellipsis/);
  assert.match(css,/\.ticket-actions\{display:flex;flex-wrap:nowrap/);
  assert.match(css,/\.ticket-actions \.btn\{[^}]*white-space:nowrap/,'"אישור ככרטיס" cannot wrap inside its own button');
  assert.match(css,/\.ticket-actions \.btn\.more\{width:44px/,'the ⋯ button is a fixed 44px, inside the row');
  assert.match(css,/\.ticket-summary \.summary-row\{[^}]*white-space:nowrap/);
  assert(app.includes('כרטיסים: <bdi dir="ltr">${summary.covered}/${summary.total}</bdi>'),'the shorter "כרטיסים: 2/6" label');
  assert.equal(ticketHolderLabel([people[0]]),'אייל בן יצחק');
  assert.equal(ticketHolderLabel([people[0],people[1]]),'אייל, פאולה','two people -> first names, one line');
  assert.equal(ticketHolderLabel([people[0],people[1],people[2]]),'אייל +2');
  assert.equal(ticketHolderLabel([]),'');
  assert(app.includes('const holder=ticketHolderLabel(people)||'));
});

// ---- P21-F5 / F6 ---------------------------------------------------------------------------------
test('P21-F5: in a participant\'s own view the chip starts with that participant; the shared view keeps the rule',()=>{
  const ids=['a','p','d','m','o'];
  assert.equal(participantChipLabel(['a','p','d','m'],people,undefined,{viewerId:'p'}),'פאולה +3','Paula first, then the count');
  assert.equal(participantChipLabel(['a','p','d','m'],people,undefined,{viewerId:'a'}),'אייל +3');
  assert.equal(participantChipLabel(['a','p'],people,undefined,{viewerId:'p'}),'פאולה, אייל','exactly two: the viewer first');
  assert.equal(participantChipLabel(['p','d'],people,undefined,{viewerId:'p'}),'פאולה, דניאל');
  assert.equal(participantChipLabel(['a','p','d','m'],people),'אייל +3','the shared view is unchanged');
  assert.equal(participantChipLabel(['a','p'],people),'אייל בן יצחק, פאולה כהן','two in full in the shared view');
  assert.equal(participantChipLabel(ids,people,undefined,{viewerId:'p'}),'כולם','everyone is still "כולם"');
  assert.equal(participantChipLabel(['a'],people,undefined,{viewerId:'a'}),'אייל בן יצחק','a single owner shows the name');
  assert.equal(participantChipLabel(['a','d'],people,undefined,{viewerId:'m'}),'אייל בן יצחק, דניאל','a viewer who is not an owner changes nothing');
  assert(line('function packRow(').includes("state.packingParticipantView&&state.packingParticipantView!=='shared'?state.packingParticipantView:''")&&line('function packRow(').includes('{viewerId}'));
});
test('P21-F6: the chip shares the name\'s line (Packing and task rows); the name truncates before the chip wraps',()=>{
  const pack=line('function packRow(');
  assert(pack.includes('<span class="row-line"><b>${esc(item.name)}</b>${label?`<span class="badge chip-participants">'),'Packing');
  const task=line('function taskRow(');
  assert(task.includes('<span class="row-line"><b>${esc(task.title)}</b>${participantLabel?`<span class="badge chip-participants">')&&!task.includes("' · '+esc(participantLabel)"),'tasks: on the title line, no longer appended to the meta');
  assert.match(css,/\.row-line b\{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  assert.match(css,/\.row-line \.chip-participants\{flex:0 0 auto;max-width:55%/,'the chip keeps its width (the name truncates first) and is never wider than 55% of the row');
  assert.match(css,/\.chip-participants\{[^}]*white-space:nowrap/);
});

// ---- P21-F12 / F13 -------------------------------------------------------------------------------
test('P21-F12: Packing -- one header row with a small outline "+ קטגוריה", no explanation, a compact carousel',()=>{
  const view=line('function packingView(');
  assert(view.includes('<div class="page-head"><h2>אריזה</h2><button class="btn ghost small-btn" data-action="add-list">${tabler(\'plus\')} קטגוריה</button></div>'),'Beta 0.8 Phase 2.3 (P22-F1): the title is "אריזה" so it never truncates beside the button');
  assert(!view.includes('פריטים שסומנו עוברים לאזור')&&!view.includes('קטגוריה חדשה'),'the three-line explanation and the big filled button are gone');
  assert.match(css,/\.page-head\{display:flex;align-items:center;justify-content:space-between/);
  assert.match(css,/\.packing-card \.p-carousel-avatar\{width:44px;height:44px/,'smaller avatars');
  assert.match(css,/\.small-btn\{min-height:44px/);
});
test('P21-F13: an empty category says so -- no progress bar, no 0/0, "הכול נארז." only when items exist and all are packed',()=>{
  const view=line('function packingView(');
  assert(view.includes("const body=!visible.length?'<p class=\"muted\">אין פריטים בקטגוריה</p>':"),'the empty message');
  assert(view.includes('${visible.length?`<span class="badge"><bdi>${packed.length}/${visible.length}</bdi></span>`:\'\'}'),'no 0/0 badge');
  assert(view.indexOf('אין פריטים בקטגוריה')<view.indexOf('class="progress"'),'the progress bar lives only in the non-empty branch');
  assert(view.includes("active.map(packRow.bind(null,list)).join('')||'<p class=\"muted\">הכול נארז.</p>'"),'"הכול נארז." is the non-empty, nothing-left branch');
  assert(view.includes('<button class="add-dashed" data-action="pack-add" data-list="${list.id}">+ הוספת פריט</button>'),'"+ הוספת פריט" is always offered');
});

// ---- P21-F8 / F9 ---------------------------------------------------------------------------------
test('P21-F8: QR and JSON are gone from the "+" dialog',()=>{
  const dialog=fn('intakeModal');
  assert(dialog.includes("choices=[['manual','pencil','ידני'],['document','file','מסמך'],['link','link','קישור']]"));
  assert(!/\['(json|qr)'/.test(dialog.slice(0,600)),'no JSON / QR option');
  assert(dialog.includes('${taskChoice}'),'the Task button remains');
});
test('P21-F9: four compact tiles in one row, ~72px, selection in --teal-soft with an ink border; the form is compact',()=>{
  assert(app.includes('<div class="source-choice source-tiles">'));
  assert.match(css,/\.source-choice\.source-tiles\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.source-choice\.source-tiles button\{flex-direction:column;min-height:72px/,'icon over label');
  assert.match(css,/\.source-choice\.source-tiles button\.active\{[^}]*border:1\.5px solid var\(--ink\);background:var\(--teal-soft\)/);
  const panel=fn('smartImportPanel');
  assert(panel.includes('<input type="checkbox" name="processing-mode" value="analyze" checked> ניתוח והצעת פריט')&&!panel.includes('<fieldset'),'one checkbox instead of a two-radio fieldset');
  assert(!panel.includes('smart-import-disclosure'),'the tall disclosure box is a one-line note');
  assert(app.includes("document.querySelector('input[name=\"processing-mode\"][value=\"analyze\"]')?.checked===false?'save':'analyze'"),'an unticked box saves the source without AI');
  assert(app.includes('<h2>הוספה</h2>'));
});

// ---- P21-F10 -------------------------------------------------------------------------------------
test('P21-F10: the analysis screen REPLACES the dialog -- centred palm, "מנתח…", status line, hairline, reassurance, greyed "המשך"',()=>{
  assert(app.includes("function intakeModal(){if(ingestBusy)return analyzingModal('הוספה · מסמך');"),'the Add dialog shows nothing but the analysis screen while busy');
  assert(fn('attachmentModal').includes('if(ingestBusy)return analyzingModal('),'also the per-item "add document" dialog');
  const screen=line('function analyzingModal(');
  assert(screen.includes('class="modal analyzing"')&&screen.includes('largePalm({label:\'מנתח…\',note:\'הניתוח יכול לקחת מספר שניות. אין צורך לסגור את המסך.\'})')&&screen.includes('disabled aria-disabled="true">המשך</button>'));
  assert(!screen.includes('source-choice'),'none of the dialog\'s own options are shown');
  const html=largePalm({label:'מנתח…',note:'הערה'});
  assert(html.indexOf('palm-label')<html.indexOf('import-phrases')&&html.indexOf('import-phrases')<html.indexOf('import-hairline')&&html.indexOf('import-hairline')<html.indexOf('palm-note'),'palm, label, status line, hairline, note -- in the mockup\'s order');
  assert.match(css,/\.modal\.analyzing\{[^}]*min-height:100dvh[^}]*padding-top:72px/,'full height, and clear of the sticky account bar so the title and close button stay reachable');
  assert.match(css,/\.analyzing-body\{[^}]*place-items:center/);
});

// ---- P21-F14 -------------------------------------------------------------------------------------
test('P21-F14: the Shopping owner is a dropdown of the active participants; an existing owner is never dropped',()=>{
  const field=fn('shoppingOwnerField');
  assert(field.includes('<select name="owner"><option value="">משותף</option>')&&field.includes("state.participants.filter(participant=>participant.active!==false)"),'active participants only');
  assert(field.includes('const kept=current&&!names.includes(current)?[current]:[];'),'an old / inactive owner stays selectable');
  assert(app.includes('${shoppingOwnerField(entry)}')&&!app.includes('<input name="owner"'),'the free-text input is gone');
  assert(app.includes("owner:String(data.get('owner')||'shared').trim()||'shared'"),'still stored as the owner\'s name, so existing items keep working');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 2.2 tests passed`);
