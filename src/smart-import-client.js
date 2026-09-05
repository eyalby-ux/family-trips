import { auth } from './firebase.js';
import { resolveSmartImportErrorMessage, resolveSmartImportSubmissionMode } from './operational-data.js';

const ENDPOINT='/api/familytrips-smart-import';
const MAX_BINARY_BYTES=4*1024*1024;

export async function analyzeHotelSource({trip,source,file,url}){
  return runSource({operation:'analyze_hotel',trip,source,file,url,allowUrl:true});
}

// Add no longer asks Hotel vs. Flight up front (removed alongside this) -- the server
// classifies from content first, then runs the matching extraction; result.category tells the
// caller which adapter to route the draft through.
// V6-F69: url was previously missing from this signature entirely and hardcoded to '' below,
// unlike analyzeHotelSource/analyzeActivitySource in this same file, which both correctly accept
// and forward it -- a link source (which has no file at all) always fell into runSource's
// file-required branch and threw before any network request was attempted, for every URL
// regardless of content-type/robots.txt/reachability. This is the one call site used for a
// brand-new item's global Add before its category is known, so the bug affected every category,
// not just one.
export async function analyzeSource({trip,source,file,url}){
  return runSource({operation:'analyze_source',trip,source,file,url,allowUrl:true});
}

// Flight Smart Import (0.6.5): no public-URL source is in scope, so it is rejected here with a
// clear message before ever reaching the server (which also rejects it independently).
export async function analyzeFlightSource({trip,source,file}){
  return runSource({operation:'analyze_flight',trip,source,file,url:'',allowUrl:false});
}

// Attraction/Event Smart Import (0.6.6): unlike Flight, public URL acquisition IS in scope --
// official venue/museum/OTA URLs are the intended target; a ticket-resale/box-office platform
// URL is expected to safe-fail server-side (access_required or robots_disallowed), which is
// documented as expected behavior, not rejected client-side the way Flight's URL is.
export async function analyzeActivitySource({trip,source,file,url}){
  return runSource({operation:'analyze_activity',trip,source,file,url,allowUrl:true});
}

async function runSource({operation,trip,source,file,url,allowUrl}){
  const user=auth.currentUser;
  if(!user)throw new Error('נדרשת התחברות פעילה כדי לנתח מקור.');
  if(!navigator.onLine)throw new Error('ניתוח חכם דורש חיבור לאינטרנט. המקור נשמר מקומית וניתן לנסות שוב.');
  const token=await user.getIdToken();
  const tripId=String(trip?.id||'').trim();
  if(!tripId)throw new Error('לא נמצא טיול פעיל.');
  await request(token,{operation:'register_trip',tripId});
  const mode=resolveSmartImportSubmissionMode(url,file,allowUrl);
  let submittedSource;
  if(mode==='url'){
    submittedSource={kind:'url',url:String(url).trim(),name:String(source?.name||url)};
  }else{
    if(file.size>MAX_BINARY_BYTES)throw new Error('בגרסת 0.6.5 ניתן לנתח קובץ עד 4MB. אפשר לשמור אותו ללא ניתוח.');
    submittedSource={
      kind:file.type==='application/pdf'?'pdf':'image',
      name:file.name,
      mimeType:file.type||inferMime(file.name),
      size:file.size,
      dataBase64:await fileToBase64(file)
    };
  }
  return request(token,{operation,tripId,source:submittedSource});
}

async function request(token,body){
  const response=await fetch(ENDPOINT,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  // V6-F71: previously `payload.message||errorMessage(...)` -- the server's own English message
  // always won whenever present, which is every httpError call site in netlify/functions/
  // smart-import.mjs (each one supplies one), so the Hebrew dictionary (now
  // resolveSmartImportErrorMessage, src/operational-data.js) was effectively dead code for every
  // entry, including robots_disallowed. Fixed: the dictionary is now consulted FIRST, by error
  // code, and only falls back to the server's own raw message for a code with no Hebrew entry at
  // all -- so an entry, once added, is actually reachable. Five codes currently have no entry
  // (invalid_trip/invalid_operation/invalid_url/authentication_required/source_too_large, audited
  // directly against every httpError(...) call site in netlify/functions/) and so still fall back
  // to the server's raw English message -- correct/expected given none was asked for those
  // lower-severity/rare paths, not itself a bug.
  if(!response.ok)throw new Error(resolveSmartImportErrorMessage(payload.error,response.status,payload.message));
  return payload;
}

function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(new Error('קריאת הקובץ נכשלה.'));reader.readAsDataURL(file)})}
function inferMime(name){return /\.pdf$/i.test(name)?'application/pdf':/\.png$/i.test(name)?'image/png':'image/jpeg'}
