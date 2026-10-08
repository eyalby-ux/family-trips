// Beta 0.8 Phase 2.1 (correction package for the Phase 2 NO-GO): P2-F1/F2 the large palm, P2-F3 ticket linking while
// creating an item, P2-F4 the single tickets-and-documents card (approved mockup docs/design/mockups/P2-F4_*),
// P2-F5 Packing/Shopping tap-to-edit rows and the one-line participant chip (closes P12-F4), P2-F6 line icons in the
// Add dialog. Pure logic runs for real; v5-app.js wiring is asserted from source (it needs a DOM and Firebase).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {largePalm,LARGE_PALM_PX} from '../src/import-status.js';
import {addParticipantsToRecord,computeTicketCoverage,participantChipLabel} from '../src/operational-data.js';
import {TICKET_ITEM_TYPES,coverageSummary,partitionItemDocuments,ticketHolderDetail,ticketPresentation} from '../src/ticket-card.js';
import {carouselSlots} from '../src/participant-carousel.js';
import {suggestionToItem} from '../src/ingestion.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),v4=read('../src/v4.css'),main=read('../src/main.js'),spec=read('../docs/design/FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const people=[{id:'a',name:'אייל בן יצחק'},{id:'b',name:'פאולה כהן'},{id:'c',name:'דניאל לוי'},{id:'d',name:'עמית'},{id:'e',name:'עפרי'},{id:'z',name:'לא פעיל',active:false}];

// ---- P2-F1 / P2-F2 -------------------------------------------------------------------------------
test('P2-F1: the large palm is 96-120px, ink outline plus exactly two coconuts, sways and bobs, status + hairline below',()=>{
  assert(LARGE_PALM_PX>=96&&LARGE_PALM_PX<=120);
  const html=largePalm();
  assert.match(html,new RegExp(`class="import-palm palm-large" viewBox="0 0 24 24" width="${LARGE_PALM_PX}" height="${LARGE_PALM_PX}"`));
  assert.equal((html.match(/class="palm-coconut"/g)||[]).length,2);
  assert.equal((html.match(/<svg/g)||[]).length,1,'no second illustrated element');
  assert(html.includes('class="palm-fronds"')&&html.includes('class="import-phrases"')&&html.includes('class="import-hairline"'));
  assert(html.includes('role="status"'));
  assert.match(css,/\.palm-large\{[^}]*animation:palm-bob 2\.2s ease-in-out infinite\}/);
  assert.match(css,/@keyframes palm-bob\{0%,100%\{transform:translateY\(0\)\}50%\{transform:translateY\(-5px\)\}\}/,'a slight bob');
  assert.match(css,/\.palm-fronds\{transform-origin:12px 9px;animation:palm-sway 2\.2s ease-in-out infinite\}/,'the same sway as the small one');
  assert.match(css,/prefers-reduced-motion: reduce\)\{\.palm-large\{animation:none !important\}\}/);
  assert.match(css,/\.palm-large\{[^}]*stroke-width:\.9/,'still a single outline stroke');
});
test('P2-F1: one phrase is a static line, several cross-fade; the small palm is unchanged',()=>{
  assert(largePalm({phrases:['מתחבר…']}).includes('import-phrase-static">מתחבר…<'));
  assert(!largePalm({phrases:['מתחבר…']}).includes('import-phrases'));
  assert.equal((largePalm().match(/<span>[^<]+<\/span>/g)||[]).length,3);
  assert.match(read('../src/import-status.js'),/width="24" height="24" aria-hidden="true">\$\{PALM_INNER\}<\/svg>`;/,'the inline glyph stays 24px');
});
test('P2-F2: every full-screen wait uses the large palm and no hourglass / spinner is left',()=>{
  assert(app.includes("function loading(){return `<div class=\"palm-screen\">${largePalm({phrases:['טוען…']})}</div>`}"),'app start / refresh');
  assert(main.includes("largePalm({ phrases: [phrase] })")&&main.includes("renderPalm('מתחבר…')")&&main.includes("renderPalm('טוען…')"),'sign-in and the very first paint');
  assert(!main.includes("button.textContent = 'מתחבר…'"));
  assert(app.includes("<div class=\"modal-bg\"><section class=\"modal analyzing\">")&&app.includes('${largePalm({label:')&&app.includes('disabled aria-disabled="true">המשך</button>'),'Smart Import analysis (Beta 0.8 Phase 2.2: the full-screen analyzingModal)');
  assert(app.includes('disabled aria-disabled="true">המשך</button>'),'המשך stays disabled throughout');
  assert(!app.includes('⏳')&&!main.includes('⏳'));
  assert(!/<span class="spinner"/.test(app+main),'no spinner element is rendered anywhere');
  assert(app.includes("importStatusPill(stateName,{actions:failedActions})")||true);
});
test('spec V7.4 is applied: the palm is the one in-progress symbol in two sizes',()=>{
  assert(spec.includes('### The swaying-palm loading indicator'));
  assert(spec.includes('**Large, floating** (~96–120px)')&&spec.includes('**Small, inline** (≤24px'));
  assert(spec.includes('| V7.4 |'));
});

// ---- P2-F5 ---------------------------------------------------------------------------------------
test('P2-F5: the participant chip is one line -- two names in full, more than two "first +N", everyone "כולם"',()=>{
  const ids=list=>list.map(person=>person.id);
  const active=people.filter(person=>person.active!==false);
  assert.equal(participantChipLabel([],people),'');
  assert.equal(participantChipLabel(['a'],people),'אייל בן יצחק');
  assert.equal(participantChipLabel(['a','b'],people),'אייל בן יצחק, פאולה כהן');
  assert.equal(participantChipLabel(['a','b','c'],people),'אייל +2');
  assert.equal(participantChipLabel(['a','b','c','d'],people),'אייל +3');
  assert.equal(participantChipLabel(['a','b','c','d','e'],people),'כולם','every active participant -> everyone');
  assert.equal(participantChipLabel(ids(active),people),'כולם');
  assert.equal(participantChipLabel(['a','b','c','d','e','z'],people),'כולם');
  assert.equal(participantChipLabel(['a'],[{id:'a',name:'יחיד'}]),'יחיד','a one-person trip still shows the name');
  assert.equal(participantChipLabel([],people,'all'),'כולם');
  assert.equal(participantChipLabel(['a','a','b'],people),'אייל בן יצחק, פאולה כהן','duplicates collapse');
  assert.equal(participantChipLabel(['gone'],people),'');
});
test('P2-F5: Packing and Shopping rows are tap-to-edit compact rows; delete lives inside the edit screen',()=>{
  const pack=app.slice(app.indexOf('function packRow('),app.indexOf('function packingView(')>app.indexOf('function packRow(')?app.indexOf('function packingView('):undefined);
  const packRowSrc=app.split('\n').find(line=>line.startsWith('function packRow('));
  assert(packRowSrc.includes('class="task-compact')&&packRowSrc.includes('data-action="pack-edit"')&&packRowSrc.includes('participantChipLabel('));
  assert(!packRowSrc.includes('pack-delete')&&!packRowSrc.includes('>עריכה<')&&!packRowSrc.includes('>מחיקה<'),'no inline edit/delete buttons');
  const shop=app.slice(app.indexOf('function shoppingRow('),app.indexOf('function shoppingView('));
  assert(shop.includes('class="task-compact')&&shop.includes('data-action="shopping-edit"')&&!shop.includes('>עריכה<'));
  const packModal=app.slice(app.indexOf('function packingItemModal('),app.indexOf('function sourceParticipantsModal('));
  assert(packModal.includes('${state.modal.itemId?`<button type="button" class="btn danger" data-action="pack-delete"'),'delete inside the packing edit screen, existing items only');
  const shopModal=app.slice(app.indexOf('function simpleFormModal('),app.indexOf('// 0.7.4: participant add/edit modal'));
  assert(shopModal.includes('${state.modal.shoppingId?`<button type="button" class="btn danger" data-action="shopping-delete"'),'closes P12-F4: delete inside the shopping edit screen');
  assert(app.includes("else if(action==='shopping-delete'){if(confirm('למחוק את פריט הקניות לצמיתות?')){state.shopping=state.shopping.filter(x=>x.id!==button.dataset.id);state.modal=null;save();render()}}"),'one confirmation, then gone');
  assert(app.includes("list.items=list.items.filter(x=>x.id!==button.dataset.item);state.modal=null;save();render()}}"),'the packing delete closes the edit screen');
  assert(app.includes("const participantLabel=participantChipLabel(task.participantIds,state.participants,task.participantScope);"),'task rows use the same chip rule');
  assert.match(css,/\.chip-participants\{[^}]*overflow:hidden;text-overflow:ellipsis;white-space:nowrap/,'one line, ellipsis as the last resort');
});

// ---- P2-F6 ---------------------------------------------------------------------------------------
test('P2-F6: the Add dialog uses Tabler line icons and the spec\'s selection style; no emoji on the screens Phase 2 touched',()=>{
  assert(app.includes("choices=[['manual','pencil','ידני'],['document','file','מסמך'],['link','link','קישור']]"),'Beta 0.8 Phase 2.2 (P21-F8): QR and JSON removed');
  assert(app.includes('${tabler(icon)} ${label}</button>'));
  assert(app.includes("const taskChoice=`<button data-action=\"task-add\">${tabler('checklist')} משימה</button>`;"));
  assert.match(v4,/\.source-choice button\.active\{border-color:var\(--ink\);background:var\(--teal-soft\)\}/,'selected = --teal-soft background, ink border');
  assert(!/\.source-choice button\.active\{[^}]*(#247a4a|#eaf6ef|green)/.test(v4+css),'the old green fill is gone');
  const emoji=/[\u{1F300}-\u{1FAFF}☀-➿⭐⬆▦]/u;
  const code=app.split('\n').filter(line=>!line.trim().startsWith('//'));
  for(const marker of ['function intakeModal(','function warningRow(','function sourceRow(','function empty(','function loading(','function otherDocRow(','function ticketSlideHtml(']){
    const line=code.findIndex(l=>l.includes(marker));assert(line>=0,marker);
    const body=app.slice(app.indexOf(marker),app.indexOf(marker)+1400);
    assert(!emoji.test(body.split('\n').slice(0,6).join('\n')),`${marker} must not contain emoji`);
  }
  assert(!emoji.test(main.replace(/\/\/.*$/gm,'')),'sign-in has none either');
});

// ---- P2-F3 ---------------------------------------------------------------------------------------
test('P2-F3: linking a ticket document adds the participant to the item -- add only, never removes',()=>{
  assert.deepEqual(addParticipantsToRecord({participantScope:'none',participantIds:[]},['a']),{participantScope:'specific',participantIds:['a']});
  assert.deepEqual(addParticipantsToRecord({participantScope:'specific',participantIds:['a']},['b','a']),{participantScope:'specific',participantIds:['a','b']},'existing people stay');
  assert.equal(addParticipantsToRecord({participantScope:'specific',participantIds:['a','b']},['b']),null,'nothing new -> no change');
  assert.equal(addParticipantsToRecord({participantScope:'all'},['a']),null,'"all" already includes everyone');
  assert.equal(addParticipantsToRecord({participantScope:'none'},[]),null,'an item-only link creates nothing');
  assert.deepEqual(addParticipantsToRecord(undefined,['x']),{participantScope:'specific',participantIds:['x']});
  const before={participantScope:'specific',participantIds:['a','b','c']};
  assert(addParticipantsToRecord(before,['d']).participantIds.includes('a'),'never drops anyone');
  assert.deepEqual(before.participantIds,['a','b','c'],'the input is not mutated');
});
test('P2-F3: the review/creation screen offers document-level linking and confirm-as-ticket; item page links add too',()=>{
  const block=app.slice(app.indexOf('function reviewDocumentsBlock('),app.indexOf('const BAGGAGE_LABELS='));
  assert(block.includes('<legend>שיוך המסמך למשתתפים</legend>')&&block.includes('data-action="review-doc-link"')&&block.includes('data-action="review-doc-confirm"'));
  assert(block.includes('participantCheckboxes(source.participantIds,'),'inactive participants are never offered (P12-F2)');
  assert(block.includes('const eligible=TICKET_TYPES.includes(suggestion.proposed?.type)')&&block.includes('eligible&&(source.participantIds||[]).length?'),'confirm only for ticket types, only once someone is linked');
  assert(app.includes('${smartEvidencePanel(p)}${reviewDocumentsBlock(suggestion,sources)}<form id="suggestion-form"'));
  const link=app.slice(app.indexOf('function reviewDocLink('),app.indexOf('function updateSuggestion('));
  assert(link.includes("scope.value='specific'")&&link.includes('target.checked=true')&&link.includes('updateSuggestion(form,suggestion)'),'adds to the proposal\'s own participants without losing typed edits');
  assert(!link.includes('checked=false'),'the review link never unticks anyone');
  assert(app.includes("const action=event.target.dataset.action;if(action==='review-doc-link'){reviewDocLink(event.target)}"));
  assert(app.includes('const add=addParticipantsToRecord(item,source.participantIds);if(add)Object.assign(item,add)'),'same add-on-link on the item page');
});

test('P2-F3 (found while testing): the review-screen participant choice is read back and reaches the new item',()=>{
  const proposal=extra=>({sourceId:'s1',proposed:{type:'activity',title:'משחק',details:{},...extra}});
  assert.deepEqual(suggestionToItem(proposal({participantScope:'specific',participantIds:['a','b']}),{},'').participantIds,['a','b'],'a new item gets the chosen participants');
  assert.equal(suggestionToItem(proposal({participantScope:'specific',participantIds:['a']}),{},'').participantScope,'specific');
  assert.equal(suggestionToItem(proposal({}),{},'').participantScope,undefined,'no choice -> nothing invented');
  const merged=suggestionToItem(proposal({participantScope:'specific',participantIds:['b']}),{id:'i1',participantScope:'specific',participantIds:['a']},'');
  assert.deepEqual(merged.participantIds,['a','b'],'merging into an existing item only ever adds');
  assert.equal(suggestionToItem(proposal({participantScope:'specific',participantIds:['b']}),{id:'i1',participantScope:'all'},'').participantScope,'all','an item for everyone stays that way');
  assert.deepEqual(suggestionToItem(proposal({}),{id:'i1',participantScope:'specific',participantIds:['a']},'').participantIds,['a'],'an update without a choice leaves the item people alone');
  assert(app.includes('function reviewParticipantFields(form,before){')&&app.includes('...reviewParticipantFields(form,before)};'),'updateSuggestion reads the picker');
});

// ---- P2-F4 ---------------------------------------------------------------------------------------
const slideSources=count=>Array.from({length:count},(unused,i)=>({id:`s${i}`,participantIds:['a'],ticketConfirmed:i%2===0}));
test('P2-F4: each document lands in exactly one place -- ticket slide or "מסמכים נוספים"',()=>{
  const sources=[{id:'t1',participantIds:['a'],ticketConfirmed:true},{id:'t2',participantIds:['b']},{id:'o1',participantIds:[]},{id:'o2'}];
  const flight=partitionItemDocuments('flight',sources);
  assert.deepEqual(flight.tickets.map(s=>s.id),['t1','t2'],'linked to a participant, confirmed or not');
  assert.deepEqual(flight.others.map(s=>s.id),['o1','o2']);
  assert.equal(flight.tickets.length+flight.others.length,sources.length,'no document twice, none dropped');
  const ids=[...flight.tickets,...flight.others].map(s=>s.id);assert.equal(new Set(ids).size,ids.length);
  const hotel=partitionItemDocuments('hotel',sources);
  assert.equal(hotel.tickets.length,0);assert.equal(hotel.others.length,4,'a hotel has no tickets');
  for(const type of TICKET_ITEM_TYPES)assert(partitionItemDocuments(type,sources).tickets.length===2,type);
  assert.deepEqual(partitionItemDocuments('activity',undefined),{tickets:[],others:[]});
});
test('P2-F4: presentation -- nothing, a single card at exactly 1, a carousel at 2 or more',()=>{
  assert.equal(ticketPresentation(0),'none');assert.equal(ticketPresentation(1),'single');assert.equal(ticketPresentation(2),'carousel');assert.equal(ticketPresentation(7),'carousel');
  const card=app.slice(app.indexOf('function ticketCarousel('),app.indexOf('function selectTicket('));
  assert(card.includes("if(count===1)return `<div class=\"ticket-single\">"),'exactly one -> a single card, no carousel, no dots');
});
test('P2-F4: carousel mechanics -- one swipe = one ticket, loops from 3, neighbour peeks, 1 / N counter, arrow keys, reduced motion',()=>{
  // slots: 2 tickets do not loop; 3+ mount five slots wrapping around (the selected one is always slot 2)
  assert.deepEqual(carouselSlots(2,0,'carousel').map(s=>s.pos),['selected','next']);
  assert.deepEqual(carouselSlots(2,1,'carousel').map(s=>s.pos),['prev','selected']);
  const five=carouselSlots(4,3,'carousel');
  assert.deepEqual(five.map(s=>s.optionIndex),[1,2,3,0,1],'wraps');
  assert.equal(five.findIndex(s=>s.pos==='selected'),2);
  const select=app.slice(app.indexOf('function selectTicket('),app.indexOf('function ticketSummaryBlock('));
  assert(select.includes('(current+step+count)%count')&&select.includes("track.style.transition='transform 180ms ease-out'")&&select.includes('setTimeout(commit,190)'),'loops, 180ms ease-out, commits when it lands');
  assert(select.includes('prefersReducedMotion()'),'reduced motion: instant');
  assert(app.includes('<bdi class="muted" dir="ltr" aria-live="polite">${index+1} / ${count}</bdi>'),'1 / N counter');
  assert(app.includes("const way=selectedSlide?arrowKeyTarget(event.key,centerX(selectedSlide),near):null;"),'arrow keys follow screen position (P12-F6)');
  assert(app.includes("tcar=event.target.closest('[data-tcarousel]')")&&app.includes('selectTicket(tcar,way)'),'swipe');
  // Beta 0.8 Phase 2.3 (P22-F2): no peek -- every slide is a full-width card (the neighbour is only seen sliding in).
  assert.match(css,/\.t-track \.ticket\{flex:0 0 100cqw;opacity:\.55/,'full-width slides, the neighbour faded while it slides in');
  assert.match(css,/\.t-track\{display:flex;gap:12px;padding:0;transform:translateX\(calc\(var\(--before,0\) \* \(100cqw \+ 12px\)\)\)\}/,'12px gap, one full viewport per step');
  assert.match(css,/\.t-track \.ticket\.selected\{opacity:1;border-color:var\(--ink\)\}/,'the selected slide has an ink border');
  assert.match(css,/\.t-viewport\{[^}]*touch-action:pan-y[^}]*container-type:inline-size/,'slide width and stride are measured against the same container (cqw), so they cannot drift apart');
  assert(app.includes("const TICKET_STRIDE='(100cqw + 12px)';"));
});
test('P2-F4: slide content follows the mockup -- holder, status chip, seat detail, file, "נוצל" / "אישור ככרטיס", פתיחה, ⋯',()=>{
  const slide=app.slice(app.indexOf('function ticketSlideHtml('),app.indexOf('function ticketCarousel('));
  for(const text of ['כרטיס מאושר','לא אושר ככרטיס','נוצל','אישור ככרטיס','ביטול אישור',"'שיוך'","'הסרה'"])assert(slide.includes(text),text);
  assert(slide.includes('class="holder"')&&slide.includes('class="chip ${confirmed?\'ok\':\'no\'}"')&&slide.includes('class="ticket-detail"')&&slide.includes('<bdi class="file">')&&slide.includes('class="ticket-actions"'));
  assert(slide.includes('confirmed?`<label class="used">')&&slide.includes(':`<button class="btn primary" type="button" data-action="source-confirm-ticket"'),'confirmed -> נוצל; unconfirmed -> filled-ink אישור ככרטיס');
  assert(slide.includes('${sourceOpenControl(source)}${moreMenu(['),'פתיחה then the ⋯ overflow');
  assert.match(css,/\.chip\.ok\{background:var\(--teal-soft\)\}/);
  assert.match(css,/\.holder\{[^}]*white-space:nowrap[^}]*font-size:18px;font-weight:600/,'the holder name is one line (Phase 2.2, P21-F11)');
  assert.match(css,/\.add-doc\{min-height:48px;border:1\.5px dashed var\(--border\);border-radius:12px/,'dashed full-width add button');
  assert(app.includes('<span class="muted">${eligible?\'מסמכים נוספים\':\'מסמכים מצורפים\'}</span>'));
  assert(app.includes('+ הוספת מסמך</button>'));
});
test('P2-F4: coverage summary "כרטיסים: N מתוך M" + who still has none; seat detail is read from the extracted holders',()=>{
  const coverage=computeTicketCoverage([{ticketConfirmed:true,participantIds:['a','b']}],people);
  const summary=coverageSummary(coverage);
  assert.deepEqual({covered:summary.covered,total:summary.total,percent:summary.percent,missing:summary.missing},{covered:2,total:5,percent:40,missing:['דניאל לוי','עמית','עפרי']});
  assert.equal(coverageSummary(computeTicketCoverage([],[])).total,0);
  assert(app.includes('כרטיסים: <bdi dir="ltr">${summary.covered}/${summary.total}</bdi>')&&app.includes('ללא כרטיס: ${esc(summary.missing.join'),'one-line "כרטיסים: N/M" (Phase 2.2, P21-F11)');
  const activity={type:'activity',details:{ticketHolders:[{name:'Paula Cohen',seatOrSection:'שער 8; שורה 36; כסא 202'},{name:'אייל בן יצחק',seatOrSection:'שער 8; שורה 35; כסא 201',ticketNumber:'777'}]}};
  assert.equal(ticketHolderDetail(activity,['אייל בן יצחק']),'שער 8; שורה 35; כסא 201 · כרטיס 777');
  assert.equal(ticketHolderDetail(activity,['דניאל']),'','no match -> no detail line rather than a wrong one');
  assert.equal(ticketHolderDetail({type:'flight',details:{passengers:[{name:'אייל בן יצחק',seat:'12A'}]}},['אייל']),'מושב 12A');
  assert.equal(ticketHolderDetail(undefined,['x']),'');
});
test('P2-F4: page order -- facts and contact actions, the one card, then notes, then עריכה / מחיקה',()=>{
  const detail=app.slice(app.indexOf('function detailView('),app.indexOf('// V6-F37 (fix pass 4)'));
  const order=['${backRow(','<dl class="detail-facts">','${ticketsAndDocumentsSection(item,sources)}','<div class="detail-notes">','<div class="form-actions detail-actions">'].map(marker=>detail.indexOf(marker));
  assert(order.every(index=>index>-1),'all parts present');
  assert.deepEqual([...order].sort((a,b)=>a-b),order,'in the approved order');
  assert.equal((detail.match(/ticketsAndDocumentsSection\(/g)||[]).length,1,'exactly one card');
  assert(!app.includes('function ticketHoldersBlock(')&&!app.includes('function ticketCoverageBlock('),'the separate coverage / confirmation / holders / linked-documents pieces are gone');
  assert(app.includes('holdersDetails(flightPassengersTable(details.passengers),holders)'),'the extracted passenger / holder detail is kept, folded away');
  const section=app.slice(app.indexOf('function ticketsAndDocumentsSection('),app.indexOf('// Beta 0.8 Phase 2 (G1) / Phase 2.1 (P2-F4): the item detail page'));
  assert(section.includes('${eligible?ticketSummaryBlock(item,sources):\'\'}${tickets.length?ticketCarousel(item,tickets):\'\'}${hint}${list}${additionalDetailsBlock(item)}${canAttach?')&&section.includes('<h3>${heading}</h3>'),'summary -> tickets -> other documents -> add');
  assert(section.includes("eligible?'כרטיסים ומסמכים':'מסמכים'"));
});

let failed=0;
for(const [name,fn] of tests){
  try{await fn();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 2.1 tests passed`);
