// 0.7.2: the Firestore-backed replacement for the old single-key localStorage blob. Design:
// docs/versions/V7/0.7.2/DESIGN_V1.md. Key property this module exists to preserve: every call
// site throughout v5-app.js still does `mutate state.x; save(); render()` synchronously, exactly
// as before -- render() only ever reads the in-memory `state` object, never this module directly.
// This module's job is purely to keep Firestore eventually consistent with that in-memory state
// (diff-and-write on save(), listen-and-assemble on subscribe()), not to change how the rest of
// the app thinks about its own data.
import {auth,db,storage} from './firebase.js';
import {collection,deleteDoc,deleteField,doc,getDoc,getDocs,onSnapshot,query,setDoc,where,writeBatch} from 'firebase/firestore';
import {deleteObject,getBytes,ref,uploadBytes} from 'firebase/storage';
import {SYNCED_COLLECTIONS,TRIP_NESTED_FIELDS,TRIP_TOP_LEVEL_FIELDS,diffById} from './operational-data.js';

export {SYNCED_COLLECTIONS};

function tripRef(tripId){return doc(db,'trips',tripId)}
function subRef(tripId,collectionName){return collection(db,'trips',tripId,collectionName)}

// Applies every collection's diff plus any changed trip-scalar fields in one Firestore batch.
// Firestore batches cap at 500 operations -- realistic for this app's data at household-Trip
// scale (see DESIGN_V1.md §4.4), but chunked defensively rather than assumed safe forever.
// 0.7.3 (DESIGN_V1.md §2.2): record writes are now field-level (batch.update(), only the fields
// diffById says actually changed) instead of whole-document overwrites (batch.set(...,
// {merge:false})) -- see diffById's own comment (operational-data.js) for the silent-loss bug this
// closes. A brand-new record still needs a full batch.set() (update() fails against a document
// that doesn't exist yet); an existing record's deleted fields are cleared via Firestore's own
// deleteField() sentinel, not just omitted -- omitting a field from an update() call leaves it
// untouched server-side, it does not remove it.
// syncedAt/syncedByUid (NOT the app's own pre-existing, domain-meaningful `updatedAt` field some
// records already carry, e.g. suggestions' proposal-lifecycle timestamp -- reusing that name here
// would silently conflate two unrelated meanings under one field) give each record a cheap,
// attributable "last synced by" pair, per DESIGN_V1.md §2.2's recommendation: same-field-same-record
// concurrent edits stay last-write-wins by design (no automatic merge is meaningful there), but are
// now at least attributable after the fact instead of a complete mystery.
export async function syncTripState(tripId,previousSnapshot,nextState){
  const writes=[];
  const tripPatch={};
  for(const field of TRIP_NESTED_FIELDS){
    const prior=previousSnapshot?.trip?.[field],next=nextState.trip?.[field];
    if(JSON.stringify(prior)!==JSON.stringify(next))tripPatch[field]=next===undefined?null:next;
  }
  for(const field of TRIP_TOP_LEVEL_FIELDS){
    const prior=previousSnapshot?.[field],next=nextState[field];
    if(JSON.stringify(prior)!==JSON.stringify(next))tripPatch[field]=next===undefined?null:next;
  }
  if(Object.keys(tripPatch).length)writes.push({type:'set',ref:tripRef(tripId),data:tripPatch,merge:true});
  const syncedAt=new Date().toISOString(),syncedByUid=currentUid();
  for(const [stateKey,collectionName] of SYNCED_COLLECTIONS){
    const {toCreate,toUpdate,toDelete}=diffById(previousSnapshot?.[stateKey],nextState[stateKey]);
    for(const record of toCreate)writes.push({type:'set',ref:doc(subRef(tripId,collectionName),String(record.id)),data:{...record,syncedAt,syncedByUid}});
    for(const {id,changedFields,deletedFields} of toUpdate){
      const data={...changedFields,syncedAt,syncedByUid};
      for(const field of deletedFields)data[field]=deleteField();
      writes.push({type:'update',ref:doc(subRef(tripId,collectionName),String(id)),data});
    }
    for(const id of toDelete)writes.push({type:'delete',ref:doc(subRef(tripId,collectionName),String(id))});
  }
  for(let start=0;start<writes.length;start+=450){
    const batch=writeBatch(db);
    for(const write of writes.slice(start,start+450)){
      if(write.type==='delete')batch.delete(write.ref);
      else if(write.type==='update')batch.update(write.ref,write.data);
      else batch.set(write.ref,write.data,write.merge?{merge:true}:{});
    }
    await batch.commit();
  }
  // The snapshot returned here becomes the caller's new "last synced" baseline -- a plain clone of
  // what was actually just written, so the next diff starts from truth, not from what Firestore's
  // own listeners might still be catching up to.
  return JSON.parse(JSON.stringify(nextState));
}

// Assembles one full state-shaped object from a Trip doc plus every subcollection, and keeps it
// live via onSnapshot. Calls onUpdate(assembledState) once for the initial load and again on every
// subsequent remote change (another device, an Editor, or this device's own write echoing back).
// Returns an unsubscribe function. 0.7.2's own scope stops here -- it does not attempt merge or
// conflict resolution for a genuinely concurrent edit; that is 0.7.3's job, per DESIGN_V1.md §4.2.
//
// Real bug, caught by the Product Owner's own live acceptance retest (Test 8 got WORSE after the
// offline-auth-restore fix -- an empty-Trip screen became a hard crash): none of the onSnapshot
// calls below ever provided an error callback. That gap existed from this module's very first
// version, but was never exercised, because boot() (v5-app.js) used to bail out before ever
// reaching openTrip()/subscribeToTrip() while offline (auth.currentUser was never populated
// there). Once that was fixed, boot() started reaching this code offline for the first time ever
// -- and any listener error here was, and still is without this fix, completely uncaught: an
// unhandled promise-adjacent exception with no page ever rendering, which is a plausible, direct
// explanation for "a hard white-page crash" replacing what used to be a merely-empty one. onError
// is now required and wired through to a real, visible fallback in v5-app.js's openTrip() instead
// of leaving a failure silent or fatal.
export function subscribeToTrip(tripId,onUpdate,onError){
  // Shape matches the app's own in-memory `state` exactly (state.trip.{name,startDate,endDate,
  // createdAt,ownerUid,editorEmails} nested; timelineCursor/packedCollapsed/packingCollapsed and
  // every SYNCED_COLLECTIONS array top-level) so v5-app.js's openTrip() can assign this straight
  // onto `state` with no reshaping.
  const assembled={trip:{id:tripId}};
  for(const field of TRIP_TOP_LEVEL_FIELDS)assembled[field]=undefined;
  for(const [stateKey]of SYNCED_COLLECTIONS)assembled[stateKey]=[];
  let tripLoaded=false;
  const loadedCollections=new Set();
  const maybeEmit=()=>{if(tripLoaded&&loadedCollections.size===SYNCED_COLLECTIONS.length)onUpdate(JSON.parse(JSON.stringify(assembled)))};
  const handleError=error=>{console.error('Trip subscription failed',error);if(onError)onError(error)};
  const unsubscribers=[
    onSnapshot(tripRef(tripId),{
      next:snapshot=>{
        if(!snapshot.exists())return;
        const data=snapshot.data();
        for(const field of TRIP_NESTED_FIELDS)assembled.trip[field]=data[field];
        assembled.trip.ownerUid=data.ownerUid;assembled.trip.editorEmails=data.editorEmails||[];
        for(const field of TRIP_TOP_LEVEL_FIELDS)assembled[field]=data[field];
        tripLoaded=true;maybeEmit();
      },
      error:handleError,
    }),
    ...SYNCED_COLLECTIONS.map(([stateKey,collectionName])=>onSnapshot(subRef(tripId,collectionName),{
      next:snapshot=>{
        assembled[stateKey]=snapshot.docs.map(document=>document.data());
        loadedCollections.add(stateKey);maybeEmit();
      },
      error:handleError,
    })),
  ];
  return ()=>unsubscribers.forEach(unsubscribe=>unsubscribe());
}

// Both queries a user can ever legitimately run against /trips at this app's scale: Trips they
// own, and Trips shared with them as an Editor. Unioned client-side -- two simple queries, not a
// denormalized "my trips" index collection, matching DESIGN_V1.md §1.4's reasoning.
export async function listMyTrips(uid,email){
  const [ownedSnapshot,sharedSnapshot]=await Promise.all([
    getDocs(query(collection(db,'trips'),where('ownerUid','==',uid))),
    getDocs(query(collection(db,'trips'),where('editorEmails','array-contains',email))),
  ]);
  const byId=new Map();
  for(const document of [...ownedSnapshot.docs,...sharedSnapshot.docs])byId.set(document.id,{id:document.id,...document.data()});
  return [...byId.values()];
}

// Idempotent and non-destructive: a real existence check first, not just an in-memory
// last-synced-snapshot check -- save()'s own "have I synced this trip yet in this session" guard
// is a much weaker signal than "does this document actually exist in Firestore", and conflating
// the two would let a second call (e.g. right after switchTrip(), before the first snapshot has
// arrived) silently overwrite an existing trip's real editorEmails back to an empty array. Only
// ever writes when the document is genuinely missing.
export async function createTripDoc(tripId,seed,ownerUid){
  const existing=await getDoc(tripRef(tripId));
  if(existing.exists())return;
  await setDoc(tripRef(tripId),{...seed,ownerUid,editorEmails:[]});
}

// 0.7.6 (DESIGN_V1.md §4.1, V7-F08): a single prefix-based sweep, not a per-source
// Firestore-driven iteration like the old deleteTripCompletely loop this replaces -- catches any
// Storage object under this Trip even if its owning source's Firestore record is already gone
// (exactly clearAllTripContent's own case below, which deletes every sources record first), and
// mirrors admin-delete-account.mjs's own already-correct bucket-prefix-delete pattern rather than
// leaving two independently-maintained deletion-cleanup mechanisms in this codebase.
// 0.7.6 correction (round 2, found live): the listAll()-based prefix sweep this replaced never
// actually worked, for two independent reasons -- (1) listAll() is NOT recursive; files live at
// trips/{tripId}/sources/{sourceId}/{fileName}, one segment deeper than the trips/{tripId}/sources/
// prefix it was called on, so `items` was always empty and the `prefixes` (the real sourceId
// subfolders) were never touched, and (2) Firebase Storage evaluates a `list` rule against its
// entire potential result set, which the `list` permission this round's own attempted rules fix
// added still couldn't safely satisfy for this depth. Reverted to reading the known storagePath
// directly from each Firestore `sources` record instead -- the exact pattern deleteTripCompletely
// used successfully before 0.7.6 touched it, just now shared with clearAllTripContent too. This
// needs no `list` Storage permission at all: deleteAttachment() only ever touches one exact,
// already-known file path, covered by the existing file-level read/write rule.
async function deleteAllAttachments(tripId){
  const snapshot=await getDocs(subRef(tripId,'sources'));
  for(const document of snapshot.docs){
    const storagePath=document.data()?.storagePath;
    if(storagePath)await deleteAttachment(storagePath);
  }
  // 0.9.2: Bingo photos live in the same Storage layout but have no `sources` record -- their paths are on the game's own boards, so sweep those too.
  const games=await getDocs(subRef(tripId,'games'));
  for(const document of games.docs){
    for(const byParticipant of Object.values(document.data()?.boards||{}))for(const board of Object.values(byParticipant||{}))for(const entry of Object.values(board?.found||{}))if(entry?.photoPath)await deleteAttachment(entry.photoPath);
  }
}

// Clears every record in every subcollection but leaves the Trip document itself (name/dates)
// intact -- backs the existing "מחיקת נתוני הטיול" danger-zone action, which has always preserved
// the Trip's own identity while wiping its content.
// 0.7.6 (V7-F08): this was the real, currently-reachable orphan-Storage bug -- every attachment
// survived in Firebase Storage with no Firestore record left to ever reference it again, since
// neither sourceRow() (no delete action, only open/analyze) nor delete-item (unlinks, never
// deletes, its sources) can reach a single-attachment-delete path at all; "reset Trip data" was
// the only currently-reachable way a source's Firestore record was ever removed without its
// Storage file going with it. Storage cleanup runs first, before the Firestore batch deletes
// below, matching this project's own established ordering discipline (Storage before Firestore,
// so a failure partway through never leaves an orphaned file with nothing left to explain it).
export async function clearAllTripContent(tripId){
  await deleteAllAttachments(tripId);
  for(const [,collectionName] of SYNCED_COLLECTIONS){
    const snapshot=await getDocs(subRef(tripId,collectionName));
    for(let start=0;start<snapshot.docs.length;start+=450){
      const batch=writeBatch(db);
      for(const document of snapshot.docs.slice(start,start+450))batch.delete(document.ref);
      await batch.commit();
    }
  }
}

// Full, permanent removal -- backs "מחיקת הטיול הנוכחי". Deletes every Storage attachment under
// this Trip, every subcollection record, and the Trip document itself, in that order. 0.7.6: the
// old per-source deleteAttachment loop that used to live here is gone -- clearAllTripContent's own
// deleteAllAttachments() call above already covers this exact case (Storage cleanup before the
// Firestore document tree comes down), so there is now one single deletion-cleanup mechanism in
// this file, not two.
export async function deleteTripCompletely(tripId){
  await clearAllTripContent(tripId);
  await deleteDoc(tripRef(tripId));
}

// 0.7.5 (DESIGN_V1.md §2): editorHistory is a plain-write audit trail alongside the live,
// rules-checked editorEmails array -- written best-effort, after the real access-granting write
// above already succeeded, so a history-write failure never blocks the actual grant/revoke itself
// (the array is what rules and hasTripAccess() actually check; history is display-only, for the
// Trip Owner's own sharingSection() panel).
function editorHistoryRef(tripId,email){return doc(collection(db,'trips',tripId,'editorHistory'),email)}
async function recordEditorHistory(tripId,email,state){
  try{await setDoc(editorHistoryRef(tripId,email),{email,state,...(state==='active'?{grantedAt:new Date().toISOString()}:{revokedAt:new Date().toISOString()})},{merge:true})}
  catch(error){console.error('editorHistory write failed',error)}
}

export async function addEditorByEmail(tripId,email){
  const normalized=String(email||'').trim().toLowerCase();
  if(!normalized)throw new Error('יש להזין כתובת אימייל.');
  const snapshot=await getDoc(tripRef(tripId));
  if(!snapshot.exists())throw new Error('הטיול לא נמצא.');
  const current=new Set(snapshot.data().editorEmails||[]);
  current.add(normalized);
  await setDoc(tripRef(tripId),{editorEmails:[...current]},{merge:true});
  await recordEditorHistory(tripId,normalized,'active');
  return [...current];
}

export async function removeEditorByEmail(tripId,email){
  const normalized=String(email||'').trim().toLowerCase();
  const snapshot=await getDoc(tripRef(tripId));
  if(!snapshot.exists())return [];
  const current=new Set(snapshot.data().editorEmails||[]);
  current.delete(normalized);
  await setDoc(tripRef(tripId),{editorEmails:[...current]},{merge:true});
  await recordEditorHistory(tripId,normalized,'revoked');
  return [...current];
}

// 0.7.5 (DESIGN_V1.md §2/§3/§6): admin invitation-management CRUD, all direct client writes gated
// by firestore.rules' own isAdmin() check (mirrors addEditorByEmail/removeEditorByEmail's own
// direct-write-gated-by-rules pattern above -- no separate Netlify Function needed for these,
// unlike admin-delete-account.mjs, which needs a privileged credential rules can't grant safely).
function invitationRef(email){return doc(db,'invitations',email)}
export async function listEditorHistory(tripId){
  const snapshot=await getDocs(collection(db,'trips',tripId,'editorHistory'));
  return snapshot.docs.map(document=>document.data());
}
export async function listInvitations(){
  const snapshot=await getDocs(collection(db,'invitations'));
  return snapshot.docs.map(document=>document.data());
}
export async function getMyInvitation(){
  const email=currentEmail();
  if(!email)return null;
  const snapshot=await getDoc(invitationRef(email));
  return snapshot.exists()?snapshot.data():null;
}
// isAdmin is deliberately never written here -- omitted entirely, not set to false, so
// merge:true leaves a genuinely re-invited former admin's isAdmin flag exactly as it was
// (per DESIGN_V1.md §2's "New open question 5": isAdmin is only ever hand-seeded directly in the
// Console, never through this or any other app write path). A brand-new invitation simply has no
// isAdmin field at all, which the rules' own `== true` check already treats as not-admin.
export async function inviteByEmail(email){
  const normalized=String(email||'').trim().toLowerCase();
  if(!normalized)throw new Error('יש להזין כתובת אימייל.');
  await setDoc(invitationRef(normalized),{email:normalized,state:'active',invitedAt:new Date().toISOString(),revokedAt:null},{merge:true});
}
export async function revokeInvitation(email){
  const normalized=String(email||'').trim().toLowerCase();
  await setDoc(invitationRef(normalized),{email:normalized,state:'revoked',revokedAt:new Date().toISOString()},{merge:true});
}
// 0.7.5.1 (V7-F11): reverses a revoke on the SAME still-quarantined record -- the same
// isAdmin()-gated write path invite/revoke already use, no new rule needed (confirmed by direct
// code inspection: firestore.rules' isInvited()/hasTripAccess() and storage.rules' own isInvited()
// both key off nothing but this document's `state` field, so flipping it back to 'active' restores
// access immediately, with no other change needed -- verified against the actual rule text, not
// assumed). revokedAt is cleared (not left as history) -- a re-activated account should read as
// genuinely active, not carry a stale "revoked N days ago" timestamp forward; isDeletionEligible
// already refuses on state alone (`invitation.state!=='revoked'`) so a leftover revokedAt was never
// load-bearing for safety either way, but clearing it keeps the record itself honest.
export async function reactivateInvitation(email){
  const normalized=String(email||'').trim().toLowerCase();
  await setDoc(invitationRef(normalized),{email:normalized,state:'active',revokedAt:null},{merge:true});
}
// 0.7.5.1 (V7-F12): general-purpose, unlike getMyInvitation() above (which only ever reads the
// signed-in caller's own record) -- used by sharingSection()'s add-editor flow to check whether a
// newly-added Editor has an active application invitation at all, per firestore.rules' own
// `allow read: if request.auth != null` (any invited caller may read any invitations/{email}
// document, not just their own -- see that rule's own comment for why this is intentionally broad).
export async function getInvitation(email){
  const normalized=String(email||'').trim().toLowerCase();
  if(!normalized)return null;
  const snapshot=await getDoc(invitationRef(normalized));
  return snapshot.exists()?snapshot.data():null;
}

// Storage layout: trips/{tripId}/sources/{sourceId}/{filename}, per DESIGN_V1.md §1.3 -- mirrors
// the pre-existing separation between source metadata (Firestore) and source bytes (previously
// IndexedDB, now Storage), rather than introducing a new shape.
// 0.7.6 (DESIGN_V1.md §3, the frozen contract's deferred "encryption and retention" decision for a
// synced original -- confirmed, not left open, so a future reader doesn't reopen this): encryption
// is satisfied by Firebase Storage's own at-rest default, a Google Cloud platform guarantee this
// project's code does not and need not control. Retention is satisfied by the already-frozen
// explicit-deletion-only rule -- an original persists until deleteAllAttachments()/deleteAttachment()
// removes it (via clearAllTripContent/deleteTripCompletely or admin-delete-account.mjs), never on a
// time-based expiry. The Storage bucket itself has been confirmed to carry no GCS-level lifecycle/
// object-expiry rule (Product Owner, Google Cloud Console, 2026-09-23) that could silently
// undermine this from outside this file's own code.
function attachmentRef(tripId,sourceId,filename){return ref(storage,`trips/${tripId}/sources/${sourceId}/${filename}`)}

export async function uploadAttachment(tripId,sourceId,file){
  const reference=attachmentRef(tripId,sourceId,file.name);
  await uploadBytes(reference,file,{contentType:file.type||'application/octet-stream'});
  return reference.fullPath;
}
// Real bug, caught by the Product Owner's own live acceptance testing (Test 7, "Can't open" --
// console showed a CORS rejection fetching the Storage download URL directly). getDownloadURL()
// plus a raw cross-origin fetch() is a browser-to-storage.googleapis.com request that needs the
// bucket's own CORS configuration to allow the app's origin -- a separate, one-time GCS
// infrastructure step (gsutil/Cloud Console), unrelated to storage.rules or anything deployable
// through this repo. getBytes() avoids the problem entirely: it downloads through the Storage
// SDK's own network layer, the same mechanism uploadBytes() already uses successfully above, so no
// bucket CORS configuration is needed at all -- this is Firebase's own documented alternative for
// exactly this browser scenario.
export async function downloadAttachment(storagePath,contentType){
  const reference=ref(storage,storagePath);
  const bytes=await getBytes(reference);
  return new Blob([bytes],contentType?{type:contentType}:undefined);
}
export async function deleteAttachment(storagePath){
  try{await deleteObject(ref(storage,storagePath))}catch(error){if(error?.code!=='storage/object-not-found')throw error}
}

// One-time migration of an existing localStorage/IndexedDB Trip into Firestore/Storage, per
// DESIGN_V1.md §3.2: explicit (caller decides when to run it), verified (re-reads everything back
// and compares before declaring success), never silent. `readLocalBlob(sourceId)` is injected by
// the caller (v5-app.js still owns the IndexedDB access, this module has no reason to know its
// schema) and may return null for a source with no locally stored file.
export async function migrateLocalTripToFirestore(localState,ownerUid,readLocalBlob){
  const tripId=localState.trip.id;
  const tripSeed={};
  for(const field of TRIP_NESTED_FIELDS)if(localState.trip[field]!==undefined)tripSeed[field]=localState.trip[field];
  for(const field of TRIP_TOP_LEVEL_FIELDS)if(localState[field]!==undefined)tripSeed[field]=localState[field];
  await createTripDoc(tripId,tripSeed,ownerUid);

  // Attachments first, so every migrated source record can carry its real storagePath from the
  // start rather than a two-pass patch.
  const sourcesWithStorage=[];
  for(const source of localState.sources||[]){
    let storagePath=null;
    if(source.storedOffline&&source.kind!=='link'){
      const blob=await readLocalBlob(source.id);
      if(blob){
        const file=new File([blob],source.name||source.id,{type:source.type||'application/octet-stream'});
        storagePath=await uploadAttachment(tripId,source.id,file);
      }
    }
    sourcesWithStorage.push(storagePath?{...source,storagePath}:source);
  }

  const tripFields={};for(const field of TRIP_NESTED_FIELDS)tripFields[field]=tripSeed[field];
  const nextState={...localState,trip:{id:tripId,...tripFields},sources:sourcesWithStorage};
  const writtenSnapshot=await syncTripState(tripId,null,nextState);

  // Verify: re-read every synced collection straight back from Firestore and compare record
  // counts against what was just written -- not a full re-download of every attachment byte (that
  // would double the migration's own network cost for a check the write's own success/failure
  // already mostly covers), but a real, direct confirmation nothing silently dropped a record.
  const mismatches=[];
  for(const [stateKey,collectionName] of SYNCED_COLLECTIONS){
    const expected=(nextState[stateKey]||[]).length;
    const snapshot=await getDocs(subRef(tripId,collectionName));
    if(snapshot.size!==expected)mismatches.push(`${collectionName}: expected ${expected}, found ${snapshot.size}`);
  }
  const tripSnapshot=await getDoc(tripRef(tripId));
  if(!tripSnapshot.exists())mismatches.push('trip document missing after write');
  if(mismatches.length)throw new Error(`אימות ההעברה נכשל: ${mismatches.join('; ')}`);

  return {tripId,snapshot:writtenSnapshot,migratedAt:new Date().toISOString()};
}

export function currentUid(){return auth.currentUser?.uid||null}
export function currentEmail(){return String(auth.currentUser?.email||'').trim().toLowerCase()}
