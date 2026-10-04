import {ITEM_TYPES,TRANSPORT_MODES,TYPE_FIELDS,buildItemFormValues,confirmNeedsReviewField,createSuggestions,findPossibleDuplicates,flagReversedFlightDirection,isDismissibleWarning,manualCreateDefaults,mapsUrl,normalizeUrlInput,reconcileStaleNeedsReview,resolveMergeCandidate,resolveParticipantIdsFromDraft,scheduleForType,suggestionReviewDefaults,suggestionToItem,validateSource} from './ingestion.js';
import {extractSourceContent,sha256File} from './content-extraction.js';
import {MultipartQrCollector,decodeExternalText,importBatchToApp} from './external-import.js';
import {availableTimelineModes,backfillTripDates,currentOperational,filterAndSortTasks,isDeletionEligible,isItemOutsideTrip,normalizeDateRange,normalizeOperationalState,packingDuplicate,periodBounds,QUARANTINE_DELETION_ELIGIBLE_DAYS,quickAccessTasks,sanitizeTripDates,shiftCursor,sortItemsByStartAt,TASK_DUE_SCOPES,TRANSPORT_TYPES,itemStartMs,selectLeading,today,uniqueRecordsById,upNextItem} from './operational-data.js';
import {normalizeProposalLifecycle,rejectProposal} from './proposal-lifecycle.js';
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
const EMPTY={trip:null,items:[],sources:[],suggestions:[],rejectedSuggestions:[],packing:[],games:[],tasks:[],shopping:[],locationRecords:[],participants:[],view:'today',category:null,itemId:null,suggestionId:null,modal:null,timelineMode:'all',timelineCursor:'',calendarDate:null,toast:null,packingParticipantView:'shared'};
const qrCollector=new MultipartQrCollector();
let cameraStream=null,cameraTimer=null;
let timelineSwipeStartX=null;
let suppressClickUntil=0,endSwipe=null;
// Captured synchronously on file selection so an unrelated render() (which replaces the
// whole #app tree, including the <input type=file>) can never wipe the chosen file — the
// underlying cause of the file "disappearing" from Add and of the false "no document
// selected" error while an analysis request is already in flight.
let pendingSourceFile=null;
let ingestBusy=false;
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
    notify('שמירת השינויים בענן נכשלה. השינויים נשארים במסך זה בלבד עד לחיבור מחדש.');
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
  const {view,category,itemId,suggestionId,modal,timelineMode,calendarDate,toast,packingParticipantView}=state;
  state={...clone(EMPTY),...remoteState,view,category,itemId,suggestionId,modal,timelineMode,calendarDate,toast,packingParticipantView};
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
    notify(`טעינת נתוני הטיול נכשלה (${error?.code||'שגיאה'}). ${navigator.onLine?'נסו שוב.':'אין חיבור לאינטרנט וייתכן שהנתונים לא נשמרו במטמון המקומי.'}`);
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
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
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
function route(view,options={}){stopCamera();if(view==='timeline'&&state.view!=='timeline'){state.timelineMode='all';state.timelineCursor=state.trip?.startDate||today();state.calendarDate=null}state.view=view;state.category=options.category||null;state.itemId=options.itemId||null;state.suggestionId=options.suggestionId||null;render();const anchorTarget=options.anchor?document.getElementById(options.anchor)||(options.anchor==='item-tickets'?document.getElementById('item-documents'):null):null;if(anchorTarget)anchorTarget.scrollIntoView();else scrollTo(0,0)}
function notify(text){state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},2600)}
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
function header(){const destination=destinationSummary();return `<header class="top"><div class="top-in"><div class="brand"><img src="/assets/icons/icon-192.png" alt=""><div><h1>${esc(state.trip?.name||'Family Trips')}</h1><p>${destination?`${destination} · `:''}${state.trip?.startDate?`${fmt(state.trip.startDate,false)} — ${state.trip.endDate?fmt(state.trip.endDate,false):'ללא סיום'}`:`${appVersionLabel()} · Hotel + Flight Smart Import`}</p></div></div><span class="status">${status()}</span></div></header>`}
function empty(){return '<section class="card hero empty"><div class="big">🧭</div><h2>מתחילים מטיול ריק</h2><p class="muted">העלה מקור, ייבא JSON/QR או הזן פריט ידנית.</p><div class="actions center-actions"><button class="btn" data-action="create">הוספה</button></div></section>'}
// 0.7.3.1: shown only before bootResolved -- see its own declaration for why this is a distinct
// state from empty() rather than reusing it.
function loading(){return '<section class="card hero empty"><div class="big">⏳</div><h2>טוען…</h2></section>'}
// 0.7.4: a Transport (`car`) item's badge shows its specific sub-type (TRANSPORT_MODES) instead of
// the generic type label -- a stored-but-never-surfaced transportMode would defeat the point of
// asking for it; every other type is unaffected, still shows ITEM_TYPES' own generic label.
function itemRow(item){const badgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label||item.type;return `<button class="row ${conflict(item)?'conflict':''}" data-route="detail" data-id="${item.id}"><span class="row-main"><b>${ITEM_TYPES[item.type]?.icon||'📌'} ${esc(item.title)}</b><small class="muted">${item.provider?`${esc(item.provider)} · `:''}${item.schedule==='entire'?'לכל הטיול':item.schedule==='none'?'ללא תאריך':item.schedule==='range'?`${fmt(item.startAt,true,item.dateMeta?.startPrecision)} — ${fmt(item.endAt,true,item.dateMeta?.endPrecision)}`:fmt(item.startAt,true,item.dateMeta?.startPrecision)}</small></span>${conflict(item)?'<span class="badge warn">מחוץ לטווח</span>':`<span class="badge">${esc(badgeLabel)}</span>`}</button>`}
function suggestionRow(suggestion){const source=sourceById(suggestion.sourceId);return `<button class="row suggestion-row" data-route="suggestion" data-id="${suggestion.id}"><span class="row-main"><b>✨ ${esc(suggestion.proposed.title)}</b><small class="muted">${esc(source?.name||'ייבוא חיצוני')} · ביטחון ${confidenceLabel(suggestion.confidence)}</small></span><span class="badge ${suggestion.status==='pending'?'warn':'blue'}">${({pending:'ממתין לאישור',deferred:'אחר כך',rejected:'נדחה',approved:'אושר'})[suggestion.status]||suggestion.status}</span></button>`}
function archivedSuggestionRow(suggestion){const source=sourceById(suggestion.sourceId);return `<div class="row suggestion-row archived-suggestion"><span class="row-main"><b>🗄️ ${esc(suggestion.proposed.title)}</b><small class="muted">${esc(source?.name||'ייבוא חיצוני')} · הועבר לארכיון</small></span><span class="badge">נדחה</span></div>`}
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
const tabler=name=>`<svg class="ti" viewBox="0 0 24 24" aria-hidden="true">${TABLER[name]}</svg>`;
function dayItemActions(item,{endable=false}={}){
  const place=item.details?.canonicalPlace;
  const navHref=place?place.googleMapsUri||mapsUrl(`${place.latitude},${place.longitude}`):item.location?mapsUrl(mapSearchLocation(item)):'';
  return [
    navHref?`<a class="btn secondary" href="${esc(navHref)}" target="_blank" rel="noopener">${tabler('compass')} ניווט</a>`:'',
    item.website?`<a class="btn ghost" href="${esc(item.website)}" target="_blank" rel="noopener">${tabler('world')} אתר</a>`:'',
    hasConfirmedTicket(item)?`<button class="btn ghost" data-route="detail" data-id="${item.id}" data-anchor="item-tickets">${tabler('ticket')} כרטיסים</button>`:'',
    endable?`<button class="btn ghost" data-action="item-end" data-id="${item.id}">${tabler('check')} הסתיים</button>`:'',
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
// F6: manual "הסתיים" -- persisted on the item itself (a normal synced field, so every device and a
// reload agree). Cleared to '' rather than deleted by item-unend, so both stay plain field writes.
function endItem(id){const item=state.items.find(candidate=>candidate.id===id);if(!item)return;item.endedAt=new Date().toISOString();save();notify('הפריט סומן כהסתיים')}
// F10a: a needs-attention card must say what is wrong. Out-of-range date is the only condition
// Today has data for today (more conditions are backlog item F10b); with several, show a count.
function attentionReasons(item){return conflict(item)?['התאריך מחוץ לטווח הטיול']:[]}
// F6: only a leading item that has actually started can be ended early (button, or a horizontal
// swipe on the card -- see the pointer listeners at the bottom of this file).
function dayItemCard(item,{leading=false}={}){
  const reasons=attentionReasons(item),attention=reasons.length>0;
  const endable=leading&&itemStartMs(item)<=Date.now();
  const detail=TRANSPORT_TYPES.includes(item.type)?mapSearchLocation(item)||item.location:item.provider||item.location;
  const timeArea=leading?`<bdi class="rel-time">${esc(relativeTimeLabel(item.startAt))}</bdi><span class="imminent-dot"></span><bdi>${esc(timeOnly(item.startAt))}</bdi>`:`<bdi>${esc(timeOnly(item.startAt))}</bdi>`;
  const actions=dayItemActions(item,{endable});
  return `<div class="day-item ${leading?'leading':''} ${attention?'needs-attention':''}" ${endable?`data-swipe-end="${item.id}"`:''}><button class="day-item-main" data-route="detail" data-id="${item.id}"><span class="day-item-time">${timeArea}</span><span class="day-item-body"><b>${attention?`<span class="urgency-icon-attention">${tabler('alert')}</span> `:''}${esc(item.title)}</b>${attention?`<p class="attention-reason">${reasons.length===1?reasons[0]:`${reasons.length} בעיות`}</p>`:''}${detail?`<p><bdi>${esc(detail)}</bdi>${item.confirmationNumber?` · <bdi>${esc(item.confirmationNumber)}</bdi>`:''}</p>`:''}</span></button>${actions?`<div class="day-item-actions">${actions}</div>`:''}</div>`;
}
// F3 (Fix B): a quiet "next in line" line below Today's plan -- never a card in the plan itself.
// Always shows the day/date above the time (the old row showed time only, so a Jan 7 flight read as
// happening today), no fill, no accent, no actions; tapping opens the item. upNextItem() decides
// whether there is one at all (48h, or 7 days for transport; never an out-of-range item).
function upNextLine(item){
  const start=new Date(item.startAt.length===10?`${item.startAt}T12:00:00`:item.startAt);
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const day=today(start)===today(tomorrow)?'מחר':new Intl.DateTimeFormat('he-IL',{weekday:'short',day:'numeric',month:'short'}).format(start);
  return `<button class="up-next" data-route="detail" data-id="${item.id}"><span class="up-next-when"><bdi>${esc(day)}</bdi><bdi>${esc(timeOnly(item.startAt))}</bdi></span><span class="up-next-body"><small class="muted">הבא בתור</small><b>${esc(item.title)}</b></span></button>`;
}
function todayView(){
  if(!state.trip)return empty();
  const op=currentOperational(state.items);
  // Beta 0.8 Phase 1.1 (F3): Today's plan lists ONLY today's own items. op.next used to be folded
  // into this list and rendered time-only, so a Jan 7 flight read as happening today -- it now
  // appears separately, as the quiet "הבא בתור" line (upNextItem: within 48h, 7 days for transport,
  // never out of range). An item the user ended (F6, endedAt) is gone from Today entirely.
  const todayAll=op.todayItems.filter(item=>!item.endedAt);
  const upNext=upNextItem(state.items,state.trip);
  const pending=state.suggestions.filter(s=>['pending','deferred'].includes(s.status));
  const eligibleTasks=state.tasks.filter(task=>!task.done),tasks=quickAccessTasks(eligibleTasks,today(),3),shownIds=new Set([...todayAll,upNext].filter(Boolean).map(item=>item.id));
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
  // unnoticed, without displacing genuinely current content. Unchanged by Phase 1.1: "nothing
  // relevant" still means no item today and no item after today at all (op.todayItems / op.next).
  const outOfRange=op.todayItems.length||op.next?[]:sortItemsByStartAt(state.items.filter(item=>isItemOutsideTrip(item,state.trip)));
  // Beta 0.8 Phase 1 (design spec V7 S4): the leading action card -- present, it's the "Busy
  // day"/"Transit or flight day" case (one leading card + the compact remainder, no game
  // suggestion); absent, it's the calm/free-day case: a plain compact list plus the spec's own "one
  // game suggestion, only on a free day". Phase 1.1 (F6): selectLeading() compares on the device's
  // own local clock (it used to compare local item times to a UTC string), keeps the current item
  // as "עכשיו" until the next one starts, lets a transport item take over 3h before it departs, and
  // auto-clears the last item of the day 3h after it started.
  const dayList=todayAll.length?todayAll:outOfRange;
  const leading=selectLeading(todayAll);
  const rest=dayList.filter(item=>item!==leading);
  const suggestedGame=!leading&&state.games.length?[...state.games].sort((a,b)=>Number(b.favorite)-Number(a.favorite))[0]:null;
  const outOfRangeNote=outOfRange.length?'<p class="muted small">אין אירועים רלוונטיים היום — מוצגים פריטים מחוץ לטווח תאריכי הטיול לבדיקה.</p>':'';
  const todayList=rest.length?rest.map(item=>dayItemCard(item)).join(''):dayList.length?'':'<div class="empty compact"><p class="muted">אין תכניות נוספות היום.</p></div>';
  const destinationLabel=(state.trip.destinationCountries||[]).join('، ');
  return `<section class="card hero"><h2>היום</h2><p class="today-status">${destinationLabel?`${esc(destinationLabel)} · `:''}${fmt(today(),false)}</p>${outOfRangeNote}${leading?dayItemCard(leading,{leading:true}):''}<div class="today-section-label">היום בתכנית</div><div class="list">${todayList}</div>${upNext?upNextLine(upNext):''}${suggestedGame?`<div class="row day-item"><span class="row-main"><b>🎲 ${esc(suggestedGame.title)}</b><small class="muted">הצעת משחק ליום פנוי</small></span><button class="btn ghost" data-route="games">כל המשחקים</button></div>`:''}</section><section class="card"><div class="section-head"><h3>גישה מהירה</h3>${quickLinks}</div>${quickContent}</section>${pending.length?`<section class="card"><div class="section-head"><h3>הצעות לבדיקה</h3><span class="badge warn">${pending.length}</span></div><div class="list">${pending.map(suggestionRow).join('')}</div></section>`:''}`;
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
function sourceRow(source,itemType,itemId){const available=source.kind==='link'||source.storedOffline;const analyzing=source.processingState==='processing';const canAnalyze=!analyzing&&source.kind!=='link'&&['saved_only','failed'].includes(source.processingState)&&source.storedOffline;const participantNames=(source.participantIds||[]).map(id=>state.participants.find(p=>p.id===id)?.name).filter(Boolean);const ticketEligible=['flight','activity','car'].includes(itemType);const canOfferTicket=ticketEligible&&participantNames.length&&!source.ticketConfirmed;const ticketControls=source.ticketConfirmed?`<span class="badge blue">כרטיס מאושר</span><label class="checkbox-field"><input type="checkbox" data-action="source-ticket-toggle-used" data-id="${source.id}" ${source.ticketUsed?'checked':''}> נוצל</label>`:canOfferTicket?`<button class="btn secondary" data-action="source-confirm-ticket" data-id="${source.id}">אישור ככיסוי כרטיס</button>`:'';return `<div class="row"><span class="row-main"><b>${source.kind==='link'?'🔗':'📎'} ${esc(source.name||source.url)}</b><small class="muted">${source.kind==='link'?'קישור':'מסמך'} · ${esc(source.status)} · ${available?'זמין':'הקובץ אינו זמין אופליין'}${participantNames.length?` · שויך ל: ${esc(participantNames.join(', '))}`:''}</small></span>${analyzing?'<span class="badge blue">מנתח…</span>':''}${source.processingState==='failed'?'<span class="badge warn">ניתוח נכשל</span>':''}${state.participants.length?`<button class="btn ghost" data-action="source-edit-participants" data-id="${source.id}">שיוך למשתתף</button>`:''}${ticketControls}${canAnalyze?`<button class="btn secondary" data-action="analyze-source" data-id="${source.id}">ניתוח חכם</button>`:''}${source.kind==='link'?`<a class="btn ghost" href="${esc(source.url)}" target="_blank" rel="noopener">פתיחה</a>`:available?`<button class="btn ghost" data-action="open-source" data-id="${source.id}">פתיחה</button>`:'<span class="badge warn">מטא־נתונים בלבד</span>'}${itemId?`<button class="btn danger" data-action="source-unlink" data-id="${source.id}" data-item-id="${itemId}">הסרה</button>`:''}</div>`}

function gamesView(){const games=[...state.games].sort((a,b)=>Number(b.favorite)-Number(a.favorite));return `<section class="card"><h2>🎲 Games / Activities</h2><p class="muted">ההוראות נשמרות מקומית וזמינות גם ללא אינטרנט.</p><div class="game-grid">${games.map(game=>`<article class="card game-card"><div class="section-head"><h3>${esc(game.title)}</h3><button class="icon-btn ${game.favorite?'favorite':''}" data-action="game-favorite" data-id="${game.id}" aria-label="מועדף">★</button></div><p>${esc(game.instructions)}</p><dl><dt>ציוד</dt><dd>${esc(game.items)}</dd><dt>מתאים ל</dt><dd>${esc(game.participants)}</dd><dt>משך</dt><dd>${esc(game.duration)}</dd></dl></article>`).join('')}</div></section>`}
// 0.7.4: shared list + personal list per participant, with switching between them (MVP scope's
// own wording). An item with no participantIds is shared; the "shared" view shows only those, and
// a specific participant's view shows their own items PLUS every shared one -- their own personal
// list, not a narrower filter of the shared list.
function visiblePackingItems(list){
  const view=state.packingParticipantView||'shared',items=list.items||[];
  if(view==='shared')return items.filter(item=>!(item.participantIds||[]).length);
  return items.filter(item=>!(item.participantIds||[]).length||(item.participantIds||[]).includes(view));
}
// Beta 0.8 Phase 1 (design spec V7 S5), reworked in Phase 1.1 (F15/F16/F18): the participant
// selection carousel. It no longer scrolls: it renders only the selected option plus one neighbour
// on each side (previous / next, wrapping around when there are 3 or more options -- an endless
// loop that never dead-ends at two visible), and a swipe, an arrow key or a tap simply selects the
// previous/next option and re-renders. One swipe therefore moves exactly one option by
// construction (F15), with no scroll-snap or overshoot to tune. Exactly 2 options: both shown, no
// loop, no repeats. Dots show the selected option's real position. Per §5 this suits 2-6 options;
// from 7 the caller uses participantChips() instead ("do not use a carousel for a long list").
// data-pos (prev/selected/next) is what the pointer and keydown delegates at the bottom of this
// file act on.
function participantCarousel(options,selectedValue,action){
  const count=options.length,index=Math.max(0,options.findIndex(([value])=>value===selectedValue));
  const at=position=>options[(position+count)%count];
  const slots=count>=3?[[at(index-1),'prev'],[at(index),'selected'],[at(index+1),'next']]:options.map((option,position)=>[option,position===index?'selected':position<index?'prev':'next']);
  return `<div class="p-carousel" data-carousel><div class="p-carousel-track" role="listbox" aria-label="בחירת משתתף">${slots.map(([[value,label],pos])=>`<button class="p-carousel-item ${pos}" role="option" aria-selected="${pos==='selected'}" data-action="${action}" data-participant="${value}" data-pos="${pos}"><span class="p-carousel-avatar">${esc(label.slice(0,1))}</span><span>${esc(label)}</span></button>`).join('')}</div><div class="p-carousel-dots">${options.map((option,position)=>`<span class="${position===index?'active':''}"></span>`).join('')}</div></div>`;
}
// F18: 7+ options -- compact chips in one horizontally scrollable row (ink selected, white/bordered
// others, no terracotta fill, no wrapping), instead of the old large wrapping button grid.
function participantChips(options,selectedValue,action){
  return `<div class="p-chips" role="listbox" aria-label="בחירת משתתף">${options.map(([value,label])=>`<button class="p-chip ${selectedValue===value?'selected':''}" role="option" aria-selected="${selectedValue===value}" data-action="${action}" data-participant="${value}">${esc(label)}</button>`).join('')}</div>`;
}
function packingView(){if(!state.trip)return empty();const activeParticipants=state.participants.filter(participant=>participant.active!==false);const participantOptions=[['shared','משותף'],...activeParticipants.map(participant=>[participant.id,participant.name])];return `<section class="card"><div class="section-head"><div><h2>רשימות אריזה</h2><p class="muted">פריטים שסומנו עוברים לאזור "נארזו" וניתן להחזירם.</p></div><button class="btn" data-action="add-list">קטגוריה חדשה</button></div>${!activeParticipants.length?'':participantOptions.length<=6?participantCarousel(participantOptions,state.packingParticipantView||'shared','packing-view-participant'):participantChips(participantOptions,state.packingParticipantView||'shared','packing-view-participant')}${state.packing.map(list=>{const visible=visiblePackingItems(list),active=visible.filter(item=>!item.done),packed=visible.filter(item=>item.done),collapsed=state.packingCollapsed[list.id];return `<section class="card nested"><button class="section-head collapse-button" data-action="pack-collapse" data-list="${list.id}"><h3>${esc(list.name)}</h3><span class="badge">${packed.length}/${visible.length}</span></button>${collapsed?'':`<div class="progress"><span style="width:${visible.length?packed.length/visible.length*100:0}%"></span></div>${active.map(packRow.bind(null,list)).join('')||'<p class="muted">הכול נארז.</p>'}<button class="btn secondary" data-action="pack-add" data-list="${list.id}">הוספת פריט</button>${packed.length?`<details ${state.packedCollapsed?'':'open'}><summary>נארזו (${packed.length})</summary>${packed.map(packRow.bind(null,list)).join('')}</details>`:''}`}</section>`}).join('')}</section>`}
function packRow(list,item){const participantNames=(item.participantIds||[]).map(id=>state.participants.find(participant=>participant.id===id)?.name).filter(Boolean);return `<div class="pack-row-wrapper"><label class="check-row ${item.done?'done':''}"><input type="checkbox" data-action="pack-toggle" data-list="${list.id}" data-item="${item.id}" ${item.done?'checked':''}><span>${esc(item.name)} ${participantNames.length?`<small class="badge blue">${participantNames.map(esc).join(', ')}</small>`:item.owner&&item.owner!=='shared'?`<small class="badge blue">${esc(item.owner)}</small>`:''}</span></label><button class="btn ghost" data-action="pack-edit" data-list="${list.id}" data-item="${item.id}">עריכה</button><button class="btn danger" data-action="pack-delete" data-list="${list.id}" data-item="${item.id}">מחיקה</button></div>`}
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
  const isFiltered=filters.priority!=='all'||filters.due!=='all'||(filters.status||'all')!=='all'||(filters.participant||'all')!=='all';
  // 0.7.9 correction round 3 (Finding 3): a fourth filter alongside the existing three, same
  // <select>-based pattern, not a separate view-switcher like packing's own participant tabs --
  // only rendered when the Trip actually has participants, matching every other participant
  // picker's own gating throughout this codebase.
  const participantFilter=state.participants.length?`<label class="field"><span>משתתף</span><select id="task-filter-participant"><option value="all" ${(filters.participant||'all')==='all'?'selected':''}>כל המשתתפים</option>${state.participants.map(participant=>`<option value="${participant.id}" ${filters.participant===participant.id?'selected':''}>${esc(participant.name)}</option>`).join('')}</select></label>`:'';
  return `<section class="card"><div class="section-head"><h2>✅ הכנות ומשימות</h2><button class="btn" data-action="task-add">משימה חדשה</button></div><div class="task-filters"><label class="field"><span>עדיפות</span><select id="task-filter-priority">${priorityOptions.map(([value,label])=>`<option value="${value}" ${filters.priority===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>תאריך יעד</span><select id="task-filter-due">${dueOptions.map(([value,label])=>`<option value="${value}" ${filters.due===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>סטטוס</span><select id="task-filter-status">${statusOptions.map(([value,label])=>`<option value="${value}" ${(filters.status||'all')===value?'selected':''}>${label}</option>`).join('')}</select></label>${participantFilter}${isFiltered?'<button class="btn ghost" data-action="task-filter-clear">איפוס</button>':''}</div><div class="list">${filtered.length?filtered.map(taskRow).join(''):`<p class="muted">${state.tasks.length?'אין משימות התואמות לסינון.':'אין משימות.'}</p>`}</div></section>`;
}
// 0.7.9 correction (V7-F10, Test 4): owner is no longer displayed -- Product Owner decision to
// remove it in favor of participantAssignmentLabel(task) alone (reuses the exact function Items'
// own detailView() already calls, generic over any object carrying participantScope/
// participantIds). An already-existing task's own stored owner value, if any, simply goes
// unread here -- not deleted from Firestore, just no longer shown (see the task-form modal's own
// comment for the same non-destructive reasoning).
function taskRow(task){const priorityLabel={High:'גבוהה',Normal:'רגילה',Low:'נמוכה'}[task.priority]||'רגילה';const participantLabel=participantAssignmentLabel(task);return `<article class="row check-row task-row ${task.done?'done':''}"><input type="checkbox" data-action="task-toggle" data-id="${task.id}" aria-label="סימון משימה" ${task.done?'checked':''}><span class="row-main"><b>${esc(task.title)}</b><small class="muted">${participantLabel?esc(participantLabel)+' · ':''}${task.mode==='entire'?'לכל הטיול':task.mode==='none'?'ללא תאריך':task.dueDate?fmt(task.dueDate,false):'ללא תאריך'} · <span class="badge priority-${task.priority||'Normal'}">${priorityLabel}</span></small></span><button class="btn ghost task-edit" data-action="task-edit" data-id="${task.id}">עריכה</button><button class="btn danger" data-action="task-delete" data-id="${task.id}">מחיקה</button></article>`}
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
function shoppingRow(item,placeById){
  const place=item.placeId?placeById.get(item.placeId):null;
  return `<div class="pack-row-wrapper"><label class="row check-row ${item.purchased?'done':''}"><input type="checkbox" data-action="shopping-toggle" data-id="${item.id}" ${item.purchased?'checked':''}><span class="row-main"><b>${esc(item.name)} × ${esc(item.quantity||'1')}</b><small class="muted">${item.owner&&item.owner!=='shared'?esc(item.owner):'משותף'}${item.linkedNeed?` · ${esc(item.linkedNeed)}`:''}${place?` · 📍 ${esc(place.title)}`:''}</small></span></label><button class="btn ghost" data-action="shopping-edit" data-id="${item.id}">עריכה</button></div>`;
}
function shoppingView(){
  const places=sortItemsByStartAt(state.items.filter(item=>item.type==='shoppingPlace'));
  const placeById=new Map(places.map(place=>[place.id,place]));
  // 0.7.7.1 (Test 1, found live): mirrors packingView's own active/packed split exactly -- a
  // purchased item moves into a collapsed-by-default <details> section (state.shoppingPurchasedCollapsed,
  // same defaulting as packedCollapsed) instead of staying inline, still shown, still re-toggleable.
  const active=state.shopping.filter(item=>!item.purchased),purchased=state.shopping.filter(item=>item.purchased);
  return `<section class="card"><div class="section-head"><h2>🛒 קניות</h2></div><div class="section-head"><h3>מקומות קניות</h3><button class="btn" data-action="shopping-place-add">מקום חדש</button></div><div class="list">${places.length?places.map(itemRow).join(''):'<p class="muted">אין מקומות קניות שמורים.</p>'}</div><div class="section-head"><h3>רשימת קניות</h3><button class="btn" data-action="shopping-add">פריט חדש</button></div><div class="list">${active.length?active.map(item=>shoppingRow(item,placeById)).join(''):'<p class="muted">אין פריטי קניות.</p>'}</div>${purchased.length?`<details ${state.shoppingPurchasedCollapsed?'':'open'}><summary>נרכש (${purchased.length})</summary><div class="list">${purchased.map(item=>shoppingRow(item,placeById)).join('')}</div></details>`:''}</section>`;
}
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
// V6-F74: a warning backed by a still-live needsReviewRef (isDismissibleWarning returns false --
// this is the ONLY case it does) previously rendered with no action at all, since dismiss is
// deliberately withheld for exactly this shape (see isDismissibleWarning's own comments). Offers
// the missing "confirm this reading as correct, no value change needed" action instead of a plain
// dismiss, wired to confirmNeedsReviewField (ingestion.js) via the same scope/id convention
// resolve-merge-candidate already uses.
function warningRow(warning,details,scope,id,index){
  const dismissible=isDismissibleWarning(warning,details);
  const ref=!dismissible&&typeof warning==='object'&&warning!==null?warning.needsReviewRef:null;
  const action=dismissible?`<button class="link-button" type="button" data-action="${scope==='item'?'dismiss-item-warning':'dismiss-warning'}" data-id="${id}" data-index="${index}">התעלמות</button>`:ref?`<button class="link-button" type="button" data-action="confirm-needs-review" data-scope="${scope}" data-id="${id}" data-key="${esc(ref.key)}" data-value="${esc(String(ref.value))}">אישור כנכון</button>`:'';
  return `<div class="warning-row">⚠️ ${esc(warningText(warning))}${action}</div>`;
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
function ticketsSection(item){
  if(!['flight','activity','car'].includes(item.type))return '';
  const confirmedSources=state.sources.filter(source=>item.sourceIds?.includes(source.id)&&source.ticketConfirmed);
  const coveredIds=new Set(confirmedSources.flatMap(source=>source.participantIds||[]));
  const remaining=state.participants.filter(participant=>participant.active!==false&&!coveredIds.has(participant.id));
  return remaining.length?`<h3 id="item-tickets">כיסוי כרטיסים</h3><p class="muted">משתתפים ללא כרטיס: ${remaining.map(participant=>esc(participant.name)).join(', ')}</p>`:'';
}
function detailView(){const item=state.items.find(candidate=>candidate.id===state.itemId);if(!item)return '<section class="card">הפריט לא נמצא.</section>';const sources=state.sources.filter(source=>item.sourceIds?.includes(source.id)),place=item.details?.canonicalPlace,contactActions=[place?`<a class="btn secondary" href="${esc(place.googleMapsUri||mapsUrl(`${place.latitude},${place.longitude}`))}" target="_blank" rel="noopener">🧭 ניווט</a>`:item.location?`<a class="btn secondary" href="${mapsUrl(mapSearchLocation(item))}" target="_blank" rel="noopener">🧭 חיפוש במפה</a>`:'',item.website?`<a class="btn ghost" href="${esc(item.website)}" target="_blank" rel="noopener">🌐 קישור</a>`:'',item.phone?`<a class="btn ghost" href="tel:${esc(item.phone)}">☎️ התקשרות</a>`:'',item.email?`<a class="btn ghost" href="mailto:${esc(item.email)}">✉️ אימייל</a>`:''].filter(Boolean).join('');const warningEntries=itemWarningEntries(item);const insuredByList=item.type!=='insurance'?insuranceCoveringItems(item):[];const linkedShoppingList=item.type==='shoppingPlace'?linkedShoppingListEntries(item):[];const detailBadgeLabel=item.type==='car'&&item.transportMode?TRANSPORT_MODES[item.transportMode]||ITEM_TYPES.car.label:ITEM_TYPES[item.type]?.label;return `<section class="card ${conflict(item)?'conflict':''}"><button class="btn ghost" data-route="center" data-cat="${item.type}">חזרה</button><h2>${ITEM_TYPES[item.type]?.icon||'📌'} ${esc(item.title)}</h2><p><span class="badge">${esc(detailBadgeLabel)}</span></p>${item.endedAt?`<p class="muted">סומן כהסתיים · <button class="btn ghost" data-action="item-unend" data-id="${item.id}">ביטול</button></p>`:''}${item.provider?`<p><b>ספק:</b> ${esc(item.provider)}</p>`:''}${item.confirmationNumber?`<p><b>מספר הזמנה:</b> ${esc(item.confirmationNumber)}</p>`:''}${item.location?`<p><b>מיקום:</b> ${esc(item.location)} ${place?'<span class="badge blue">אומת</span>':'<span class="badge warn">שם לחיפוש</span>'}</p>`:''}${contactActions?`<div class="actions">${contactActions}</div>`:''}${item.startAt?`<p><b>מועד:</b> ${fmt(item.startAt,true,item.dateMeta?.startPrecision)}</p>`:''}${item.endAt?`<p><b>סיום:</b> ${fmt(item.endAt,true,item.dateMeta?.endPrecision)}</p>`:''}${participantAssignmentLabel(item)?`<p><b>משויך ל:</b> ${esc(participantAssignmentLabel(item))}</p>`:''}${insuredByList.map(policy=>`<button class="row" data-route="detail" data-id="${policy.id}">🛡️ מבוטח באמצעות ${esc(policy.title)}</button>`).join('')}${item.notes?`<p class="preserve-lines">${esc(item.notes)}</p>`:''}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,item.details,'item',item.id,index)).join('')}</div>`:''}${mergeCandidatePanel('item',item.id,item,item.details)}${item.type==='flight'?flightSummaryBlock(item.details):''}${item.type==='activity'?activitySummaryBlock(item.details):''}${item.type==='insurance'?insuranceSummaryBlock(item.details):''}${item.type==='insurance'?relatedItemsPanel(item):''}${ticketsSection(item)}${linkedShoppingList.length?`<h3>פריטי קניות מקושרים</h3><div class="list">${linkedShoppingList.map(entry=>`<div class="pack-row-wrapper"><label class="row check-row ${entry.purchased?'done':''}"><input type="checkbox" data-action="shopping-toggle" data-id="${entry.id}" ${entry.purchased?'checked':''}><span class="row-main"><b>${esc(entry.name)} × ${esc(entry.quantity||'1')}</b></span></label><button class="btn ghost" data-action="shopping-edit" data-id="${entry.id}">עריכה</button></div>`).join('')}</div>`:''}<h3 id="item-documents">מסמכים</h3>${sources.length?`<div class="list">${sources.map(source=>sourceRow(source,item.type,item.id)).join('')}</div>`:'<p class="muted">אין מסמכים מצורפים.</p>'}<div class="actions">${['hotel','flight','activity','insurance','car'].includes(item.type)?`<button class="btn" data-action="attach-source" data-id="${item.id}">הוספת מסמך</button>`:''}<button class="btn secondary" data-action="edit-item" data-id="${item.id}">עריכה</button><button class="btn danger" data-action="delete-item" data-id="${item.id}">מחיקה</button></div></section>`}
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
  return `<section class="card"><button class="btn ghost" data-route="center" data-cat="document">חזרה</button><div class="section-head"><div><h2>${isUpdate?'בדיקת הצעת עדכון':'בדיקת הצעה'}</h2><p class="muted">${isUpdate?existingItemUnchangedNotice(p.type):'המידע יישמר כפריט רק לאחר אישור מפורש.'}</p></div><span class="badge ${experimental||suggestion.confidence==='low'?'warn':'blue'}">${experimental?'PDF ניסיוני':`ביטחון ${confidenceLabel(suggestion.confidence)}`}</span></div>${experimental?'<div class="experimental-warning"><b>קליטה ניסיונית:</b> יש לבדוק כל שדה. מידע חסר נשאר ריק והקובץ המקורי נשמר.</div>':''}<div class="source-summary"><b>מקורות:</b> ${sources.map(source=>esc(source.name)).join(', ')||'ייבוא חיצוני'}</div>${suggestion.origin==='external-import'?'<div class="privacy-warning">🔒 ה־QR אינו מוצפן. אין לשתף אותו בפומבי.</div>':''}${warningEntries.length?`<div class="warning-list">${warningEntries.map(({warning,index})=>warningRow(warning,p.details,'suggestion',suggestion.id,index)).join('')}</div>`:''}${mergeCandidatePanel('suggestion',suggestion.id,p,p.details)}${p.type==='flight'?directionPickerPanel(suggestion.id,p):''}${p.type==='flight'?flightSummaryBlock(p.details):''}${p.type==='activity'?activitySummaryBlock(p.details):''}${p.type==='insurance'?insuranceSummaryBlock(p.details):''}${smartEvidencePanel(p)}<form id="suggestion-form" data-id="${suggestion.id}">${proposalFields(displayP)}<div class="actions"><button class="btn" name="decision" value="approve">${isUpdate?`אישור ועדכון ה${ITEM_TYPES[p.type]?.label||'פריט'}`:'אישור ויצירת פריט'}</button><button class="btn secondary" name="decision" value="save">שמירת עריכה</button><button class="btn ghost" type="button" data-action="defer-suggestion" data-id="${suggestion.id}">אחר כך</button><button class="btn danger" type="button" data-action="reject-suggestion" data-id="${suggestion.id}">דחייה</button></div></form></section>`}
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
  return `<h3>פריטים מבוטחים</h3>${linkedItems.length?`<div class="list">${linkedItems.map(itemRow).join('')}</div>`:'<p class="muted">לא קושרו פריטים לפוליסה זו.</p>'}${candidates.length?`<fieldset class="processing-choice"><legend>קישור לפריטים נוספים</legend>${candidates.map(candidate=>`<label><input type="checkbox" data-action="toggle-related-item" data-id="${item.id}" data-target="${candidate.id}" ${linkedIds.has(candidate.id)?'checked':''}> ${ITEM_TYPES[candidate.type]?.icon||'📌'} ${esc(candidate.title)}</label>`).join('')}</fieldset>`:''}`;
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
  const scope=p.participantScope||'none',ids=new Set(p.participantIds||[]);
  return `<div class="field"><label>שיוך למשתתפים</label><select name="participantScope"><option value="none" ${scope==='none'?'selected':''}>ללא שיוך ספציפי</option><option value="all" ${scope==='all'?'selected':''}>כל המשתתפים</option><option value="specific" ${scope==='specific'?'selected':''}>משתתפים נבחרים</option></select><div class="participant-picker">${state.participants.map(participant=>`<label class="checkbox-field"><input type="checkbox" name="participantIds" value="${participant.id}" ${ids.has(participant.id)?'checked':''}> ${esc(participant.name)}</label>`).join('')}</div></div>`;
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
function proposalFields(p,{alwaysWebsite=false}={}){const type=['link','document'].includes(p.type)?'hotel':p.type||'hotel',fields=new Set(TYPE_FIELDS[type]||[]);if(alwaysWebsite||p.website)fields.add('website');const field=(name,label,input)=>fields.has(name)?`<div class="field"><label>${label}</label>${input}</div>`:'';return `<p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><div class="grid two"><div class="field"><label>סוג</label><select name="type" data-action="proposal-type">${Object.entries(ITEM_TYPES).filter(([key])=>!['document','link','participant'].includes(key)).map(([key,itemType])=>`<option value="${key}" ${type===key?'selected':''}>${itemType.icon} ${itemType.label}</option>`).join('')}</select></div><div class="field"><label>${requiredLabel('כותרת')}</label><input name="title" required aria-required="true" value="${esc(p.title||'')}"></div>${field('transportMode','סוג תחבורה',`<select name="transportMode">${Object.entries(TRANSPORT_MODES).map(([value,label])=>`<option value="${value}" ${(p.transportMode||'car')===value?'selected':''}>${label}</option>`).join('')}</select>`)}${field('provider','ספק',`<input name="provider" value="${esc(p.provider||'')}">`)}${field('confirmationNumber','מספר הזמנה',`<input name="confirmationNumber" value="${esc(p.confirmationNumber||'')}">`)}${field('location','מיקום',`<input name="location" value="${esc(p.location||'')}">`)}${field('website','קישור',`<input type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" name="website" value="${esc(p.website||'')}" placeholder="https://…">`)}${field('phone','טלפון',`<input type="tel" name="phone" value="${esc(p.phone||'')}">`)}${field('email','אימייל',`<input type="email" name="email" value="${esc(p.email||'')}">`)}${field('startAt','תאריך התחלה',`<input type="datetime-local" name="startAt" value="${esc(p.startAt||'')}">`)}${field('endAt','תאריך סיום',`<input type="datetime-local" name="endAt" value="${esc(p.endAt||'')}">`)}</div>${participantAssignmentField(p)}${field('notes','הערות',`<textarea name="notes">${esc(p.notes||'')}</textarea>`) }`}
// 0.7.5 (DESIGN_V1.md §6): account-level admin/history data, refreshed on demand (entering the
// relevant view, or right after an action that changes it) rather than kept live -- these are
// low-frequency admin actions, not Trip content, so a real-time listener would be unjustified
// complexity (unlike subscribeToTrip's own onSnapshot, which backs this app's actual headline
// two-device sync feature). Every refresh re-renders once its data arrives, same as every other
// async-then-render() pattern already used throughout this file (e.g. runMigration()).
async function refreshMyInvitation(){try{myInvitation=await getMyInvitation()}catch(error){console.error('Loading admin status failed',error)}render()}
async function refreshAdminInvitations(){try{adminInvitations=await listInvitations()}catch(error){console.error('Loading invitations failed',error);notify('טעינת רשימת ההזמנות נכשלה')}render()}
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
function sharingSection(){
  if(!state.trip||state.trip.ownerUid!==currentUid())return '';
  const editors=state.trip.editorEmails||[];
  const revokedHistory=editorHistory.filter(entry=>entry.state==='revoked'&&!editors.includes(entry.email));
  return `<section class="card"><h2>שיתוף הטיול</h2><p class="muted">משתתפים עם הרשאת עריכה יכולים לצפות ולערוך את תוכן הטיול, אך לא לבצע פעולות בעלים (מחיקת הטיול, ניהול שיתוף).</p>${editors.length?`<div class="list">${editors.map(email=>`<div class="row"><span class="row-main"><b>${esc(email)}</b></span><button class="btn ghost" data-action="remove-editor" data-email="${esc(email)}">הסרה</button></div>`).join('')}</div>`:'<p class="muted small">אין עדיין משתתפים עם הרשאת עריכה.</p>'}<form id="add-editor-form"><div class="field"><label>הוספת משתתף לפי אימייל</label><input type="email" name="email" required placeholder="name@example.com"></div><button class="btn secondary">הוספה</button></form>${revokedHistory.length?`<details class="proposal-archive"><summary>היסטוריית הרשאות שהוסרו (${revokedHistory.length})</summary><div class="list">${revokedHistory.map(entry=>`<div class="row"><span class="row-main"><b>${esc(entry.email)}</b><small class="muted">הוסר ${entry.revokedAt?fmt(entry.revokedAt):''}</small></span></div>`).join('')}</div></details>`:''}</section>`;
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
  return `<section class="card"><h2>יעדים</h2><p class="muted">רשימה מסודרת של מדינות היעד; הסדר קובע את סדר תצוגת סיכום המסלול בראש המסך.</p><div class="list">${countries.length?countries.map((country,index)=>`<article class="row destination-row"><span class="row-main"><b>${index+1}. ${esc(country)}</b></span><div class="actions"><button class="btn ghost" data-action="destination-move-up" data-index="${index}" ${index===0?'disabled':''} aria-label="הזזה למעלה">↑</button><button class="btn ghost" data-action="destination-move-down" data-index="${index}" ${index===countries.length-1?'disabled':''} aria-label="הזזה למטה">↓</button><button class="btn danger" data-action="destination-remove" data-index="${index}">הסרה</button></div></article>`).join(''):'<p class="muted">לא נוספו יעדים.</p>'}</div><form id="destination-add-form" class="grid two"><label class="field"><span>הוספת יעד</span><input name="country" placeholder="למשל: תאילנד" required></label><button class="btn">הוספה</button></form></section>`;
}
// 0.7.4: Trip Settings is the sole entry point for participant management, per the frozen V24
// decision (no standalone Trip Center participant UI) -- confirmed via this section living only
// here, never referenced from center()'s own visibleTypes tile grid.
function participantsSection(){
  const participants=state.participants||[];
  return `<section class="card"><h2>משתתפים</h2><p class="muted">ניהול משתתפי הטיול; קובע גם שיוך פריטים, כרטיסים ורשימות אריזה אישיות.</p><div class="list">${participants.length?participants.map(participant=>`<article class="row ${participant.active===false?'inactive':''}"><span class="row-main"><b>${participant.avatarInitials?`${esc(participant.avatarInitials)} · `:''}${esc(participant.name)}</b><small class="muted">${participant.relationship?esc(participant.relationship)+' · ':''}${participant.active===false?'לא פעיל':'פעיל'}</small></span><div class="actions"><button class="btn ghost" data-action="participant-edit" data-id="${participant.id}">עריכה</button><button class="btn ${participant.active===false?'':'warn'}" data-action="participant-toggle-active" data-id="${participant.id}">${participant.active===false?'הפעלה':'השבתה'}</button></div></article>`).join(''):'<p class="muted">לא נוספו משתתפים.</p>'}</div><button class="btn" data-action="participant-add">משתתף חדש</button></section>`;
}
function settingsView(){if(!state.trip)return empty();return `<section class="card"><h2>הגדרות הטיול</h2><form id="trip-form"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><div class="field"><label>${requiredLabel('שם הטיול')}</label><input name="name" required aria-required="true" value="${esc(state.trip.name)}"></div><div class="grid two"><div class="field"><label>תאריך התחלה</label><input type="date" name="startDate" value="${esc(state.trip.startDate)}"></div><div class="field"><label>תאריך סיום</label><input type="date" name="endDate" value="${esc(state.trip.endDate)}"></div></div><button class="btn">שמירה</button></form></section>${destinationsSection()}${participantsSection()}${sharingSection()}${tripsSection()}${myInvitation?.isAdmin?`<section class="card"><h2>ניהול מערכת</h2><p class="muted">ניהול הזמנות שימוש באפליקציה ברמת החשבון, נפרד מהרשאות עריכה של טיול ספציפי.</p><button class="btn secondary" data-route="admin">ניהול הרשאות גישה</button></section>`:''}<section class="card danger-zone"><h2>מחיקה ואיפוס</h2><p class="muted">הפעולות חלות רק על הטיול הנוכחי: <b>${esc(state.trip.name)}</b>.</p><div class="danger-option"><div><h3>מחיקת נתוני הטיול</h3><p class="muted">מוחקת פריטים, מסמכים, משימות, קניות, אריזה, מיקומים ומשתתפים; שם הטיול והתאריכים נשארים.</p></div><button class="btn warn" data-action="reset-trip-data">מחיקת נתוני הטיול</button></div><div class="danger-option"><div><h3>מחיקת הטיול הנוכחי</h3><p class="muted">מוחקת את הטיול ואת כל הנתונים המקומיים המשויכים אליו.</p></div><button class="btn danger" data-action="delete-current-trip">מחיקת הטיול</button></div></section><section class="card"><h2>אודות</h2><p class="muted small">${esc(appVersionLabel())}${buildVersionLabel()?` · בנייה ${esc(buildVersionLabel())}`:''}</p></section>`}
// 0.7.5 (DESIGN_V1.md §6): the Product-Owner-only application-invitation admin panel -- distinct
// from sharingSection() above, which is the per-Trip Owner-facing Editor panel every Trip Owner
// (not just the admin) already had since 0.7.2. Gated purely client-side on myInvitation.isAdmin
// (a convenience, matching this project's standing "client-hidden UI is not an authorization
// boundary" rule); the real boundary is firestore.rules' own isAdmin()-gated invitations
// collection and admin-delete-account.mjs's own server-side admin check, both independent of
// whatever this function decides to render.
function adminView(){
  if(!myInvitation?.isAdmin)return `<section class="card"><button class="btn ghost" data-route="settings">חזרה</button><p class="muted">מסך זה זמין למנהלי המערכת בלבד.</p></section>`;
  const active=adminInvitations.filter(invitation=>invitation.state==='active');
  const revoked=adminInvitations.filter(invitation=>invitation.state==='revoked');
  return `<section class="card"><button class="btn ghost" data-route="settings">חזרה</button><h2>ניהול הרשאות גישה</h2><p class="muted">מי מורשה להשתמש באפליקציה בכלל -- נפרד מהרשאת עריכה לטיול ספציפי (זו מנוהלת מהגדרות הטיול עצמו).</p><div class="list">${active.length?active.map(invitation=>`<div class="row"><span class="row-main"><b>${esc(invitation.email)}</b>${invitation.isAdmin?' <span class="badge blue">מנהל</span>':''}</span>${invitation.isAdmin?'':`<button class="btn warn" data-action="admin-revoke" data-email="${esc(invitation.email)}">ביטול הרשאה</button>`}</div>`).join(''):'<p class="muted small">אין הזמנות פעילות.</p>'}</div><form id="admin-invite-form"><div class="field"><label>הזמנת משתמש חדש לפי אימייל</label><input type="email" name="email" required placeholder="name@example.com"></div><button class="btn secondary">הזמנה</button></form></section>${quarantineSection(revoked)}`;
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
    return `<div class="row"><span class="row-main"><b>${esc(invitation.email)}</b><small class="muted">בוטל לפני ${daysSinceRevoked} ימים${eligible?' · ניתן למחיקה':` · ניתן למחיקה בעוד ${remaining} ימים`}</small></span><div class="actions"><button class="btn secondary" data-action="admin-reactivate" data-email="${esc(invitation.email)}">הפעלה מחדש</button><button class="btn danger" data-action="admin-delete-account" data-email="${esc(invitation.email)}" ${eligible?'':'disabled aria-disabled="true"'}>מחיקה לצמיתות</button></div></div>`;
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

function intakeModal(){const source=state.modal?.source||'manual',choices=[['manual','✍️ ידני'],['document','📎 מסמך'],['link','🔗 קישור'],['json','⬆️ JSON'],['qr','▦ QR']];let body='';
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
  if(source==='manual')body=`<form id="manual-form">${proposalFields({type:state.category||'hotel',title:'',provider:'',confirmationNumber:'',location:'',website:'',phone:'',...(state.category==='shoppingPlace'?{startAt:'',endAt:''}:manualCreateDefaults(state.trip)),notes:''})}<button class="btn">יצירת פריט</button></form>`;else if(source==='json')body='<div class="field"><label>קובץ familytrips.import 1.0</label><input id="import-json" type="file" accept="application/json,.json"></div><button class="btn" data-action="import-json">אימות ויצירת הצעות</button>';else if(source==='qr')body=qrPanel();else body=smartImportPanel(source);
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
  const taskChoice=`<button data-action="task-add">✅ משימה</button>`;
  return `<div class="modal-bg"><section class="modal wide-modal"><div class="modal-head"><h2>הוספת מקור או פריט</h2><button class="close" data-action="close">✕</button></div><div class="source-choice">${choices.map(([key,label])=>`<button class="${source===key?'active':''}" data-action="source" data-source="${key}">${label}</button>`).join('')}${taskChoice}</div>${body}</section></div>`}
function processingIndicator(message){return `<div class="processing-indicator" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><p>${message}</p><p class="muted small">הניתוח יכול לקחת מספר שניות. אין צורך ללחוץ שוב.</p></div>`}
// V6-F fix pass: removed the manual Hotel/Flight picker -- the server now classifies from
// content the same way it already determines VOID vs. real segments (see analyze_source in
// smart-import.mjs). Document also replaces the separate PDF/Picture options: one broad-accept
// file input with no forced capture attribute lets the OS present its native camera/gallery/
// file choice (the underlying pipeline already treats them as one ingestion path).
function smartImportPanel(source){
  if(ingestBusy)return processingIndicator('מנתח את המקור…');
  // V6-F78: this accept attribute (and its attachmentModal/validateSmartSource counterparts
  // below) never included TIFF, even though Decision 7 (INSURANCE_SMART_IMPORT_DISCOVERY.md)
  // explicitly confirms scanned/fax-quality images -- INS-006's own real format -- as in scope.
  const input=source==='link'?'<div class="field"><label>כתובת אתר ציבורי רשמי של המלון</label><input id="source-url" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…"></div>':'<div class="field"><label>מסמך (PDF או תמונה)</label><input id="source-file" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff"></div>';
  return `<div class="smart-import-disclosure"><b>Smart Import:</b> הניתוח מתבצע רק לאחר אישור. עותק העיבוד אינו נשמר בשרת, והמקור המקורי נשמר במכשיר.</div>${input}<fieldset class="processing-choice"><legend>מה לבצע?</legend><label><input type="radio" name="processing-mode" value="analyze" checked> ניתוח והצעת פריט</label><label><input type="radio" name="processing-mode" value="save"> שמירת המקור בלבד — ללא AI</label></fieldset><button class="btn" data-action="smart-ingest">המשך</button>`;
}
// V6-F38 (fix pass 4): the per-item "add document" modal still showed separate PDF/תמונה tabs
// after the global Add flow merged them into one Document option (V6 fix pass 1) -- applying the
// same merge here for consistency. One broad-accept file input with no forced capture attribute
// lets the OS present its native camera/gallery/file choice, exactly like the Add screen's
// Document option; validateSmartSource's existing kind==='document' branch already accepts
// either a PDF or an image, so no server/validation change is needed.
function attachmentModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);if(ingestBusy)return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>הוספת מסמך ל־${esc(item?.title||'מלון')}</h2></div>${processingIndicator('מנתח את המסמך…')}</section></div>`;return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>הוספת מסמך ל־${esc(item?.title||'מלון')}</h2><button class="close" data-action="close">✕</button></div><div class="field"><label>מסמך (PDF או תמונה)</label><input id="source-file" type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp,image/tiff,.tif,.tiff"></div><fieldset class="processing-choice"><legend>מה לבצע?</legend><label><input type="radio" name="processing-mode" value="attach" checked> צירוף בלבד — ללא AI</label><label><input type="radio" name="processing-mode" value="extract"> צירוף וחילוץ מידע להצעה</label></fieldset><button class="btn" data-action="attach-ingest" data-id="${item?.id||''}">המשך</button></section></div>`}
function qrPanel(){const p=qrCollector.progress;return `<div class="privacy-warning">ה־QR מכיל מידע אישי ואינו מוצפן. אין לשתף אותו בפומבי.</div><video id="qr-video" class="qr-video" playsinline muted></video><div class="actions"><button class="btn" data-action="qr-camera">סריקה במצלמה</button><label class="btn secondary file-button">בחירת תמונת QR<input id="qr-image" type="file" accept="image/*"></label><button class="btn ghost" data-action="qr-reset">ביטול / התחלה מחדש</button></div>${p.total?`<div class="qr-progress"><b>חלקים שנקלטו: ${p.collected}/${p.total}</b><p>חסרים: ${p.missing.join(', ')||'אין'}</p></div>`:''}<div class="field"><label>הדבקת payload לבדיקה</label><textarea id="qr-text" dir="ltr" placeholder="FTI1:... או FTI1C|..."></textarea></div><button class="btn secondary" data-action="qr-text">קליטת payload</button>`}
function editModal(){const item=state.items.find(candidate=>candidate.id===state.modal.itemId);return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>עריכת פריט</h2><button class="close" data-action="close">✕</button></div><form id="edit-item-form" data-id="${item.id}">${proposalFields(item,{alwaysWebsite:true})}<button class="btn">שמירה</button></form></section></div>`}
function duplicateModal(){const {suggestionId,duplicateIds}=state.modal,suggestion=suggestionById(suggestionId),duplicates=state.items.filter(item=>duplicateIds.includes(item.id));return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>נמצאה הזמנה דומה</h2><button class="close" data-action="close">✕</button></div><p>ערכים מיובאים ריקים לא ידרסו מידע קיים.</p><div class="list">${duplicates.map(itemRow).join('')}</div><div class="actions"><button class="btn" data-action="duplicate-merge" data-suggestion="${suggestion.id}" data-target="${duplicates[0]?.id||''}">מיזוג</button><button class="btn secondary" data-action="duplicate-keep" data-suggestion="${suggestion.id}">שמירת שניהם</button><button class="btn ghost" data-action="close">ביטול</button></div></section></div>`}
// 0.7.9 correction (V7-F10, Test 4): the Development Agent's own round-1 report proposed keeping
// the free-text owner field as a transition-period choice, since it could in principle hold a
// name with no corresponding participant record. Product Owner's own decision after seeing both
// fields side by side on the same form: this reads as a duplication, not a useful transition --
// owner is REMOVED, superseding that report. Not destructive: an already-existing task's own
// stored owner value is simply never read or written by this form again (values below no longer
// includes it), so nothing already in Firestore is deleted -- the same non-destructive precedent
// 0.7.4.1 established when it removed the old free-text `participants` field from item forms.
function simpleFormModal(){const type=state.modal.type;if(type==='task'){const task=state.tasks.find(candidate=>candidate.id===state.modal.taskId)||{title:'',mode:'date',dueDate:'',priority:'Normal'};return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.taskId?'עריכת משימה':'משימה חדשה'}</h2><button class="close" data-action="close">✕</button></div><form id="task-form" data-id="${task.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('משימה')}<input name="title" required aria-required="true" value="${esc(task.title)}"></label>${participantAssignmentField(task)}<label class="field">מועד<select name="mode"><option value="date" ${task.mode==='date'?'selected':''}>תאריך</option><option value="entire" ${task.mode==='entire'?'selected':''}>לכל הטיול</option><option value="none" ${task.mode==='none'?'selected':''}>ללא תאריך</option></select></label><label class="field">תאריך יעד<input type="date" name="dueDate" value="${esc(task.dueDate||'')}"></label><label class="field">עדיפות<select name="priority"><option value="High" ${task.priority==='High'?'selected':''}>גבוהה</option><option value="Normal" ${(task.priority||'Normal')==='Normal'?'selected':''}>רגילה</option><option value="Low" ${task.priority==='Low'?'selected':''}>נמוכה</option></select></label><button class="btn">שמירה</button></form></section></div>`}if(type==='shopping'){
  // 0.7.7: an optional reference to a shopping place -- deliberately just a select, no cascading
  // delete anywhere: shoppingView()'s own render looks the place up by id at display time and
  // simply omits it if gone, so deleting a place can never delete or corrupt a list entry.
  // 0.7.7.1 (Test 1, found live): this form now also opens pre-filled for an existing entry
  // (state.modal.shoppingId), mirroring task-form's own edit-in-place pattern exactly -- same
  // form, same fields, just already-populated and keyed by data-id instead of always blank.
  const places=state.items.filter(item=>item.type==='shoppingPlace');
  const entry=state.shopping.find(candidate=>candidate.id===state.modal.shoppingId)||{name:'',quantity:'1',owner:'shared',linkedNeed:'',placeId:''};
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.shoppingId?'עריכת פריט קניות':'פריט קניות חדש'}</h2><button class="close" data-action="close">✕</button></div><form id="shopping-form" data-id="${entry.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('פריט')}<input name="name" required aria-required="true" value="${esc(entry.name)}"></label><label class="field">כמות<input name="quantity" value="${esc(entry.quantity||'1')}"></label><label class="field">בעלים<input name="owner" placeholder="משותף או שם משתתף" value="${esc(entry.owner==='shared'?'':entry.owner||'')}"></label><label class="field">קישור לצורך אריזה/הכנה<input name="linkedNeed" value="${esc(entry.linkedNeed||'')}"></label><label class="field">מקום קניות מקושר (אופציונלי)<select name="placeId"><option value="">ללא</option>${places.map(place=>`<option value="${place.id}" ${place.id===entry.placeId?'selected':''}>${esc(place.title)}</option>`).join('')}</select></label><button class="btn">שמירה</button></form></section></div>`;
}return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>מיקום</h2><button class="close" data-action="close">✕</button></div><form id="location-form" data-id="${state.modal.locationId||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('שם מקום')}<input name="placeName" required aria-required="true" value="${esc(state.modal.record?.placeName||'')}"></label><label class="field">${requiredLabel('כתובת / חיפוש')}<input name="address" required aria-required="true" value="${esc(state.modal.record?.address||'')}"></label><div class="grid two"><label class="field">קו רוחב<input name="lat" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lat||'')}"></label><label class="field">קו אורך<input name="lng" inputmode="decimal" value="${esc(state.modal.record?.coordinates?.lng||'')}"></label></div><label class="field">מקור<input name="source" value="${esc(state.modal.record?.source||'manual')}"></label><label class="field">ביטחון<select name="confidence"><option>high</option><option selected>medium</option><option>low</option></select></label><a class="btn ghost" href="${mapsUrl(state.modal.record?.address||'Thailand')}" target="_blank" rel="noopener">חיפוש / הצבת סיכה במפה</a><button class="btn">אישור ושמירה</button></form></section></div>`}
// 0.7.4: participant add/edit modal, per Trip Settings' new participant-management scope. A
// dedicated function rather than folded into simpleFormModal() -- its field set (role/relationship,
// avatar initials, email, active status) doesn't overlap with task/shopping/location's own fields
// closely enough to share logic, and simpleFormModal's own single-`type`-check dispatch would only
// grow harder to follow by adding a fourth, differently-shaped branch to it.
function participantModal(){
  const participant=state.participants.find(candidate=>candidate.id===state.modal.participantId)||{name:'',relationship:'',avatarInitials:'',phone:'',email:'',notes:'',active:true};
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.participantId?'עריכת משתתף':'משתתף חדש'}</h2><button class="close" data-action="close">✕</button></div><form id="participant-form" data-id="${participant.id||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('שם')}<input name="name" required aria-required="true" value="${esc(participant.name)}"></label><label class="field">תפקיד / קרבה משפחתית<input name="relationship" value="${esc(participant.relationship||'')}"></label><label class="field">ראשי תיבות לאווטאר<input name="avatarInitials" maxlength="3" value="${esc(participant.avatarInitials||'')}"></label><label class="field">טלפון<input type="tel" name="phone" value="${esc(participant.phone||'')}"></label><label class="field">אימייל<input type="email" name="email" value="${esc(participant.email||'')}"></label><label class="field">הערות<textarea name="notes">${esc(participant.notes||'')}</textarea></label>${state.modal.participantId?`<label class="field checkbox-field"><input type="checkbox" name="active" ${participant.active!==false?'checked':''}> פעיל</label>`:''}<button class="btn">שמירה</button></form></section></div>`;
}
// 0.7.4: replaces the old prompt()-based add-item flow -- "suggested items assignable to one or
// more participants" needs a real multi-select, which a sequence of prompt() text dialogs can't
// give reliably (would mean asking the user to type comma-separated participant names to be
// matched back against real records -- fragile and easy to get wrong). A proper modal, matching
// this app's own established quality bar for every other add/edit flow.
function packingItemModal(){
  const list=state.packing.find(candidate=>candidate.id===state.modal.listId),item=list?.items.find(candidate=>candidate.id===state.modal.itemId)||{name:'',owner:'shared',participantIds:[]};
  const ids=new Set(item.participantIds||[]);
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>${state.modal.itemId?'עריכת פריט אריזה':'פריט אריזה חדש'}</h2><button class="close" data-action="close">✕</button></div><form id="packing-item-form" data-list-id="${state.modal.listId}" data-item-id="${state.modal.itemId||''}"><p class="required-note"><span class="required" aria-hidden="true">*</span> שדה חובה</p><label class="field">${requiredLabel('שם הפריט')}<input name="name" required aria-required="true" value="${esc(item.name)}"></label>${state.participants.length?`<div class="field"><label>שיוך למשתתפים (ריק = משותף)</label><div class="participant-picker">${state.participants.map(participant=>`<label class="checkbox-field"><input type="checkbox" name="participantIds" value="${participant.id}" ${ids.has(participant.id)?'checked':''}> ${esc(participant.name)}</label>`).join('')}</div></div>`:''}<button class="btn">שמירה</button></form></section></div>`;
}
// 0.7.9 (V7-F09): the manual-correction affordance for source.participantIds -- a plain
// multi-select checkbox list with no scope concept (mirrors packingItemModal's own simpler
// picker, not participantAssignmentField's scope+picker pair, since a source's participant link
// is never "all"/"none", just whichever specific people the document actually names).
function sourceParticipantsModal(){
  const source=state.sources.find(candidate=>candidate.id===state.modal.sourceId);
  const ids=new Set(source?.participantIds||[]);
  return `<div class="modal-bg"><section class="modal"><div class="modal-head"><h2>שיוך מסמך למשתתפים</h2><button class="close" data-action="close">✕</button></div><form id="source-participants-form" data-id="${source?.id||''}"><div class="field"><label>שיוך למשתתפים</label><div class="participant-picker">${state.participants.map(participant=>`<label class="checkbox-field"><input type="checkbox" name="participantIds" value="${participant.id}" ${ids.has(participant.id)?'checked':''}> ${esc(participant.name)}</label>`).join('')}</div></div><button class="btn">שמירה</button></form></section></div>`;
}
function modal(){if(!state.modal)return '';if(state.modal.type==='intake')return intakeModal();if(state.modal.type==='attachment')return attachmentModal();if(state.modal.type==='edit-item')return editModal();if(state.modal.type==='duplicate')return duplicateModal();if(state.modal.type==='participant')return participantModal();if(state.modal.type==='packing-item')return packingItemModal();if(state.modal.type==='source-participants')return sourceParticipantsModal();if(['task','shopping','location'].includes(state.modal.type))return simpleFormModal();return ''}
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
  const centerSubviews=['detail','suggestion','games','tasks','shopping','locations'];
  const tab=(key,label)=>`<button class="${state.view===key||(centerSubviews.includes(state.view)&&key==='center')?'active':''}" data-route="${key}" aria-label="${label}">${NAV_ICONS[key]}<br>${label}</button>`;
  return `<nav class="nav">${tab('today','היום')}${tab('timeline','ציר הזמן')}<button class="nav-plus" data-action="create" aria-label="הוספה"><span class="nav-plus-circle">${NAV_ICONS.plus}</span></button>${tab('center','מרכז הטיול')}${tab('packing','אריזה')}</nav>`;
}
// 0.7.3 (DESIGN_V1.md §4, Product Owner decision: option 2, the minimal pending-sync indicator).
// Extends the existing offline banner's own pattern rather than introducing a new one: offline
// takes priority when both are true (there's nothing more specific to say while offline than that),
// otherwise a pending-sync backlog gets its own line once back online. Empty when neither applies.
function syncBanner(){
  if(!navigator.onLine)return '<div class="offline">מצב אופליין — המידע המקומי זמין</div>';
  if(pendingSyncCount>0)return '<div class="offline">שינויים ממתינים לסנכרון</div>';
  return '';
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
  normalizeOperationalState(state);const views={today:todayView,timeline,center,detail:detailView,suggestion:suggestionView,games:gamesView,packing:packingView,tasks:tasksView,shopping:shoppingView,locations:locationsView,settings:settingsView,trips:tripsView,admin:adminView},body=(!bootResolved?loading:!state.trip&&!['trips','admin'].includes(state.view)?empty:(views[state.view]||todayView))();document.querySelector('#app').innerHTML=`<div class="shell">${syncBanner()}${header()}<main>${body}</main>${nav()}${modal()}${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}</div>`;
  // Beta 0.8 Phase 1 (design spec V7 S5): "the selected item is centered" -- keeps the carousel's
  // own current selection centered after every render (a fresh selection click, or just landing on
  // a screen that has one), not only after a manual drag; 'nearest'/no smooth behavior avoids any
  // visible re-animation on renders the carousel itself wasn't involved in.
  document.querySelector('.p-chip.selected')?.scrollIntoView({inline:'nearest',block:'nearest'});
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
  source.status='בניתוח';source.processingState='processing';save();render();
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
    {const resolvedParticipantIds=resolveParticipantIdsFromDraft(result.draft,state.participants);if(resolvedParticipantIds.length)source.participantIds=resolvedParticipantIds}
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
function updateSuggestion(form,suggestion){const data=new FormData(form),before=suggestion.proposed,type=String(data.get('type')),range=normalizeDateRange(data.get('startAt'),data.get('endAt'),{allowEndBeforeStart:type==='flight'});
  // 0.7.8 (found live, needed for reviewing a Transport suggestion): transportMode/email were both
  // already rendered by proposalFields() for type:'car' (transportMode since 0.7.4, email new this
  // candidate) but never captured back out of the suggestion-review form here -- unreachable until
  // this candidate made a real car-type suggestion possible for the first time (0.7.4 itself only
  // ever reached buildItemFormValues' own manual-create/edit-item path, never this one, since no
  // extraction could produce a car suggestion before Transport Smart Import existed).
  const next={type,title:String(data.get('title')||'').trim(),provider:String(data.get('provider')||'').trim(),confirmationNumber:String(data.get('confirmationNumber')||'').trim(),location:String(data.get('location')||'').trim(),website:normalizeUrlInput(data.get('website')),phone:String(data.get('phone')||'').trim(),email:String(data.get('email')||'').trim(),startAt:range.start,endAt:range.end,participants:String(data.get('participants')||'').split(',').map(x=>x.trim()).filter(Boolean),notes:String(data.get('notes')||'').trim(),transportMode:String(data.get('transportMode')||'').trim()||before.transportMode,schedule:scheduleForType(type,Boolean(range.start))};
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

addEventListener('click',async event=>{if(Date.now()<suppressClickUntil)return;const routeButton=event.target.closest('[data-route]');if(routeButton){const view=routeButton.dataset.route;route(view,{category:routeButton.dataset.cat,itemId:routeButton.dataset.id,suggestionId:routeButton.dataset.id,anchor:routeButton.dataset.anchor});if(view==='settings'&&state.trip?.ownerUid===currentUid())refreshEditorHistory();else if(view==='admin')refreshAdminInvitations();return}const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action==='create'){state.modal={type:'intake',source:'manual'};render()}
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
  else if(action==='task-delete'){if(confirm('למחוק את המשימה לצמיתות?')){state.tasks=state.tasks.filter(x=>x.id!==button.dataset.id);save();render()}}
  else if(action==='pack-delete'){if(confirm('למחוק את פריט הציוד לצמיתות?')){const list=state.packing.find(x=>x.id===button.dataset.list);if(list)list.items=list.items.filter(x=>x.id!==button.dataset.item);save();render()}}
  else if(action==='reset-trip-data'){if(confirm(`למחוק את כל נתוני הטיול "${state.trip?.name||''}"? שם הטיול והתאריכים יישמרו, אך הפריטים, המסמכים, המשימות, הקניות, האריזה והמיקומים יימחקו מהמכשיר.`)){try{await resetCurrentTrip(false)}catch(error){alert(error.message)}}}
  else if(action==='delete-current-trip'){if(confirm(`למחוק לצמיתות מהמכשיר את הטיול "${state.trip?.name||''}" ואת כל הנתונים המשויכים אליו?`)){try{await resetCurrentTrip(true)}catch(error){alert(error.message)}}}
  else if(action==='destination-move-up'){const index=Number(button.dataset.index),list=[...state.trip.destinationCountries];if(index>0){[list[index-1],list[index]]=[list[index],list[index-1]];state.trip.destinationCountries=list;save();render()}}
  else if(action==='destination-move-down'){const index=Number(button.dataset.index),list=[...state.trip.destinationCountries];if(index<list.length-1){[list[index],list[index+1]]=[list[index+1],list[index]];state.trip.destinationCountries=list;save();render()}}
  else if(action==='destination-remove'){const index=Number(button.dataset.index);state.trip.destinationCountries=state.trip.destinationCountries.filter((_,candidateIndex)=>candidateIndex!==index);save();render()}
  else if(action==='participant-add'){state.modal={type:'participant',participantId:null};render()}
  else if(action==='participant-edit'){state.modal={type:'participant',participantId:button.dataset.id};render()}
  else if(action==='participant-toggle-active'){const participant=state.participants.find(candidate=>candidate.id===button.dataset.id);participant.active=participant.active===false;save();render()}
  else if(action==='source-edit-participants'){state.modal={type:'source-participants',sourceId:button.dataset.id};render()}
  // 0.7.9 correction round 3 (Finding 2): confirms a linked document as this item's ticket
  // coverage for whichever participant(s) it's already linked to -- an explicit confirmation, not
  // an automatic effect of the participant link itself, matching the Product Owner's own "offer,
  // don't auto-create" phrasing.
  else if(action==='source-confirm-ticket'){const source=state.sources.find(candidate=>candidate.id===button.dataset.id);if(source){source.ticketConfirmed=true;save();render()}}
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
  else if(action==='add-list'){const name=prompt('שם קטגוריית האריזה');if(name){state.packing.push({id:uid('pl'),name,owner:'shared',items:[]});save();render()}}
  else if(action==='pack-collapse'){state.packingCollapsed[button.dataset.list]=!state.packingCollapsed[button.dataset.list];save();render()}
  else if(action==='pack-add'){state.modal={type:'packing-item',listId:button.dataset.list,itemId:null};render()}
  else if(action==='pack-edit'){state.modal={type:'packing-item',listId:button.dataset.list,itemId:button.dataset.item};render()}
  else if(action==='packing-view-participant'){state.packingParticipantView=button.dataset.participant;render()}
  else if(action==='task-add'){state.modal={type:'task'};render()}
  else if(action==='task-filter-clear'){state.taskFilters={priority:'all',due:'all',status:'all',participant:'all'};render()}
  else if(action==='task-edit'){state.modal={type:'task',taskId:button.dataset.id};render()}
  else if(action==='shopping-add'){state.modal={type:'shopping'};render()}
  else if(action==='shopping-edit'){state.modal={type:'shopping',shoppingId:button.dataset.id};render()}
  // 0.7.7: reuses the existing manual-item-creation pipeline (proposalFields/manual-form) exactly
  // as-is, just pre-selecting the category -- the same "jump straight to an existing modal" pattern
  // create's own task-add button already uses, not a new form.
  else if(action==='shopping-place-add'){state.category='shoppingPlace';state.modal={type:'intake',source:'manual'};render()}
  else if(action==='location-add'){state.modal={type:'location'};render()}
  else if(action==='location-approve'){const record=state.locationRecords.find(x=>x.id===button.dataset.id);state.modal={type:'location',locationId:record.id,record};render()}
  else if(action==='switch-trip')switchTrip(button.dataset.id);
  else if(action==='start-new-trip')await startNewTripFlow();
  else if(action==='remove-editor'){if(!confirm(`להסיר את ${button.dataset.email} מהטיול?`))return;try{state.trip.editorEmails=await removeEditorByEmail(state.trip.id,button.dataset.email);render();refreshEditorHistory()}catch(error){alert(error.message||'הסרת המשתתף נכשלה.')}}
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
addEventListener('change',async event=>{const action=event.target.dataset.action;if(action==='pack-toggle'){const list=state.packing.find(x=>x.id===event.target.dataset.list),item=list?.items.find(x=>x.id===event.target.dataset.item);if(item){item.done=event.target.checked;save();render()}}else if(action==='task-toggle'){const task=state.tasks.find(x=>x.id===event.target.dataset.id);task.done=event.target.checked;save();render()}else if(action==='shopping-toggle'){const item=state.shopping.find(x=>x.id===event.target.dataset.id);item.purchased=event.target.checked;save();render()}else if(action==='source-ticket-toggle-used'){const source=state.sources.find(x=>x.id===event.target.dataset.id);if(source){source.ticketUsed=event.target.checked;save();render()}}else if(event.target.id==='qr-image'&&event.target.files?.[0])await decodeQrImage(event.target.files[0]);else if(event.target.id==='source-file'){pendingSourceFile=event.target.files?.[0]||null}else if(event.target.id==='calendar-month'){state.calendarDate=`${event.target.value}-01`;state.timelineCursor=state.calendarDate;render()}else if(event.target.id==='task-filter-priority'){state.taskFilters={...state.taskFilters,priority:event.target.value};render()}else if(event.target.id==='task-filter-due'){state.taskFilters={...state.taskFilters,due:event.target.value};render()}else if(event.target.id==='task-filter-status'){state.taskFilters={...state.taskFilters,status:event.target.value};render()}else if(event.target.id==='task-filter-participant'){state.taskFilters={...state.taskFilters,participant:event.target.value};render()}else if(['startAt','startDate'].includes(event.target.name)){const form=event.target.closest('form'),endName=event.target.name==='startAt'?'endAt':'endDate',endInput=form?.elements?.namedItem(endName),isFlight=form?.elements?.namedItem('type')?.value==='flight';if(endInput){const range=normalizeDateRange(event.target.value,endInput.value,{allowEndBeforeStart:isFlight});if(range.end!==endInput.value)endInput.value=range.end}}else if(event.target.matches('select[data-action="proposal-type"]')){const form=event.target.closest('form'),current=new FormData(form),values={type:event.target.value,title:current.get('title')||'',transportMode:current.get('transportMode')||'',provider:current.get('provider')||'',confirmationNumber:current.get('confirmationNumber')||'',location:current.get('location')||'',website:current.get('website')||'',phone:current.get('phone')||'',startAt:current.get('startAt')||'',endAt:current.get('endAt')||'',participantScope:current.get('participantScope')||'none',participantIds:current.getAll('participantIds').map(String),notes:current.get('notes')||''},actions=form.querySelector('.actions')?.outerHTML||form.querySelector('.btn')?.outerHTML||'';form.innerHTML=proposalFields(values,{alwaysWebsite:form.id==='edit-item-form'})+actions}});
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
  else if(form.id==='source-participants-form'){
    const source=state.sources.find(candidate=>candidate.id===form.dataset.id);
    if(source){source.participantIds=data.getAll('participantIds').map(String);save();state.modal=null;render()}
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
      Object.assign(item,values,{details:reconciled.details,warnings:reconciled.warnings});
    }
    // 0.7.7: a newly-created shoppingPlace routes back to the "shopping" operational view it was
    // created from, not the generic per-type Trip Center category page every other type lands on
    // -- that generic page is still reachable (nothing here removes it), just not where this
    // candidate's own "add place" button, opened from shoppingView(), expects to return to.
    save();state.modal=null;route(form.id==='manual-form'?(type==='shoppingPlace'?'shopping':'center'):'detail',form.id==='manual-form'?(type==='shoppingPlace'?{}:{category:type}):{itemId:form.dataset.id})}
  else if(form.id==='suggestion-form'){const suggestion=suggestionById(form.dataset.id);updateSuggestion(form,suggestion);if(event.submitter?.value==='approve'){save();approveSuggestion(suggestion)}else{save();render();notify('עריכת ההצעה נשמרה')}}
  else if(form.id==='task-form'){
    // 0.7.9 (V7-F10): participantScope/participantIds, same field names and none/all/specific
    // semantics as Items' own (buildItemFormValues, ingestion.js) -- not a parallel Task-specific
    // scheme. owner is no longer read or written here (Product Owner decision, correction round --
    // see the task-form modal's own comment) -- an existing task's own stored owner value, if any,
    // is simply left untouched by Object.assign below, not cleared.
    const participantScope=['none','all','specific'].includes(String(data.get('participantScope')))?String(data.get('participantScope')):'none';
    const values={title:String(data.get('title')).trim(),mode:String(data.get('mode')),dueDate:String(data.get('dueDate')||''),priority:['High','Normal','Low'].includes(data.get('priority'))?data.get('priority'):'Normal',participantScope,participantIds:participantScope==='specific'?data.getAll('participantIds').map(String):[]},existing=state.tasks.find(task=>task.id===form.dataset.id);if(existing)Object.assign(existing,values);else state.tasks.push({id:uid('task'),...values,done:false});save();state.modal=null;render()}
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
// works natively -- real <button> elements). Per §5, right/next and left/previous follow reading
// direction, with no RTL branch since this app has no LTR mode. Phase 1.1: the carousel re-renders
// around the selection, so the arrow keys click the neighbour marked data-pos next/prev (wrapping
// included) and put focus back on the newly selected item, letting the keys keep working.
addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft'].includes(event.key))return;
  const carousel=event.target.closest('[data-carousel]');if(!carousel)return;
  const target=carousel.querySelector(event.key==='ArrowRight'?'[data-pos="next"]':'[data-pos="prev"]');
  if(target){event.preventDefault();target.click();document.querySelector('.p-carousel-item.selected')?.focus()}
});
// Phase 1.1: horizontal swipes. On the carousel (>=40px): dragging right selects the next option,
// left the previous -- the spec's own reading-direction rule (§5), exactly one option per swipe.
// On a started leading Today card (>=90px, clearly more horizontal than vertical): ends the item
// early (F6), same as its "הסתיים" button. The click that follows a recognised swipe is swallowed.
addEventListener('pointerdown',event=>{
  const carousel=event.target.closest('[data-carousel]'),card=event.target.closest('[data-swipe-end]');
  endSwipe=carousel||card?{x:event.clientX,y:event.clientY,carousel,card}:null;
},{passive:true});
addEventListener('pointerup',event=>{
  if(!endSwipe)return;
  const {x,y,carousel,card}=endSwipe,dx=event.clientX-x,dy=event.clientY-y;endSwipe=null;
  if(Math.abs(dx)<(carousel?40:90)||Math.abs(dx)<2*Math.abs(dy))return;
  if(carousel)carousel.querySelector(dx>0?'[data-pos="next"]':'[data-pos="prev"]')?.click();
  else endItem(card.dataset.swipeEnd);
  suppressClickUntil=Date.now()+400;
});
// Beta 0.8 Phase 1: bridge from main.js's own account-bar settings button (see its own comment) --
// this module owns route()/state.view, main.js deliberately doesn't reach into either directly.
addEventListener('familytrips:open-settings',()=>route('settings'));
// Phase 1.1: Today's leading card, "עכשיו"/relative-time labels and the 3h rules all depend on the
// current time, which nothing else re-renders for -- refresh once a minute, only while Today is on
// screen with no form open and the tab visible, so it never interrupts typing or another screen.
setInterval(()=>{if(state.view==='today'&&!state.modal&&document.visibilityState==='visible')render()},60000);
render();boot();
