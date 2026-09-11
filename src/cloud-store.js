// 0.7.2: the Firestore-backed replacement for the old single-key localStorage blob. Design:
// docs/versions/V7/0.7.2/DESIGN_V1.md. Key property this module exists to preserve: every call
// site throughout v5-app.js still does `mutate state.x; save(); render()` synchronously, exactly
// as before -- render() only ever reads the in-memory `state` object, never this module directly.
// This module's job is purely to keep Firestore eventually consistent with that in-memory state
// (diff-and-write on save(), listen-and-assemble on subscribe()), not to change how the rest of
// the app thinks about its own data.
import {auth,db,storage} from './firebase.js';
import {collection,deleteDoc,doc,getDoc,getDocs,onSnapshot,query,setDoc,where,writeBatch} from 'firebase/firestore';
import {deleteObject,getDownloadURL,ref,uploadBytes} from 'firebase/storage';
import {SYNCED_COLLECTIONS,TRIP_NESTED_FIELDS,TRIP_TOP_LEVEL_FIELDS,diffById} from './operational-data.js';

export {SYNCED_COLLECTIONS};

function tripRef(tripId){return doc(db,'trips',tripId)}
function subRef(tripId,collectionName){return collection(db,'trips',tripId,collectionName)}

// Applies every collection's diff plus any changed trip-scalar fields in one Firestore batch.
// Firestore batches cap at 500 operations -- realistic for this app's data at household-Trip
// scale (see DESIGN_V1.md §4.4), but chunked defensively rather than assumed safe forever.
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
  for(const [stateKey,collectionName] of SYNCED_COLLECTIONS){
    const {toSet,toDelete}=diffById(previousSnapshot?.[stateKey],nextState[stateKey]);
    for(const record of toSet)writes.push({type:'set',ref:doc(subRef(tripId,collectionName),String(record.id)),data:record,merge:false});
    for(const id of toDelete)writes.push({type:'delete',ref:doc(subRef(tripId,collectionName),String(id))});
  }
  for(let start=0;start<writes.length;start+=450){
    const batch=writeBatch(db);
    for(const write of writes.slice(start,start+450)){
      if(write.type==='delete')batch.delete(write.ref);
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
export function subscribeToTrip(tripId,onUpdate){
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
  const unsubscribers=[
    onSnapshot(tripRef(tripId),snapshot=>{
      if(!snapshot.exists())return;
      const data=snapshot.data();
      for(const field of TRIP_NESTED_FIELDS)assembled.trip[field]=data[field];
      assembled.trip.ownerUid=data.ownerUid;assembled.trip.editorEmails=data.editorEmails||[];
      for(const field of TRIP_TOP_LEVEL_FIELDS)assembled[field]=data[field];
      tripLoaded=true;maybeEmit();
    }),
    ...SYNCED_COLLECTIONS.map(([stateKey,collectionName])=>onSnapshot(subRef(tripId,collectionName),snapshot=>{
      assembled[stateKey]=snapshot.docs.map(document=>document.data());
      loadedCollections.add(stateKey);maybeEmit();
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

// Clears every record in every subcollection but leaves the Trip document itself (name/dates)
// intact -- backs the existing "מחיקת נתוני הטיול" danger-zone action, which has always preserved
// the Trip's own identity while wiping its content.
export async function clearAllTripContent(tripId){
  for(const [,collectionName] of SYNCED_COLLECTIONS){
    const snapshot=await getDocs(subRef(tripId,collectionName));
    for(let start=0;start<snapshot.docs.length;start+=450){
      const batch=writeBatch(db);
      for(const document of snapshot.docs.slice(start,start+450))batch.delete(document.ref);
      await batch.commit();
    }
  }
}

// Full, permanent removal -- backs "מחיקת הטיול הנוכחי". Deletes every subcollection record, every
// Storage attachment under this Trip, and the Trip document itself, in that order (attachments and
// content before the Trip doc, so a failure partway through never leaves an orphaned Storage file
// with no Trip document left to explain what it belonged to).
export async function deleteTripCompletely(tripId){
  const sourcesSnapshot=await getDocs(subRef(tripId,'sources'));
  for(const document of sourcesSnapshot.docs){
    const storagePath=document.data()?.storagePath;
    if(storagePath)await deleteAttachment(storagePath);
  }
  await clearAllTripContent(tripId);
  await deleteDoc(tripRef(tripId));
}

export async function addEditorByEmail(tripId,email){
  const normalized=String(email||'').trim().toLowerCase();
  if(!normalized)throw new Error('יש להזין כתובת אימייל.');
  const snapshot=await getDoc(tripRef(tripId));
  if(!snapshot.exists())throw new Error('הטיול לא נמצא.');
  const current=new Set(snapshot.data().editorEmails||[]);
  current.add(normalized);
  await setDoc(tripRef(tripId),{editorEmails:[...current]},{merge:true});
  return [...current];
}

export async function removeEditorByEmail(tripId,email){
  const normalized=String(email||'').trim().toLowerCase();
  const snapshot=await getDoc(tripRef(tripId));
  if(!snapshot.exists())return [];
  const current=new Set(snapshot.data().editorEmails||[]);
  current.delete(normalized);
  await setDoc(tripRef(tripId),{editorEmails:[...current]},{merge:true});
  return [...current];
}

// Storage layout: trips/{tripId}/sources/{sourceId}/{filename}, per DESIGN_V1.md §1.3 -- mirrors
// the pre-existing separation between source metadata (Firestore) and source bytes (previously
// IndexedDB, now Storage), rather than introducing a new shape.
function attachmentRef(tripId,sourceId,filename){return ref(storage,`trips/${tripId}/sources/${sourceId}/${filename}`)}

export async function uploadAttachment(tripId,sourceId,file){
  const reference=attachmentRef(tripId,sourceId,file.name);
  await uploadBytes(reference,file,{contentType:file.type||'application/octet-stream'});
  return reference.fullPath;
}
export async function downloadAttachment(storagePath){
  const reference=ref(storage,storagePath);
  const url=await getDownloadURL(reference);
  const response=await fetch(url);
  if(!response.ok)throw new Error('הורדת הקובץ מהאחסון נכשלה.');
  return response.blob();
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
