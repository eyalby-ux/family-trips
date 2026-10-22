// Beta 0.9.2: photos kept ON THE DEVICE so Bingo can be played offline. A photo is saved here first (key = its Storage path), shown from here, and
// uploaded later when there is a connection; a photo downloaded from Storage is cached here too, so a board that was opened once also opens offline.
// IndexedDB when the browser has it; a session-long in-memory map always (private windows, tests), so nothing here can throw.
const memory=new Map();
const DB='family-trips-photos',STORE='photos';
let dbPromise=null;
function openDb(){
  if(typeof indexedDB==='undefined')return Promise.resolve(null);
  dbPromise=dbPromise||new Promise(resolve=>{
    try{
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'path'})};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
    }catch{resolve(null)}
  });
  return dbPromise;
}
const run=(db,mode,action)=>new Promise(resolve=>{
  try{const request=action(db.transaction(STORE,mode).objectStore(STORE));request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(undefined)}catch{resolve(undefined)}
});
export async function putLocalPhoto(path,blob){
  memory.set(path,blob);
  const db=await openDb();if(db)await run(db,'readwrite',store=>store.put({path,blob,savedAt:Date.now()}));
  return true;
}
export async function getLocalPhoto(path){
  if(memory.has(path))return memory.get(path);
  const db=await openDb();if(!db)return null;
  const record=await run(db,'readonly',store=>store.get(path));
  if(record?.blob){memory.set(path,record.blob);return record.blob}
  return null;
}
export async function deleteLocalPhoto(path){
  memory.delete(path);
  const db=await openDb();if(db)await run(db,'readwrite',store=>store.delete(path));
}
