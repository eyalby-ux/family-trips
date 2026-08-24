export const ITEM_TYPES = {
  flight:{label:'טיסה',icon:'✈️',schedule:'single'},hotel:{label:'מלון',icon:'🏨',schedule:'range'},car:{label:'רכב שכור',icon:'🚗',schedule:'range'},activity:{label:'אטרקציה',icon:'🎟️',schedule:'single'},restaurant:{label:'מסעדה',icon:'🍽️',schedule:'single'},insurance:{label:'ביטוח',icon:'🛡️',schedule:'entire'},link:{label:'קישור',icon:'🔗',schedule:'none'},document:{label:'מסמך',icon:'📄',schedule:'none'},contact:{label:'איש קשר',icon:'☎️',schedule:'none'},participant:{label:'משתתף',icon:'👨‍👩‍👧‍👦',schedule:'none'},
};
export const TYPE_FIELDS={
  flight:['provider','confirmationNumber','location','startAt','endAt','participants','notes'],hotel:['provider','confirmationNumber','location','website','phone','startAt','endAt','participants','notes'],car:['provider','confirmationNumber','location','phone','startAt','endAt','participants','notes'],activity:['provider','confirmationNumber','location','website','startAt','participants','notes'],restaurant:['provider','confirmationNumber','location','website','phone','startAt','participants','notes'],insurance:['provider','confirmationNumber','phone','participants','notes'],link:['website','notes'],contact:['provider','phone','website','location','notes'],participant:['phone','notes'],
};
const PROVIDERS=[
  {label:'EL AL',pattern:/\b(?:el\s?-?\s?al|elal)\b|אל\s?-?\s?על/i,type:'flight'},{label:'Arkia',pattern:/\barkia\b|ארקיע/i,type:'flight'},{label:'Israir',pattern:/\bisrair\b|ישראייר/i,type:'flight'},{label:'Thai Airways',pattern:/\bthai airways\b/i,type:'flight'},{label:'Booking.com',pattern:/booking\.com/i,type:'hotel'},{label:'Agoda',pattern:/\bagoda\b/i,type:'hotel'},{label:'Airbnb',pattern:/\bairbnb\b/i,type:'hotel'},
];
const TYPE_RULES=[
  {type:'flight',weight:5,pattern:/\bflight(?:s)?\b|\bboarding\b|\bairline\b|\bpnr\b|טיסה|כרטיס עלייה/i},{type:'flight',weight:2,pattern:/\bticket\b|\bdeparture\b|\barrival\b|\b[A-Z]{2}\s?\d{2,4}\b/i},{type:'hotel',weight:5,pattern:/\bhotel\b|\bresort\b|\blodge\b|\baccommodation\b|\broom\b|\bcheck[ -]?in\b|\bcheck[ -]?out\b|מלון|אתר נופש|חדר/i},{type:'car',weight:5,pattern:/\bcar rental\b|\brental car\b|\bvehicle\b|\bpick[ -]?up\b.*\bdrop[ -]?off\b|השכרת רכב/i},{type:'insurance',weight:5,pattern:/\binsurance\b|\bpolicy\b|ביטוח/i},{type:'restaurant',weight:5,pattern:/\brestaurant\b|\btable reservation\b|מסעדה/i},{type:'activity',weight:4,pattern:/\battraction\b|\btour\b|\bactivity\b|\bevent\b|אטרקציה|סיור/i},
];
const GENERIC_WORDS=new Set(['booking','reservation','confirmation','document','scan','screenshot','image','photo','pdf','copy','final','new','trip','travel','voucher']);
const AIRPORTS='TLV|MXP|BKK|HKT|KBV|CNX|DMK|USM|FCO|LHR|CDG|DXB|AUH|IST|ATH';

export function normalizeTitle(value=''){
  const decoded=safeDecode(String(value)),last=(decoded.split(/[?#]/)[0].split('/').filter(Boolean).at(-1)||decoded).replace(/\.[a-z0-9]{1,6}$/i,'');
  const words=last.replace(/[_-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim().split(' ').filter(word=>word&&!GENERIC_WORDS.has(word.toLowerCase()));
  return words.join(' ').trim()||'מקור נסיעה חדש';
}
export function detectProvider(text=''){const normalized=String(text).replace(/[_-]+/g,' ');const match=PROVIDERS.find(provider=>provider.pattern.test(normalized));return match?{label:match.label,type:match.type}:null}
export function inferItemType(text=''){
  const value=String(text).replace(/[_-]+/g,' '),provider=detectProvider(value),scores=new Map();
  if(provider)scores.set(provider.type,7);
  for(const rule of TYPE_RULES)if(rule.pattern.test(value))scores.set(rule.type,(scores.get(rule.type)||0)+rule.weight);
  const ranked=[...scores.entries()].sort((a,b)=>b[1]-a[1]);
  if(!ranked.length)return {type:'document',confidence:'low',score:0,provider,evidence:[]};
  const [type,score]=ranked[0];return {type,confidence:score>=9?'high':score>=5?'medium':'low',score,provider,evidence:[provider?.label||'',type].filter(Boolean)};
}
export function extractDates(text=''){
  const value=String(text).replace(/_/g,' '),found=[];let match;
  const patterns=[
    {regex:/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g,map:m=>`${m[1]}-${pad(m[2])}-${pad(m[3])}`},
    {regex:/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g,map:m=>`${m[3]}-${pad(m[2])}-${pad(m[1])}`},
    {regex:/\b(0?[1-9]|[12]\d|3[01])\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/gi,map:m=>`${m[3]}-${pad(monthNumber(m[2]))}-${pad(m[1])}`},
  ];
  for(const {regex,map} of patterns)while((match=regex.exec(value)))found.push({date:map(match),index:match.index,label:contextLabel(value,match.index)});
  return [...new Map(found.sort((a,b)=>a.index-b.index).map(entry=>[entry.date,entry])).values()].map(entry=>entry.date);
}
export function extractConfirmationNumber(text=''){
  const value=String(text);
  const labels=/(?:booking(?:[\s_]+(?:id|number|no\.?|reference|confirmation))?|reservation(?:[\s_]+(?:number|no\.?|reference|confirmation))?|confirmation(?:[\s_]+(?:number|no\.?|code))?|pnr|record[\s_]+locator|reference(?:[\s_]+(?:number|no\.?|code))?|מספר\s+הזמנה|מספר\s+אישור|קוד\s+הזמנה)[\s_]*[:#-]?[\s_]*([A-Z0-9][A-Z0-9-]{4,19})/ig;
  let match;
  while((match=labels.exec(value))){
    const candidate=match[1].toUpperCase().replace(/[.,;]$/,'');
    if(isSafeConfirmation(candidate,value,match.index))return candidate;
  }
  return '';
}
export function extractPhone(text=''){
  const match=String(text).match(/(?:phone|telephone|tel\.?|contact\s+number|טלפון)\s*[:#-]?\s*((?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4})/i);
  if(!match)return '';const digits=match[1].replace(/\D/g,'');return digits.length>=7&&digits.length<=15?match[1].trim():'';
}
export function extractWebsite(text=''){const match=String(text).match(/https?:\/\/[^\s<>"']+/i);return match?match[0].replace(/[),.;]+$/,''):''}
export function extractLocation(text=''){
  const value=String(text),labeled=value.match(/(?:hotel\s+address|address|location|meeting\s+point|כתובת|מיקום)\s*[:\-]\s*([^\n]{5,180})/i);
  if(labeled)return stopAtNextLabel(labeled[1]).trim();
  const route=value.match(new RegExp(`\\b(${AIRPORTS})\\b\\s*(?:→|–|-|to)\\s*\\b(${AIRPORTS})\\b`,'i'));
  return route?`${route[1].toUpperCase()} → ${route[2].toUpperCase()}`:'';
}
export function extractFlightSegments(text=''){
  const value=String(text),matches=[...value.matchAll(new RegExp(`\\b([A-Z]{2})\\s?(\\d{2,4})\\b[\\s\\S]{0,240}?\\b(${AIRPORTS})\\b\\s*(?:→|–|-|to)\\s*\\b(${AIRPORTS})\\b`,'gi'))];
  return matches.map((match,index)=>{
    const window=value.slice(match.index,Math.min(value.length,(matches[index+1]?.index??match.index+420)));
    const dates=extractDates(window),time=window.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return {flightNumber:`${match[1].toUpperCase()}${match[2]}`,location:`${match[3].toUpperCase()} → ${match[4].toUpperCase()}`,date:dates[0]||'',time:time?`${pad(time[1])}:${time[2]}`:'',evidence:match[0].slice(0,120)};
  });
}
export function createSuggestions(source,now=new Date()){
  const searchable=[source.pageTitle,source.name,source.url,source.text].filter(Boolean).join('\n'),inference=inferItemType(searchable),dates=extractDates(searchable),confirmationNumber=extractConfirmationNumber(searchable),segments=inference.type==='flight'?extractFlightSegments(searchable):[];
  if(source.kind==='link'&&(inference.type==='document'||inference.type==='link'||inference.confidence==='low'))return [];
  const pageTitle=String(source.pageTitle||'').trim(),title=pageTitle&&pageTitle!==source.url?pageTitle:normalizeTitle(source.name||source.url||'');
  const base={type:inference.type,title,provider:inference.provider?.label||'',confirmationNumber,participants:[],location:extractLocation(searchable),website:source.kind==='link'?String(source.url||''):extractWebsite(searchable),phone:extractPhone(searchable),startAt:'',endAt:'',schedule:ITEM_TYPES[inference.type]?.schedule||'none',notes:'',details:{},dateMeta:{startPrecision:'unknown',endPrecision:'unknown',startTimeZone:'',endTimeZone:''},fieldConfidence:{},warnings:[]};
  const proposals=segments.length>1?segments.map((segment,index)=>({...base,title:`${base.provider||'טיסה'} ${segment.flightNumber} — ${segment.location}`,location:segment.location,startAt:segment.date?`${segment.date}T${segment.time||'12:00'}`:'',details:{flightNumber:segment.flightNumber,segmentIndex:index+1,segmentCount:segments.length},dateMeta:{...base.dateMeta,startPrecision:segment.time?'minute':segment.date?'date':'unknown'},fieldConfidence:{type:{confidence:inference.confidence,evidence:inference.evidence},flightNumber:{confidence:'high',evidence:segment.evidence},location:{confidence:'high',evidence:segment.evidence}}})): [{...base,startAt:(dates[0]||source.tripStartDate)?`${dates[0]||source.tripStartDate}T12:00`:'',endAt:dates[1]?`${dates[1]}T12:00`:(ITEM_TYPES[inference.type]?.schedule==='range'&&(dates[0]||source.tripStartDate)?`${dates[0]||source.tripStartDate}T12:00`:''),dateMeta:{...base.dateMeta,startPrecision:dates[0]?'date':source.tripStartDate?'inferred':'unknown',endPrecision:dates[1]?'date':'unknown',inferredFromTrip:!dates[0]&&!!source.tripStartDate},fieldConfidence:{type:{confidence:inference.confidence,evidence:inference.evidence},confirmationNumber:{confidence:confirmationNumber?'high':'low',evidence:confirmationNumber?'explicit label':'not found'},location:{confidence:base.location?'medium':'low',evidence:base.location?'label/route':'not found'}}}];
  return proposals.map((proposed,index)=>{
    const warnings=[...(source.extractionWarnings||[])];
    if(inference.type==='document')warnings.push('לא זוהה סוג נסיעה בביטחון — יש לבחור סוג במידת הצורך');
    if(!proposed.startAt&&!['document','contact','participant','insurance'].includes(inference.type))warnings.push('לא זוהה תאריך');
    if(!confirmationNumber)warnings.push('לא זוהה מספר הזמנה — השדה נשאר ריק');
    if(!inference.provider)warnings.push('לא זוהה ספק');
    return {id:makeId('suggestion'),sourceId:source.id,sourceIds:[source.id],status:'pending',proposed:{...proposed,warnings},confidence:inference.confidence,warnings:[...new Set(warnings)],extractionEngine:source.extractionEngine||'metadata',sourceFingerprint:source.fingerprint||'',segmentIndex:index+1,segmentCount:proposals.length,createdAt:now.toISOString(),updatedAt:now.toISOString(),requiresReview:true};
  });
}
export function createSuggestion(source,now=new Date()){return createSuggestions(source,now)[0]}
export function findPossibleDuplicates(suggestion,items=[],sources=[]){
  const p=suggestion.proposed||suggestion,source=sources.find(candidate=>candidate.id===suggestion.sourceId);
  if(source?.fingerprint){
    const linkedIds=sources.filter(candidate=>candidate.id!==source.id&&candidate.fingerprint===source.fingerprint).map(candidate=>candidate.id);
    const linkedItems=items.filter(item=>(item.sourceIds||[]).some(id=>linkedIds.includes(id)));
    if(linkedItems.length)return linkedItems;
  }
  return items.filter(item=>{
    if(p.confirmationNumber&&item.confirmationNumber&&normalized(p.confirmationNumber)===normalized(item.confirmationNumber))return p.type===item.type;
    const sameType=p.type===item.type,sameProvider=normalized(p.provider)&&normalized(p.provider)===normalized(item.provider),sameTitle=normalized(p.title)&&normalized(p.title)===normalized(item.title),sameDate=dateOnly(p.startAt)&&dateOnly(p.startAt)===dateOnly(item.startAt);
    return sameType&&((sameProvider&&sameDate)||(sameTitle&&sameDate));
  });
}
export function suggestionToItem(suggestion,existing={},tripStartDate=''){
  const p=suggestion.proposed,sourceIds=suggestion.sourceIds?.length?suggestion.sourceIds:[suggestion.sourceId].filter(Boolean);
  const value=(key,fallback='')=>!isBlank(p[key])?clone(p[key]):!isBlank(existing[key])?clone(existing[key]):fallback;
  const isNewItem=!existing.id;
  const schedule=value('schedule',ITEM_TYPES[p.type]?.schedule||'none');
  let startAt=value('startAt','');
  let endAt=value('endAt','');
  if(isNewItem&&!startAt&&tripStartDate&&!['none','entire'].includes(schedule)){
    startAt=`${tripStartDate}T12:00`;
    if(schedule==='range'&&!endAt)endAt=`${tripStartDate}T12:00`;
  }
  return {...existing,id:existing.id||makeId('item'),type:value('type','document'),title:String(value('title','')).trim(),provider:String(value('provider','')).trim(),confirmationNumber:String(value('confirmationNumber','')).trim(),participants:value('participants',[]),location:String(value('location','')).trim(),website:String(value('website','')).trim(),phone:String(value('phone','')).trim(),schedule,startAt,endAt,notes:String(value('notes','')).trim(),details:{...(existing.details||{}),...(p.details||{})},dateMeta:{...(existing.dateMeta||{}),...(p.dateMeta||{})},fieldConfidence:{...(existing.fieldConfidence||{}),...(p.fieldConfidence||{})},warnings:[...(existing.warnings||[]),...(p.warnings||suggestion.warnings||[])],sourceIds:[...new Set([...(existing.sourceIds||[]),...sourceIds])],updatedAt:new Date().toISOString()};
}
export function validateSource({kind,file,url}){
  if(kind==='link'){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error();return {ok:true}}catch{return {ok:false,error:'יש להזין קישור HTTP או HTTPS תקין'}}}
  if(kind==='photo')return {ok:false,error:'קליטה חכמה מתמונה או צילום מושהית עד לתכנון מחדש'};
  if(!file)return {ok:false,error:'יש לבחור קובץ PDF'};const supported=file.type==='application/pdf'||String(file.name||'').toLowerCase().endsWith('.pdf');if(!supported)return {ok:false,error:'ב־0.5.6 אפשר לבדוק במסלול זה קובצי PDF בלבד'};if(file.size>15*1024*1024)return {ok:false,error:'הקובץ גדול מ־15MB'};return {ok:true};
}
export function mapsUrl(location=''){const value=String(location).trim();return value?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`:''}
function isSafeConfirmation(candidate,text,index){if(/^(SCREENSHOT|YITZHAK|IMAGE|PHOTO|BOOKING|RESERVATION)$/i.test(candidate))return false;if(new RegExp(`^[A-Z]{2}\\d{2,4}$`,'i').test(candidate))return false;const before=text.slice(Math.max(0,index-20),index).toLowerCase();return !/flight\s*(?:no|number)?\s*$/.test(before)}
function contextLabel(text,index){return text.slice(Math.max(0,index-35),index).match(/(check[ -]?in|check[ -]?out|departure|arrival|start|end|יציאה|הגעה|כניסה|עזיבה)[^\n]{0,20}$/i)?.[1]||''}
function stopAtNextLabel(value){return value.split(/\s+(?:check[ -]?in|check[ -]?out|phone|tel|booking|confirmation|arrival|departure)\s*[:#-]?/i)[0]}
function safeDecode(value){try{return decodeURIComponent(value)}catch{return value}}function pad(value){return String(value).padStart(2,'0')}function normalized(value=''){return String(value).trim().toLowerCase().replace(/\s+/g,' ')}function dateOnly(value=''){return String(value).slice(0,10)}function makeId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}function monthNumber(value){return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(String(value).slice(0,3).toLowerCase())+1}function isBlank(value){return value==null||value===''||(Array.isArray(value)&&!value.length)}function clone(value){return JSON.parse(JSON.stringify(value))}
