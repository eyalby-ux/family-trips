export const BUILTIN_GAMES=[
  {id:'game-road-story',title:'סיפור בהמשכים',instructions:'כל אחד מוסיף משפט אחד. אסור לבטל פרט שכבר נאמר.',items:'ללא ציוד',participants:'כל המשפחה',duration:'15–30 דקות'},
  {id:'game-20-questions',title:'20 שאלות',instructions:'בוחרים אדם, מקום או חפץ. האחרים שואלים עד 20 שאלות כן/לא.',items:'ללא ציוד',participants:'3 ומעלה',duration:'10–20 דקות'},
  {id:'game-airport-bingo',title:'בינגו שדה תעופה',instructions:'חפשו מזוודה אדומה, מטוס, מדים, מסוע, לוח המראות ושער עלייה.',items:'פתק או טלפון',participants:'2 ומעלה',duration:'15 דקות'},
  {id:'game-thailand-trivia',title:'טריוויה תאילנד',instructions:'כל משתתף שואל שאלה על תאילנד. נקודה על תשובה ונקודה נוספת על עובדה מעניינת.',items:'ללא ציוד',participants:'כל המשפחה',duration:'20 דקות'},
  {id:'game-photo-hunt',title:'ציד תמונות',instructions:'בחרו חמש תמונות לצלם בדרך: שלט מצחיק, אוכל חדש, צבע מסוים, בעל חיים וחיוך משפחתי.',items:'מצלמה',participants:'כל המשפחה',duration:'במהלך היום'},
  {id:'game-who-am-i',title:'מי אני?',instructions:'אדם אחד בוחר דמות. האחרים מגלים אותה בשאלות כן/לא.',items:'ללא ציוד',participants:'3 ומעלה',duration:'10 דקות'},
];

// 0.7.2: Firestore subcollection sync logic, extracted here (dependency-free) rather than left
// inline in cloud-store.js, for the same reason resolveSmartImportSubmissionMode/
// resolveSmartImportErrorMessage already live here -- cloud-store.js imports firebase.js, which
// touches import.meta.env and throws immediately outside a Vite build, so nothing in cloud-store.js
// can be exercised directly under this project's plain-Node test harness. diffById is the one
// genuinely pure, deterministic piece of that module's logic (everything else is a real Firestore/
// Storage call), so it's the one worth a real function-level test rather than only source-inspection.
// 0.7.4: participants added -- a genuinely separate collection from `items`, not a repurposing of
// the existing `participant` ITEM_TYPE. Verified before deciding, not assumed: `participant` was
// already a full ITEM_TYPES/TYPE_FIELDS entry (['phone','notes']) -- selectable in the manual
// create-type dropdown and its own Trip Center tile (only 'link'/'document' were ever excluded) --
// meaning generic type:'participant' items may already exist server-side beneath the missing UI,
// exactly the gap this candidate's kickoff asked to check rather than assume clean. That existing
// stub is a poor fit for what real participant management needs (role, avatar, active/inactive
// status, item/ticket/packing relationships -- none of which the generic Item shape has any concept
// of, and forcing them in would pollute it for every unrelated type) and reads as leftover
// scaffolding from before the V24 decision moved participant management out of Trip Center into
// Trip Settings. Decision: build participants as their own collection; keep the old
// ITEM_TYPES.participant entry defined (so any already-existing legacy item renders its icon/label
// correctly rather than becoming visually orphaned) but remove it from the create-type dropdown and
// Trip Center's own tile grid (see proposalFields()/center() in v5-app.js) so no NEW one can be
// created through the old path and no Trip Center UI advertises it -- satisfying "no standalone
// Trip Center participant UI" without risking any already-real legacy data silently disappearing.
export const SYNCED_COLLECTIONS=[
  ['items','items'],['sources','sources'],['suggestions','suggestions'],
  ['rejectedSuggestions','rejectedSuggestions'],['tasks','tasks'],['packing','packingLists'],
  ['shopping','shopping'],['locationRecords','locationRecords'],['games','games'],['participants','participants'],
];
// 0.7.4: destinationCountries added -- an ordered array of country names, per MVP scope's binding
// "Destination Countries as an ordered list of one or more countries" (Trip Settings requirement).
// Trip-level like name/startDate/endDate, not its own subcollection -- one Trip has one ordered
// list, not a per-record relationship needing individual document identity.
export const TRIP_NESTED_FIELDS=['name','startDate','endDate','createdAt','destinationCountries'];
export const TRIP_TOP_LEVEL_FIELDS=['timelineCursor','packedCollapsed','packingCollapsed','shoppingPurchasedCollapsed'];
// Diffs `next` (an array of {id,...}) against `previous` (the same shape, or undefined/null on a
// first sync) and returns {toCreate:[fullRecord,...], toUpdate:[{id,changedFields,deletedFields},...],
// toDelete:[id,...]} -- only what actually changed, by id, and at FIELD granularity for a record that
// already existed, not just "this record differs". A record missing an id is skipped (never written,
// never deleted) rather than silently colliding under an 'undefined' key.
// 0.7.3 (DESIGN_V1.md §2.2): previously this returned whole changed records under `toSet`, and
// syncTripState (cloud-store.js) wrote each one back with a full-document overwrite (`set(...,
// {merge:false})`) -- so if device A (offline) changed an Item's `notes` while device B concurrently
// changed the SAME Item's `title`, A's reconnect-time write carried A's stale `title` alongside A's
// new `notes` and silently reverted B's change, even though A and B never touched the same field.
// Field-level deltas let syncTripState write only the fields that actually changed (Firestore
// updateDoc()), so two devices editing different fields of the same record both survive, even across
// an offline/reconnect boundary -- same-field-same-record is still last-write-wins (no meaningful
// automatic merge is possible there), unchanged and accepted by design.
// A brand-new record (no `prior`) has nothing to diff against and goes to `toCreate` for a full
// write -- Firestore's updateDoc()/batch.update() fails outright against a document that doesn't
// exist yet, so this distinction is load-bearing, not cosmetic.
// deletedFields is populated whenever a key present on `prior` is absent from `record` -- the
// caller is expected to write these back via Firestore's deleteField() sentinel; a plain field
// write does NOT remove a field on its own under updateDoc()'s own merge semantics.
export function diffById(previous,next){
  const prevById=new Map((previous||[]).map(record=>[record.id,record]));
  const nextIds=new Set();
  const toCreate=[];
  const toUpdate=[];
  for(const record of next||[]){
    if(record.id===undefined||record.id===null)continue;
    nextIds.add(record.id);
    const prior=prevById.get(record.id);
    if(!prior){toCreate.push(record);continue}
    const changedFields={};
    const deletedFields=[];
    for(const key of new Set([...Object.keys(prior),...Object.keys(record)])){
      if(key==='id')continue;
      const priorHas=Object.prototype.hasOwnProperty.call(prior,key);
      const nextHas=Object.prototype.hasOwnProperty.call(record,key);
      if(!nextHas&&priorHas){deletedFields.push(key);continue}
      if(JSON.stringify(prior[key])!==JSON.stringify(record[key]))changedFields[key]=record[key];
    }
    if(Object.keys(changedFields).length||deletedFields.length)toUpdate.push({id:record.id,changedFields,deletedFields});
  }
  const toDelete=[...prevById.keys()].filter(id=>!nextIds.has(id));
  return {toCreate,toUpdate,toDelete};
}

export function normalizeOperationalState(state){
  state.games=Array.isArray(state.games)?state.games:BUILTIN_GAMES.map(game=>({...game,favorite:false}));
  for(const game of BUILTIN_GAMES)if(!state.games.some(item=>item.id===game.id))state.games.push({...game,favorite:false});
  state.tasks=Array.isArray(state.tasks)?state.tasks:[];
  // 0.7.1: priority is new -- every task created before this candidate has none stored at all.
  // Defaulting a missing priority to 'Normal' here (not at read-time in every render call site)
  // means every task, old or new, has one real, persisted value from the first render onward.
  for(const task of state.tasks)if(!task.priority)task.priority='Normal';
  state.taskFilters=state.taskFilters&&typeof state.taskFilters==='object'?state.taskFilters:{priority:'all',due:'all',status:'all'};
  state.shopping=Array.isArray(state.shopping)?state.shopping:[];
  state.locationRecords=Array.isArray(state.locationRecords)?state.locationRecords:[];
  state.participants=Array.isArray(state.participants)?state.participants:[];
  state.packingCollapsed=state.packingCollapsed&&typeof state.packingCollapsed==='object'?state.packingCollapsed:{};
  state.packedCollapsed=state.packedCollapsed!==false;
  // 0.7.7.1 (Test 1, found live): mirrors packedCollapsed exactly -- collapsed by default (hidden),
  // expandable, same pattern the Equipment/Packing list already uses for its own done items.
  state.shoppingPurchasedCollapsed=state.shoppingPurchasedCollapsed!==false;
  state.timelineCursor=state.timelineCursor||state.trip?.startDate||today();
  // 0.7.4: every Trip document synced before this candidate has no destinationCountries field at
  // all -- default it to an empty array here (not just at Trip-creation time in ensureTrip()) so
  // every existing Trip, not just brand-new ones, gets a real array to add to from its first load.
  if(state.trip&&!Array.isArray(state.trip.destinationCountries))state.trip.destinationCountries=[];
  return state;
}

// 0.7.5 (DESIGN_V1.md §4): the 30-day quarantine-to-deletion-eligibility check, computed on demand
// rather than via a scheduled job -- there is nothing this needs to do proactively the moment day
// 30 arrives, only ever refuse deletion before it. Pure and dependency-free like diffById above, so
// it gets a real function-level test rather than only source-inspection; the admin panel (client)
// uses this to show "eligible in N days", and admin-delete-account.mjs (Netlify Function) restates
// the same check independently, server-side, rather than trusting whatever the client displayed --
// deliberate duplication, not an oversight (see that function's own comment).
export const QUARANTINE_DELETION_ELIGIBLE_DAYS=30;
export function isDeletionEligible(invitation,nowIso=new Date().toISOString()){
  if(!invitation||invitation.state!=='revoked'||!invitation.revokedAt)return false;
  const revokedAt=new Date(invitation.revokedAt).getTime();
  const now=new Date(nowIso).getTime();
  if(!Number.isFinite(revokedAt)||!Number.isFinite(now))return false;
  return now-revokedAt>=QUARANTINE_DELETION_ELIGIBLE_DAYS*24*60*60*1000;
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

// Shared by Today's Quick Access (top 3, urgency only) and the 0.7.1 Tasks-page due-date scope
// filter (every scope bucket, exact match) -- one ranking definition so "overdue"/"today" mean the
// exact same thing in both places, never two independently-maintained notions of urgency.
export function taskDueRank(task,when=today()){
  if(!task.dueDate)return 3;
  if(task.dueDate<when)return 0;
  if(task.dueDate===when)return 1;
  return 2;
}
export const TASK_DUE_SCOPES=['overdue','today','upcoming','undated'];
// 0.7.1: High/Normal/Low priority, Normal default -- see normalizeOperationalState. Numeric rank
// only for deterministic sorting (lower sorts first); never persisted or shown to the user as a
// number.
export const TASK_PRIORITY_RANK={High:0,Normal:1,Low:2};
export function quickAccessTasks(tasks,when=today(),limit=3){
  const open=(tasks||[]).filter(task=>task&&!task.done);
  return open.map((task,index)=>({task,index})).sort((left,right)=>{
    const rankDifference=taskDueRank(left.task,when)-taskDueRank(right.task,when);
    if(rankDifference)return rankDifference;
    const leftDate=left.task.dueDate||'9999-12-31',rightDate=right.task.dueDate||'9999-12-31';
    return leftDate.localeCompare(rightDate)||left.index-right.index;
  }).slice(0,limit).map(entry=>entry.task);
}
// 0.7.1: filters (priority, due-date scope) combine with AND; sort is fully deterministic --
// due-date urgency first (matching quickAccessTasks' own ranking, so "urgent" means the same thing
// everywhere in the app), then priority (High before Normal before Low), then due date ascending,
// then original array position as the final, always-different tiebreaker.
// 0.7.4 (V7-F02, registered during 0.7.1's own acceptance session): a third filter dimension,
// status ('all'|'open'), combines with priority/due the same way those two already combine (AND,
// not OR). Defaults to 'all' -- closed tasks stay visible unless the user explicitly narrows to
// open-only, never silently hidden with no on-screen indication a filter is active (tasksView's
// own isFiltered check already covers any non-default filter, this one included).
// 0.7.9 correction round 3 (Finding 3): filter by participant, combining with priority/due/status
// the same AND-not-OR way those already combine. A specific participant's view includes their own
// 'specific'-scoped tasks PLUS every 'none'/'all'-scoped task -- mirroring visiblePackingItems'
// own "no participantIds = shared, visible in every view" precedent, not a new rule invented here.
export function filterAndSortTasks(tasks,filters,when=today()){
  const list=Array.isArray(tasks)?tasks:[];
  const priority=filters?.priority||'all',due=filters?.due||'all',status=filters?.status||'all',participant=filters?.participant||'all';
  const dueScopeName=task=>TASK_DUE_SCOPES[taskDueRank(task,when)];
  const matchesParticipant=task=>participant==='all'||task.participantScope!=='specific'||(task.participantIds||[]).includes(participant);
  const filtered=list.filter(task=>(priority==='all'||task.priority===priority)&&(due==='all'||dueScopeName(task)===due)&&(status==='all'||!task.done)&&matchesParticipant(task));
  return filtered.map((task,index)=>({task,index})).sort((left,right)=>{
    const dueDifference=taskDueRank(left.task,when)-taskDueRank(right.task,when);
    if(dueDifference)return dueDifference;
    const priorityDifference=(TASK_PRIORITY_RANK[left.task.priority]??1)-(TASK_PRIORITY_RANK[right.task.priority]??1);
    if(priorityDifference)return priorityDifference;
    const leftDate=left.task.dueDate||'9999-12-31',rightDate=right.task.dueDate||'9999-12-31';
    return leftDate.localeCompare(rightDate)||left.index-right.index;
  }).map(entry=>entry.task);
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

// Beta 0.8 Phase 1.1: was new Date().toISOString().slice(0,10) -- the UTC date, not the device's
// local one. Item times are stored as local wall-clock strings ("2026-10-04T09:00", no zone), so
// "today" must be the local calendar day too, or Today shows yesterday's date for the first
// 3 hours of an Israeli day (7 in Thailand) and mismatches every local item time compared to it.
export function today(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}

// Beta 0.8 Phase 1.1 (F3/F6): Today's leading-card and "next in line" rules as pure functions of
// `now`, so they can be exercised under any device timezone. Item startAt values are local
// wall-clock strings, so they are compared on the device's own clock (new Date(localString)),
// never against a UTC ISO string -- the F6 bug.
// type 'car' is the whole Transport family (rental car, train, ferry, bus, transfer -- see
// TRANSPORT_MODES); flight is its own type.
export const TRANSPORT_TYPES=['flight','car'];
const THREE_HOURS_MS=3*60*60*1000;
export function itemStartMs(item){
  const value=String(item?.startAt||'');
  return value?new Date(value.length===10?`${value}T12:00:00`:value).getTime():NaN;
}
// todayItems: items dated today (currentOperational's own todayItems). Rules, per the Product
// Owner (F6): a transport item takes the leading slot 3h before it starts, pre-empting whatever is
// leading; otherwise the most recently started item stays leading ("עכשיו") until the next item's
// start time; with nothing to hand off to (the last item of the day) it auto-clears 3h after its
// own start; an item the user ended (endedAt) never leads.
// Phase 1.2: "current" is the most recently STARTED item counting ended ones too -- if that item is
// ended there is simply no current item, rather than an older, already-superseded item coming
// back as current (found live on qa: ending the 19:00 item resurrected the 17:00 one).
function dayState(todayItems,now){
  const nowMs=now.getTime(),byStart=(a,b)=>itemStartMs(a)-itemStartMs(b);
  const timed=todayItems.filter(item=>item.startAt).sort(byStart);
  const live=timed.filter(item=>!item.endedAt);
  const upcoming=live.filter(item=>itemStartMs(item)>nowMs);
  const latest=timed.filter(item=>itemStartMs(item)<=nowMs).at(-1)||null;
  const current=latest&&!latest.endedAt&&(upcoming.length||nowMs-itemStartMs(latest)<THREE_HOURS_MS)?latest:null;
  return {nowMs,byStart,live,upcoming,current};
}
export function selectLeading(todayItems,now=new Date()){
  const {nowMs,live,upcoming,current}=dayState(todayItems,now);
  const preempting=live.find(item=>TRANSPORT_TYPES.includes(item.type)&&itemStartMs(item)>nowMs&&itemStartMs(item)-nowMs<=THREE_HOURS_MS);
  if(preempting)return preempting;
  return current||upcoming[0]||null;
}
// Beta 0.8 Phase 1.2 (P11-F1/F7): splits today's items into the leading card, the plan, and the
// done section. `current` is the most recently started, not-ended item (the one that stays "עכשיו"
// until the next item starts); it only stays current while there is something upcoming to hand
// off to, or for 3h after its own start. Done = items the user ended + items a later item has
// superseded + a last item that has auto-cleared. `plan` = upcoming items plus the current item
// when something else (a pre-empting transport item) holds the leading slot.
// endAt is deliberately never consulted (Product Owner rule, Phase 1.2 scope).
export function planToday(todayItems,now=new Date()){
  const {nowMs,byStart,live,upcoming,current}=dayState(todayItems,now);
  const started=live.filter(item=>itemStartMs(item)<=nowMs);
  const leading=selectLeading(todayItems,now);
  const plan=[...upcoming,...(current?[current]:[])].filter(item=>item!==leading).sort(byStart);
  const done=[...todayItems.filter(item=>item.endedAt),...started.filter(item=>item!==current)].sort(byStart);
  return {leading,current,plan,done};
}
// P11-F8: the first item within 48h of now; if none qualifies, the first transport item within 7
// days even when an ordinary item comes first but falls outside 48h. Only in-range items after
// today, never an ended one.
export function upNextItem(items,trip,now=new Date()){
  const todayKey=today(now),nowMs=now.getTime();
  const candidates=items
    .filter(item=>item.startAt&&!item.endedAt&&!['entire','none'].includes(item.schedule)&&String(item.startAt).slice(0,10)>todayKey&&!isItemOutsideTrip(item,trip))
    .sort((a,b)=>itemStartMs(a)-itemStartMs(b));
  const within=(item,hours)=>itemStartMs(item)-nowMs<=hours*60*60*1000;
  return candidates.find(item=>within(item,48))||candidates.find(item=>TRANSPORT_TYPES.includes(item.type)&&within(item,7*24))||null;
}
// P11-F5: rescheduling an ended item to a time later than now un-ends it; any other edit keeps it.
export function shouldClearEndedOnEdit(previousStartAt,nextStartAt,now=new Date()){
  return Boolean(nextStartAt)&&nextStartAt!==previousStartAt&&itemStartMs({startAt:nextStartAt})>now.getTime();
}
// P11-F9: the short, one-line day label above the time in the up-next row: "מחר", or the weekday
// letter plus day.month ("ו׳ 9.10") -- Israeli convention, no year.
export function shortDayLabel(startAt,now=new Date()){
  const start=new Date(String(startAt).length===10?`${startAt}T12:00:00`:startAt);
  const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
  if(today(start)===today(tomorrow))return 'מחר';
  return `${new Intl.DateTimeFormat('he-IL',{weekday:'narrow'}).format(start)} ${new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'numeric'}).format(start)}`;
}
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
  // 0.7.5: updated wording -- an Editor may now trigger Smart Import too (DESIGN_V1.md §7), so
  // this code now also covers "not an Editor either", not just "not the Owner".
  trip_not_owned:'לחשבון הפעיל אין הרשאת בעלים או עריכה לטיול זה.',
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

// Beta 0.8 Phase 2 (P12-F2): the participants a picker may offer. A participant who has since been
// deactivated is never offered for a NEW assignment, but one already assigned stays in the list --
// greyed "(לא פעיל)" by the caller -- so the existing assignment remains visible and removable.
export function pickerParticipants(participants,selectedIds=[]){
  const selected=new Set(selectedIds);
  return (participants||[]).filter(participant=>participant.active!==false||selected.has(participant.id));
}

// Beta 0.8 Phase 2 (P12-F5): who holds a confirmed ticket for one item. Coverage is derived, never typed:
// a participant is covered when a CONFIRMED linked document names them. The people listed are the active
// participants plus anyone already covered (a since-deactivated participant who holds a ticket stays visible).
export function computeTicketCoverage(sources,participants){
  const confirmed=(sources||[]).filter(source=>source.ticketConfirmed);
  const coveredIds=new Set(confirmed.flatMap(source=>source.participantIds||[]));
  const people=pickerParticipants(participants,[...coveredIds]);
  return {confirmed,coveredIds,people,coveredCount:people.filter(person=>coveredIds.has(person.id)).length};
}

// Beta 0.8 Phase 2.1 (P2-F5): the participant chip, always one line. Everyone assigned reads "כולם"; up to two
// people are shown by full name; more than two show the first name plus a count ("אייל +4"). `participants` is
// the full participant list; "everyone" means every ACTIVE participant is assigned (and there are at least two,
// so a one-person trip still shows the name). scope 'all' is also "כולם". Returns '' when nobody is assigned.
export function participantChipLabel(ids,participants,scope,{viewerId=''}={}){
  if(scope==='all')return 'כולם';
  const assigned=[...new Set(ids||[])].map(id=>(participants||[]).find(participant=>participant.id===id)).filter(Boolean);
  if(!assigned.length)return '';
  const active=(participants||[]).filter(participant=>participant.active!==false);
  if(active.length>=2&&active.every(participant=>assigned.some(person=>person.id===participant.id)))return 'כולם';
  // Beta 0.8 Phase 2.2 (P21-F5): in a participant's OWN view the chip starts with that participant, by first name ("פאולה +4",
  // "פאולה, דניאל"); the shared view keeps the original rule.
  const firstName=person=>String(person.name).trim().split(/\s+/)[0];
  const viewer=viewerId?assigned.find(person=>person.id===viewerId):null;
  if(viewer&&assigned.length>1){
    const ordered=[viewer,...assigned.filter(person=>person!==viewer)];
    return ordered.length===2?ordered.map(firstName).join(', '):`${firstName(viewer)} +${ordered.length-1}`;
  }
  if(assigned.length<=2)return assigned.map(person=>person.name).join(', ');
  return `${firstName(assigned[0])} +${assigned.length-1}`;
}

// Beta 0.8 Phase 2.1 (P2-F3): linking a ticket document to people adds them to the item's own participant list.
// ADD ONLY -- nobody is ever removed, and 'all' already covers everyone. Returns the fields to merge into the item
// / proposal, or null when nothing changes. Inactive participants are filtered out by the caller (pickers never
// offer them), so ids here are whoever was just linked.
export function addParticipantsToRecord(record,ids){
  const linked=[...new Set(ids||[])];
  if(!linked.length||record?.participantScope==='all')return null;
  const existing=record?.participantScope==='specific'?(record.participantIds||[]):[];
  const merged=[...new Set([...existing,...linked])];
  if(record?.participantScope==='specific'&&merged.length===existing.length)return null;
  return {participantScope:'specific',participantIds:merged};
}
