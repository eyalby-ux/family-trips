import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Beta 0.8 Phase 1.2 (correction package for the Phase 1.1 NO-GO): behavioral tests of the pure
// rules (planToday's leading/plan/done split, the P11-F8 up-next rule, the P11-F5 un-end rule, the
// P11-F9 short day label) run for real under four device timezones (a child process per zone, since
// TZ is read at process start), plus the participant control's layout/slot/indicator rules, plus
// source wiring for the pieces that only exist in the browser (checked live on qa, see the
// acceptance session). Source-string assertions alone are not enough for the behavior (that gap is
// how F3/F6 shipped in Phase 1), so the logic below calls the real functions.
const ZONES=['Asia/Jerusalem','Asia/Bangkok','UTC','America/Los_Angeles'];

if(process.argv.includes('--child')){
  const {planToday,upNextItem,shouldClearEndedOnEdit,shortDayLabel}=await import('../src/operational-data.js');
  const checks=[];
  const check=(name,fn)=>{fn();checks.push(name);console.log(name)};
  const at=(hour,minute=0,day=4)=>new Date(2026,9,day,hour,minute,0);
  const stamp=(hour,minute=0,day=4)=>`2026-10-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  const item=(id,type,hour,minute=0,extra={})=>({id,type,title:id,startAt:stamp(hour,minute),...extra});
  const ids=list=>list.map(x=>x.id).join(',');

  // --- P11-F1/F7: the leading card, the plan, and the done section ---------------------------------
  const a=item('a','activity',8),b=item('b','activity',12),c=item('c','activity',15),flight=item('flight','flight',13);
  check('F1 the current item leads and is not repeated in the plan; later items are the plan',()=>{
    const p=planToday([a,b,c],at(12,30));
    assert.equal(p.leading?.id,'b');assert.equal(p.current?.id,'b');assert.equal(ids(p.plan),'c');assert.equal(ids(p.done),'a');
  });
  check('F1 an item superseded by a later started item is "passed" and goes to the done section',()=>{
    const p=planToday([a,b],at(12,5));assert.equal(ids(p.done),'a');assert.equal(ids(p.plan),'');
  });
  check('F7 a pre-empted current item stays in the plan (tagged current) while a transport item leads',()=>{
    const p=planToday([a,flight],at(11,0));
    assert.equal(p.leading?.id,'flight');assert.equal(p.current?.id,'a');assert.equal(ids(p.plan),'a');assert.equal(ids(p.done),'');
  });
  check('F7 ending that pre-empted current item moves it to the done section',()=>{
    const p=planToday([{...a,endedAt:'2026-10-04T08:30:00.000Z'},flight],at(11,0));
    assert.equal(ids(p.plan),'');assert.equal(ids(p.done),'a');assert.equal(p.leading?.id,'flight');
  });
  check('F1 a manually ended item moves to the done section (not removed from Today)',()=>{
    const p=planToday([{...a,endedAt:'x'},b],at(9,0));assert.equal(ids(p.done),'a');assert.equal(p.leading?.id,'b');
  });
  check('F1 the last item auto-clears 3h after its start: no leading card, it moves to the done section',()=>{
    assert.equal(planToday([a],at(10,59)).leading?.id,'a');
    const p=planToday([a],at(11,0));assert.equal(p.leading,null);assert.equal(p.current,null);assert.equal(ids(p.done),'a');assert.equal(ids(p.plan),'');
  });
  check('F1 the auto-clear never fires while something upcoming is left to hand off to',()=>{
    const p=planToday([a,c],at(13,0));assert.equal(p.leading?.id,'a');assert.equal(ids(p.plan),'c');
  });
  check('F1 endAt is never consulted: the latest started item stays current past its own endAt',()=>{
    const long=item('long','activity',9,0,{endAt:stamp(10)});
    assert.equal(planToday([long,c],at(12,0)).leading?.id,'long');
  });
  check('F1 ending the current item does not resurrect an earlier, already-passed item as current (found live on qa)',()=>{
    const p=planToday([a,{...b,endedAt:'2026-10-04T12:20:00.000Z'}],at(12,30));
    assert.equal(p.current,null);assert.equal(p.leading,null);assert.equal(ids(p.plan),'');assert.equal(ids(p.done),'a,b');
  });
  check('F1 ...and with something upcoming the upcoming item leads while both earlier items stay in the done section',()=>{
    const p=planToday([a,{...b,endedAt:'x'},c],at(12,30));
    assert.equal(p.leading?.id,'c');assert.equal(ids(p.plan),'');assert.equal(ids(p.done),'a,b');
  });
  check('F1 restoring the ended item (endedAt cleared) makes it current again',()=>{
    const p=planToday([a,{...b,endedAt:''},c],at(12,30));assert.equal(p.leading?.id,'b');assert.equal(ids(p.plan),'c');assert.equal(ids(p.done),'a');
  });
  check('F1 nothing today -> empty split',()=>{
    const p=planToday([],at(10,0));assert.equal(p.leading,null);assert.equal(ids(p.plan),'');assert.equal(ids(p.done),'');
  });
  check('F1 before anything starts, the first item leads and the rest are the plan',()=>{
    const p=planToday([a,b,c],at(7,0));assert.equal(p.leading?.id,'a');assert.equal(ids(p.plan),'b,c');assert.equal(ids(p.done),'');
  });

  // --- P11-F8: "next in line" ----------------------------------------------------------------------
  const trip={startDate:'2026-10-01',endDate:'2026-11-01'};
  const now=at(18,0);
  const day=(id,type,dayOfMonth,hour=10)=>({id,type,title:id,startAt:stamp(hour,0,dayOfMonth)});
  check('F8 the first item within 48h is the up-next item',()=>assert.equal(upNextItem([day('tomorrow','activity',5)],trip,now)?.id,'tomorrow'));
  check('F8 an ordinary item outside 48h, with nothing else, shows nothing',()=>assert.equal(upNextItem([day('later','activity',7)],trip,now),null));
  check('F8 an ordinary item outside 48h no longer hides a transport item within 7 days behind it',()=>assert.equal(upNextItem([day('later','activity',7),day('flight5d','flight',9)],trip,now)?.id,'flight5d'));
  check('F8 when an item within 48h exists it wins over a later flight',()=>assert.equal(upNextItem([day('flight5d','flight',9),day('tomorrow','activity',5)],trip,now)?.id,'tomorrow'));
  check('F8 transport beyond 7 days is not shown, and any non-flight transport type counts as transport',()=>{
    assert.equal(upNextItem([day('far','flight',12)],trip,now),null);
    assert.equal(upNextItem([day('train','car',9)],trip,now)?.id,'train');
  });
  check('F8 out-of-range and ended items are never up-next',()=>{
    assert.equal(upNextItem([{id:'oor',type:'flight',title:'x',startAt:'2027-01-07T22:20'}],trip,now),null);
    assert.equal(upNextItem([{...day('tomorrow','activity',5),endedAt:'x'}],trip,now),null);
  });

  // --- P11-F5: rescheduling an ended item un-ends it ------------------------------------------------
  check('F5 moving the date/time to later than now clears the ended state',()=>assert.equal(shouldClearEndedOnEdit(stamp(9),stamp(21),at(12,0)),true));
  check('F5 moving it earlier than now keeps it ended',()=>assert.equal(shouldClearEndedOnEdit(stamp(9),stamp(10),at(12,0)),false));
  check('F5 an edit that leaves the date/time alone keeps it ended, even if that time is in the future',()=>{
    assert.equal(shouldClearEndedOnEdit(stamp(21),stamp(21),at(12,0)),false);
    assert.equal(shouldClearEndedOnEdit(stamp(9),'',at(12,0)),false);
  });
  check('F5 moving it to another day later than now also clears it',()=>assert.equal(shouldClearEndedOnEdit(stamp(9),stamp(9,0,6),at(12,0)),true));

  // --- P11-F9: the short day label ------------------------------------------------------------------
  check('F9 tomorrow reads "מחר"',()=>assert.equal(shortDayLabel(stamp(10,0,5),at(18,0)),'מחר'));
  check('F9 a later day reads weekday letter + day.month on one line, no year ("ו׳ 9.10")',()=>{
    assert.equal(shortDayLabel(stamp(10,0,9),at(18,0)),'ו׳ 9.10');
    assert.equal(shortDayLabel(stamp(10,0,10),at(18,0)),'ש׳ 10.10');
    assert.ok(!shortDayLabel(stamp(10,0,9),at(18,0)).includes('\n'));
  });
  check('F9 "tomorrow" follows the local calendar, across a month boundary',()=>assert.equal(shortDayLabel('2026-11-01T10:00',new Date(2026,9,31,23,0,0)),'מחר'));
}else{
  for(const tz of ZONES){
    const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--child'],{env:{...process.env,TZ:tz},encoding:'utf8'});
    if(run.status!==0){console.error(run.stdout,run.stderr);throw new Error(`Phase 1.2 logic failed under TZ=${tz}`)}
    console.log(`PASS: Phase 1.2 Today logic (planToday / upNextItem / shouldClearEndedOnEdit / shortDayLabel) under TZ=${tz} -- ${run.stdout.trim().split('\n').length} checks`);
  }

  const {arrowKeyTarget,carouselSlots,participantLayout,positionIndicator,WIDE_FROM_PX,ITEM_WIDTH_PX,GAP_PX,COUNTER_ABOVE}=await import('../src/participant-carousel.js');
  const names=(count,index,layout)=>carouselSlots(count,index,layout).map(s=>s.optionIndex+':'+s.pos).join(' ');
  const t=(name,fn)=>{fn();console.log('PASS: '+name)};

  t('P11-F16 the breakpoint is a measured width: below 768px it is always a carousel, however few participants',()=>{
    assert.equal(WIDE_FROM_PX,768);
    assert.equal(participantLayout({count:2,viewportWidth:375,availableWidth:301}),'carousel');
    assert.equal(participantLayout({count:2,viewportWidth:767,availableWidth:700}),'carousel');
  });
  t('P11-F16 on a wide screen everyone side by side when all fit the measured available width, otherwise a carousel',()=>{
    assert.equal(participantLayout({count:6,viewportWidth:1280,availableWidth:1000}),'row');
    assert.equal(participantLayout({count:11,viewportWidth:1280,availableWidth:1000}),'carousel');
    const exactly=3*ITEM_WIDTH_PX+2*GAP_PX;
    assert.equal(participantLayout({count:3,viewportWidth:900,availableWidth:exactly}),'row');
    assert.equal(participantLayout({count:3,viewportWidth:900,availableWidth:exactly-1}),'carousel');
  });
  t('P11-F14 3+ options mount five slots (selected +-2), wrapping around the ends; the outer two are hidden',()=>{
    assert.equal(names(6,0),'4:far-prev 5:prev 0:selected 1:next 2:far-next');
    assert.equal(names(6,5),'3:far-prev 4:prev 5:selected 0:next 1:far-next');
    assert.deepEqual(carouselSlots(9,4).map(s=>s.hidden),[true,false,false,false,true]);
  });
  t('P11-F16 exactly 2 options: both shown, no loop and no repeats',()=>{
    assert.equal(names(2,0),'0:selected 1:next');assert.equal(names(2,1),'0:prev 1:selected');
    assert.equal(new Set(carouselSlots(2,0).map(s=>s.optionIndex)).size,2);
  });
  t('P11-F16 the row layout lists every option once, only the immediate neighbours get prev/next (no wrap)',()=>{
    assert.equal(names(5,0,'row'),'0:selected 1:next 2:far 3:far 4:far');
    assert.equal(names(5,4,'row'),'0:far 1:far 2:far 3:prev 4:selected');
  });
  t('P11-F17 dots up to 6 options, a "N / total" counter above (7 and more)',()=>{
    assert.equal(COUNTER_ABOVE,6);
    assert.deepEqual(positionIndicator(6,2),{kind:'dots',active:2,count:6});
    assert.deepEqual(positionIndicator(9,3),{kind:'counter',text:'4 / 9'});
    assert.equal(positionIndicator(7,0).kind,'counter');
  });

  // --- P12-F6: the arrow keys follow screen position ---------------------------------------------------
  // Place the mounted slots the way a flex row actually renders them: under dir="rtl" the first item
  // in DOM order sits at the right-hand end, under dir="ltr" at the left-hand end. Slot width 100px.
  const place=(count,index,layout,dir)=>{
    const slots=carouselSlots(count,index,layout).filter(slot=>!slot.hidden);
    const x=(domIndex)=>dir==='rtl'?500-domIndex*100:100+domIndex*100;
    // domIndex counts within the VISIBLE items (the two hidden far slots sit off-screen at each end)
    const selectedAt=x(slots.findIndex(slot=>slot.pos==='selected'));
    return {selectedAt,neighbours:slots.map((slot,domIndex)=>({slot,centerX:x(domIndex)})).filter(item=>item.slot.pos==='prev'||item.slot.pos==='next').map(item=>({pos:item.slot.pos,centerX:item.centerX}))};
  };
  const pressed=(key,placed)=>arrowKeyTarget(key,placed.selectedAt,placed.neighbours);
  const sideOf=(placed,pos)=>Math.sign(placed.neighbours.find(n=>n.pos===pos).centerX-placed.selectedAt);
  t('P12-F6 RTL carousel (3+ options): Right Arrow selects the option rendered to the right (DOM "previous"), Left Arrow the one rendered to the left (DOM "next")',()=>{
    const placed=place(6,2,'carousel','rtl');
    assert.equal(sideOf(placed,'prev'),1,'under RTL the DOM-order previous option renders to the right');
    assert.equal(sideOf(placed,'next'),-1,'and the DOM-order next option renders to the left');
    assert.equal(pressed('ArrowRight',placed),'prev');
    assert.equal(pressed('ArrowLeft',placed),'next');
  });
  t('P12-F6 the keys depend on where things are rendered, not on a fixed prev/next binding: the same rule holds if the layout were left-to-right',()=>{
    const placed=place(6,2,'carousel','ltr');
    assert.equal(pressed('ArrowRight',placed),'next');
    assert.equal(pressed('ArrowLeft',placed),'prev');
  });
  t('P12-F6 every key press, in every position and layout, lands on an option rendered on that key\'s own side',()=>{
    for(const dir of ['rtl','ltr'])for(const [count,layout] of [[3,'carousel'],[6,'carousel'],[9,'carousel'],[2,'carousel'],[5,'row'],[7,'row']])for(let index=0;index<count;index++){
      const placed=place(count,index,layout,dir);
      for(const [key,side] of [['ArrowRight',1],['ArrowLeft',-1]]){
        const target=pressed(key,placed);
        if(target===null){assert.ok(placed.neighbours.every(n=>Math.sign(n.centerX-placed.selectedAt)!==side),`${key} returned nothing although something is rendered on that side (${dir} ${layout} ${count} @${index})`);continue}
        assert.equal(sideOf(placed,target),side,`${key} must select the option rendered on its own side (${dir} ${layout} ${count} @${index})`);
      }
    }
  });
  t('P12-F6 with nothing rendered on a key\'s side (the ends of a 2-option or row layout) the key does nothing',()=>{
    const first=place(2,0,'carousel','rtl'),second=place(2,1,'carousel','rtl');
    assert.equal(pressed('ArrowRight',first),null);assert.equal(pressed('ArrowLeft',first),'next');
    assert.equal(pressed('ArrowLeft',second),null);assert.equal(pressed('ArrowRight',second),'prev');
    assert.equal(arrowKeyTarget('ArrowRight',100,[]),null);
    assert.equal(arrowKeyTarget('ArrowUp',100,[{pos:'next',centerX:50}]),null);
  });

  // --- source wiring for what only exists in the browser ----------------------------------------------
  const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
  const styles=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const version=fs.readFileSync(new URL('../src/app-version.js',import.meta.url),'utf8');
  const fnBody=(name)=>{const start=app.indexOf(`function ${name}(`);let i=start,depth=0,paren=0,begun=false;for(;i<app.length;i++){const ch=app[i];if(ch==='(')paren++;else if(ch===')')paren--;else if(ch==='{'&&paren===0){depth++;begun=true}else if(ch==='}'&&paren===0){depth--;if(begun&&depth===0){i++;break}}}return app.slice(start,i)};
  const todayView=fnBody('todayView'),card=fnBody('dayItemCard'),done=fnBody('doneRow');

  t('P11-F2/F7 a started leading or current item gets the full-width filled-ink "סמן כהסתיים" button and swipe',()=>{
    assert.match(card,/const endable=\(leading\|\|current\)&&itemStartMs\(item\)<=Date\.now\(\);/);
    assert.match(card,/class="end-btn" data-action="item-end"[^>]*>\$\{tabler\('check'\)\} סמן כהסתיים/);
    assert.match(card,/data-swipe-end="\$\{item\.id\}"/);
    assert.match(styles,/\.end-btn\{[^}]*background:var\(--ink\)[^}]*color:#fff/);
    assert.match(styles,/\.day-item-end\{border-top:1px solid var\(--border\)/);
  });
  t('P11-F7 a pre-empted current item in the plan carries the "עכשיו" tag',()=>assert.match(card,/current\?`<bdi class="rel-time">עכשיו<\/bdi>/));
  t('P11-F1 the done section is collapsed, shows "החזר" only for manually ended items, and keeps its open state',()=>{
    assert.match(todayView,/<details class="done-today" \$\{doneTodayOpen\?'open':''\}><summary>הסתיימו היום \(\$\{split\.done\.length\}\)<\/summary>/);
    assert.match(done,/\$\{item\.endedAt\?`<button class="done-row-restore" data-action="item-unend"[^>]*>החזר<\/button>`:''\}/);
    assert.match(app,/addEventListener\('toggle',event=>\{if\(event\.target\.matches\?\.\('\.done-today'\)\)doneTodayOpen=event\.target\.open\},true\)/);
  });
  t('P11-F10 order: plan, then "הבא בתור", then the collapsed done section; the heading swaps when nothing is left',()=>{
    const ret=todayView.slice(todayView.indexOf('return `<section class="card hero">'));
    assert.ok(ret.indexOf('${planBlock}')<ret.indexOf('${upNextBlock}')&&ret.indexOf('${upNextBlock}')<ret.indexOf('${doneBlock}'));
    assert.match(todayView,/const nothingLeft=!leading&&!planItems\.length;/);
    assert.match(todayView,/nothingLeft\?`<div class="today-section-label">הבא בתור<\/div>\$\{upNextLine\(upNext,\{labelled:false\}\)\}`/);
    assert.match(todayView,/const emptyNote=nothingLeft&&!upNext\?/);
  });
  t('P11-F10 the V6 out-of-range fallback is untouched: it still fires only with nothing today and nothing after',()=>assert.match(todayView,/const outOfRange=op\.todayItems\.length\|\|op\.next\?\[\]:/));
  t('P11-F5 the item edit un-ends an ended item rescheduled to later than now',()=>{
    assert.match(app,/const unEnd=item\.endedAt&&shouldClearEndedOnEdit\(item\.startAt,values\.startAt\);/);
    assert.match(app,/if\(unEnd\)item\.endedAt='';/);
  });
  t('P11-F6 swipe-to-end follows the finger and fades, slides out past a third of the width, otherwise snaps back, and respects reduced motion',()=>{
    assert.match(app,/drag\.card\.style\.transform=`translateX\(\$\{dx\}px\)`/);
    assert.match(app,/Math\.abs\(dx\)>width\/3/);
    assert.match(app,/card\.style\.transition='transform 200ms ease-out, opacity 200ms ease-out'/);
    assert.match(app,/card\.style\.height='0';card\.style\.marginBottom='-12px'/);
    assert.match(app,/const reduced=prefersReducedMotion\(\);/);
    assert.match(app,/if\(reduced\)\{endItem\(id\);return\}/);
  });
  t('P11-F14 a selection slides the track one position (180ms ease-out) and only then re-renders; reduced motion selects at once',()=>{
    const select=fnBody('selectParticipant');
    assert.match(select,/track\.style\.transition='transform 180ms ease-out'/);
    assert.match(select,/setTimeout\(\(\)=>commitParticipant\(value,true\),190\)/);
    assert.match(select,/prefersReducedMotion\(\)\)\{commitParticipant\(value,Boolean\(carousel\)\)/);
    assert.match(select,/if\(participantBusy/);
    assert.match(styles,/prefers-reduced-motion: reduce\)\{[\s\S]*\.p-carousel-track/);
  });
  t('P11-F15 every selection re-focuses the selected item so the arrow keys keep working',()=>{
    assert.match(fnBody('commitParticipant'),/if\(refocus\)document\.querySelector\('\.p-carousel-item\.selected'\)\?\.focus\(\{preventScroll:true\}\)/);
    assert.match(app,/else if\(action==='packing-view-participant'\)selectParticipant\(button\.closest\('\[data-carousel\]'\),button\.dataset\.participant\);/);
  });
  t('P12-F6 the keydown handler uses arrowKeyTarget on measured positions; the drag gesture keeps its reading-direction rule untouched',()=>{
    assert.match(app,/const target=arrowKeyTarget\(event\.key,centerX\(selected\),neighbours\);/);
    assert.match(app,/const direction=dx>0\?'next':'prev';/,'dragging right still selects the next option in reading order');
  });
  t('P11-F16 a debounced resize listener re-renders Packing only when the row/carousel decision changes',()=>{
    assert.match(app,/addEventListener\('resize',\(\)=>\{[\s\S]*setTimeout\(\(\)=>\{[\s\S]*currentParticipantLayout\(packingParticipantCount\(\)\)!==lastParticipantLayout\)render\(\);[\s\S]*\},150\);/);
  });
  t('P11-F17 the phone uses the carousel for any participant count (the chips are gone) with a counter above 6',()=>{
    assert.ok(!app.includes('participantChips'));
    assert.match(fnBody('participantCarousel'),/p-carousel-counter/);
    // Found live: under RTL a bare "1 / 7" rendered as "7 / 1"; numbers inside Hebrew text are <bdi>-wrapped (spec §3)
    assert.match(fnBody('participantCarousel'),/<bdi dir="ltr">\$\{indicator\.text\}<\/bdi>/);
  });
  t('P11-F14 the slide distance is measured between item centers, so the faded (scaled) neighbour cannot skew where it lands',()=>{
    assert.match(app,/const centerX=element=>\{const rect=element\.getBoundingClientRect\(\);return rect\.left\+rect\.width\/2\};/);
    assert.match(app,/translateX\(\$\{centerX\(selected\)-centerX\(target\)\}px\)/);
  });
  t('P11-F13 one compact task row serves Quick Access and the Tasks screen; delete moved into the edit screen',()=>{
    const row=app.slice(app.indexOf('function taskRow(task){'),app.indexOf('\n',app.indexOf('function taskRow(task){')));
    assert.ok(row.includes('class="task-compact')&&row.includes('data-action="task-edit"')&&!row.includes('task-delete'));
    assert.ok(fnBody('tasksView').includes('taskRow')&&todayView.includes('tasks.map(taskRow)'));
    assert.match(styles,/\.task-compact\{[^}]*min-height:56px/);
    assert.match(styles,/\.quick-head\{flex-wrap:nowrap/);
  });
  t('P11-F11 a document row wraps its controls under a one-line ellipsised filename; P11-F12 the edit form pins "שמירה"',()=>{
    assert.match(app,/return `<div class="row source-doc-row"><span class="row-main">/);
    assert.match(styles,/\.row\.source-doc-row\{flex-wrap:wrap\}/);
    assert.match(styles,/\.source-doc-row \.row-main b\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/);
    assert.match(fnBody('editModal'),/<div class="form-actions"><button class="btn">שמירה<\/button><\/div>/);
    assert.match(styles,/\.form-actions\{position:sticky;bottom:0/);
  });
  t('P11-F4 the label is Beta everywhere it is generated or parsed, the two together',()=>{
    assert.match(html,/<title>Family Trips · Beta __APP_VERSION__<\/title>/);
    assert.match(html,/content="Family Trips Beta __APP_VERSION__"/);
    assert.match(version,/match\(\/Beta\\s\+\(\[\^\\s·\]\+\)\/\);return match\?`Beta \$\{match\[1\]\}`:'Beta'/);
    assert.ok(!/Alpha/.test(version.replace(/\/\/.*$/gm,'')),'no Alpha left in the parsing code');
  });

  console.log('ALL PASS: Beta 0.8 Phase 1.2 -- done section split, up-next rule, un-end on reschedule, short day label (each under Asia/Jerusalem, Asia/Bangkok, UTC, America/Los_Angeles), participant control layout/slots/indicator rules, and the source wiring for the browser-only pieces (verified live on qa in the acceptance session).');
}
