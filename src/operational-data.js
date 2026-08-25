export const BUILTIN_GAMES=[
  {id:'game-road-story',title:'סיפור בהמשכים',instructions:'כל אחד מוסיף משפט אחד. אסור לבטל פרט שכבר נאמר.',items:'ללא ציוד',participants:'כל המשפחה',duration:'15–30 דקות'},
  {id:'game-20-questions',title:'20 שאלות',instructions:'בוחרים אדם, מקום או חפץ. האחרים שואלים עד 20 שאלות כן/לא.',items:'ללא ציוד',participants:'3 ומעלה',duration:'10–20 דקות'},
  {id:'game-airport-bingo',title:'בינגו שדה תעופה',instructions:'חפשו מזוודה אדומה, מטוס, מדים, מסוע, לוח המראות ושער עלייה.',items:'פתק או טלפון',participants:'2 ומעלה',duration:'15 דקות'},
  {id:'game-thailand-trivia',title:'טריוויה תאילנד',instructions:'כל משתתף שואל שאלה על תאילנד. נקודה על תשובה ונקודה נוספת על עובדה מעניינת.',items:'ללא ציוד',participants:'כל המשפחה',duration:'20 דקות'},
  {id:'game-photo-hunt',title:'ציד תמונות',instructions:'בחרו חמש תמונות לצלם בדרך: שלט מצחיק, אוכל חדש, צבע מסוים, בעל חיים וחיוך משפחתי.',items:'מצלמה',participants:'כל המשפחה',duration:'במהלך היום'},
  {id:'game-who-am-i',title:'מי אני?',instructions:'אדם אחד בוחר דמות. האחרים מגלים אותה בשאלות כן/לא.',items:'ללא ציוד',participants:'3 ומעלה',duration:'10 דקות'},
];

export function normalizeOperationalState(state){
  state.games=Array.isArray(state.games)?state.games:BUILTIN_GAMES.map(game=>({...game,favorite:false}));
  for(const game of BUILTIN_GAMES)if(!state.games.some(item=>item.id===game.id))state.games.push({...game,favorite:false});
  state.tasks=Array.isArray(state.tasks)?state.tasks:[];
  state.shopping=Array.isArray(state.shopping)?state.shopping:[];
  state.locationRecords=Array.isArray(state.locationRecords)?state.locationRecords:[];
  state.packingCollapsed=state.packingCollapsed&&typeof state.packingCollapsed==='object'?state.packingCollapsed:{};
  state.packedCollapsed=state.packedCollapsed!==false;
  state.timelineCursor=state.timelineCursor||state.trip?.startDate||today();
  return state;
}

export function backfillTripDates(items,tripStartDate){
  if(!tripStartDate)return 0;
  let changed=0;
  for(const item of items){
    if(['none','entire'].includes(item.schedule)||item.startAt)continue;
    item.startAt=`${tripStartDate}T12:00`;
    if(item.schedule==='range'&&!item.endAt)item.endAt=`${tripStartDate}T12:00`;
    item.dateMeta={...(item.dateMeta||{}),startPrecision:'date',endPrecision:item.schedule==='range'?'date':item.dateMeta?.endPrecision||'unknown',inferredFromTrip:true};
    changed++;
  }
  return changed;
}

export function tripDurationDays(trip){
  if(!trip?.startDate||!trip?.endDate)return 0;
  return Math.max(1,Math.round((new Date(trip.endDate)-new Date(trip.startDate))/86400000)+1);
}

export function availableTimelineModes(trip){
  const days=tripDurationDays(trip),modes=['all','day'];
  if(days>=8)modes.push('week');
  if(days>=32)modes.push('month');
  return modes;
}

export function periodBounds(mode,cursor){
  const base=new Date(`${cursor||today()}T12:00:00`);
  if(mode==='week'){
    const start=new Date(base);start.setDate(start.getDate()-start.getDay());
    const end=new Date(start);end.setDate(end.getDate()+6);
    return [dateKey(start),dateKey(end)];
  }
  if(mode==='month')return [`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`,dateKey(new Date(base.getFullYear(),base.getMonth()+1,0))];
  return [dateKey(base),dateKey(base)];
}

export function shiftCursor(cursor,mode,direction){
  const date=new Date(`${cursor||today()}T12:00:00`);
  date.setDate(date.getDate()+direction*(mode==='week'?7:mode==='month'?30:1));
  return dateKey(date);
}

export function currentOperational(items,when=today()){
  const sorted=[...items].filter(item=>item.startAt).sort((a,b)=>a.startAt.localeCompare(b.startAt));
  const todayItems=sorted.filter(item=>String(item.startAt).slice(0,10)===when);
  const next=sorted.find(item=>String(item.startAt).slice(0,10)>when);
  const activeEntire=items.filter(item=>item.schedule==='entire');
  const currentHotel=items.find(item=>item.type==='hotel'&&item.startAt&&String(item.startAt).slice(0,10)<=when&&(!item.endAt||String(item.endAt).slice(0,10)>=when));
  const nextTransport=sorted.find(item=>['flight','car'].includes(item.type)&&String(item.startAt).slice(0,10)>=when);
  const critical=items.filter(item=>['insurance','contact'].includes(item.type));
  return {todayItems,next,activeEntire,currentHotel,nextTransport,critical};
}

export function packingDuplicate(packing,name,excludeId=''){
  const normalized=String(name||'').trim().toLocaleLowerCase('he');
  return packing.flatMap(list=>list.items||[]).some(item=>item.id!==excludeId&&String(item.name||'').trim().toLocaleLowerCase('he')===normalized);
}

// Chronological order for a list of items, matching Timeline's own sort. Items without a
// startAt (e.g. schedule 'none'/'entire') are not dropped -- they are kept in a stable position
// at the end, since Array.prototype.sort is a stable sort and the comparator never reorders two
// dateless items relative to each other.
export function sortItemsByStartAt(items){
  return [...items].sort((a,b)=>{
    if(!a.startAt&&!b.startAt)return 0;
    if(!a.startAt)return 1;
    if(!b.startAt)return -1;
    return a.startAt.localeCompare(b.startAt);
  });
}

export function uniqueRecordsById(candidates,limit=Infinity){
  const seen=new Set(),records=[];
  for(const candidate of candidates||[]){
    if(!candidate||candidate.id===undefined||candidate.id===null||seen.has(candidate.id))continue;
    seen.add(candidate.id);
    records.push(candidate);
    if(records.length>=limit)break;
  }
  return records;
}

export function quickAccessTasks(tasks,when=today(),limit=3){
  const open=(tasks||[]).filter(task=>task&&!task.done);
  const rank=task=>{
    if(!task.dueDate)return 3;
    if(task.dueDate<when)return 0;
    if(task.dueDate===when)return 1;
    return 2;
  };
  return open.map((task,index)=>({task,index})).sort((left,right)=>{
    const rankDifference=rank(left.task)-rank(right.task);
    if(rankDifference)return rankDifference;
    const leftDate=left.task.dueDate||'9999-12-31',rightDate=right.task.dueDate||'9999-12-31';
    return leftDate.localeCompare(rightDate)||left.index-right.index;
  }).slice(0,limit).map(entry=>entry.task);
}

export function normalizeDateRange(start,end){
  const normalizedStart=String(start||''),normalizedEnd=String(end||'');
  return {start:normalizedStart,end:normalizedStart&&normalizedEnd&&normalizedEnd<normalizedStart?normalizedStart:normalizedEnd};
}

export function isItemOutsideTrip(item,trip){
  if(!trip?.startDate||!trip?.endDate||['entire','none'].includes(item?.schedule))return false;
  const boundaries=[item?.startAt,item?.endAt].map(value=>String(value||'').slice(0,10)).filter(Boolean);
  return boundaries.some(date=>date<trip.startDate||date>trip.endDate);
}

export function today(){return new Date().toISOString().slice(0,10)}
function dateKey(date){return date.toISOString().slice(0,10)}

// A shape match (\d{4}-\d{2}-\d{2}) is not enough: a datetime-local/date input silently
// sanitizes an unparseable-or-nonexistent date (e.g. 2027-02-30) to an EMPTY field with no
// warning. Shared by the Smart Import date pipeline (V6-F19) and Trip-date handling (V6-F23) so
// neither path can hand a browser date field a value it will silently blank.
export function isValidCalendarDate(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return false;
  const [,y,m,d]=match.map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}

// Validates a Trip's start/end dates before they are ever stored, whatever their origin --
// the native date picker (always well-formed already), or an externally-supplied
// tripContext.startDate/endDate from a QR/JSON import, which was previously stored completely
// unvalidated (V6-F23). A malformed value is rejected to blank rather than stored as-is; Trip
// dates remain optional per the frozen architecture, so blank is always a safe fallback here.
export function sanitizeTripDates(seed={}){
  return {
    startDate:isValidCalendarDate(seed.startDate)?seed.startDate:'',
    endDate:isValidCalendarDate(seed.endDate)?seed.endDate:'',
  };
}
