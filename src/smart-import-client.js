import { auth } from './firebase.js';

const ENDPOINT='/api/familytrips-smart-import';
const MAX_BINARY_BYTES=4*1024*1024;

export async function analyzeHotelSource({trip,source,file,url}){
  return analyzeSource({operation:'analyze_hotel',trip,source,file,url,allowUrl:true});
}

// Flight Smart Import (0.6.5): no public-URL source is in scope, so it is rejected here with a
// clear message before ever reaching the server (which also rejects it independently).
export async function analyzeFlightSource({trip,source,file}){
  return analyzeSource({operation:'analyze_flight',trip,source,file,url:'',allowUrl:false});
}

async function analyzeSource({operation,trip,source,file,url,allowUrl}){
  const user=auth.currentUser;
  if(!user)throw new Error('נדרשת התחברות פעילה כדי לנתח מקור.');
  if(!navigator.onLine)throw new Error('ניתוח חכם דורש חיבור לאינטרנט. המקור נשמר מקומית וניתן לנסות שוב.');
  const token=await user.getIdToken();
  const tripId=String(trip?.id||'').trim();
  if(!tripId)throw new Error('לא נמצא טיול פעיל.');
  await request(token,{operation:'register_trip',tripId});
  let submittedSource;
  if(url){
    if(!allowUrl)throw new Error('קישור ציבורי אינו נתמך עבור סוג מקור זה.');
    submittedSource={kind:'url',url:String(url).trim(),name:String(source?.name||url)};
  }else{
    if(!file)throw new Error('יש לבחור PDF או תמונה.');
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
function errorMessage(code,status){const messages={not_invited:'החשבון אינו נמצא ברשימת המוזמנים.',trip_not_owned:'הטיול אינו בבעלות החשבון הפעיל.',daily_quota_exceeded:'מכסת הניתוח היומית הסתיימה.',unsupported_source:'סוג המקור אינו נתמך.',protected_or_private_url:'הקישור אינו ציבורי או דורש גישה פרטית.',missing_server_configuration:'שירות Smart Import עדיין אינו מוגדר בסביבת הבדיקה.'};return messages[code]||`ניתוח המקור נכשל (${status}).`}
