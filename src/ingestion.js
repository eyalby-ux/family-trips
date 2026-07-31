export const ITEM_TYPES = {
  flight: { label: 'טיסה', icon: '✈️', schedule: 'single' },
  hotel: { label: 'מלון', icon: '🏨', schedule: 'range' },
  car: { label: 'רכב שכור', icon: '🚗', schedule: 'range' },
  activity: { label: 'אטרקציה', icon: '🎟️', schedule: 'single' },
  restaurant: { label: 'מסעדה', icon: '🍽️', schedule: 'single' },
  insurance: { label: 'ביטוח', icon: '🛡️', schedule: 'entire' },
  document: { label: 'מסמך', icon: '📄', schedule: 'none' },
  contact: { label: 'איש קשר', icon: '☎️', schedule: 'none' },
  participant: { label: 'משתתף', icon: '👨‍👩‍👧‍👦', schedule: 'none' },
};

const PROVIDERS = [
  { label: 'EL AL', pattern: /\b(?:el\s?-?\s?al|elal)\b|אל\s?-?\s?על/i, type: 'flight' },
  { label: 'Arkia', pattern: /\barkia\b|ארקיע/i, type: 'flight' },
  { label: 'Israir', pattern: /\bisrair\b|ישראייר/i, type: 'flight' },
  { label: 'Booking.com', pattern: /booking\.com/i, type: 'hotel' },
  { label: 'Agoda', pattern: /\bagoda\b/i, type: 'hotel' },
  { label: 'Airbnb', pattern: /\bairbnb\b/i, type: 'hotel' },
];

const TYPE_RULES = [
  { type: 'flight', weight: 4, pattern: /\bflight\b|\bboarding\b|\bairline\b|\bpnr\b|טיסה|כרטיס עלייה/i },
  { type: 'flight', weight: 2, pattern: /\bticket\b|\bdeparture\b|\barrival\b/i },
  { type: 'hotel', weight: 4, pattern: /\bhotel\b|\broom\b|\bcheck[ -]?in\b|\bcheck[ -]?out\b|מלון|חדר/i },
  { type: 'car', weight: 4, pattern: /\bcar rental\b|\brental car\b|\bvehicle\b|השכרת רכב/i },
  { type: 'insurance', weight: 4, pattern: /\binsurance\b|\bpolicy\b|ביטוח/i },
  { type: 'restaurant', weight: 4, pattern: /\brestaurant\b|\btable reservation\b|מסעדה/i },
  { type: 'activity', weight: 3, pattern: /\battraction\b|\btour\b|\bactivity\b|\bevent\b|אטרקציה|סיור/i },
];

const GENERIC_WORDS = new Set(['booking','reservation','confirmation','document','scan','screenshot','image','photo','pdf','copy','final','new','trip','travel','voucher']);

export function normalizeTitle(value='') {
  const decoded=safeDecode(String(value));
  const withoutQuery=decoded.split(/[?#]/)[0];
  const lastPart=withoutQuery.split('/').filter(Boolean).at(-1)||decoded;
  const noExtension=lastPart.replace(/\.[a-z0-9]{1,6}$/i,'');
  const words=noExtension.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim().split(' ').filter(w=>w&&!GENERIC_WORDS.has(w.toLowerCase()));
  return words.join(' ').trim()||'מקור נסיעה חדש';
}

export function detectProvider(text='') {
  const normalizedText=String(text).replace(/[_-]+/g,' ');
  const match=PROVIDERS.find(p=>p.pattern.test(normalizedText));
  return match?{label:match.label,type:match.type}:null;
}

export function inferItemType(text='') {
  const normalizedText=String(text).replace(/[_-]+/g,' ');
  const provider=detectProvider(normalizedText);
  const scores=new Map();
  if(provider) scores.set(provider.type,6);
  for(const rule of TYPE_RULES) if(rule.pattern.test(normalizedText)) scores.set(rule.type,(scores.get(rule.type)||0)+rule.weight);
  const ranked=[...scores.entries()].sort((a,b)=>b[1]-a[1]);
  if(!ranked.length) return {type:'document',confidence:'low',score:0,provider};
  const [type,score]=ranked[0];
  return {type,confidence:score>=7?'high':score>=4?'medium':'low',score,provider};
}

export function extractDates(text='') {
  text=String(text).replace(/_/g,' ');
  const found=[]; let match;
  const iso=/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g;
  const dayFirst=/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g;
  while((match=iso.exec(text))) found.push(`${match[1]}-${pad(match[2])}-${pad(match[3])}`);
  while((match=dayFirst.exec(text))) found.push(`${match[3]}-${pad(match[2])}-${pad(match[1])}`);
  return [...new Set(found)].sort();
}

export function extractConfirmationNumber(text='') {
  const explicit=text.match(/(?:confirmation|booking|reservation|pnr|reference|ref)[\s_:#-]*([A-Z0-9]{5,12})/i);
  if(explicit) return explicit[1].toUpperCase();
  const compact=text.match(/\b(?=[A-Z0-9]{6,8}\b)(?=.*[A-Z])(?=.*\d)[A-Z0-9]+\b/i);
  return compact?compact[0].toUpperCase():'';
}

export function createSuggestion(source, now=new Date()) {
  const searchable=[source.name,source.url,source.text].filter(Boolean).join(' ');
  const inference=inferItemType(searchable);
  const dates=extractDates(searchable);
  const confirmationNumber=extractConfirmationNumber(searchable);
  const warnings=[];
  if(inference.type==='document') warnings.push('לא זוהה סוג פריט בביטחון');
  if(!dates.length&&!['document','contact','participant'].includes(inference.type)) warnings.push('לא זוהה תאריך');
  if(!confirmationNumber) warnings.push('לא זוהה מספר הזמנה');
  if(!inference.provider) warnings.push('לא זוהה ספק');
  return {
    id:makeId('suggestion'),sourceId:source.id,status:'pending',
    proposed:{type:inference.type,title:normalizeTitle(source.name||source.url||''),provider:inference.provider?.label||'',confirmationNumber,participants:[],location:'',startAt:dates[0]?`${dates[0]}T12:00`:'',endAt:dates[1]?`${dates[1]}T12:00`:'',schedule:ITEM_TYPES[inference.type]?.schedule||'none',notes:''},
    confidence:inference.confidence,warnings,createdAt:now.toISOString(),updatedAt:now.toISOString()
  };
}

export function findPossibleDuplicates(suggestion,items=[]) {
  const p=suggestion.proposed||suggestion;
  return items.filter(item=>{
    if(p.confirmationNumber&&item.confirmationNumber) return p.confirmationNumber.toLowerCase()===item.confirmationNumber.toLowerCase();
    const sameType=p.type===item.type;
    const sameProvider=normalized(p.provider)&&normalized(p.provider)===normalized(item.provider);
    const sameTitle=normalized(p.title)&&normalized(p.title)===normalized(item.title);
    const sameDate=dateOnly(p.startAt)&&dateOnly(p.startAt)===dateOnly(item.startAt);
    return sameType&&((sameProvider&&sameDate)||(sameTitle&&sameDate));
  });
}

export function suggestionToItem(suggestion,existing={}) {
  const p=suggestion.proposed;
  return {...existing,id:existing.id||makeId('item'),type:p.type,title:p.title.trim(),provider:p.provider.trim(),confirmationNumber:p.confirmationNumber.trim(),participants:[...(p.participants||[])],location:p.location.trim(),schedule:p.schedule||ITEM_TYPES[p.type]?.schedule||'none',startAt:p.startAt||'',endAt:p.endAt||'',notes:p.notes.trim(),sourceIds:[...new Set([...(existing.sourceIds||[]),suggestion.sourceId])],updatedAt:new Date().toISOString()};
}

export function validateSource({kind,file,url}) {
  if(kind==='link') {
    try { const parsed=new URL(url); if(!['http:','https:'].includes(parsed.protocol)) throw new Error('protocol'); return {ok:true}; }
    catch { return {ok:false,error:'יש להזין קישור HTTP או HTTPS תקין'}; }
  }
  if(!file) return {ok:false,error:'יש לבחור קובץ'};
  const supported=file.type==='application/pdf'||file.type.startsWith('image/');
  if(!supported) return {ok:false,error:'הקובץ אינו נתמך. אפשר להעלות PDF או תמונה'};
  if(file.size>15*1024*1024) return {ok:false,error:'הקובץ גדול מ־15MB'};
  return {ok:true};
}

function safeDecode(v){try{return decodeURIComponent(v)}catch{return v}}
function pad(v){return String(v).padStart(2,'0')}
function normalized(v=''){return String(v).trim().toLowerCase().replace(/\s+/g,' ')}
function dateOnly(v=''){return String(v).slice(0,10)}
function makeId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
