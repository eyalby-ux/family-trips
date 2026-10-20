// Beta 0.8.1 quick-fix bundle: P32-F1, P32-F2, documents-list re-link / linkage indicator / hard delete, V7-F14, BL-ICONS-1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {linkageLabels,linkedItemsOf,sourceDeleteMessage} from '../src/documents.js';
import {cloudFailureMessage} from '../src/ui-states.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),spec=read('../docs/design/FAMILYTRIPS_UI_IMPLEMENTATION_DESIGN_SPEC_V7.md');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};

test('P32-F1: the Tasks participant filter gets its own full row and every select leaves room on the chevron side',()=>{
  assert(fn('tasksView').includes('<label class="field filter-wide"><span>משתתף</span><select id="task-filter-participant">'));
  assert.match(css,/\.task-filters \.filter-wide\{grid-column:1 \/ -1\}/);
  assert.match(css,/\.field select\{padding-inline-end:34px;text-overflow:ellipsis\}/);
});

test('P32-F2: the Documents chip row is a scroller that render() rebuilds -- its scroll position is carried across the rebuild',()=>{
  const render=fn('render');
  assert(render.includes("const keepChipScroll=document.querySelector('.doc-filters,.game-filters')?.scrollLeft;"),'read before the DOM is replaced');
  assert(render.includes("const chipRow=document.querySelector('.doc-filters,.game-filters');if(chipRow&&keepChipScroll!==undefined)chipRow.scrollLeft=keepChipScroll;"),'written back after');
  assert(render.indexOf('keepChipScroll')<render.indexOf("document.querySelector('#app').innerHTML=")&&render.indexOf('chipRow.scrollLeft=keepChipScroll')>render.indexOf("document.querySelector('#app').innerHTML="));
  assert(app.includes("else if(action==='doc-filter'){state.docFilter=button.dataset.filter||'all';render()}"),'the selection itself was always kept in state');
});

test('documents list: which item(s) a document is linked to -- names, type when ambiguous, an explicit "not linked"',()=>{
  const hotel={id:'h',type:'hotel',title:'Hyatt',sourceIds:['a','b']},twin={id:'t1',type:'activity',title:'Match',sourceIds:['a']},twin2={id:'t2',type:'hotel',title:'Match',sourceIds:[]};
  const items=[hotel,twin,twin2];
  const label=type=>({hotel:'מלון',activity:'אטרקציה'}[type]||type);
  assert.deepEqual(linkageLabels({id:'b'},items,label),['Hyatt'],'one item: its name');
  assert.deepEqual(linkageLabels({id:'a'},items,label),['Hyatt','Match (אטרקציה)'],'several: every name; the type only where another item shares the name');
  assert.deepEqual(linkageLabels({id:'zzz'},items,label),[],'not linked to anything');
  assert.deepEqual(linkedItemsOf({id:'a'},items).map(item=>item.id),['h','t1']);
  const row=fn('documentRow');
  assert(row.includes('linkageLabels(source,state.items,type=>ITEM_TYPES[type]?.label||type)'));
  assert(row.includes("מקושר ל־${linked.map(name=>`<bdi>${esc(name)}</bdi>`).join('، ')}")&&row.includes('<span class="doc-link none">לא מקושר לפריט</span>'));
  assert(row.includes('<span class="doc-meta">${chip}${notes}</span>${linkLine}'),'on every row, Failed and link rows included');
  assert.match(css,/\.doc-link\{[^}]*overflow-wrap:anywhere/,'several names wrap instead of being cut');
});

test('documents list: "קישור לפריט" re-links a document to an item (a small picker -- there was no existing-document attach flow to reuse)',()=>{
  const row=fn('documentRow');
  assert(row.includes("menuButton('source-link',source,'קישור לפריט')"));
  assert(app.includes("else if(action==='source-link'){state.modal={type:'source-link',sourceId:button.dataset.id};render()}"));
  assert(app.includes("function modal(){if(!state.modal)return '';if(state.modal.type==='source-link')return sourceLinkModal();"));
  const modal=fn('sourceLinkModal');
  assert(modal.includes("filter(item=>!['link','participant'].includes(item.type))")&&modal.includes('(item.sourceIds||[]).includes(source.id)')&&modal.includes('כבר מקושר')&&modal.includes('<form id="source-link-form"'),'items by type; one that already holds the document is disabled');
  const submit=app.slice(app.indexOf("else if(form.id==='source-link-form')"),app.indexOf("else if(form.id==='source-participants-form')"));
  assert(submit.includes('item.sourceIds=[...new Set([...(item.sourceIds||[]),source.id])]'),'adds the id, never duplicates');
  assert(submit.includes('addParticipantsToRecord(item,source.participantIds)')&&submit.includes('save();state.modal=null;render();notify('),'people on a ticket document join the item (add only), saved, confirmed');
});

test('documents list: "מחק" is a true hard delete for every document; its confirmation names what is lost, every linked item and the covered people',()=>{
  const plain={id:'s',name:'IMG-1.jpg'},ticket={id:'t',name:'AE-005.pdf',ticketConfirmed:true,participantIds:['p1','p2']};
  const people=[{id:'p1',name:'פאולה'},{id:'p2',name:'דניאל'},{id:'p3',name:'עמית'}];
  const unlinked=sourceDeleteMessage(plain,[],people);
  assert(unlinked.includes('למחוק את IMG-1.jpg לצמיתות')&&unlinked.includes('ולא ניתן יהיה לשחזר')&&!unlinked.includes('מקושר')&&!unlinked.includes('כיסוי'),'an ordinary document, nothing linked');
  const one=sourceDeleteMessage(plain,[{title:'Hyatt'}],people);
  assert(one.includes('המסמך מקושר לפריט: Hyatt — הקישור יוסר ממנו.'));
  const many=sourceDeleteMessage(plain,[{title:'Hyatt'},{title:'FC Barcelona'}],people);
  assert(many.includes('המסמך מקושר לפריטים: Hyatt, FC Barcelona — הקישור יוסר מכולם.'),'every linked item is named');
  const covered=sourceDeleteMessage(ticket,[{title:'FC Barcelona'},{title:'Camp Nou Tour'}],people);
  assert(covered.includes('מאושר ככיסוי כרטיס עבור פאולה, דניאל — מחיקתו תבטל גם את הכיסוי.')&&covered.includes('FC Barcelona, Camp Nou Tour'),'a confirmed ticket: the stronger warning names the covered people');
  assert(!covered.includes('עמית'),'only the people the ticket covers');
  assert(sourceDeleteMessage({id:'x',ticketConfirmed:true},[],[]).includes('עבור משתתף'),'covered people no longer in the trip');
  const handler=app.slice(app.indexOf("else if(action==='source-delete')"),app.indexOf("notify('המקור נמחק')"));
  assert(handler.includes('confirm(sourceDeleteMessage(source,linkedItemsOf(source,state.items),state.participants))'),'one confirmation, built from the document\'s real links, at every entry point');
  assert(handler.includes('deleteAttachment(source.storagePath)')&&handler.includes('item.sourceIds=item.sourceIds.filter(id=>id!==source.id)')&&handler.includes('state.sources=state.sources.filter(candidate=>candidate.id!==source.id)'),'the stored file, every item link and the record itself go');
  assert(fn('documentRow').includes("menuButton('source-delete',source,'מחק')")&&!fn('documentRow').includes('canDeleteSource'),'offered on every row, a confirmed ticket included');
  assert(fn('ticketSlideHtml').includes("canDeleteSource(source,'')?menuButton('source-delete'"),'the item page\'s ticket slide keeps its own rule (no delete on a confirmed ticket there)');
});

test('V7-F14: a revoked / quarantined account is told its account was removed; everything else keeps the old wording',()=>{
  const denied={code:'permission-denied'};
  assert(cloudFailureMessage(denied,'load').includes('החשבון שלך הוסר מהטיול הזה')&&cloudFailureMessage(denied,'load').includes('אין לו עוד גישה'));
  assert(cloudFailureMessage(denied,'save').includes('החשבון שלך הוסר מהטיול הזה')&&cloudFailureMessage(denied,'save').includes('השינויים לא נשמרים'));
  assert(!/נסו שוב|חיבור/.test(cloudFailureMessage(denied,'load')+cloudFailureMessage(denied,'save')),'no hint of a transient connectivity problem');
  assert.equal(cloudFailureMessage({code:'unavailable'},'save'),'שמירת השינויים בענן נכשלה. השינויים נשארים במסך זה בלבד עד לחיבור מחדש.');
  assert.match(cloudFailureMessage({code:'unavailable'},'load',{online:true}),/טעינת נתוני הטיול נכשלה \(unavailable\)\. נסו שוב\./);
  assert.match(cloudFailureMessage({},'load',{online:false}),/אין חיבור לאינטרנט/);
  assert(app.includes("notify(cloudFailureMessage(error,'save'),error?.code==='permission-denied'?9000:2600)")&&app.includes("notify(cloudFailureMessage(error,'load',{online:navigator.onLine}),error?.code==='permission-denied'?9000:2600)"),'both paths use it; the removal notice stays up long enough to read');
  assert(app.includes('function notify(text,ms=2600)'));
});

test('BL-ICONS-1: Today action buttons are icon + label; a row of 3+ that does not fit switches to icon-only AS A WHOLE; the label stays as the accessible name',()=>{
  const button=app.slice(app.indexOf('const actionButton='),app.indexOf('\n',app.indexOf('const actionButton=')));
  assert(button.includes('class="btn ghost act" ${attributes} aria-label="${label}" title="${label}">${tabler(icon)}<span class="act-label">${label}</span>'));
  const actions=fn('dayItemActions');
  for(const [icon,label] of [['compass','ניווט'],['world','אתר'],['phone','התקשרות'],['ticket','כרטיסים']])assert(actions.includes(`'${icon}','${label}'`),`${label} -> ${icon}`);
  const fit=fn('fitActionRows');
  assert(fit.includes("row.classList.remove('icons-only')")&&fit.includes('buttons.length>=3&&buttons.some(button=>button.scrollWidth>button.clientWidth+1)')&&fit.includes("row.classList.add('icons-only')"),'measured; remove first, so a wider screen goes back to icon + label');
  assert(!/button\.classList\.add/.test(fit),'the class is on the row, never on single buttons -- no mixed rows');
  assert(app.includes("addEventListener('resize',()=>{clearTimeout(fitTimer);fitTimer=setTimeout(fitActionRows,120)})")&&app.includes('document.fonts?.ready?.then(fitActionRows)'),'re-fitted on resize and once the fonts are in');
  assert(fn('render').includes('fitActionRows();'),'after every render');
  assert.match(css,/\.day-item-actions\.icons-only \.act-label\{display:none\}/);
  assert.match(css,/\.day-item-actions \.btn\{flex:1 1 0;min-width:0;min-height:44px;[^}]*overflow:hidden/,'44px targets that can be measured for overflow');
  assert.match(css,/\.day-item-actions\{display:flex;flex-wrap:nowrap/,'one row');
  assert(/icon and label by default/.test(spec)&&/V7\.5/.test(spec),'design spec V7.5 is in the repo');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8.1 tests passed`);
