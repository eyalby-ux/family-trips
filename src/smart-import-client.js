import { auth } from './firebase.js';
import { resolveSmartImportSubmissionMode } from './operational-data.js';

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
  if(!response.ok)throw new Error(payload.message||errorMessage(payload.error,response.status));
  return payload;
}

function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.onerror=()=>reject(new Error('קריאת הקובץ נכשלה.'));reader.readAsDataURL(file)})}
function inferMime(name){return /\.pdf$/i.test(name)?'application/pdf':/\.png$/i.test(name)?'image/png':'image/jpeg'}
// V6-F70: added robots_unverifiable alongside the existing robots_disallowed entry, as asked --
// but note this whole dict is a FALLBACK, not the primary path: request() above prefers the
// server's own payload.message verbatim whenever one is present, which is always, for every
// httpError call site in netlify/functions/smart-import.mjs (each one supplies a message). This
// dict is only actually reached if response.json() fails to parse the body at all. Flagged as a
// real, separate discovery (every existing entry here has been effectively dead code for the same
// reason) rather than fixed for the pre-existing entries, which is broader than what was asked.
function errorMessage(code,status){const messages={not_invited:'החשבון אינו נמצא ברשימת המוזמנים.',trip_not_owned:'הטיול אינו בבעלות החשבון הפעיל.',daily_quota_exceeded:'מכסת הניתוח היומית הסתיימה.',unsupported_source:'סוג המקור אינו נתמך.',protected_or_private_url:'הקישור אינו ציבורי או דורש גישה פרטית.',robots_disallowed:'האתר חוסם גישה אוטומטית לדף זה (robots.txt). אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.',robots_unverifiable:'לא ניתן היה לאמת מראש שהאתר מתיר גישה אוטומטית (robots.txt), וניתוח הדף נכשל. אפשר לשמור את הקישור ולנסות ניתוח ידני, או לבחור PDF/תמונה של הכרטיס במקום.',missing_server_configuration:'שירות Smart Import עדיין אינו מוגדר בסביבת הבדיקה.'};return messages[code]||`ניתוח המקור נכשל (${status}).`}
