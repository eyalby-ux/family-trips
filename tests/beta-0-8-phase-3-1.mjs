// Beta 0.8 Phase 3.1 (correction package for the Phase 3 NO-GO): P3-F1, F3 .. F16. Pure logic runs for real; v5-app.js wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeTaskLink,shoppingOwnerLabel} from '../src/operational-data.js';
import {DOC_FILTERS,documentCounts,documentFlags,documentMatchesFilter,documentSummary} from '../src/documents.js';
import {KIND_COLOURS,STAY_HUES,addDays,dayEntries,daysBetween,isStay,monthWeeks,nightStay,ribbonRange,ribbonRows,shiftTimeline,stayHue,stayList,timeText,weekBands} from '../src/timeline-view.js';
import {ITEM_TYPES,ITEM_TYPE_PLURALS} from '../src/ingestion.js';
import {normalizeThaiPua} from '../src/text-normalize.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),html=read('../index.html');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};

test('P3-F1: a favourite is a filled ink star on --teal-soft; a non-favourite is an outline on white',()=>{
  assert.match(css,/\.game-star\.on\{background:var\(--teal-soft\)/);
  assert.match(css,/\.game-star\.on \.ti\{fill:var\(--ink\)\}/);
  assert(fn('gameRow').includes("class=\"game-star ${game.favorite?'on':''}\""));
});

test('P3-F3: the owner chip is the first name of a known participant; a legacy owner stays as saved',()=>{
  const people=[{name:'פאולה כהן'},{name:'אייל בן יצחק'},{name:'דניאל'}];
  assert.equal(shoppingOwnerLabel('פאולה כהן',people),'פאולה');
  assert.equal(shoppingOwnerLabel('אייל בן יצחק',people),'אייל');
  assert.equal(shoppingOwnerLabel('דניאל',people),'דניאל');
  assert.equal(shoppingOwnerLabel('סבתא רחל',people),'סבתא רחל','no participant by that name -> as saved');
  assert.equal(shoppingOwnerLabel('',people),'');assert.equal(shoppingOwnerLabel('shared',people),'');
  assert(fn('shoppingRow').includes('shoppingOwnerLabel(item.owner,state.participants)'));
});

test('P3-F4: a task has notes and a validated link; the row shows the icons; the link opens in the browser',()=>{
  assert.deepEqual(normalizeTaskLink(''),{ok:true,value:''});assert.deepEqual(normalizeTaskLink('   '),{ok:true,value:''});
  assert.equal(normalizeTaskLink('https://example.com/a?b=1').value,'https://example.com/a?b=1');
  assert.equal(normalizeTaskLink('example.com/menu').value,'https://example.com/menu','a bare address gets https://');
  assert.equal(normalizeTaskLink('http://example.co.il').ok,true);
  for(const bad of ['not a link','javascript:alert(1)','ftp://example.com','http://nodot','https://','mailto:a@b.co'])assert.equal(normalizeTaskLink(bad).ok,false,bad);
  const form=app.slice(app.indexOf('function simpleFormModal'),app.indexOf("if(type==='shopping')"));
  assert(form.includes('<textarea name="notes"')&&form.includes('<input name="link" type="text" inputmode="url" dir="ltr"'));
  assert(form.includes('class="fact-link fact-underline task-link-open" href="${esc(task.link)}" target="_blank" rel="noopener"')&&form.includes('<bdi dir="ltr">${esc(task.link)}</bdi>'),'the link opens from the task screen, LTR');
  assert(app.includes("const link=normalizeTaskLink(data.get('link'));")&&app.includes("if(!link.ok){const error=form.querySelector('#task-link-error');if(error)error.hidden=false;")&&app.includes('id="task-link-error" role="alert" hidden')&&!app.includes("notify('הקישור אינו תקין")&&app.includes("notes:String(data.get('notes')||'').trim(),link:link.value"),'validated before saving');
  const row=fn('taskRow');
  assert(row.includes('class="task-link" href="${esc(task.link)}" target="_blank" rel="noopener"')&&row.includes("tabler('link')")&&row.includes("tabler('notes')")&&row.includes('task.notes?'));
});

test('P3-F5: done tasks move to "הושלמו (N)" at the bottom; the status filter still works',()=>{
  const view=fn('tasksView');
  assert(view.includes('const openTasks=filtered.filter(task=>!task.done),doneTasks=filtered.filter(task=>task.done);'));
  assert(view.includes('<details class="tasks-done" ${state.tasksDoneCollapsed?\'\':\'open\'}><summary>הושלמו (${doneTasks.length})</summary>'));
  assert(view.indexOf('openTasks.map(taskRow)')<view.indexOf('doneTasks.map(taskRow)'),'open first, done last');
  assert(view.includes("const statusOptions=[['all','כל המשימות'],['open','משימות פתוחות בלבד']];"),'the status filter is unchanged');
});

test('P3-F6: Noto Sans Thai follows Heebo in the font links and in every font stack',()=>{
  assert.match(html,/family=Heebo:wght@400;600;700&family=Noto\+Sans\+Thai:wght@400;600;700&display=swap/);
  for(const file of ['../src/styles.css','../src/v4.css','../src/foundation.css']){
    const text=read(file);
    assert(!/Heebo,Arial,sans-serif/.test(text),`${file}: a Heebo stack without the Thai fallback`);
  }
  assert(css.includes('font-family:Heebo,"Noto Sans Thai",Arial,sans-serif'));
});

test('P3-F6 (root cause): legacy Thai Private Use glyphs from PDFs map back to the standard marks, in extraction and in everything rendered',()=>{
  const broken='พันวารยีรี'.replace('','')+'สอรต';
  assert.equal(normalizeThaiPua('รีสอรต'),'รีสอร์ต','F70E is the thanthakhat -> รีสอร์ต');
  assert.equal(normalizeThaiPua('กา'),'ก้า');assert.equal(normalizeThaiPua(''),'ิ');assert.equal(normalizeThaiPua(''),'ฺ');
  assert.equal(normalizeThaiPua('Hyatt Regency שלום 123'),'Hyatt Regency שלום 123','everything else is untouched');
  assert.equal(normalizeThaiPua(undefined),'');assert.equal(normalizeThaiPua(5),'5');
  assert(!/[-]/.test(normalizeThaiPua(broken)));
  assert(app.includes("function esc(value=''){return normalizeThaiPua(value).replace("),'every rendered string');
  assert(read('../src/content-extraction.js').includes('normalizeThaiPua(item.str || \'\')'),'text pulled out of a PDF');
});

test('P3-F7 / F9 / F11: one compact participant row -- name opens the editor, status line carries the reason, small toggle + bin; the add button is in the header',()=>{
  const row=fn('participantRow');
  assert(!row.includes('>עריכה<'),'no "עריכה" button');
  assert(row.includes('class="participant-main" type="button" data-action="participant-edit"'),'tapping the name area edits');
  assert(row.includes("assigned?`לא ניתן למחוק (${assigned===1?'שיוך אחד':`${assigned} שיוכים`})`:''"),'the reason is part of the row\'s own status line');
  assert(row.includes('class="bin-btn blocked" type="button" disabled aria-disabled="true"'));
  assert(!row.includes('participant-note'),'nothing below the card');
  assert.match(css,/\.bin-btn\.blocked\{border:0;background:#F2EEE9/);assert.match(css,/\.bin-btn\.blocked \.ti\{stroke:#B9B1AA\}/);
  assert.match(css,/\.participant-row\{display:flex;align-items:center;gap:6px;min-height:64px/);
  const section=fn('participantsSection');
  assert(section.includes('<div class="section-head"><h2>משתתפים</h2><button class="btn ghost small-btn" type="button" data-action="participant-add">')&&!section.includes('</div></section>')===false);
  assert(section.indexOf('data-action="participant-add"')<section.indexOf('participants.map(participantRow)'),'the add button is above the list');
});

test('P3-F8: a destination is one row (name + up, down, bin); the add row is the field plus a small outline "+ הוספה"',()=>{
  const section=fn('destinationsSection');
  assert(section.includes('data-action="destination-move-up"')&&section.includes('data-action="destination-move-down"')&&section.includes('data-action="destination-remove"'));
  assert(section.includes("${index===0?'disabled aria-disabled=\"true\"':''}")&&section.includes("${index===countries.length-1?'disabled aria-disabled=\"true\"':''}"),'first up / last down are disabled');
  assert(section.includes('aria-label="הזזה למעלה"')&&section.includes('aria-label="הזזה למטה"')&&section.includes('aria-label="הסרה"'));
  assert(section.includes('<form id="destination-add-form" class="inline-add"><input name="country"')&&section.includes('class="btn ghost small-btn" type="submit">${tabler(\'plus\')} הוספה</button>'));
  assert.match(css,/\.destination-row\{display:flex;align-items:center;[^}]*min-height:52px/);
  assert.match(css,/\.icon-btn-plain\{[^}]*width:44px;height:44px/);
  assert.match(css,/\.inline-add input\{[^}]*min-height:44px/);assert.match(css,/\.small-btn\{min-height:44px/,'the add button is the same 44px height');
});

test('P3-F10: the Today card\'s time column and action row start at the same right edge',()=>{
  assert.match(css,/\.day-item-time\{align-items:flex-start;padding:12px 2px 12px 4px;padding-inline-start:12px\}/);
  assert.match(css,/\.day-item-actions \{?[^}]*padding:0 12px 12px|\.day-item-actions\{[^}]*padding:0 12px 12px/,'the action row keeps the 12px content edge');
});

test('P3-F12: every e-mail is one LTR line in a row of its own with a short "הסרה"; invite = field + "הזמנה"',()=>{
  assert(app.includes('function accessRow(email,{chip=\'\',action=\'\',note=\'\'}={}){'));
  assert(app.includes('<button class="btn ghost small-btn access-remove" type="button" data-action="${action}" data-email="${esc(email)}" aria-label="ביטול הרשאה ל-${esc(email)}">הסרה</button>'));
  assert(app.includes('<form id="${id}" class="invite-form">')&&app.includes('<input id="${id}-email" type="email" name="email" dir="ltr" required placeholder="name@example.com"><button class="btn ghost small-btn" type="submit">הזמנה</button>'));
  assert(fn('sharingSection').includes("accessRow(email,{action:accessRemove('remove-editor',email)})")&&fn('adminView').includes("accessRemove('admin-revoke',invitation.email)")&&fn('adminView').includes('<span class="badge blue">מנהל</span>'));
  assert(fn('sharingSection').includes("inviteForm('add-editor-form'")&&fn('adminView').includes("inviteForm('admin-invite-form'"));
  assert.match(css,/\.access-email bdi\{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  assert.match(css,/\.access-remove\{white-space:nowrap/);assert.match(css,/\.access-row\{[^}]*min-height:56px/);
  assert(app.includes("else if(action==='email-expand'){button.classList.toggle('expanded')}")&&css.includes('.access-email.expanded bdi{white-space:normal'),'tap shows the full address');
});

test('P3-F13: the document list -- filters with counts, ~60px rows, a "⋯" menu without "מחק" on a confirmed ticket',()=>{
  assert.deepEqual(DOC_FILTERS.map(([,label])=>label),['הכול','ממתין לאישור','מצורף','לא משויך','כרטיסים','קישורים','נכשל']);
  const items=[{sourceIds:['a','t','tc']},{sourceIds:['pend']}];
  const suggestions=[{status:'pending',sourceId:'pend'},{status:'accepted',sourceId:'a'},{status:'deferred',sourceIds:['d']}];
  const sources=[{id:'a'},{id:'t',participantIds:['p1']},{id:'tc',ticketConfirmed:true,participantIds:['p1']},{id:'pend'},{id:'loose'},{id:'l',kind:'link'},{id:'f'},{id:'d'}];
  const entries=sources.map(source=>({source,flags:documentFlags(source,{items,suggestions,stateName:source.id==='f'?'failed':''})}));
  const by=id=>entries.find(entry=>entry.source.id===id).flags;
  assert.equal(by('a').attached,true);assert.equal(by('a').pending,false,'an accepted proposal is not pending');
  assert.equal(by('t').ticket,true,'attached + people = a ticket document');assert.equal(by('tc').ticket,true);
  assert.equal(by('pend').pending,true);assert.equal(by('d').pending,true,'a deferred proposal is still waiting');
  assert.equal(by('loose').unassigned,true);assert.equal(by('a').unassigned,false);assert.equal(by('t').unassigned,false);
  assert.equal(by('l').link,true);assert.equal(by('f').failed,true);
  const counts=documentCounts(entries);
  assert.deepEqual(counts,{all:8,pending:2,attached:4,unassigned:4,tickets:2,links:1,failed:1});
  assert.equal(documentMatchesFilter(by('tc'),'tickets'),true);assert.equal(documentMatchesFilter(by('tc'),'links'),false);assert.equal(documentMatchesFilter(by('tc'),'bogus'),true,'an unknown filter shows everything');
  assert.equal(documentSummary({all:14,pending:3}),'14 מסמכים · 3 ממתינים לאישור');assert.equal(documentSummary({all:1,pending:1}),'מסמך אחד · אחד ממתין לאישור');assert.equal(documentSummary({all:5,pending:0}),'5 מסמכים');
  const row=fn('documentRow');
  assert(row.includes('<bdi class="doc-name" dir="ltr">')&&row.includes('class="doc-main"')&&row.includes('moreMenu([menu])'));
  assert(row.includes("canDeleteSource(source,stateName)?menuButton('source-delete',source,'מחק'):''")&&row.includes("menuButton('source-edit-participants',source,'שיוך למשתתף')"),'no "מחק" for a confirmed ticket');
  assert(row.includes("importStatusPill(stateName,{actions:failedActions})"),'a Failed source keeps retry / delete in its pill');
  const page=fn('documentsCategory');
  assert(page.includes('data-action="doc-filter"')&&page.includes('aria-pressed="${filter===key}"')&&page.includes('data-filter="all">הצגת הכול'),'single-select chips with counts and an empty state');
  assert(page.includes('${ITEM_TYPE_PLURALS.document}')&&page.includes("${tabler('plus')} ${ITEM_TYPES.document.label}"),'one-line header with "+ מסמך"');
  assert(app.includes("if(state.category==='document')return documentsCategory();")&&app.includes("else if(action==='doc-filter'){state.docFilter=button.dataset.filter||'all';render()}"));
  assert.match(css,/\.doc-row\{[^}]*min-height:60px/);assert.match(css,/\.doc-filters\{display:flex;gap:6px;overflow-x:auto/);
});

test('P3-F14: the check is drawn on "אישור"; "מחק" in a menu is set apart (divider, terracotta, bin)',()=>{
  assert.match(css,/\.btn\.primary \.ti\{stroke:#fff\}/,'the check was ink on ink');
  assert(fn('ticketSlideHtml').includes("${tabler('check')} אישור</button>"));
  const helper=app.slice(app.indexOf('const menuButton='),app.indexOf('\n};',app.indexOf('const menuButton='))+3);
  assert(helper.includes("const danger=action==='source-delete';")&&helper.includes('<div class="t-menu-sep" role="separator"></div>')&&helper.includes("tabler('trash')")&&helper.includes('t-menu-item${danger?\' danger\':\'\'}'));
  assert.match(css,/\.t-menu-item\.danger\{[^}]*color:#A4442A/);assert.match(css,/\.t-menu-item\.danger \.ti\{stroke:#A4442A\}/);assert.match(css,/\.t-menu-sep\{height:1px/);
});

test('P3-F15 logic: month grid, stay bands, day entries, the night, the ribbon, the arrows',()=>{
  // October 2026 starts on a Thursday (Sunday-first grid -> 4 blanks)
  const weeks=monthWeeks(2026,9);
  assert.equal(weeks.length,5);assert.equal(weeks[0].filter(day=>day===null).length,4);assert.equal(weeks[0][4],'2026-10-01');assert.equal(weeks[4][6],'2026-10-31');
  assert(weeks.every(week=>week.length===7));
  const hyatt={id:'h1',type:'hotel',title:'Hyatt',schedule:'range',startAt:'2026-10-05T15:00',endAt:'2026-10-07T11:00'};
  const ban={id:'h2',type:'hotel',title:'Ban',schedule:'range',startAt:'2026-10-15T14:00',endAt:'2026-10-20T11:00'};
  const flight={id:'f1',type:'flight',title:'LY087',schedule:'single',startAt:'2026-10-14T23:38'};
  const game={id:'a1',type:'activity',title:'Match',schedule:'single',startAt:'2026-10-09T15:00'};
  const dinner={id:'r1',type:'restaurant',title:'Dinner',schedule:'single',startAt:'2026-10-09'};
  const insurance={id:'i1',type:'insurance',title:'Ins',schedule:'entire'};
  const items=[ban,flight,hyatt,game,dinner,insurance];
  assert.equal(isStay(hyatt),true);assert.equal(isStay(flight),false);assert.equal(isStay({schedule:'range',startAt:'2026-10-05',endAt:'2026-10-05'}),false,'one-day range is not a stay');
  const stays=stayList(items);assert.deepEqual(stays.map(stay=>stay.id),['h1','h2']);
  assert.notEqual(stayHue(stays,hyatt),stayHue(stays,ban));assert(STAY_HUES.includes(stayHue(stays,hyatt)));
  // bands: Hyatt 5-7 Oct sits in week 2 (Sun 4 .. Sat 10) at columns 2-4, rounded at both ends
  const bands=weekBands(stays,weeks[1]);
  assert.deepEqual(bands.map(band=>[band.stay.id,band.start,band.end,band.roundStart,band.roundEnd]),[['h1',2,4,true,true]]);
  // Ban 15-20 Oct: week of 11-17 (cols 5-7, starts here, continues), week of 18-24 (cols 1-3, continues in, ends here)
  assert.deepEqual(weekBands(stays,weeks[2]).map(band=>[band.start,band.end,band.roundStart,band.roundEnd]),[[5,7,true,false]]);
  assert.deepEqual(weekBands(stays,weeks[3]).map(band=>[band.start,band.end,band.roundStart,band.roundEnd]),[[1,3,false,true]]);
  assert.deepEqual(weekBands(stays,weeks[4]),[]);
  assert.deepEqual(weekBands(stays,weeks[0]),[]);
  // entries: check-in / check-out and single items, sorted, date-only first
  assert.deepEqual(dayEntries(items,'2026-10-05').map(entry=>[entry.item.id,entry.role,entry.time]),[['h1','in','15:00']]);
  assert.deepEqual(dayEntries(items,'2026-10-07').map(entry=>[entry.item.id,entry.role,entry.time]),[['h1','out','11:00']]);
  assert.deepEqual(dayEntries(items,'2026-10-09').map(entry=>[entry.item.id,entry.time]),[['r1',''],['a1','15:00']],'no time first, then by time');
  assert.deepEqual(dayEntries(items,'2026-10-06'),[],'a stay\'s middle day has no entries of its own');
  assert.equal(dayEntries(items,'2026-10-01').length,0);
  assert.equal(timeText('2026-10-05T15:00'),'15:00');assert.equal(timeText('2026-10-05'),'');
  // the night
  assert.deepEqual(nightStay(stays,'2026-10-06'),{stay:hyatt,night:2,nights:2});assert.equal(nightStay(stays,'2026-10-05').night,1);
  assert.equal(nightStay(stays,'2026-10-07'),null,'the check-out night is not slept there');assert.equal(nightStay(stays,'2026-10-09'),null);
  // the ribbon
  const week=ribbonRows(items,stays,'2026-10-04','2026-10-10');
  assert.equal(week.length,7);assert.deepEqual(week[1].covering.map(c=>c.position),['start']);assert.deepEqual(week[2].covering.map(c=>c.position),['mid']);assert.deepEqual(week[3].covering.map(c=>c.position),['end']);
  const all=ribbonRows(items,stays,'2026-10-01','2026-10-12',{collapse:true});
  assert.deepEqual(all[0],{collapsed:true,from:'2026-10-01',to:'2026-10-04',count:4},'1-4 Oct collapse');
  assert(all.every((row,index)=>row.collapsed?row.count>=2:row.entries.length||row.covering.length||!(all[index+1]&&!all[index+1].collapsed&&!all[index+1].entries.length&&!all[index+1].covering.length)),'empty runs of 2+ days always collapse; a single empty day stays a row');
  assert.equal(ribbonRows(items,stays,'2026-10-01','2026-10-02',{collapse:true,minRun:3}).length,2,'a short empty run stays as rows');
  assert.deepEqual(ribbonRange('week','2026-10-07',null),['2026-10-04','2026-10-10']);
  assert.deepEqual(ribbonRange('month','2026-10-07',null),['2026-10-01','2026-10-31']);
  assert.deepEqual(ribbonRange('all','2026-10-07',{startDate:'2026-10-01',endDate:'2026-11-01'}),['2026-10-01','2026-11-01']);
  // arrows move by the mode's unit
  assert.equal(shiftTimeline('2026-10-09','day',1),'2026-10-10');assert.equal(shiftTimeline('2026-10-09','week',-1),'2026-10-02');
  assert.equal(shiftTimeline('2026-10-09','month',1),'2026-11-01');assert.equal(shiftTimeline('2026-12-09','all',1),'2027-01-01');assert.equal(shiftTimeline('2026-01-31','month',-1),'2025-12-01');
  assert.equal(addDays('2026-10-31',1),'2026-11-01');assert.equal(daysBetween('2026-10-05','2026-10-07'),2);
  assert.equal(KIND_COLOURS.flight,'#123F42');
});

test('P3-F15 wiring: mode control, calendar on top, day agenda / ribbon below, aligned columns',()=>{
  const view=fn('timeline');
  assert(view.indexOf('${control}${timelineCalendar(items,stays)}')>0&&view.includes("state.timelineMode==='day'?tlDayView(items,stays):tlRibbon(items,stays)"),'the calendar is always shown, above the view');
  assert(app.includes("const TL_MODES=[['day','יום'],['week','שבוע'],['month','חודש'],['all','כל הטיול']];"));
  assert(view.includes('aria-pressed="${state.timelineMode===mode}"'));
  const calendar=fn('timelineCalendar');
  assert(calendar.includes('weekBands(stays,week)')&&calendar.includes('class="tl-band')&&calendar.includes('class="tl-legend"')&&calendar.includes("${isToday?'today':''}")&&calendar.includes("${chosen?'chosen':''}")&&calendar.includes('shaded'),'bands, legend, today ring, chosen day, shaded week');
  assert(calendar.includes('data-action="calendar-date"'),'tapping a day opens it in יום');
  const day=fn('tlDayView');
  assert(day.includes('class="ag-time')&&day.includes('dir="ltr"')&&day.includes('class="ag-line"')&&day.includes('ag-card')&&day.includes('לינה')&&day.includes('ללא לינה מתוכננת')&&day.includes('relativeTimeLabel(item.startAt)'),'time column, dot + line, cards, tonight, the next item');
  const ribbon=fn('tlRibbon');
  assert(ribbon.includes('class="rb-time" dir="ltr"')&&ribbon.includes('אין תוכניות')&&ribbon.includes('ימים ללא תוכניות')&&ribbon.includes('collapse:mode===\'all\'')&&ribbon.includes('יום חופשי'));
  assert.match(css,/\.ag-time\{[^}]*font-variant-numeric:tabular-nums;text-align:left/);assert.match(css,/\.tl-agenda\{display:grid;grid-template-columns:50px 14px minmax\(0,1fr\)/);
  assert.match(css,/\.rb-row\{display:grid;grid-template-columns:56px 22px minmax\(0,1fr\)/);assert.match(css,/\.rb-time\{width:40px;flex:0 0 40px;font-variant-numeric:tabular-nums;text-align:left\}/);
  assert.match(css,/\.tl-modes button\[aria-pressed="true"\]\{background:var\(--ink\);color:#fff\}/);assert.match(css,/\.tl-cell\{min-height:44px/);
  assert(app.includes("state.timelineCursor=shiftTimeline(state.timelineCursor,state.timelineMode,Number(button.dataset.dir))"));
});

test('S9 audit (3.1): chip text is ink, the back arrow keeps 44px',()=>{
  assert.match(css,/\.badge\.blue\{color:var\(--ink\)\}/);
  assert.match(css,/\.detail-top \.back-btn\{flex:0 0 auto;min-width:44px\}/);
});

test('P3-F16: plural tile and category titles, singular chip, a small "+ type" in the header row, no bottom "הוספה"',()=>{
  assert.deepEqual(ITEM_TYPE_PLURALS,{flight:'טיסות',hotel:'מלונות',car:'תחבורה',activity:'אטרקציות',restaurant:'מסעדות',insurance:'ביטוחים',contact:'אנשי קשר',document:'מסמכים'});
  assert.equal(ITEM_TYPES.hotel.label,'מלון','the type chip on a single item stays singular');
  assert(app.includes('<b>${ITEM_TYPE_PLURALS[key]||type.label}</b>'),'plural tiles');
  const center=fn('center');
  assert(center.includes("${tabler('plus')} ${ITEM_TYPES[state.category]?.label||''}</button>")&&center.includes('ITEM_TYPE_PLURALS[state.category]'),'plural title, "+ <singular type>" beside it');
  assert(!center.includes('<div class="actions"><button class="btn" data-action="create">הוספה</button></div>'),'no bottom "הוספה"');
  assert(fn('detailView').includes('detailBadgeLabel'),'the item page chip is the singular label');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8 Phase 3.1 tests passed`);
