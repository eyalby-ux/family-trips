import {clearResolvedDirectionWarning,isSameFlightAcrossDirectionCandidates,isSameFlightForDedup,isSameFlightNumberAndDate,mergeFlightDetails,normalizeFlightNumber} from './flight-import-adapter.js';
import {mergeActivityDetails} from './activity-import-adapter.js';
import {mergeInsuranceDetails} from './insurance-import-adapter.js';
import {isValidCalendarDate,normalizeDateRange,today} from './operational-data.js';
import {MERGE_CONFLICT_WARNING_PREFIX} from './smart-import-adapter.js';

// 0.7.4: first-class Transport items (MVP scope: "transfers, rail, ferry/boat, rental vehicles and
// other local transport"). Verified before implementing, not assumed: `car` already existed here
// (label "רכב שכור" -- rental car) and was already a fully working item type -- selectable in the
// manual-creation dropdown, its own Trip Center tile, TYPE_FIELDS entry, QR/JSON import (already in
// external-import.js's own TYPES allowlist). FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V5.md
// already described it as covering rental car AND transfer together ("רכב שכור/הסעה"). Decision:
// broaden `car` in place into the first-class Transport type (relabeled, new TRANSPORT_MODES
// sub-type field added to TYPE_FIELDS.car below) rather than add separate new type(s) alongside it
// -- renaming the type KEY itself would need a data migration for any already-synced `car` item
// with no real benefit (every mode shares the same natural field set: provider, confirmation
// number, pickup/drop-off location, phone, start/end time, participants, notes), so the existing
// key is kept and only its scope/label/fields grow. AI Smart Import extraction remains explicitly
// out of scope for this candidate -- manual entry and QR/JSON import only, per the scope document.
export const TRANSPORT_MODES={transfer:'הסעה',rail:'רכבת',ferry:'מעבורת',car:'רכב שכור',other:'אחר'};
// 0.7.7: shoppingPlace's `schedule` default ('none') is the only one of these that is not actually
// fixed for the type -- the same record may later be dated (see buildItemFormValues below, which
// derives its real schedule per-save from whether a date was actually entered, instead of blindly
// from this default like every other type). Everything else about it -- Firestore sync via
// state.items, participant scope, Timeline/Calendar projection, dynamic form rendering -- comes
// from being a normal ITEM_TYPES entry, the same reasoning 0.7.4 used for Transport.
export const ITEM_TYPES = {
  flight:{label:'טיסה',icon:'✈️',schedule:'single'},hotel:{label:'מלון',icon:'🏨',schedule:'range'},car:{label:'תחבורה',icon:'🚐',schedule:'range'},activity:{label:'אטרקציה',icon:'🎟️',schedule:'single'},restaurant:{label:'מסעדה',icon:'🍽️',schedule:'single'},insurance:{label:'ביטוח',icon:'🛡️',schedule:'entire'},link:{label:'קישור',icon:'🔗',schedule:'none'},document:{label:'מסמך',icon:'📄',schedule:'none'},contact:{label:'איש קשר',icon:'☎️',schedule:'none'},participant:{label:'משתתף',icon:'👨‍👩‍👧‍👦',schedule:'none'},shoppingPlace:{label:'מקום קניות',icon:'🏬',schedule:'none'},
};
export const TYPE_FIELDS={
  flight:['provider','confirmationNumber','location','startAt','endAt','participants','notes'],hotel:['provider','confirmationNumber','location','website','phone','startAt','endAt','participants','notes'],car:['transportMode','provider','confirmationNumber','location','website','email','phone','startAt','endAt','participants','notes'],activity:['provider','confirmationNumber','location','website','startAt','participants','notes'],restaurant:['provider','confirmationNumber','location','website','phone','startAt','participants','notes'],insurance:['provider','confirmationNumber','website','phone','startAt','endAt','participants','notes'],link:['website','notes'],contact:['provider','phone','website','location','notes'],participant:['phone','notes'],shoppingPlace:['location','website','phone','startAt','notes'],
};
// 0.6.7 (Insurance discovery doc, Section 3/3a): coverage start/end dates are captured and shown
// on the item for reference and validity checking, but insurance.schedule stays fixed at 'entire'
// -- ITEM_TYPES.insurance is deliberately NOT changed, so startAt/endAt never drive Timeline
// placement and no insurance item (whole-trip or dedicated/activity-linked alike) ever appears on
// the date-based Timeline/Today view. `relatedItemIds` (an array of other item ids this policy
// covers) is a SEPARATE, insurance-only field, added directly on the item shape rather than
// through TYPE_FIELDS -- proposalFields() (v5-app.js) only knows how to render TYPE_FIELDS' fixed
// set of scalar text/date inputs, and an array-of-ids relationship needs its own dedicated
// multi-select control (relatedItemsPanel, v5-app.js), the same way mergeCandidatePanel and
// directionPickerPanel are dedicated UI blocks rather than generic form fields. Never populated by
// Smart Import extraction (no source document states a relationship to another item); set
// manually by the user after the item exists. The reverse direction (a non-insurance item showing
// which insurance covers it) is a computed lookup at render time (insuranceCoveringItem, v5-app.js),
// not a stored field on any other type -- mirrors the existing linkedItems-via-shared-sourceIds
// computed-lookup pattern (findPossibleDuplicates, below) rather than a new relational-field concept.
const PROVIDERS=[
  {label:'EL AL',pattern:/\b(?:el\s?-?\s?al|elal)\b|אל\s?-?\s?על/i,type:'flight'},{label:'Arkia',pattern:/\barkia\b|ארקיע/i,type:'flight'},{label:'Israir',pattern:/\bisrair\b|ישראייר/i,type:'flight'},{label:'Thai Airways',pattern:/\bthai airways\b/i,type:'flight'},{label:'Booking.com',pattern:/booking\.com/i,type:'hotel'},{label:'Agoda',pattern:/\bagoda\b/i,type:'hotel'},{label:'Airbnb',pattern:/\bairbnb\b/i,type:'hotel'},
];
const TYPE_RULES=[
  {type:'flight',weight:5,pattern:/\bflight(?:s)?\b|\bboarding\b|\bairline\b|\bpnr\b|טיסה|כרטיס עלייה/i},{type:'flight',weight:2,pattern:/\bticket\b|\bdeparture\b|\barrival\b|\b[A-Z]{2}\s?\d{2,4}\b/i},{type:'hotel',weight:5,pattern:/\bhotel\b|\bresort\b|\blodge\b|\baccommodation\b|\broom\b|\bcheck[ -]?in\b|\bcheck[ -]?out\b|מלון|אתר נופש|חדר/i},{type:'car',weight:5,pattern:/\bcar rental\b|\brental car\b|\bvehicle\b|\bpick[ -]?up\b.*\bdrop[ -]?off\b|השכרת רכב/i},
  // 0.7.8: rail/ferry/transfer patterns, alongside the extraction work -- manual/free-text
  // classification only (this heuristic only ever returns item.type, never transportMode; the
  // user still picks the specific sub-type from the existing transportMode select either way).
  {type:'car',weight:5,pattern:/\btrain\b|\brailway\b|\bdeutsche bahn\b|רכבת/i},
  {type:'car',weight:5,pattern:/\bferry\b|\bferries\b|\bvessel\b|מעבורת/i},
  {type:'car',weight:4,pattern:/\btransfer\b.*\b(?:booking|confirmation|voucher)\b|\bshuttle\b|הסעה/i},
  {type:'insurance',weight:5,pattern:/\binsurance\b|\bpolicy\b|ביטוח/i},{type:'restaurant',weight:5,pattern:/\brestaurant\b|\btable reservation\b|מסעדה/i},{type:'activity',weight:4,pattern:/\battraction\b|\btour\b|\bactivity\b|\bevent\b|אטרקציה|סיור/i},
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
    // V6-F30: reconcile the same real flight across sources even with no shared PNR at all
    // (e.g. a personal itinerary screenshot next to a summary view of the same flight).
    if(isSameFlightNumberAndDate(p,item))return true;
    // V6-F36: a still direction-ambiguous suggestion has no primary startAt yet for
    // isSameFlightNumberAndDate to compare -- match it against an already-resolved item via its
    // candidate readings instead, so consolidation doesn't have to wait for a pick first.
    if(isSameFlightAcrossDirectionCandidates(p,item))return true;
    if(p.confirmationNumber&&item.confirmationNumber&&normalized(p.confirmationNumber)===normalized(item.confirmationNumber)){
      // A shared booking reference alone is not enough for flights: one PNR commonly covers
      // several distinct flights (e.g. outbound + return), which must stay separate items.
      if(p.type==='flight'||item.type==='flight')return isSameFlightForDedup(p,item);
      return p.type===item.type;
    }
    const sameType=p.type===item.type,sameProvider=normalized(p.provider)&&normalized(p.provider)===normalized(item.provider),sameTitle=normalized(p.title)&&normalized(p.title)===normalized(item.title),sameDate=dateOnly(p.startAt)&&dateOnly(p.startAt)===dateOnly(item.startAt);
    return sameType&&((sameProvider&&sameDate)||(sameTitle&&sameDate));
  });
}
// V6-F72: FL-003 reproduced FL-001's own already-once-confirmed RTL-layout misread (both legs'
// departure/arrival swapped, confidently, with no review flag at all) -- a live vision model's own
// visual parsing of a right-to-left itinerary layout is not something a text prompt instruction
// alone can fully guarantee to prevent, the same live-model-compliance ceiling already documented
// for V6-F53 (direction non-determinism) and V6-F65 (fabrication) -- prompt strengthening alone
// was already tried once for this exact failure class and clearly did not fully close it. This
// adds a real, deterministic, code-level safety net alongside the strengthened prompt: if a newly
// extracted flight segment shares its flight number with an ALREADY-SAVED flight item, but its
// departure and arrival airports are the EXACT REVERSE of that item's, this is the precise,
// unambiguous signature of the known failure mode (the same real flight, read backwards) --
// flagged needs_review rather than silently trusting either reading, regardless of which one
// happens to be right this time. Only fires when there is something to compare against (an
// existing saved item with the same flight number); it cannot help a flight number's very first
// extraction, which is exactly why the prompt-level strengthening still matters too.
export function flagReversedFlightDirection(suggestion,items=[]){
  const p=suggestion.proposed||suggestion;
  if(p.type!=='flight')return suggestion;
  const flightNumber=normalizeFlightNumber(p.details?.flightNumber);
  const dep=String(p.details?.departureAirport?.code||'').trim(),arr=String(p.details?.arrivalAirport?.code||'').trim();
  if(!flightNumber||!dep||!arr)return suggestion;
  const reversed=items.find(item=>{
    if(item.type!=='flight'||normalizeFlightNumber(item.details?.flightNumber)!==flightNumber)return false;
    const itemDep=String(item.details?.departureAirport?.code||'').trim(),itemArr=String(item.details?.arrivalAirport?.code||'').trim();
    return Boolean(itemDep)&&Boolean(itemArr)&&dep===itemArr&&arr===itemDep;
  });
  if(!reversed)return suggestion;
  const warning=`מספר טיסה ${p.details.flightNumber} כבר קיים בפריט אחר בכיוון הפוך (${reversed.location||`${reversed.details?.departureAirport?.code||''} → ${reversed.details?.arrivalAirport?.code||''}`}) — יש לוודא איזה כיוון נכון לפני אישור.`;
  return {...suggestion,proposed:{...p,warnings:[...(p.warnings||[]),warning]},warnings:[...(suggestion.warnings||p.warnings||[]),warning]};
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
  // A flight's nested details (per-passenger array, departure/arrival airport objects, and every
  // other detail scalar) need field-aware merging, not a plain object spread -- a plain spread
  // would let a newer, narrower suggestion (e.g. one passenger's individual e-ticket, or a still
  // direction-ambiguous companion source) silently drop every OTHER passenger, or wipe an
  // already-resolved direction/aircraft/class value back to blank (V6-F39). mergeFlightDetails
  // preserves existing non-blank values and only fills genuine gaps.
  // V6-F66: extends the flight-only field-aware details merge to Activity's own per-ticket-holder
  // array (mergeActivityDetails, activity-import-adapter.js), mirroring exactly the class of
  // problem Flight already solved for its per-passenger array -- every OTHER type still falls
  // through to the original plain object spread, unchanged.
  // 0.6.7: extends the same field-aware pattern to Insurance's own per-person array
  // (mergeInsuranceDetails, insurance-import-adapter.js) for the identical reason -- attaching a
  // second insurance document to an existing item must not silently replace insuredPersons.
  const details=value('type','')==='flight'&&existing.details&&p.details
    ?mergeFlightDetails(existing.details,p.details)
    :value('type','')==='activity'&&existing.details&&p.details
    ?mergeActivityDetails(existing.details,p.details)
    :value('type','')==='insurance'&&existing.details&&p.details
    ?mergeInsuranceDetails(existing.details,p.details)
    :{...(existing.details||{}),...(p.details||{})};
  const location=String(value('location','')).trim();
  // V6-F35/V6-F39 (fix pass 4): once a flight's direction is resolved -- location ends up
  // non-blank here, whether via an explicit Product Owner pick or by inheriting an already-
  // trusted item's value during this very merge (preserveTrustedFieldsOnMerge/mergeFlightDetails)
  // -- a stale "pick one" ambiguity warning carried in from an ambiguous companion suggestion's
  // own unresolved extraction attempt must not be dragged onto the item. Checked here, once, so
  // every merge path (general duplicate-merge, attach-and-extract) gets this for free.
  const directionNowResolved=value('type','')==='flight'&&Boolean(p.details?.directionCandidates?.length)&&Boolean(location);
  // V6-F66: the top-level participants array had the identical either/or defect one level up
  // (value('participants',[]) picks the new suggestion's array OR the existing one, never both) --
  // fixed only for 'activity' (the type this array is actually used for per-ticket-holder-derived
  // names) to avoid any unintended behavior change for Hotel/Flight/manual items, which don't
  // populate participants the same way. 0.6.7: 'insurance' has the identical shape (participants
  // derived from details.insuredPersons the same way activity derives from ticketHolders), so it
  // gets the same union treatment for the same reason.
  const participants=['activity','insurance'].includes(value('type',''))
    ?[...new Set([...(existing.participants||[]),...(p.participants||[])])].filter(Boolean)
    :value('participants',[]);
  const incomingWarnings=p.warnings||suggestion.warnings||[];
  return {...existing,id:existing.id||makeId('item'),type:value('type','document'),title:String(value('title','')).trim(),provider:String(value('provider','')).trim(),confirmationNumber:String(value('confirmationNumber','')).trim(),participants,location,website:String(value('website','')).trim(),phone:String(value('phone','')).trim(),schedule,startAt,endAt,notes:String(value('notes','')).trim(),details,dateMeta:{...(existing.dateMeta||{}),...(p.dateMeta||{})},fieldConfidence:{...(existing.fieldConfidence||{}),...(p.fieldConfidence||{})},warnings:[...(existing.warnings||[]),...(directionNowResolved?clearResolvedDirectionWarning(incomingWarnings):incomingWarnings)],sourceIds:[...new Set([...(existing.sourceIds||[]),...sourceIds])],updatedAt:new Date().toISOString()};
}
// V6-F35 (reopened, fix pass 5): the fix-pass-4 version of this only cleared a stale warning when
// a direction was resolved via the picker. Retesting FL-007 found the same class of bug on a
// plain manual edit: the Product Owner corrected an invalid arrival date/time directly in the
// review form, and the warning about the ORIGINAL (now-overwritten) value stayed displayed --
// this is a general "stale evidence" problem, not a direction-only one. A needs-review flag is
// tied to a specific field's value at the moment it was generated; once that field's actual
// value changes -- by a picker selection, a manual form edit, or a merge -- the flag no longer
// describes the current state and must clear. changedFields is the set of proposed-field names
// the caller knows it just overwrote (e.g. {'startAt','endAt'} for a direction pick or a manual
// date edit); any needsReviewFields entry mapped to one of those names is treated as resolved.
const NEEDS_REVIEW_FIELD_MAP={
  departureDateTime:['startAt'],arrivalDateTime:['endAt'],
  departureAirport:['location'],arrivalAirport:['location'],departureTerminal:['location'],arrivalTerminal:['location'],
  directionAmbiguity:['location','startAt','endAt'],
  bookingReference:['confirmationNumber'],
  // V6-F49: Hotel/Activity needsReviewFields entries are keyed by the RESOLVED proposed-field
  // name (see smart-import-adapter.js's push(...,target||canonical,...)), not a flight-shaped
  // key -- this table previously had no entries at all for that shape, so a Hotel needs-review
  // warning could never clear on manual edit even when it WAS backed by a structured field.
  startDate:['startAt'],endDate:['endAt'],startTime:['startAt'],endTime:['endAt'],
  title:['title'],provider:['provider'],confirmationNumber:['confirmationNumber'],website:['website'],phone:['phone'],
  // V6-F55 correction pass: 'location' had no entry at all -- a location/address-shaped
  // needs-review conflict (Hotel's property_address/hotel_address/location keys, now routed here
  // by smart-import-adapter.js's FIELD_MAP; Activity's already-correctly-keyed 'location') could
  // never clear no matter which field was edited, since this map had nothing to match it against.
  location:['location'],
};
export function reconcileStaleNeedsReview(proposed,changedFields){
  const needsReviewFields=proposed.details?.needsReviewFields;
  if(!Array.isArray(needsReviewFields)||!needsReviewFields.length||!changedFields||!changedFields.size)return proposed;
  const stillPending=[],resolvedLabels=[],resolvedKeys=[];
  for(const field of needsReviewFields){
    const mapped=NEEDS_REVIEW_FIELD_MAP[field.key]||[];
    if(mapped.some(name=>changedFields.has(name))){resolvedLabels.push(field.label);resolvedKeys.push(field.key)}
    else stillPending.push(field);
  }
  if(!resolvedLabels.length)return proposed;
  // V6-F55 (extension): a warning generated FROM a needsReviewFields entry now carries an explicit
  // needsReviewRef{key,value} (smart-import-adapter.js/activity-import-adapter.js) -- cleared here
  // by an EXACT key match, not a text-substring guess. The old label-substring fallback is kept
  // for any warning that still hasn't been migrated to that shape (e.g. an older/plain-string
  // warning already sitting in a fixture or in a real user's stored data).
  const warnings=(proposed.warnings||[]).filter(warning=>{
    if(typeof warning==='object'&&warning!==null&&warning.needsReviewRef)return !resolvedKeys.includes(warning.needsReviewRef.key);
    return !resolvedLabels.some(label=>String(warning).includes(label));
  });
  return {...proposed,details:{...proposed.details,needsReviewFields:stillPending},warnings};
}
// V6-F55 (extension): replaces the old heuristic -- "this warning will auto-clear when the right
// field is edited, so don't offer a manual dismiss" decided by checking whether the warning's
// rendered TEXT happened to contain the LABEL TEXT of any currently-live needsReviewFields entry
// (needsReviewLabels.some(label=>text.includes(label))). Field labels are generic, common Hebrew
// words -- "טלפון" (phone), "תאריך התחלה"/"תאריך סיום" (start/end date), "מספר הזמנה" (booking
// number) -- so a free-text warning that merely MENTIONS one of these common words in an unrelated
// sentence (e.g. a note that the phone number's RTL rendering is ambiguous, or that an address
// looks truncated) got misclassified as "resolvable by editing that field" purely by substring
// coincidence, even though it was never actually generated FROM a needsReviewFields entry at all
// -- and because it wasn't really field-backed, editing the field did nothing for it either
// (reconcileStaleNeedsReview only clears a warning tied to an entry that ACTUALLY got resolved),
// so it was stuck in both directions at once (Panvaree Resort's four never-clearing warnings).
// Fixed by requiring an EXPLICIT needsReviewRef{key,value} the warning carries only when it
// genuinely was generated from a needsReviewFields entry -- everything else (a plain string, or an
// object with neither needsReviewRef nor dismissible:true) is unconditionally dismissible, since
// it was never field-backed in the first place and has no other way to ever clear. Lives here
// (not v5-app.js, where it is used) because it is pure logic with no DOM dependency, the same
// reasoning that already put reconcileStaleNeedsReview/resolveMergeCandidate here -- and because
// it makes the function directly importable and testable, unlike v5-app.js (a CSS import makes it
// unimportable from plain Node).
export function isDismissibleWarning(value,details){
  if(typeof value==='object'&&value!==null&&value.dismissible===true)return true;
  if(typeof value==='object'&&value!==null&&value.needsReviewRef){
    const ref=value.needsReviewRef;
    const stillLive=(details?.needsReviewFields||[]).some(field=>field.key===ref.key&&field.value===ref.value);
    return !stillLive;
  }
  return true;
}
// V6-F55: replaces "silently keep the trusted value + show a warning that may never clear" with an
// explicit decision -- the Product Owner picks 'keep' (the already-applied trusted value stays,
// the conflict is dismissed as reviewed) or 'accept' (the new value the merge discovered
// overwrites it). Works identically on a pending suggestion's `proposed` object or an already-
// saved item, since both share the same shape (`[key]`, `details.mergeCandidates`, `warnings`) --
// no separate item/suggestion branch needed, mirroring reconcileStaleNeedsReview's own generality.
// 'accept' is a genuine field-value change, so it also runs reconcileStaleNeedsReview for that key
// -- a merge conflict and a stale needs-review flag on the same field are two separate mechanisms
// that can otherwise both be pointing at the one value the Product Owner just resolved.
export function resolveMergeCandidate(target,key,choice){
  const candidates=target.details?.mergeCandidates;
  if(!candidates||!(key in candidates))return target;
  const candidateValue=candidates[key];
  const nextCandidates={...candidates};delete nextCandidates[key];
  const warnings=(target.warnings||[]).filter(warning=>!(typeof warning==='string'&&warning.startsWith(`${MERGE_CONFLICT_WARNING_PREFIX}${key}`)));
  let next={...target,details:{...target.details,mergeCandidates:nextCandidates},warnings};
  if(choice==='accept'){
    next={...next,[key]:candidateValue};
    next=reconcileStaleNeedsReview(next,new Set([key]));
  }
  return next;
}
// V6-F74: a needsReviewFields-sourced warning (V6-F49/V6-F55) has exactly one clearing path --
// reconcileStaleNeedsReview, which only fires when the mapped field's VALUE actually changes.
// There was never a "this flagged value is already correct, I've reviewed it" action -- the only
// way to make the warning go away was to edit the field to something else (or edit it away and
// back, a pointless workaround). isDismissibleWarning (above) correctly keeps a live
// needsReviewRef non-dismissible, since a plain "ignore" would hide a real, unresolved reading --
// but it left no OTHER action in its place. This adds that missing action, mirroring
// resolveMergeCandidate's 'keep' choice: removes the specific needsReviewFields entry (matched by
// exact key+value, the same match isDismissibleWarning itself uses) and its warning, WITHOUT
// touching the field's actual value -- confirming the flagged reading as reviewed and correct
// rather than silently discarding an unresolved one. A stale key+value (already resolved by some
// other means, or never live in the first place) is a safe no-op, matching resolveMergeCandidate's
// own no-op guard for an unknown key.
export function confirmNeedsReviewField(target,key,value){
  const needsReviewFields=target.details?.needsReviewFields;
  if(!Array.isArray(needsReviewFields)||!needsReviewFields.length)return target;
  if(!needsReviewFields.some(field=>field.key===key&&field.value===value))return target;
  const remaining=needsReviewFields.filter(field=>!(field.key===key&&field.value===value));
  const warnings=(target.warnings||[]).filter(warning=>{
    if(typeof warning==='object'&&warning!==null&&warning.needsReviewRef){
      return !(warning.needsReviewRef.key===key&&warning.needsReviewRef.value===value);
    }
    return true;
  });
  return {...target,details:{...target.details,needsReviewFields:remaining},warnings};
}
// The date/time defaults shown in the manual "create new item" form the moment it opens
// (V6-F06/V4-F04 also apply here, via the rendered form's own pre-filled value= attribute).
// A missing OR malformed Trip start date (V6-F23: e.g. a non-canonical value that slipped in
// unvalidated through an external import) falls back to today rather than producing a blank or
// invalid datetime-local value -- a new item should always get a sensible starting date.
export function manualCreateDefaults(trip,todayValue=today()){
  const base=isValidCalendarDate(trip?.startDate)?trip.startDate:todayValue;
  const startAt=`${base}T12:00`;
  return {startAt,endAt:startAt};
}
// V6-F51: the Smart Import review screen rendered a blank startAt/endAt exactly as extracted,
// with no defaulting -- unlike manualCreateDefaults (fires when the manual form opens) and
// suggestionToItem's own trip-start fallback (fires at approval time for a new item), leaving
// the review screen as the one gap in an otherwise-consistent default. This mirrors
// suggestionToItem's exact fallback condition (new item, a real trip start date, a schedule that
// actually uses dates) so the review form shows the same value approval would have produced
// anyway, editable before submit instead of appearing as empty air. Only applies to a genuinely
// new-item suggestion, never an update/attach-and-extract suggestion targeting an existing item,
// matching suggestionToItem's own isNewItem gate.
export function suggestionReviewDefaults(proposed,tripStartDate,isNewItem){
  const startAt=String(proposed?.startAt||''),endAt=String(proposed?.endAt||'');
  if(!isNewItem||!isValidCalendarDate(tripStartDate)||['none','entire'].includes(proposed?.schedule))return {startAt,endAt};
  const fallbackStart=startAt||`${tripStartDate}T12:00`;
  const fallbackEnd=endAt||(proposed?.schedule==='range'?`${tripStartDate}T12:00`:endAt);
  return {startAt:fallbackStart,endAt:fallbackEnd};
}
// 0.7.7: shared by buildItemFormValues (below) and updateSuggestion (v5-app.js, editing a
// suggestion draft) -- the two places that decide an item's schedule on save. Every other type's
// schedule is genuinely fixed per type, so recomputing it from ITEM_TYPES[type].schedule on every
// save was always a no-op; shoppingPlace is the first type whose schedule must instead reflect
// whether THIS save actually entered a date, or every edit (including the one meant to add a
// date) would silently reset it back to 'none'.
export function scheduleForType(type,hasStart){
  return type==='shoppingPlace'?(hasStart?'single':'none'):(ITEM_TYPES[type]?.schedule||'none');
}
// Builds the item field values from the manual-create / edit-item form's own FormData, exactly
// as the real submit handler does -- extracted so both the UI and a regression test call the
// same function (V6-F23: the previous regression tests only covered suggestionToItem(), a
// completely different code path from manual item creation, which never called it at all).
export function buildItemFormValues(data){
  const type=String(data.get('type')),range=normalizeDateRange(data.get('startAt'),data.get('endAt'),{allowEndBeforeStart:type==='flight'});
  // 0.7.4: participantScope/participantIds are the real participant-relationship fields (per
  // MVP scope: an item "may apply to one participant, several participants, all participants, or
  // no specific participant") -- deliberately separate from the pre-existing free-text
  // `participants` field, which the 0.7.4.1 correction below removes the edit surface for.
  const participantScope=['none','all','specific'].includes(String(data.get('participantScope')))?String(data.get('participantScope')):'none';
  // 0.7.4.1: the old free-text 'participants' field is gone from the form -- deliberately NOT
  // included in this returned object at all (not even as []), so the edit-item-form's own
  // Object.assign(item,values,...) (v5-app.js) can never overwrite whatever value already sits in
  // item.participants with an empty array just because a user edited some unrelated field. Checked
  // before removing, not assumed empty: Flight/Activity/Insurance items created via Smart Import do
  // carry real extracted names here (flight-import-adapter.js's participantNames;
  // activity-/insurance-import-adapter.js's own union-merge treatment) -- but that data is always
  // redundant with details.passengers/ticketHolders/insuredPersons, already shown in full elsewhere
  // (flightSummaryBlock/activitySummaryBlock/insuranceSummaryBlock), and was never itself rendered
  // anywhere. Whatever already exists in Firestore for any item now simply survives untouched.
  return {type,title:String(data.get('title')||'').trim(),provider:String(data.get('provider')||'').trim(),confirmationNumber:String(data.get('confirmationNumber')||'').trim(),location:String(data.get('location')||'').trim(),website:normalizeUrlInput(data.get('website')),phone:String(data.get('phone')||'').trim(),email:String(data.get('email')||'').trim(),startAt:range.start,endAt:range.end,notes:String(data.get('notes')||'').trim(),transportMode:String(data.get('transportMode')||'').trim(),participantScope,participantIds:participantScope==='specific'?data.getAll('participantIds').map(String):[],schedule:scheduleForType(type,Boolean(range.start)),updatedAt:new Date().toISOString()};
}
export function validateSource({kind,file,url}){
  if(kind==='link'){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error();return {ok:true}}catch{return {ok:false,error:'יש להזין קישור HTTP או HTTPS תקין'}}}
  if(kind==='photo')return {ok:false,error:'קליטה חכמה מתמונה או צילום מושהית עד לתכנון מחדש'};
  if(!file)return {ok:false,error:'יש לבחור קובץ PDF'};const supported=file.type==='application/pdf'||String(file.name||'').toLowerCase().endsWith('.pdf');if(!supported)return {ok:false,error:'ב־0.5.6 אפשר לבדוק במסלול זה קובצי PDF בלבד'};if(file.size>15*1024*1024)return {ok:false,error:'הקובץ גדול מ־15MB'};return {ok:true};
}
export function mapsUrl(location=''){const value=String(location).trim();return value?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`:''}
const BARE_DOMAIN=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:[/?#][^\s]*)?$/i;
// Per FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V5.md 4.3: completing https:// for an
// explicit, valid-looking domain is permitted. A URL that already has a scheme is left as-is;
// anything that doesn't look like a bare domain is returned unchanged so normal validation
// still rejects it.
export function normalizeUrlInput(value){
  const trimmed=String(value||'').trim();
  if(!trimmed||/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed))return trimmed;
  return BARE_DOMAIN.test(trimmed)?`https://${trimmed}`:trimmed;
}
function isSafeConfirmation(candidate,text,index){if(/^(SCREENSHOT|YITZHAK|IMAGE|PHOTO|BOOKING|RESERVATION)$/i.test(candidate))return false;if(new RegExp(`^[A-Z]{2}\\d{2,4}$`,'i').test(candidate))return false;const before=text.slice(Math.max(0,index-20),index).toLowerCase();return !/flight\s*(?:no|number)?\s*$/.test(before)}
function contextLabel(text,index){return text.slice(Math.max(0,index-35),index).match(/(check[ -]?in|check[ -]?out|departure|arrival|start|end|יציאה|הגעה|כניסה|עזיבה)[^\n]{0,20}$/i)?.[1]||''}
function stopAtNextLabel(value){return value.split(/\s+(?:check[ -]?in|check[ -]?out|phone|tel|booking|confirmation|arrival|departure)\s*[:#-]?/i)[0]}
function safeDecode(value){try{return decodeURIComponent(value)}catch{return value}}function pad(value){return String(value).padStart(2,'0')}function normalized(value=''){return String(value).trim().toLowerCase().replace(/\s+/g,' ')}function dateOnly(value=''){return String(value).slice(0,10)}function makeId(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}function monthNumber(value){return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(String(value).slice(0,3).toLowerCase())+1}function isBlank(value){return value==null||value===''||(Array.isArray(value)&&!value.length)}function clone(value){return JSON.parse(JSON.stringify(value))}
