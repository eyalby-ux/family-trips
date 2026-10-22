import {ITEM_TYPES,ITEM_TYPE_PLURALS,TRANSPORT_MODES,flightRouteDeparture,needsReviewFormField,TYPE_FIELDS,buildItemFormValues,confirmNeedsReviewField,createSuggestions,findPossibleDuplicates,flagReversedFlightDirection,isDismissibleWarning,manualCreateDefaults,mapsUrl,normalizeUrlInput,reconcileStaleNeedsReview,resolveMergeCandidate,resolveParticipantIdsFromDraft,scheduleForType,suggestionReviewDefaults,suggestionToItem,validateSource} from './ingestion.js';
import {extractSourceContent,sha256File} from './content-extraction.js';
import {MultipartQrCollector,decodeExternalText,importBatchToApp} from './external-import.js';
import {availableTimelineModes,backfillTripDates,currentOperational,filterAndSortTasks,isDeletionEligible,isItemOutsideTrip,normalizeDateRange,normalizeOperationalState,packingDuplicate,periodBounds,QUARANTINE_DELETION_ELIGIBLE_DAYS,quickAccessTasks,sanitizeTripDates,shiftCursor,sortItemsByStartAt,TASK_DUE_SCOPES,TRANSPORT_TYPES,itemStartMs,planToday,shortDayLabel,shouldClearEndedOnEdit,today,addParticipantsToRecord,computeTicketCoverage,participantChipLabel,pickerParticipants,uniqueRecordsById,upNextItem,isTaskOverdue,filterShoppingItems,isSharedShoppingItem,participantAssignments,shoppingOwnerLabel,normalizeTaskLink} from './operational-data.js';
import {COUNTER_ABOVE,arrowKeyTarget,carouselSlots,participantLayout,positionIndicator} from './participant-carousel.js';
import {normalizeProposalLifecycle,rejectProposal} from './proposal-lifecycle.js';
import {GAME_FILTERS,TRIVIA_ID,capHistory,filterGames,gamePrimaryAction,newTriviaDeck,newTriviaState,readMoreUrl,toggleCorrect,triviaBuildGate,triviaFinished,triviaNext,triviaQuestion,triviaTally} from './games.js';
import {generateTrivia} from './game-content-client.js';
import {WINNER_MS,winnerHtml} from './winner-animation.js';
import {BINGO_ID,BINGO_THEMES,BINGO_THEME_KEYS,bingoPhotoLocation,bingoStoragePath,dropBoard,ensureBoard,foundCount,freshCompletions,pendingPhotos,pruneCelebrated,syncPendingPhotos} from './bingo.js';
import {deleteLocalPhoto,getLocalPhoto,putLocalPhoto} from './local-photos.js';
import {shrinkImage} from './image-utils.js';
import {syncStripText,cloudFailureMessage} from './ui-states.js';
import {normalizeThaiPua} from './text-normalize.js';
import {KIND_COLOURS,dayEntries,dayOf,daysBetween,isStay,monthWeeks,nightStay,ribbonRange,ribbonRows,shiftTimeline,stayHue,stayList,weekBands} from './timeline-view.js';
import {DOC_FILTERS,documentCounts,documentFlags,documentMatchesFilter,documentSummary,linkageLabels,linkedItemsOf,sourceDeleteMessage} from './documents.js';
import {TICKET_ITEM_TYPES,coverageSummary,additionalDetails,partitionItemDocuments,ticketHolderDetail,ticketHolderLabel} from './ticket-card.js';
import {importStatusPill,largePalm,isConfirmBlocked,sourceImportState,suggestionImportState,canDeleteSource,suggestionsAfterSourceDelete} from './import-status.js';
import {analyzeActivitySource,analyzeCarSource,analyzeFlightSource,analyzeHotelSource,analyzeInsuranceSource,analyzeSource} from './smart-import-client.js';
import {MERGE_CONFLICT_WARNING_PREFIX,saveOnlySource,smartImportResultToSuggestion,preserveTrustedFieldsOnMerge} from './smart-import-adapter.js';
import {clearResolvedDirectionWarning,smartImportFlightResultToSuggestions} from './flight-import-adapter.js';
import {smartImportActivityResultToSuggestion} from './activity-import-adapter.js';
import {smartImportInsuranceResultToSuggestion} from './insurance-import-adapter.js';
import {smartImportTransportResultToSuggestion} from './transport-import-adapter.js';
import {appVersionLabel} from './app-version.js';
import {auth} from './firebase.js';
import {addEditorByEmail,clearAllTripContent,createTripDoc,currentEmail,currentUid,deleteAttachment,deleteTripCompletely,downloadAttachment,getInvitation,getMyInvitation,inviteByEmail,listEditorHistory,listInvitations,listMyTrips,migrateLocalTripToFirestore,reactivateInvitation,removeEditorByEmail,revokeInvitation,subscribeToTrip,syncTripState,uploadAttachment} from './cloud-store.js';
import './v4.css';

// 0.7.2: KEY is now legacy-only -- the pre-Firestore local blob, read solely to detect and offer
// migration (migrationBanner/runMigration below). ACTIVE_TRIP_KEY remembers which Firestore Trip
// this device last had open, so a returning user lands back where they were instead of always
// re-picking from the Trip switcher. Neither key is the source of truth for Trip data anymore --
// Firestore is (see cloud-store.js), reached through the same synchronous save()/render() call
// pattern every existing call site in this file already uses.
const KEY='family-trips-alpha-0.2';
const ACTIVE_TRIP_KEY='family-trips-active-trip';
const EMPTY={settingsPage:'',trip:null,items:[],sources:[],suggestions:[],rejectedSuggestions:[],packing:[],games:[],tasks:[],shopping:[],locationRecords:[],participants:[],view:'today',category:null,itemId:null,suggestionId:null,modal:null,timelineMode:'all',timelineCursor:'',calendarDate:null,toast:null,packingParticipantView:'shared'};
const qrCollector=new MultipartQrCollector();
let cameraStream=null,cameraTimer=null;
let timelineSwipeStartX=null;
let suppressClickUntil=0;
// Captured synchronously on file selection so an unrelated render() (which replaces the
// whole #app tree, including the <input type=file>) can never wipe the chosen file — the
// underlying cause of the file "disappearing" from Add and of the false "no document
// selected" error while an analysis request is already in flight.
let pendingSourceFile=null;
let ingestBusy=false;
// Beta 0.8 Phase 2 (S7 "Attached"): a transient confirmation, never a persistent badge -- a source id sits
// here for a few seconds after an attach-only upload and its row shows the checkmark pill meanwhile.
const attachedFlash=new Set();
let state=clone(EMPTY);
// 0.7.3.1: false only during the brief window between the very first synchronous render() (fired
// before boot() has resolved anything at all -- state.trip is still null, its EMPTY default, not
// because there's genuinely no Trip yet) and boot() actually determining the real initial state.
// Distinguishes "nothing has loaded yet" from "you genuinely have no active Trip" -- without it,
// render()'s own !state.trip check can't tell the two apart, so every app launch or page refresh
// briefly flashed the "start with an empty Trip" call-to-action before the real Trip data (already
// on its way) replaced it. Real bug, found live by the Product Owner. A one-time latch, never
// reset after boot's first real answer -- switching Trips has its own separate, already-correct
// behavior (the previous Trip's data stays visible while the new one loads, not `empty()`).
let bootResolved=false;
// Last state actually written to Firestore, used by save() to diff against -- null until either
// an existing Trip finishes its first subscribeToTrip() load or a brand-new Trip's first save()
// completes. See syncTripState (cloud-store.js) for why a diff, not a blind overwrite, matters.
let lastSyncedSnapshot=null;
let unsubscribeTrip=null;
// 0.7.3 (DESIGN_V1.md §0.2/§2.3): holds at most one not-yet-applied remote snapshot while a form is
// open, so render()'s own full-DOM replacement can't silently wipe unsaved input mid-edit -- see
// mergeRemoteState()/openTrip()/render() below. Always null while no form-carrying modal is open.
let bufferedRemoteState=null;
// 0.7.3 (DESIGN_V1.md §4): count of save() calls issued but not yet settled (synced or failed).
// Drives the minimal "pending sync" banner in render() -- see save()'s own comment.
let pendingSyncCount=0;
let myTrips=[];
// 0.7.5 (DESIGN_V1.md §6): account-level, not Trip-level, so these live alongside myTrips rather
// than in `state` (which mergeRemoteState()/EMPTY reset on every Trip switch -- these must not
// reset just because the signed-in account switched which Trip it's looking at).
let myInvitation=null;
let adminInvitations=[];
let adminInvitationsLoaded=false; // spec S7: the list shows a skeleton until the first load answers, never a false "no invitations"
let editorHistory=[];
let saveInFlight=Promise.resolve();

function clone(value){return JSON.parse(JSON.stringify(value))}
function legacyLoad(){try{const loaded={...clone(EMPTY),...JSON.parse(localStorage.getItem(KEY)||'{}')};return {...loaded,...normalizeProposalLifecycle(loaded.suggestions,loaded.rejectedSuggestions)}}catch{return clone(EMPTY)}}
function hasLegacyLocalTrip(){try{return Boolean(JSON.parse(localStorage.getItem(KEY)||'null')?.trip)}catch{return false}}
// Synchronous call signature, unchanged from every pre-0.7.2 call site's expectations (`mutate
// state.x; save(); render()`) -- internally now fires an async, un-awaited Firestore sync instead
// of a synchronous localStorage write, per DESIGN_V1.md §4.2. A brand-new Trip (ensureTrip() just
// set state.trip in memory, nothing in Firestore yet) is created transparently on its first save()
// here, so ensureTrip() itself needed no async awareness at all. 0.7.2.1: each save()'s own
// diff-and-commit is issued immediately, not serialized behind an earlier save's -- see save()'s
// own comment for why (fixes docs/versions/V7/0.7.3/DESIGN_V1.md §0.1/§3.2's offline-data-loss
// finding). Only lastSyncedSnapshot's own advancement stays serialized through saveInFlight, in
// call order.
// Real bug, caught by the Product Owner during 0.7.2 qa testing: a brand-new Trip's very first
// attachment upload got a 403 from Firebase Storage. Root cause: storage.rules authorizes an
// upload only by checking the Trip's OWN Firestore document (firestore.get(...).data.ownerUid) --
// but ensureTrip() only ever sets state.trip in memory, and storeOriginal()/uploadAttachment() (in
// the ingest()/smartIngest()/attachIngest() flows) run BEFORE the first save() call, not after --
// so on a brand-new Trip, the Firestore Trip document genuinely did not exist yet at the moment of
// upload, and a Storage rules evaluation against a nonexistent cross-service document is denied,
// not treated as absent. This same "create the Trip doc on first use, not lazily inside save()"
// step is needed by two independent call paths now (save() itself, and any attachment upload
// before the first save()), so it is extracted here rather than duplicated.
// Returns true when this call genuinely created the Trip document (false when it already existed
// or was already synced) -- save() uses this to know when myTrips needs refreshing.
async function ensureTripDocSynced(tripId,trip){
  if(lastSyncedSnapshot&&lastSyncedSnapshot.trip?.id===tripId)return false;
  const uid=currentUid();if(!uid)throw new Error('לא מחובר.');
  let created=true;
  await createTripDoc(tripId,{name:trip.name,startDate:trip.startDate,endDate:trip.endDate,createdAt:trip.createdAt},uid).catch(error=>{
    // A concurrent tab/session may have already created this exact Trip id -- not a real failure,
    // just means this call didn't create it itself.
    if(error?.code!=='permission-denied')throw error;
    created=false;
  });
  localStorage.setItem(ACTIVE_TRIP_KEY,tripId);
  return created;
}
function save(){
  const lifecycle=normalizeProposalLifecycle(state.suggestions,state.rejectedSuggestions);
  state.suggestions=lifecycle.suggestions;state.rejectedSuggestions=lifecycle.rejectedSuggestions;
  if(!state.trip)return;
  const tripId=state.trip.id,snapshotForThisSave=clone(state);
  // 0.7.2.1: diff-and-commit is issued right here, synchronously with this call, against
  // lastSyncedSnapshot's value captured into diffBaseline at this exact moment -- never queued
  // behind an earlier save's still-unresolved commit(). Per Firestore's own documented behavior,
  // batch.commit() durably journals the write into its IndexedDB-backed offline queue the moment
  // it's called, independent of when the returned Promise resolves -- but the OLD code chained that
  // entire await behind saveInFlight, so while offline only the very first queued save() ever
  // reached commit() at all; every save() after it sat waiting in memory for a Promise that (per the
  // SDK's own type docs) "won't resolve while you're offline," and was lost outright on reload. Two
  // rapid saves' diffs can now both be computed against the same not-yet-advanced baseline --
  // harmless, since every write here is a field-level delta (diffById/syncTripState's own semantics,
  // 0.7.3 DESIGN_V1.md §2.2): at worst a field already included in one save's diff is redundantly
  // re-sent by the next, never lost.
  const diffBaseline=lastSyncedSnapshot;
  // 0.7.3 (DESIGN_V1.md §4): pendingSyncCount is the "information that already exists in
  // saveInFlight's own state" the design refers to -- saveInFlight itself is just a Promise chain
  // with no synchronously-readable pending/settled state, so this counter is what actually answers
  // "is there a local write not yet confirmed synced" for the banner in render().
  pendingSyncCount++;
  const writeAttempt=(async()=>{
    const createdNewTrip=await ensureTripDocSynced(tripId,snapshotForThisSave.trip);
    const committedSnapshot=await syncTripState(tripId,diffBaseline,snapshotForThisSave);
    return {createdNewTrip,committedSnapshot};
  })();
  // saveInFlight now only serializes the narrow step of advancing lastSyncedSnapshot (plus the
  // created-new-trip follow-up) once each save's own write settles -- in call order, exactly as
  // before -- rather than serializing the write itself. Ends in .catch(), never left to reject, so
  // one save's failure can never leave every later save() permanently stuck against a rejected
  // chain. .finally() decrements pendingSyncCount and re-renders regardless of outcome, so the
  // pending-sync indicator clears the moment this write settles even if nothing else happens to
  // trigger a render() around when that occurs (e.g. right after reconnecting, with no other user
  // action in progress).
  saveInFlight=saveInFlight.then(()=>writeAttempt).then(async({createdNewTrip,committedSnapshot})=>{
    lastSyncedSnapshot=committedSnapshot;
    // A brand-new Trip's own switcher entry doesn't exist anywhere until this point -- myTrips
    // is otherwise only refreshed at boot() and after migration, so without this a freshly
    // created second Trip would silently not appear in tripsSection()/tripsView() until the
    // next full reload, even though it now genuinely exists in Firestore.
    if(createdNewTrip){
      const uid=currentUid();
      if(uid)myTrips=await listMyTrips(uid,currentEmail());
      render();
    }
  }).catch(error=>{
    console.error('Firestore sync failed',error);
    notify(cloudFailureMessage(error,'save'),error?.code==='permission-denied'?9000:2600);
  }).finally(()=>{pendingSyncCount--;render()});
}

// 0.7.2 boot sequence, replacing the old synchronous `let state=normalizeOperationalState(load())`
// (localStorage is synchronous; Firestore is not). Runs once, at the very bottom of this module,
// after one render() of the still-empty `state` so the shell paints immediately instead of staying
// blank while the network round-trip is in flight. Every view function below is untouched by this
// -- they only ever read the in-memory `state` object, exactly as before 0.7.2.
// Wrapped in a top-level try/catch as a defensive backstop, not just the already-caught
// listMyTrips() call below: boot() is invoked fire-and-forget at the bottom of this module (no
// caller ever awaits or .catch()es it), so ANY uncaught exception or rejection anywhere in this
// function's body -- including one this specific review did not anticipate -- would otherwise
// surface as a silent unhandled-rejection with no render() ever called, which on a cold launch
// means a genuinely blank page with no visible explanation at all. Real bug, caught by the Product
// Owner's own live acceptance retest (Test 8 got WORSE after the offline-auth-restore fix -- an
// empty-Trip screen became a hard crash): see subscribeToTrip's own onError fix (cloud-store.js)
// for the specific, now-fixed gap this backstop also guards against more generally.
async function boot(){
  try{await bootInner()}
  catch(error){
    console.error('boot() failed',error);
    bootResolved=true; // an error IS a real, known answer -- must not leave the UI stuck loading
    notify(`טעינת האפליקציה נכשלה (${error?.code||error?.message||'שגיאה לא צפויה'}).`);
    render();
  }
}
async function bootInner(){
  const uid=currentUid();
  if(!uid){bootResolved=true;render();return}
  // 0.7.5: account-level, independent of which Trip (if any) ends up active below -- fire-and-
  // forget, never awaited, so a slow or failed invitation read can never delay or block the Trip
  // boot path itself (matching this function's own established "an auxiliary concern must never
  // hold up the core render" discipline, e.g. the offline early-return just below).
  refreshMyInvitation();
  const remembered=localStorage.getItem(ACTIVE_TRIP_KEY);
  // Offline cold launch (ARCHITECTURE_CURRENT_STATE.md's frozen invariant): listMyTrips() is a
  // live Firestore query, not a cache-served read, and would simply hang/fail with no network.
  // Skip it entirely and open the remembered Trip directly -- subscribeToTrip()'s onSnapshot
  // listener IS cache-served while offline (Firestore's own persistent local cache, enabled in
  // firebase.js), so this still renders the last-saved Trip with no network round-trip at all,
  // matching what the old synchronous localStorage read always guaranteed.
  if(!navigator.onLine&&remembered){openTrip(remembered);return}
  try{myTrips=await listMyTrips(uid,currentEmail())}
  catch(error){
    console.error('Loading Trip list failed',error);
    if(remembered){openTrip(remembered);return}
    bootResolved=true;notify('טעינת רשימת הטיולים נכשלה.');render();return;
  }
  const activeTripId=myTrips.some(trip=>trip.id===remembered)?remembered:myTrips.length===1?myTrips[0].id:null;
  if(activeTripId)openTrip(activeTripId);
  else{bootResolved=true;state.view=myTrips.length?'trips':'today';render()}
}
// Subscribes to one Trip's live data and keeps `state` assigned to it until switchTrip() moves to
// a different one. The ephemeral/navigation fields (view, category, modal, etc.) are deliberately
// preserved across a remote update -- a Firestore listener firing (this device's own write echoing
// back, or a real Editor's concurrent change) must never yank the user out of whatever screen or
// open modal they're currently on.
// Merges one assembled remote snapshot (from subscribeToTrip) into the live in-memory `state`,
// preserving the same ephemeral/navigation fields openTrip's own comment above already documents.
// Does NOT call render() itself -- openTrip's listener calls it directly for the no-modal-open
// case; render() calls it itself when flushing a buffered update, so the merge happens inline with
// the same render pass that's about to run rather than needing its own extra render() call.
function mergeRemoteState(remoteState){
  // The screen's own, never-synced state survives a remote update (it used to reset the timeline day, the task filters and so on).
  const {view,category,itemId,suggestionId,modal,timelineMode,calendarDate,toast,packingParticipantView,settingsPage,timelineCursor,taskFilters,shoppingFilters,gameFilter,docFilter,tasksDoneCollapsed}=state;
  state={...clone(EMPTY),...remoteState,view,category,itemId,suggestionId,modal,timelineMode,calendarDate,toast,packingParticipantView,settingsPage,timelineCursor,taskFilters,shoppingFilters,gameFilter,docFilter,tasksDoneCollapsed};
  normalizeOperationalState(state);
  lastSyncedSnapshot=clone(state);
  bootResolved=true; // this IS the real initial Trip data boot() was waiting on, wherever it came from
}
function openTrip(tripId){
  if(unsubscribeTrip)unsubscribeTrip();
  lastSyncedSnapshot=null;
  bufferedRemoteState=null;
  localStorage.setItem(ACTIVE_TRIP_KEY,tripId);
  unsubscribeTrip=subscribeToTrip(tripId,remoteState=>{
    // 0.7.3 (DESIGN_V1.md §0.2/§2.3): a live remote update must never silently destroy an open,
    // unsubmitted edit form -- render()'s own unconditional full-DOM replacement would otherwise
    // wipe whatever the user is mid-typing the moment ANY remote snapshot lands (this device's own
    // write echoing back, another Editor's concurrent edit, or another tab on this device). While a
    // form-carrying modal is open, buffer the update instead of applying it now; render()'s own top
    // flushes exactly one buffered update the moment the modal closes. Real risk this closes, not
    // hypothetical: two-device sync (this candidate's own headline feature) makes remote updates
    // arrive routinely during normal use, not just in rare edge cases.
    if(state.modal){bufferedRemoteState=remoteState;return}
    // 0.7.3.1: a leftover buffered snapshot from BEFORE the modal closed is now obsolete the
    // moment a fresher update is about to be applied directly -- without this, render()'s own
    // flush (below) could re-apply that stale buffer immediately after this call's own render(),
    // silently reverting what was just correctly applied. Real bug, found live by the Product
    // Owner: a source's "מנתח…" (analyzing) badge stayed stuck long after analysis had actually
    // finished, because the fresh 'proposal_ready' echo applied here got undone by a stale
    // 'processing' snapshot still sitting in the buffer from earlier in the same intake flow.
    bufferedRemoteState=null;
    mergeRemoteState(remoteState);
    render();
  },error=>{
    // A subscription failure (offline with nothing cached yet, a genuine permission problem, or
    // anything else) must never leave the page blank/uncaught -- render whatever state already
    // exists (the initial empty shell, on a first-ever cold launch) with a visible, honest error
    // instead. Worse than working, never worse than a crash.
    bootResolved=true; // an error IS a real answer too -- must not leave the UI stuck loading
    notify(cloudFailureMessage(error,'load',{online:navigator.onLine}),error?.code==='permission-denied'?9000:2600);
    render();
  });
}
function switchTrip(tripId){route('today');openTrip(tripId);notify('הטיול הוחלף')}
async function startNewTripFlow(){
  if(unsubscribeTrip){unsubscribeTrip();unsubscribeTrip=null}
  lastSyncedSnapshot=null;
  bufferedRemoteState=null;
  state={...clone(EMPTY),view:'today'};
  ensureTrip({name:'טיול חדש'});
  render();
}
function uid(prefix='id'){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function esc(value=''){return normalizeThaiPua(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function warningText(value){return typeof value==='string'?value:value?.message||value?.code||JSON.stringify(value)}
function dateOnly(value){return value?String(value).slice(0,10):''}
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
// Real bug, caught by the Product Owner's own live acceptance testing (Test 3, "שיתוף הטיול"
// section missing entirely): state.trip.ownerUid is otherwise only ever populated by the real-time
// Firestore listener (openTrip()/subscribeToTrip()) -- but a brand-new Trip created here never goes
// through that listener at all (it's created purely in memory; openTrip() is only called by boot()
// and switchTrip(), neither of which runs for a Trip that doesn't exist yet). Without this, a
// freshly-created Trip's own creator could never see the sharing/Editor-grant section for the rest
// of that session, even though they genuinely are its Owner -- sharingSection()'s own gate
// (state.trip.ownerUid===currentUid()) compared the real uid against `undefined` and always lost.
// Whoever is signed in when a Trip is first created here IS its Owner by definition -- this matches
// exactly what the eventual Firestore createTripDoc() write assigns, just recorded in memory
// immediately instead of waiting for a round-trip that never happens for this call path.
function ensureTrip(seed={}){if(!state.trip){const dates=sanitizeTripDates(seed);state.trip={id:uid('trip'),name:seed.name||'הטיול המשפחתי שלי',startDate:dates.startDate,endDate:dates.endDate,createdAt:new Date().toISOString(),ownerUid:currentUid(),editorEmails:[]}}if(!state.packing.length)state.packing=defaultPacking();normalizeOperationalState(state)}
function defaultPacking(){return [{id:uid('pl'),name:'מסמכים וכסף',owner:'shared',items:['דרכונים','ביטוח נסיעות','כרטיסי אשראי'].map(name=>({id:uid('pi'),name,done:false,suggested:true,owner:'shared'}))}]}
function route(view,options={}){gamePlaying=null;extraOpenFor=null;participantDeleteArmed=null;state.settingsPage=view==='settings'?(options.page||''):'';if(options.category==='document'&&state.category!=='document')state.docFilter='all';stopCamera();if(view==='timeline'&&state.view!=='timeline'){state.timelineMode='all';state.timelineCursor=state.trip?.startDate||today();state.calendarDate=null}state.view=view;state.category=options.category||null;state.itemId=options.itemId||null;state.suggestionId=options.suggestionId||null;render();const anchorTarget=options.anchor?document.getElementById(options.anchor)||(options.anchor==='item-tickets'?document.getElementById('item-documents'):null):null;if(anchorTarget)anchorTarget.scrollIntoView();else scrollTo(0,0)}
function notify(text,ms=2600){state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},ms)}
function status(){if(!state.trip)return 'Empty';if(state.trip.startDate&&state.trip.endDate){const now=today();if(now>=state.trip.startDate&&now<=state.trip.endDate)return 'Active';if(now>state.trip.endDate)return 'Completed';return 'Planned'}return 'Draft'}
function conflict(item){return isItemOutsideTrip(item,state.trip)}
// V6-F41: item.location for a Flight is a route string ("BKK → TLV"), which Google Maps resolves
// ambiguously as a search query (observed landing on the ARRIVAL airport instead) -- search the
// departure airport specifically, the endpoint a traveler would actually navigate to before the
// flight. Falls back to the raw location string if no departure airport was captured.
// 0.7.3.1: that fallback ran unconditionally, so once the user actually EDITED location (the only
// location-shaped field the edit form exposes for Flight -- departureAirport/arrivalAirport have
// no edit UI at all, per TYPE_FIELDS.flight), the map link silently kept using the original,
// now-stale departure airport from Smart Import extraction, ignoring the edit entirely with no way
// for the user to tell. Real bug, found live by the Product Owner: editing a Flight's location
// updated the displayed address text but not the map link -- confirmed Flight-specific (Hotel's
// mapSearchLocation is just item.location directly, no override). Fix: departureAirport only wins
// while location still equals the exact route string Smart Import generated from it -- the moment
// it diverges (a real user edit), the edit wins, matching every other type's behavior.
function mapSearchLocation(item){
  if(item.type==='flight'){
    const departure=item.details?.departureAirport,arrival=item.details?.arrivalAirport;
    const importedRoute=[departure?.code,arrival?.code].filter(Boolean).join(' → ');
    if(item.location&&item.location===importedRoute)return departure?.code||departure?.name||item.location;
    return item.location||departure?.code||departure?.name||'';
  }
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

// 0.7.4: destinationSummary() is the ordered Destination Countries list rendered as its own
// route-summary string -- confirmed by direct code search that no separate "destination/route
// summary" concept exists anywhere else in this app (nothing named route/destination anywhere in
// src/ before this candidate), so the MVP scope bullet's "Destination Countries, destination/route
// summary" names one feature, not two: the ordered list itself IS the route summary. Shown in the
// header (every view, not buried in Trip Settings) so reordering has a real, visible effect.
// 0.7.4.1 round 1: hardcoded the separator to '←' after finding a plain '→' reads backwards
// between Hebrew (strong-RTL) country names. That held for Hebrew, but broke the Trip's own free
// text right back -- Destination Countries is a plain input, nothing requires Hebrew, and a
// hardcoded '←' reads backwards for English/Latin names the same way '→' did for Hebrew ones
// (found live by the Product Owner testing with "Thailand"/"Laos"). Neither arrow works for both
// scripts; this needs to adapt to what was actually typed, not assume the app's own primary
// language. Verified empirically in a live browser (not assumed from bidi theory) for both
// scripts before choosing this fix: a plain '→' between two Latin/LTR names already renders
// correctly with no wrapping needed, even embedded inside this RTL page, the same way this app's
// existing "TLV → BKK"-style flight routes already do (pure-LTR content auto-resolves as its own
// island); a plain '←' is what's needed for Hebrew instead, per the round-1 finding. Both facts
// combine into a per-render pick: '←' only when the country names actually contain Hebrew, '→'
// otherwise -- not a single hardcoded direction either way.
// Checks by code point (0x590-0x5FF, the Hebrew Unicode block), not a regex \u-escape range --
// avoids a literal, hard-to-read Hebrew character silently ending up in source code, which is
// exactly what happened here on a first attempt (the edit itself resolved the \u escapes into the
// literal glyphs, functionally identical but nearly invisible/unreadable as source).
function isHebrewText(text){return [...String(text)].some(char=>{const code=char.codePointAt(0);return code>=0x590&&code<=0x5FF})}
function destinationSummary(){const countries=state.trip?.destinationCountries||[];if(!countries.length)return '';const arrow=isHebrewText(countries.join(''))?'←':'→';return countries.map(esc).join(` ${arrow} `)}
function header(){const destination=destinationSummary();return `<header class="top"><div class="top-in"><div class="brand"><img src="/assets/icons/icon-192.png" alt=""><div><h1>${esc(state.trip?.name||'Family Trips')}</h1><p>${destination?`${destination} · `:''}${state.trip?.startDate?`${fmt(state.trip.startDate,false)} — ${state.trip.endDate?fmt(state.trip.endDate,false):'ללא סיום'}`:`<bdi>${appVersionLabel()}</bdi> · Hotel + Flight Smart Import`}</p></div></div><span class="status">${status()}</span></div></header>`}
function empty(){return `<section class="card hero empty"><div class="big">${tabler('compass').replace('class="ti"','class="ti ti-big"')}</div><h2>מתחילים מטיול ריק</h2><p class="muted">העלה מקור, ייבא JSON/QR או הזן פריט ידנית.</p><div class="actions center-actions"><button class="btn" data-action="create">הוספה</button></div></section>`}
// 0.7.3.1: shown only before bootResolved -- see its own declaration for why this is a distinct
// state from empty() rather than reusing it.
// Spec S7: an empty screen is a small muted line icon, an --ink headline naming the empty space, one muted line of
// explanation and at most one action. No illustration.
const emptyState=(icon,headline,line='',action='')=>`<div class="empty-state">${tabler(icon)}<h3>${headline}</h3>${line?`<p class="muted">${line}</p>`:''}${action}</div>`;
// Spec S7: content still loading on a screen that is otherwise rendered is a uniform skeleton, never a spinner.
const skeletonList=(rows=3)=>`<div class="skeleton-list" role="status" aria-busy="true" aria-label="טוען">${'<div class="skeleton"></div>'.repeat(rows)}</div>`;
function loading(){return `<div class="palm-screen">${largePalm({phrases:['טוען…']})}</div>`}
// 0.7.4: a Transport (`car`) item's badge shows its specific sub-type (TRANSPORT_MODES) instead of
// the generic type label -- a stored-but-never-surfaced transportMode would defeat the point of
// asking for it; every other type is unaffected, still shows ITEM_TYPES' own generic label.
function itemRow(item){const badgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label||item.type;return `<button class="row ${conflict(item)?'conflict':''}" data-route="detail" data-id="${item.id}"><span class="row-main"><b>${typeIcon(item.type)} ${esc(item.title)}</b><small class="muted">${item.provider?`${esc(item.provider)} · `:''}${item.schedule==='entire'?'לכל הטיול':item.schedule==='none'?'ללא תאריך':item.schedule==='range'?`${fmt(item.startAt,true,item.dateMeta?.startPrecision)} — ${fmt(item.endAt,true,item.dateMeta?.endPrecision)}`:fmt(item.startAt,true,item.dateMeta?.startPrecision)}</small></span>${conflict(item)?'<span class="badge warn">מחוץ לטווח</span>':`<span class="badge">${esc(badgeLabel)}</span>`}${tabler('chevron').replace('class="ti"','class="ti icon-directional row-chevron"')}</button>`}
function suggestionRow(suggestion){const source=sourceById(suggestion.sourceId),stateName=suggestionImportState(suggestion,(suggestion.sourceIds||[suggestion.sourceId]).map(sourceById).filter(Boolean)),trailing=stateName?importStatusPill(stateName):`<span class="muted small">${suggestion.status==='deferred'?'אחר כך':'ממתין לאישור'}</span>`;return `<button class="row suggestion-row" data-route="suggestion" data-id="${suggestion.id}"><span class="row-main"><b>${typeIcon(suggestion.proposed?.type)} ${esc(suggestion.proposed.title)}</b><small class="muted">${esc(source?.name||'ייבוא חיצוני')} · ביטחון ${confidenceLabel(suggestion.confidence)}</small></span>${trailing}</button>`}
// P31-F4: an archived (rejected) proposal is the same compact row as a document -- the title on one LTR line, the "נדחה" chip and the source name inside the card.
function archivedSuggestionRow(suggestion){const source=sourceById(suggestion.sourceId);return `<div class="doc-row archived"><span class="doc-icon">${typeIcon(suggestion.proposed?.type)}</span><div class="doc-main"><bdi class="doc-name" dir="ltr">${esc(suggestion.proposed.title)}</bdi><span class="doc-meta"><span class="doc-chip rejected">נדחה</span><span class="doc-note"><bdi dir="ltr">${esc(source?.name||'ייבוא חיצוני')}</bdi></span></span></div></div>`}
function confidenceLabel(value){return ({high:'גבוה',medium:'בינוני',low:'נמוך'})[value]||value||'לא צוין'}

// Beta 0.8 Phase 1 (design spec V7 S4): a day-item card's own contextual actions -- Navigate only
// with a real location, Website only with a real link, Tickets only when a linked document has
// actually been confirmed as ticket coverage (0.7.9's own document-driven model -- ticketsSection's
// same confirmedSources check, not the retired item.tickets[]).
function hasConfirmedTicket(item){return state.sources.some(source=>item.sourceIds?.includes(source.id)&&source.ticketConfirmed)}
// Beta 0.8 Phase 1.1 (F9): Tabler outline icons (MIT), inline, in --ink -- Today previously used
// colored emoji, mixing two icon styles with the nav (spec §3). Path data is Tabler's own for
// alert-triangle / compass / world / ticket / check.
const TABLER={
  alert:'<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>',
  compass:'<path d="M8 16l2 -6l6 -2l-2 6l-6 2"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>',
  world:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/>',
  ticket:'<path d="M15 5l0 2"/><path d="M15 11l0 2"/><path d="M15 17l0 2"/><path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2"/>',
  check:'<path d="M5 12l5 5l10 -10"/>',
};
Object.assign(TABLER,{
  phone:'<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/>',
  mail:'<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10"/><path d="M3 7l9 6l9 -6"/>',
  plane:'<path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3z"/>',
  bed:'<path d="M3 7v11m0 -4h18m0 4v-8a2 2 0 0 0 -2 -2h-8v6"/><path d="M7 10m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
  car:'<path d="M5 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>',
  utensils:'<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12"/><path d="M19 15v6h-1v-3"/><path d="M8 4v17m-3 -17v3a3 3 0 1 0 6 0v-3"/>',
  shield:'<path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06"/><path d="M15 19l2 2l4 -4"/>',
  link:'<path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>',
  file:'<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2"/><path d="M9 9l1 0"/><path d="M9 13l6 0"/><path d="M9 17l6 0"/>',
  users:'<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  store:'<path d="M3 21l18 0"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"/><path d="M5 21l0 -10.15"/><path d="M19 21l0 -10.15"/><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"/>',
  dice:'<path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/><path d="M8.5 8.5h.01"/><path d="M15.5 8.5h.01"/><path d="M15.5 15.5h.01"/><path d="M8.5 15.5h.01"/><path d="M12 12h.01"/>',
  bag:'<path d="M3 9a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9"/><path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/><path d="M3 13a20 20 0 0 0 18 0"/>',
  checklist:'<path d="M9.615 20h-2.615a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8"/><path d="M14 19l2 2l4 -4"/><path d="M9 8h4"/><path d="M9 12h2"/>',
  cart:'<path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17h-11v-14h-2"/><path d="M6 5l14 1l-1 7h-13"/>',
  chevron:'<path d="M9 6l6 6l-6 6"/>',
  notes:'<path d="M5 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/><path d="M9 7l6 0"/><path d="M9 11l6 0"/><path d="M9 15l4 0"/>',
  chevleft:'<path d="M15 6l-6 6l6 6"/>',
  calendar:'<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>',
  clock:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/>',
  star:'<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>',
  wifioff:'<path d="M12 18l.01 0"/><path d="M9.172 15.172a4 4 0 0 1 5.656 0"/><path d="M6.343 12.343a7.963 7.963 0 0 1 3.864 -2.14m4.163 .155a7.965 7.965 0 0 1 3.287 2"/><path d="M3.515 9.515a12 12 0 0 1 3.544 -2.455m3.101 -.92a12 12 0 0 1 10.325 3.374"/><path d="M3 3l18 18"/>',
  refresh:'<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
  pencil:'<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
  arrow:'<path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/>',
  plus:'<path d="M12 5l0 14"/><path d="M5 12l14 0"/>',
  x:'<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  info:'<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
  chevdown:'<path d="M6 9l6 6l6 -6"/>',
  chevup:'<path d="M6 15l6 -6l6 6"/>',
  dots:'<path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
  lock:'<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
  upload:'<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 9l5 -5l5 5"/><path d="M12 4l0 12"/>',
  qr:'<path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M7 17l0 .01"/><path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M7 7l0 .01"/><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M17 7l0 .01"/><path d="M14 14l3 0"/><path d="M20 14l0 .01"/><path d="M14 14l0 3"/><path d="M14 20l3 0"/><path d="M17 17l3 0"/><path d="M20 17l0 3"/>',
  pin:'<path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0"/>',
  leaf:'<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z"/>',
  paw:'<path d="M12 12.5c-2.2 0 -4.5 2.3 -4.5 4.4c0 1.4 1 2.1 2.2 2.1c1 0 1.6 -.5 2.3 -.5s1.3 .5 2.3 .5c1.2 0 2.2 -.7 2.2 -2.1c0 -2.1 -2.3 -4.4 -4.5 -4.4z"/><circle cx="6" cy="10" r="1.6"/><circle cx="9.5" cy="6" r="1.6"/><circle cx="14.5" cy="6" r="1.6"/><circle cx="18" cy="10" r="1.6"/>',
  camera:'<path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"/><path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  beach:'<path d="M4 12a8 8 0 0 1 16 0z"/><path d="M12 12v6a2 2 0 0 0 4 0"/>',
  city:'<path d="M3 21h18"/><path d="M5 21v-14l8 -4v18"/><path d="M19 21v-10l-6 -4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>',
});
const tabler=name=>`<svg class="ti" viewBox="0 0 24 24" aria-hidden="true">${TABLER[name]}</svg>`;
// Beta 0.8 Phase 2: item-type glyphs are Tabler outline icons too (S3) -- the old emoji from
// ITEM_TYPES[type].icon stay in ingestion.js (still used by the type <select>'s plain-text options).
const TYPE_ICON_NAMES={flight:'plane',hotel:'bed',car:'car',activity:'ticket',restaurant:'utensils',insurance:'shield',link:'link',document:'file',contact:'phone',participant:'users',shoppingPlace:'store'};
const typeIcon=type=>tabler(TYPE_ICON_NAMES[type]||'pin').replace('class="ti"','class="ti ti-type"');
// P12-F2: the checkbox list every participant picker shares. A deactivated participant is only listed when
// already assigned (greyed "(לא פעיל)", still removable by unchecking) -- never offered for a new assignment.
function participantCheckboxes(selectedIds,{name='participantIds',attrs=''}={}){
  const ids=new Set(selectedIds||[]);
  return pickerParticipants(state.participants,[...ids]).map(participant=>`<label class="checkbox-field"><input type="checkbox" name="${name}" ${attrs} value="${participant.id}" ${ids.has(participant.id)?'checked':''}> ${esc(participant.name)}${participant.active===false?' <span class="muted">(לא פעיל)</span>':''}</label>`).join('');
}
// P12-F2: a participant's name for display, flagged when they have since been deactivated.
const participantName=id=>{const participant=state.participants.find(candidate=>candidate.id===id);return participant?`${participant.name}${participant.active===false?' (לא פעיל)':''}`:''};
const actionButton=(tag,attributes,icon,label)=>`<${tag} class="btn ghost act" ${attributes} aria-label="${label}" title="${label}">${tabler(icon)}<span class="act-label">${label}</span></${tag}>`;
// BL-ICONS-1: a row of three or more actions whose icon + label overflow its buttons switches, as a whole, to icon-only. Measured, not guessed, so it holds
// for any screen width and any text size the phone is set to; run after every render, on resize and once the fonts are in.
function fitActionRows(){
  for(const row of document.querySelectorAll('.day-item-actions')){
    row.classList.remove('icons-only');
    const buttons=[...row.children];
    if(buttons.length>=3&&buttons.some(button=>button.scrollWidth>button.clientWidth+1))row.classList.add('icons-only');
  }
}
let fitTimer=0;
addEventListener('resize',()=>{clearTimeout(fitTimer);fitTimer=setTimeout(fitActionRows,120)});
document.fonts?.ready?.then(fitActionRows);
function dayItemActions(item){
  const place=item.details?.canonicalPlace;
  const navHref=place?place.googleMapsUri||mapsUrl(`${place.latitude},${place.longitude}`):item.location?mapsUrl(mapSearchLocation(item)):'';
  return [
    // Beta 0.8 Phase 3.2 (P31-F2): a full-width row of EQUAL buttons below a hairline -- ניווט · אתר · התקשרות (the last only when the item has a phone
    // number); "כרטיסים" joins when there is a confirmed ticket. 0.8.1 (BL-ICONS-1, spec V7.5): icon + label by default; when three or more share the row and
    // icon + label do not all fit, fitActionRows() makes the WHOLE row icon-only (the label stays as the accessible name).
    navHref?actionButton('a',`href="${esc(navHref)}" target="_blank" rel="noopener"`,'compass','ניווט'):'',
    item.website?actionButton('a',`href="${esc(item.website)}" target="_blank" rel="noopener"`,'world','אתר'):'',
    item.phone&&String(item.phone).replace(/[^\d+]/g,'')?actionButton('a',`href="tel:${esc(String(item.phone).replace(/[^\d+]/g,''))}"`,'phone','התקשרות'):'',
    hasConfirmedTicket(item)?actionButton('button',`type="button" data-route="detail" data-id="${item.id}" data-anchor="item-tickets"`,'ticket','כרטיסים'):'',
  ].filter(Boolean).join('');
}
const timeOnly=value=>value?new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'';
// A short Hebrew relative-time label for the leading action card ("Busy day"/"Transit or flight
// day" both call for one) -- falls back to the ordinary date/time format once over 24h out, since
// "בעוד 30 שעות" stops being a useful "relative" cue at that distance.
function relativeTimeLabel(startAt){
  const diffMin=Math.round((new Date(startAt)-new Date())/60000);
  if(diffMin<=0)return 'עכשיו';
  if(diffMin<60)return `בעוד ${diffMin} דק׳`;
  const hours=Math.round(diffMin/60);
  return hours<24?`בעוד ${hours} שע׳`:fmt(startAt,false);
}
// Beta 0.8 Phase 1 (design spec V7 S4 "Day-item card"/"Busy day"/"Transit or flight day"): one
// card shape covers every case -- the leading (imminent) card and the rest of Today's plan differ
// only by the `leading` flag (dot + relative time + emphasis shadow vs. a plain time), and a
// flight/car's own route line vs. a generic provider/location line, never by structure.
// needs-attention reuses conflict() (an item outside the Trip's own date range) -- the one
// already-modeled "this needs a look" condition Today has actual data for; the spec's urgency
// hierarchy doesn't tie this state to any specific Today data source itself (§4).
// F6: manual "סמן כהסתיים" -- persisted on the item itself (a normal synced field, so every device
// and a reload agree). Cleared to '' rather than deleted (item-unend / "החזר"), so both stay plain
// field writes. Phase 1.2 (P11-F1): an ended item now moves to the collapsed "הסתיימו היום" section
// instead of vanishing, where "החזר" restores it.
function endItem(id){const item=state.items.find(candidate=>candidate.id===id);if(!item)return;item.endedAt=new Date().toISOString();save();notify('הפריט סומן כהסתיים')}
// F10a: a needs-attention card must say what is wrong. Out-of-range date is the only condition
// Today has data for today (more conditions are backlog item F10b); with several, show a count.
function attentionReasons(item){return conflict(item)?['התאריך מחוץ לטווח הטיול']:[]}
// Phase 1.2 (P11-F2/F7): only a started item (the leading one, or the current one waiting in the
// plan while a transport item pre-empts the lead) can be ended early -- by the full-width
// "סמן כהסתיים" button or a horizontal swipe on the card (pointer handlers at the bottom).
function dayItemCard(item,{leading=false,current=false}={}){
  const reasons=attentionReasons(item),attention=reasons.length>0;
  const endable=(leading||current)&&itemStartMs(item)<=Date.now();
  const detail=TRANSPORT_TYPES.includes(item.type)?mapSearchLocation(item)||item.location:item.provider||item.location;
  const timeArea=leading?`<bdi class="rel-time">${esc(relativeTimeLabel(item.startAt))}</bdi><span class="imminent-dot"></span><bdi>${esc(timeOnly(item.startAt))}</bdi>`:current?`<bdi class="rel-time">עכשיו</bdi><bdi>${esc(timeOnly(item.startAt))}</bdi>`:`<bdi>${esc(timeOnly(item.startAt))}</bdi>`;
  const actions=dayItemActions(item);
  const endButton=endable?`<div class="day-item-end"><button class="end-btn" data-action="item-end" data-id="${item.id}">${tabler('check')} סמן כהסתיים</button></div>`:'';
  return `<div class="day-item ${leading?'leading':''} ${current?'current':''} ${attention?'needs-attention':''}" ${endable?`data-swipe-end="${item.id}"`:''}><button class="day-item-main" data-route="detail" data-id="${item.id}"><span class="day-item-time">${timeArea}</span><span class="day-item-body"><b>${attention?`<span class="urgency-icon-attention">${tabler('alert')}</span> `:''}${esc(item.title)}</b>${attention?`<p class="attention-reason">${reasons.length===1?reasons[0]:`${reasons.length} בעיות`}</p>`:''}${detail?`<p><bdi>${esc(detail)}</bdi>${item.confirmationNumber?` · <bdi>${esc(item.confirmationNumber)}</bdi>`:''}</p>`:''}</span></button>${actions?`<div class="day-item-actions">${actions}</div>`:''}${endButton}</div>`;
}
// P11-F1: one greyed row in the collapsed "הסתיימו היום" section. "החזר" exists only for items the
// user ended by hand (it clears endedAt, like the detail page's "ביטול"); an item that is here only
// because a later one started, or because it auto-cleared, has nothing stored to undo and leaves
// the section on its own once it is no longer today.
function doneRow(item){
  return `<div class="done-row"><button class="done-row-main" data-route="detail" data-id="${item.id}"><span class="done-row-time"><bdi>${esc(timeOnly(item.startAt))}</bdi></span><span class="done-row-title">${esc(item.title)}</span></button>${item.endedAt?`<button class="done-row-restore" data-action="item-unend" data-id="${item.id}">החזר</button>`:''}</div>`;
}
// F3 (Fix B) / P11-F9 / P11-F10: the quiet "next in line" row -- no box, no fill, no actions, never a
// card in the plan itself. A short day label ("מחר" or "ו׳ 9.10") sits above the time so a future
// item can never read as happening today. Under a plan it carries its own small "הבא בתור" label;
// when nothing is left today it sits under a "הבא בתור" section heading instead (labelled:false).
function upNextLine(item,{labelled=true}={}){
  return `<button class="up-next" data-route="detail" data-id="${item.id}"><span class="up-next-when"><bdi>${esc(shortDayLabel(item.startAt))}</bdi><bdi>${esc(timeOnly(item.startAt))}</bdi></span><span class="up-next-body">${labelled?'<small class="muted">הבא בתור</small>':''}<b>${esc(item.title)}</b></span></button>`;
}
let doneTodayOpen=false;
function todayView(){
  if(!state.trip)return empty();
  const op=currentOperational(state.items);
  // Beta 0.8 Phase 1.1 (F3): Today's plan lists ONLY today's own items. op.next used to be folded
  // into this list and rendered time-only, so a Jan 7 flight read as happening today -- it now
  // appears separately, as the quiet "הבא בתור" row (upNextItem: within 48h, else a transport item
  // within 7 days; never out of range). Phase 1.2 (P11-F1): planToday() splits today's items into
  // the leading card, the plan, and the done section (ended by hand, superseded, auto-cleared).
  const split=planToday(op.todayItems);
  const upNext=upNextItem(state.items,state.trip);
  const pending=state.suggestions.filter(s=>['pending','deferred'].includes(s.status));
  const eligibleTasks=state.tasks.filter(task=>!task.done),tasks=quickAccessTasks(eligibleTasks,today(),3),shownIds=new Set([...op.todayItems,upNext].filter(Boolean).map(item=>item.id));
  const quick=uniqueRecordsById([op.currentHotel,op.nextTransport,...op.critical].filter(item=>item&&!shownIds.has(item.id)),5);
  const quickContent=tasks.length?tasks.map(taskRow).join(''):quick.length?`<div class="quick-grid">${quick.map(item=>`<button class="tile compact-tile" data-route="detail" data-id="${item.id}"><span class="ico">${ITEM_TYPES[item.type]?.icon}</span><b>${esc(item.title)}</b></button>`).join('')}</div>`:'';
  // F11-F13: the "ציוד" shortcut is gone (the Phase 1 nav's own "אריזה" item replaced it); "משימות"
  // is always offered, even with zero open tasks; "קניות" shows the unbought-item count.
  const unboughtCount=state.shopping.filter(entry=>!entry.purchased).length;
  const quickLinks=`<span class="quick-links"><button class="btn ghost" data-route="tasks">משימות</button><button class="btn ghost" data-route="shopping">קניות (${unboughtCount})</button></span>`;
  // Small addition (V6 second fix pass): Today only falls back to out-of-Trip-range items (the
  // same "מחוץ לטווח" badge already shown in Trip Center/Timeline) when it has nothing else
  // relevant to show at all -- a real, in-range Today never gets these mixed in, so a bad date
  // extraction (e.g. FL-008's real 2025 boarding pass) surfaces somewhere instead of sitting
  // unnoticed, without displacing genuinely current content. Unchanged by Phase 1.1/1.2: "nothing
  // relevant" still means no item today and no item after today at all (op.todayItems / op.next).
  const outOfRange=op.todayItems.length||op.next?[]:sortItemsByStartAt(state.items.filter(item=>isItemOutsideTrip(item,state.trip)));
  const leading=split.leading;
  const planItems=outOfRange.length?outOfRange:split.plan;
  const nothingLeft=!leading&&!planItems.length;
  const suggestedGame=!leading&&state.games.length?[...state.games].sort((a,b)=>Number(b.favorite)-Number(a.favorite))[0]:null;
  const outOfRangeNote=outOfRange.length?'<p class="muted small">אין אירועים רלוונטיים היום — מוצגים פריטים מחוץ לטווח תאריכי הטיול לבדיקה.</p>':'';
  const planBlock=planItems.length?`<div class="today-section-label">היום בתכנית</div><div class="list">${planItems.map(item=>dayItemCard(item,{current:item===split.current})).join('')}</div>`:'';
  // P11-F10: with nothing left today the plan heading becomes the "הבא בתור" heading over the quiet
  // row; with nothing left and nothing coming, no heading at all (just a quiet line).
  const upNextBlock=!upNext?'':nothingLeft?`<div class="today-section-label">הבא בתור</div>${upNextLine(upNext,{labelled:false})}`:upNextLine(upNext);
  const emptyNote=nothingLeft&&!upNext?'<p class="muted today-empty">אין תכניות להיום.</p>':'';
  const doneBlock=split.done.length?`<details class="done-today" ${doneTodayOpen?'open':''}><summary>הסתיימו היום (${split.done.length})</summary><div class="done-list">${split.done.map(doneRow).join('')}</div></details>`:'';
  const destinationLabel=(state.trip.destinationCountries||[]).join('، ');
  return `<section class="card hero"><h2>היום</h2><p class="today-status">${destinationLabel?`${esc(destinationLabel)} · `:''}${fmt(today(),false)}</p>${outOfRangeNote}${leading?dayItemCard(leading,{leading:true}):''}${planBlock}${upNextBlock}${emptyNote}${doneBlock}${suggestedGame?`<div class="game-row suggested-game"><button class="game-open" data-route="game" data-id="${suggestedGame.id}"><span class="game-icon">${tabler('dice')}</span><span class="row-main"><b>${esc(suggestedGame.title)}</b><small class="muted">הצעת משחק ליום פנוי</small></span>${tabler('chevron').replace('class="ti"','class="ti icon-directional row-chevron"')}</button><button class="game-open" data-route="games"><span class="game-icon">${tabler('dice')}</span><span class="row-main"><b>כל המשחקים</b></span>${tabler('chevron').replace('class="ti"','class="ti icon-directional row-chevron"')}</button></div>`:''}</section><section class="card"><div class="section-head quick-head"><h3>גישה מהירה</h3>${quickLinks}</div>${quickContent}</section>${pending.length?`<section class="card"><div class="section-head"><h3>הצעות לבדיקה</h3><span class="badge warn">${pending.length}</span></div><div class="list">${pending.map(suggestionRow).join('')}</div></section>`:''}`;
}

// Beta 0.8 Phase 3.1 (P3-F15): ציר הזמן -- one mode control, the month calendar always on top (stays as bands under their dates,
// dots by kind, one legend), and below it the day's agenda (יום) or a ribbon of days (שבוע / חודש / כל הטיול).
const TL_MODES=[['day','יום'],['week','שבוע'],['month','חודש'],['all','כל הטיול']];
const TL_SHIFT_LABEL={day:['היום הקודם','היום הבא'],week:['השבוע הקודם','השבוע הבא'],month:['החודש הקודם','החודש הבא'],all:['החודש הקודם','החודש הבא']};
const tlDate=(key,options)=>new Intl.DateTimeFormat('he-IL',options).format(new Date(`${key}T12:00:00`));
const tlDots=(items,key)=>[...new Set(dayEntries(items,key).filter(entry=>entry.role==='item').map(entry=>entry.item.type))].slice(0,3).map(type=>`<i class="tl-dot" style="background:${KIND_COLOURS[type]||'var(--ink)'}"></i>`).join('');
function timelineCalendar(items,stays){
  const mode=state.timelineMode,cursor=state.timelineCursor,base=new Date(`${cursor}T12:00:00`);
  const weeks=monthWeeks(base.getFullYear(),base.getMonth());
  const [shadeFrom,shadeTo]=mode==='week'?ribbonRange('week',cursor):['',''];
  const todayKey=today(),first=weeks[0].find(Boolean),last=weeks[weeks.length-1].filter(Boolean).pop();
  const label=mode==='week'?`${tlDate(shadeFrom,{day:'numeric',...(shadeFrom.slice(5,7)!==shadeTo.slice(5,7)?{month:'short'}:{})})}–${tlDate(shadeTo,{day:'numeric',month:'short',year:'numeric'})}`:tlDate(cursor,{month:'long',year:'numeric'});
  const tripLine=mode==='all'&&state.trip.startDate&&state.trip.endDate?`<span class="tl-sub">הטיול: ${tlDate(state.trip.startDate,{day:'numeric',month:'short'})} – ${tlDate(state.trip.endDate,{day:'numeric',month:'short'})} · ${daysBetween(state.trip.startDate,state.trip.endDate)+1} ימים</span>`:'';
  const cell=key=>{
    if(!key)return '<span class="tl-cell blank" aria-hidden="true"></span>';
    const isToday=key===todayKey,chosen=mode==='day'&&key===cursor,count=dayEntries(items,key).length;
    return `<button class="tl-cell ${isToday?'today':''} ${chosen?'chosen':''}" type="button" data-action="calendar-date" data-date="${key}" aria-label="${tlDate(key,{weekday:'long',day:'numeric',month:'long'})}${count?`, ${count} אירועים`:''}"${chosen?' aria-current="date"':''}><span class="tl-num">${Number(key.slice(8))}</span><span class="tl-dots">${tlDots(items,key)}</span></button>`;
  };
  const rows=weeks.map(week=>{
    const shaded=mode==='week'&&week.some(key=>key&&key>=shadeFrom&&key<=shadeTo);
    const bands=weekBands(stays,week).map(band=>`<span class="tl-band${band.roundStart?' round-start':''}${band.roundEnd?' round-end':''}" style="grid-column:${band.start} / ${band.end+1};background:${stayHue(stays,band.stay)}" title="${esc(band.stay.title)}"></span>`).join('');
    return `<div class="tl-week${shaded?' shaded':''}">${week.map(cell).join('')}${bands}</div>`;
  }).join('');
  const shownStays=stays.filter(stay=>dayOf(stay.startAt)<=last&&dayOf(stay.endAt)>=first);
  const kinds=[...new Set(items.filter(item=>!isStay(item)&&item.startAt&&!['none','entire'].includes(item.schedule)&&dayOf(item.startAt)>=first&&dayOf(item.startAt)<=last).map(item=>item.type))];
  const legend=shownStays.length||kinds.length?`<div class="tl-legend">${shownStays.map(stay=>`<span><i class="tl-key-band" style="background:${stayHue(stays,stay)}"></i><bdi>${esc(stay.title)}</bdi></span>`).join('')}${kinds.map(type=>`<span><i class="tl-key-dot" style="background:${KIND_COLOURS[type]||'var(--ink)'}"></i>${esc(ITEM_TYPES[type]?.label||type)}</span>`).join('')}</div>`:'';
  const arrow=(dir,name)=>`<button class="tl-arrow" type="button" data-action="timeline-shift" data-dir="${dir}" aria-label="${TL_SHIFT_LABEL[mode][dir<0?0:1]}">${tabler(name).replace('class="ti"','class="ti icon-directional"')}</button>`;
  return `<div class="timeline-calendar" data-timeline-calendar data-mode="${mode}"><div class="tl-cal-head">${arrow(-1,'chevleft')}<span class="tl-cal-title"><b>${label}</b>${tripLine}</span>${arrow(1,'chevron')}</div><div class="tl-weekdays" aria-hidden="true">${['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'].map(day=>`<span>${day}</span>`).join('')}</div>${rows}${legend}</div>`;
}
function tlKindColour(item,stays){return isStay(item)?stayHue(stays,item):KIND_COLOURS[item.type]||'var(--ink)'}
function tlEntryTitle(entry){
  const title=esc(entry.item.title);
  if(entry.role==='item')return title;
  if(entry.item.type==='hotel')return `${entry.role==='in'?'צ׳ק־אין':'צ׳ק־אאוט'} · ${title}`;
  return entry.role==='in'?title:`סיום · ${title}`;
}
function tlDayView(items,stays){
  const key=state.timelineCursor,entries=dayEntries(items,key),isToday=key===today();
  const night=nightStay(stays,key);
  const nightLine=night?`${tabler('bed')}<span class="tl-night-text">לינה ${isToday?'הלילה':'באותו לילה'}: <bdi>${esc(night.stay.title)}</bdi> · לילה ${night.night} מ־${night.nights}</span>`:`${tabler('bed')}<span class="tl-night-text">ללא לינה מתוכננת ${isToday?'הלילה':'באותו לילה'}</span>`;
  const next=isToday?entries.find(entry=>entry.role!=='out'&&entry.time&&new Date(entry.item.startAt).getTime()>=Date.now()):null;
  const agenda=entries.length?`<div class="tl-agenda">${entries.map((entry,index)=>{
    const item=entry.item,isNext=entry===next,place=item.provider||item.location||'';
    const sub=[ITEM_TYPES[item.type]?.label||'',place?`<bdi>${esc(place)}</bdi>`:'',isNext?esc(relativeTimeLabel(item.startAt)):''].filter(Boolean).join(' · ');
    return `<span class="ag-time${isNext?' next':''}" dir="ltr">${entry.time||'—'}</span><span class="ag-line"><i class="ag-dot" style="background:${tlKindColour(item,stays)}"></i>${index<entries.length-1?'<i class="ag-conn"></i>':''}</span><button class="ag-card${isNext?' next':''}" type="button" data-route="detail" data-id="${item.id}"><b>${tlEntryTitle(entry)}</b><span class="ag-sub">${sub}</span></button>`;
  }).join('')}</div>`:emptyState('calendar','אין תוכניות ביום הזה','בחרו יום אחר בלוח, או הוסיפו פריט.');
  return `<div class="tl-day-head"><b>${isToday?'היום · ':''}${tlDate(key,{weekday:'short',day:'numeric',month:'short'})}</b><span class="muted small">${entries.length===1?'פריט אחד':entries.length?`${entries.length} פריטים`:''}</span></div><div class="tl-night">${nightLine}</div>${agenda}`;
}
function tlRibbon(items,stays){
  const mode=state.timelineMode,[from,to]=ribbonRange(mode,state.timelineCursor,state.trip,items),todayKey=today();
  const rows=ribbonRows(items,stays,from,to,{collapse:mode==='all'});
  const short=key=>`${Number(key.slice(8))}.${Number(key.slice(5,7))}`;
  const body=rows.map(row=>{
    if(row.collapsed)return `<div class="rb-collapsed"><bdi>${short(row.from)}–${short(row.to)}</bdi> · ${row.count} ימים ללא תוכניות</div>`;
    const isToday=row.key===todayKey;
    const bars=row.covering.map(cover=>`<i class="rb-bar ${cover.position}" style="background:${stayHue(stays,cover.stay)}"></i>`).join('')+(row.covering.length?'':row.entries.some(entry=>entry.item.type==='flight')?`<i class="rb-dot" style="background:${KIND_COLOURS.flight}"></i>`:'');
    const content=row.entries.length?row.entries.map(entry=>`<button class="rb-entry" type="button" data-route="detail" data-id="${entry.item.id}"><b class="rb-time" dir="ltr">${entry.time||'—'}</b><span class="rb-title">${tlEntryTitle(entry)}</span></button>`).join(''):row.covering.length?`<span class="rb-empty"><bdi>${esc(row.covering[0].stay.title)}</bdi> · יום חופשי</span>`:'<span class="rb-empty">אין תוכניות</span>';
    return `<div class="rb-row${isToday?' today':''}"><span class="rb-date"><b dir="ltr">${short(row.key)}</b><span>${isToday?'היום':tlDate(row.key,{weekday:'narrow'})}</span></span><span class="rb-bars">${bars}</span><span class="rb-content">${content}</span></div>`;
  }).join('');
  return `<div class="tl-ribbon">${body}</div>`;
}
function timeline(){
  if(!state.trip)return empty();
  const modes=availableTimelineModes(state.trip);if(!modes.includes(state.timelineMode))state.timelineMode='all';
  if(!state.timelineCursor)state.timelineCursor=state.trip.startDate||today();
  const items=state.items,stays=stayList(items.filter(item=>!['none','entire'].includes(item.schedule)));
  const control=`<div class="tl-modes" role="group" aria-label="תצוגה">${TL_MODES.filter(([mode])=>modes.includes(mode)).map(([mode,label])=>`<button type="button" data-action="timeline-mode" data-mode="${mode}" aria-pressed="${state.timelineMode===mode}">${label}</button>`).join('')}</div>`;
  const entire=state.timelineMode==='all'?items.filter(item=>item.schedule==='entire'):[];
  const below=state.timelineMode==='day'?tlDayView(items,stays):tlRibbon(items,stays);
  return `<section class="card timeline-card"><h2>ציר הזמן</h2>${control}${timelineCalendar(items,stays)}<div class="timeline-list" aria-live="polite">${below}${entire.length?`<div class="day-group"><div class="day-head">לכל הטיול</div><div class="list">${entire.map(itemRow).join('')}</div></div>`:''}</div></section>`;
}

// Beta 0.8 Phase 3.1 (P3-F13): a compact document row -- icon, the name on one LTR line, a status chip and a muted note; the row
// opens the document and a "⋯" menu holds the rest (פתיחה / שיוך למשתתף / divider / מחק, no "מחק" on a confirmed ticket).
function documentRow({source,stateName,flags}){
  const available=source.kind==='link'||source.storedOffline;
  const canRetry=source.kind!=='link'&&source.storedOffline&&(['saved_only','failed'].includes(source.processingState)||stateName==='failed');
  // P31-F3 (PO, 2026-10-12): a Failed row shows just its red "נכשל" pill under the name; "נסה שוב" and "מחק" both live in the row's "⋯" menu.
  const retry=stateName==='failed'&&canRetry?menuButton('analyze-source',source,'נסה שוב'):'';
  const names=(source.participantIds||[]).map(participantName).filter(Boolean);
  const chip=['failed','processing','queued'].includes(stateName)?`<span class="doc-status">${importStatusPill(stateName)}</span>`:source.ticketConfirmed?'<span class="doc-chip ok">כרטיס מאושר</span>':flags.pending?'<span class="doc-chip pending">ממתין לאישור</span>':flags.attached?'<span class="doc-chip ok">מצורף</span>':'';
  const notes=[flags.attached&&flags.pending?'חילוץ ממתין לאישור':'',names.length?esc(names.join(', ')):'',source.kind==='link'&&!chip&&!names.length?'קישור':'',available?'':'הקובץ אינו זמין אופליין'].filter(Boolean).map(text=>`<span class="doc-note">${text}</span>`).join('');
  const label=`<bdi class="doc-name" dir="ltr">${esc(source.name||source.url)}</bdi>`;
  // 0.8.1: which item(s) this document belongs to -- every linked item's name (its type too when another item shares the name), or an explicit "not linked".
  const linked=linkageLabels(source,state.items,type=>ITEM_TYPES[type]?.label||type);
  const linkLine=linked.length?`<span class="doc-link">${tabler('link')}<span>מקושר ל־${linked.map(name=>`<bdi>${esc(name)}</bdi>`).join('، ')}</span></span>`:'<span class="doc-link none">לא מקושר לפריט</span>';
  const body=`${label}<span class="doc-meta">${chip}${notes}</span>${linkLine}`;
  const main=source.kind==='link'?`<a class="doc-main" href="${esc(source.url)}" target="_blank" rel="noopener">${body}</a>`:available?`<button class="doc-main" type="button" data-action="open-source" data-id="${source.id}">${body}</button>`:`<div class="doc-main">${body}</div>`;
  const open=source.kind==='link'?`<a class="t-menu-item" href="${esc(source.url)}" target="_blank" rel="noopener">פתיחה</a>`:available?menuButton('open-source',source,'פתיחה'):'';
  // 0.8.1: "קישור לפריט" re-links the document to an item; "מחק" is a true hard delete for EVERY document here, a confirmed ticket included (its
  // confirmation names the covered people and every linked item -- see sourceDeleteMessage).
  const menu=[retry,open,state.participants.length?menuButton('source-edit-participants',source,'שיוך למשתתף'):'',menuButton('source-link',source,'קישור לפריט'),menuButton('source-delete',source,'מחק')].join('');
  return `<div class="doc-row"><span class="doc-icon">${typeIcon(source.kind==='link'?'link':'document')}</span>${main}${moreMenu([menu])}</div>`;
}
function documentsCategory(){
  const items=sortItemsByStartAt(state.items.filter(item=>item.type==='document'));
  const suggestions=state.suggestions.filter(s=>['pending','deferred'].includes(s.status)),archive=state.rejectedSuggestions;
  const entries=state.sources.map(source=>{const stateName=sourceImportState(source,{flashAttached:attachedFlash.has(source.id)});return {source,stateName,flags:documentFlags(source,{items:state.items,suggestions:state.suggestions,stateName})}});
  const counts=documentCounts(entries),filter=DOC_FILTERS.some(([key])=>key===state.docFilter)?state.docFilter:'all';
  const shown=entries.filter(entry=>documentMatchesFilter(entry.flags,filter));
  const chips=DOC_FILTERS.map(([key,label])=>`<button class="filter-chip ${filter===key?'active':''}" type="button" data-action="doc-filter" data-filter="${key}" aria-pressed="${filter===key}">${label} · <bdi>${counts[key]}</bdi></button>`).join('');
  const list=shown.length?`<div class="list doc-list">${shown.map(documentRow).join('')}</div>`:entries.length?emptyState('document','אין מסמכים בסינון הזה','נסו סינון אחר.','<button class="btn ghost" type="button" data-action="doc-filter" data-filter="all">הצגת הכול</button>'):'';
  const showProposals=filter==='all'||filter==='pending';
  const nothing=!items.length&&!entries.length&&!suggestions.length&&!archive.length;
  return `<section class="card">${backRow('center','',`<button class="btn ghost small-btn add-type" data-action="create" aria-label="הוספת ${ITEM_TYPES.document.label}">${tabler('plus')}<span class="btn-label">${ITEM_TYPES.document.label}</span></button>`,`${typeIcon('document')} ${ITEM_TYPE_PLURALS.document}`)}${entries.length?`<p class="muted small doc-summary">${documentSummary(counts)}</p><div class="doc-filters" role="group" aria-label="סינון מסמכים">${chips}</div>`:''}${showProposals&&suggestions.length?`<h3>הצעות פעילות</h3><div class="list">${suggestions.map(suggestionRow).join('')}</div>`:''}${filter==='all'&&items.length?`<div class="list">${items.map(itemRow).join('')}</div>`:''}${list}${nothing?emptyState(TYPE_ICON_NAMES.document,'אין פריטים','הוסיפו את הפריט הראשון בקטגוריה.'):''}${archive.length?`<details class="proposal-archive archive-at-bottom"><summary>ארכיון הצעות שנדחו (${archive.length})</summary><div class="list">${archive.map(archivedSuggestionRow).join('')}</div></details>`:''}</section>`;
}
function center(){
  if(!state.trip)return empty();
  if(state.category==='document')return documentsCategory();
  if(state.category){const items=sortItemsByStartAt(state.items.filter(item=>item.type===state.category)),sources=state.category==='document'?state.sources:[],suggestions=state.category==='document'?state.suggestions.filter(s=>['pending','deferred'].includes(s.status)):[],archive=state.category==='document'?state.rejectedSuggestions:[];return `<section class="card">${backRow('center','',`<button class="btn ghost small-btn add-type" data-action="create" aria-label="הוספת ${esc(ITEM_TYPES[state.category]?.label||'')}">${tabler('plus')}<span class="btn-label">${ITEM_TYPES[state.category]?.label||''}</span></button>`,`${typeIcon(state.category)} ${ITEM_TYPE_PLURALS[state.category]||ITEM_TYPES[state.category]?.label||''}`)}${suggestions.length?`<h3>הצעות פעילות</h3><div class="list">${suggestions.map(suggestionRow).join('')}</div>`:''}${items.length?`<div class="list">${items.map(itemRow).join('')}</div>`:''}${sources.length?`<h3>מקורות</h3><div class="list">${sources.map(source=>sourceRow(source)).join('')}</div>`:''}${!items.length&&!sources.length&&!suggestions.length&&!archive.length?emptyState(TYPE_ICON_NAMES[state.category]||'pin','אין פריטים','הוסיפו את הפריט הראשון בקטגוריה.'):''}${archive.length?`<details class="proposal-archive archive-at-bottom"><summary>ארכיון הצעות שנדחו (${archive.length})</summary><div class="list">${archive.map(archivedSuggestionRow).join('')}</div></details>`:''}</section>`}
  const operational=[['games',tabler('dice'),'משחקים ופעילויות',state.games.length],['packing',tabler('bag'),'ציוד',state.packing.length],['tasks',tabler('checklist'),'הכנות',state.tasks.filter(x=>!x.done).length],['shopping',tabler('cart'),'קניות',state.shopping.filter(x=>!x.purchased).length]];
  // 0.7.4: 'participant' explicitly excluded -- see SYNCED_COLLECTIONS' own comment
  // (operational-data.js) for why the old generic ITEM_TYPES.participant stub is being retired in
  // favor of a real, separate participants collection, and kept defined (not deleted) only so any
  // already-existing legacy item of that type still renders correctly rather than going orphaned.
  // 0.7.7: 'shoppingPlace' also excluded -- the frozen contract wants Shopping as ONE standalone
  // Trip Center category containing both places and the shared list, not two separate tiles.
  // shoppingView() below renders shoppingPlace items directly, reached only through the existing
  // "shopping" operational tile (and each place's own row, and the generic detail route) -- never
  // through this generic tile grid, exactly like link/participant above.
  const visibleTypes=Object.entries(ITEM_TYPES).filter(([key])=>!['link','participant','shoppingPlace'].includes(key));
  return `<section class="card"><h2>מרכז הטיול</h2><p class="muted">מידע, מסמכים וכלי תפעול לנסיעה.</p><div class="grid two">${visibleTypes.map(([key,type])=>`<button class="tile" data-route="center" data-cat="${key}"><span class="ico">${typeIcon(key)}</span><b>${ITEM_TYPE_PLURALS[key]||type.label}</b><small class="muted">${state.items.filter(item=>item.type===key).length+(key==='document'?state.sources.length:0)} פריטים</small></button>`).join('')}${operational.map(([view,icon,label,count])=>`<button class="tile" data-route="${view}"><span class="ico">${icon}</span><b>${label}</b><small class="muted">${count}</small></button>`).join('')}</div></section>`;
}
// V6-F42: retrying a failed analysis from here (analyze-source -> analyzeSavedSource ->
// runSmartAnalysis) already sets source.processingState to 'processing' and re-renders
// immediately, but this row never reflected that -- it just silently kept showing the old status
// text with no visual cue, looking stuck until the request suddenly resolved. A small inline
// "מנתח…" badge (matching this row's own existing badge scale, rather than the full-panel
// spinner used inside the intake/attachment modal, which would be oversized here) plus hiding the
// retry button while a request is already in flight gives the same "something is happening"
// signal the initial analysis flow already has.
// 0.7.9 (V7-F09): participant link is always shown and always manually correctable, whether it
// arrived via auto-match (runSmartAnalysis, extract mode) or by hand -- the same "extracted with
// manual override" pattern every other Smart Import field already follows, not a new one.
// 0.7.9 correction round 3 (Finding 2, Product Owner design decision): ticket coverage is now
// document-driven, not a separate manually-added item.tickets[] entry -- a document already
// linked to participant(s) can be offered (confirmed, not auto-created) as that document's own
// ticket coverage, with "used" tracked as one shared boolean on the source itself. Per the
// Product Owner's own explicit instruction, this is the ONLY place a document's ticket status
// lives -- no separate section re-lists the same per-document information, avoiding the exact
// two-section duplication that blocked rounds 1-3. Only offered for ticket-eligible item types
// (flight/activity/car, matching ticketsSection's own type gate) once a participant link exists.
// 0.7.9.2 (document removal): a per-item, per-document unlink action -- itemId is only passed by
// detailView's own per-item document list (never the generic Trip Center "documents" category
// page, which shows every source across the whole Trip with no single owning item), so the
// remove button only ever appears where there's a real item to unlink from.
// Beta 0.8 Phase 2: one linked-document row, used by the item's Documents block and by Trip Center's
// Documents category (itemId only passed from the item's own list -- the Trip Center page shows every
// source across the Trip with no single owning item, so it never offers "remove"). Status is the shared
// Smart Import status pill (import-status.js); ticket coverage / "used" no longer live on the document
// row at all -- they are their own block, ticketCoverageBlock below (P12-F5).
// The Failed pill carries the spec's own inline "נסה שוב" / "מחק" (S7); "מחק" is the explicit hard
// delete (source-delete), distinct from the item's soft "הסרה" (source-unlink).
function sourceRow(source,itemId){
  const available=source.kind==='link'||source.storedOffline;
  const stateName=sourceImportState(source,{flashAttached:attachedFlash.has(source.id)});
  const canRetry=source.kind!=='link'&&source.storedOffline&&(['saved_only','failed'].includes(source.processingState)||stateName==='failed');
  const failedActions=`${canRetry?`<button class="btn" type="button" data-action="analyze-source" data-id="${source.id}">נסה שוב</button>`:''}<button class="btn" type="button" data-action="source-delete" data-id="${source.id}">מחק</button>`;
  const pill=stateName?`<span class="doc-status"${stateName==='attached'?` data-flash-source="${source.id}"`:''}>${importStatusPill(stateName,{actions:failedActions})}</span>`:'';
  const names=(source.participantIds||[]).map(participantName).filter(Boolean);
  const meta=[source.kind==='link'?'קישור':'מסמך',stateName?'':source.status,available?'זמין':'הקובץ אינו זמין אופליין',names.length?`שויך ל: ${names.join(', ')}`:''].filter(Boolean).map(esc).join(' · ');
  const open=source.kind==='link'?`<a class="btn ghost" href="${esc(source.url)}" target="_blank" rel="noopener">פתיחה</a>`:available?`<button class="btn ghost" data-action="open-source" data-id="${source.id}">פתיחה</button>`:'<span class="badge warn">מטא־נתונים בלבד</span>';
  return `<div class="row source-doc-row"><span class="row-main"><b>${typeIcon(source.kind==='link'?'link':'document')} ${esc(source.name||source.url)}</b><small class="muted">${meta}</small></span>${pill}<div class="doc-actions">${state.participants.length?`<button class="btn ghost" data-action="source-edit-participants" data-id="${source.id}">שיוך למשתתף</button>`:''}${canRetry&&stateName!=='failed'?`<button class="btn secondary" data-action="analyze-source" data-id="${source.id}">ניתוח חכם</button>`:''}${open}${itemId?`<button class="btn danger" data-action="source-unlink" data-id="${source.id}" data-item-id="${itemId}">הסרה</button>`:''}${canDeleteSource(source,stateName)?`<button class="btn danger" data-action="source-delete" data-id="${source.id}">מחק</button>`:''}</div></div>`;
}

// Beta 0.8 Phase 3 (design spec V7 S6): a compact catalog, not a gallery. Each row is two separate tap targets -- the row
// that opens the game, and the favourite star (44x44, 8px away from the row's own tap zone).
function gameRow(game){
  const meta=[game.participants,game.duration].filter(Boolean).map(esc).join(' · ');
  return `<div class="game-row"><button class="game-open" data-route="game" data-id="${game.id}"><span class="game-icon">${tabler('dice')}</span><span class="row-main"><b>${esc(game.title)}</b><small class="muted">${meta}</small></span>${tabler('chevron').replace('class="ti"','class="ti icon-directional row-chevron"')}</button><button class="game-star ${game.favorite?'on':''}" data-action="game-favorite" data-id="${game.id}" aria-pressed="${Boolean(game.favorite)}" aria-label="${game.favorite?'הסרה מהמועדפים':'הוספה למועדפים'}: ${esc(game.title)}">${tabler('star')}</button></div>`;
}
// 0.9.1 (P91-F1, PO-approved design): the catalog's filters are icons -- favourites a star, "10 דקות" a clock with a bold 10, "בנסיעה" a side-view car,
// "לכולם" a group of three people. Each keeps its text as the accessible name and tooltip; "הכול" stays a word.
const GAME_FILTER_ICONS={
  favorites:()=>tabler('star'),
  quick:()=>'<svg class="ti clock" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12.5" r="9.5"></circle><path d="M12 1.5v2M9.5 1.5h5"></path><text x="12" y="16" text-anchor="middle" font-size="9.5" font-weight="700" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>',
  onTheGo:()=>'<svg class="ti" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 15v-3.5a1 1 0 0 1 1-1h1.5L7.5 7.5h6.5l3 3H20a2 2 0 0 1 2 2V15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"></path><path d="M11 7.5v4h-4.5M13.5 7.5v4h4"></path><circle cx="7" cy="16" r="2"></circle><circle cx="17" cy="16" r="2"></circle></svg>',
  everyone:()=>'<svg class="ti" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="2.8"></circle><path d="M6.5 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h2a4.5 4.5 0 0 1 4.5 4.5V20"></path><circle cx="5.5" cy="9.5" r="2.2"></circle><path d="M1.5 18.5v-1a3 3 0 0 1 3-3h.5"></path><circle cx="18.5" cy="9.5" r="2.2"></circle><path d="M22.5 18.5v-1a3 3 0 0 0-3-3h-.5"></path></svg>',
};
function gamesView(){
  const filter=state.gameFilter||'all',games=filterGames(state.games,filter);
  const chips=GAME_FILTERS.map(([value,label])=>`<button class="filter-chip ${GAME_FILTER_ICONS[value]?'icon-chip ':''}${value==='favorites'?'star ':''}${filter===value?'active':''}" data-action="game-filter" data-filter="${value}" aria-pressed="${filter===value}"${GAME_FILTER_ICONS[value]?` aria-label="${label}" title="${label}"`:''}>${GAME_FILTER_ICONS[value]?GAME_FILTER_ICONS[value]():label}</button>`).join('');
  const emptyText=filter==='favorites'?['אין מועדפים עדיין','סמנו משחק בכוכב כדי שיופיע כאן.']:['אין משחקים תואמים','נסו מסנן אחר.'];
  const body=games.length?`<div class="list game-list">${games.map(gameRow).join('')}</div>`:emptyState('dice',emptyText[0],emptyText[1],'<button class="btn ghost" data-action="game-filter" data-filter="all">הצגת הכול</button>');
  return `<section class="card"><div class="page-head"><h2>משחקים ופעילויות</h2></div><p class="muted small">ההוראות נשמרות מקומית וזמינות גם ללא אינטרנט.</p><div class="chip-filters game-filters" role="group" aria-label="סינון משחקים">${chips}</div>${body}</section>`;
}
// A uniform page for every game: name, description, who it suits, duration, one primary action.
function gameView(){
  const game=state.games.find(candidate=>candidate.id===state.itemId);
  if(!game)return `<section class="card">${backRow('games')}${emptyState('dice','המשחק לא נמצא','ייתכן שהוסר.','')}</section>`;
  if(game.id===TRIVIA_ID)return triviaView(game);
  if(game.id===BINGO_ID)return bingoView(game);
  const fact=(label,value)=>value?`<div class="fact"><dt>${label}</dt><dd>${esc(value)}</dd></div>`:'';
  return `<section class="card">${backRow('games','','',`${tabler('dice')} ${esc(game.title)}`)}<p class="game-description">${esc(game.instructions)}</p><dl class="detail-facts">${fact('מתאים ל',game.participants)}${fact('משך',game.duration)}${fact('ציוד',game.items)}</dl><button class="btn game-primary" data-action="game-start" data-id="${game.id}">${gamePrimaryAction(game)}</button></section>`;
}
// Beta 0.9.1: Trivia. The deck is built once per tap by the server (one of the day's Smart Import calls), stored on the game's own
// record and playable offline afterwards. UI-only state (not saved): which game is being built / played, whether the answer is
// shown, and who was marked correct on the current question.
let triviaBuilding=null,gamePlaying=null,triviaRevealed=false,triviaMarked=[];
// 0.9.2 (P91-F3): the winner animation every game shares -- one of four directions at random, the winner's name in the middle. Mounted outside #app
// so render() never wipes it; it never blocks a tap and removes itself.
let winnerTimer=0;
function fireWinner({name,caption='',big=false},random=Math.random){
  let host=document.querySelector('#winner-host');
  if(!host){host=document.createElement('div');host.id='winner-host';document.body.append(host)}
  host.innerHTML=winnerHtml({name,caption,big},random);
  clearTimeout(winnerTimer);winnerTimer=setTimeout(()=>{host.innerHTML=''},big?WINNER_MS.big:WINNER_MS.normal);
}
const triviaTop=(game,action)=>backRow('games','','',`${tabler('dice')} ${esc(game.title)}`,action);
function triviaView(game){
  if(triviaBuilding===game.id){
    const first=state.items.find(item=>['hotel','activity'].includes(item.type)&&item.title);
    const phrases=['אוספים שאלות על מקומות ותרבות ביעד…','מתאימים את השאלות לילדים…',first?`מוסיפים שאלה על <bdi>${esc(first.title.length>24?first.title.slice(0,24).trim():first.title)}</bdi>…`:'מערבבים שאלות על חיי היומיום…'];
    return `<section class="card">${triviaTop(game)}${largePalm({phrases,label:'בונים טריוויה…',note:'זה יכול לקחת כמה שניות. אין צורך לסגור את המסך.'})}</section>`;
  }
  if(gamePlaying===game.id&&(game.deck||[]).length)return triviaPlayView(game);
  const fact=(label,value)=>value?`<div class="fact"><dt>${label}</dt><dd>${esc(value)}</dd></div>`:'';
  const gate=triviaBuildGate(state.trip),built=(game.deck||[]).length>0;
  const facts=`<dl class="detail-facts">${fact('מתאים ל',game.participants)}${fact('משך',game.duration)}${fact('ציוד',game.items)}</dl>`;
  const hint=gate.allowed?'':`<p class="muted small game-hint">${gate.hint}</p>`;
  if(built)return `<section class="card">${triviaTop(game)}<p class="game-description">${esc(game.instructions)}</p>${facts}<p class="muted small">${game.deck.length} שאלות מוכנות · אפשר לשחק גם בלי חיבור לאינטרנט.</p><button class="btn game-primary" data-action="game-start" data-id="${game.id}">${gamePrimaryAction(game)}</button><button class="btn ghost game-secondary" data-action="trivia-build" data-id="${game.id}"${gate.allowed?'':' disabled'}>בנה טריוויה מחדש</button>${hint}</section>`;
  return `<section class="card">${triviaTop(game)}${emptyState('dice','עדיין לא נבנתה טריוויה לטיול הזה',esc(game.instructions))}${facts}<button class="btn game-primary" data-action="trivia-build" data-id="${game.id}"${gate.allowed?'':' disabled'}>בנה טריוויה</button>${hint}</section>`;
}
function triviaPlayView(game){
  const ts=game.triviaState,total=ts.order.length,people=state.participants.filter(person=>person.active!==false);
  if(triviaFinished(game)){
    const rows=triviaTally(ts.scores,state.participants).map(row=>`<div class="tally-row${row.medal==='🥇'?' first':''}"><span class="tally-name">${row.medal?`<span class="medal" aria-hidden="true">${row.medal}</span>`:''}${esc(row.name)}</span><span class="tally-score">${row.score}</span></div>`).join('');
    const gate=triviaBuildGate(state.trip);
    return `<section class="card">${triviaTop(game,'trivia-exit')}<div class="trivia-end"><b>סיימתם את הסיבוב!</b><p class="muted">${total} שאלות על היעד והטיול שלכם</p><div class="tally">${rows}</div></div><button class="btn game-primary" data-action="trivia-replay" data-id="${game.id}">שחקו שוב</button><button class="btn ghost game-secondary" data-action="trivia-build" data-id="${game.id}"${gate.allowed?'':' disabled'}>בנה טריוויה מחדש</button></section>`;
  }
  const question=triviaQuestion(game);
  const chips=people.length?`<p class="trivia-prompt">מי ענה נכון?</p><div class="trivia-chips">${people.map(person=>`<button class="trivia-chip${triviaMarked.includes(person.id)?' on':''}" data-action="trivia-score" data-id="${game.id}" data-participant="${person.id}" aria-pressed="${triviaMarked.includes(person.id)}">${esc(person.name)} <span class="score">${ts.scores?.[person.id]||0}</span></button>`).join('')}</div>`:'';
  const answer=triviaRevealed?`<div class="answer-box"><span class="q-label">תשובה</span><b class="a-text">${esc(question.answer)}</b>${question.explanation?`<p class="a-why">${esc(question.explanation)}</p>`:''}<a class="a-more" href="${esc(readMoreUrl(question.answer))}" target="_blank" rel="noopener" aria-label="קרא עוד על ${esc(question.answer)}">קרא עוד</a></div>`:'';
  const action=triviaRevealed?`${chips}<button class="btn game-primary" data-action="trivia-next" data-id="${game.id}">${ts.position+1<total?'השאלה הבאה':'לסיכום'}</button>`:`<button class="btn game-primary" data-action="trivia-reveal" data-id="${game.id}">הצג תשובה</button>`;
  return `<section class="card">${triviaTop(game,'trivia-exit')}<div class="trivia-q"><span class="q-label">שאלה <bdi dir="ltr">${ts.position+1}/${total}</bdi></span><p class="q-text">${esc(question.question)}</p>${answer}</div>${action}</section>`;
}
async function buildTrivia(gameId){
  const game=state.games.find(candidate=>candidate.id===gameId);
  if(!game||triviaBuilding||!triviaBuildGate(state.trip).allowed)return;
  if((game.deck||[]).length&&(game.triviaState?.position||0)>0&&!triviaFinished(game)&&!confirm('לבנות טריוויה חדשה? המשחק שבאמצע והניקוד שלו יימחקו.'))return;
  triviaBuilding=gameId;render();
  try{
    const result=await generateTrivia({trip:state.trip,items:state.items,history:game.askedQuestions||[]});
    const deck=newTriviaDeck(result.questions);
    if(!deck.length)throw new Error('לא נמצאו שאלות חדשות ליעד הזה. נסו שוב מאוחר יותר.');
    const live=state.games.find(candidate=>candidate.id===gameId);
    live.deck=deck;live.askedQuestions=capHistory(live.askedQuestions,deck);live.triviaState=newTriviaState(deck);live.started=false;
    triviaBuilding=null;gamePlaying=null;save();render();
    notify(result.shortBy>0?`נבנו ${deck.length} שאלות חדשות — חומר חדש ליעד הזה מתחיל להיגמר`:'הטריוויה מוכנה',result.shortBy>0?5000:2600);
  }catch(error){triviaBuilding=null;render();notify(error.message||'בניית הטריוויה נכשלה.',6000)}
}
// Beta 0.9.2: Bingo ("בינגו לפי מקום"). Six location themes; every participant has their own shuffled 4x4 board per theme and finds a spot by photographing it.
// OFFLINE: a photo is saved on the device first (local-photos.js) and the cell is found at once; it is uploaded to Storage when there is a connection
// (`pending` marks one that is not up yet). Photos are shown from the device copy, else downloaded with downloadAttachment() (getBytes), never getDownloadURL() --
// the CORS bug the app already paid to fix once. Tapping a found cell opens it full size (replace / erase). UI-only state (not saved): the picker, the participant
// on screen, the spot being photographed / opened.
let bingoPicking=false,bingoParticipant=null,bingoPending=null,bingoBusy=null,bingoViewing=null,bingoSyncing=false;
const bingoPhotoUrls=new Map(),bingoLoading=new Set(),bingoFailed=new Set();
const bingoGame=()=>state.games.find(candidate=>candidate.id===BINGO_ID);
const bingoTop=game=>backRow('games','','',`${tabler('dice')} ${esc(game.title)}`,'bingo-exit');
function bingoCurrentParticipant(){
  const people=state.participants.filter(person=>person.active!==false);
  return people.some(person=>person.id===bingoParticipant)?bingoParticipant:people[0]?.id||null;
}
function bingoViewer(game,board,spots,selected){
  const entry=bingoViewing&&board.found[bingoViewing];
  if(!entry)return '';
  const person=state.participants.find(candidate=>candidate.id===selected);
  return `<div class="bingo-viewer" role="dialog" aria-modal="true" aria-label="${esc(spots[bingoViewing].label)}"><div class="bingo-viewer-top"><button class="bingo-viewer-close" data-action="bingo-view-close" aria-label="סגירה">${tabler('x')}<span>סגירה</span></button><b>${esc(spots[bingoViewing].label)}</b><span>${esc(String(person?.name||'').split(' ')[0])}</span></div><span class="bingo-photo large" data-action="bingo-view-close" data-photo-path="${esc(entry.photoPath)}" role="img" aria-label="${esc(spots[bingoViewing].label)}"></span>${entry.pending?'<p class="bingo-viewer-note">התמונה שמורה במכשיר ותעלה כשיהיה חיבור.</p>':''}<div class="bingo-viewer-actions"><button class="bingo-viewer-btn" data-action="bingo-replace">החלפת תמונה</button><button class="bingo-viewer-btn danger" data-action="bingo-erase">מחיקת תמונה</button></div></div>`;
}
function bingoView(game){
  const fact=(label,value)=>value?`<div class="fact"><dt>${label}</dt><dd>${esc(value)}</dd></div>`:'';
  if(gamePlaying!==game.id)return `<section class="card">${backRow('games','','',`${tabler('dice')} ${esc(game.title)}`)}<p class="game-description">${esc(game.instructions)}</p><dl class="detail-facts">${fact('מתאים ל',game.participants)}${fact('משך',game.duration)}${fact('ציוד',game.items)}</dl><button class="btn game-primary" data-action="game-start" data-id="${game.id}">${gamePrimaryAction(game)}</button></section>`;
  const people=state.participants.filter(person=>person.active!==false);
  if(!people.length)return `<section class="card">${bingoTop(game)}${emptyState('users','אין עדיין משתתפים','הוסיפו משתתפים בהגדרות הטיול — לכל משתתף יש לוח משלו.')}</section>`;
  const theme=BINGO_THEMES[game.activeTheme];
  if(bingoPicking||!theme)return `<section class="card">${bingoTop(game)}<p class="game-description">איפה אתם עכשיו? בחרו מקום. ההתקדמות של כל מקום נשמרת בנפרד.</p><div class="bingo-picker">${BINGO_THEME_KEYS.map(key=>`<button class="bingo-tile${key===game.activeTheme?' on':''}" data-action="bingo-theme" data-theme="${key}">${tabler(BINGO_THEMES[key].icon)}<b>${esc(BINGO_THEMES[key].label)}</b></button>`).join('')}</div></section>`;
  const selected=bingoCurrentParticipant(),board=ensureBoard(game,game.activeTheme,selected),spots=Object.fromEntries(theme.spots.map(spot=>[spot.id,spot]));
  const cells=board.layout.map(id=>{
    const spot=spots[id],found=board.found[id];
    if(found)return `<button class="bingo-cell found" data-action="bingo-cell" data-spot="${id}" aria-label="${esc(spot.label)} — נמצא${found.pending?', ממתין להעלאה':''}. לחצו להגדלה"><span class="bingo-photo" data-photo-path="${esc(found.photoPath)}"></span><span class="bingo-check">${tabler('check')}</span>${found.pending?`<span class="bingo-pending" title="ממתין להעלאה">${tabler('clock')}</span>`:''}<span class="bingo-label over">${esc(spot.label)}</span></button>`;
    if(bingoBusy===id)return `<button class="bingo-cell busy" disabled aria-label="${esc(spot.label)} — שומרים תמונה">${tabler('upload')}<span class="bingo-label">שומרים…</span></button>`;
    return `<button class="bingo-cell" data-action="bingo-cell" data-spot="${id}" aria-label="${esc(spot.label)} — עדיין לא נמצא, לחצו לצילום">${tabler('camera')}<span class="bingo-label">${esc(spot.label)}</span></button>`;
  }).join('');
  const count=foundCount(board),total=board.layout.length;
  return `<section class="card bingo-card">${bingoTop(game)}<div class="bingo-toolbar"><button class="btn ghost small-btn" data-action="bingo-switch">${tabler(theme.icon)} ${esc(theme.label)} · החלפת מקום</button><button class="btn ghost small-btn" data-action="bingo-reset">${tabler('refresh')} איפוס הלוח</button></div>${participantCarousel(people.map(person=>[person.id,person.name]),selected,'bingo-participant','bingo')}<p class="bingo-progress"><bdi dir="ltr">${count}/${total}</bdi> נמצאו${count===total?' — הלוח הושלם!':''}</p><div class="bingo-board" role="group" aria-label="לוח בינגו">${cells}</div><input type="file" id="bingo-file" accept="image/*" capture="environment" hidden>${bingoViewer(game,board,spots,selected)}</section>`;
}
// The enlarged photo has four ways out: the big "סגירה" button, a tap on the photo, Escape, and the phone's Back gesture (the viewer is one history step).
function openBingoViewer(spotId){bingoViewing=spotId;history.pushState({bingoViewer:true},'');render()}
function closeBingoViewer(){const open=bingoViewing;bingoViewing=null;if(open&&history.state?.bingoViewer)history.back()}
function bingoCellTap(spotId){
  const game=bingoGame(),pid=bingoCurrentParticipant();
  if(!game||!pid||bingoBusy||!BINGO_THEMES[game.activeTheme])return;
  // a found cell opens its photo full size; an unfound one goes straight to the camera (it works offline: the photo is kept on the device)
  if(ensureBoard(game,game.activeTheme,pid).found[spotId]){openBingoViewer(spotId);return}
  bingoPending={theme:game.activeTheme,pid,spotId};
  startBingoCapture();
}
// The camera: the phone's own file-picker camera ("capture") opened the SELFIE camera on some phones, so Bingo opens its own viewfinder on the REAR camera
// (getUserMedia, the same call the QR scanner uses) with a button to flip it. It lives on <body>, outside #app, so a re-render never kills the stream.
// Without camera access (denied, unsupported) it falls back to the device's file-picker camera.
let bingoCameraStream=null,bingoCameraOpen=false,bingoPopIgnore=false;
function bingoCameraHost(){let host=document.querySelector('#bingo-camera-host');if(!host){host=document.createElement('div');host.id='bingo-camera-host';document.body.append(host)}return host}
function stopBingoCameraStream(){if(bingoCameraStream)bingoCameraStream.getTracks().forEach(track=>track.stop());bingoCameraStream=null}
function closeBingoCamera(){
  const was=bingoCameraOpen;bingoCameraOpen=false;stopBingoCameraStream();bingoCameraHost().innerHTML='';
  if(was&&history.state?.bingoCamera){bingoPopIgnore=true;history.back()}
}
async function startBingoStream(facing){
  stopBingoCameraStream();
  const attempts=[{video:{facingMode:{exact:facing}},audio:false},{video:{facingMode:{ideal:facing}},audio:false},{video:true,audio:false}];
  let lastError;
  for(const constraints of attempts){try{bingoCameraStream=await navigator.mediaDevices.getUserMedia(constraints);return}catch(error){lastError=error}}
  throw lastError;
}
async function openBingoCamera(facing='environment'){
  if(!bingoCameraOpen){history.pushState({bingoCamera:true},'');bingoCameraOpen=true}
  bingoCameraHost().innerHTML=`<div class="bingo-camera" role="dialog" aria-modal="true" aria-label="צילום"><video id="bingo-video" playsinline muted autoplay></video><div class="bingo-camera-bar"><button class="bingo-camera-btn" data-camera="cancel">ביטול</button><button class="bingo-shutter" data-camera="shoot" aria-label="צילום"></button><button class="bingo-camera-btn" data-camera="flip" data-facing="${facing}">הפיכת מצלמה</button></div></div>`;
  try{
    await startBingoStream(facing);
    const video=document.querySelector('#bingo-video');video.srcObject=bingoCameraStream;await video.play();
  }catch(error){
    // no camera access: close the viewfinder and hand over to the device's own camera picker
    closeBingoCamera();notify('אין גישה למצלמה באפליקציה — נפתחת מצלמת המכשיר.',3500);
    const input=document.querySelector('#bingo-file');if(input){input.value='';input.click()}
  }
}
function startBingoCapture(){
  if(navigator.mediaDevices?.getUserMedia)openBingoCamera();
  else{const input=document.querySelector('#bingo-file');input.value='';input.click()}
}
async function shootBingoPhoto(){
  const video=document.querySelector('#bingo-video');
  if(!video||!video.videoWidth)return;
  const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
  closeBingoCamera();
  if(blob)await bingoStorePhoto(new File([blob],'camera.jpg',{type:'image/jpeg'}),true);
}
addEventListener('click',event=>{
  const button=event.target.closest?.('[data-camera]');if(!button)return;
  if(button.dataset.camera==='cancel'){bingoPending=null;closeBingoCamera()}
  else if(button.dataset.camera==='shoot')shootBingoPhoto();
  else if(button.dataset.camera==='flip')openBingoCamera(button.dataset.facing==='environment'?'user':'environment');
});
// The phone's Back gesture: closes the viewfinder if it is open, else the enlarged photo. A step we took ourselves (closing by button) is ignored.
addEventListener('popstate',()=>{
  if(bingoPopIgnore){bingoPopIgnore=false;return}
  if(bingoCameraOpen){bingoCameraOpen=false;bingoPending=null;stopBingoCameraStream();bingoCameraHost().innerHTML='';return}
  if(bingoViewing){bingoViewing=null;render()}
});
async function bingoPhotoChosen(input){const file=input.files?.[0];input.value='';await bingoStorePhoto(file,false)}
// `ready`: the photo already came out of the viewfinder at its final size
async function bingoStorePhoto(file,ready){
  const pending=bingoPending;bingoPending=null;
  if(!file||!pending||bingoBusy)return;
  bingoBusy=pending.spotId;render();
  try{
    const small=ready?file:await shrinkImage(file),path=bingoStoragePath(state.trip.id,pending.theme,pending.pid,pending.spotId);
    await putLocalPhoto(path,small);
    const old=bingoPhotoUrls.get(path);if(old)URL.revokeObjectURL(old);
    bingoPhotoUrls.set(path,URL.createObjectURL(small));bingoFailed.delete(path);
    const game=bingoGame(),board=ensureBoard(game,pending.theme,pending.pid),existing=board.found[pending.spotId];
    board.found[pending.spotId]={photoPath:path,foundAt:existing?.foundAt||new Date().toISOString(),pending:true,v:Date.now()};
    game.celebratedLines=game.celebratedLines||{};game.celebratedLines[pending.theme]=game.celebratedLines[pending.theme]||{};
    const celebrated=game.celebratedLines[pending.theme][pending.pid]=game.celebratedLines[pending.theme][pending.pid]||[];
    const fresh=freshCompletions(board,celebrated);celebrated.push(...fresh.keys);
    bingoBusy=null;save();render();
    if(!navigator.onLine)notify('התמונה נשמרה במכשיר ותעלה כשיהיה חיבור.',4000);
    // a completed row / column / board celebrates with the shared winner animation, naming whose board it is
    if(fresh.keys.length)fireWinner({name:state.participants.find(person=>person.id===pending.pid)?.name||'',caption:fresh.caption,big:fresh.big});
    syncBingoPhotos();
  }catch(error){bingoBusy=null;render();notify('שמירת התמונה נכשלה. נסו שוב.',5000)}
}
// Uploads the photos waiting on this device. Runs after every capture, every render and when the connection comes back; a failure just leaves them pending.
async function syncBingoPhotos(){
  if(bingoSyncing||!navigator.onLine||!state.trip||!bingoGame())return;
  if(!pendingPhotos(bingoGame()).length)return;
  bingoSyncing=true;
  try{
    await ensureTripDocSynced(state.trip.id,state.trip);
    const result=await syncPendingPhotos({getGame:bingoGame,getBlob:getLocalPhoto,online:()=>navigator.onLine,save:()=>save(),upload:({theme,participantId,spotId,blob})=>{const location=bingoPhotoLocation(theme,participantId,spotId);return uploadAttachment(state.trip.id,location.sourceId,new File([blob],location.filename,{type:blob.type||'image/jpeg'}))}});
    if(result.uploaded)render();
  }catch(error){console.warn('Bingo photo upload will retry',error)}
  finally{bingoSyncing=false}
}
async function eraseBingoPhoto(){
  const game=bingoGame(),pid=bingoCurrentParticipant(),spotId=bingoViewing,theme=BINGO_THEMES[game?.activeTheme];
  const board=game?.boards?.[game.activeTheme]?.[pid],entry=board?.found?.[spotId];
  if(!theme||!entry)return;
  const label=theme.spots.find(spot=>spot.id===spotId)?.label||'';
  if(!entry.pending&&!navigator.onLine){notify('מחיקת תמונה דורשת חיבור לאינטרנט.');return}
  if(!confirm(`למחוק את התמונה של "${label}"? התמונה תימחק לצמיתות והמשבצת תחזור להיות לא נמצאה.`))return;
  try{if(!entry.pending)await deleteAttachment(entry.photoPath)}catch(error){notify('מחיקת התמונה נכשלה. בדקו את החיבור ונסו שוב.',5000);return}
  await deleteLocalPhoto(entry.photoPath);
  const url=bingoPhotoUrls.get(entry.photoPath);if(url){URL.revokeObjectURL(url);bingoPhotoUrls.delete(entry.photoPath)}
  delete board.found[spotId];closeBingoViewer();
  const celebrated=(game.celebratedLines?.[game.activeTheme]||{});if(celebrated[pid])celebrated[pid]=pruneCelebrated(board,celebrated[pid]);
  save();render();
}
async function resetBingoBoard(){
  const game=bingoGame(),theme=BINGO_THEMES[game?.activeTheme],pid=bingoCurrentParticipant(),person=state.participants.find(candidate=>candidate.id===pid);
  if(!theme||!person)return;
  const board=game.boards?.[game.activeTheme]?.[pid];
  if(Object.values(board?.found||{}).some(entry=>!entry.pending)&&!navigator.onLine){notify('איפוס הלוח דורש חיבור לאינטרנט — התמונות נמחקות גם מהענן.',5000);return}
  if(!confirm(`לאפס את הלוח של ${person.name} ${theme.inLabel}? כל התמונות שצולמו יימחקו לצמיתות.`))return;
  try{
    // Storage first, then the board: a failure part-way leaves the photos that are still there on the board, never orphaned files
    for(const [spotId,entry] of Object.entries(board?.found||{})){
      if(entry?.photoPath&&!entry.pending)await deleteAttachment(entry.photoPath);
      if(entry?.photoPath)await deleteLocalPhoto(entry.photoPath);
      const url=bingoPhotoUrls.get(entry?.photoPath);if(url){URL.revokeObjectURL(url);bingoPhotoUrls.delete(entry.photoPath)}
      delete board.found[spotId];
    }
  }catch(error){save();render();notify('מחיקת התמונות נכשלה. בדקו את החיבור ונסו שוב.',5000);return}
  closeBingoViewer();dropBoard(game,game.activeTheme,pid);save();render();
}
function hydrateBingoPhotos(){
  for(const element of document.querySelectorAll('.bingo-photo[data-photo-path]')){
    const path=element.dataset.photoPath,url=bingoPhotoUrls.get(path);
    if(url){element.style.backgroundImage=`url("${url}")`;element.classList.remove('missing');continue}
    if(bingoFailed.has(path)){element.classList.add('missing');continue}
    if(bingoLoading.has(path))continue;
    bingoLoading.add(path);
    // the copy on this device first (offline play), else Storage -- and keep what was downloaded, so the board opens offline next time
    getLocalPhoto(path).then(async local=>{
      if(local){bingoPhotoUrls.set(path,URL.createObjectURL(local));return}
      if(!navigator.onLine)return;
      const blob=await downloadAttachment(path,'image/jpeg');
      bingoPhotoUrls.set(path,URL.createObjectURL(blob));putLocalPhoto(path,blob);
    }).catch(()=>{bingoFailed.add(path)}).finally(()=>{bingoLoading.delete(path);if(bingoPhotoUrls.has(path)||bingoFailed.has(path))hydrateBingoPhotos();else document.querySelectorAll(`.bingo-photo[data-photo-path="${CSS.escape(path)}"]`).forEach(element=>element.classList.add('missing'))});
  }
  syncBingoPhotos();
}
addEventListener('change',event=>{if(event.target?.id==='bingo-file')bingoPhotoChosen(event.target)});
addEventListener('online',()=>syncBingoPhotos());
addEventListener('keydown',event=>{if(event.key==='Escape'&&bingoViewing){closeBingoViewer();render()}});
// 0.7.4: shared list + personal list per participant, with switching between them (MVP scope's
// own wording). An item with no participantIds is shared; the "shared" view shows only those, and
// a specific participant's view shows their own items PLUS every shared one -- their own personal
// list, not a narrower filter of the shared list.
function visiblePackingItems(list){
  const view=state.packingParticipantView||'shared',items=list.items||[];
  if(view==='shared')return items.filter(item=>!(item.participantIds||[]).length);
  return items.filter(item=>!(item.participantIds||[]).length||(item.participantIds||[]).includes(view));
}
// Beta 0.8 Phase 1 (design spec V7 S5), reworked in Phase 1.1 and again in Phase 1.2
// (P11-F14..F17): the participant selection control. Two layouts, chosen from the measured width
// (participant-carousel.js, participantLayout): on a phone -- or whenever everyone does not fit on
// one line -- a carousel; on a wide screen where everyone fits, a plain row of all participants
// side by side (selected highlighted, others faded, no dots, no loop).
// The carousel mounts five options (selected +-2, wrapping at 3+) so a neighbour can slide in from
// off-screen; the outer two are clipped and hidden from assistive tech. A drag, tap or arrow key
// selects exactly one neighbour: the track slides one position (160-220ms ease-out, skipped under
// prefers-reduced-motion), and only when it lands is the screen re-rendered -- render() rebuilds
// the DOM, which would otherwise kill the transition. Dots up to 6 options, a "4 / 9" counter above.
// data-pos (prev/selected/next) is what the pointer and keydown delegates act on.
function packingParticipantCount(){return 1+state.participants.filter(participant=>participant.active!==false).length}
function currentParticipantLayout(count){
  return participantLayout({count,viewportWidth:window.innerWidth,availableWidth:Math.min(window.innerWidth,1080)-74});
}
let lastParticipantLayout=null;
function participantCarousel(options,selectedValue,action,scope='packing'){
  const count=options.length,index=Math.max(0,options.findIndex(([value])=>value===selectedValue));
  const layout=currentParticipantLayout(count);lastParticipantLayout=layout;
  const items=carouselSlots(count,index,layout).map(({optionIndex,pos,hidden})=>{
    const [value,label]=options[optionIndex];
    return `<button class="p-carousel-item ${pos}" role="option" aria-selected="${pos==='selected'}" ${hidden?'aria-hidden="true" tabindex="-1"':''} data-action="${action}" data-participant="${value}" data-pos="${pos}"><span class="p-carousel-avatar">${esc(label.slice(0,1))}</span><span>${esc(label)}</span></button>`;
  }).join('');
  const indicator=layout==='row'?null:positionIndicator(count,index);
  const indicatorHtml=!indicator?'':indicator.kind==='counter'?`<div class="p-carousel-counter" aria-live="polite"><bdi dir="ltr">${indicator.text}</bdi></div>`:`<div class="p-carousel-dots">${options.map((option,position)=>`<span class="${position===index?'active':''}"></span>`).join('')}</div>`;
  return `<div class="p-carousel ${layout==='row'?'p-row':''}" data-carousel data-scope="${scope}" data-layout="${layout}" data-count="${count}"><div class="p-carousel-viewport"><div class="p-carousel-track" role="listbox" aria-label="בחירת משתתף">${items}</div></div>${indicatorHtml}</div>`;
}
const prefersReducedMotion=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
let participantBusy=false;
function commitParticipant(value,refocus,scope='packing'){
  participantBusy=false;if(scope==='bingo')bingoParticipant=value;else state.packingParticipantView=value;render();
  // P11-F15: every selection re-renders, which drops focus to <body>; put it back on the selected
  // item so the arrow keys keep working after a click, a tap or a previous arrow press.
  if(refocus)document.querySelector('.p-carousel-item.selected')?.focus({preventScroll:true});
}
// Centers, not left edges: the faded neighbours are scaled to .88 about their centers, which skews the
// left-edge distance by a few pixels and would make the committed render jump after the slide.
const centerX=element=>{const rect=element.getBoundingClientRect();return rect.left+rect.width/2};
function carouselSlotPx(carousel){
  const items=[...carousel.querySelectorAll('.p-carousel-item')];
  const selected=items.find(item=>item.dataset.pos==='selected'),neighbour=items.find(item=>item.dataset.pos==='next')||items.find(item=>item.dataset.pos==='prev');
  return selected&&neighbour?Math.abs(centerX(selected)-centerX(neighbour)):0;
}
function selectParticipant(carousel,value){
  const scope=carousel?.dataset.scope||'packing';
  if(participantBusy||value===(scope==='bingo'?bingoCurrentParticipant():(state.packingParticipantView||'shared')))return;
  if(!carousel||prefersReducedMotion()){commitParticipant(value,Boolean(carousel),scope);return}
  const track=carousel.querySelector('.p-carousel-track'),items=[...track.children];
  const selected=items.find(item=>item.dataset.pos==='selected');
  const target=items.find(item=>item.dataset.participant===value&&!item.hasAttribute('aria-hidden'))||items.find(item=>item.dataset.participant===value);
  if(!selected||!target){commitParticipant(value,true,scope);return}
  participantBusy=true;
  // Same classes the final render will have, flipped in place so the CSS opacity/scale transitions run.
  selected.classList.remove('selected');target.classList.add('selected');
  if(carousel.dataset.layout==='carousel'&&Number(carousel.dataset.count)>=3){
    track.style.transition='transform 180ms ease-out';
    track.style.transform=`translateX(${centerX(selected)-centerX(target)}px)`;
  }
  setTimeout(()=>commitParticipant(value,true,scope),190);
}
function packingView(){if(!state.trip)return empty();const activeParticipants=state.participants.filter(participant=>participant.active!==false);const participantOptions=[['shared','משותף'],...activeParticipants.map(participant=>[participant.id,participant.name])];return `<section class="card packing-card"><div class="page-head"><h2>אריזה</h2><button class="btn ghost small-btn" data-action="add-list">${tabler('plus')} קטגוריה</button></div>${!activeParticipants.length?'':participantCarousel(participantOptions,state.packingParticipantView||'shared','packing-view-participant')}${state.packing.map(list=>{const visible=visiblePackingItems(list),active=visible.filter(item=>!item.done),packed=visible.filter(item=>item.done),collapsed=state.packingCollapsed[list.id];const body=!visible.length?'<p class="muted">אין פריטים בקטגוריה</p>':`<div class="progress"><span style="width:${packed.length/visible.length*100}%"></span></div>${active.map(packRow.bind(null,list)).join('')||'<p class="muted">הכול נארז.</p>'}`;return `<section class="card nested"><button class="section-head collapse-button" data-action="pack-collapse" data-list="${list.id}" aria-expanded="${collapsed?'false':'true'}"><h3>${esc(list.name)}</h3>${visible.length?`<span class="badge"><bdi>${packed.length}/${visible.length}</bdi></span>`:''}</button>${collapsed?'':`${body}<button class="add-dashed" data-action="pack-add" data-list="${list.id}">+ הוספת פריט</button>${packed.length?`<details ${state.packedCollapsed?'':'open'}><summary>נארזו (${packed.length})</summary>${packed.map(packRow.bind(null,list)).join('')}</details>`:''}`}</section>`}).join('')}</section>`}
function packRow(list,item){const viewerId=state.packingParticipantView&&state.packingParticipantView!=='shared'?state.packingParticipantView:'';const label=participantChipLabel(item.participantIds,state.participants,item.participantScope,{viewerId})||(item.owner&&item.owner!=='shared'?item.owner:'');return `<article class="task-compact ${item.done?'done':''}"><input type="checkbox" data-action="pack-toggle" data-list="${list.id}" data-item="${item.id}" aria-label="סימון פריט" ${item.done?'checked':''}><button class="task-compact-main" data-action="pack-edit" data-list="${list.id}" data-item="${item.id}"><span class="row-line"><b>${esc(item.name)}</b>${label?`<span class="badge chip-participants">${esc(label)}</span>`:''}</span></button></article>`}
// 0.7.1: priority + due-date-scope filters, combined with AND, plus a clear/reset action -- see
// filterAndSortTasks (operational-data.js) for the actual filter/sort logic, shared with nothing
// else so this view's own filter state (state.taskFilters) is the only thing driving it. The
// reset button only appears once a filter is actually active, mirroring this app's existing
// "don't show a no-op control" convention elsewhere (e.g. the overflow-link buttons above).
const TASK_DUE_LABELS={overdue:'באיחור',today:'היום',upcoming:'בקרוב',undated:'ללא תאריך'};
function tasksView(){
  const filters=state.taskFilters||{priority:'all',due:'all',status:'all',participant:'all'};
  const priorityOptions=[['all','כל העדיפויות'],['High','גבוהה'],['Normal','רגילה'],['Low','נמוכה']];
  const dueOptions=[['all','כל התאריכים'],...TASK_DUE_SCOPES.map(scope=>[scope,TASK_DUE_LABELS[scope]])];
  const statusOptions=[['all','כל המשימות'],['open','משימות פתוחות בלבד']];
  const filtered=filterAndSortTasks(state.tasks,filters);
  // P3-F5: done tasks leave the working list for a "הושלמו (N)" section at the bottom, as Packing does.
  const openTasks=filtered.filter(task=>!task.done),doneTasks=filtered.filter(task=>task.done);
  const isFiltered=filters.priority!=='all'||filters.due!=='all'||(filters.status||'all')!=='all'||(filters.participant||'all')!=='all';
  // 0.7.9 correction round 3 (Finding 3): a fourth filter alongside the existing three, same
  // <select>-based pattern, not a separate view-switcher like packing's own participant tabs --
  // only rendered when the Trip actually has participants, matching every other participant
  // picker's own gating throughout this codebase.
  const participantFilter=state.participants.length?`<label class="field filter-wide"><span>משתתף</span><select id="task-filter-participant"><option value="all" ${(filters.participant||'all')==='all'?'selected':''}>כל המשתתפים</option>${state.participants.map(participant=>`<option value="${participant.id}" ${filters.participant===participant.id?'selected':''}>${esc(participant.name)}</option>`).join('')}</select></label>`:'';
  return `<section class="card"><div class="page-head"><h2>משימות</h2><button class="btn ghost small-btn" data-action="task-add">${tabler('plus')} משימה חדשה</button></div><div class="task-filters"><label class="field"><span>עדיפות</span><select id="task-filter-priority">${priorityOptions.map(([value,label])=>`<option value="${value}" ${filters.priority===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>תאריך יעד</span><select id="task-filter-due">${dueOptions.map(([value,label])=>`<option value="${value}" ${filters.due===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>סטטוס</span><select id="task-filter-status">${statusOptions.map(([value,label])=>`<option value="${value}" ${(filters.status||'all')===value?'selected':''}>${label}</option>`).join('')}</select></label>${participantFilter}${isFiltered?'<button class="btn ghost filters-reset" data-action="task-filter-clear">איפוס</button>':''}</div><div class="list">${filtered.length?`${openTasks.map(taskRow).join('')||'<p class="muted">אין משימות פתוחות.</p>'}${doneTasks.length?`<div class="tasks-done"><button class="tasks-done-head" type="button" data-action="tasks-done-toggle" aria-expanded="${!state.tasksDoneCollapsed}"><i class="disc ${state.tasksDoneCollapsed?'closed':'open'}" aria-hidden="true"></i><span>הושלמו (${doneTasks.length})</span></button>${state.tasksDoneCollapsed?'':`<div class="list">${doneTasks.map(taskRow).join('')}</div>`}</div>`:''}`:`${state.tasks.length?emptyState('checklist','אין משימות תואמות','נסו לשנות או לאפס את הסינון.'):emptyState('checklist','אין משימות','הוסיפו משימה כדי להתחיל.')}`}</div></section>`;
}
// 0.7.9 correction (V7-F10, Test 4): owner is no longer displayed -- Product Owner decision to
// remove it in favor of participantAssignmentLabel(task) alone (reuses the exact function Items'
// own detailView() already calls, generic over any object carrying participantScope/
// participantIds). An already-existing task's own stored owner value, if any, simply goes
// unread here -- not deleted from Firestore, just no longer shown (see the task-form modal's own
// comment for the same non-destructive reasoning).
// Beta 0.8 Phase 1.2 (P11-F13): ~56px rows -- checkbox, title, one meta line with the inline priority
// chip. Tapping the row opens the task for editing; the delete button moved INSIDE the edit screen
// (it was a red button on every row, easy to mis-tap on a phone). This deliberately reverses the
// 0.7.9 decision to show a delete button on each task row; equipment rows (packRow) keep theirs.
function taskRow(task){const overdue=isTaskOverdue(task);const priorityLabel={High:'גבוהה',Normal:'רגילה',Low:'נמוכה'}[task.priority]||'רגילה';const participantLabel=participantChipLabel(task.participantIds,state.participants,task.participantScope);const linkButton=task.link?`<a class="task-link" href="${esc(task.link)}" target="_blank" rel="noopener" aria-label="פתיחת הקישור של המשימה">${tabler('link')}</a>`:'';return `<article class="task-compact ${task.done?'done':''} ${overdue?'overdue':''}"><input type="checkbox" data-action="task-toggle" data-id="${task.id}" aria-label="סימון משימה" ${task.done?'checked':''}><button class="task-compact-main" data-action="task-edit" data-id="${task.id}"><span class="row-line"><b>${esc(task.title)}</b>${participantLabel?`<span class="badge chip-participants">${esc(participantLabel)}</span>`:''}</span><small class="muted task-meta"><span class="badge priority-${task.priority||'Normal'}">${priorityLabel}</span><span class="task-meta-text">${overdue?`<span class="overdue-flag">${tabler('clock')} באיחור</span> · `:''}${task.mode==='entire'?'לכל הטיול':task.mode==='none'?'ללא תאריך':task.dueDate?fmt(task.dueDate,false):'ללא תאריך'}</span>${task.notes?`<span class="task-note-icon" title="יש הערות" aria-label="יש הערות">${tabler('notes')}</span>`:''}</small></button>${linkButton}</article>`}
// 0.7.7: shopping places/visits render directly inside this same view (via itemRow, the exact
// generic row every Trip Center category page already uses) rather than a separate Trip Center
// tile -- see visibleTypes' own comment above for why. A place may be undated (schedule:'none',
// shown with no date) or dated (schedule:'single', projected into Timeline/Calendar too, exactly
// like any other single-date item type) -- both render here identically via itemRow either way.
// 0.7.7.1 (Test 1, found live): a shopping-list row now gets an edit button alongside its
// checkbox, mirroring packRow's own .pack-row-wrapper (label + sibling button, not a button
// nested inside the label -- avoids any ambiguity over which one a click inside the label
// activates). Reused directly, not a new class -- purely a generic flex-row layout, not
// packing-specific despite the name.
// Beta 0.8 Phase 3 (P2-F8): the same compact tap-to-edit row Packing and Tasks use -- checkbox, name and the owner as a
// chip on ONE line (name wraps to two lines, chip stays whole), one muted line below for the linked need and the place.
function shoppingRow(item,placeById){
  const place=item.placeId?placeById.get(item.placeId):null;
  const shared=isSharedShoppingItem(item);
  const meta=[shared?'משותף':'',item.linkedNeed?esc(item.linkedNeed):'',place?`${tabler('pin')} ${esc(place.title)}`:''].filter(Boolean).join(' · ');
  return `<article class="task-compact ${item.purchased?'done':''}"><input type="checkbox" data-action="shopping-toggle" data-id="${item.id}" aria-label="סימון פריט" ${item.purchased?'checked':''}><button class="task-compact-main" data-action="shopping-edit" data-id="${item.id}"><span class="row-line"><b>${esc(item.name)} × <bdi>${esc(item.quantity||'1')}</bdi></b>${shared?'':`<span class="badge chip-participants">${esc(shoppingOwnerLabel(item.owner,state.participants))}</span>`}</span>${meta?`<small class="muted task-meta"><span class="task-meta-text">${meta}</span></small>`:''}</button></article>`;
}
// A shopping place: a quiet bordered row (store line icon, name, one muted line, chevron) -- no type badge.
function shoppingPlaceRow(place){
  const when=place.schedule==='entire'?'לכל הטיול':place.schedule==='none'||!place.startAt?'ללא תאריך':fmt(place.startAt,true,place.dateMeta?.startPrecision);
  const where=place.location&&place.location!==place.title?place.location:'';
  return `<button class="row place-row" data-route="detail" data-id="${place.id}"><span class="row-main"><b>${tabler('store')} ${esc(place.title)}</b><small class="muted">${esc(when)}</small>${where?`<small class="muted place-where">${tabler('pin')} ${esc(where)}</small>`:''}</span>${tabler('chevron').replace('class="ti"','class="ti icon-directional row-chevron"')}</button>`;
}
// "מקום חדש" and "פריט חדש": identical header rows -- an h3 and the same-size outline "+" button, centred together.
const shoppingHead=(title,action,label)=>`<div class="section-head shop-head"><h3>${title}</h3><button class="btn ghost small-btn" data-action="${action}">${tabler('plus')} ${label}</button></div>`;
// P22-F9: an owner filter and a place filter, combinable, each defaulting to "הכול", with a visible match count.
function shoppingFilters(places,matchCount){
  const filters={owner:'all',place:'all',...state.shoppingFilters},total=state.shopping.length;
  const owners=state.participants.filter(participant=>participant.active!==false);
  const isFiltered=filters.owner!=='all'||filters.place!=='all';
  const option=(value,label,current)=>`<option value="${esc(value)}" ${current===value?'selected':''}>${esc(label)}</option>`;
  return `<div class="shopping-filters"><label class="field"><span>בעלים</span><select id="shopping-filter-owner">${option('all','הכול',filters.owner)}${option('shared','משותף',filters.owner)}${owners.map(participant=>option(participant.name,participant.name,filters.owner)).join('')}</select></label><label class="field"><span>מקום</span><select id="shopping-filter-place">${option('all','הכול',filters.place)}${places.map(place=>option(place.id,place.title,filters.place)).join('')}${option('none','ללא מקום',filters.place)}</select></label></div><p class="muted small shopping-count" aria-live="polite">${isFiltered?`${matchCount} מתוך ${total} פריטים`:`${total} פריטים`}${isFiltered?' <button class="link-btn" data-action="shopping-filter-clear">איפוס</button>':''}</p>`;
}
function shoppingView(){
  const places=sortItemsByStartAt(state.items.filter(item=>item.type==='shoppingPlace'));
  const placeById=new Map(places.map(place=>[place.id,place]));
  // 0.7.7.1 (Test 1, found live): mirrors packingView's own active/packed split exactly -- a
  // purchased item moves into a collapsed-by-default <details> section (state.shoppingPurchasedCollapsed,
  // same defaulting as packedCollapsed) instead of staying inline, still shown, still re-toggleable.
  const matching=filterShoppingItems(state.shopping,state.shoppingFilters);
  const active=matching.filter(item=>!item.purchased),purchased=matching.filter(item=>item.purchased);
  return `<section class="card"><div class="page-head"><h2>קניות</h2></div>${shoppingHead('מקומות קניות','shopping-place-add','מקום חדש')}<div class="list">${places.length?places.map(shoppingPlaceRow).join(''):emptyState('store','אין מקומות קניות','הוסיפו חנות או שוק שתרצו לבקר בהם.')}</div>${shoppingHead('רשימת קניות','shopping-add','פריט חדש')}${shoppingFilters(places,matching.length)}<div class="list">${active.length?active.map(item=>shoppingRow(item,placeById)).join(''):`${state.shopping.length?emptyState('cart','אין פריטים תואמים','נסו לשנות או לאפס את הסינון.'):emptyState('cart','אין פריטי קניות','הוסיפו את מה שצריך לקנות לטיול.')}`}</div>${purchased.length?`<details ${state.shoppingPurchasedCollapsed?'':'open'}><summary>נרכש (${purchased.length})</summary><div class="list">${purchased.map(item=>shoppingRow(item,placeById)).join('')}</div></details>`:''}</section>`;
}
function locationsView(){return `<section class="card"><div class="section-head"><div><h2>${tabler('pin')} מיקומים</h2><p class="muted">חיפוש ואישור מיקום; מפה חיצונית נפתחת במפורש ואינה נכשלת בשקט.</p></div><button class="btn" data-action="location-add">מיקום חדש</button></div>${state.locationRecords.length?state.locationRecords.map(record=>`<article class="row"><span class="row-main"><b>${esc(record.placeName)}</b><small class="muted">${esc(record.address||'')}${record.approved?' · מאושר':' · דורש אישור'}</small></span><a class="btn ghost" href="${mapsUrl(record.coordinates?`${record.coordinates.lat},${record.coordinates.lng}`:record.address||record.placeName)}" target="_blank" rel="noopener">מפה / סיכה</a><button class="btn secondary" data-action="location-approve" data-id="${record.id}">${record.approved?'תיקון':'אישור'}</button></article>`).join(''):emptyState('pin','אין מיקומים שמורים','הוסיפו מיקום כדי לחפש ולאשר אותו.')}</section>`}

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
// V6-F74: a warning backed by a still-live needsReviewRef (isDismissibleWarning returns false --
// this is the ONLY case it does) previously rendered with no action at all, since dismiss is
// deliberately withheld for exactly this shape (see isDismissibleWarning's own comments). Offers
// the missing "confirm this reading as correct, no value change needed" action instead of a plain
// dismiss, wired to confirmNeedsReviewField (ingestion.js) via the same scope/id convention
// resolve-merge-candidate already uses.
function warningRow(warning,details,scope,id,index){
  const dismissible=isDismissibleWarning(warning,details);
  const ref=!dismissible&&typeof warning==='object'&&warning!==null?warning.needsReviewRef:null;
  const action=dismissible?`<button class="link-button" type="button" data-action="${scope==='item'?'dismiss-item-warning':'dismiss-warning'}" data-id="${id}" data-index="${index}">התעלמות</button>`:ref?`<button class="link-button" type="button" data-action="confirm-needs-review" data-scope="${scope}" data-id="${id}" data-key="${esc(ref.key)}" data-value="${esc(String(ref.value))}">אישור כנכון</button><button class="link-button" type="button" data-action="needs-review-edit" data-scope="${scope}" data-id="${id}" data-key="${esc(ref.key)}">לא נכון — לתקן</button>`:'';
  return `<div class="warning-row"><span>${tabler('alert')} ${esc(warningText(warning))}</span>${action}</div>`;
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
  // Beta 0.8 Phase 2: each conflicting field now offers both outcomes as ONE-click buttons -- "use the new
  // value" applies it and clears the warning in one step; "keep the saved value" dismisses without changing.
  // (The old radio pair needed the reader to discover that selecting a radio was itself the action.)
  return Object.entries(candidates).map(([key,value])=>{
    const label=MERGE_CANDIDATE_LABELS[key]||key,attrs=`data-action="resolve-merge-candidate" data-scope="${scope}" data-id="${id}" data-key="${key}"`;
    return `<div class="merge-conflict" role="group" aria-label="${esc(label)}"><p><b>התגלה ערך חדש עבור ${esc(label)}</b></p><dl class="merge-compare"><div><dt>הערך השמור</dt><dd>${esc(String(current?.[key]??''))||'—'}</dd></div><div><dt>הערך החדש</dt><dd>${esc(String(value))}</dd></div></dl><div class="actions"><button class="btn" type="button" ${attrs} data-choice="accept">שימוש בערך החדש</button><button class="btn ghost" type="button" ${attrs} data-choice="keep">השארת הערך השמור</button></div></div>`;
  }).join('');
}
// 0.6.7: computed lookup, mirroring the existing linkedItems-via-shared-sourceIds pattern
// (findPossibleDuplicates, ingestion.js) rather than a stored field on every other item type --
// scans the trip's own insurance items for every one whose relatedItemIds includes this item's id.
// 0.7.4 (V6-F82): an item can genuinely be covered by more than one policy (e.g. a standalone
// travel-medical policy plus a separate gear/equipment policy on the same Activity) -- returning
// only the first (the original .find()) silently hid every additional one from the reverse-lookup.
function insuranceCoveringItems(item){return state.items.filter(candidate=>candidate.type==='insurance'&&(candidate.relatedItemIds||[]).includes(item.id))}
// 0.7.7.1 (Test 6, found live): the list-entry-to-place direction (shoppingView's own placeById
// lookup) already worked, but a shopping place's own detail view had no reverse lookup at all --
// mirrors insuranceCoveringItems() above exactly, one level simpler since a shopping-list entry
// isn't independently routable (no detail page of its own), so plain rows suffice, not buttons.
function linkedShoppingListEntries(item){return state.shopping.filter(entry=>entry.placeId===item.id)}
// 0.7.4: item-level participant assignment display, and the swipe/step-through-tickets scope
// simplified to a plain vertical list -- no carousel/swipe-gesture library or infrastructure
// exists anywhere in this codebase, and building one from scratch is disproportionate to what this
// section actually needs to prove (per-ticket used/not-used state, which participants remain,
// barcode/QR "display when available" as the code's own text value, not a rendered scannable
// graphic -- generating real barcode/QR images needs a new library this app doesn't have either).
function participantAssignmentLabel(item){
  if(item.participantScope==='all')return 'כל המשתתפים';
  if(item.participantScope==='specific'){const names=(item.participantIds||[]).map(id=>state.participants.find(p=>p.id===id)?.name).filter(Boolean);if(names.length)return names.join(', ')}
  return '';
}
// Tickets and passes (MVP scope: "For attractions, flights, transport, and events") -- mapped to
// this app's own type set: activity (covers both attraction and event), flight, car (Transport,
// per this candidate's own broadened first-class Transport decision above).
// 0.7.9 correction round 3 (Finding 2, Product Owner design decision): ticket coverage is now
// document-driven -- confirming a linked document as ticket coverage (sourceRow's own "אישור
// ככיסוי כרטיס" button/badge/used-toggle, added above) is the ONLY place a document's own ticket
// status lives. This section is deliberately reduced to nothing more than the aggregate
// "participants still without a ticket" line the Product Owner explicitly asked for -- it does
// NOT re-list which document covers whom (that already lives on the document's own row, once,
// per the Product Owner's own explicit instruction not to duplicate it a second time). The old
// manual "add a ticket" flow and item.tickets[] are fully retired: rounds 1-3's item.tickets[]
// entries were test data on the QA Test Trip only (0.7.9 has never reached Production), so
// nothing real is lost by no longer reading that field.
// Beta 0.8 Phase 2 (P12-F5, V7-F15, V7-F16): ONE section for everything ticket-related on a flight /
// activity / transport item, in four clearly separate pieces instead of an undifferentiated list:
//   1. coverage        -- which participants hold a confirmed ticket (derived, never typed)
//   2. confirmation    -- documents offered as ticket coverage, confirmed ones with "used" and an undo
//   3. holders         -- the per-ticket-holder / passenger detail Smart Import read from the document
//   4. linked documents -- name, status, open/remove (sourceRow)
// V7-F15 merges what used to be two visually separate areas (the holder/passenger table above, the
// document list below) into this one. The section's id stays "item-tickets": Today's "כרטיסים" action
// scrolls to it.
// Beta 0.8 Phase 2.1 (P2-F4, approved mockup docs/design/mockups/P2-F4_*): ONE "כרטיסים ומסמכים" card replaces
// Phase 2's four-piece section -- (1) a coverage summary, (2) the ticket documents: a carousel (2 or more), a single
// card (exactly 1), or nothing, (3) every OTHER document in "מסמכים נוספים", (4) "הוספת מסמך". A ticket document is
// one linked to a participant, confirmed or not yet confirmed (ticket-card.js, partitionItemDocuments), so each
// document appears exactly once in the whole card. The carousel follows the participant carousel's mechanics
// (spec S5): one swipe = one ticket, loops from 3, 180ms ease-out slide, the neighbour peeks, arrow keys follow
// screen position, reduced motion skips the animation.
const TICKET_TYPES=TICKET_ITEM_TYPES;
function ticketCoverage(item,sources){return computeTicketCoverage(sources,state.participants)}
const ticketIndex={};
let extraOpenFor=null;
let participantDeleteArmed=null; // P12-F3: the participant whose delete confirmation is open // P22-F4: which item's "פרטים נוספים" is open -- closed every time a page opens (route() resets it)
let ticketBusy=false;
const TICKET_STRIDE='(100cqw + 12px)';
function sourceOpenControl(source,cls='btn secondary'){
  const available=source.kind==='link'||source.storedOffline;
  return source.kind==='link'?`<a class="${cls}" href="${esc(source.url)}" target="_blank" rel="noopener">פתיחה</a>`:available?`<button class="${cls}" type="button" data-action="open-source" data-id="${source.id}">פתיחה</button>`:'';
}
function moreMenu(items){
  return `<button class="btn secondary more" type="button" data-action="more-menu" aria-haspopup="menu" aria-expanded="false" aria-label="פעולות נוספות">${tabler('dots')}</button><template>${items.join('')}</template>`;
}
// Beta 0.8 Phase 2.2 (P21-F11): the menu used to live inside the slide, so the card's and the carousel's overflow clipped it. It is
// now ONE element appended to <body>, positioned from the button's own rectangle (below it, or above when there is no room),
// so nothing can clip it; it closes on any other tap, scroll, resize or Escape.
function closeMoreMenu(){
  document.querySelector('#more-menu')?.remove();
  document.querySelectorAll('[data-action="more-menu"][aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
}
function openMoreMenu(button){
  const wasOpen=button.getAttribute('aria-expanded')==='true';
  closeMoreMenu();
  const template=button.nextElementSibling;
  if(wasOpen||!template)return;
  const menu=document.createElement('div');
  menu.id='more-menu';menu.className='t-menu';menu.setAttribute('role','menu');menu.innerHTML=template.innerHTML;
  document.body.appendChild(menu);
  const anchor=button.getBoundingClientRect(),box=menu.getBoundingClientRect();
  const fitsBelow=anchor.bottom+6+box.height<=window.innerHeight-8;
  menu.style.top=`${Math.max(8,fitsBelow?anchor.bottom+6:anchor.top-6-box.height)}px`;
  menu.style.left=`${Math.min(Math.max(8,anchor.left),window.innerWidth-box.width-8)}px`;
  button.setAttribute('aria-expanded','true');
}
// P3-F14: the permanent delete ("source-delete") is set apart -- a divider above it, terracotta text and a bin.
const menuButton=(action,source,label,itemId)=>{
  const danger=action==='source-delete';
  return `${danger?'<div class="t-menu-sep" role="separator"></div>':''}<button class="t-menu-item${danger?' danger':''}" type="button" data-action="${action}" data-id="${source.id}"${itemId?` data-item-id="${itemId}"`:''}>${danger?tabler('trash'):''}${label}</button>`;
};
function ticketSlideHtml(item,source,{pos='single',hidden=false}={}){
  const confirmed=Boolean(source.ticketConfirmed);
  const people=(source.participantIds||[]).map(id=>state.participants.find(participant=>participant.id===id)).filter(Boolean);
  const holder=ticketHolderLabel(people)||participantName((source.participantIds||[])[0])||'משתתף';
  const detail=ticketHolderDetail(item,people.map(person=>person.name));
  const menu=[confirmed?menuButton('source-unconfirm-ticket',source,'ביטול אישור'):'',menuButton('source-edit-participants',source,'שיוך'),menuButton('source-unlink',source,'הסרה',item.id),canDeleteSource(source,'')?menuButton('source-delete',source,'מחק'):''].join('');
  return `<article class="ticket ${pos}" data-pos="${pos}"${hidden?' aria-hidden="true" inert':''}><div class="ticket-head"><span class="holder">${esc(holder)}</span><span class="chip ${confirmed?'ok':'no'}">${confirmed?'כרטיס מאושר':'לא אושר ככרטיס'}</span></div>${detail?`<div class="ticket-detail">${esc(detail)}</div>`:''}<bdi class="file">${esc(source.name||source.url||'מסמך')}</bdi><div class="ticket-actions">${confirmed?`<label class="used"><input type="checkbox" data-action="source-ticket-toggle-used" data-id="${source.id}" ${source.ticketUsed?'checked':''}> נוצל</label>`:`<button class="btn primary" type="button" data-action="source-confirm-ticket" data-id="${source.id}" aria-label="אישור ככרטיס">${tabler('check')} אישור</button>`}${sourceOpenControl(source)}${moreMenu([menu])}</div></article>`;
}
function ticketCarousel(item,tickets){
  const count=tickets.length;
  if(count===1)return `<div class="ticket-single">${ticketSlideHtml(item,tickets[0],{pos:'single'})}</div>`;
  const index=Math.min(ticketIndex[item.id]||0,count-1);
  const slots=carouselSlots(count,index,'carousel'),before=slots.findIndex(slot=>slot.pos==='selected');
  const slides=slots.map(({optionIndex,pos,hidden})=>ticketSlideHtml(item,tickets[optionIndex],{pos,hidden})).join('');
  const dots=count<=COUNTER_ABOVE?`<span class="t-dots-row" aria-hidden="true">${tickets.map((ticket,position)=>`<i class="${position===index?'on':''}"></i>`).join('')}</span>`:'';
  return `<div class="t-carousel" data-tcarousel data-item="${item.id}" data-count="${count}" data-before="${before}"><div class="t-viewport" tabindex="0" role="group" aria-roledescription="carousel" aria-label="כרטיסים"><div class="t-track" style="--before:${before}">${slides}</div></div><div class="t-dots">${dots}<bdi class="muted" dir="ltr" aria-live="polite">${index+1} / ${count}</bdi></div></div>`;
}
// One swipe, key press or tap moves exactly one ticket. The track slides one stride (180ms ease-out), and only when it
// lands is the card re-rendered -- render() rebuilds the DOM, which would otherwise kill the transition.
function selectTicket(carousel,direction){
  if(ticketBusy||!carousel)return;
  const itemId=carousel.dataset.item,count=Number(carousel.dataset.count),before=Number(carousel.dataset.before),current=ticketIndex[itemId]||0;
  const step=direction==='next'?1:-1,target=count>=3?(current+step+count)%count:current+step;
  if(target<0||target>=count)return;
  const commit=()=>{ticketBusy=false;ticketIndex[itemId]=target;render();document.querySelector(`[data-tcarousel][data-item="${itemId}"] .t-viewport`)?.focus({preventScroll:true})};
  if(prefersReducedMotion()){commit();return}
  ticketBusy=true;
  const track=carousel.querySelector('.t-track');
  track.style.transition='transform 180ms ease-out';
  track.style.transform=`translateX(calc(${before+step} * ${TICKET_STRIDE}))`;
  setTimeout(commit,190);
}
function ticketSummaryBlock(item,sources){
  const summary=coverageSummary(ticketCoverage(item,sources));
  if(!summary.total)return '';
  return `<div class="ticket-summary"><div class="summary-row" aria-label="${summary.covered} מתוך ${summary.total} משתתפים עם כרטיס"><b>כרטיסים: <bdi dir="ltr">${summary.covered}/${summary.total}</bdi></b></div>${summary.missing.length?`<div class="muted">ללא כרטיס: ${esc(summary.missing.join(', '))}</div>`:''}</div>`;
}
// Beta 0.8 Phase 2.3 (P22-F4, approved mockup docs/design/mockups/P22-F4_*): the activity details the removed "פרטי הכרטיס" card
// used to carry -- meeting point (a map link), duration, price, age limit, what is / is not included, ticket quantity -- come back
// as ONE collapsed row inside the tickets card. Only rows that have a value are listed; none -> no row at all; closed whenever the
// page opens. No ticket / holder information goes in here (that lives only on the slides).
function additionalDetailsBlock(item){
  if(item.type!=='activity')return '';
  const rows=additionalDetails(item.details);
  if(!rows.length)return '';
  const open=extraOpenFor===item.id,count=rows.length===1?'פרט אחד':`${rows.length} פרטים`;
  const body=open?`<dl class="extra-facts">${rows.map(row=>`<div class="fact"><dt>${row.label}</dt><dd>${row.map?`<a class="fact-link fact-underline" href="${esc(mapsUrl(row.value))}" target="_blank" rel="noopener">${tabler('pin')} <bdi>${esc(row.value)}</bdi></a>`:`<bdi>${esc(row.value)}</bdi>`}${row.notIncluded?`<div class="muted small">לא כלול: ${esc(row.notIncluded)}</div>`:''}</dd></div>`).join('')}</dl>`:'';
  return `<div class="extra ${open?'open':''}"><button class="extra-head" type="button" data-action="extra-toggle" data-id="${item.id}" aria-expanded="${open}">${tabler('info')}<span class="extra-title">פרטים נוספים</span><span class="muted extra-count">${count}</span>${tabler(open?'chevup':'chevdown')}</button>${body}</div>`;
}
// A document that is not a ticket for a participant: compact row -- icon, name, open, "⋯" -- with the Smart Import
// status pill (queued / processing / failed / attached) underneath when there is one. Like the Documents list, a Failed row's
// "נסה שוב" and "מחק" live in the "⋯" menu (0.8.2), never beside the pill.
function otherDocRow(source,itemId){
  const stateName=sourceImportState(source,{flashAttached:attachedFlash.has(source.id)});
  const canRetry=source.kind!=='link'&&source.storedOffline&&(['saved_only','failed'].includes(source.processingState)||stateName==='failed');
  const pill=stateName?`<span class="doc-status"${stateName==='attached'?` data-flash-source="${source.id}"`:''}>${importStatusPill(stateName)}</span>`:'';
  const names=(source.participantIds||[]).map(participantName).filter(Boolean);
  const menu=[canRetry&&stateName==='failed'?menuButton('analyze-source',source,'נסה שוב'):'',state.participants.length?menuButton('source-edit-participants',source,'שיוך למשתתף'):'',canRetry&&stateName!=='failed'?menuButton('analyze-source',source,'ניתוח חכם'):'',menuButton('source-unlink',source,'הסרה',itemId),canDeleteSource(source,'')?menuButton('source-delete',source,'מחק'):''].join('');
  const unavailable=source.kind==='link'||source.storedOffline?'':'<span class="muted small">הקובץ אינו זמין אופליין</span>';
  return `<div class="doc"><span class="doc-icon">${typeIcon(source.kind==='link'?'link':'document')}</span><span class="doc-name"><bdi>${esc(source.name||source.url)}</bdi>${names.length?`<small class="muted">${esc(names.join(', '))}</small>`:''}${unavailable}</span>${sourceOpenControl(source)}${moreMenu([menu])}${pill}</div>`;
}
function ticketsAndDocumentsSection(item,sources){
  const eligible=TICKET_TYPES.includes(item.type);
  const {tickets,others}=partitionItemDocuments(item.type,sources);
  const canAttach=['hotel','flight','activity','insurance','car'].includes(item.type);
  const heading=eligible?'כרטיסים ומסמכים':'מסמכים';
  const hint=eligible&&!tickets.length&&others.length&&state.participants.length?'<p class="muted small">כדי לאשר כרטיס, שייכו מסמך למשתתף (⋯ ← שיוך למשתתף).</p>':'';
  const list=others.length?`<div class="docs"><span class="muted">${eligible?'מסמכים נוספים':'מסמכים מצורפים'}</span>${others.map(source=>otherDocRow(source,item.id)).join('')}</div>`:!tickets.length?'<p class="muted">אין מסמכים מצורפים.</p>':'';
  return `<section class="card nested item-tickets" ${eligible?'id="item-tickets"':'id="item-documents"'}><h3>${heading}</h3>${eligible?ticketSummaryBlock(item,sources):''}${tickets.length?ticketCarousel(item,tickets):''}${hint}${list}${additionalDetailsBlock(item)}${canAttach?'<button class="add-doc" type="button" data-action="attach-source" data-id="'+item.id+'">+ הוספת מסמך</button>':''}</section>`;
}
// Beta 0.8 Phase 2 (G1) / Phase 2.1 (P2-F4): the item detail page. Order: type/title/facts and contact actions, then
// warnings and the extracted-detail summaries, then the ONE tickets-and-documents card, then the notes, then the page
// actions -- the approved mockup's order (notes sit BELOW the card).
// Beta 0.8 Phase 2.3 (P22-F7): the compact page header -- a small back-arrow icon button (44px, no border) with the type chip on
// the same row where one applies, the title directly below. Every page with a back action builds it here: item pages of every
// type, the category pages, the proposal review screen and the admin screens. There is no "חזרה" button and no "פריטים" label.
// Beta 0.8 Phase 3 (P23-F1): an optional title puts the back arrow, the type icon and the title on ONE line.
function backRow(routeName,category='',chip='',title='',action=''){return `<div class="detail-top${title?' with-title':''}"><button class="icon-btn back-btn" ${action?`data-action="${action}"`:`data-route="${routeName}"${category?` data-cat="${category}"`:''}`} aria-label="חזרה">${tabler('arrow').replace('class="ti"','class="ti icon-directional"')}</button>${title?`<h2 class="detail-title">${title}</h2>`:''}${chip}</div>`}
const detailFact=(label,value)=>value?`<div class="fact"><dt>${label}</dt><dd>${value}</dd></div>`:'';
function locationLabel(item){return item.type==='flight'?flightRouteDeparture(mapSearchLocation(item))||mapSearchLocation(item)||item.location:item.location}
function detailView(){
  const item=state.items.find(candidate=>candidate.id===state.itemId);
  if(!item)return '<section class="card">הפריט לא נמצא.</section>';
  const sources=state.sources.filter(source=>item.sourceIds?.includes(source.id)),place=item.details?.canonicalPlace;
  const navHref=place?place.googleMapsUri||mapsUrl(`${place.latitude},${place.longitude}`):item.location?mapsUrl(mapSearchLocation(item)):'';
  const warningEntries=itemWarningEntries(item);
  const insuredByList=item.type!=='insurance'?insuranceCoveringItems(item):[];
  const linkedShoppingList=item.type==='shoppingPlace'?linkedShoppingListEntries(item):[];
  const detailBadgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label;
  // Beta 0.8 Phase 2.2 (P21-F2/F3): map, website, phone and e-mail are INLINE links on their fact rows, on every item type --
  // the location name itself is the map link; "אתר" sits at the end of the provider row (or its own row when there is no
  // provider); "התקשרות" / "אימייל" are links on their own rows. There are no separate action buttons any more.
  const link=(href,icon,text,extra='')=>`<a class="fact-link ${extra}" href="${esc(href)}"${/^https?:/.test(href)?' target="_blank" rel="noopener"':''}>${tabler(icon)} ${text}</a>`;
  const siteLink=item.website?`<a class="icon-link" href="${esc(item.website)}" target="_blank" rel="noopener" aria-label="אתר">${tabler('world')}</a>`:'';
  const providerRow=item.provider?`<div class="fact"><dt>ספק</dt><dd class="fact-split"><span>${esc(item.provider)}</span>${siteLink}</dd></div>`:'';
  const siteRow=!item.provider&&item.website?detailFact('אתר',siteLink):'';
  const locationRow=item.location?detailFact('מיקום',`${navHref?link(navHref,'pin',esc(locationLabel(item)),'fact-underline'):esc(locationLabel(item))}`):'';
  const facts=[
    providerRow,siteRow,
    detailFact('מספר הזמנה',item.confirmationNumber?`<bdi>${esc(item.confirmationNumber)}</bdi>`:''),
    locationRow,
    item.phone?detailFact('טלפון',link(`tel:${item.phone}`,'phone','התקשרות')):'',
    item.email?detailFact('אימייל',link(`mailto:${item.email}`,'mail','אימייל')):'',
    detailFact('מועד',item.startAt?`<bdi>${fmt(item.startAt,true,item.dateMeta?.startPrecision)}</bdi>`:''),
    detailFact('סיום',item.endAt?`<bdi>${fmt(item.endAt,true,item.dateMeta?.endPrecision)}</bdi>`:''),
    detailFact('משויך ל',participantAssignmentLabel(item)?esc(participantAssignmentLabel(item)):''),
  ].join('');
  // P21-F4: the "פרטי הכרטיס" card (and the folded holder list) is gone -- ticket and holder detail lives only in the ticket card.
  return `<section class="card item-detail ${conflict(item)?'conflict':''}">${backRow('center',item.type,`<span class="badge">${esc(detailBadgeLabel)}</span>`)}<header class="detail-head"><h2>${typeIcon(item.type)} ${esc(item.title)}</h2>${item.endedAt?`<p class="muted">סומן כהסתיים · <button class="btn ghost" data-action="item-unend" data-id="${item.id}">ביטול</button></p>`:''}</header>${facts?`<dl class="detail-facts">${facts}</dl>`:''}${insuredByList.map(policy=>`<button class="row" data-route="detail" data-id="${policy.id}">${typeIcon('insurance')} מבוטח באמצעות ${esc(policy.title)}</button>`).join('')}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,item.details,'item',item.id,index)).join('')}</div>`:''}${mergeCandidatePanel('item',item.id,item,item.details)}${item.type==='flight'?flightSummaryBlock(item.details,{holders:false}):''}${item.type==='insurance'?insuranceSummaryBlock(item.details):''}${item.type==='insurance'?relatedItemsPanel(item):''}${linkedShoppingList.length?`<h3>פריטי קניות מקושרים</h3><div class="list">${linkedShoppingList.map(entry=>`<article class="task-compact ${entry.purchased?'done':''}"><input type="checkbox" data-action="shopping-toggle" data-id="${entry.id}" aria-label="סימון פריט" ${entry.purchased?'checked':''}><button class="task-compact-main" data-action="shopping-edit" data-id="${entry.id}"><b>${esc(entry.name)} × ${esc(entry.quantity||'1')}</b></button></article>`).join('')}</div>`:''}${ticketsAndDocumentsSection(item,sources)}${item.notes?`<div class="detail-notes"><h4>הערות</h4><p class="preserve-lines">${esc(item.notes)}</p></div>`:''}<div class="form-actions detail-actions"><button class="btn secondary" data-action="edit-item" data-id="${item.id}">עריכה</button><button class="btn danger" data-action="delete-item" data-id="${item.id}">מחיקה</button></div></section>`;
}
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
  // S7 interaction rule: while a source is still Processing (or its state is unknown) every confirming
  // action stays visibly disabled -- never tappable mid-analysis, never a false "no document selected".
  const confirmBlocked=isConfirmBlocked(sources),reviewState=suggestionImportState(suggestion,sources),disabled=confirmBlocked?' disabled aria-disabled="true"':'';
  return `<section class="card">${backRow('center','document',`<span class="badge">${experimental?'PDF ניסיוני':`ביטחון ${confidenceLabel(suggestion.confidence)}`}</span>`)}<h2>${isUpdate?'בדיקת הצעת עדכון':'בדיקת הצעה'}</h2><p class="muted">${isUpdate?existingItemUnchangedNotice(p.type):'המידע יישמר כפריט רק לאחר אישור מפורש.'}</p>${reviewState?`<div class="review-status">${importStatusPill(reviewState)}</div>`:''}${confirmBlocked?'<p class="muted small">הניתוח עדיין רץ — האישור יתאפשר כשהטיוטה תהיה מוכנה.</p>':''}${experimental?'<div class="experimental-warning"><b>קליטה ניסיונית:</b> יש לבדוק כל שדה. מידע חסר נשאר ריק והקובץ המקורי נשמר.</div>':''}<div class="source-summary"><b>מקורות:</b> ${sources.map(source=>esc(source.name)).join(', ')||'ייבוא חיצוני'}</div>${suggestion.origin==='external-import'?`<div class="privacy-warning">${tabler('lock')} ה־QR אינו מוצפן. אין לשתף אותו בפומבי.</div>`:''}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,p.details,'suggestion',suggestion.id,index)).join('')}</div>`:''}${mergeCandidatePanel('suggestion',suggestion.id,p,p.details)}${p.type==='flight'?directionPickerPanel(suggestion.id,p):''}${p.type==='flight'?flightSummaryBlock(p.details):''}${p.type==='activity'?activitySummaryBlock(p.details):''}${p.type==='insurance'?insuranceSummaryBlock(p.details):''}${smartEvidencePanel(p)}${reviewDocumentsBlock(suggestion,sources)}<form id="suggestion-form" data-id="${suggestion.id}">${proposalFields(displayP)}<div class="actions"><button class="btn" name="decision" value="approve"${disabled}>${isUpdate?`אישור ועדכון ה${ITEM_TYPES[p.type]?.label||'פריט'}`:'אישור ויצירת פריט'}</button><button class="btn secondary" name="decision" value="save"${disabled}>שמירת עריכה</button><button class="btn ghost" type="button" data-action="defer-suggestion" data-id="${suggestion.id}">אחר כך</button><button class="btn danger" type="button" data-action="reject-suggestion" data-id="${suggestion.id}">דחייה</button></div></form></section>`}
// Beta 0.8 Phase 2.1 (P2-F3): the review / creation screen offers "שיוך למשתתפים" -- and confirm-as-ticket -- directly
// on each attached document, so the linking is not repeated on the item page afterwards. Linking a ticket document
// to someone also adds them to the item's own participant list (add only, never removes); an item-only link creates
// no ticket coverage. Inactive participants are never offered (P12-F2).
function reviewDocumentsBlock(suggestion,sources){
  const fileSources=sources.filter(source=>source.kind!=='link'||source.url);
  if(!fileSources.length||!state.participants.some(participant=>participant.active!==false))return '';
  const eligible=TICKET_TYPES.includes(suggestion.proposed?.type);
  return `<fieldset class="form-group review-docs"><legend>שיוך המסמך למשתתפים</legend>${eligible?'<p class="muted small">שיוך מסמך כרטיס למשתתף מוסיף אותו גם למשתתפי הפריט.</p>':''}${fileSources.map(source=>`<div class="review-doc"><b><bdi>${esc(source.name||source.url)}</bdi></b><div class="participant-picker">${participantCheckboxes(source.participantIds,{name:'docParticipant-'+source.id,attrs:`data-action="review-doc-link" data-source="${source.id}" data-suggestion="${suggestion.id}"`})}</div>${eligible&&(source.participantIds||[]).length?`<button class="btn ${source.ticketConfirmed?'ghost':'secondary'}" type="button" data-action="review-doc-confirm" data-source="${source.id}" data-suggestion="${suggestion.id}">${source.ticketConfirmed?'כרטיס מאושר · ביטול אישור':'אישור ככרטיס'}</button>`:''}</div>`).join('')}</fieldset>`;
}
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
  return `<fieldset class="processing-choice"><legend>${tabler('alert')} כיוון הטיסה אינו חד־משמעי במקור — יש לבחור אחת האפשרויות</legend>${alreadyResolved?'<p class="muted small">כיוון זה כבר נקבע (עודכן מפריט קיים). ניתן לבחור אפשרות אחרת רק אם זו שגויה.</p>':''}${candidates.map((c,i)=>`<label><input type="radio" name="direction-pick" data-action="pick-direction" data-id="${suggestionId}" data-index="${i}" ${pickedIndex===i?'checked':''}> ${esc(c.label)} — יציאה ${c.startAt?fmt(c.startAt):'—'} · הגעה ${c.endAt?fmt(c.endAt):'—'}</label>`).join('')}</fieldset>`;
}
function flightSummaryBlock(details,{holders=true}={}){
  if(!details)return '';
  const rows=[['מספר טיסה',details.flightNumber],['חברת תפעול',details.operatingCarrier],
    details.marketingCarrier&&details.marketingCarrier!==details.operatingCarrier?['חברת שיווק',details.marketingCarrier]:null,
    ['המראה',[details.departureAirport?.code,details.departureAirport?.name].filter(Boolean).join(' — ')+(details.departureAirport?.terminal?` · טרמינל ${details.departureAirport.terminal}`:'')],
    ['נחיתה',[details.arrivalAirport?.code,details.arrivalAirport?.name].filter(Boolean).join(' — ')+(details.arrivalAirport?.terminal?` · טרמינל ${details.arrivalAirport.terminal}`:'')],
    ['משך טיסה',details.duration],['דגם מטוס',details.aircraftType],['מחלקה',details.classOfService],['בסיס תעריף',details.fareBasis],
    ['שער עלייה',details.gate],['פתיחת שער',details.gateOpensAt],['סגירת שער',details.gateClosesAt],['מספר רצף עלייה',details.boardingSequenceNumber],
  ].filter(Boolean).filter(([,value])=>String(value||'').trim());
  if(!rows.length&&!(holders&&details.passengers?.length))return '';
  const segmentBadge=details.segmentCount>1?`<span class="badge blue">מקטע ${details.segmentIndex} מתוך ${details.segmentCount}</span>`:'';
  return `<section class="card nested"><div class="section-head"><h3>פרטי הטיסה</h3>${segmentBadge}</div>${rows.length?`<dl class="flight-summary">${rows.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`:''}${holders?holdersDetails(flightPassengersTable(details.passengers),holders):''}</section>`;
}
// Beta 0.8 Phase 2.1 (P2-F4): on the saved item page the per-holder / passenger detail Smart Import read stays available
// but folded away, so it is not a second ticket section next to the ticket card; the review screen shows it open.
function holdersDetails(table,mode){return mode==='collapsed'&&table?table.replace(/^<h4>(.*?)<\/h4>/,'<details class="holders-details"><summary>$1</summary>')+'</details>':table}
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
function activitySummaryBlock(details,{holders=true}={}){
  if(!details)return '';
  const price=details.amount?`${details.amount}${details.currency?` ${details.currency}`:''}`:'';
  const rows=[price?['מחיר',price]:null,['משך',details.duration],['מגבלת גיל',details.ageRestrictions],['כלול',details.included],['לא כלול',details.notIncluded],['נקודת מפגש',details.meetingPoint],['כמות כרטיסים',details.ticketQuantity]].filter(Boolean).filter(([,value])=>String(value||'').trim());
  if(!rows.length&&!(holders&&details.ticketHolders?.length))return '';
  return `<section class="card nested"><h3>פרטי הכרטיס</h3>${rows.length?`<dl class="flight-summary">${rows.map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`:''}${holders?holdersDetails(activityTicketHoldersTable(details.ticketHolders),holders):''}</section>`;
}
// 0.7.9 correction (Findings 2/5): this heading used to read the literal text "כרטיסים" --
// identical to ticketsSection()'s own <h3>, immediately below it on the same detail page. The
// Product Owner read the two stacked, identically-labelled sections as one confusing/duplicated
// area and, separately, could not locate a just-added item.tickets[] row at all -- most likely
// because it renders directly under this section's own, indistinguishable "כרטיסים" header.
// Distinct wording (not a data/structure change) makes clear this table is the per-holder detail
// Smart Import already extracted from the document, not the same thing as the manual tracker
// below it.
function activityTicketHoldersTable(ticketHolders){
  if(!ticketHolders?.length)return '';
  return `<h4>פרטי כרטיסים מהמסמך (${ticketHolders.length})</h4><div class="list">${ticketHolders.map(holder=>{
    const parts=[holder.ticketNumber?`כרטיס ${esc(holder.ticketNumber)}`:'',holder.seatOrSection?esc(holder.seatOrSection):'',holder.dni?`ת.ז./דרכון ${esc(holder.dni)}`:''].filter(Boolean).join(' · ');
    return `<article class="row passenger-row"><span class="row-main"><b>${esc(holder.name||'כרטיס')}</b><small class="muted">${parts}</small></span></article>`;
  }).join('')}</div>`;
}
// 0.6.7: mirrors flightSummaryBlock/activitySummaryBlock's own read-only-summary pattern exactly,
// applied to Insurance's one structured per-person array. Insurance has no other detail scalars
// worth a summary row -- sum insured/broker land in notes per Decision 4, not a structured field.
function insuranceSummaryBlock(details){
  if(!details?.insuredPersons?.length)return '';
  return `<section class="card nested"><h3>מבוטחים</h3>${insuranceInsuredPersonsTable(details.insuredPersons)}</section>`;
}
function insuranceInsuredPersonsTable(insuredPersons){
  if(!insuredPersons?.length)return '';
  return `<h4>מבוטחים (${insuredPersons.length})</h4><div class="list">${insuredPersons.map(person=>{
    const parts=[person.idNumber?`ת.ז. ${esc(person.idNumber)}`:'',person.dob?`תאריך לידה ${esc(person.dob)}`:''].filter(Boolean).join(' · ');
    return `<article class="row passenger-row"><span class="row-main"><b>${esc(person.name||'מבוטח')}</b><small class="muted">${parts}</small></span></article>`;
  }).join('')}</div>`;
}
// 0.6.7 (Insurance discovery doc, Section 3a): relatedItemIds is manual-only, never extracted --
// rendered here as one combined control: currently-linked items shown as tappable rows (navigate
// away), plus a checklist covering every OTHER item in the trip to add/remove links. Each
// checkbox toggles membership via the confirm-needs-review-style scope/id convention this
// codebase already uses for a saved item's own field mutations.
// V6-F79 (0.6.7.1, real-world Product Owner feedback during the 0.6.7 acceptance session):
// Section 3a's frozen spec itself says the picker "should not restrict by type" and that remains
// true for every OTHER type -- but insurance-covering-insurance specifically isn't a meaningful
// real case, so other Insurance items are excluded from the ADD-candidate list here. Already-
// linked items are still shown/tappable regardless of type, so a pre-existing link (however it
// got there) is never silently hidden -- only new insurance-to-insurance links can no longer be
// created going forward.
function relatedItemsPanel(item){
  const linkedIds=new Set(item.relatedItemIds||[]);
  const linkedItems=state.items.filter(candidate=>candidate.id!==item.id&&linkedIds.has(candidate.id));
  const candidates=state.items.filter(candidate=>candidate.id!==item.id&&candidate.type!=='insurance');
  return `<h3>פריטים מבוטחים</h3>${linkedItems.length?`<div class="list">${linkedItems.map(itemRow).join('')}</div>`:'<p class="muted">לא קושרו פריטים לפוליסה זו.</p>'}${candidates.length?`<fieldset class="processing-choice"><legend>קישור לפריטים נוספים</legend>${candidates.map(candidate=>`<label><input type="checkbox" data-action="toggle-related-item" data-id="${item.id}" data-target="${candidate.id}" ${linkedIds.has(candidate.id)?'checked':''}> ${typeIcon(candidate.type)} ${esc(candidate.title)}</label>`).join('')}</fieldset>`:''}`;
}
function smartEvidencePanel(p){const fields=p.details?.smartImportFields||[],notes=p.details?.importantNotes||[],place=p.details?.placeValidation;if(!fields.length&&!notes.length&&!place)return '';return `<details class="evidence-panel" open><summary>כל המידע והראיות שנקלטו (${fields.length+notes.length})</summary><div class="evidence-list">${fields.map(field=>`<article><b>${esc(field.label)}</b><p>${esc(field.rawValue)}</p><small>${esc(field.evidence)} · ${field.certainty==='exact'?'מדויק':'דורש בדיקה'}</small></article>`).join('')}${notes.map(note=>`<article><b>${esc(note.title)}</b><p>${esc(note.text)}</p><small>${esc(note.evidence)} · ${note.certainty==='exact'?'מדויק':'דורש בדיקה'}</small></article>`).join('')}${place?`<article><b>אימות מיקום</b><p>${place.state==='validated'?`אומת: ${esc(place.acceptedPlace?.formattedAddress||place.locationDisplayValue)}`:`לא אומת: ${esc(place.reason||'דורש בדיקה')}`}</p></article>`:''}</div></details>`}
function requiredLabel(label){return `${label} <span class="required" aria-hidden="true">*</span><span class="sr-only">שדה חובה</span>`}
// 0.7.4: the real participant-relationship picker -- rendered whenever the Trip has at least one
// participant, regardless of item type (TYPE_FIELDS' own per-type field-presence pattern doesn't
// apply here on purpose: "items and documents may apply to... participants" is a universal
// relationship, not a per-type field like provider/location). Always renders the checkbox list
// alongside the scope select rather than JS-toggling it on scope change -- buildItemFormValues()
// only reads participantIds when scope is actually 'specific', so a harmless extra unread
// selection sitting in the DOM is simpler than wiring a show/hide handler for it.
function participantAssignmentField(p){
  if(!state.participants.length)return '';
  const scope=p.participantScope||'none';
  return `<div class="field"><label class="field-label">שיוך למשתתפים</label><select name="participantScope"><option value="none" ${scope==='none'?'selected':''}>ללא שיוך ספציפי</option><option value="all" ${scope==='all'?'selected':''}>כל המשתתפים</option><option value="specific" ${scope==='specific'?'selected':''}>משתתפים נבחרים</option></select><div class="participant-picker">${participantCheckboxes(p.participantIds)}</div></div>`;
}
// 0.7.4.1: the old free-text 'participants' field removed from every type's form -- it was a
// single shared field() call here, not per-type (confirmed by removing it once and having it
// disappear from every item type's form at once, not just Hotel, which is what the Product
// Owner's own report happened to test against). Genuinely superseded by participantAssignmentField
// (0.7.4's real participant-relationship picker) for every type where it could ever be edited by
// hand. Investigated before removing, not assumed empty: item.participants is NOT populated by
// Smart Import for Hotel (smart-import-adapter.js always sets it to []), but Flight/Activity/
// Insurance DO populate it with real extracted names (flight-import-adapter.js's participantNames;
// activity-/insurance-import-adapter.js's own union-merge treatment, ingestion.js §V6-F66) -- this
// field was never literally empty across the board. It was, however, confirmed never displayed
// anywhere either: flightSummaryBlock/activitySummaryBlock/insuranceSummaryBlock already show the
// same names in full, richer form (details.passengers/ticketHolders/insuredPersons, with ticket
// numbers, seats, ID numbers), so item.participants was always a redundant, write-only, never-
// rendered duplicate of data already visible elsewhere -- removing its only edit surface here does
// not remove any information the user could actually see. buildItemFormValues() (ingestion.js) no
// longer computes/returns a `participants` key at all (not just an empty one) specifically so
// Object.assign(item,values,...) on the edit-item-form path (below) can never overwrite whatever
// value already exists there -- any real data already sitting in Firestore survives untouched, on
// every item type, not just the ones Smart Import happens to populate. The ingestion.js merge
// logic that writes this field during attach-and-extract is untouched -- a real, separate code
// path, out of this narrow correction's own scope.
function proposalFields(p,{alwaysWebsite=false}={}){
  // Beta 0.8 Phase 2 (G1): the add/edit/review form, redesigned -- fields grouped by what they describe, each
  // label wrapping its own input (so it is programmatically associated, and the whole label is a tap target),
  // one column on a phone and two only where there is room (.form-grid). Field NAMES are unchanged: the submit
  // handlers, the type-switch re-render and the review form all read them by name.
  const type=['link','document'].includes(p.type)?'hotel':p.type||'hotel',fields=new Set(TYPE_FIELDS[type]||[]);
  if(alwaysWebsite||p.website)fields.add('website');
  const field=(name,label,input)=>fields.has(name)?`<label class="field"><span class="field-label">${label}</span>${input}</label>`:'';
  const group=(title,body)=>body.trim()?`<fieldset class="form-group"><legend>${title}</legend>${body}</fieldset>`:'';
  const typeSelect=`<label class="field"><span class="field-label">סוג</span><select name="type" data-action="proposal-type">${Object.entries(ITEM_TYPES).filter(([key])=>!['document','link','participant'].includes(key)).map(([key,itemType])=>`<option value="${key}" ${type===key?'selected':''}>${itemType.label}</option>`).join('')}</select></label>`;
  const title=`<label class="field"><span class="field-label">${requiredLabel('כותרת')}</span><input name="title" required aria-required="true" value="${esc(p.title||'')}"></label>`;
  const transport=field('transportMode','סוג תחבורה',`<select name="transportMode">${Object.entries(TRANSPORT_MODES).map(([value,label])=>`<option value="${value}" ${(p.transportMode||'car')===value?'selected':''}>${label}</option>`).join('')}</select>`);
  const booking=field('provider','ספק',`<input name="provider" value="${esc(p.provider||'')}">`)+field('confirmationNumber','מספר הזמנה',`<input name="confirmationNumber" dir="auto" value="${esc(p.confirmationNumber||'')}">`);
  const contact=field('location','מיקום',`<input name="location" value="${esc(p.location||'')}">`)+field('website','קישור',`<input type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" name="website" dir="ltr" value="${esc(p.website||'')}" placeholder="https://…">`)+field('phone','טלפון',`<input type="tel" name="phone" dir="ltr" value="${esc(p.phone||'')}">`)+field('email','אימייל',`<input type="email" name="email" dir="ltr" value="${esc(p.email||'')}">`);
  const when=field('startAt','תאריך התחלה',`<input type="datetime-local" name="startAt" value="${esc(p.startAt||'')}">`)+field('endAt','תאריך סיום',`<input type="datetime-local" name="endAt" value="${esc(p.endAt||'')}">`);
  const assignment=participantAssignmentField(p);
  return `<p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p>${group('פרטים כלליים',`${typeSelect}${title}${transport}`)}${group('הזמנה',booking)}${group('מיקום וקשר',contact)}${group('מועדים',`<div class="form-grid">${when}</div>`)}${assignment?`<fieldset class="form-group"><legend>שיוך</legend>${assignment}</fieldset>`:''}${group('הערות',field('notes','הערות',`<textarea name="notes">${esc(p.notes||'')}</textarea>`))}`;
}
// 0.7.5 (DESIGN_V1.md §6): account-level admin/history data, refreshed on demand (entering the
// relevant view, or right after an action that changes it) rather than kept live -- these are
// low-frequency admin actions, not Trip content, so a real-time listener would be unjustified
// complexity (unlike subscribeToTrip's own onSnapshot, which backs this app's actual headline
// two-device sync feature). Every refresh re-renders once its data arrives, same as every other
// async-then-render() pattern already used throughout this file (e.g. runMigration()).
async function refreshMyInvitation(){try{myInvitation=await getMyInvitation()}catch(error){console.error('Loading admin status failed',error)}render()}
async function refreshAdminInvitations(){try{adminInvitations=await listInvitations()}catch(error){console.error('Loading invitations failed',error);notify('טעינת רשימת ההזמנות נכשלה')}adminInvitationsLoaded=true;render()}
async function refreshEditorHistory(){if(!state.trip)return;try{editorHistory=await listEditorHistory(state.trip.id)}catch(error){console.error('Loading editor history failed',error)}render()}

// 0.7.5 (DESIGN_V1.md §5/§6): "typing the account's email to confirm, not just a single click" --
// this project's own established pattern for a destructive action is a plain confirm() (see
// reset-trip-data/delete-current-trip above), but this one is materially higher-stakes (another
// account's data, not the caller's own, and genuinely irreversible), so it gets prompt()'s stronger
// exact-text confirmation instead, one level up from every other destructive action in this app.
// Returns null (not an error) for an outright cancel or a non-matching typed value -- the caller
// distinguishes "nothing happened, say nothing further" from a real failure worth alert()ing.
async function deleteAccountViaAdmin(targetEmail){
  const typed=prompt(`פעולה זו בלתי הפיכה ומוחקת לצמיתות את כל נתוני הטיולים בבעלות ${targetEmail}.\nכדי לאשר, יש להקליד את כתובת האימייל המדויקת:`);
  if(typed===null)return null;
  if(String(typed).trim().toLowerCase()!==targetEmail.toLowerCase()){alert('הכתובת שהוקלדה אינה תואמת. המחיקה בוטלה.');return null}
  const user=auth.currentUser;if(!user)throw new Error('נדרשת התחברות פעילה.');
  const token=await user.getIdToken();
  const response=await fetch('/api/familytrips-admin-delete-account',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({targetEmail,confirm:true})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.message||'המחיקה נכשלה.');
  return payload;
}

// 0.7.2: Owner-only -- an Editor can view/edit Trip content but Trip Settings' own sharing
// controls are an Owner-only destructive-adjacent action (granting/revoking another person's
// access), matching firestore.rules' isOwner()-gated actions. A minimal "add Editor by email"
// action, per DESIGN_V1.md §1.4/§2.3 -- the polished invitation-management admin UI is 0.7.5's job.
// 0.7.5 (DESIGN_V1.md §6): extended, not replaced -- editorEmails stays the live list this section
// has always shown; editorHistory (fetched by refreshEditorHistory(), called on entering Settings
// and again right after add/remove-editor below) adds a revoked-history panel underneath, so a
// removed Editor doesn't just silently vanish with no record for the Trip Owner to see later.
// P3-F12: one row per e-mail address -- the address is one left-to-right line that is never broken (too long -> "…", tap to see it in full),
// then an optional chip and a short outline action. Used by the trip's sharing list and by the admin screens.
function accessRow(email,{chip='',action='',note=''}={}){
  return `<div class="access-row"><button class="access-email" type="button" dir="ltr" data-action="email-expand" title="${esc(email)}"><bdi>${esc(email)}</bdi>${note?`<small>${note}</small>`:''}</button>${chip}${action}</div>`;
}
const accessRemove=(action,email)=>`<button class="btn ghost small-btn access-remove" type="button" data-action="${action}" data-email="${esc(email)}" aria-label="ביטול הרשאה ל-${esc(email)}">הסרה</button>`;
const inviteForm=(id,label)=>`<form id="${id}" class="invite-form"><label class="field-label" for="${id}-email">${label}</label><div class="inline-add"><input id="${id}-email" type="email" name="email" dir="ltr" required placeholder="name@example.com"><button class="btn ghost small-btn" type="submit">הזמנה</button></div></form>`;
function sharingSection(){
  if(!state.trip||state.trip.ownerUid!==currentUid())return '';
  const editors=state.trip.editorEmails||[];
  const revokedHistory=editorHistory.filter(entry=>entry.state==='revoked'&&!editors.includes(entry.email));
  return `<section class="card"><h2>שיתוף הטיול</h2><p class="muted small">משתתפים עם הרשאת עריכה יכולים לצפות ולערוך את תוכן הטיול, אך לא לבצע פעולות בעלים (מחיקת הטיול, ניהול שיתוף).</p>${editors.length?`<div class="list">${editors.map(email=>accessRow(email,{action:accessRemove('remove-editor',email)})).join('')}</div>`:'<p class="muted small">אין עדיין משתתפים עם הרשאת עריכה.</p>'}${inviteForm('add-editor-form','הוספת משתתף לפי אימייל')}${revokedHistory.length?`<details class="proposal-archive"><summary>היסטוריית הרשאות שהוסרו (${revokedHistory.length})</summary><div class="list">${revokedHistory.map(entry=>accessRow(entry.email,{note:`הוסר ${entry.revokedAt?fmt(entry.revokedAt):''}`})).join('')}</div></details>`:''}</section>`;
}
// 0.7.2: reachable from Trip Settings, per the original scope document's recommended Trip-switcher
// placement. Real bug, caught by the Product Owner's own live acceptance testing (Test 2, no
// "start a new Trip" entry point anywhere): this whole section, "start a new Trip" button included,
// used to return '' whenever there was nothing yet to switch to -- a chicken-and-egg gate, since
// the only way to ever GET a second Trip was through a button that only appeared once a second
// Trip (or a pending migration) already existed. The "start new Trip" action must always be
// reachable; only the Trip LIST and the migration banner are genuinely conditional on there being
// something to show.
function tripsSection(){
  const others=myTrips.filter(trip=>trip.id!==state.trip?.id);
  return `<section class="card"><h2>הטיולים שלי</h2>${others.length?`<div class="list">${others.map(trip=>`<button class="row" data-action="switch-trip" data-id="${trip.id}"><span class="row-main"><b>${esc(trip.name||'טיול')}</b><small class="muted">${trip.ownerUid===currentUid()?'בבעלותי':'משותף איתי'}</small></span></button>`).join('')}</div>`:''}${migrationBanner()}<div class="actions"><button class="btn secondary" data-action="start-new-trip">התחלת טיול חדש</button></div></section>`;
}
// 0.7.2 migration, per DESIGN_V1.md §3.2: explicit (never automatic), never run by anything but
// the signed-in account whose own browser holds the real local data, verified before declaring
// success (see migrateLocalTripToFirestore, cloud-store.js). The pre-migration local copy is left
// untouched here -- runMigration() below does not clear it; a one-week retention window before
// it's eligible to be cleared is a Product Owner decision recorded in the 0.7.2 implementation
// report, not enforced by this UI yet.
function migrationBanner(){
  if(!hasLegacyLocalTrip())return '';
  return `<div class="danger-option"><div><h3>העברת טיול קיים למערכת המשותפת</h3><p class="muted">נמצא טיול שנשמר במכשיר זה לפני גרסה 0.7.2. ההעברה מעתיקה אותו לאחסון המשותף החדש ומאמתת שכל הנתונים הועתקו במלואם; העותק המקומי נשאר במכשיר ללא שינוי.</p></div><button class="btn" data-action="run-migration">העברת הטיול</button></div>`;
}
// 0.7.4: ordered Destination Countries list -- add/remove/reorder (no drag-and-drop library in
// this codebase, so plain up/down buttons, matching this app's existing button-driven interaction
// style everywhere else). Order is load-bearing, not cosmetic: destinationSummary() (header())
// renders this exact array order as the Trip's own route summary.
function destinationsSection(){
  const countries=state.trip.destinationCountries||[];
  // P3-F8: one row per destination -- the name and three 44px icon buttons (up, down, remove) on the same line -- and an add row
  // that is the field plus a small outline "+ הוספה" of the same height.
  const row=(country,index)=>`<article class="destination-row"><span class="destination-name">${index+1}. ${esc(country)}</span><button class="icon-btn-plain" type="button" data-action="destination-move-up" data-index="${index}" ${index===0?'disabled aria-disabled="true"':''} aria-label="הזזה למעלה">${tabler('chevup')}</button><button class="icon-btn-plain" type="button" data-action="destination-move-down" data-index="${index}" ${index===countries.length-1?'disabled aria-disabled="true"':''} aria-label="הזזה למטה">${tabler('chevdown')}</button><button class="icon-btn-plain" type="button" data-action="destination-remove" data-index="${index}" aria-label="הסרה">${tabler('trash')}</button></article>`;
  return `<section class="card"><h2>יעדים</h2><p class="muted small">הסדר קובע את סדר סיכום המסלול בראש המסך.</p><div class="list">${countries.length?countries.map(row).join(''):emptyState('compass','לא נוספו יעדים','הוסיפו את מדינות היעד לפי סדר המסלול.')}</div><form id="destination-add-form" class="inline-add"><input name="country" placeholder="הוספת יעד, למשל: תאילנד" aria-label="הוספת יעד" required><button class="btn ghost small-btn" type="submit">${tabler('plus')} הוספה</button></form></section>`;
}
// 0.7.4: Trip Settings is the sole entry point for participant management, per the frozen V24
// decision (no standalone Trip Center participant UI) -- confirmed via this section living only
// here, never referenced from center()'s own visibleTypes tile grid.
// Beta 0.8 Phase 3 (P12-F3): a participant row with a delete action. Deleting is blocked while the participant has any
// assignment (the button stays visibly disabled and the row says why, pointing to deactivation); otherwise a first tap
// arms an in-row confirmation that names the participant, and only "מחיקה סופית" removes the record.
function participantRow(participant){
  const inactive=participant.active===false,assigned=participantAssignments(state,participant.id).total,armed=participantDeleteArmed===participant.id;
  // P3-F7 / F11: one compact row -- the name area opens the editor; the status line carries the reason when the participant cannot be
  // deleted (so it can never read as the next card's text); a small toggle and the bin on the same row. A blocked bin is clearly greyed.
  const status=[participant.relationship?esc(participant.relationship):'',inactive?'לא פעיל':'פעיל',assigned?`לא ניתן למחוק (${assigned===1?'שיוך אחד':`${assigned} שיוכים`})`:''].filter(Boolean).join(' · ');
  const deleteButton=assigned?`<button class="bin-btn blocked" type="button" disabled aria-disabled="true" aria-label="מחיקת ${esc(participant.name)} אינה זמינה — יש ${assigned} שיוכים; אפשר להשבית את המשתתף במקום" title="אפשר להשבית את המשתתף במקום">${tabler('trash')}</button>`:`<button class="bin-btn" type="button" data-action="participant-delete-ask" data-id="${participant.id}" aria-label="מחיקת ${esc(participant.name)}">${tabler('trash')}</button>`;
  const confirmation=armed&&!assigned?`<div class="confirm-inline" role="alertdialog" aria-label="אישור מחיקה"><p>למחוק את <b>${esc(participant.name)}</b> לצמיתות? לא ניתן לשחזר.</p><div class="actions"><button class="btn danger" type="button" data-action="participant-delete" data-id="${participant.id}">מחיקה סופית</button><button class="btn ghost" type="button" data-action="participant-delete-cancel">ביטול</button></div></div>`:'';
  return `<div class="participant-item"><article class="participant-row ${inactive?'inactive':''}"><button class="participant-main" type="button" data-action="participant-edit" data-id="${participant.id}" aria-label="עריכת ${esc(participant.name)}"><b>${participant.avatarInitials?`${esc(participant.avatarInitials)} · `:''}${esc(participant.name)}</b><span class="participant-status">${status}</span></button><button class="btn ghost small-btn${inactive?' activate':''}" type="button" data-action="participant-toggle-active" data-id="${participant.id}">${inactive?'הפעלה':'השבתה'}</button>${deleteButton}</article>${confirmation}</div>`;
}
function participantsSection(){
  const participants=state.participants||[];
  // P3-F9: the section header carries the add button (small, outline, at the top) -- no button at the bottom.
  return `<section class="card"><div class="section-head"><h2>משתתפים</h2><button class="btn ghost small-btn" type="button" data-action="participant-add">${tabler('plus')} משתתף חדש</button></div><p class="muted small">קובע גם שיוך פריטים, כרטיסים ורשימות אריזה אישיות.</p><div class="list">${participants.length?participants.map(participantRow).join(''):emptyState('users','לא נוספו משתתפים','הוסיפו את בני המשפחה כדי לשייך אליהם כרטיסים ופריטים.')}</div></section>`;
}
// Beta 0.8 Phase 3.2 (P31-F1): Settings is a HOME LIST of rows -- three labelled groups -- and every row opens its own page (no tab bar).
// state.settingsPage: '' = the home list; otherwise one of SETTINGS_TITLES. "ניהול מערכת" opens the existing admin view.
const SETTINGS_TITLES={trip:'פרטי הטיול ויעדים',participants:'משתתפים',sharing:'שיתוף הטיול',trips:'הטיולים שלי',about:'אודות',delete:'מחיקה'};
const settingsRow=(title,sub,{page='',route='settings',danger=false}={})=>`<button class="srow${danger?' danger':''}" type="button" data-route="${route}"${page?` data-page="${page}"`:''}>${danger?tabler('trash'):''}<span class="srow-text"><b>${title}</b>${sub?`<span class="srow-sub">${sub}</span>`:''}</span>${tabler('chevron').replace('class="ti"','class="ti icon-directional"')}</button>`;
const settingsGroup=(label,rows)=>`<div class="sgroup-label">${label}</div><div class="sgroup">${rows.join('')}</div>`;
function settingsHome(){
  const active=state.participants.filter(participant=>participant.active!==false).length,inactive=state.participants.length-active;
  const people=`${active===1?'פעיל אחד':`${active} פעילים`}${inactive?` · ${inactive===1?'1 לא פעיל':`${inactive} לא פעילים`}`:''}`;
  const isOwner=state.trip.ownerUid===currentUid(),editors=(state.trip.editorEmails||[]).length;
  const destinations=(state.trip.destinationCountries||[]).map(esc).join('، ');
  const trip=[settingsRow('פרטי הטיול ויעדים',`שם, תאריכים${destinations?` · ${destinations}`:''}`,{page:'trip'}),settingsRow('משתתפים',people,{page:'participants'})];
  if(isOwner)trip.push(settingsRow('שיתוף הטיול',editors===0?'אין משתמשים נוספים':editors===1?'משתמש אחד עם גישה':`${editors} משתמשים עם גישה`,{page:'sharing'}));
  const account=[settingsRow('הטיולים שלי','מעבר בין טיולים · טיול חדש',{page:'trips'})];
  if(myInvitation?.isAdmin)account.push(settingsRow('ניהול מערכת','הרשאות גישה · למנהלים בלבד',{route:'admin'}));
  const general=[settingsRow('אודות',`<bdi dir="ltr">${esc(appVersionLabel())}</bdi>`,{page:'about'}),settingsRow('מחיקה','',{page:'delete',danger:true})];
  return `<div class="settings-page"><h2 class="screen-title">הגדרות</h2>${settingsGroup('הטיול הנוכחי',trip)}${settingsGroup('חשבון',account)}${settingsGroup('כללי',general)}</div>`;
}
const tripDetailsSection=()=>`<section class="card"><h2>הגדרות הטיול</h2><form id="trip-form"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><div class="field"><label>${requiredLabel('שם הטיול')}</label><input name="name" required aria-required="true" value="${esc(state.trip.name)}"></div><div class="grid two"><div class="field"><label>תאריך התחלה</label><input type="date" name="startDate" value="${esc(state.trip.startDate)}"></div><div class="field"><label>תאריך סיום</label><input type="date" name="endDate" value="${esc(state.trip.endDate)}"></div></div><button class="btn">שמירה</button></form></section>`;
const aboutSection=()=>`<section class="card"><h2>אודות</h2><p class="muted small"><bdi>${esc(appVersionLabel())}</bdi>${buildVersionLabel()?` · בנייה <bdi>${esc(buildVersionLabel())}</bdi>`:''}</p></section>`;
const deleteSection=()=>`<section class="card danger-zone"><p class="muted">הפעולות חלות רק על הטיול הנוכחי: <b>${esc(state.trip.name)}</b>.</p><div class="danger-option"><div><h3>מחיקת נתוני הטיול</h3><p class="muted">מוחקת פריטים, מסמכים, משימות, קניות, אריזה, מיקומים ומשתתפים; שם הטיול והתאריכים נשארים.</p></div><button class="btn warn" data-action="reset-trip-data">מחיקת נתוני הטיול</button></div><div class="danger-option"><div><h3>מחיקת הטיול הנוכחי</h3><p class="muted">מוחקת את הטיול ואת כל הנתונים המקומיים המשויכים אליו.</p></div><button class="btn danger" data-action="delete-current-trip">מחיקת הטיול</button></div></section>`;
function settingsPage(page){
  const body={trip:()=>tripDetailsSection()+destinationsSection(),participants:participantsSection,sharing:()=>sharingSection()||'<section class="card"><p class="muted">שיתוף הטיול זמין לבעל הטיול בלבד.</p></section>',trips:tripsSection,about:aboutSection,delete:deleteSection}[page];
  return `<div class="settings-page settings-sub settings-${page}">${backRow('settings','','',esc(SETTINGS_TITLES[page]))}${body()}</div>`;
}
function settingsView(){if(!state.trip)return empty();return SETTINGS_TITLES[state.settingsPage]?settingsPage(state.settingsPage):settingsHome()}
// 0.7.5 (DESIGN_V1.md §6): the Product-Owner-only application-invitation admin panel -- distinct
// from sharingSection() above, which is the per-Trip Owner-facing Editor panel every Trip Owner
// (not just the admin) already had since 0.7.2. Gated purely client-side on myInvitation.isAdmin
// (a convenience, matching this project's standing "client-hidden UI is not an authorization
// boundary" rule); the real boundary is firestore.rules' own isAdmin()-gated invitations
// collection and admin-delete-account.mjs's own server-side admin check, both independent of
// whatever this function decides to render.
function adminView(){
  if(!myInvitation?.isAdmin)return `<section class="card">${backRow('settings')}<p class="muted">מסך זה זמין למנהלי המערכת בלבד.</p></section>`;
  const active=adminInvitations.filter(invitation=>invitation.state==='active');
  const revoked=adminInvitations.filter(invitation=>invitation.state==='revoked');
  const rows=active.map(invitation=>accessRow(invitation.email,invitation.isAdmin?{chip:'<span class="badge blue">מנהל</span>'}:{action:accessRemove('admin-revoke',invitation.email)})).join('');
  return `<section class="card">${backRow('settings')}<h2>ניהול הרשאות גישה</h2><p class="muted small">מי מורשה להשתמש באפליקציה בכלל -- נפרד מהרשאת עריכה לטיול ספציפי (זו מנוהלת מהגדרות הטיול עצמו).</p><div class="list">${!adminInvitationsLoaded?skeletonList():active.length?rows:'<p class="muted small">אין הזמנות פעילות.</p>'}</div>${inviteForm('admin-invite-form','הזמנת משתמש חדש לפי אימייל')}</section>${quarantineSection(revoked)}`;
}
// 0.7.5 (DESIGN_V1.md §4/§5/§8): a revoked-not-yet-eligible account still shows here (with its own
// remaining-days count) even though its delete button stays disabled -- visibility into the
// countdown is itself part of the frozen requirement ("the 30-day countdown is visible in the
// admin UI per quarantined account"), not just the eventual delete action.
// 0.7.5.1 (V7-F11): re-activate is a direct action on this SAME still-quarantined record -- not a
// re-invite. Offered next to every quarantined account regardless of eligibility (an account 5
// days into quarantine is exactly as reversible as one at day 29 -- the 30-day window only ever
// gated deletion, never reversibility), distinct from the delete button beside it, which stays
// eligibility-gated.
function quarantineSection(revoked){
  if(!revoked.length)return '';
  return `<section class="card danger-zone"><h2>הסגר -- חשבונות שבוטלו</h2><p class="muted">חשבון שבוטל חסום מיידית מכל גישה. ניתן להפעיל מחדש בכל שלב לפני מחיקה. לאחר 30 יום ניתן למחוק לצמיתות את הנתונים בבעלותו -- אך ורק באישור מפורש, נפרד, לכל חשבון בנפרד.</p><div class="list">${revoked.map(invitation=>{
    const daysSinceRevoked=invitation.revokedAt?Math.max(0,Math.floor((Date.now()-new Date(invitation.revokedAt).getTime())/(24*60*60*1000))):0;
    const eligible=isDeletionEligible(invitation);
    const remaining=Math.max(0,QUARANTINE_DELETION_ELIGIBLE_DAYS-daysSinceRevoked);
    return `<div class="row"><span class="row-main"><b class="email"><bdi dir="ltr">${esc(invitation.email)}</bdi></b><small class="muted">בוטל לפני ${daysSinceRevoked} ימים${eligible?' · ניתן למחיקה':` · ניתן למחיקה בעוד ${remaining} ימים`}</small></span><div class="actions"><button class="btn secondary" data-action="admin-reactivate" data-email="${esc(invitation.email)}">הפעלה מחדש</button><button class="btn danger" data-action="admin-delete-account" data-email="${esc(invitation.email)}" ${eligible?'':'disabled aria-disabled="true"'}>מחיקה לצמיתות</button></div></div>`;
  }).join('')}</div></section>`;
}
function tripsView(){
  const owned=myTrips.filter(trip=>trip.ownerUid===currentUid()),shared=myTrips.filter(trip=>trip.ownerUid!==currentUid());
  const row=trip=>`<button class="row" data-action="switch-trip" data-id="${trip.id}"><span class="row-main"><b>${esc(trip.name||'טיול')}</b></span>${trip.id===state.trip?.id?'<span class="badge blue">נוכחי</span>':''}</button>`;
  // 0.7.5: also reachable from here, not just Settings -- Settings itself requires an active Trip
  // (settingsView() returns empty() without one), but the admin panel is account-level and must
  // stay reachable even for an admin with zero Trips yet; this is the one Trip-independent screen
  // that already exists for exactly that reason (migrationBanner/start-new-trip below).
  return `<section class="card"><h2>הטיולים שלי</h2>${owned.length?`<h3>בבעלותי</h3><div class="list">${owned.map(row).join('')}</div>`:''}${shared.length?`<h3>משותפים איתי</h3><div class="list">${shared.map(row).join('')}</div>`:''}${!owned.length&&!shared.length?'<p class="muted">אין עדיין טיולים.</p>':''}${migrationBanner()}<div class="actions"><button class="btn" data-action="start-new-trip">התחלת טיול חדש</button>${myInvitation?.isAdmin?'<button class="btn ghost" data-route="admin">ניהול הרשאות גישה</button>':''}</div></section>`;
}

function intakeModal(){if(ingestBusy)return analyzingModal('הוספה · מסמך');const source=state.modal?.source||'manual',choices=[['manual','pencil','ידני'],['document','file','מסמך'],['link','link','קישור']];let body='';
  // 0.7.1 (V5-F09): category-level Add previously always defaulted the manual-creation type
  // dropdown to 'hotel', regardless of which category the user opened Add from -- this "create"
  // action is the exact same one the global "+" uses, so it had no way to know. Fixed by reading
  // the ambient state.category directly: the category-scoped Add button (center(), line ~128)
  // only ever renders inside a category already confirmed to be a genuine ITEM_TYPES key (the
  // 'games'/'packing'/'tasks'/'shopping' operational tiles use a completely different
  // data-route/state.view path, never state.category), and opening this modal never clears
  // state.category -- so it is always either a valid preset or unset (global "+", falls through to
  // the existing 'hotel' default). proposalFields() itself already treats 'document'/'link' as an
  // alias for 'hotel' when resolving which fields to show, so even state.category==='document'
  // (a real, reachable category) falls through safely with no special-casing needed here.
  // 0.7.7 (found during implementation, not in the original scope document): manualCreateDefaults
  // pre-fills startAt/endAt with the Trip's own start date for every type -- harmless for every
  // existing type (their schedule is fixed regardless of whether a date is actually entered), but
  // it would defeat shoppingPlace's own "may be saved without a date at all" requirement, since a
  // pre-filled date field left untouched saves as genuinely dated. Skipped for shoppingPlace only.
  if(source==='manual')body=`<form id="manual-form">${proposalFields({type:state.category||'hotel',title:'',provider:'',confirmationNumber:'',location:'',website:'',phone:'',...(state.category==='shoppingPlace'?{startAt:'',endAt:''}:manualCreateDefaults(state.trip)),notes:''})}<div class="form-actions"><button class="btn">יצירת פריט</button></div></form>`;else if(source==='json')body='<div class="field"><label>קובץ familytrips.import 1.0</label><input id="import-json" type="file" accept="application/json,.json"></div><button class="btn" data-action="import-json">אימות ויצירת הצעות</button>';else if(source==='qr')body=qrPanel();else body=smartImportPanel(source);
  // 0.7.1: Task creation from the global "+" was previously unreachable -- only tasksView()'s own
  // "משימה חדשה" button could open the task-creation modal (state.modal={type:'task'}). Tasks are a
  // genuinely different data shape from every Item type (state.tasks, not state.items; title/owner/
  // mode/dueDate/done, no provider/confirmationNumber/location) -- they were never part of
  // ITEM_TYPES/proposalFields at all, so folding "Task" into the shared type dropdown used for
  // every Smart Import type (and for editing every existing item) would have offered a nonsensical
  // Hotel-to-Task conversion there too. Instead, this button jumps straight to the existing,
  // already-working task modal via the same task-add action tasksView() itself uses -- the global
  // click listener is a single delegated dispatcher keyed only on data-action, gated by no modal
  // state, so reusing it here needed no new rendering or save logic at all.
  const taskChoice=`<button data-action="task-add">${tabler('checklist')} משימה</button>`;
  return `<div class="modal-bg"><section class="modal wide-modal"><div class="modal-head"><h2>הוספה</h2><button class="close" data-action="close" aria-label="סגירה">${tabler('x')}</button></div><div class="source-choice source-tiles">${choices.map(([key,icon,label])=>`<button class="${source===key?'active':''}" data-action="source" data-source="${key}">${tabler(icon)} ${label}</button>`).join('')}${taskChoice}</div>${body}</section></div>`}
// Beta 0.8 Phase 2.2 (P21-F10): while a document is analyzed the dialog's own content is REPLACED -- the large palm centred on the
// screen with "מנתח…", the rotating status line, the hairline and a reassurance line, and the greyed "המשך" at the bottom (the
// interaction rule: never tappable mid-analysis, never a false "no document selected").
function analyzingModal(title){return `<div class="modal-bg"><section class="modal analyzing"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-action="close" aria-label="סגירה">${tabler('x')}</button></div><div class="analyzing-body">${largePalm({label:'מנתח…',note:'הניתוח יכול לקחת מספר שניות. אין צורך לסגור את המסך.'})}</div><button class="btn" type="button" disabled aria-disabled="true">המשך</button></section></div>`}
// V6-F fix pass: removed the manual Hotel/Flight picker -- the server now classifies from
// content the same way it already determines VOID vs. real segments (see analyze_source in
// smart-import.mjs). Document also replaces the separate PDF/Picture options: one broad-accept
// file input with no forced capture attribute lets the OS present its native camera/gallery/
// file choice (the underlying pipeline already treats them as one ingestion path).
// Beta 0.8 Phase 2.3 (P22-F10): the browser's bare file control is replaced by a dashed box with an upload icon; once a file is chosen
// it shows the name (in <bdi>, ellipsised) and a "החלפה" hint. The real <input id="source-file"> stays inside, invisible and covering the
// whole box, so the whole box is the tap target and every existing handler / test still finds it. Used by the "+" dialog's מסמך option
// AND the item page's own "הוספת מסמך" dialog.
const FILE_ACCEPT='application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff';
function fileDrop(){
  const name=pendingSourceFile?.name||'';
  return `<label class="field file-field"><span class="field-label">מסמך (PDF או תמונה)</span><span class="file-drop ${name?'has-file':''}"><input id="source-file" type="file" accept="${FILE_ACCEPT}"><span class="file-empty">${tabler('upload')} בחירת קובץ</span><span class="file-chosen"><bdi class="file-name">${esc(name)}</bdi><span class="file-replace">החלפה</span></span></span></label>`;
}
function syncFileDrop(input){
  const drop=input.closest('.file-drop');if(!drop)return;
  drop.classList.toggle('has-file',Boolean(pendingSourceFile));
  const label=drop.querySelector('.file-name');if(label)label.textContent=pendingSourceFile?.name||'';
}
function smartImportPanel(source){
  // V6-F78: this accept attribute (and its attachmentModal/validateSmartSource counterparts below) never included TIFF, even though
  // Decision 7 (INSURANCE_SMART_IMPORT_DISCOVERY.md) explicitly confirms scanned/fax-quality images -- INS-006's own real format -- as in scope.
  // Beta 0.8 Phase 2.2 (P21-F9): compact -- one file field, ONE checkbox for "analyze", a one-line note and "המשך", so the whole form
  // fits on screen under the four tiles. (While analysis runs the whole dialog is replaced by analyzingModal, P21-F10.)
  const input=source==='link'?'<label class="field"><span class="field-label">כתובת אתר ציבורי רשמי של המלון</span><input id="source-url" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…"></label>':fileDrop();
  return `${input}<label class="checkbox-field analyze-toggle"><input type="checkbox" name="processing-mode" value="analyze" checked> ניתוח והצעת פריט</label><p class="muted small analyze-note">הניתוח מתבצע רק לאחר אישור; עותק העיבוד אינו נשמר בשרת והמקור נשמר במכשיר. ללא סימון — שמירת המקור בלבד — ללא AI.</p><button class="btn" data-action="smart-ingest">המשך</button>`;
}
// V6-F38 (fix pass 4): the per-item "add document" modal still showed separate PDF/תמונה tabs
// after the global Add flow merged them into one Document option (V6 fix pass 1) -- applying the
// same merge here for consistency. One broad-accept file input with no forced capture attribute
// lets the OS present its native camera/gallery/file choice, exactly like the Add screen's
// Document option; validateSmartSource's existing kind==='document' branch already accepts
// either a PDF or an image, so no server/validation change is needed.
function attachmentModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);if(ingestBusy)return analyzingModal(`הוספת מסמך ל־${item?.title||'מלון'}`);return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>הוספת מסמך ל־${esc(item?.title||'מלון')}</h2><button class="close" data-action="close">${tabler('x')}</button></div>${fileDrop()}<fieldset class="processing-choice"><legend>מה לבצע?</legend><label><input type="radio" name="processing-mode" value="attach" checked> צירוף בלבד — ללא AI</label><label><input type="radio" name="processing-mode" value="extract"> צירוף וחילוץ מידע להצעה</label></fieldset><button class="btn" data-action="attach-ingest" data-id="${item?.id||''}">המשך</button></section></div>`}
function qrPanel(){const p=qrCollector.progress;return `<div class="privacy-warning">ה־QR מכיל מידע אישי ואינו מוצפן. אין לשתף אותו בפומבי.</div><video id="qr-video" class="qr-video" playsinline muted></video><div class="actions"><button class="btn" data-action="qr-camera">סריקה במצלמה</button><label class="btn secondary file-button">בחירת תמונת QR<input id="qr-image" type="file" accept="image/*"></label><button class="btn ghost" data-action="qr-reset">ביטול / התחלה מחדש</button></div>${p.total?`<div class="qr-progress"><b>חלקים שנקלטו: ${p.collected}/${p.total}</b><p>חסרים: ${p.missing.join(', ')||'אין'}</p></div>`:''}<div class="field"><label>הדבקת payload לבדיקה</label><textarea id="qr-text" dir="ltr" placeholder="FTI1:... או FTI1C|..."></textarea></div><button class="btn secondary" data-action="qr-text">קליטת payload</button>`}
function editModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>עריכת פריט</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="edit-item-form" data-id="${item.id}">${proposalFields(item,{alwaysWebsite:true})}<div class="form-actions"><button class="btn">שמירה</button></div></form></section></div>`}
function duplicateModal(){const {suggestionId,duplicateIds}=state.modal,suggestion=suggestionById(suggestionId),duplicates=state.items.filter(item=>duplicateIds.includes(item.id));return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>נמצאה הזמנה דומה</h2><button class="close" data-action="close">${tabler('x')}</button></div><p>ערכים מיובאים ריקים לא ידרסו מידע קיים.</p><div class="list">${duplicates.map(itemRow).join('')}</div><div class="actions"><button class="btn" data-action="duplicate-merge" data-suggestion="${suggestion.id}" data-target="${duplicates[0]?.id||''}">מיזוג</button><button class="btn secondary" data-action="duplicate-keep" data-suggestion="${suggestion.id}">שמירת שניהם</button><button class="btn ghost" data-action="close">ביטול</button></div></section></div>`}
// 0.7.9 correction (V7-F10, Test 4): the Development Agent's own round-1 report proposed keeping
// the free-text owner field as a transition-period choice, since it could in principle hold a
// name with no corresponding participant record. Product Owner's own decision after seeing both
// fields side by side on the same form: this reads as a duplication, not a useful transition --
// owner is REMOVED, superseding that report. Not destructive: an already-existing task's own
// stored owner value is simply never read or written by this form again (values below no longer
// includes it), so nothing already in Firestore is deleted -- the same non-destructive precedent
// 0.7.4.1 established when it removed the old free-text `participants` field from item forms.
// Beta 0.8 Phase 2.2 (P21-F14): the Shopping item's owner is a dropdown of the trip's ACTIVE participants (inactive ones are never
// offered -- P12-F2) plus "משותף". The stored value is still the owner's name, exactly as the free-text field stored it, so existing
// items keep working; an owner who is no longer an active participant (or an old typed name) stays selectable so editing never drops it.
function shoppingOwnerField(entry){
  const current=entry.owner&&entry.owner!=='shared'?entry.owner:'';
  const names=state.participants.filter(participant=>participant.active!==false).map(participant=>participant.name);
  const kept=current&&!names.includes(current)?[current]:[];
  const inactive=name=>state.participants.some(participant=>participant.name===name&&participant.active===false);
  return `<label class="field">בעלים<select name="owner"><option value="">משותף</option>${[...names,...kept].map(name=>`<option value="${esc(name)}" ${name===current?'selected':''}>${esc(name)}${inactive(name)?' (לא פעיל)':''}</option>`).join('')}</select></label>`;
}
function simpleFormModal(){const type=state.modal.type;if(type==='task'){const task=state.tasks.find(candidate=>candidate.id===state.modal.taskId)||{title:'',mode:'date',dueDate:'',priority:'Normal'};return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.taskId?'עריכת משימה':'משימה חדשה'}</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="task-form" data-id="${task.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><fieldset class="form-group"><legend>המשימה</legend><label class="field"><span class="field-label">${requiredLabel('משימה')}</span><input name="title" required aria-required="true" value="${esc(task.title)}"></label>${participantAssignmentField(task)}<label class="field">הערות<textarea name="notes" rows="3">${esc(task.notes||'')}</textarea></label><label class="field">קישור<input name="link" type="text" inputmode="url" dir="ltr" placeholder="https://" value="${esc(task.link||'')}"></label><p class="field-error" id="task-link-error" role="alert" hidden>הקישור אינו תקין — למשל https://example.com</p>${task.link?`<a class="fact-link fact-underline task-link-open" href="${esc(task.link)}" target="_blank" rel="noopener">${tabler('link')} <bdi dir="ltr">${esc(task.link)}</bdi></a>`:''}</fieldset><fieldset class="form-group"><legend>מועד ועדיפות</legend><label class="field">מועד<select name="mode"><option value="date" ${task.mode==='date'?'selected':''}>תאריך</option><option value="entire" ${task.mode==='entire'?'selected':''}>לכל הטיול</option><option value="none" ${task.mode==='none'?'selected':''}>ללא תאריך</option></select></label><label class="field">תאריך יעד<input type="date" name="dueDate" value="${esc(task.dueDate||'')}"></label><label class="field">עדיפות<select name="priority"><option value="High" ${task.priority==='High'?'selected':''}>גבוהה</option><option value="Normal" ${(task.priority||'Normal')==='Normal'?'selected':''}>רגילה</option><option value="Low" ${task.priority==='Low'?'selected':''}>נמוכה</option></select></label></fieldset><div class="form-actions"><button class="btn">שמירה</button>${task.id?`<button type="button" class="btn danger" data-action="task-delete" data-id="${task.id}">מחיקת המשימה</button>`:''}</div></form></section></div>`}if(type==='shopping'){
  // 0.7.7: an optional reference to a shopping place -- deliberately just a select, no cascading
  // delete anywhere: shoppingView()'s own render looks the place up by id at display time and
  // simply omits it if gone, so deleting a place can never delete or corrupt a list entry.
  // 0.7.7.1 (Test 1, found live): this form now also opens pre-filled for an existing entry
  // (state.modal.shoppingId), mirroring task-form's own edit-in-place pattern exactly -- same
  // form, same fields, just already-populated and keyed by data-id instead of always blank.
  const places=state.items.filter(item=>item.type==='shoppingPlace');
  const entry=state.shopping.find(candidate=>candidate.id===state.modal.shoppingId)||{name:'',quantity:'1',owner:'shared',linkedNeed:'',placeId:''};
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.shoppingId?'עריכת פריט קניות':'פריט קניות חדש'}</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="shopping-form" data-id="${entry.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field"><span class="field-label">${requiredLabel('פריט')}</span><input name="name" required aria-required="true" value="${esc(entry.name)}"></label><label class="field">כמות<input name="quantity" value="${esc(entry.quantity||'1')}"></label>${shoppingOwnerField(entry)}<label class="field">קישור לצורך אריזה/הכנה<input name="linkedNeed" value="${esc(entry.linkedNeed||'')}"></label><label class="field">מקום קניות מקושר (אופציונלי)<select name="placeId"><option value="">ללא</option>${places.map(place=>`<option value="${place.id}" ${place.id===entry.placeId?'selected':''}>${esc(place.title)}</option>`).join('')}</select></label><div class="form-actions"><button class="btn">שמירה</button>${state.modal.shoppingId?`<button type="button" class="btn danger" data-action="shopping-delete" data-id="${entry.id}">מחיקת הפריט</button>`:''}</div></form></section></div>`;
}return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>מיקום</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="location-form" data-id="${state.modal.locationId||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field"><span class="field-label">${requiredLabel('שם מקום')}</span><input name="placeName" required aria-required="true" value="${esc(state.modal.record?.placeName||'')}"></label><label class="field"><span class="field-label">${requiredLabel('כתובת / חיפוש')}</span><input name="address" required aria-required="true" value="${esc(state.modal.record?.address||'')}"></label><div class="grid two"><label class="field">קו רוחב<input name="lat" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lat||'')}"></label><label class="field">קו אורך<input name="lng" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lng||'')}"></label></div><label class="field">מקור<input name="source" value="${esc(state.modal.record?.source||'manual')}"></label><label class="field">ביטחון<select name="confidence"><option>high</option><option selected>medium</option><option>low</option></select></label><a class="btn ghost" href="${mapsUrl(state.modal.record?.address||'Thailand')}" target="_blank" rel="noopener">חיפוש / הצבת סיכה במפה</a><div class="form-actions"><button class="btn">אישור ושמירה</button></div></form></section></div>`}
// 0.7.4: participant add/edit modal, per Trip Settings' new participant-management scope. A
// dedicated function rather than folded into simpleFormModal() -- its field set (role/relationship,
// avatar initials, email, active status) doesn't overlap with task/shopping/location's own fields
// closely enough to share logic, and simpleFormModal's own single-`type`-check dispatch would only
// grow harder to follow by adding a fourth, differently-shaped branch to it.
function participantModal(){
  const participant=state.participants.find(candidate=>candidate.id===state.modal.participantId)||{name:'',relationship:'',avatarInitials:'',phone:'',email:'',notes:'',active:true};
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.participantId?'עריכת משתתף':'משתתף חדש'}</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="participant-form" data-id="${participant.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><fieldset class="form-group"><legend>פרטים</legend><label class="field"><span class="field-label">${requiredLabel('שם')}</span><input name="name" required aria-required="true" value="${esc(participant.name)}"></label><label class="field">תפקיד / קרבה משפחתית<input name="relationship" value="${esc(participant.relationship||'')}"></label><label class="field">ראשי תיבות לאווטאר<input name="avatarInitials" maxlength="3" value="${esc(participant.avatarInitials||'')}"></label></fieldset><fieldset class="form-group"><legend>יצירת קשר</legend><label class="field">טלפון<input type="tel" name="phone" dir="ltr" value="${esc(participant.phone||'')}"></label><label class="field">אימייל<input type="email" name="email" dir="ltr" value="${esc(participant.email||'')}"></label></fieldset><fieldset class="form-group"><legend>הערות</legend><label class="field">הערות<textarea name="notes">${esc(participant.notes||'')}</textarea></label></fieldset>${state.modal.participantId?`<label class="field checkbox-field"><input type="checkbox" name="active" ${participant.active!==false?'checked':''}> פעיל</label>`:''}<div class="form-actions"><button class="btn">שמירה</button></div></form></section></div>`;
}
// 0.7.4: replaces the old prompt()-based add-item flow -- "suggested items assignable to one or
// more participants" needs a real multi-select, which a sequence of prompt() text dialogs can't
// give reliably (would mean asking the user to type comma-separated participant names to be
// matched back against real records -- fragile and easy to get wrong). A proper modal, matching
// this app's own established quality bar for every other add/edit flow.
function packingItemModal(){
  const list=state.packing.find(candidate=>candidate.id===state.modal.listId),item=list?.items.find(candidate=>candidate.id===state.modal.itemId)||{name:'',owner:'shared',participantIds:[]};
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.itemId?'עריכת פריט אריזה':'פריט אריזה חדש'}</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="packing-item-form" data-list-id="${state.modal.listId}" data-item-id="${state.modal.itemId||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field"><span class="field-label">${requiredLabel('שם הפריט')}</span><input name="name" required aria-required="true" value="${esc(item.name)}"></label>${state.participants.length?`<div class="field"><label>שיוך למשתתפים (ריק = משותף)</label><div class="participant-picker">${participantCheckboxes(item.participantIds)}</div></div>`:''}<div class="form-actions"><button class="btn">שמירה</button>${state.modal.itemId?`<button type="button" class="btn danger" data-action="pack-delete" data-list="${state.modal.listId}" data-item="${state.modal.itemId}">מחיקת הפריט</button>`:''}</div></form></section></div>`;
}
// 0.7.9 (V7-F09): the manual-correction affordance for source.participantIds -- a plain
// multi-select checkbox list with no scope concept (mirrors packingItemModal's own simpler
// picker, not participantAssignmentField's scope+picker pair, since a source's participant link
// is never "all"/"none", just whichever specific people the document actually names).
function sourceParticipantsModal(){
  const source=state.sources.find(candidate=>candidate.id===state.modal.sourceId);
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>שיוך מסמך למשתתפים</h2><button class="close" data-action="close">${tabler('x')}</button></div><form id="source-participants-form" data-id="${source?.id||''}"><div class="field"><label>שיוך למשתתפים</label><div class="participant-picker">${participantCheckboxes(source?.participantIds)}</div></div><div class="form-actions"><button class="btn">שמירה</button></div></form></section></div>`;
}
// 0.8.1: link an existing document to an item. There was no "attach an existing document" flow to reuse (the item page's "הוספת מסמך" takes a NEW file),
// so this is a small picker: one radio list of the trip's items grouped by type; items already holding the document are shown disabled.
function sourceLinkModal(){
  const source=state.sources.find(candidate=>candidate.id===state.modal.sourceId);
  if(!source)return '';
  const items=sortItemsByStartAt(state.items.filter(item=>!['link','participant'].includes(item.type)));
  const groups=Object.keys(ITEM_TYPES).map(type=>[type,items.filter(item=>item.type===type)]).filter(([,list])=>list.length);
  const body=groups.length?groups.map(([type,list])=>`<fieldset class="form-group"><legend>${esc(ITEM_TYPE_PLURALS[type]||ITEM_TYPES[type].label)}</legend>${list.map((item,index)=>{const already=(item.sourceIds||[]).includes(source.id);return `<label class="pick-row${already?' disabled':''}"><input type="radio" name="itemId" value="${item.id}" ${already?'disabled':''} ${!already&&type===groups[0][0]&&index===0?'required':''}><span class="pick-text"><b>${esc(item.title)}</b><small class="muted">${already?'כבר מקושר':item.startAt?esc(fmt(item.startAt,false)):'ללא תאריך'}</small></span></label>`}).join('')}</fieldset>`).join(''):emptyState('document','אין פריטים לקשר אליהם','הוסיפו פריט בטיול ואז קשרו אליו את המסמך.');
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>קישור מסמך לפריט</h2><button class="close" data-action="close">${tabler('x')}</button></div><p class="muted small doc-link-name"><bdi dir="ltr">${esc(source.name||source.url||'מסמך')}</bdi></p><form id="source-link-form" data-id="${source.id}">${body}${groups.length?'<div class="form-actions"><button class="btn">קישור</button></div>':''}</form></section></div>`;
}
function modal(){if(!state.modal)return '';if(state.modal.type==='source-link')return sourceLinkModal();if(state.modal.type==='intake')return intakeModal();if(state.modal.type==='attachment')return attachmentModal();if(state.modal.type==='edit-item')return editModal();if(state.modal.type==='duplicate')return duplicateModal();if(state.modal.type==='participant')return participantModal();if(state.modal.type==='packing-item')return packingItemModal();if(state.modal.type==='source-participants')return sourceParticipantsModal();if(['task','shopping','location'].includes(state.modal.type))return simpleFormModal();return ''}
// Beta 0.8 Phase 1 (design spec V7 S3): 5-item nav (Today, Timeline, central +, Trip Center,
// Packing) replaces the old 4-item emoji nav + separate floating .fab -- the + is now one of the
// nav's own 5 grid cells (styles.css's .nav-plus-circle), not a floating element, so it's built
// here rather than in render()'s own shell markup. Settings has no slot in the spec's own nav；
// relocated to the always-visible account bar instead (see main.js's accountMarkup()).
const NAV_ICONS={
  today:'<svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5h3a1 1 0 0 0 1-1v-9"/></svg>',
  timeline:'<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="5" cy="18" r="1.6"/><path d="M9 6h11M9 12h11M9 18h6"/></svg>',
  center:'<svg viewBox="0 0 24 24"><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><rect x="3.5" y="7" width="17" height="12.5" rx="2"/></svg>',
  packing:'<svg viewBox="0 0 24 24"><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7"/><rect x="4.5" y="7" width="15" height="13" rx="2"/><path d="M4.5 12h15"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
function nav(){
  const centerSubviews=['detail','suggestion','games','game','tasks','shopping','locations'];
  const tab=(key,label)=>`<button class="${state.view===key||(centerSubviews.includes(state.view)&&key==='center')?'active':''}" data-route="${key}" aria-label="${label}">${NAV_ICONS[key]}<br>${label}</button>`;
  return `<nav class="nav">${tab('today','היום')}${tab('timeline','ציר הזמן')}<button class="nav-plus" data-action="create" aria-label="הוספה"><span class="nav-plus-circle">${NAV_ICONS.plus}</span></button>${tab('center','מרכז הטיול')}${tab('packing','אריזה')}</nav>`;
}
// 0.7.3 (DESIGN_V1.md §4, Product Owner decision: option 2, the minimal pending-sync indicator).
// Extends the existing offline banner's own pattern rather than introducing a new one: offline
// takes priority when both are true (there's nothing more specific to say while offline than that),
// otherwise a pending-sync backlog gets its own line once back online. Empty when neither applies.
// Beta 0.8 Phase 3 (spec S7): a quiet strip in --accent-soft, icon and text in --ink; it counts the waiting changes and is
// gone as soon as sync succeeds (no separate success message).
function syncBanner(){
  const strip=syncStripText({online:navigator.onLine,pending:pendingSyncCount});
  return strip?`<div class="offline" role="status">${tabler(strip.icon)}<span>${strip.text}</span></div>`:'';
}
function render(){
  // 0.7.3 (DESIGN_V1.md §0.2/§2.3): flush exactly one buffered remote update, if any, the moment
  // render() is called with no form-carrying modal open -- this is what "apply it once the form
  // closes" actually means in practice, since every place that closes a modal already calls
  // render() right afterward (mergeRemoteState() itself never calls render() to avoid a redundant
  // extra render pass here).
  // 0.7.3.1: only flush it while pendingSyncCount is 0. A buffered snapshot can predate a local
  // edit made (and save()d) WHILE the modal was still open but hasn't round-tripped through
  // Firestore yet -- applying it anyway would silently revert that not-yet-confirmed local edit
  // back to whatever the buffer captured earlier. Discarding it here is safe: pendingSyncCount>0
  // means a fresher echo reflecting this device's own edit is already on its way and will apply
  // (directly or via its own buffering) once it arrives.
  if(bufferedRemoteState&&!state.modal){
    const remoteState=bufferedRemoteState;bufferedRemoteState=null;
    if(pendingSyncCount===0)mergeRemoteState(remoteState);
  }
  // 0.7.5: 'admin' added to the Trip-independent exception list alongside 'trips' -- the admin
  // panel is account-level (per §0.2/§6, "the app doesn't know who the Product Owner is" until
  // isAdmin is checked, and that has nothing to do with whether a Trip happens to exist yet), so an
  // admin with no Trip at all must still be able to reach it, exactly like the Trip switcher/
  // start-new-trip view already could with no Trip.
  normalizeOperationalState(state);const views={today:todayView,timeline,center,detail:detailView,suggestion:suggestionView,games:gamesView,game:gameView,packing:packingView,tasks:tasksView,shopping:shoppingView,locations:locationsView,settings:settingsView,trips:tripsView,admin:adminView},body=(!bootResolved?loading:!state.trip&&!['trips','admin'].includes(state.view)?empty:(views[state.view]||todayView))();// P32-F2: the Documents filter-chip row is a horizontal scroller and render() rebuilds it, which resets it to the start (so the row "snapped back" to
// "הכול" after every tap, even though the selection itself was kept) -- carry its scroll position across the rebuild.
const keepChipScroll=document.querySelector('.doc-filters,.game-filters')?.scrollLeft;
document.querySelector('#app').innerHTML=`<div class="shell">${syncBanner()}${header()}<main>${body}</main>${nav()}${modal()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}</div>`;
  const chipRow=document.querySelector('.doc-filters,.game-filters');if(chipRow&&keepChipScroll!==undefined)chipRow.scrollLeft=keepChipScroll;
  fitActionRows();hydrateBingoPhotos();
}

// 0.7.2: source bytes now go to Firebase Storage (trips/{tripId}/sources/{sourceId}/...), not the
// old per-device IndexedDB store -- see cloud-store.js's uploadAttachment/downloadAttachment and
// DESIGN_V1.md §1.3. `source.storedOffline` keeps its pre-existing meaning ("this source's actual
// bytes are reachable", not merely its metadata), now backed by Storage's own offline cache
// instead of a bespoke IndexedDB read, so every existing call site that already checks it (sourceRow,
// etc.) needed no changes.
// 0.7.6 (DESIGN_V1.md §5): a genuinely offline file upload is a known, accepted limitation, not a
// silent gap -- uploadAttachment() below is a real Firebase Storage network call with no offline
// queueing (Storage's SDK has no equivalent to Firestore's own offline persistence, which is
// specific to documents, not binaries). While offline, this call simply rejects; every caller
// (ingest()/smartIngest()/attachIngest()) already wraps it in try/catch and shows a clear alert()
// on failure -- no suggestion or item is silently created, satisfying the frozen "no silent data
// loss" invariant even though there is no retry-on-reconnect the way a structured-data edit gets.
// Deliberately not built further for this candidate (0.7.6 DESIGN_V1.md §5, Product Owner decision,
// 2026-09-23) -- real offline-queued binary upload is materially different work, closer in size to
// 0.7.3's own sync-engine design effort, and stays a possible future candidate if it turns out to
// matter in real use.
async function storeOriginal(source,file){
  if(!state.trip)throw new Error('לא נמצא טיול פעיל.');
  // 0.7.6 round 4 (Test 5, found live): fail fast instead of relying on the Storage SDK's own
  // upload-retry window (documented, multi-minute by default) to eventually reject -- offline
  // upload has no queueing story either way (see this file's own 0.7.6 comment above), so there's
  // nothing to gain from silently waiting out retries that can only ever end in the same failure.
  // Every caller already alerts with its own fixed message rather than error.message, so the exact
  // text thrown here doesn't matter.
  if(!navigator.onLine)throw new Error('אין חיבור לרשת.');
  // Must happen before the Storage upload, not after -- see ensureTripDocSynced's own comment.
  // This call site runs before save() ever does (createLocalSource, called from ingest()/
  // smartIngest()/attachIngest(), always precedes the state.sources.push(source);save() that
  // follows it), so without this the very first attachment on a brand-new Trip always raced
  // ahead of the Firestore Trip document that Storage's own rules require to exist first.
  await ensureTripDocSynced(state.trip.id,state.trip);
  source.storagePath=await uploadAttachment(state.trip.id,source.id,file);
  source.storedOffline=true;
}
async function openSource(id){const source=sourceById(id);if(!source)return;if(source.kind==='link'){open(source.url,'_blank','noopener');return}try{
  // 0.7.6 (DESIGN_V1.md §2): reworded from "...unavailable offline on this device" -- cross-device
  // retrieval via downloadAttachment()/getBytes() is confirmed working (any device with Trip access
  // can fetch a synced source's real Storage bytes, not just the device that uploaded it), so a
  // missing storagePath here means the source itself was never successfully uploaded, not a
  // per-device availability gap.
  if(!source.storagePath){notify('קובץ המקור אינו זמין — ייתכן שהוא לא הועלה בהצלחה');return}
  const blob=await downloadAttachment(source.storagePath,source.type),record={blob,name:source.name,type:source.type};
  // V6-F87 (0.6.7.3 attempt): unlike PDF/PNG/JPEG/WebP -- every one of which every browser already
  // renders inline from a blob: URL opened this way -- no browser renders TIFF natively, so opening
  // one identically silently downloads it instead, with no explanation, inconsistent with every
  // other supported type's working inline preview. The 0.6.7.3 fix put the explanation in a
  // notify() toast called AFTER open() -- code-correct (confirmed present in that build's actual
  // deployed bundle by direct inspection) but the Product Owner still reported no visible message
  // in 0.6.7.4's retest, identically to before that fix. notify()'s toast auto-dismisses after 2.6s
  // (see notify() below) and open(url,'_blank') immediately shifts the browser's attention to a new
  // tab/download, which very likely visually buries or races past a toast rendered in the tab being
  // left behind -- a real, plausible explanation for "the code fires but nobody ever sees it".
  // V6-F87 (0.6.7.4 attempt): moved the explanation to a blocking alert() (this codebase's own
  // established pattern for a message that must not be missed -- see e.g. validateSmartSource's own
  // alert(error.message) a few lines below), shown BEFORE open()/the download starts, not after --
  // this removes the tab-focus race entirely, since the alert is guaranteed to block and be visible
  // in the same tab the user just clicked in, before any new tab or download activity begins.
  const isTiff=(record.type||'')==='image/tiff'||/\.tiff?$/i.test(record.name||'');
  if(isTiff)alert('קובצי TIFF אינם נתמכים לתצוגה בדפדפן — הקובץ יורד למכשיר לאחר אישור זה');
  const url=URL.createObjectURL(record.blob);open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
}catch(error){console.error(error);notify('פתיחת המקור נכשלה')}}
// 0.7.2: legacy-only, read-only access to the pre-Firestore IndexedDB store, used solely by
// runMigration()'s readLegacyBlob() to pull a not-yet-migrated source's bytes across. Nothing else
// in this file opens this database anymore -- a signed-in, post-migration source's real bytes live
// in Firebase Storage (storeOriginal/openSource above).
function openLegacyDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('family-trips-v4',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function readLegacyBlob(id){try{const db=await openLegacyDb(),record=await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),request=tx.objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});return record?.blob||null}catch{return null}}
// 0.7.2: "reset trip data" and "delete trip" now operate on the Trip's real Firestore/Storage
// records, not a local blob -- clearAllTripContent/deleteTripCompletely (cloud-store.js) delete the
// actual shared records an Editor would otherwise still see. Both remain Owner-only actions (only
// the Owner ever sees these buttons -- settingsView requires state.trip, and only an Owner/Editor
// reaches Settings at all, with sharingSection's own Owner-only gate covering the sharing controls
// specifically; the destructive actions below are a pre-existing UI-only gate, unchanged from
// before 0.7.2, not a new server-side check this candidate introduces).
async function resetCurrentTrip(removeTrip){
  const tripName=state.trip?.name||'הטיול הנוכחי',tripId=state.trip?.id;
  if(!tripId)return;
  // Same bug class as storeOriginal()'s Storage-upload fix: a Trip that was never synced (created
  // via ensureTrip() but no save()/storeOriginal() has run yet, so its Firestore document does not
  // exist) has nothing server-side to delete or clear in the first place -- calling
  // deleteTripCompletely/clearAllTripContent against a nonexistent Trip document would hit the
  // same permission error, for no reason, since there is nothing there to fail on.
  const everSynced=lastSyncedSnapshot?.trip?.id===tripId;
  try{
    if(everSynced){
      if(removeTrip)await deleteTripCompletely(tripId);
      else await clearAllTripContent(tripId);
    }
  }catch(error){console.error('Trip deletion/reset failed',error);throw new Error('מחיקת הנתונים בענן נכשלה. לא בוצע שינוי.')}
  if(unsubscribeTrip){unsubscribeTrip();unsubscribeTrip=null}
  lastSyncedSnapshot=null;
  bufferedRemoteState=null;
  qrCollector.reset();
  if(removeTrip){
    myTrips=myTrips.filter(trip=>trip.id!==tripId);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    state={...clone(EMPTY),view:myTrips.length?'trips':'today'};
  }else{
    // Write the fresh default packing list directly and await it before subscribing, rather than
    // racing an in-flight save() against openTrip()'s own first snapshot -- both would otherwise
    // independently race to set lastSyncedSnapshot from two different async paths.
    const preservedTrip=clone(state.trip),seededState={...clone(EMPTY),trip:preservedTrip,packing:defaultPacking()};
    await syncTripState(tripId,null,seededState).catch(error=>{console.error('Reset re-seed failed',error);throw new Error('שחזור רשימת האריזה ברירת המחדל נכשל.')});
    state={...seededState,view:'settings'};
    openTrip(tripId);
  }
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
  source.status='בניתוח';source.processingState='processing';source.processingStartedAt=new Date().toISOString();save();render();
  // Beta 0.8 Phase 2 (found live): save() above echoes back through the Trip listener, and mergeRemoteState REPLACES
  // state.sources with new objects while the analysis is awaiting -- so the `source` captured here becomes a detached
  // copy, and writing the outcome to it was silently lost: the source stayed "processing" forever (the four stuck
  // sources already on the QA Trip). Every outcome below is written to whichever object is in state NOW.
  const live=()=>sourceById(source.id)||source;
  try{
    const result=targetItem
      ?await (targetItem.type==='flight'?analyzeFlightSource({trip:state.trip,source,file}):targetItem.type==='activity'?analyzeActivitySource({trip:state.trip,source,file}):targetItem.type==='insurance'?analyzeInsuranceSource({trip:state.trip,source,file}):targetItem.type==='car'?analyzeCarSource({trip:state.trip,source,file}):analyzeHotelSource({trip:state.trip,source,file}))
      // V6-F69: source.url is only ever non-empty for a kind:'link' source (createLocalSource
      // sets it to the submitted URL, '' for a file); forwarding it here is what actually lets a
      // brand-new item's global Add-by-link reach the network at all.
      :await analyzeSource({trip:state.trip,source,file,url:source.url});
    const category=targetItem?targetItem.type:result.category;
    if(category==='unrecognized')throw new Error('לא זוהה מסמך מלון, טיסה, אטרקציה, ביטוח או תחבורה במקור. לא נוצרה הצעה.');
    // 0.7.9 correction round 3 (Finding 1, still failing on retest): round 2 gated this behind
    // `targetItem` truthy, reasoning it only made sense for the attach-to-existing-item flow --
    // but that gate meant a brand-new item created via Smart Import (smartIngest's own call to
    // runSmartAnalysis passes no third argument, so targetItem is always null there) NEVER ran
    // this resolution at all, regardless of match quality. Direct live-model evidence (a real
    // extraction against AE-001) proved the matching itself is correct, even against a word-order
    // variant -- the actual gap was this flow-scoping, not name-matching quality. Runs for every
    // flow now (new item and attach-to-existing alike); a confident match populates
    // source.participantIds, no match leaves it untouched (still manually correctable either way).
    {const resolvedParticipantIds=resolveParticipantIdsFromDraft(result.draft,state.participants.filter(participant=>participant.active!==false));if(resolvedParticipantIds.length)live().participantIds=resolvedParticipantIds}
    // 0.7.8: smartImportTransportResultToSuggestion throws directly (not an empty array) when the
    // model honestly classifies transportMode as 'transfer'/'other' -- mirrors the unrecognized
    // throw immediately above, caught by this same function's own catch block below.
    let suggestions=category==='flight'?smartImportFlightResultToSuggestions(result,source):category==='activity'?[smartImportActivityResultToSuggestion(result,source)]:category==='insurance'?[smartImportInsuranceResultToSuggestion(result,source)]:category==='car'?[smartImportTransportResultToSuggestion(result,source)]:[smartImportResultToSuggestion(result,source)];
    // V6-F72: flags a newly extracted flight segment whose airports are the exact reverse of an
    // already-saved item sharing its flight number -- the precise, deterministic signature of the
    // FL-001/FL-003 RTL-misread failure mode, independent of whatever the live model itself
    // reported as its own confidence. Runs for every flight suggestion, not only attach-and-extract.
    if(category==='flight')suggestions=suggestions.map(suggestion=>flagReversedFlightDirection(suggestion,state.items));
    if(targetItem)suggestions=suggestions.map(suggestion=>{const merged=preserveTrustedFieldsOnMerge(suggestion,targetItem);merged.targetItemId=targetItem.id;return merged});
    if(!suggestions.length)throw new Error('לא זוהה מקטע טיסה תקין במקור. לא נוצרה הצעה.');
    state.suggestions.push(...suggestions);
    Object.assign(live(),{status:targetItem?'מצורף — חילוץ ממתין לאישור':'ממתין לאישור',processingState:'proposal_ready',processingAttemptId:result.attemptId});save();
    route('suggestion',{suggestionId:suggestions[0].id});
    notify(targetItem?'נוצרה הצעת עדכון; דבר לא שונה עדיין':suggestions.length>1?`הניתוח הסתיים — ${suggestions.length} הצעות טיסה ממתינות לבדיקה`:'הניתוח הסתיים — יש לבדוק ולאשר כל שדה');
  }catch(error){
    Object.assign(live(),{status:targetItem?'מצורף — החילוץ נכשל':'הניתוח נכשל — המקור נשמר',processingState:'failed',processingError:String(error.message||error)});save();
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
  ensureTrip({name:'טיול חדש'});const kind=state.modal.source,mode=document.querySelector('input[name="processing-mode"][value="analyze"]')?.checked===false?'save':'analyze',file=kind==='link'?null:pendingSourceFile,url=normalizeUrlInput(document.querySelector('#source-url')?.value);
  try{validateSmartSource(kind,file,url)}catch(error){alert(error.message);return}
  // 0.7.6 round 4 (Test 5, found live): the busy-state UI below (smartImportPanel's own
  // processingIndicator) already existed but never actually appeared -- nothing re-rendered
  // between here and the async work finishing, so a slow/offline upload looked identical to a
  // dead click. Rendering immediately, before the await, is what actually shows it.
  ingestBusy=true;render();
  try{
    // 0.7.6 round 5 (Test 5, found live): a null source (createLocalSource's own alert already
    // shown) used to just `return` here, leaving ingestBusy flipped back false by the finally
    // below but never re-rendered -- the busy spinner round 4 just made visible stayed stuck on
    // screen forever, looking exactly like a hung analysis step. Every other exit from this
    // function (the mode==='save' branch below, runSmartAnalysis's own catch) already closes the
    // modal and routes away on completion/failure; this path needs the identical treatment.
    const source=await createLocalSource(kind,file,url);if(!source){pendingSourceFile=null;state.modal=null;route('center',{category:'document'});return}
    state.sources.push(source);save();
    if(mode==='save'){Object.assign(source,saveOnlySource(source));save();pendingSourceFile=null;state.modal=null;route('center',{category:'document'});notify('המקור נשמר ללא ניתוח');return}
    await runSmartAnalysis(source,file);
    pendingSourceFile=null;state.modal=null;
  }finally{ingestBusy=false}
}
async function attachIngest(itemId){
  if(ingestBusy)return;
  const item=state.items.find(candidate=>candidate.id===itemId),kind=state.modal.source||'file',mode=document.querySelector('input[name="processing-mode"]:checked')?.value||'attach',file=pendingSourceFile;if(!item)return;
  try{validateSmartSource(kind,file,'')}catch(error){alert(error.message);return}
  // 0.7.6 round 4: same fix as smartIngest() above -- render() immediately so attachmentModal's
  // own busy indicator actually shows during the upload, instead of only after it finishes.
  ingestBusy=true;render();
  try{
    // 0.7.6 round 5: same fix as smartIngest() above -- a null source must close the modal and
    // route away, not just return, or the busy spinner round 4 made visible stays stuck forever.
    const source=await createLocalSource(kind,file,'');if(!source){pendingSourceFile=null;state.modal=null;route('detail',{itemId:item.id});return}
    source.status=mode==='attach'?'מצורף לפריט':'בניתוח';source.processingState=mode==='attach'?'attached_only':'processing';state.sources.push(source);item.sourceIds=[...new Set([...(item.sourceIds||[]),source.id])];save();
    if(mode==='attach'){pendingSourceFile=null;state.modal=null;attachedFlash.add(source.id);setTimeout(()=>{attachedFlash.delete(source.id);document.querySelectorAll(`[data-flash-source="${source.id}"]`).forEach(node=>node.remove())},3500);route('detail',{itemId:item.id});notify('המסמך צורף ללא שינוי בפרטי הפריט');return}
    await runSmartAnalysis(source,file,item);
    pendingSourceFile=null;state.modal=null;
  }finally{ingestBusy=false}
}
async function analyzeSavedSource(id){
  if(ingestBusy)return;
  const source=sourceById(id);if(!source)return;
  let file;
  try{
    // 0.7.6 (DESIGN_V1.md §2): same reasoning as openSource()'s own message above -- reworded to
    // stop implying a per-device gap that cross-device retrieval already closes.
    if(!source.storagePath)throw new Error('קובץ המקור אינו זמין — ייתכן שהוא לא הועלה בהצלחה. לא ניתן לנתח ללא הקובץ.');
    const blob=await downloadAttachment(source.storagePath,source.type);
    file=new File([blob],source.name,{type:source.type});
  }catch(error){alert(error.message||'שליפת הקובץ נכשלה.');return}
  ingestBusy=true;
  try{await runSmartAnalysis(source,file)}finally{ingestBusy=false}
}
// 0.7.6 correction (Test 5, found live): a failed storeOriginal() here used to throw, but NEITHER
// caller (smartIngest/attachIngest, below) actually caught it -- the error became an unhandled
// rejection with zero visible feedback (a silent no-op click, worst of all outcomes), unlike
// ingest()'s own inline equivalent, which does catch its own storeOriginal() call directly. A
// pre-existing gap, not something 0.7.6 introduced, but found via this candidate's own Test 5
// (which specifically checks offline upload fails visibly) and fixed here since it blocks that
// test. Fixed once, in this shared function both callers route through, rather than duplicating
// the same try/catch in each -- alert()s directly and returns null; both callers now check for
// that instead of relying on a throw they never caught.
async function createLocalSource(kind,file,url){const source={id:uid('src'),kind:kind==='link'?'link':kind==='photo'?'photo':'file',name:kind==='link'?url:file.name,url:kind==='link'?url:'',type:file?.type||'text/html',size:file?.size||0,status:'נשמר',createdAt:new Date().toISOString(),storedOffline:kind==='link',experimental:false,processingState:'saved'};if(file){source.fingerprint=await sha256File(file);try{await storeOriginal(source,file)}catch(error){alert('שמירת המקור במכשיר נכשלה. לא נשלח מידע לניתוח.');return null}}return source}
// kind is 'document' from the merged Add screen (V6 fix pass), or still 'file'/'photo' from the
// unchanged attach-to-existing-item screen -- either way, PDF or one of the three image types.
// V6-F38: both the Add screen and the per-item attachment modal now only ever pass 'link' or
// 'document' here (the separate 'file'/'photo' kinds this used to validate are gone from the UI
// entirely), so their branches were removed rather than left as unreachable dead code.
// V6-F78: isImage never recognized TIFF -- neither the MIME type (image/tiff) nor a .tif/.tiff
// filename fallback -- even though Decision 7 explicitly confirms scanned/fax-quality images
// (INS-006's own real format) as in scope. Mirrors isPdf's own existing MIME-or-filename
// fallback pattern, since TIFF MIME-type detection is less universal across browsers/OS than
// PNG/JPEG -- a file genuinely selected in the picker (accept attribute allowed it) could still
// arrive here with an empty or non-standard file.type.
function validateSmartSource(kind,file,url){if(kind==='link'){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error()}catch{throw new Error('יש להזין כתובת HTTP או HTTPS תקינה.')}return}if(!file)throw new Error('יש לבחור קובץ.');const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name),isImage=/^image\/(?:png|jpeg|webp|tiff)$/.test(file.type)||/\.tiff?$/i.test(file.name);if(kind==='document'&&!isPdf&&!isImage)throw new Error('יש לבחור קובץ PDF או תמונה.');if(file.size>15*1024*1024)throw new Error('הקובץ גדול מ־15MB.')}
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
// P2-F3: the document-level "שיוך למשתתפים" on the review screen. Ticking someone links the document to them and
// (for a ticket-eligible proposal) ticks them in the proposal's own participant picker -- add only -- before the form is
// captured, so nothing typed so far is lost by the re-render.
function reviewDocLink(box){
  const suggestion=suggestionById(box.dataset.suggestion),source=sourceById(box.dataset.source),form=document.querySelector('#suggestion-form');
  if(!suggestion||!source||!form)return;
  const ids=[...document.querySelectorAll(`input[data-action="review-doc-link"][data-source="${source.id}"]:checked`)].map(input=>input.value);
  source.participantIds=ids;if(!ids.length){source.ticketConfirmed=false;source.ticketUsed=false}
  if(TICKET_TYPES.includes(suggestion.proposed?.type)){
    const scope=form.elements.participantScope;
    if(scope&&scope.value!=='all'&&ids.length){scope.value='specific';for(const id of ids){const target=[...form.querySelectorAll('input[name="participantIds"]')].find(input=>input.value===id);if(target)target.checked=true}}
  }
  updateSuggestion(form,suggestion);save();render();
}
// Beta 0.8 Phase 2.1 (P2-F3, found while testing it): the review screen has always SHOWN the participant picker, but
// updateSuggestion never read it back and suggestionToItem never carried it onto the new item -- the choice was dropped.
// Read it here (only when the form has the picker) so it is kept on the proposal and reaches the item.
function reviewParticipantFields(form,before){
  const scopeField=form.elements.participantScope;
  if(!scopeField)return {};
  const scope=['none','all','specific'].includes(scopeField.value)?scopeField.value:'none';
  return {participantScope:scope,participantIds:scope==='specific'?new FormData(form).getAll('participantIds').map(String):[]};
}
function updateSuggestion(form,suggestion){const data=new FormData(form),before=suggestion.proposed,type=String(data.get('type')),range=normalizeDateRange(data.get('startAt'),data.get('endAt'),{allowEndBeforeStart:type==='flight'});
  // 0.7.8 (found live, needed for reviewing a Transport suggestion): transportMode/email were both
  // already rendered by proposalFields() for type:'car' (transportMode since 0.7.4, email new this
  // candidate) but never captured back out of the suggestion-review form here -- unreachable until
  // this candidate made a real car-type suggestion possible for the first time (0.7.4 itself only
  // ever reached buildItemFormValues' own manual-create/edit-item path, never this one, since no
  // extraction could produce a car suggestion before Transport Smart Import existed).
  const next={type,title:String(data.get('title')||'').trim(),provider:String(data.get('provider')||'').trim(),confirmationNumber:String(data.get('confirmationNumber')||'').trim(),location:String(data.get('location')||'').trim(),website:normalizeUrlInput(data.get('website')),phone:String(data.get('phone')||'').trim(),email:String(data.get('email')||'').trim(),startAt:range.start,endAt:range.end,participants:String(data.get('participants')||'').split(',').map(x=>x.trim()).filter(Boolean),notes:String(data.get('notes')||'').trim(),transportMode:String(data.get('transportMode')||'').trim()||before.transportMode,schedule:scheduleForType(type,Boolean(range.start)),...reviewParticipantFields(form,before)};
  const changedFields=new Set(['title','provider','confirmationNumber','location','website','phone','email','startAt','endAt','notes','transportMode'].filter(key=>String(before[key]||'')!==String(next[key]||'')));
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

addEventListener('click',async event=>{if(Date.now()<suppressClickUntil)return;if(event.target.closest('#more-menu')||!event.target.closest('[data-action="more-menu"]'))closeMoreMenu();const routeButton=event.target.closest('[data-route]');if(routeButton){const view=routeButton.dataset.route;route(view,{category:routeButton.dataset.cat,itemId:routeButton.dataset.id,suggestionId:routeButton.dataset.id,anchor:routeButton.dataset.anchor,page:routeButton.dataset.page});if(view==='settings'&&state.trip?.ownerUid===currentUid())refreshEditorHistory();else if(view==='admin')refreshAdminInvitations();return}const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action==='create'){state.modal={type:'intake',source:'manual'};render()}
  else if(action==='more-menu')openMoreMenu(button);
  else if(action==='tasks-done-toggle'){state.tasksDoneCollapsed=!state.tasksDoneCollapsed;render()}
  else if(action==='doc-filter'){state.docFilter=button.dataset.filter||'all';render()}
  else if(action==='email-expand'){button.classList.toggle('expanded')}
  else if(action==='extra-toggle'){extraOpenFor=extraOpenFor===button.dataset.id?null:button.dataset.id;render()}
  else if(action==='item-end')endItem(button.dataset.id);
  else if(action==='item-unend'){const item=state.items.find(candidate=>candidate.id===button.dataset.id);if(item){item.endedAt='';save();render()}}
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
  else if(action==='timeline-mode'){
    // P3-F15: leaving "כל הטיול" for a day / week / month opens on today when today is inside the trip (otherwise where the trip starts).
    const previous=state.timelineMode,inTrip=Boolean(state.trip?.startDate&&state.trip?.endDate&&today()>=state.trip.startDate&&today()<=state.trip.endDate);
    state.timelineMode=button.dataset.mode;
    if(state.timelineMode==='all')state.timelineCursor=state.trip?.startDate||state.timelineCursor||today();
    else if(previous==='all'&&inTrip)state.timelineCursor=today();
    else if(state.timelineMode==='day')state.timelineCursor=state.calendarDate||state.timelineCursor||state.trip?.startDate||today();
    render();
  }
  else if(action==='timeline-shift'){state.timelineCursor=shiftTimeline(state.timelineCursor,state.timelineMode,Number(button.dataset.dir));render()}
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
  // V6-F80: the "not correct" counterpart to confirm-needs-review. Editing the flagged field is what clears
  // the flag (reconcileStaleNeedsReview), so this takes the reader straight there: the saved item's edit form,
  // or -- on the review screen, where the form is already inline -- the field itself, focused.
  else if(action==='needs-review-edit'){
    const scope=button.dataset.scope,field=needsReviewFormField(button.dataset.key);
    if(scope==='item'){state.modal={type:'edit-item',itemId:button.dataset.id};render()}
    requestAnimationFrame(()=>{const input=document.querySelector(`${scope==='item'?'#edit-item-form':'#suggestion-form'} [name="${field}"]`);input?.scrollIntoView?.({block:'center'});input?.focus()});
  }
  // V6-F74: confirms a still-live needsReviewFields entry as reviewed and correct without
  // requiring its value to change -- the missing counterpart to editing the field, which was
  // previously the only way to clear a needsReviewRef-backed warning. Same scope/id convention as
  // resolve-merge-candidate, since confirmNeedsReviewField (ingestion.js) is likewise agnostic to
  // a pending suggestion's proposed object vs. an already-saved item.
  else if(action==='confirm-needs-review'){
    const scope=button.dataset.scope,key=button.dataset.key,value=button.dataset.value;
    if(scope==='suggestion'){
      const suggestion=suggestionById(button.dataset.id);if(!suggestion)return;
      suggestion.proposed=confirmNeedsReviewField(suggestion.proposed,key,value);
      suggestion.warnings=suggestion.proposed.warnings;
      suggestion.updatedAt=new Date().toISOString();
    }else{
      const item=state.items.find(candidate=>candidate.id===button.dataset.id);if(!item)return;
      Object.assign(item,confirmNeedsReviewField(item,key,value));
    }
    save();render();
  }
  // 0.6.7: toggles a target item's id in/out of an insurance item's relatedItemIds array --
  // manual-only, never touched by extraction (see relatedItemsPanel/insuranceCoveringItems above).
  // Reads the checkbox's own post-click checked state directly rather than re-deriving intent,
  // since the browser has already toggled it by the time this click handler runs.
  else if(action==='toggle-related-item'){
    const item=state.items.find(candidate=>candidate.id===button.dataset.id);if(!item)return;
    const targetId=button.dataset.target,current=new Set(item.relatedItemIds||[]);
    if(button.checked)current.add(targetId);else current.delete(targetId);
    item.relatedItemIds=[...current];
    save();render();
  }
  else if(action==='reject-suggestion'){if(confirm('לדחות את ההצעה? המקורות יישמרו.')){const lifecycle=rejectProposal(state.suggestions,state.rejectedSuggestions,button.dataset.id);state.suggestions=lifecycle.suggestions;state.rejectedSuggestions=lifecycle.rejectedSuggestions;save();route('center',{category:'document'});notify('ההצעה הועברה לארכיון')}}
  else if(action==='duplicate-merge')approveSuggestion(suggestionById(button.dataset.suggestion),'merge',button.dataset.target);
  else if(action==='duplicate-keep')approveSuggestion(suggestionById(button.dataset.suggestion),'keep');
  else if(action==='edit-item'){state.modal={type:'edit-item',itemId:button.dataset.id};render()}
  else if(action==='delete-item'){if(confirm('למחוק את הפריט? המקורות יחזרו למסמכים.')){const item=state.items.find(x=>x.id===button.dataset.id);for(const sourceId of item?.sourceIds||[]){const source=sourceById(sourceId);if(source)source.status='לא משויך'}state.items=state.items.filter(x=>x.id!==button.dataset.id);save();route('center')}}
  // 0.7.9 correction round 3 (Finding 4): neither Tasks nor Equipment/Packing items had any delete
  // affordance at all before this -- only a done/packed checkbox toggle, confirmed by direct code
  // inspection, not a soft-delete/archive being upgraded. Same plain confirm() pattern delete-item
  // already uses (this project's own established destructive-action discipline for a one-off,
  // non-account-level action), permanently removing the record, not archiving it.
  else if(action==='task-delete'){if(confirm('למחוק את המשימה לצמיתות?')){state.tasks=state.tasks.filter(x=>x.id!==button.dataset.id);state.modal=null;save();render()}}
  else if(action==='pack-delete'){if(confirm('למחוק את פריט הציוד לצמיתות?')){const list=state.packing.find(x=>x.id===button.dataset.list);if(list)list.items=list.items.filter(x=>x.id!==button.dataset.item);state.modal=null;save();render()}}
  else if(action==='reset-trip-data'){if(confirm(`למחוק את כל נתוני הטיול "${state.trip?.name||''}"? שם הטיול והתאריכים יישמרו, אך הפריטים, המסמכים, המשימות, הקניות, האריזה והמיקומים יימחקו מהמכשיר.`)){try{await resetCurrentTrip(false)}catch(error){alert(error.message)}}}
  else if(action==='delete-current-trip'){if(confirm(`למחוק לצמיתות מהמכשיר את הטיול "${state.trip?.name||''}" ואת כל הנתונים המשויכים אליו?`)){try{await resetCurrentTrip(true)}catch(error){alert(error.message)}}}
  else if(action==='destination-move-up'){const index=Number(button.dataset.index),list=[...state.trip.destinationCountries];if(index>0){[list[index-1],list[index]]=[list[index],list[index-1]];state.trip.destinationCountries=list;save();render()}}
  else if(action==='destination-move-down'){const index=Number(button.dataset.index),list=[...state.trip.destinationCountries];if(index<list.length-1){[list[index],list[index+1]]=[list[index+1],list[index]];state.trip.destinationCountries=list;save();render()}}
  else if(action==='destination-remove'){const index=Number(button.dataset.index);state.trip.destinationCountries=state.trip.destinationCountries.filter((_,candidateIndex)=>candidateIndex!==index);save();render()}
  else if(action==='participant-add'){state.modal={type:'participant',participantId:null};render()}
  else if(action==='participant-edit'){state.modal={type:'participant',participantId:button.dataset.id};render()}
  else if(action==='participant-delete-ask'){participantDeleteArmed=button.dataset.id;render()}
  else if(action==='participant-delete-cancel'){participantDeleteArmed=null;render()}
  else if(action==='participant-delete'){
    // Re-checked at the moment of deletion: an assignment made since the row was drawn blocks it (P12-F3).
    const participant=state.participants.find(candidate=>candidate.id===button.dataset.id);participantDeleteArmed=null;
    if(!participant||participantAssignments(state,participant.id).total){render();return}
    state.participants=state.participants.filter(candidate=>candidate.id!==participant.id);if(state.packingParticipantView===participant.id)state.packingParticipantView="shared";save();notify(`המשתתף ${participant.name} נמחק`);
  }
  else if(action==='participant-toggle-active'){const participant=state.participants.find(candidate=>candidate.id===button.dataset.id);participant.active=participant.active===false;save();render()}
  else if(action==='source-edit-participants'){state.modal={type:'source-participants',sourceId:button.dataset.id};render()}
  // 0.7.9 correction round 3 (Finding 2): confirms a linked document as this item's ticket
  // coverage for whichever participant(s) it's already linked to -- an explicit confirmation, not
  // an automatic effect of the participant link itself, matching the Product Owner's own "offer,
  // don't auto-create" phrasing.
  // P2-F3: confirm / un-confirm the attached document as ticket coverage right on the review screen.
  else if(action==='review-doc-confirm'){const source=sourceById(button.dataset.source),suggestion=suggestionById(button.dataset.suggestion),form=document.querySelector('#suggestion-form');if(!source)return;if(suggestion&&form)updateSuggestion(form,suggestion);source.ticketConfirmed=!source.ticketConfirmed;if(!source.ticketConfirmed)source.ticketUsed=false;save();render()}
  else if(action==='source-confirm-ticket'){const source=state.sources.find(candidate=>candidate.id===button.dataset.id);if(source){source.ticketConfirmed=true;save();render()}}
  // V7-F16: the undo for the confirmation above. Clearing ticketUsed with it keeps a hidden "used" flag from
  // silently reappearing if the document is confirmed again later.
  else if(action==='source-unconfirm-ticket'){const source=state.sources.find(candidate=>candidate.id===button.dataset.id);if(source){source.ticketConfirmed=false;source.ticketUsed=false;save();render();notify('אישור הכרטיס בוטל')}}
  // S7 Failed pill's "מחק": an explicit hard delete of the source (distinct from source-unlink's soft removal
  // from one item). The stored original goes with it -- an original is only ever removed explicitly.
  else if(action==='source-link'){state.modal={type:'source-link',sourceId:button.dataset.id};render()}
  else if(action==='source-delete'){const source=sourceById(button.dataset.id);if(!source||!confirm(sourceDeleteMessage(source,linkedItemsOf(source,state.items),state.participants)))return;if(source.storagePath)try{await deleteAttachment(source.storagePath)}catch(error){console.error('Deleting the stored original failed',error)}for(const item of state.items)if(item.sourceIds?.includes(source.id))item.sourceIds=item.sourceIds.filter(id=>id!==source.id);state.sources=state.sources.filter(candidate=>candidate.id!==source.id);state.suggestions=suggestionsAfterSourceDelete(state.suggestions,source.id);save();render();notify('המקור נמחק')}
  // 0.7.9.2 (document removal): a soft unlink, not a hard delete -- only item.sourceIds loses
  // this id; the source record itself stays in state.sources untouched, re-linkable later via the
  // existing Attach-source flow, matching the app's own never-silently-lose-data pattern
  // (rejected-suggestion archive works the same way). A source already confirmed as someone's
  // ticket coverage gets an explicit, participant-naming warning before proceeding -- removing it
  // would otherwise silently drop that coverage too, not just the document link.
  else if(action==='source-unlink'){
    const item=state.items.find(candidate=>candidate.id===button.dataset.itemId);
    const source=state.sources.find(candidate=>candidate.id===button.dataset.id);
    if(!item||!source)return;
    if(source.ticketConfirmed){
      const names=(source.participantIds||[]).map(id=>state.participants.find(p=>p.id===id)?.name).filter(Boolean);
      if(!confirm(`מסמך זה מאושר ככיסוי כרטיס עבור ${names.join(', ')||'משתתף'} — הסרתו תבטל גם את הכיסוי. להסיר בכל זאת?`))return;
    }else if(!confirm('להסיר את קישור המסמך מהפריט? המסמך עצמו יישמר וניתן יהיה לשייכו מחדש.'))return;
    item.sourceIds=(item.sourceIds||[]).filter(id=>id!==source.id);save();render();
  }
  else if(action==='game-favorite'){const game=state.games.find(x=>x.id===button.dataset.id);game.favorite=!game.favorite;save();render()}
  else if(action==='game-filter'){state.gameFilter=button.dataset.filter||'all';render()}
  else if(action==='trivia-build')await buildTrivia(button.dataset.id);
  else if(action==='trivia-reveal'){triviaRevealed=true;render()}
  else if(action==='trivia-score'){const game=state.games.find(x=>x.id===button.dataset.id),wasMarked=triviaMarked.includes(button.dataset.participant),result=toggleCorrect(game.triviaState,triviaMarked,button.dataset.participant);triviaMarked=result.marked;game.triviaState={...game.triviaState,scores:result.scores};save();render();
    // 0.9.2 (P91-F3): scoring a point (not taking one back) celebrates whoever just got it
    if(!wasMarked){const winner=state.participants.find(person=>person.id===button.dataset.participant);if(winner)fireWinner({name:winner.name})}}
  else if(action==='trivia-next'){const game=state.games.find(x=>x.id===button.dataset.id);game.triviaState=triviaNext(game.triviaState);triviaRevealed=false;triviaMarked=[];save();render()}
  else if(action==='trivia-replay'){const game=state.games.find(x=>x.id===button.dataset.id);game.triviaState=newTriviaState(game.deck);game.started=true;triviaRevealed=false;triviaMarked=[];save();render()}
  else if(action==='trivia-exit'){gamePlaying=null;render()}
  else if(action==='game-start'&&button.dataset.id===TRIVIA_ID){const game=state.games.find(x=>x.id===TRIVIA_ID);if(game?.deck?.length){game.started=true;gamePlaying=TRIVIA_ID;triviaRevealed=false;triviaMarked=[];save();render()}}
  else if(action==='bingo-theme'){const game=bingoGame();game.activeTheme=button.dataset.theme;bingoPicking=false;closeBingoViewer();save();render()}
  else if(action==='bingo-switch'){bingoPicking=true;render()}
  else if(action==='bingo-exit'){gamePlaying=null;bingoPicking=false;closeBingoViewer();render()}
  else if(action==='bingo-participant')selectParticipant(button.closest('[data-carousel]'),button.dataset.participant);
  else if(action==='bingo-cell')bingoCellTap(button.dataset.spot);
  else if(action==='bingo-view-close'){closeBingoViewer();render()}
  else if(action==='bingo-replace'){const game=bingoGame(),pid=bingoCurrentParticipant();if(game&&pid&&bingoViewing&&!bingoBusy){bingoPending={theme:game.activeTheme,pid,spotId:bingoViewing};startBingoCapture()}}
  else if(action==='bingo-erase')await eraseBingoPhoto();
  else if(action==='bingo-reset')await resetBingoBoard();
  else if(action==='game-start'&&button.dataset.id===BINGO_ID){const game=bingoGame();game.started=true;gamePlaying=BINGO_ID;bingoPicking=!BINGO_THEMES[game.activeTheme];save();render()}
  else if(action==='game-start'){const game=state.games.find(x=>x.id===button.dataset.id);if(game?.interactive){game.started=true;save()}notify(game?.interactive?'המשחק התחיל':'הפעילות התחילה')}
  else if(action==='add-list'){const name=prompt('שם קטגוריית האריזה');if(name){state.packing.push({id:uid('pl'),name,owner:'shared',items:[]});save();render()}}
  else if(action==='pack-collapse'){state.packingCollapsed[button.dataset.list]=!state.packingCollapsed[button.dataset.list];save();render()}
  else if(action==='pack-add'){state.modal={type:'packing-item',listId:button.dataset.list,itemId:null};render()}
  else if(action==='pack-edit'){state.modal={type:'packing-item',listId:button.dataset.list,itemId:button.dataset.item};render()}
  else if(action==='packing-view-participant')selectParticipant(button.closest('[data-carousel]'),button.dataset.participant);
  else if(action==='task-add'){state.modal={type:'task'};render()}
  else if(action==='shopping-filter-clear'){state.shoppingFilters={owner:'all',place:'all'};render()}
  else if(action==='task-filter-clear'){state.taskFilters={priority:'all',due:'all',status:'all',participant:'all'};render()}
  else if(action==='task-edit'){state.modal={type:'task',taskId:button.dataset.id};render()}
  else if(action==='shopping-add'){state.modal={type:'shopping'};render()}
  // P2-F5 (closes P12-F4): the shopping item's delete lives inside its edit screen, same as a task's.
  else if(action==='shopping-delete'){if(confirm('למחוק את פריט הקניות לצמיתות?')){state.shopping=state.shopping.filter(x=>x.id!==button.dataset.id);state.modal=null;save();render()}}
  else if(action==='shopping-edit'){state.modal={type:'shopping',shoppingId:button.dataset.id};render()}
  // 0.7.7: reuses the existing manual-item-creation pipeline (proposalFields/manual-form) exactly
  // as-is, just pre-selecting the category -- the same "jump straight to an existing modal" pattern
  // create's own task-add button already uses, not a new form.
  else if(action==='shopping-place-add'){state.category='shoppingPlace';state.modal={type:'intake',source:'manual'};render()}
  else if(action==='location-add'){state.modal={type:'location'};render()}
  else if(action==='location-approve'){const record=state.locationRecords.find(x=>x.id===button.dataset.id);state.modal={type:'location',locationId:record.id,record};render()}
  else if(action==='switch-trip')switchTrip(button.dataset.id);
  else if(action==='start-new-trip')await startNewTripFlow();
  else if(action==='remove-editor'){if(!confirm(`להסיר את ${button.dataset.email} מהטיול?`))return;try{state.trip.editorEmails=await removeEditorByEmail(state.trip.id,button.dataset.email);notify(`${button.dataset.email} הוסר מהטיול`);refreshEditorHistory()}catch(error){alert(error.message||'הסרת המשתתף נכשלה.')}}
  else if(action==='admin-revoke'){if(!confirm(`לבטל את ההרשאה של ${button.dataset.email}? הגישה לאפליקציה תיחסם מיידית.`))return;try{await revokeInvitation(button.dataset.email);notify('ההרשאה בוטלה');refreshAdminInvitations()}catch(error){alert(error.message||'ביטול ההרשאה נכשל.')}}
  else if(action==='admin-reactivate'){if(!confirm(`להפעיל מחדש את ${button.dataset.email}? הגישה לטיולים ולנתונים הקודמים שבבעלות החשבון תשוחזר מיידית.`))return;try{await reactivateInvitation(button.dataset.email);notify('החשבון הופעל מחדש');refreshAdminInvitations()}catch(error){alert(error.message||'ההפעלה מחדש נכשלה.')}}
  else if(action==='admin-delete-account'){
    try{const result=await deleteAccountViaAdmin(button.dataset.email);if(result){notify('החשבון נמחק לצמיתות');refreshAdminInvitations()}}
    catch(error){alert(error.message||'המחיקה נכשלה.')}
  }
  else if(action==='run-migration'){
    if(!confirm('להעביר את נתוני הטיול המקומי למערכת המשותפת? העותק המקומי יישאר ללא שינוי.'))return;
    const legacy=legacyLoad();if(!legacy.trip){notify('לא נמצא טיול מקומי להעברה');return}
    button.disabled=true;button.textContent='מעביר…';
    try{
      const uid=currentUid();if(!uid)throw new Error('לא מחובר.');
      await migrateLocalTripToFirestore(legacy,uid,readLegacyBlob);
      myTrips=await listMyTrips(uid,currentEmail());
      switchTrip(legacy.trip.id);
      notify('הטיול הועבר בהצלחה ואומת מול הנתונים המקוריים');
    }catch(error){console.error('Migration failed',error);alert(`ההעברה נכשלה: ${error.message||error}\nהעותק המקומי לא נפגע.`)}
    render();
  }
});
addEventListener('change',async event=>{const action=event.target.dataset.action;if(action==='review-doc-link'){reviewDocLink(event.target)}else if(action==='pack-toggle'){const list=state.packing.find(x=>x.id===event.target.dataset.list),item=list?.items.find(x=>x.id===event.target.dataset.item);if(item){item.done=event.target.checked;save();render()}}else if(action==='task-toggle'){const task=state.tasks.find(x=>x.id===event.target.dataset.id);task.done=event.target.checked;save();render()}else if(action==='shopping-toggle'){const item=state.shopping.find(x=>x.id===event.target.dataset.id);item.purchased=event.target.checked;save();render()}else if(action==='source-ticket-toggle-used'){const source=state.sources.find(x=>x.id===event.target.dataset.id);if(source){source.ticketUsed=event.target.checked;save();render()}}else if(event.target.id==='qr-image'&&event.target.files?.[0])await decodeQrImage(event.target.files[0]);else if(event.target.id==='source-file'){pendingSourceFile=event.target.files?.[0]||null;syncFileDrop(event.target)}else if(event.target.id==='calendar-month'){state.calendarDate=`${event.target.value}-01`;state.timelineCursor=state.calendarDate;render()}else if(event.target.id==='shopping-filter-owner'){state.shoppingFilters={...state.shoppingFilters,owner:event.target.value};render()}
  else if(event.target.id==='shopping-filter-place'){state.shoppingFilters={...state.shoppingFilters,place:event.target.value};render()}
  else if(event.target.id==='task-filter-priority'){state.taskFilters={...state.taskFilters,priority:event.target.value};render()}else if(event.target.id==='task-filter-due'){state.taskFilters={...state.taskFilters,due:event.target.value};render()}else if(event.target.id==='task-filter-status'){state.taskFilters={...state.taskFilters,status:event.target.value};render()}else if(event.target.id==='task-filter-participant'){state.taskFilters={...state.taskFilters,participant:event.target.value};render()}else if(['startAt','startDate'].includes(event.target.name)){const form=event.target.closest('form'),endName=event.target.name==='startAt'?'endAt':'endDate',endInput=form?.elements?.namedItem(endName),isFlight=form?.elements?.namedItem('type')?.value==='flight';if(endInput){const range=normalizeDateRange(event.target.value,endInput.value,{allowEndBeforeStart:isFlight});if(range.end!==endInput.value)endInput.value=range.end}}else if(event.target.matches('select[data-action="proposal-type"]')){const form=event.target.closest('form'),current=new FormData(form),values={type:event.target.value,title:current.get('title')||'',transportMode:current.get('transportMode')||'',provider:current.get('provider')||'',confirmationNumber:current.get('confirmationNumber')||'',location:current.get('location')||'',website:current.get('website')||'',phone:current.get('phone')||'',startAt:current.get('startAt')||'',endAt:current.get('endAt')||'',participantScope:current.get('participantScope')||'none',participantIds:current.getAll('participantIds').map(String),notes:current.get('notes')||''},actions=form.querySelector('.form-actions')?.outerHTML||form.querySelector('.actions')?.outerHTML||form.querySelector('.btn')?.outerHTML||'';form.innerHTML=proposalFields(values,{alwaysWebsite:form.id==='edit-item-form'})+actions}});
function requiresOutOfRangeConfirmation(values){return isItemOutsideTrip(values,state.trip)}
function confirmOutOfRangeSave(values){return !requiresOutOfRangeConfirmation(values)||confirm(`התאריך שנבחר מחוץ לטווח הטיול (${state.trip.startDate} עד ${state.trip.endDate}). לשמור בכל זאת?`)}
addEventListener('submit',async event=>{event.preventDefault();const form=event.target,data=new FormData(form);
  if(form.id==='trip-form'){const range=normalizeDateRange(data.get('startDate'),data.get('endDate')),start=range.start,end=range.end,added=backfillTripDates(state.items,start);state.trip={...state.trip,name:String(data.get('name')).trim(),startDate:start,endDate:end};if(!state.timelineCursor)state.timelineCursor=start;save();render();notify(added?`הטיול נשמר ו־${added} פריטים ללא תאריך קיבלו את תאריך ההתחלה`:'הטיול נשמר')}
  else if(form.id==='destination-add-form'){const country=String(data.get('country')||'').trim();if(country){state.trip.destinationCountries=[...(state.trip.destinationCountries||[]),country];save();render()}}
  else if(form.id==='participant-form'){
    const id=form.dataset.id||uid('participant'),existing=state.participants.find(candidate=>candidate.id===id);
    const record={id,name:String(data.get('name')||'').trim(),relationship:String(data.get('relationship')||'').trim(),avatarInitials:String(data.get('avatarInitials')||'').trim(),phone:String(data.get('phone')||'').trim(),email:String(data.get('email')||'').trim(),notes:String(data.get('notes')||'').trim(),active:existing?data.get('active')==='on':true};
    if(existing)Object.assign(existing,record);else state.participants.push(record);
    save();state.modal=null;render();notify(existing?'המשתתף עודכן':'המשתתף נוסף');
  }
  else if(form.id==='source-link-form'){
    const source=state.sources.find(candidate=>candidate.id===form.dataset.id),item=state.items.find(candidate=>candidate.id===String(data.get('itemId')||''));
    if(source&&item){
      item.sourceIds=[...new Set([...(item.sourceIds||[]),source.id])];
      // as when people are assigned to a ticket document: linking it to a ticket-type item adds them to the item's own participants (add only).
      if(TICKET_TYPES.includes(item.type)&&(source.participantIds||[]).length){const add=addParticipantsToRecord(item,source.participantIds);if(add)Object.assign(item,add)}
      save();state.modal=null;render();notify(`המסמך קושר ל־${item.title}`);
    }
  }
  else if(form.id==='source-participants-form'){
    const source=state.sources.find(candidate=>candidate.id===form.dataset.id);
    if(source){source.participantIds=data.getAll('participantIds').map(String);
      // P2-F3: linking a ticket document to people adds them to the item's own participants (add only, never removes).
      for(const item of state.items)if(item.sourceIds?.includes(source.id)&&TICKET_TYPES.includes(item.type)){const add=addParticipantsToRecord(item,source.participantIds);if(add)Object.assign(item,add)}
      save();state.modal=null;render()}
  }
  else if(form.id==='packing-item-form'){
    const list=state.packing.find(candidate=>candidate.id===form.dataset.listId),name=String(data.get('name')||'').trim();
    if(!list||!name)return;
    if(packingDuplicate(state.packing,name,form.dataset.itemId||'')){alert('פריט בשם זה כבר קיים בקטגוריה אחרת.');return}
    const participantIds=data.getAll('participantIds').map(String),existing=list.items.find(candidate=>candidate.id===form.dataset.itemId);
    if(existing){existing.name=name;existing.participantIds=participantIds}
    else list.items.push({id:uid('pi'),name,done:false,suggested:false,owner:'shared',participantIds});
    save();state.modal=null;render();
  }
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
      // Phase 1.2 (P11-F5): moving an ended item's date/time to later than now un-ends it, so a
      // rescheduled item reappears on Today; every other edit leaves endedAt alone.
      const unEnd=item.endedAt&&shouldClearEndedOnEdit(item.startAt,values.startAt);
      Object.assign(item,values,{details:reconciled.details,warnings:reconciled.warnings});
      if(unEnd)item.endedAt='';
    }
    // 0.7.7: a newly-created shoppingPlace routes back to the "shopping" operational view it was
    // created from, not the generic per-type Trip Center category page every other type lands on
    // -- that generic page is still reachable (nothing here removes it), just not where this
    // candidate's own "add place" button, opened from shoppingView(), expects to return to.
    save();state.modal=null;route(form.id==='manual-form'?(type==='shoppingPlace'?'shopping':'center'):'detail',form.id==='manual-form'?(type==='shoppingPlace'?{}:{category:type}):{itemId:form.dataset.id})}
  else if(form.id==='suggestion-form'){const suggestion=suggestionById(form.dataset.id);if(!suggestion||isConfirmBlocked((suggestion.sourceIds||[suggestion.sourceId]).map(sourceById).filter(Boolean)))return;updateSuggestion(form,suggestion);if(event.submitter?.value==='approve'){save();approveSuggestion(suggestion)}else{save();render();notify('עריכת ההצעה נשמרה')}}
  else if(form.id==='task-form'){
    // 0.7.9 (V7-F10): participantScope/participantIds, same field names and none/all/specific
    // semantics as Items' own (buildItemFormValues, ingestion.js) -- not a parallel Task-specific
    // scheme. owner is no longer read or written here (Product Owner decision, correction round --
    // see the task-form modal's own comment) -- an existing task's own stored owner value, if any,
    // is simply left untouched by Object.assign below, not cleared.
    const participantScope=['none','all','specific'].includes(String(data.get('participantScope')))?String(data.get('participantScope')):'none';
    const link=normalizeTaskLink(data.get('link'));
    // An inline message, not notify(): notify() re-renders and the form would lose everything typed so far.
    if(!link.ok){const error=form.querySelector('#task-link-error');if(error)error.hidden=false;form.querySelector('[name=link]')?.focus();return}
    const values={notes:String(data.get('notes')||'').trim(),link:link.value,title:String(data.get('title')).trim(),mode:String(data.get('mode')),dueDate:String(data.get('dueDate')||''),priority:['High','Normal','Low'].includes(data.get('priority'))?data.get('priority'):'Normal',participantScope,participantIds:participantScope==='specific'?data.getAll('participantIds').map(String):[]},existing=state.tasks.find(task=>task.id===form.dataset.id);if(existing)Object.assign(existing,values);else state.tasks.push({id:uid('task'),...values,done:false});save();state.modal=null;render()}
  else if(form.id==='shopping-form'){
    // 0.7.7.1 (Test 1, found live): mirrors task-form's own edit-in-place pattern -- an existing
    // entry (data-id set) is updated via Object.assign, preserving its own purchased state; only a
    // brand-new entry (no data-id yet) gets a fresh id and purchased:false.
    const values={name:String(data.get('name')).trim(),quantity:String(data.get('quantity')||'1'),owner:String(data.get('owner')||'shared').trim()||'shared',linkedNeed:String(data.get('linkedNeed')||'').trim(),placeId:String(data.get('placeId')||'').trim()},existing=state.shopping.find(candidate=>candidate.id===form.dataset.id);
    if(existing)Object.assign(existing,values);else state.shopping.push({id:uid('shop'),...values,purchased:false});
    save();state.modal=null;render();
  }
  else if(form.id==='location-form'){const id=form.dataset.id||uid('loc'),existing=state.locationRecords.find(x=>x.id===id),record={id,placeName:String(data.get('placeName')).trim(),address:String(data.get('address')).trim(),coordinates:data.get('lat')&&data.get('lng')?{lat:Number(data.get('lat')),lng:Number(data.get('lng'))}:null,source:String(data.get('source')||'manual'),confidence:String(data.get('confidence')||'medium'),approved:true};if(existing)Object.assign(existing,record);else state.locationRecords.push(record);save();state.modal=null;render()}
  else if(form.id==='add-editor-form'){
    const email=String(data.get('email')||'').trim();if(!email){alert('יש להזין כתובת אימייל.');return}
    try{
      state.trip.editorEmails=await addEditorByEmail(state.trip.id,email);form.reset();render();
      // 0.7.5.1 (V7-F12): this Trip-level grant alone is not enough -- firestore.rules' own
      // isInvited() (checked by listMyTrips' "shared with me" query, among everything else) also
      // requires an active invitations/{email} document, a SEPARATE, admin-only grant. Adding
      // someone here who hasn't been application-invited yet used to succeed silently, leaving them
      // unable to see this Trip (or anything else) the first time they sign in -- landing on the
      // empty-Trip screen with no explanation, whose only action creates an unrelated Trip of their
      // own. Surfaced here, at the point the gap is created, rather than left for the invited
      // person to discover with no explanation.
      const invitation=await getInvitation(email);
      if(!invitation||invitation.state!=='active')alert(`המשתתף נוסף לטיול, אך הכתובת ${email} טרם הוזמנה לשימוש באפליקציה עצמה. יש לבקש ממנהל המערכת להזמין אותה (הגדרות ← ניהול הרשאות גישה), אחרת לא תוכל לגשת לטיול בכניסתה הראשונה.`);
      else notify('המשתתף נוסף');
    }
    catch(error){alert(error.message||'הוספת המשתתף נכשלה.')}
  }
  else if(form.id==='admin-invite-form'){
    const email=String(data.get('email')||'').trim();if(!email){alert('יש להזין כתובת אימייל.');return}
    try{await inviteByEmail(email);form.reset();notify('ההזמנה נוספה');refreshAdminInvitations()}
    catch(error){alert(error.message||'הוספת ההזמנה נכשלה.')}
  }
});
addEventListener('touchstart',event=>{if(event.target.closest('[data-timeline-calendar]'))timelineSwipeStartX=event.changedTouches[0]?.clientX??null},{passive:true});
addEventListener('touchend',event=>{if(timelineSwipeStartX===null||!event.target.closest('[data-timeline-calendar]'))return;const endX=event.changedTouches[0]?.clientX??timelineSwipeStartX,delta=endX-timelineSwipeStartX;timelineSwipeStartX=null;if(Math.abs(delta)<50||state.timelineMode!=='week')return;state.timelineCursor=shiftCursor(state.timelineCursor,'week',delta<0?1:-1);render()},{passive:true});
addEventListener('online',render);addEventListener('offline',render);addEventListener('pagehide',stopCamera);
// Beta 0.8 Phase 1 (design spec V7 S5): the carousel's own keyboard alternative (sequential Tab
// works natively -- real <button> elements). P12-F6 (spec V7.3): the arrow keys follow SCREEN position
// -- Right Arrow selects the neighbour rendered to the right of the selected item, Left Arrow the one
// rendered to the left -- chosen by measured position (arrowKeyTarget), not by a prev/next swap, so it
// holds for the 3+ option carousel, the 2-option case and the wide-screen row alike. The drag gesture
// below keeps its own reading-direction rule. selectParticipant() re-focuses the newly selected item
// once it lands (P11-F15), so the keys keep working.
addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft'].includes(event.key))return;
  const ticketCarouselEl=event.target.closest?.('[data-tcarousel]');
  if(ticketCarouselEl){
    const selectedSlide=ticketCarouselEl.querySelector('[data-pos="selected"]');
    const near=['prev','next'].map(pos=>({pos,element:ticketCarouselEl.querySelector(`[data-pos="${pos}"]`)})).filter(neighbour=>neighbour.element).map(neighbour=>({pos:neighbour.pos,centerX:centerX(neighbour.element)}));
    const way=selectedSlide?arrowKeyTarget(event.key,centerX(selectedSlide),near):null;
    if(way){event.preventDefault();selectTicket(ticketCarouselEl,way)}
    return;
  }
  const carousel=event.target.closest('[data-carousel]');if(!carousel)return;
  const selected=carousel.querySelector('[data-pos="selected"]');if(!selected)return;
  const neighbours=['prev','next'].map(pos=>({pos,element:carousel.querySelector(`[data-pos="${pos}"]`)})).filter(neighbour=>neighbour.element).map(neighbour=>({pos:neighbour.pos,centerX:centerX(neighbour.element)}));
  const target=arrowKeyTarget(event.key,centerX(selected),neighbours);
  if(target){event.preventDefault();carousel.querySelector(`[data-pos="${target}"]`).click()}
});
// Horizontal gestures (pointer events; pointercancel/up end them):
//  - a started Today card (data-swipe-end): the card follows the finger and fades; released past a
//    third of its width it slides out (200ms ease-out) and the cards below close up (180ms), then
//    the item is ended; otherwise it snaps back (160ms). P11-F6.
//  - the participant carousel: the track follows the finger; released past ~a third of a slot it
//    slides one position and selects the previous/next option, otherwise it snaps back. Dragging
//    right selects the next option (reading direction, §5). P11-F14.
// Under prefers-reduced-motion nothing is animated: the card is ended / the option selected at once.
// The click that follows a recognised drag is swallowed.
let drag=null;
addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0){drag=null;return}
  const carousel=event.target.closest('[data-carousel]'),card=event.target.closest('[data-swipe-end]'),tcar=event.target.closest('[data-tcarousel]');
  drag=carousel||card||tcar?{x:event.clientX,y:event.clientY,dx:0,carousel,card,tcar,active:false,slot:carousel?carouselSlotPx(carousel):tcar?(tcar.querySelector('.ticket')?.getBoundingClientRect().width||0)+12:0}:null;
},{passive:true});
addEventListener('pointermove',event=>{
  if(!drag)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active){
    if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return;
    drag.active=true;
    const moving=drag.card||(drag.tcar?drag.tcar.querySelector('.t-track'):drag.carousel.querySelector('.p-carousel-track'));
    moving.style.transition='none';
  }
  drag.dx=dx;
  if(drag.card){
    drag.card.style.transform=`translateX(${dx}px)`;
    drag.card.style.opacity=String(Math.max(.25,1-Math.abs(dx)/drag.card.offsetWidth*.9));
  }else if(drag.tcar){
    const track=drag.tcar.querySelector('.t-track');
    track.style.transform=`translateX(calc(${drag.tcar.dataset.before} * ${TICKET_STRIDE} + ${Math.max(-drag.slot,Math.min(drag.slot,dx))}px))`;
  }else if(drag.slot&&drag.carousel.dataset.layout==='carousel'&&Number(drag.carousel.dataset.count)>=3){
    drag.carousel.querySelector('.p-carousel-track').style.transform=`translateX(${Math.max(-drag.slot,Math.min(drag.slot,dx))}px)`;
  }
},{passive:true});
function finishDrag(){
  if(!drag)return;
  const {carousel,card,tcar,dx,active,slot}=drag;drag=null;
  if(!active)return;
  suppressClickUntil=Date.now()+400;
  const reduced=prefersReducedMotion();
  if(card){
    const width=card.offsetWidth,id=card.dataset.swipeEnd;
    if(Math.abs(dx)>width/3){
      if(reduced){endItem(id);return}
      card.style.transition='transform 200ms ease-out, opacity 200ms ease-out';
      card.style.transform=`translateX(${dx>0?width:-width}px)`;card.style.opacity='0';
      setTimeout(()=>{
        card.style.height=`${card.offsetHeight}px`;void card.offsetHeight;
        card.style.transition='height 180ms ease-out, margin-bottom 180ms ease-out, border-width 180ms ease-out';
        card.style.height='0';card.style.marginBottom='-12px';card.style.borderWidth='0';
      },200);
      setTimeout(()=>endItem(id),390);
    }else{
      card.style.transition=reduced?'none':'transform 160ms ease-out, opacity 160ms ease-out';
      card.style.transform='';card.style.opacity='';
    }
    return;
  }
  if(tcar){
    const way=Math.abs(dx)>=Math.min(40,(slot||120)/3)?(dx>0?'next':'prev'):null;
    if(way)selectTicket(tcar,way);
    else{const strip=tcar.querySelector('.t-track');strip.style.transition=reduced?'none':'transform 160ms ease-out';strip.style.transform=''}
    return;
  }
  const track=carousel.querySelector('.p-carousel-track');
  const direction=dx>0?'next':'prev';
  const target=Math.abs(dx)>=Math.min(40,(slot||120)/3)?carousel.querySelector(`[data-pos="${direction}"]`):null;
  if(target)selectParticipant(carousel,target.dataset.participant);
  else{track.style.transition=reduced?'none':'transform 160ms ease-out';track.style.transform='translateX(0)'}
}
addEventListener('pointerup',finishDrag);
addEventListener('pointercancel',finishDrag);
addEventListener('scroll',closeMoreMenu,{passive:true,capture:true});
addEventListener('resize',closeMoreMenu);
addEventListener('keydown',event=>{if(event.key==='Escape')closeMoreMenu()});
// Remember whether the user opened the collapsed "הסתיימו היום" section, so the minute refresh and
// any other render() keep it open.
addEventListener('toggle',event=>{if(event.target.matches?.('.done-today'))doneTodayOpen=event.target.open},true);
// P11-F16: the layout depends on the measured width, and nothing else re-renders on resize or
// rotation -- re-render Packing only when a resize actually crosses between row and carousel.
let resizeTimer=null;
addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    if(state.view==='packing'&&!state.modal&&lastParticipantLayout&&currentParticipantLayout(packingParticipantCount())!==lastParticipantLayout)render();
  },150);
});
// Beta 0.8 Phase 1: bridge from main.js's own account-bar settings button (see its own comment) --
// this module owns route()/state.view, main.js deliberately doesn't reach into either directly.
addEventListener('familytrips:open-settings',()=>route('settings'));
// Phase 1.1: Today's leading card, "עכשיו"/relative-time labels and the 3h rules all depend on the
// current time, which nothing else re-renders for -- refresh once a minute, only while Today is on
// screen with no form open and the tab visible, so it never interrupts typing or another screen.
setInterval(()=>{if(state.view==='today'&&!state.modal&&document.visibilityState==='visible')render()},60000);
render();boot();
