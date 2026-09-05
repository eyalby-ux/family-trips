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

// V6-F26: forcing end=start whenever end-before-start was detected assumed that ordering is
// always an error (true for a Hotel checkout or a Car return). It is NOT true for a Flight:
// arrival can be calendar-earlier than departure in local time (International Date Line/
// timezone crossing, e.g. FL-002), and even a same-day flight's arrival clock-time is routinely
// "less than" its departure clock-time. Forcing them equal there silently destroyed the real
// arrival date/time. Pass allowEndBeforeStart:true for any schedule where that ordering is
// legitimate instead of an input mistake.
export function normalizeDateRange(start,end,{allowEndBeforeStart=false}={}){
  const normalizedStart=String(start||''),normalizedEnd=String(end||'');
  if(allowEndBeforeStart)return {start:normalizedStart,end:normalizedEnd};
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

// Recognizes a 12-hour time with AM/PM (checked first, since a bare 24-hour regex would
// otherwise greedily match just the leading digits of e.g. "2:00 PM" as 02:00). Shared by the
// Hotel and Flight Smart Import pipelines so both parse the same set of real-world time formats
// instead of each maintaining its own narrower copy.
export function parseTimeValue(raw){
  const value=String(raw||'');
  let match=value.match(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*([AaPp])\.?[Mm]\.?/);
  if(match){let hour=Number(match[1])%12;if(/p/i.test(match[3]))hour+=12;return `${String(hour).padStart(2,'0')}:${match[2]}`}
  match=value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(match)return `${match[1].padStart(2,'0')}:${match[2]}`;
  return '';
}

const MONTH_ABBREVIATIONS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
// The Flight schema asks the model for a plain date string but does not force a wire format, so
// a source's own display convention (a spelled month, as literally printed on the THAI e-tickets
// -- "Sat, 23 Jan 2027" -- or a numeric day-first date) can come back unconverted. Accepting only
// strict YYYY-MM-DD then silently produced an empty date for every one of those sources
// (V6-F25/F27/F28): the raw text was correct and visible in the evidence panel, but nothing
// downstream could parse it into the field. This tries the common alternatives before giving up.
export function normalizeFlightDateString(raw){
  const value=String(raw||'').trim();
  if(!value)return '';
  let match=value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if(match&&isValidCalendarDate(`${match[1]}-${match[2]}-${match[3]}`))return `${match[1]}-${match[2]}-${match[3]}`;
  match=value.match(/(\d{1,2})[a-z]{0,2}\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if(match){
    const month=MONTH_ABBREVIATIONS[match[2].toLowerCase().slice(0,3)];
    if(month){const candidate=`${match[3]}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}`;if(isValidCalendarDate(candidate))return candidate}
  }
  match=value.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if(match){
    const day=Number(match[1]),month=Number(match[2]);
    if(month>=1&&month<=12){const candidate=`${match[3]}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;if(isValidCalendarDate(candidate))return candidate}
  }
  return '';
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

// V6-F61: label-doubling / unlocalized-label fix, shared by both Smart Import adapters
// (Hotel/Activity) across all four note-line generation sites (each adapter's own otherFields
// and importantNotes note mappings). Previously this lived only in activity-import-adapter.js
// and was applied to just ONE of its two sites -- Hotel's own byte-identical otherFields
// doubling, and BOTH adapters' importantNotes mapping, were never touched at all, which is very
// likely the actual cause of Eyal's reopened AE-005 evidence ("Payment status: Payment status:
// paid", "Booked by: Booked by: [name]", "Ticket number: Ticket number: 2ZTN-G53R-GJ81P" all
// doubled -- these read as importantNotes entries, not otherFields entries, exactly the
// untouched path). A single shared implementation means a future translation or dedup fix only
// ever has to happen once, at the source, instead of per call site.
export const GENERIC_FIELD_LABELS={
  purchaser:'רוכש',buyer:'רוכש',orderer:'מזמין','purchased by':'רוכש',
  'payment status':'סטטוס תשלום','booked by':'הוזמן על ידי','ticket number':'מספר כרטיס',
};
// V6-F67: stripDuplicateLabelPrefix originally only recognized a value's own embedded prefix when
// it was an exact, case-insensitive literal repeat of THIS field's own label -- it had no concept
// of two different strings meaning the same thing, so a canonical label translated to Hebrew
// (normalizedGenericLabel) and a source-embedded prefix already in a different, synonymous
// phrasing never matched even though a human reads them as the same redundant statement twice
// (confirmed real case: label "Orderer" translates to "מזמין", but the source's own printed
// prefix was "הוזמן על ידי:" -- a different, synonymous Hebrew phrasing of the same "who ordered
// this" concept, already present verbatim as `booked by`'s own translation below, just never
// checked against a DIFFERENT label's synonym group). Each group lists every known phrasing --
// in any language -- that refers to the same underlying concept, so stripDuplicateLabelPrefix can
// recognize a same-meaning prefix regardless of which specific synonym the model chose as this
// field's own label vs. which phrasing the source happened to print.
const LABEL_SYNONYM_GROUPS=[
  ['purchaser','buyer','orderer','purchased by','booked by'],
  ['payment status'],
  ['ticket number'],
];
function synonymGroupFor(key){return LABEL_SYNONYM_GROUPS.find(group=>group.includes(key))}
export function normalizedGenericLabel(label){
  const key=String(label||'').trim().toLowerCase();
  return GENERIC_FIELD_LABELS[key]||label;
}
export function stripDuplicateLabelPrefix(label,rawValue){
  const value=String(rawValue||'');
  const key=String(label||'').trim().toLowerCase();
  // Every phrasing worth checking as a redundant prefix: this field's own literal label (the
  // original V6-F61 exact-duplicate case, kept first so it still wins when both would match),
  // this label's own Hebrew translation, and -- if this label belongs to a known synonym group --
  // every OTHER phrasing in that group plus each one's own translation, so a differently-worded
  // same-concept prefix from a real source (V6-F67) is recognized too.
  const candidates=new Set([String(label||'').trim(),normalizedGenericLabel(label)]);
  const group=synonymGroupFor(key);
  if(group)for(const synonym of group){candidates.add(synonym);candidates.add(normalizedGenericLabel(synonym))}
  for(const candidate of candidates){
    const prefix=`${candidate}:`;
    if(candidate&&value.toLowerCase().startsWith(prefix.toLowerCase()))return value.slice(prefix.length).trim();
  }
  return value;
}

// V6-F69: the URL-vs-file submission-mode decision -- the exact logic that had the bug, since
// analyzeSource (src/smart-import-client.js) never forwarded a url into it at all, hardcoding it
// to '' and making the file-required branch the only possible outcome regardless of what was
// submitted. Extracted here, dependency-free, so it can be executed directly by a regression test:
// smart-import-client.js itself cannot be imported at all under this project's plain-Node test
// harness, since it transitively imports firebase.js, which touches import.meta.env and throws
// immediately outside a Vite build -- confirmed directly (`node -e "import('./src/smart-import-
// client.js')"` fails with "Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')"
// before ever reaching this logic). This was the actual coverage gap: the one prior test touching
// analyzeSource could only ever source-inspect the v5-app.js call-site text, never truly exercise
// this decision.
export function resolveSmartImportSubmissionMode(url,file,allowUrl){
  if(url){
    if(!allowUrl)throw new Error('קישור ציבורי אינו נתמך עבור סוג מקור זה.');
    return 'url';
  }
  if(!file)throw new Error('יש לבחור PDF או תמונה.');
  return 'file';
}

// V6-F71: request()'s error-message resolution (src/smart-import-client.js) previously preferred
// the server's own raw (English) message whenever one was present, which was always, for every
// httpError call site in netlify/functions/smart-import.mjs -- so this Hebrew dictionary was
// effectively dead code for every existing entry, including robots_disallowed, which had been
// reported as "already working" based on the dictionary's mere existence, not on what was actually
// displayed. Fixed precedence: the dictionary is now checked FIRST, by code; serverMessage (the
// raw message the server sent) is used only as a fallback for a code with no Hebrew entry at all.
// Extracted here, dependency-free, for the same reason resolveSmartImportSubmissionMode is above:
// smart-import-client.js cannot be imported at all under this project's plain-Node test harness
// (it transitively imports firebase.js, which touches import.meta.env and throws outside a Vite
// build), so this is the only way a regression test can assert on the actual DISPLAYED text
// (Hebrew, not English) rather than merely confirming a dictionary entry exists.
const SMART_IMPORT_ERROR_MESSAGES={
  not_invited:'החשבון אינו נמצא ברשימת המוזמנים.',
  trip_not_owned:'הטיול אינו בבעלות החשבון הפעיל.',
  daily_quota_exceeded:'מכסת הניתוח היומית הסתיימה.',
  unsupported_source:'סוג המקור אינו נתמך.',
  protected_or_private_url:'הקישור אינו ציבורי או דורש גישה פרטית.',
  robots_disallowed:'האתר חוסם גישה אוטומטית לדף זה (robots.txt). אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.',
  robots_unverifiable:'לא ניתן היה לאמת מראש שהאתר מתיר גישה אוטומטית (robots.txt), וניתוח הדף נכשל. אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.',
  missing_server_configuration:'שירות Smart Import עדיין אינו מוגדר בסביבת הבדיקה.',
};
export function resolveSmartImportErrorMessage(code,status,serverMessage){
  return SMART_IMPORT_ERROR_MESSAGES[code]||serverMessage||`ניתוח המקור נכשל (${status}).`;
}
