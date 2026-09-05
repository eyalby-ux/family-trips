import {ITEM_TYPES,TYPE_FIELDS,buildItemFormValues,createSuggestions,findPossibleDuplicates,flagReversedFlightDirection,isDismissibleWarning,manualCreateDefaults,mapsUrl,normalizeUrlInput,reconcileStaleNeedsReview,resolveMergeCandidate,suggestionReviewDefaults,suggestionToItem,validateSource} from './ingestion.js';
import {extractSourceContent,sha256File} from './content-extraction.js';
import {MultipartQrCollector,decodeExternalText,importBatchToApp} from './external-import.js';
import {availableTimelineModes,backfillTripDates,currentOperational,isItemOutsideTrip,normalizeDateRange,normalizeOperationalState,packingDuplicate,periodBounds,quickAccessTasks,sanitizeTripDates,shiftCursor,sortItemsByStartAt,uniqueRecordsById} from './operational-data.js';
import {normalizeProposalLifecycle,rejectProposal} from './proposal-lifecycle.js';
import {analyzeActivitySource,analyzeFlightSource,analyzeHotelSource,analyzeSource} from './smart-import-client.js';
import {MERGE_CONFLICT_WARNING_PREFIX,saveOnlySource,smartImportResultToSuggestion,preserveTrustedFieldsOnMerge} from './smart-import-adapter.js';
import {clearResolvedDirectionWarning,smartImportFlightResultToSuggestions} from './flight-import-adapter.js';
import {smartImportActivityResultToSuggestion} from './activity-import-adapter.js';
import {appVersionLabel} from './app-version.js';
import './v4.css';

const KEY='family-trips-alpha-0.2';
const EMPTY={trip:null,items:[],sources:[],suggestions:[],rejectedSuggestions:[],packing:[],games:[],tasks:[],shopping:[],locationRecords:[],view:'today',category:null,itemId:null,suggestionId:null,modal:null,timelineMode:'all',timelineCursor:'',calendarDate:null,toast:null};
const qrCollector=new MultipartQrCollector();
let cameraStream=null,cameraTimer=null;
let timelineSwipeStartX=null;
// Captured synchronously on file selection so an unrelated render() (which replaces the
// whole #app tree, including the <input type=file>) can never wipe the chosen file — the
// underlying cause of the file "disappearing" from Add and of the false "no document
// selected" error while an analysis request is already in flight.
let pendingSourceFile=null;
let ingestBusy=false;
let state=normalizeOperationalState(load());

function clone(value){return JSON.parse(JSON.stringify(value))}
function load(){try{const loaded={...clone(EMPTY),...JSON.parse(localStorage.getItem(KEY)||'{}'),view:'today',modal:null,toast:null},lifecycle=normalizeProposalLifecycle(loaded.suggestions,loaded.rejectedSuggestions);return {...loaded,...lifecycle}}catch{return clone(EMPTY)}}
function save(){const lifecycle=normalizeProposalLifecycle(state.suggestions,state.rejectedSuggestions);state.suggestions=lifecycle.suggestions;state.rejectedSuggestions=lifecycle.rejectedSuggestions;localStorage.setItem(KEY,JSON.stringify({trip:state.trip,items:state.items,sources:state.sources,suggestions:state.suggestions,rejectedSuggestions:state.rejectedSuggestions,packing:state.packing,games:state.games,tasks:state.tasks,shopping:state.shopping,locationRecords:state.locationRecords,packingCollapsed:state.packingCollapsed,packedCollapsed:state.packedCollapsed,timelineCursor:state.timelineCursor}))}
function uid(prefix='id'){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function warningText(value){return typeof value==='string'?value:value?.message||value?.code||JSON.stringify(value)}
function dateOnly(value){return value?String(value).slice(0,10):''}
function today(){return new Date().toISOString().slice(0,10)}
// V6-F25: the compact with-time format omitted year entirely, which reads as ambiguous/wrong for
// a booking made far enough ahead to cross a year boundary (a real risk for Flights, booked
// months out) -- shown whenever the date isn't in the current year, not on every row.
// V6-F60: dateTime() (smart-import-adapter.js/activity-import-adapter.js/flight-import-adapter.js)
// fills a missing extracted time with a neutral "12:00" default so a date-only value still has a
// valid datetime-local-compatible string -- but fmt() rendered that default exactly like a real
// extracted time, with no way for the reader to tell them apart. precision is the item's own
// dateMeta.start/endPrecision ('date' means no real time was extracted); when it's 'date', this
// renders the same way the explicit withTime=false callers already do (day/month/year, no clock),
// rather than showing a synthetic time that looks indistinguishable from a genuine one.
function fmt(value,withTime=true,precision=''){if(!value)return 'ללא תאריך';const date=new Date(value.length===10?`${value}T12:00:00`:value);const showYear=date.getFullYear()!==new Date().getFullYear();const showTime=withTime&&precision!=='date';return new Intl.DateTimeFormat('he-IL',showTime?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',...(showYear?{year:'numeric'}:{})}:{day:'numeric',month:'short',year:'numeric'}).format(date)}
function ensureTrip(seed={}){if(!state.trip){const dates=sanitizeTripDates(seed);state.trip={id:uid('trip'),name:seed.name||'הטיול המשפחתי שלי',startDate:dates.startDate,endDate:dates.endDate,createdAt:new Date().toISOString()}}if(!state.packing.length)state.packing=defaultPacking();normalizeOperationalState(state)}
function defaultPacking(){return [{id:uid('pl'),name:'מסמכים וכסף',owner:'shared',items:['דרכונים','ביטוח נסיעות','כרטיסי אשראי'].map(name=>({id:uid('pi'),name,done:false,suggested:true,owner:'shared'}))}]}
function route(view,options={}){stopCamera();if(view==='timeline'&&state.view!=='timeline'){state.timelineMode='all';state.timelineCursor=state.trip?.startDate||today();state.calendarDate=null}state.view=view;state.category=options.category||null;state.itemId=options.itemId||null;state.suggestionId=options.suggestionId||null;render();scrollTo(0,0)}
function notify(text){state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},2600)}
function status(){if(!state.trip)return 'Empty';if(state.trip.startDate&&state.trip.endDate){const now=today();if(now>=state.trip.startDate&&now<=state.trip.endDate)return 'Active';if(now>state.trip.endDate)return 'Completed';return 'Planned'}return 'Draft'}
function conflict(item){return isItemOutsideTrip(item,state.trip)}
// V6-F41: item.location for a Flight is a route string ("BKK → TLV"), which Google Maps resolves
// ambiguously as a search query (observed landing on the ARRIVAL airport instead) -- search the
// departure airport specifically, the endpoint a traveler would actually navigate to before the
// flight. Falls back to the raw location string if no departure airport was captured.
function mapSearchLocation(item){
  if(item.type==='flight')return item.details?.departureAirport?.code||item.details?.departureAirport?.name||item.location;
  return item.location;
}
// V6-F31/V6-F52: appVersionLabel lives in its own module (app-version.js), shared with
// src/main.js's sign-in screen, so this landing-banner label and the sign-in screen's label
// physically cannot drift apart again -- see app-version.js for the full history.
// V6-F40: reads the package.json-version+git-SHA string already embedded in index.html's
// <meta name="build-version"> (the same value the service worker's cache name carries) so QA can
// visually confirm exactly which build is live without opening the network tab.
function buildVersionLabel(){return document.querySelector('meta[name="build-version"]')?.content||''}
function sourceById(id){return state.sources.find(source=>source.id===id)}
function suggestionById(id){return state.suggestions.find(suggestion=>suggestion.id===id)}

function header(){return `<header class="top"><div class="top-in"><div class="brand"><img src="/assets/icons/icon-192.png" alt=""><div><h1>${esc(state.trip?.name||'Family Trips')}</h1><p>${state.trip?.startDate?`${fmt(state.trip.startDate,false)} — ${state.trip.endDate?fmt(state.trip.endDate,false):'ללא סיום'}`:`${appVersionLabel()} · Hotel + Flight Smart Import`}</p></div></div><span class="status">${status()}</span></div></header>`}
function empty(){return '<section class="card hero empty"><div class="big">🧭</div><h2>מתחילים מטיול ריק</h2><p class="muted">העלה מקור, ייבא JSON/QR או הזן פריט ידנית.</p><div class="actions center-actions"><button class="btn" data-action="create">הוספה</button></div></section>'}
function itemRow(item){return `<button class="row ${conflict(item)?'conflict':''}" data-route="detail" data-id="${item.id}"><span class="row-main"><b>${ITEM_TYPES[item.type]?.icon||'📌'} ${esc(item.title)}</b><small class="muted">${item.provider?`${esc(item.provider)} · `:''}${item.schedule==='entire'?'לכל הטיול':item.schedule==='none'?'ללא תאריך':item.schedule==='range'?`${fmt(item.startAt,true,item.dateMeta?.startPrecision)} — ${fmt(item.endAt,true,item.dateMeta?.endPrecision)}`:fmt(item.startAt,true,item.dateMeta?.startPrecision)}</small></span>${conflict(item)?'<span class="badge warn">מחוץ לטווח</span>':`<span class="badge">${ITEM_TYPES[item.type]?.label||item.type}</span>`}</button>`}
function suggestionRow(suggestion){const source=sourceById(suggestion.sourceId);return `<button class="row suggestion-row" data-route="suggestion" data-id="${suggestion.id}"><span class="row-main"><b>✨ ${esc(suggestion.proposed.title)}</b><small class="muted">${esc(source?.name||'ייבוא חיצוני')} · ביטחון ${confidenceLabel(suggestion.confidence)}</small></span><span class="badge ${suggestion.status==='pending'?'warn':'blue'}">${({pending:'ממתין לאישור',deferred:'אחר כך',rejected:'נדחה',approved:'אושר'})[suggestion.status]||suggestion.status}</span></button>`}
function archivedSuggestionRow(suggestion){const source=sourceById(suggestion.sourceId);return `<div class="row suggestion-row archived-suggestion"><span class="row-main"><b>🗄️ ${esc(suggestion.proposed.title)}</b><small class="muted">${esc(source?.name||'ייבוא חיצוני')} · הועבר לארכיון</small></span><span class="badge">נדחה</span></div>`}
function confidenceLabel(value){return ({high:'גבוה',medium:'בינוני',low:'נמוך'})[value]||value||'לא צוין'}

function todayView(){
  if(!state.trip)return empty();
  const op=currentOperational(state.items),shown=[...op.todayItems];if(op.next&&!shown.some(item=>item.id===op.next.id))shown.push(op.next);
  const pending=state.suggestions.filter(s=>['pending','deferred'].includes(s.status));
  const eligibleTasks=state.tasks.filter(task=>!task.done),tasks=quickAccessTasks(eligibleTasks,today(),3),shownIds=new Set(shown.map(item=>item.id));
  const quick=uniqueRecordsById([op.currentHotel,op.nextTransport,...op.critical].filter(item=>item&&!shownIds.has(item.id)),5);
  const quickContent=tasks.length?`${tasks.map(taskRow).join('')}${eligibleTasks.length>3?'<div class="actions"><button class="btn ghost" data-route="tasks">כל המשימות</button></div>':''}`:quick.length?`<div class="quick-grid">${quick.map(item=>`<button class="tile compact-tile" data-route="detail" data-id="${item.id}"><span class="ico">${ITEM_TYPES[item.type]?.icon}</span><b>${esc(item.title)}</b></button>`).join('')}</div>`:'';
  // Small addition (V6 second fix pass): Today only falls back to out-of-Trip-range items (the
  // same "מחוץ לטווח" badge already shown in Trip Center/Timeline) when it has nothing else
  // relevant to show at all -- a real, in-range Today never gets these mixed in, so a bad date
  // extraction (e.g. FL-008's real 2025 boarding pass) surfaces somewhere instead of sitting
  // unnoticed, without displacing genuinely current content.
  const outOfRange=shown.length?[]:sortItemsByStartAt(state.items.filter(item=>isItemOutsideTrip(item,state.trip)));
  const todayList=shown.length?shown.map(itemRow).join(''):outOfRange.length?outOfRange.map(itemRow).join(''):'<div class="empty compact"><p class="muted">אין אירועים להיום.</p></div>';
  const outOfRangeNote=outOfRange.length?'<p class="muted small">אין אירועים רלוונטיים היום — מוצגים פריטים מחוץ לטווח תאריכי הטיול לבדיקה.</p>':'';
  return `<section class="card hero"><h2>Today</h2><p class="muted">רק מה שרלוונטי עכשיו והאירוע הבא.</p>${outOfRangeNote}<div class="list">${todayList}</div></section>${quickContent?`<section class="card"><div class="section-head"><h3>גישה מהירה</h3>${tasks.length&&eligibleTasks.length<=3?'<button class="btn ghost" data-route="tasks">משימות</button>':''}</div>${quickContent}</section>`:''}${pending.length?`<section class="card"><div class="section-head"><h3>הצעות לבדיקה</h3><span class="badge warn">${pending.length}</span></div><div class="list">${pending.map(suggestionRow).join('')}</div></section>`:''}`;
}
function timelineCalendar(bounds){
  const cursor=state.timelineCursor||state.trip.startDate||today(),base=new Date(`${cursor}T12:00:00`),year=base.getFullYear(),month=base.getMonth(),first=new Date(year,month,1),last=new Date(year,month+1,0),cells=[];
  const active=state.timelineMode==='all'?[state.trip.startDate,state.trip.endDate]:bounds,selected=state.timelineMode==='day'?cursor:state.calendarDate;
  for(let i=0;i<first.getDay();i++)cells.push('<div class="cal-spacer" aria-hidden="true"></div>');
  for(let day=1;day<=last.getDate();day++){
    const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,events=state.items.filter(item=>dateOnly(item.startAt)===key),inTrip=state.trip.startDate&&state.trip.endDate&&key>=state.trip.startDate&&key<=state.trip.endDate,activePeriod=active?.[0]&&active?.[1]&&key>=active[0]&&key<=active[1];
    cells.push(`<button class="cal-cell ${inTrip?'in-trip':''} ${activePeriod?'active-period':''} ${key===selected?'selected':''}" data-action="calendar-date" data-date="${key}" aria-label="${fmt(key,false)}${events.length?`, ${events.length} אירועים`:''}"><b>${day}</b><div>${events.slice(0,4).map(item=>`<span class="cal-dot type-${item.type}" title="${esc(item.title)}"></span>`).join('')}</div></button>`);
  }
  return `<div class="timeline-calendar" data-timeline-calendar data-mode="${state.timelineMode}"><div class="section-head"><h3>Calendar</h3><input type="month" id="calendar-month" aria-label="חודש מוצג" value="${year}-${String(month+1).padStart(2,'0')}"></div><p class="muted small">בחירת תאריך עוברת לתצוגת יום. החלקה אופקית בתצוגת שבוע מזיזה את השבוע והרשימה יחד.</p><div class="calendar">${['א','ב','ג','ד','ה','ו','ש'].map(day=>`<b class="cal-weekday">${day}</b>`).join('')}${cells.join('')}</div></div>`;
}
function timeline(){
  if(!state.trip)return empty();
  const modes=availableTimelineModes(state.trip);if(!modes.includes(state.timelineMode))state.timelineMode='all';
  if(!state.timelineCursor)state.timelineCursor=state.trip.startDate||today();
  let items=state.items.filter(item=>!['none','entire'].includes(item.schedule)&&item.startAt).sort((a,b)=>a.startAt.localeCompare(b.startAt));
  const bounds=state.timelineMode==='all'?[state.trip.startDate||dateOnly(items[0]?.startAt)||today(),state.trip.endDate||dateOnly(items.at(-1)?.startAt)||today()]:periodBounds(state.timelineMode,state.timelineCursor);
  if(state.timelineMode!=='all')items=items.filter(item=>dateOnly(item.startAt)>=bounds[0]&&dateOnly(item.startAt)<=bounds[1]);
  const groups={};for(const item of items)(groups[dateOnly(item.startAt)]??=[]).push(item);
  const entire=state.timelineMode==='all'?state.items.filter(item=>item.schedule==='entire'):[],labels={all:'כל הטיול',day:'יום',week:'שבוע',month:'חודש'};
  const periodNavigation=state.timelineMode==='all'?'':`<div class="period-nav"><button class="btn ghost" data-action="timeline-shift" data-dir="-1" aria-label="התקופה הקודמת">הקודם</button><b>${bounds.map(date=>fmt(date,false)).join(' — ')}</b><button class="btn ghost" data-action="timeline-shift" data-dir="1" aria-label="התקופה הבאה">הבא</button></div>`;
  const list=`${entire.length?`<div class="day-group"><div class="day-head">לכל הטיול</div><div class="list">${entire.map(itemRow).join('')}</div></div>`:''}${Object.keys(groups).length?Object.entries(groups).map(([date,group])=>`<div class="day-group ${date===today()?'current-day':''}"><div class="day-head">${fmt(date,false)} ${date===today()?'<span class="badge blue">היום</span>':''}</div><div class="list">${group.map(itemRow).join('')}</div></div>`).join(''):entire.length?'':'<div class="empty"><p class="muted">אין אירועים בתקופה.</p></div>'}`;
  return `<section class="card"><h2>Timeline</h2><div class="tabs">${modes.map(mode=>`<button class="${state.timelineMode===mode?'active':''}" data-action="timeline-mode" data-mode="${mode}">${labels[mode]}</button>`).join('')}</div>${periodNavigation}${timelineCalendar(bounds)}<div class="timeline-list" aria-live="polite">${list}</div></section>`;
}
function center(){
  if(!state.trip)return empty();
  if(state.category){const items=sortItemsByStartAt(state.items.filter(item=>item.type===state.category)),sources=state.category==='document'?state.sources:[],suggestions=state.category==='document'?state.suggestions.filter(s=>['pending','deferred'].includes(s.status)):[],archive=state.category==='document'?state.rejectedSuggestions:[];return `<section class="card"><button class="btn ghost" data-route="center">חזרה</button><h2>${ITEM_TYPES[state.category]?.icon||'📌'} ${ITEM_TYPES[state.category]?.label||''}</h2>${suggestions.length?`<h3>הצעות פעילות</h3><div class="list">${suggestions.map(suggestionRow).join('')}</div>`:''}${items.length?`<h3>פריטים</h3><div class="list">${items.map(itemRow).join('')}</div>`:''}${sources.length?`<h3>מקורות</h3><div class="list">${sources.map(sourceRow).join('')}</div>`:''}${!items.length&&!sources.length&&!suggestions.length&&!archive.length?'<div class="empty"><p class="muted">אין פריטים.</p></div>':''}<div class="actions"><button class="btn" data-action="create">הוספה</button></div>${archive.length?`<details class="proposal-archive archive-at-bottom"><summary>ארכיון הצעות שנדחו (${archive.length})</summary><div class="list">${archive.map(archivedSuggestionRow).join('')}</div></details>`:''}</section>`}
  const operational=[['games','🎲','Games / Activities',state.games.length],['packing','🧳','ציוד',state.packing.length],['tasks','✅','הכנות',state.tasks.filter(x=>!x.done).length],['shopping','🛒','קניות',state.shopping.filter(x=>!x.purchased).length]];
  const visibleTypes=Object.entries(ITEM_TYPES).filter(([key])=>key!=='link');
  return `<section class="card"><h2>Trip Center</h2><p class="muted">מידע, מסמכים וכלי תפעול לנסיעה.</p><div class="grid two">${visibleTypes.map(([key,type])=>`<button class="tile" data-route="center" data-cat="${key}"><span class="ico">${type.icon}</span><b>${type.label}</b><small class="muted">${state.items.filter(item=>item.type===key).length+(key==='document'?state.sources.length:0)} פריטים</small></button>`).join('')}${operational.map(([view,icon,label,count])=>`<button class="tile" data-route="${view}"><span class="ico">${icon}</span><b>${label}</b><small class="muted">${count}</small></button>`).join('')}</div></section>`;
}
// V6-F42: retrying a failed analysis from here (analyze-source -> analyzeSavedSource ->
// runSmartAnalysis) already sets source.processingState to 'processing' and re-renders
// immediately, but this row never reflected that -- it just silently kept showing the old status
// text with no visual cue, looking stuck until the request suddenly resolved. A small inline
// "מנתח…" badge (matching this row's own existing badge scale, rather than the full-panel
// spinner used inside the intake/attachment modal, which would be oversized here) plus hiding the
// retry button while a request is already in flight gives the same "something is happening"
// signal the initial analysis flow already has.
function sourceRow(source){const available=source.kind==='link'||source.storedOffline;const analyzing=source.processingState==='processing';const canAnalyze=!analyzing&&source.kind!=='link'&&['saved_only','failed'].includes(source.processingState)&&source.storedOffline;return `<div class="row"><span class="row-main"><b>${source.kind==='link'?'🔗':'📎'} ${esc(source.name||source.url)}</b><small class="muted">${source.kind==='link'?'קישור':'מסמך'} · ${esc(source.status)} · ${available?'זמין':'הקובץ אינו זמין אופליין'}</small></span>${analyzing?'<span class="badge blue">מנתח…</span>':''}${source.processingState==='failed'?'<span class="badge warn">ניתוח נכשל</span>':''}${canAnalyze?`<button class="btn secondary" data-action="analyze-source" data-id="${source.id}">ניתוח חכם</button>`:''}${source.kind==='link'?`<a class="btn ghost" href="${esc(source.url)}" target="_blank" rel="noopener">פתיחה</a>`:available?`<button class="btn ghost" data-action="open-source" data-id="${source.id}">פתיחה</button>`:'<span class="badge warn">מטא־נתונים בלבד</span>'}</div>`}

function gamesView(){const games=[...state.games].sort((a,b)=>Number(b.favorite)-Number(a.favorite));return `<section class="card"><h2>🎲 Games / Activities</h2><p class="muted">ההוראות נשמרות מקומית וזמינות גם ללא אינטרנט.</p><div class="game-grid">${games.map(game=>`<article class="card game-card"><div class="section-head"><h3>${esc(game.title)}</h3><button class="icon-btn ${game.favorite?'favorite':''}" data-action="game-favorite" data-id="${game.id}" aria-label="מועדף">★</button></div><p>${esc(game.instructions)}</p><dl><dt>ציוד</dt><dd>${esc(game.items)}</dd><dt>מתאים ל</dt><dd>${esc(game.participants)}</dd><dt>משך</dt><dd>${esc(game.duration)}</dd></dl></article>`).join('')}</div></section>`}
function packingView(){if(!state.trip)return empty();return `<section class="card"><div class="section-head"><div><h2>Packing Lists</h2><p class="muted">פריטים שסומנו עוברים לאזור Packed וניתן להחזירם.</p></div><button class="btn" data-action="add-list">קטגוריה חדשה</button></div>${state.packing.map(list=>{const active=(list.items||[]).filter(item=>!item.done),packed=(list.items||[]).filter(item=>item.done),collapsed=state.packingCollapsed[list.id];return `<section class="card nested"><button class="section-head collapse-button" data-action="pack-collapse" data-list="${list.id}"><h3>${esc(list.name)}</h3><span class="badge">${packed.length}/${list.items.length}</span></button>${collapsed?'':`<div class="progress"><span style="width:${list.items.length?packed.length/list.items.length*100:0}%"></span></div>${active.map(packRow.bind(null,list)).join('')||'<p class="muted">הכול נארז.</p>'}<button class="btn secondary" data-action="pack-add" data-list="${list.id}">הוספת פריט</button>${packed.length?`<details ${state.packedCollapsed?'':'open'}><summary>Packed (${packed.length})</summary>${packed.map(packRow.bind(null,list)).join('')}</details>`:''}`}</section>`}).join('')}</section>`}
function packRow(list,item){return `<label class="check-row ${item.done?'done':''}"><input type="checkbox" data-action="pack-toggle" data-list="${list.id}" data-item="${item.id}" ${item.done?'checked':''}><span>${esc(item.name)} ${item.owner&&item.owner!=='shared'?`<small class="badge blue">${esc(item.owner)}</small>`:''}</span></label>`}
function tasksView(){return `<section class="card"><div class="section-head"><h2>✅ הכנות ומשימות</h2><button class="btn" data-action="task-add">משימה חדשה</button></div><div class="list">${state.tasks.length?state.tasks.map(taskRow).join(''):'<p class="muted">אין משימות.</p>'}</div></section>`}
function taskRow(task){return `<article class="row check-row task-row ${task.done?'done':''}"><input type="checkbox" data-action="task-toggle" data-id="${task.id}" aria-label="סימון משימה" ${task.done?'checked':''}><span class="row-main"><b>${esc(task.title)}</b><small class="muted">${task.owner&&task.owner!=='shared'?esc(task.owner)+' · ':''}${task.mode==='entire'?'לכל הטיול':task.mode==='none'?'ללא תאריך':task.dueDate?fmt(task.dueDate,false):'ללא תאריך'}</small></span><button class="btn ghost task-edit" data-action="task-edit" data-id="${task.id}">עריכה</button></article>`}
function shoppingView(){return `<section class="card"><div class="section-head"><h2>🛒 קניות</h2><button class="btn" data-action="shopping-add">פריט חדש</button></div><div class="list">${state.shopping.length?state.shopping.map(item=>`<label class="row check-row ${item.purchased?'done':''}"><input type="checkbox" data-action="shopping-toggle" data-id="${item.id}" ${item.purchased?'checked':''}><span class="row-main"><b>${esc(item.name)} × ${esc(item.quantity||'1')}</b><small class="muted">${item.owner&&item.owner!=='shared'?esc(item.owner):'משותף'}${item.linkedNeed?` · ${esc(item.linkedNeed)}`:''}</small></span></label>`).join(''):'<p class="muted">אין פריטי קניות.</p>'}</div></section>`}
function locationsView(){return `<section class="card"><div class="section-head"><div><h2>📍 מיקומים</h2><p class="muted">חיפוש ואישור מיקום; מפה חיצונית נפתחת במפורש ואינה נכשלת בשקט.</p></div><button class="btn" data-action="location-add">מיקום חדש</button></div>${state.locationRecords.length?state.locationRecords.map(record=>`<article class="row"><span class="row-main"><b>${esc(record.placeName)}</b><small class="muted">${esc(record.address||'')}${record.approved?' · מאושר':' · דורש אישור'}</small></span><a class="btn ghost" href="${mapsUrl(record.coordinates?`${record.coordinates.lat},${record.coordinates.lng}`:record.address||record.placeName)}" target="_blank" rel="noopener">מפה / סיכה</a><button class="btn secondary" data-action="location-approve" data-id="${record.id}">${record.approved?'תיקון':'אישור'}</button></article>`).join(''):'<p class="muted">אין מיקומים שמורים.</p>'}</section>`}

// V6-F55: a merge-conflict warning (preserveTrustedFieldsOnMerge, smart-import-adapter.js) is
// resolved through the explicit keep/accept picker below (mergeCandidatePanel), not through the
// generic warning list -- filtering it out here avoids showing the same conflict twice, once as
// inert text and once as an actionable choice.
function isMergeConflictWarningText(text,details){
  const keys=Object.keys(details?.mergeCandidates||{});
  return keys.some(key=>typeof text==='string'&&text.startsWith(`${MERGE_CONFLICT_WARNING_PREFIX}${key}`));
}
// V6-F54: a warning on a saved item previously had no way to ever clear -- detailView rendered
// item.warnings as plain text, and nothing anywhere ever called reconcileStaleNeedsReview or
// filtered item.warnings after item creation. Mirrors suggestionView's own dismiss control
// (isDismissibleWarning/dismiss-item-warning below), keyed by the TRUE index into item.warnings
// (not the deduplicated display list) so dismissing removes the correct real entry. Dedup is by
// rendered text, not object identity, since the same warning can legitimately arrive twice from
// two merged sources -- preserves the pre-existing dedup behavior while still allowing a
// dismissible entry to be dismissed correctly.
function itemWarningEntries(item){
  const seen=new Set();
  return (item.warnings||[]).map((warning,index)=>({warning,index})).filter(entry=>{
    const text=warningText(entry.warning);
    if(isMergeConflictWarningText(text,item.details))return false;
    if(seen.has(text))return false;
    seen.add(text);return true;
  });
}
// V6-F55: the suggestion-review screen never deduplicated warnings the way itemWarningEntries
// does -- kept as-is (not deduped) to avoid changing existing suggestion-review behavior beyond
// what this finding actually requires; only the merge-conflict filter is new here.
function suggestionWarningEntries(suggestion){
  return (suggestion.warnings||[]).map((warning,index)=>({warning,index})).filter(entry=>!isMergeConflictWarningText(warningText(entry.warning),suggestion.proposed?.details));
}
function warningRow(warning,details,scope,id,index){
  return `<div class="warning-row">⚠️ ${esc(warningText(warning))}${isDismissibleWarning(warning,details)?`<button class="link-button" type="button" data-action="${scope==='item'?'dismiss-item-warning':'dismiss-warning'}" data-id="${id}" data-index="${index}">התעלמות</button>`:''}</div>`;
}
const MERGE_CANDIDATE_LABELS={title:'כותרת',provider:'ספק',confirmationNumber:'מספר הזמנה',location:'מיקום',website:'קישור',phone:'טלפון',startAt:'תאריך התחלה',endAt:'תאריך סיום'};
// V6-F55 (merged with V6-F54): replaces the old "silently keep the trusted value + show a warning
// that may never clear" behavior with the Product Owner's own requested fix direction -- an
// explicit keep/accept choice per conflicting field, reusing the same fieldset/radio pattern as
// directionPickerPanel (Flight) rather than inventing new UI. scope/id identify which the click
// handler should resolve against (a pending suggestion's proposed object, or an already-saved
// item); resolveMergeCandidate (ingestion.js) does the actual field/warning mutation.
function mergeCandidatePanel(scope,id,current,details){
  const candidates=details?.mergeCandidates;
  if(!candidates||!Object.keys(candidates).length)return '';
  return Object.entries(candidates).map(([key,value])=>{
    const label=MERGE_CANDIDATE_LABELS[key]||key,name=`merge-${scope}-${id}-${key}`;
    return `<fieldset class="processing-choice merge-conflict"><legend>⚠️ התגלה ערך חדש עבור ${esc(label)} — יש לבחור</legend><label><input type="radio" name="${esc(name)}" data-action="resolve-merge-candidate" data-scope="${scope}" data-id="${id}" data-key="${key}" data-choice="keep"> השארת הערך השמור: ${esc(String(current?.[key]??''))||'—'}</label><label><input type="radio" name="${esc(name)}" data-action="resolve-merge-candidate" data-scope="${scope}" data-id="${id}" data-key="${key}" data-choice="accept"> שימוש בערך החדש: ${esc(String(value))}</label></fieldset>`;
  }).join('');
}
function detailView(){const item=state.items.find(candidate=>candidate.id===state.itemId);if(!item)return '<section class="card">הפריט לא נמצא.</section>';const sources=state.sources.filter(source=>item.sourceIds?.includes(source.id)),place=item.details?.canonicalPlace,contactActions=[place?`<a class="btn secondary" href="${esc(place.googleMapsUri||mapsUrl(`${place.latitude},${place.longitude}`))}" target="_blank" rel="noopener">🧭 ניווט</a>`:item.location?`<a class="btn secondary" href="${mapsUrl(mapSearchLocation(item))}" target="_blank" rel="noopener">🧭 חיפוש במפה</a>`:'',item.website?`<a class="btn ghost" href="${esc(item.website)}" target="_blank" rel="noopener">🌐 קישור</a>`:'',item.phone?`<a class="btn ghost" href="tel:${esc(item.phone)}">☎️ התקשרות</a>`:''].filter(Boolean).join('');const warningEntries=itemWarningEntries(item);return `<section class="card ${conflict(item)?'conflict':''}"><button class="btn ghost" data-route="center" data-cat="${item.type}">חזרה</button><h2>${ITEM_TYPES[item.type]?.icon||'📌'} ${esc(item.title)}</h2><p><span class="badge">${ITEM_TYPES[item.type]?.label}</span></p>${item.provider?`<p><b>ספק:</b> ${esc(item.provider)}</p>`:''}${item.confirmationNumber?`<p><b>מספר הזמנה:</b> ${esc(item.confirmationNumber)}</p>`:''}${item.location?`<p><b>מיקום:</b> ${esc(item.location)} ${place?'<span class="badge blue">אומת</span>':'<span class="badge warn">שם לחיפוש</span>'}</p>`:''}${contactActions?`<div class="actions">${contactActions}</div>`:''}${item.startAt?`<p><b>מועד:</b> ${fmt(item.startAt,true,item.dateMeta?.startPrecision)}</p>`:''}${item.endAt?`<p><b>סיום:</b> ${fmt(item.endAt,true,item.dateMeta?.endPrecision)}</p>`:''}${item.notes?`<p class="preserve-lines">${esc(item.notes)}</p>`:''}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,item.details,'item',item.id,index)).join('')}</div>`:''}${mergeCandidatePanel('item',item.id,item,item.details)}${item.type==='flight'?flightSummaryBlock(item.details):''}${item.type==='activity'?activitySummaryBlock(item.details):''}<h3>מסמכים וכרטיסים</h3>${sources.length?`<div class="list">${sources.map(sourceRow).join('')}</div>`:'<p class="muted">אין מסמכים מצורפים.</p>'}<div class="actions">${['hotel','flight','activity'].includes(item.type)?`<button class="btn" data-action="attach-source" data-id="${item.id}">הוספת מסמך</button>`:''}<button class="btn secondary" data-action="edit-item" data-id="${item.id}">עריכה</button><button class="btn danger" data-action="delete-item" data-id="${item.id}">מחיקה</button></div></section>`}
// V6-F37 (fix pass 4): the update-confirmation copy hardcoded "המלון" (the hotel) regardless of
// the suggestion's actual type, so a Flight update-review screen incorrectly talked about a
// hotel. existingItemUnchangedNotice() picks the grammatically correct phrase for the two types
// that can reach an update review (attach-and-extract is only offered for hotel/flight), and
// falls back to a generic, gender-neutral phrasing for anything else instead of assuming hotel.
function existingItemUnchangedNotice(type){
  return ({flight:'הטיסה הקיימת לא תשתנה עד לאישור מפורש.',hotel:'המלון הקיים לא ישתנה עד לאישור מפורש.'})[type]||'הפריט הקיים לא ישתנה עד לאישור מפורש.';
}
// V6-F49/V6-F55 (extended, V6-F55 ext): an unresolved-sourced warning (smart-import-adapter.js /
// activity-import-adapter.js) carries no field key at all, so it can never be auto-matched to an
// edited field and cleared by reconcileStaleNeedsReview -- always dismissible, regardless of
// shape. isDismissibleWarning itself now lives in ingestion.js (pure logic, directly testable,
// imported above) -- it decides dismissibility from an explicit needsReviewRef{key,value} a
// warning carries only when it genuinely was generated from a live needsReviewFields entry,
// replacing an earlier heuristic that guessed this from a text-substring match against the
// entry's LABEL, which could misfire on an unrelated free-text warning that merely mentioned the
// same common word (see ingestion.js for the full history). Merge-conflict warnings are excluded
// upstream (isMergeConflictWarningText) before this is ever consulted for them, since they resolve
// through mergeCandidatePanel's explicit keep/accept choice instead of a plain dismiss.
function suggestionView(){const suggestion=suggestionById(state.suggestionId);if(!suggestion)return '<section class="card">ההצעה לא נמצאה.</section>';const sources=(suggestion.sourceIds||[suggestion.sourceId]).map(sourceById).filter(Boolean),p=suggestion.proposed,experimental=sources.some(source=>source.experimental),isUpdate=Boolean(suggestion.targetItemId);
  // V6-F51: mirrors suggestionToItem's own trip-start fallback (fires at approval time for a new
  // item) so the review form shows the same value approval would have produced anyway, instead
  // of empty air -- see suggestionReviewDefaults for the exact shared condition.
  const displayP={...p,...suggestionReviewDefaults(p,state.trip?.startDate||'',!isUpdate)};
  const warningEntries=suggestionWarningEntries(suggestion);
  return `<section class="card"><button class="btn ghost" data-route="center" data-cat="document">חזרה</button><div class="section-head"><div><h2>${isUpdate?'בדיקת הצעת עדכון':'בדיקת הצעה'}</h2><p class="muted">${isUpdate?existingItemUnchangedNotice(p.type):'המידע יישמר כפריט רק לאחר אישור מפורש.'}</p></div><span class="badge ${experimental||suggestion.confidence==='low'?'warn':'blue'}">${experimental?'PDF ניסיוני':`ביטחון ${confidenceLabel(suggestion.confidence)}`}</span></div>${experimental?'<div class="experimental-warning"><b>קליטה ניסיונית:</b> יש לבדוק כל שדה. מידע חסר נשאר ריק והקובץ המקורי נשמר.</div>':''}<div class="source-summary"><b>מקורות:</b> ${sources.map(source=>esc(source.name)).join(', ')||'ייבוא חיצוני'}</div>${suggestion.origin==='external-import'?'<div class="privacy-warning">🔒 ה־QR אינו מוצפן. אין לשתף אותו בפומבי.</div>':''}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,p.details,'suggestion',suggestion.id,index)).join('')}</div>`:''}${mergeCandidatePanel('suggestion',suggestion.id,p,p.details)}${p.type==='flight'?directionPickerPanel(suggestion.id,p):''}${p.type==='flight'?flightSummaryBlock(p.details):''}${p.type==='activity'?activitySummaryBlock(p.details):''}${smartEvidencePanel(p)}<form id="suggestion-form" data-id="${suggestion.id}">${proposalFields(displayP)}<div class="actions"><button class="btn" name="decision" value="approve">${isUpdate?`אישור ועדכון ה${ITEM_TYPES[p.type]?.label||'פריט'}`:'אישור ויצירת פריט'}</button><button class="btn secondary" name="decision" value="save">שמירת עריכה</button><button class="btn ghost" type="button" data-action="defer-suggestion" data-id="${suggestion.id}">אחר כך</button><button class="btn danger" type="button" data-action="reject-suggestion" data-id="${suggestion.id}">דחייה</button></div></form></section>`}
const BAGGAGE_LABELS={carry_on:'כבודת יד',checked:'מזוודה',trolley:'טרולי'};
const BAGGAGE_INCLUDED_LABELS={included:'כלול',not_included:'לא כלול',unknown:'לא ידוע'};
// Revised V6-F32 (fix pass 3): a source whose direction is genuinely ambiguous no longer gets a
// single guessed value written into it -- both candidate readings are shown here for the Product
// Owner to pick between (the frozen source-relative completeness/evidence contract: an ambiguous
// value stays visible and reviewable, never silently guessed or dropped). Reuses the same
// fieldset/radio markup already used for the Add screen's "מה לבצע?" choice, so no new styling is
// needed. Picking a radio here does not submit the suggestion-review form -- it just updates the
// suggestion's location/startAt/endAt in place (see pickFlightDirection) and re-renders, so the
// normal form fields below immediately reflect the choice and stay manually editable afterward.
function directionPickerPanel(suggestionId,p){
  const candidates=p.details?.directionCandidates;
  if(!candidates?.length)return '';
  // A pick isn't only recorded via directionPickIndex (an explicit radio click) -- it can also
  // already be resolved because this suggestion inherited a trusted item's direction on merge
  // (V6-F36/V6-F39, preserveTrustedFieldsOnMerge/mergeFlightDetails). Detecting that match here
  // pre-checks the matching radio and labels it as already-resolved, instead of showing every
  // option unchecked and inviting the Product Owner to re-pick one unnecessarily -- clicking a
  // candidate that doesn't actually match the inherited data would overwrite it with this
  // source's own (still ambiguous) reading.
  const inheritedIndex=candidates.findIndex(c=>c.label===p.location&&c.startAt===p.startAt&&c.endAt===p.endAt);
  const pickedIndex=Number.isInteger(p.details?.directionPickIndex)?p.details.directionPickIndex:inheritedIndex;
  const alreadyResolved=pickedIndex>=0&&pickedIndex===inheritedIndex&&!Number.isInteger(p.details?.directionPickIndex);
  return `<fieldset class="processing-choice"><legend>⚠️ כיוון הטיסה אינו חד־משמעי במקור — יש לבחור אחת האפשרויות</legend>${alreadyResolved?'<p class="muted small">כיוון זה כבר נקבע (עודכן מפריט קיים). ניתן לבחור אפשרות אחרת רק אם זו שגויה.</p>':''}${candidates.map((c,i)=>`<label><input type="radio" name="direction-pick" data-action="pick-direction" data-id="${suggestionId}" data-index="${i}" ${pickedIndex===i?'checked':''}> ${esc(c.label)} — יציאה ${c.startAt?fmt(c.startAt):'—'} · הגעה ${c.endAt?fmt(c.endAt):'—'}</label>`).join('')}</fieldset>`;
}
function flightSummaryBlock(details){
  if(!details)return '';
  const rows=[['מספר טיסה',details.flightNumber],['חברת תפעול',details.operatingCarrier],
    details.marketingCarrier&&details.marketingCarrier!==details.operatingCarrier?['חברת שיווק',details.marketingCarrier]:null,
    ['המראה',[details.departureAirport?.code,details.departureAirport?.name].filter(Boolean).join(' — ')+(details.departureAirport?.terminal?` · טרמינל ${details.departureAirport.terminal}`:'')],
    ['נחיתה',[details.arrivalAirport?.code,details.arrivalAirport?.name].filter(Boolean).join(' — ')+(details.arrivalAirport?.terminal?` · טרמינל ${details.arrivalAirport.terminal}`:'')],
    ['משך טיסה',details.duration],['דגם מטוס',details.aircraftType],['מחלקה',details.classOfService],['בסיס תעריף',details.fareBasis],
    ['שער עלייה',details.gate],['פתיחת שער',details.gateOpensAt],['סגירת שער',details.gateClosesAt],['מספר רצף עלייה',details.boardingSequenceNumber],
  ].filter(Boolean).filter(([,value])=>String(value||'').trim());
  if(!rows.length&&!details.passengers?.length)return '';
  const segmentBadge=details.segmentCount>1?`<span class="badge blue">מקטע ${details.segmentIndex} מתוך ${details.segmentCount}</span>`:'';
  return `<section class="card nested"><div class="section-head"><h3>פרטי הטיסה</h3>${segmentBadge}</div>${rows.length?`<dl class="flight-summary">${rows.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`:''}${flightPassengersTable(details.passengers)}</section>`;
}
function flightPassengersTable(passengers){
  if(!passengers?.length)return '';
  return `<h4>נוסעים (${passengers.length})</h4><div class="list">${passengers.map(passenger=>{
    const baggage=(passenger.baggage||[]).filter(bag=>bag.bagType).map(bag=>`${BAGGAGE_LABELS[bag.bagType]||bag.bagType}${bag.weight?` (${esc(bag.weight)})`:''} · ${BAGGAGE_INCLUDED_LABELS[bag.included]||bag.included||''}`).join(', ');
    return `<article class="row passenger-row"><span class="row-main"><b>${esc(passenger.name||'נוסע')}</b><small class="muted">${[passenger.eTicketNumber?`כרטיס ${esc(passenger.eTicketNumber)}`:'',passenger.seat?`מושב ${esc(passenger.seat)}`:'',passenger.mealRequest?esc(passenger.mealRequest):'',baggage].filter(Boolean).join(' · ')}</small></span></article>`;
  }).join('')}</div>`;
}
// V6-F57/V6-F58: details.ticketHolders (per-ticket name/DNI/seat-section/ticket-number) and
// amount/currency/duration/ageRestrictions/included/notIncluded/meetingPoint/ticketQuantity were
// all correctly captured by smartImportActivityResultToSuggestion (activity-import-adapter.js)
// but had no rendering path anywhere -- neither the suggestion review screen nor the saved item
// detail view ever read details.ticketHolders/amount/currency at all. Mirrors flightSummaryBlock/
// flightPassengersTable's own read-only-summary pattern exactly, applied to the Activity shape.
function activitySummaryBlock(details){
  if(!details)return '';
  const price=details.amount?`${details.amount}${details.currency?` ${details.currency}`:''}`:'';
  const rows=[price?['מחיר',price]:null,['משך',details.duration],['מגבלת גיל',details.ageRestrictions],['כלול',details.included],['לא כלול',details.notIncluded],['נקודת מפגש',details.meetingPoint],['כמות כרטיסים',details.ticketQuantity]].filter(Boolean).filter(([,value])=>String(value||'').trim());
  if(!rows.length&&!details.ticketHolders?.length)return '';
  return `<section class="card nested"><h3>פרטי הכרטיס</h3>${rows.length?`<dl class="flight-summary">${rows.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`:''}${activityTicketHoldersTable(details.ticketHolders)}</section>`;
}
function activityTicketHoldersTable(ticketHolders){
  if(!ticketHolders?.length)return '';
  return `<h4>כרטיסים (${ticketHolders.length})</h4><div class="list">${ticketHolders.map(holder=>{
    const parts=[holder.ticketNumber?`כרטיס ${esc(holder.ticketNumber)}`:'',holder.seatOrSection?esc(holder.seatOrSection):'',holder.dni?`ת.ז./דרכון ${esc(holder.dni)}`:''].filter(Boolean).join(' · ');
    return `<article class="row passenger-row"><span class="row-main"><b>${esc(holder.name||'כרטיס')}</b><small class="muted">${parts}</small></span></article>`;
  }).join('')}</div>`;
}
function smartEvidencePanel(p){const fields=p.details?.smartImportFields||[],notes=p.details?.importantNotes||[],place=p.details?.placeValidation;if(!fields.length&&!notes.length&&!place)return '';return `<details class="evidence-panel" open><summary>כל המידע והראיות שנקלטו (${fields.length+notes.length})</summary><div class="evidence-list">${fields.map(field=>`<article><b>${esc(field.label)}</b><p>${esc(field.rawValue)}</p><small>${esc(field.evidence)} · ${field.certainty==='exact'?'מדויק':'דורש בדיקה'}</small></article>`).join('')}${notes.map(note=>`<article><b>${esc(note.title)}</b><p>${esc(note.text)}</p><small>${esc(note.evidence)} · ${note.certainty==='exact'?'מדויק':'דורש בדיקה'}</small></article>`).join('')}${place?`<article><b>אימות מיקום</b><p>${place.state==='validated'?`אומת: ${esc(place.acceptedPlace?.formattedAddress||place.locationDisplayValue)}`:`לא אומת: ${esc(place.reason||'דורש בדיקה')}`}</p></article>`:''}</div></details>`}
function requiredLabel(label){return `${label} <span class="required" aria-hidden="true">*</span><span class="sr-only">שדה חובה</span>`}
function proposalFields(p,{alwaysWebsite=false}={}){const type=['link','document'].includes(p.type)?'hotel':p.type||'hotel',fields=new Set(TYPE_FIELDS[type]||[]);if(alwaysWebsite||p.website)fields.add('website');const field=(name,label,input)=>fields.has(name)?`<div class="field"><label>${label}</label>${input}</div>`:'';return `<p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><div class="grid two"><div class="field"><label>סוג</label><select name="type" data-action="proposal-type">${Object.entries(ITEM_TYPES).filter(([key])=>!['document','link'].includes(key)).map(([key,itemType])=>`<option value="${key}" ${type===key?'selected':''}>${itemType.icon} ${itemType.label}</option>`).join('')}</select></div><div class="field"><label>${requiredLabel('כותרת')}</label><input name="title" required aria-required="true" value="${esc(p.title||'')}"></div>${field('provider','ספק',`<input name="provider" value="${esc(p.provider||'')}">`)}${field('confirmationNumber','מספר הזמנה',`<input name="confirmationNumber" value="${esc(p.confirmationNumber||'')}">`)}${field('location','מיקום',`<input name="location" value="${esc(p.location||'')}">`)}${field('website','קישור',`<input type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" name="website" value="${esc(p.website||'')}" placeholder="https://…">`)}${field('phone','טלפון',`<input type="tel" name="phone" value="${esc(p.phone||'')}">`)}${field('startAt','תאריך התחלה',`<input type="datetime-local" name="startAt" value="${esc(p.startAt||'')}">`)}${field('endAt','תאריך סיום',`<input type="datetime-local" name="endAt" value="${esc(p.endAt||'')}">`)}${field('participants','משתתפים',`<input name="participants" value="${esc((p.participants||[]).join(', '))}">`)}</div>${field('notes','הערות',`<textarea name="notes">${esc(p.notes||'')}</textarea>`) }`}
function settingsView(){if(!state.trip)return empty();return `<section class="card"><h2>הגדרות הטיול</h2><form id="trip-form"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><div class="field"><label>${requiredLabel('שם הטיול')}</label><input name="name" required aria-required="true" value="${esc(state.trip.name)}"></div><div class="grid two"><div class="field"><label>תאריך התחלה</label><input type="date" name="startDate" value="${esc(state.trip.startDate)}"></div><div class="field"><label>תאריך סיום</label><input type="date" name="endDate" value="${esc(state.trip.endDate)}"></div></div><button class="btn">שמירה</button></form></section><section class="card danger-zone"><h2>מחיקה ואיפוס</h2><p class="muted">הפעולות חלות רק על הטיול הנוכחי: <b>${esc(state.trip.name)}</b>.</p><div class="danger-option"><div><h3>מחיקת נתוני הטיול</h3><p class="muted">מוחקת פריטים, מסמכים, משימות, קניות, אריזה ומיקומים; שם הטיול והתאריכים נשארים.</p></div><button class="btn warn" data-action="reset-trip-data">מחיקת נתוני הטיול</button></div><div class="danger-option"><div><h3>מחיקת הטיול הנוכחי</h3><p class="muted">מוחקת את הטיול ואת כל הנתונים המקומיים המשויכים אליו.</p></div><button class="btn danger" data-action="delete-current-trip">מחיקת הטיול</button></div></section><section class="card"><h2>אודות</h2><p class="muted small">${esc(appVersionLabel())}${buildVersionLabel()?` · בנייה ${esc(buildVersionLabel())}`:''}</p></section>`}

function intakeModal(){const source=state.modal?.source||'manual',choices=[['manual','✍️ ידני'],['document','📎 מסמך'],['link','🔗 קישור'],['json','⬆️ JSON'],['qr','▦ QR']];let body='';if(source==='manual')body=`<form id="manual-form">${proposalFields({type:'hotel',title:'',provider:'',confirmationNumber:'',location:'',website:'',phone:'',...manualCreateDefaults(state.trip),participants:[],notes:''})}<button class="btn">יצירת פריט</button></form>`;else if(source==='json')body='<div class="field"><label>קובץ familytrips.import 1.0</label><input id="import-json" type="file" accept="application/json,.json"></div><button class="btn" data-action="import-json">אימות ויצירת הצעות</button>';else if(source==='qr')body=qrPanel();else body=smartImportPanel(source);return `<div class="modal-bg"><section class="modal wide-modal"><div class="modal-head"><h2>הוספת מקור או פריט</h2><button class="close" data-action="close">✕</button></div><div class="source-choice">${choices.map(([key,label])=>`<button class="${source===key?'active':''}" data-action="source" data-source="${key}">${label}</button>`).join('')}</div>${body}</section></div>`}
function processingIndicator(message){return `<div class="processing-indicator" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><p>${message}</p><p class="muted small">הניתוח יכול לקחת מספר שניות. אין צורך ללחוץ שוב.</p></div>`}
// V6-F fix pass: removed the manual Hotel/Flight picker -- the server now classifies from
// content the same way it already determines VOID vs. real segments (see analyze_source in
// smart-import.mjs). Document also replaces the separate PDF/Picture options: one broad-accept
// file input with no forced capture attribute lets the OS present its native camera/gallery/
// file choice (the underlying pipeline already treats them as one ingestion path).
function smartImportPanel(source){
  if(ingestBusy)return processingIndicator('מנתח את המקור…');
  const input=source==='link'?'<div class="field"><label>כתובת אתר ציבורי רשמי של המלון</label><input id="source-url" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…"></div>':'<div class="field"><label>מסמך (PDF או תמונה)</label><input id="source-file" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"></div>';
  return `<div class="smart-import-disclosure"><b>Smart Import:</b> הניתוח מתבצע רק לאחר אישור. עותק העיבוד אינו נשמר בשרת, והמקור המקורי נשמר במכשיר.</div>${input}<fieldset class="processing-choice"><legend>מה לבצע?</legend><label><input type="radio" name="processing-mode" value="analyze" checked> ניתוח והצעת פריט</label><label><input type="radio" name="processing-mode" value="save"> שמירת המקור בלבד — ללא AI</label></fieldset><button class="btn" data-action="smart-ingest">המשך</button>`;
}
// V6-F38 (fix pass 4): the per-item "add document" modal still showed separate PDF/תמונה tabs
// after the global Add flow merged them into one Document option (V6 fix pass 1) -- applying the
// same merge here for consistency. One broad-accept file input with no forced capture attribute
// lets the OS present its native camera/gallery/file choice, exactly like the Add screen's
// Document option; validateSmartSource's existing kind==='document' branch already accepts
// either a PDF or an image, so no server/validation change is needed.
function attachmentModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);if(ingestBusy)return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>הוספת מסמך ל־${esc(item?.title||'מלון')}</h2></div>${processingIndicator('מנתח את המסמך…')}</section></div>`;return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>הוספת מסמך ל־${esc(item?.title||'מלון')}</h2><button class="close" data-action="close">✕</button></div><div class="field"><label>מסמך (PDF או תמונה)</label><input id="source-file" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"></div><fieldset class="processing-choice"><legend>מה לבצע?</legend><label><input type="radio" name="processing-mode" value="attach" checked> צירוף בלבד — ללא AI</label><label><input type="radio" name="processing-mode" value="extract"> צירוף וחילוץ מידע להצעה</label></fieldset><button class="btn" data-action="attach-ingest" data-id="${item?.id||''}">המשך</button></section></div>`}
function qrPanel(){const p=qrCollector.progress;return `<div class="privacy-warning">ה־QR מכיל מידע אישי ואינו מוצפן. אין לשתף אותו בפומבי.</div><video id="qr-video" class="qr-video" playsinline muted></video><div class="actions"><button class="btn" data-action="qr-camera">סריקה במצלמה</button><label class="btn secondary file-button">בחירת תמונת QR<input id="qr-image" type="file" accept="image/*"></label><button class="btn ghost" data-action="qr-reset">ביטול / התחלה מחדש</button></div>${p.total?`<div class="qr-progress"><b>חלקים שנקלטו: ${p.collected}/${p.total}</b><p>חסרים: ${p.missing.join(', ')||'אין'}</p></div>`:''}<div class="field"><label>הדבקת payload לבדיקה</label><textarea id="qr-text" dir="ltr" placeholder="FTI1:... או FTI1C|..."></textarea></div><button class="btn secondary" data-action="qr-text">קליטת payload</button>`}
function editModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>עריכת פריט</h2><button class="close" data-action="close">✕</button></div><form id="edit-item-form" data-id="${item.id}">${proposalFields(item,{alwaysWebsite:true})}<button class="btn">שמירה</button></form></section></div>`}
function duplicateModal(){const {suggestionId,duplicateIds}=state.modal,suggestion=suggestionById(suggestionId),duplicates=state.items.filter(item=>duplicateIds.includes(item.id));return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>נמצאה הזמנה דומה</h2><button class="close" data-action="close">✕</button></div><p>ערכים מיובאים ריקים לא ידרסו מידע קיים.</p><div class="list">${duplicates.map(itemRow).join('')}</div><div class="actions"><button class="btn" data-action="duplicate-merge" data-suggestion="${suggestion.id}" data-target="${duplicates[0]?.id||''}">מיזוג</button><button class="btn secondary" data-action="duplicate-keep" data-suggestion="${suggestion.id}">שמירת שניהם</button><button class="btn ghost" data-action="close">ביטול</button></div></section></div>`}
function simpleFormModal(){const type=state.modal.type;if(type==='task'){const task=state.tasks.find(candidate=>candidate.id===state.modal.taskId)||{title:'',owner:'shared',mode:'date',dueDate:''};return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.taskId?'עריכת משימה':'משימה חדשה'}</h2><button class="close" data-action="close">✕</button></div><form id="task-form" data-id="${task.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('משימה')}<input name="title" required aria-required="true" value="${esc(task.title)}"></label><label class="field">בעלים<input name="owner" placeholder="משותף או שם משתתף" value="${esc(task.owner==='shared'?'':task.owner||'')}"></label><label class="field">מועד<select name="mode"><option value="date" ${task.mode==='date'?'selected':''}>תאריך</option><option value="entire" ${task.mode==='entire'?'selected':''}>לכל הטיול</option><option value="none" ${task.mode==='none'?'selected':''}>ללא תאריך</option></select></label><label class="field">תאריך יעד<input type="date" name="dueDate" value="${esc(task.dueDate||'')}"></label><button class="btn">שמירה</button></form></section></div>`}if(type==='shopping')return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>פריט קניות</h2><button class="close" data-action="close">✕</button></div><form id="shopping-form"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('פריט')}<input name="name" required aria-required="true"></label><label class="field">כמות<input name="quantity" value="1"></label><label class="field">בעלים<input name="owner" placeholder="משותף או שם משתתף"></label><label class="field">קישור לצורך אריזה/הכנה<input name="linkedNeed"></label><button class="btn">שמירה</button></form></section></div>`;return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>מיקום</h2><button class="close" data-action="close">✕</button></div><form id="location-form" data-id="${state.modal.locationId||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('שם מקום')}<input name="placeName" required aria-required="true" value="${esc(state.modal.record?.placeName||'')}"></label><label class="field">${requiredLabel('כתובת / חיפוש')}<input name="address" required aria-required="true" value="${esc(state.modal.record?.address||'')}"></label><div class="grid two"><label class="field">קו רוחב<input name="lat" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lat||'')}"></label><label class="field">קו אורך<input name="lng" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lng||'')}"></label></div><label class="field">מקור<input name="source" value="${esc(state.modal.record?.source||'manual')}"></label><label class="field">ביטחון<select name="confidence"><option>high</option><option selected>medium</option><option>low</option></select></label><a class="btn ghost" href="${mapsUrl(state.modal.record?.address||'Thailand')}" target="_blank" rel="noopener">חיפוש / הצבת סיכה במפה</a><button class="btn">אישור ושמירה</button></form></section></div>`}
function modal(){if(!state.modal)return '';if(state.modal.type==='intake')return intakeModal();if(state.modal.type==='attachment')return attachmentModal();if(state.modal.type==='edit-item')return editModal();if(state.modal.type==='duplicate')return duplicateModal();if(['task','shopping','location'].includes(state.modal.type))return simpleFormModal();return ''}
function nav(){return `<nav class="nav">${[['today','🏠','Today'],['timeline','🗓️','Timeline'],['center','🗂️','Trip Center'],['settings','⚙️','הגדרות']].map(([key,icon,label])=>`<button class="${state.view===key||(['detail','suggestion','games','packing','tasks','shopping','locations'].includes(state.view)&&key==='center')?'active':''}" data-route="${key}">${icon}<br>${label}</button>`).join('')}</nav>`}
function render(){normalizeOperationalState(state);const views={today:todayView,timeline,center,detail:detailView,suggestion:suggestionView,games:gamesView,packing:packingView,tasks:tasksView,shopping:shoppingView,locations:locationsView,settings:settingsView},body=(views[state.view]||todayView)();document.querySelector('#app').innerHTML=`<div class="shell">${!navigator.onLine?'<div class="offline">מצב אופליין — המידע המקומי זמין</div>':''}${header()}<main>${body}</main><button class="fab" data-action="create">+</button>${nav()}${modal()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}</div>`}

async function storeOriginal(source,file){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id:source.id,blob:file,name:file.name,type:file.type});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});source.storedOffline=true}
async function openSource(id){const source=sourceById(id);if(!source)return;if(source.kind==='link'){open(source.url,'_blank','noopener');return}try{const db=await openDb(),record=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),request=tx.objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});if(!record?.blob){notify('קובץ המקור אינו זמין אופליין במכשיר זה');return}const url=URL.createObjectURL(record.blob);open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(error){console.error(error);notify('פתיחת המקור נכשלה')}}
function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('family-trips-v4',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function clearStoredSources(){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch(error){console.error('Stored source cleanup failed',error);throw new Error('מחיקת קובצי המקור נכשלה. לא בוצע איפוס.') }}
async function resetCurrentTrip(removeTrip){
  const tripName=state.trip?.name||'הטיול הנוכחי';
  await clearStoredSources();
  const preservedTrip=removeTrip?null:clone(state.trip);
  state=normalizeOperationalState({...clone(EMPTY),trip:preservedTrip,view:removeTrip?'today':'settings'});
  qrCollector.reset();
  if(removeTrip)localStorage.removeItem(KEY);else{state.packing=defaultPacking();save()}
  render();scrollTo(0,0);notify(removeTrip?`הטיול ${tripName} נמחק`:'נתוני הטיול נמחקו; שם הטיול והתאריכים נשמרו');
}
async function ingest(){const kind=state.modal.source;if(kind==='link'){alert('קליטת קישור לפריט חדש הוסרה. אפשר להוסיף קישור בעריכת פריט קיים או לייבא אותו דרך QR/JSON מאומת.');return}if(kind==='photo'){alert('קליטה חכמה מתמונה או צילום מושהית עד לתכנון Smart Import מחדש. לא נוצרו מקור, הצעה או פריט.');return}const file=document.querySelector('#source-file')?.files?.[0],validation=validateSource({kind,file});if(!validation.ok){alert(validation.error);return}ensureTrip({name:'טיול חדש'});notify('קורא את תוכן ה־PDF…');const extraction=await extractSourceContent(file,message=>console.info('[extraction]',message)),source={id:uid('src'),kind:'file',name:file.name,type:file.type,size:file.size,status:'ממתין לאישור — PDF ניסיוני',createdAt:new Date().toISOString(),storedOffline:false,text:extraction.text,extractionEngine:extraction.engine,extractionWarnings:['קליטת PDF היא ניסיונית — יש לבדוק כל שדה לפני אישור.',...extraction.warnings],experimental:true,fingerprint:await sha256File(file),tripStartDate:''};state.sources.push(source);try{await storeOriginal(source,file)}catch(error){console.error(error);state.sources=state.sources.filter(item=>item.id!==source.id);alert('שמירת המקור נכשלה. לא נוצרה הצעה.');return}state.suggestions.push(...createSuggestions(source));finishIngest(state.suggestions.filter(item=>item.sourceId===source.id).length>1?'ה־PDF פוצל למספר הצעות ניסיוניות לבדיקה':'ה־PDF נשמר כהצעה ניסיונית לבדיקה')}
// Shared by smartIngest, attachIngest and analyzeSavedSource: runs the paid analysis for an
// already-created/linked source and turns the result into one or more review proposals (a
// Flight source may describe several real segments, each becoming its own suggestion -- see
// smartImportFlightResultToSuggestions). targetItem is set only for an attach-and-extract flow,
// where it also protects the target's trusted fields (V6-F15) instead of letting a blank or
// differing extraction silently overwrite them.
async function runSmartAnalysis(source,file,targetItem=null){
  // Attach-and-extract already knows its category from the target item, so it calls the
  // matching analyze_* operation directly (no reason to spend an extra classification call on a
  // category that's already certain). A brand-new source has no target yet, so it goes through
  // analyze_source, which classifies from content first -- see smart-import.mjs.
  source.status='בניתוח';source.processingState='processing';save();render();
  try{
    const result=targetItem
      ?await (targetItem.type==='flight'?analyzeFlightSource({trip:state.trip,source,file}):targetItem.type==='activity'?analyzeActivitySource({trip:state.trip,source,file}):analyzeHotelSource({trip:state.trip,source,file}))
      // V6-F69: source.url is only ever non-empty for a kind:'link' source (createLocalSource
      // sets it to the submitted URL, '' for a file); forwarding it here is what actually lets a
      // brand-new item's global Add-by-link reach the network at all.
      :await analyzeSource({trip:state.trip,source,file,url:source.url});
    const category=targetItem?targetItem.type:result.category;
    if(category==='unrecognized')throw new Error('לא זוהה מסמך מלון, טיסה או אטרקציה במקור. לא נוצרה הצעה.');
    let suggestions=category==='flight'?smartImportFlightResultToSuggestions(result,source):category==='activity'?[smartImportActivityResultToSuggestion(result,source)]:[smartImportResultToSuggestion(result,source)];
    // V6-F72: flags a newly extracted flight segment whose airports are the exact reverse of an
    // already-saved item sharing its flight number -- the precise, deterministic signature of the
    // FL-001/FL-003 RTL-misread failure mode, independent of whatever the live model itself
    // reported as its own confidence. Runs for every flight suggestion, not only attach-and-extract.
    if(category==='flight')suggestions=suggestions.map(suggestion=>flagReversedFlightDirection(suggestion,state.items));
    if(targetItem)suggestions=suggestions.map(suggestion=>{const merged=preserveTrustedFieldsOnMerge(suggestion,targetItem);merged.targetItemId=targetItem.id;return merged});
    if(!suggestions.length)throw new Error('לא זוהה מקטע טיסה תקין במקור. לא נוצרה הצעה.');
    state.suggestions.push(...suggestions);
    source.status=targetItem?'מצורף — חילוץ ממתין לאישור':'ממתין לאישור';
    source.processingState='proposal_ready';source.processingAttemptId=result.attemptId;save();
    route('suggestion',{suggestionId:suggestions[0].id});
    notify(targetItem?'נוצרה הצעת עדכון; דבר לא שונה עדיין':suggestions.length>1?`הניתוח הסתיים — ${suggestions.length} הצעות טיסה ממתינות לבדיקה`:'הניתוח הסתיים — יש לבדוק ולאשר כל שדה');
  }catch(error){
    source.status=targetItem?'מצורף — החילוץ נכשל':'הניתוח נכשל — המקור נשמר';
    source.processingState='failed';source.processingError=String(error.message||error);save();
    // The Add/Attach modal must close on failure, not just navigate the background view behind
    // it -- otherwise it stays open showing the "analyzing" spinner (ingestBusy is still true
    // here) until the user notices and closes it manually, even though the app has already
    // moved on and nothing is actually in flight.
    state.modal=null;
    route(targetItem?'detail':'center',targetItem?{itemId:targetItem.id}:{category:'document'});
    alert(`${error.message}\n${targetItem?'המסמך נשאר מצורף והפריט לא השתנה.':'המקור המקורי נשמר ולא נוצר פריט.'}`);
  }
}
async function smartIngest(){
  if(ingestBusy)return;
  ensureTrip({name:'טיול חדש'});const kind=state.modal.source,mode=document.querySelector('input[name="processing-mode"]:checked')?.value||'analyze',file=kind==='link'?null:pendingSourceFile,url=normalizeUrlInput(document.querySelector('#source-url')?.value);
  try{validateSmartSource(kind,file,url)}catch(error){alert(error.message);return}
  ingestBusy=true;
  try{
    const source=await createLocalSource(kind,file,url);state.sources.push(source);save();
    if(mode==='save'){Object.assign(source,saveOnlySource(source));save();pendingSourceFile=null;state.modal=null;route('center',{category:'document'});notify('המקור נשמר ללא ניתוח');return}
    await runSmartAnalysis(source,file);
    pendingSourceFile=null;state.modal=null;
  }finally{ingestBusy=false}
}
async function attachIngest(itemId){
  if(ingestBusy)return;
  const item=state.items.find(candidate=>candidate.id===itemId),kind=state.modal.source||'file',mode=document.querySelector('input[name="processing-mode"]:checked')?.value||'attach',file=pendingSourceFile;if(!item)return;
  try{validateSmartSource(kind,file,'')}catch(error){alert(error.message);return}
  ingestBusy=true;
  try{
    const source=await createLocalSource(kind,file,'');source.status=mode==='attach'?'מצורף לפריט':'בניתוח';source.processingState=mode==='attach'?'attached_only':'processing';state.sources.push(source);item.sourceIds=[...new Set([...(item.sourceIds||[]),source.id])];save();
    if(mode==='attach'){pendingSourceFile=null;state.modal=null;route('detail',{itemId:item.id});notify('המסמך צורף ללא שינוי בפרטי הפריט');return}
    await runSmartAnalysis(source,file,item);
    pendingSourceFile=null;state.modal=null;
  }finally{ingestBusy=false}
}
async function analyzeSavedSource(id){
  if(ingestBusy)return;
  const source=sourceById(id);if(!source)return;
  let file;
  try{
    const db=await openDb(),record=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),request=tx.objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    if(!record?.blob)throw new Error('קובץ המקור אינו זמין אופליין במכשיר זה. לא ניתן לנתח ללא הקובץ.');
    file=new File([record.blob],record.name||source.name,{type:record.type||source.type});
  }catch(error){alert(error.message||'שליפת הקובץ נכשלה.');return}
  ingestBusy=true;
  try{await runSmartAnalysis(source,file)}finally{ingestBusy=false}
}
async function createLocalSource(kind,file,url){const source={id:uid('src'),kind:kind==='link'?'link':kind==='photo'?'photo':'file',name:kind==='link'?url:file.name,url:kind==='link'?url:'',type:file?.type||'text/html',size:file?.size||0,status:'נשמר',createdAt:new Date().toISOString(),storedOffline:kind==='link',experimental:false,processingState:'saved'};if(file){source.fingerprint=await sha256File(file);try{await storeOriginal(source,file)}catch(error){throw new Error('שמירת המקור במכשיר נכשלה. לא נשלח מידע לניתוח.')}}return source}
// kind is 'document' from the merged Add screen (V6 fix pass), or still 'file'/'photo' from the
// unchanged attach-to-existing-item screen -- either way, PDF or one of the three image types.
// V6-F38: both the Add screen and the per-item attachment modal now only ever pass 'link' or
// 'document' here (the separate 'file'/'photo' kinds this used to validate are gone from the UI
// entirely), so their branches were removed rather than left as unreachable dead code.
function validateSmartSource(kind,file,url){if(kind==='link'){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error()}catch{throw new Error('יש להזין כתובת HTTP או HTTPS תקינה.')}return}if(!file)throw new Error('יש לבחור קובץ.');const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name),isImage=/^image\/(?:png|jpeg|webp)$/.test(file.type);if(kind==='document'&&!isPdf&&!isImage)throw new Error('יש לבחור קובץ PDF או תמונה.');if(file.size>15*1024*1024)throw new Error('הקובץ גדול מ־15MB.')}
function finishIngest(message){save();state.modal=null;route('center',{category:'document'});notify(message)}
async function importBatch(batch,transport){ensureTrip({name:batch.tripContext?.name||'טיול חדש',startDate:batch.tripContext?.startDate,endDate:batch.tripContext?.endDate});const converted=importBatchToApp(batch,{idFactory:uid});state.sources.push(...converted.sources);state.suggestions.push(...converted.suggestions);finishIngest(`${converted.summary.suggestions} הצעות נקלטו מ־${transport==='qr'?'QR':'JSON'} וממתינות לאישור`)}
async function importJsonFile(){const file=document.querySelector('#import-json')?.files?.[0];if(!file){alert('יש לבחור קובץ JSON');return}try{const decoded=await decodeExternalText(await file.text());if(decoded.kind!=='batch')throw new Error('נבחר חלק QR במקום קובץ יבוא');await importBatch(decoded.batch,'json')}catch(error){alert(error.message)}}
async function acceptQrText(text){try{const decoded=await decodeExternalText(text);if(decoded.kind==='batch'){await importBatch(decoded.batch,'qr');return}const progress=qrCollector.add(decoded.chunk);if(progress.complete){const batch=await qrCollector.finish();qrCollector.reset();await importBatch(batch,'qr')}else updateQrProgress(progress)}catch(error){alert(error.message)}}
function updateQrProgress(progress){const actions=document.querySelector('.qr-video + .actions');let box=document.querySelector('.qr-progress');if(!box&&actions){box=document.createElement('div');box.className='qr-progress';actions.after(box)}if(box)box.innerHTML=`<b>חלקים שנקלטו: ${progress.collected}/${progress.total}</b><p>חסרים: ${progress.missing.join(', ')||'אין'}</p>`}
async function decodeQrImage(file){if(!('BarcodeDetector'in window)){alert('פענוח QR מתמונה אינו נתמך בדפדפן זה. אפשר להדביק payload או להשתמש במצלמת Chrome מעודכנת.');return}try{const detector=new BarcodeDetector({formats:['qr_code']}),bitmap=await createImageBitmap(file),codes=await detector.detect(bitmap);bitmap.close();if(!codes.length)throw new Error('לא נמצא QR בתמונה');await acceptQrText(codes[0].rawValue)}catch(error){alert(error.message)}}
async function startCamera(){if(!('BarcodeDetector'in window)){alert('סריקת QR אינה נתמכת בדפדפן זה. אפשר לבחור תמונה או להדביק payload.');return}try{stopCamera();cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});const video=document.querySelector('#qr-video');video.srcObject=cameraStream;await video.play();const detector=new BarcodeDetector({formats:['qr_code']});cameraTimer=setInterval(async()=>{try{const codes=await detector.detect(video);if(codes[0]){clearInterval(cameraTimer);cameraTimer=null;await acceptQrText(codes[0].rawValue);if(state.modal?.source==='qr')await startCamera()}}catch{}},500)}catch(error){stopCamera();alert('המצלמה לא זמינה. אפשר לבחור תמונת QR מהגלריה או לבטל ללא שמירת מידע.')}}
function stopCamera(){if(cameraTimer)clearInterval(cameraTimer);cameraTimer=null;if(cameraStream)cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null}
// Revised V6-F32 (fix pass 3): applies the Product Owner's chosen candidate reading (see
// directionPickerPanel) to the suggestion in place -- location/startAt/endAt and the
// departure/arrival airport details all switch together, exactly as one linked group.
// V6-F35 (reopened, fix pass 5): a picker selection is one of the three ways a field's value can
// change (picker, manual form edit, merge) -- reconcileStaleNeedsReview is the same general
// mechanism updateSuggestion now uses for a manual edit, so a pick also correctly drops the
// STALE needsReviewFields entry itself (not just its warning text), keeping the evidence panel
// accurate too. clearResolvedDirectionWarning stays as a supplementary catch-all for a
// model-authored free-text warning (e.g. "Direction ambiguity prevents assigning...") that isn't
// backed by a structured needsReviewFields entry at all.
function pickFlightDirection(suggestion,index){
  if(!suggestion)return;
  const candidate=suggestion.proposed.details?.directionCandidates?.[index];if(!candidate)return;
  const updated={...suggestion.proposed,location:candidate.label,startAt:candidate.startAt,endAt:candidate.endAt,details:{...suggestion.proposed.details,departureAirport:candidate.departureAirport,arrivalAirport:candidate.arrivalAirport,directionPickIndex:index}};
  const reconciled=reconcileStaleNeedsReview(updated,new Set(['location','startAt','endAt']));
  suggestion.proposed={...reconciled,warnings:clearResolvedDirectionWarning(reconciled.warnings)};
  suggestion.warnings=suggestion.proposed.warnings;
  suggestion.updatedAt=new Date().toISOString();
  save();
}
// V6-F35 (reopened, fix pass 5): a manual edit here is exactly as valid a resolution as a
// direction pick -- reconcileStaleNeedsReview drops any needs-review flag (and its warning) whose
// mapped field the Product Owner just changed, general to any flagged field, not only direction.
function updateSuggestion(form,suggestion){const data=new FormData(form),before=suggestion.proposed,type=String(data.get('type')),range=normalizeDateRange(data.get('startAt'),data.get('endAt'),{allowEndBeforeStart:type==='flight'});
  const next={type,title:String(data.get('title')||'').trim(),provider:String(data.get('provider')||'').trim(),confirmationNumber:String(data.get('confirmationNumber')||'').trim(),location:String(data.get('location')||'').trim(),website:normalizeUrlInput(data.get('website')),phone:String(data.get('phone')||'').trim(),startAt:range.start,endAt:range.end,participants:String(data.get('participants')||'').split(',').map(x=>x.trim()).filter(Boolean),notes:String(data.get('notes')||'').trim(),schedule:ITEM_TYPES[type]?.schedule||'none'};
  const changedFields=new Set(['title','provider','confirmationNumber','location','website','phone','startAt','endAt','notes'].filter(key=>String(before[key]||'')!==String(next[key]||'')));
  suggestion.proposed=reconcileStaleNeedsReview({...before,...next},changedFields);
  suggestion.warnings=suggestion.proposed.warnings;
  suggestion.updatedAt=new Date().toISOString();suggestion.status='pending'}
function approveSuggestion(suggestion,mode='check',targetId=''){if(!suggestion||suggestion.proposed.type==='link'){alert('קישור אינו סוג פריט עצמאי. יש לשייך אותו לפריט נסיעה נתמך.');return}if(mode==='check'&&suggestion.targetItemId){approveSuggestion(suggestion,'merge',suggestion.targetItemId);return}const duplicates=findPossibleDuplicates(suggestion,state.items,state.sources);if(mode==='check'&&duplicates.length){state.modal={type:'duplicate',suggestionId:suggestion.id,duplicateIds:duplicates.map(item=>item.id)};render();return}let mergeHadConflict=false;
  if(mode==='merge'){
    const target=state.items.find(item=>item.id===targetId);if(!target)return;
    // V6-F33 (regression from V6-F30's new cross-source dedup fallback): suggestionToItem()'s
    // own merge always let a non-blank proposed value win over a non-blank existing one, which
    // is correct for a brand-new item (existing={}) but wrong for merging into an
    // already-approved item -- a newer source's conflicting value (e.g. V6-F32's now-fixed
    // reversed direction/dates) silently became the item's primary value. Reusing
    // preserveTrustedFieldsOnMerge here -- the same trusted-field protection already used for
    // attach-and-extract -- keeps the existing item's non-blank values as primary on conflict and
    // records the differing new value as a reviewable candidate + warning instead.
    // V6-F73: a suggestion that already carries targetItemId was already run through
    // preserveTrustedFieldsOnMerge once, at creation time (see runSmartAnalysis), and any conflict
    // it found is already reflected in suggestion.proposed.details.mergeCandidates for the
    // Product Owner to resolve via the merge-candidate picker. Calling it AGAIN here re-compares
    // the (possibly now-resolved) suggestion value against the target item's still-untouched old
    // value -- which the target hasn't been assigned yet, since that happens two lines below -- so
    // a resolution that picked the new value reads as a brand-new conflict and gets silently
    // reverted back to the old value, with a fresh mergeCandidates entry recreated on the very item
    // being saved. That is exactly the observed Panvaree Resort bug: the detail page (which reads
    // the persisted item, not the suggestion) shows the old values and the same prompt reappears,
    // because the "resolution" the Product Owner saved was discarded before it ever reached the
    // item. A suggestion with no targetItemId (the duplicate-dialog merge path, whose target is
    // only chosen at approval time) has never been through preserveTrustedFieldsOnMerge before and
    // still needs it run here for the first time -- that path is unaffected by this fix.
    const protectedSuggestion=suggestion.targetItemId?suggestion:preserveTrustedFieldsOnMerge(suggestion,target);
    mergeHadConflict=Object.keys(protectedSuggestion.proposed.details?.mergeCandidates||{}).length>0;
    // V6-F36/V6-F39 (fix pass 4): an ambiguous suggestion merging into a trusted item either
    // already had its direction picked by the Product Owner, or -- more likely, since dedup can
    // now match an ambiguous suggestion by flight number/candidate dates alone (see
    // isSameFlightAcrossDirectionCandidates) -- just inherited the target's already-resolved
    // direction via preserveTrustedFieldsOnMerge's blank-fill above. suggestionToItem() itself
    // detects that (once the merged location is non-blank) and clears the stale "pick one"
    // warning (V6-F35) from this suggestion's own still-ambiguous extraction attempt, so it isn't
    // dragged onto the merged item.
    Object.assign(target,suggestionToItem(protectedSuggestion,target));
  }else state.items.push(suggestionToItem(suggestion,{},state.trip?.startDate||''));
  suggestion.status='approved';for(const sourceId of suggestion.sourceIds||[suggestion.sourceId]){const source=sourceById(sourceId);if(source)source.status='משויך לפריט'}save();state.modal=null;route(mode==='merge'?'detail':'center',mode==='merge'?{itemId:targetId}:{category:suggestion.proposed.type});notify(mode==='merge'?(mergeHadConflict?'העדכון אושר ומוזג — נמצאו ערכים סותרים, הערך הקיים נשמר והערך החדש סומן לבדיקה בפרטי הפריט':'העדכון אושר ומוזג בלי לדרוס ערכים קיימים בערכים ריקים'):'ההצעה אושרה ונוצר פריט')}

addEventListener('click',async event=>{const routeButton=event.target.closest('[data-route]');if(routeButton){route(routeButton.dataset.route,{category:routeButton.dataset.cat,itemId:routeButton.dataset.id,suggestionId:routeButton.dataset.id});return}const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action==='create'){state.modal={type:'intake',source:'manual'};render()}
  else if(action==='close'){stopCamera();pendingSourceFile=null;state.modal=null;render()}
  else if(action==='source'){stopCamera();pendingSourceFile=null;state.modal.source=button.dataset.source;render()}
  else if(action==='ingest')await ingest();
  else if(action==='smart-ingest')await smartIngest();
  else if(action==='attach-source'){state.modal={type:'attachment',itemId:button.dataset.id,source:'document'};render()}
  else if(action==='attach-ingest')await attachIngest(button.dataset.id);
  else if(action==='analyze-source')await analyzeSavedSource(button.dataset.id);
  else if(action==='import-json')await importJsonFile();
  else if(action==='qr-camera')await startCamera();
  else if(action==='qr-text')await acceptQrText(document.querySelector('#qr-text')?.value);
  else if(action==='qr-reset'){stopCamera();qrCollector.reset();render()}
  else if(action==='timeline-mode'){state.timelineMode=button.dataset.mode;if(state.timelineMode==='all')state.timelineCursor=state.trip?.startDate||state.timelineCursor||today();else if(state.timelineMode==='day')state.timelineCursor=state.calendarDate||state.timelineCursor||state.trip?.startDate||today();render()}
  else if(action==='timeline-shift'){state.timelineCursor=shiftCursor(state.timelineCursor,state.timelineMode,Number(button.dataset.dir));render()}
  else if(action==='calendar-date'){state.calendarDate=button.dataset.date;state.timelineCursor=button.dataset.date;state.timelineMode='day';render()}
  else if(action==='open-source')await openSource(button.dataset.id);
  else if(action==='pick-direction'){pickFlightDirection(suggestionById(button.dataset.id),Number(button.dataset.index));render()}
  else if(action==='defer-suggestion'){suggestionById(button.dataset.id).status='deferred';save();route('center',{category:'document'});notify('ההצעה נשמרה לאחר כך')}
  // V6-F49/V6-F55 backstop: a plain-string warning not currently backed by a live needsReviewFields
  // entry can never auto-clear via an edit (see isDismissibleWarning) -- this is the only way the
  // Product Owner can remove it once they've judged it addressed/irrelevant.
  else if(action==='dismiss-warning'){const suggestion=suggestionById(button.dataset.id);const index=Number(button.dataset.index);if(suggestion&&isDismissibleWarning(suggestion.warnings?.[index],suggestion.proposed?.details)){suggestion.warnings=suggestion.warnings.filter((_,i)=>i!==index);suggestion.proposed.warnings=suggestion.warnings;save();render()}}
  // V6-F54: the item-page counterpart to dismiss-warning above -- addresses state.items, not
  // state.suggestions, since a dismissible unresolved-sourced warning previously had no way to
  // ever be dismissed once its suggestion was approved into an item.
  else if(action==='dismiss-item-warning'){const item=state.items.find(candidate=>candidate.id===button.dataset.id);const index=Number(button.dataset.index);if(item&&isDismissibleWarning(item.warnings?.[index],item.details)){item.warnings=item.warnings.filter((_,i)=>i!==index);save();render()}}
  // V6-F55: resolves a merge-conflict field (mergeCandidatePanel) by an explicit Product Owner
  // choice instead of leaving it as a silently-kept value plus an indefinite warning. Works on
  // either a pending suggestion's proposed object or an already-saved item -- resolveMergeCandidate
  // (ingestion.js) is agnostic to which, since both share the same shape.
  else if(action==='resolve-merge-candidate'){
    const scope=button.dataset.scope,key=button.dataset.key,choice=button.dataset.choice;
    if(scope==='suggestion'){
      const suggestion=suggestionById(button.dataset.id);if(!suggestion)return;
      suggestion.proposed=resolveMergeCandidate(suggestion.proposed,key,choice);
      suggestion.warnings=suggestion.proposed.warnings;
      suggestion.updatedAt=new Date().toISOString();
    }else{
      const item=state.items.find(candidate=>candidate.id===button.dataset.id);if(!item)return;
      Object.assign(item,resolveMergeCandidate(item,key,choice));
    }
    save();render();
  }
  else if(action==='reject-suggestion'){if(confirm('לדחות את ההצעה? המקורות יישמרו.')){const lifecycle=rejectProposal(state.suggestions,state.rejectedSuggestions,button.dataset.id);state.suggestions=lifecycle.suggestions;state.rejectedSuggestions=lifecycle.rejectedSuggestions;save();route('center',{category:'document'});notify('ההצעה הועברה לארכיון')}}
  else if(action==='duplicate-merge')approveSuggestion(suggestionById(button.dataset.suggestion),'merge',button.dataset.target);
  else if(action==='duplicate-keep')approveSuggestion(suggestionById(button.dataset.suggestion),'keep');
  else if(action==='edit-item'){state.modal={type:'edit-item',itemId:button.dataset.id};render()}
  else if(action==='delete-item'){if(confirm('למחוק את הפריט? המקורות יחזרו למסמכים.')){const item=state.items.find(x=>x.id===button.dataset.id);for(const sourceId of item?.sourceIds||[]){const source=sourceById(sourceId);if(source)source.status='לא משויך'}state.items=state.items.filter(x=>x.id!==button.dataset.id);save();route('center')}}
  else if(action==='reset-trip-data'){if(confirm(`למחוק את כל נתוני הטיול "${state.trip?.name||''}"? שם הטיול והתאריכים יישמרו, אך הפריטים, המסמכים, המשימות, הקניות, האריזה והמיקומים יימחקו מהמכשיר.`)){try{await resetCurrentTrip(false)}catch(error){alert(error.message)}}}
  else if(action==='delete-current-trip'){if(confirm(`למחוק לצמיתות מהמכשיר את הטיול "${state.trip?.name||''}" ואת כל הנתונים המשויכים אליו?`)){try{await resetCurrentTrip(true)}catch(error){alert(error.message)}}}
  else if(action==='game-favorite'){const game=state.games.find(x=>x.id===button.dataset.id);game.favorite=!game.favorite;save();render()}
  else if(action==='add-list'){const name=prompt('שם קטגוריית האריזה');if(name){state.packing.push({id:uid('pl'),name,owner:'shared',items:[]});save();render()}}
  else if(action==='pack-collapse'){state.packingCollapsed[button.dataset.list]=!state.packingCollapsed[button.dataset.list];save();render()}
  else if(action==='pack-add'){const name=prompt('שם הפריט');if(name){if(packingDuplicate(state.packing,name)){alert('פריט בשם זה כבר קיים בקטגוריה אחרת.');return}const owner=prompt('בעלים — השאר ריק למשותף')||'shared';state.packing.find(list=>list.id===button.dataset.list).items.push({id:uid('pi'),name,done:false,suggested:false,owner});save();render()}}
  else if(action==='task-add'){state.modal={type:'task'};render()}
  else if(action==='task-edit'){state.modal={type:'task',taskId:button.dataset.id};render()}
  else if(action==='shopping-add'){state.modal={type:'shopping'};render()}
  else if(action==='location-add'){state.modal={type:'location'};render()}
  else if(action==='location-approve'){const record=state.locationRecords.find(x=>x.id===button.dataset.id);state.modal={type:'location',locationId:record.id,record};render()}
});
addEventListener('change',async event=>{const action=event.target.dataset.action;if(action==='pack-toggle'){const list=state.packing.find(x=>x.id===event.target.dataset.list),item=list?.items.find(x=>x.id===event.target.dataset.item);if(item){item.done=event.target.checked;save();render()}}else if(action==='task-toggle'){const task=state.tasks.find(x=>x.id===event.target.dataset.id);task.done=event.target.checked;save();render()}else if(action==='shopping-toggle'){const item=state.shopping.find(x=>x.id===event.target.dataset.id);item.purchased=event.target.checked;save();render()}else if(event.target.id==='qr-image'&&event.target.files?.[0])await decodeQrImage(event.target.files[0]);else if(event.target.id==='source-file'){pendingSourceFile=event.target.files?.[0]||null}else if(event.target.id==='calendar-month'){state.calendarDate=`${event.target.value}-01`;state.timelineCursor=state.calendarDate;render()}else if(['startAt','startDate'].includes(event.target.name)){const form=event.target.closest('form'),endName=event.target.name==='startAt'?'endAt':'endDate',endInput=form?.elements?.namedItem(endName),isFlight=form?.elements?.namedItem('type')?.value==='flight';if(endInput){const range=normalizeDateRange(event.target.value,endInput.value,{allowEndBeforeStart:isFlight});if(range.end!==endInput.value)endInput.value=range.end}}else if(event.target.matches('select[data-action="proposal-type"]')){const form=event.target.closest('form'),current=new FormData(form),values={type:event.target.value,title:current.get('title')||'',provider:current.get('provider')||'',confirmationNumber:current.get('confirmationNumber')||'',location:current.get('location')||'',website:current.get('website')||'',phone:current.get('phone')||'',startAt:current.get('startAt')||'',endAt:current.get('endAt')||'',participants:String(current.get('participants')||'').split(',').map(x=>x.trim()).filter(Boolean),notes:current.get('notes')||''},actions=form.querySelector('.actions')?.outerHTML||form.querySelector('.btn')?.outerHTML||'';form.innerHTML=proposalFields(values,{alwaysWebsite:form.id==='edit-item-form'})+actions}});
function requiresOutOfRangeConfirmation(values){return isItemOutsideTrip(values,state.trip)}
function confirmOutOfRangeSave(values){return !requiresOutOfRangeConfirmation(values)||confirm(`התאריך שנבחר מחוץ לטווח הטיול (${state.trip.startDate} עד ${state.trip.endDate}). לשמור בכל זאת?`)}
addEventListener('submit',event=>{event.preventDefault();const form=event.target,data=new FormData(form);
  if(form.id==='trip-form'){const range=normalizeDateRange(data.get('startDate'),data.get('endDate')),start=range.start,end=range.end,added=backfillTripDates(state.items,start);state.trip={...state.trip,name:String(data.get('name')).trim(),startDate:start,endDate:end};if(!state.timelineCursor)state.timelineCursor=start;save();render();notify(added?`הטיול נשמר ו־${added} פריטים ללא תאריך קיבלו את תאריך ההתחלה`:'הטיול נשמר')}
  else if(form.id==='manual-form'||form.id==='edit-item-form'){const type=String(data.get('type')),values=buildItemFormValues(data);ensureTrip();if(!confirmOutOfRangeSave(values)){if(form.id==='edit-item-form'){state.modal={type:'edit-item',itemId:form.dataset.id};render()}return}
    if(form.id==='manual-form')state.items.push({id:uid('item'),...values,sourceIds:[]});
    else{
      const item=state.items.find(x=>x.id===form.dataset.id);
      // V6-F54: mirrors updateSuggestion's own changedFields computation exactly (ingestion.js) --
      // previously nothing on the item-edit path ever called reconcileStaleNeedsReview at all, so
      // a needsReviewFields-sourced warning could never clear here even though editing the exact
      // same field already clears it on the pre-approval suggestion form.
      const changedFields=new Set(['title','provider','confirmationNumber','location','website','phone','startAt','endAt','notes'].filter(key=>String(item[key]||'')!==String(values[key]||'')));
      const reconciled=reconcileStaleNeedsReview(item,changedFields);
      Object.assign(item,values,{details:reconciled.details,warnings:reconciled.warnings});
    }
    save();state.modal=null;route(form.id==='manual-form'?'center':'detail',form.id==='manual-form'?{category:type}:{itemId:form.dataset.id})}
  else if(form.id==='suggestion-form'){const suggestion=suggestionById(form.dataset.id);updateSuggestion(form,suggestion);if(event.submitter?.value==='approve'){save();approveSuggestion(suggestion)}else{save();render();notify('עריכת ההצעה נשמרה')}}
  else if(form.id==='task-form'){const values={title:String(data.get('title')).trim(),owner:String(data.get('owner')||'shared').trim()||'shared',mode:String(data.get('mode')),dueDate:String(data.get('dueDate')||'')},existing=state.tasks.find(task=>task.id===form.dataset.id);if(existing)Object.assign(existing,values);else state.tasks.push({id:uid('task'),...values,done:false});save();state.modal=null;render()}
  else if(form.id==='shopping-form'){state.shopping.push({id:uid('shop'),name:String(data.get('name')).trim(),quantity:String(data.get('quantity')||'1'),owner:String(data.get('owner')||'shared').trim()||'shared',linkedNeed:String(data.get('linkedNeed')||'').trim(),purchased:false});save();state.modal=null;render()}
  else if(form.id==='location-form'){const id=form.dataset.id||uid('loc'),existing=state.locationRecords.find(x=>x.id===id),record={id,placeName:String(data.get('placeName')).trim(),address:String(data.get('address')).trim(),coordinates:data.get('lat')&&data.get('lng')?{lat:Number(data.get('lat')),lng:Number(data.get('lng'))}:null,source:String(data.get('source')||'manual'),confidence:String(data.get('confidence')||'medium'),approved:true};if(existing)Object.assign(existing,record);else state.locationRecords.push(record);save();state.modal=null;render()}
});
addEventListener('touchstart',event=>{if(event.target.closest('[data-timeline-calendar]'))timelineSwipeStartX=event.changedTouches[0]?.clientX??null},{passive:true});
addEventListener('touchend',event=>{if(timelineSwipeStartX===null||!event.target.closest('[data-timeline-calendar]'))return;const endX=event.changedTouches[0]?.clientX??timelineSwipeStartX,delta=endX-timelineSwipeStartX;timelineSwipeStartX=null;if(Math.abs(delta)<50||state.timelineMode!=='week')return;state.timelineCursor=shiftCursor(state.timelineCursor,'week',delta<0?1:-1);render()},{passive:true});
addEventListener('online',render);addEventListener('offline',render);addEventListener('pagehide',stopCamera);render();
