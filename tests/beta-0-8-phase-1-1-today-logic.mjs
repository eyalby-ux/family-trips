import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Beta 0.8 Phase 1.1 (F3/F6): REAL behavioral tests of Today's leading-item and "next in line"
// rules -- not source-string assertions. Phase 1's own tests only pattern-matched v5-app.js's
// source text, which is exactly how F6 (local item times compared against a UTC "now") and F3
// shipped unnoticed. This file runs the actual selectLeading()/upNextItem()/today() functions, and
// does so in a separate Node process per device timezone (TZ is read at process start), because the
// F6 bug only shows when the device is not on UTC.
const ZONES=['Asia/Jerusalem','Asia/Bangkok','UTC','America/Los_Angeles'];

if(!process.argv.includes('--child')){
  for(const tz of ZONES){
    const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--child'],{env:{...process.env,TZ:tz},encoding:'utf8'});
    if(run.status!==0){
      console.error(run.stdout,run.stderr);
      throw new Error(`Today logic failed under TZ=${tz}`);
    }
    console.log(`PASS: Today logic (selectLeading / upNextItem / today) behaves correctly under TZ=${tz} -- ${run.stdout.trim().split('\n').length} checks`);
  }
  console.log(`ALL PASS: Beta 0.8 Phase 1.1 -- Today's leading card handoff, 3h transport pre-emption, 3h auto-clear, manual end, "next in line" window, and the local-day today(), exercised for real under ${ZONES.join(', ')}.`);
}else{
  const {selectLeading,upNextItem,today}=await import('../src/operational-data.js');
  const checks=[];
  const check=(name,fn)=>{fn();checks.push(name);console.log(name)};
  // Local wall-clock constructors, like the item strings themselves: the same wall-clock scenario
  // must resolve identically in every zone.
  const at=(hour,minute=0,day=4)=>new Date(2026,9,day,hour,minute,0);
  const stamp=(hour,minute=0,day=4)=>`2026-10-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  const item=(id,type,hour,minute=0,extra={})=>({id,type,title:id,startAt:stamp(hour,minute),...extra});
  const tate=item('tate','activity',9),ly087=item('ly087','flight',13,9);
  const ids=list=>list.map(x=>x.id).join(',');

  // --- F6: the exact reported scenario (10:56, Tate Modern 09:00, LY087 13:09) -----------------
  check('F6 10:56: LY087 (2h13 away) pre-empts Tate Modern, which started at 09:00',()=>assert.equal(selectLeading([tate,ly087],at(10,56))?.id,'ly087'));
  check('F6 09:30: Tate Modern is still the leading item ("עכשיו") -- LY087 is 3h39 away',()=>assert.equal(selectLeading([tate,ly087],at(9,30))?.id,'tate'));
  check('F6 exactly 3h before departure (10:09): the transport item takes over',()=>assert.equal(selectLeading([tate,ly087],at(10,9))?.id,'ly087'));
  check('F6 one minute earlier (10:08): the current item still leads',()=>assert.equal(selectLeading([tate,ly087],at(10,8))?.id,'tate'));
  check('F6 after departure (13:30): the flight is the current item and leads',()=>assert.equal(selectLeading([tate,ly087],at(13,30))?.id,'ly087'));
  check('F6 last item of the day auto-clears 3h after its own start (16:08 still leads, 16:10 does not)',()=>{
    assert.equal(selectLeading([tate,ly087],at(16,8))?.id,'ly087');
    assert.equal(selectLeading([tate,ly087],at(16,10)),null);
  });

  // --- F6: handoff between ordinary (non-transport) items --------------------------------------
  const a=item('a','activity',8),b=item('b','activity',12);
  check('F6 before the first item starts, the first item leads',()=>assert.equal(selectLeading([a,b],at(7,0))?.id,'a'));
  check('F6 the current item stays leading until the next one starts (11:59)',()=>assert.equal(selectLeading([a,b],at(11,59))?.id,'a'));
  check('F6 the next item takes over exactly at its own start (12:00)',()=>assert.equal(selectLeading([a,b],at(12,0))?.id,'b'));
  check('F6 an item that started in the past is never treated as "upcoming" because of the UTC offset',()=>{
    // 3h after a's start, b (12:00) is still ahead: a must remain the current item, not be skipped
    // for an item earlier in a UTC-shifted comparison.
    assert.equal(selectLeading([a,b],at(11,0))?.id,'a');
    assert.equal(selectLeading([a,b],at(12,30))?.id,'b');
  });
  check('F6 a transport item pre-empts an ordinary current item, which then drops out of the lead',()=>{
    const dinner=item('dinner','activity',19),transfer=item('transfer','car',20);
    assert.equal(selectLeading([dinner,transfer],at(19,30))?.id,'transfer');
  });
  check('F6 any member of the Transport family pre-empts: flight and car (train/ferry/bus/transfer)',()=>{
    for(const type of ['flight','car'])assert.equal(selectLeading([a,item('t',type,12)],at(10,0))?.id,'t');
  });
  check('F6 a non-transport upcoming item never pre-empts the current one',()=>assert.equal(selectLeading([a,b],at(11,0))?.id,'a'));

  // --- F6: ending an item early (endedAt) -------------------------------------------------------
  check('F6 an ended current item no longer leads; the next item does',()=>assert.equal(selectLeading([{...a,endedAt:'2026-10-04T09:00:00.000Z'},b],at(10,0))?.id,'b'));
  check('F6 ending the last item clears the leading card entirely (calm-day presentation)',()=>assert.equal(selectLeading([{...ly087,endedAt:'x'}],at(13,30)),null));
  check('F6 an ended transport item does not pre-empt',()=>assert.equal(selectLeading([a,{...item('t','flight',12),endedAt:'x'}],at(10,0))?.id,'a'));
  check('F6 nothing today -> no leading item',()=>assert.equal(selectLeading([],at(10,0)),null));

  // --- today(): the device's local calendar day, not the UTC one --------------------------------
  check('today() is the local calendar day for an early-morning local time',()=>assert.equal(today(at(0,30)),'2026-10-04'));
  check('today() is the local calendar day late in the evening',()=>assert.equal(today(at(23,45)),'2026-10-04'));
  check('today() matches the device zone even when UTC is on a different date (the old toISOString().slice bug)',()=>{
    const instant=new Date('2026-10-03T20:00:00Z');
    const expected=new Intl.DateTimeFormat('en-CA',{timeZone:process.env.TZ}).format(instant);
    assert.equal(today(instant),expected);
  });

  // --- F3: the quiet "next in line" line --------------------------------------------------------
  const trip={startDate:'2026-10-01',endDate:'2026-11-01'};
  const now=at(18,0);
  const nextDay=item('nextDay','activity',10);nextDay.startAt=stamp(10,0,5);
  const in64h=item('in64h','activity',10);in64h.startAt=stamp(10,0,7);
  const flightIn5d=item('flight5d','flight',10);flightIn5d.startAt=stamp(10,0,9);
  check('F3 an in-range item tomorrow (within 48h) is the up-next item',()=>assert.equal(upNextItem([nextDay],trip,now)?.id,'nextDay'));
  check('F3 an ordinary item more than 48h away is not shown',()=>assert.equal(upNextItem([in64h],trip,now),null));
  check('F3 a transport item up to 7 days away is shown',()=>assert.equal(upNextItem([flightIn5d],trip,now)?.id,'flight5d'));
  check('F3 a transport item beyond 7 days is not shown',()=>{
    const far=item('far','flight',10);far.startAt=stamp(10,0,12);
    assert.equal(upNextItem([far],trip,now),null);
  });
  check('F3 an out-of-range item is never the up-next item (the Jan 2027 flight / Thai hotel case)',()=>{
    const oor={id:'oor',type:'flight',title:'LY087',startAt:'2027-01-07T22:20'};
    assert.equal(upNextItem([oor],trip,now),null);
    assert.equal(upNextItem([oor,nextDay],trip,now)?.id,'nextDay');
  });
  check('F3 items dated today are never up-next (they belong to Today\'s plan)',()=>assert.equal(upNextItem([item('later','activity',21)],trip,now),null));
  check('F3 an ended item is skipped',()=>assert.equal(upNextItem([{...nextDay,endedAt:'x'}],trip,now),null));
  check('F3 the first in-range item decides: a far ordinary item hides a nearer-than-7-days flight behind it (literal "first item after today" rule)',()=>assert.equal(upNextItem([in64h,flightIn5d],trip,now),null));
  check('F3 chronological order, not input order',()=>assert.equal(ids([upNextItem([flightIn5d,nextDay],trip,now)]),'nextDay'));
}
