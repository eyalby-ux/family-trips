const FIELD_MAP={
  property_name:'title',hotel_name:'title',booking_number:'confirmationNumber',booking_number_primary:'confirmationNumber',confirmation_number:'confirmationNumber',
  official_website:'website',website:'website',property_phone:'phone',property_phone_1:'phone',phone:'phone',
  supplier:'provider',provider:'provider',operator:'provider',booking_source:'provider',booking_platform:'provider',
};
const MERGE_FIELDS=['title','provider','confirmationNumber','location','website','phone','startAt','endAt'];

export function smartImportResultToSuggestion(result,source,now=new Date()){
  const draft=result?.draft||{};
  const fieldConfidence={};
  const otherFields=[];
  const needsReviewFields=[];
  const proposed={type:'hotel',title:String(draft.propertyName||draft.meaningfulTitle||'').trim(),provider:'',confirmationNumber:'',location:'',website:'',phone:'',startAt:'',endAt:'',participants:[],notes:'',schedule:'range',details:{smartImportFields:[],importantNotes:draft.importantNotes||[],placeValidation:result.placeValidation||null},dateMeta:{startPrecision:'unknown',endPrecision:'unknown',startTimeZone:'',endTimeZone:''},fieldConfidence:{},warnings:[]};
  let startDate='',endDate='',startTime='',endTime='';
  for(const field of draft.fields||[]){
    const value=String(field.normalizedValue||field.rawValue||'').trim();
    const canonical=canonicalFieldKey(field.key);
    if(field.certainty==='needs_review'&&value)needsReviewFields.push({key:canonical,label:field.label||canonical,value,evidence:field.evidence||''});
    if(!value)continue;
    const target=FIELD_MAP[canonical]||classifyFieldKey(canonical);
    if(target&&['title','provider','confirmationNumber','website','phone'].includes(target)&&!proposed[target])proposed[target]=value;
    else if(target==='startDate'||canonical==='arrival_date'||canonical==='check_in_date')startDate=startDate||value;
    else if(target==='endDate'||canonical==='departure_date'||canonical==='check_out_date')endDate=endDate||value;
    else if(target==='startTime')startTime=startTime||value;
    else if(target==='endTime')endTime=endTime||value;
    else otherFields.push(field);
    fieldConfidence[target||canonical]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};
  }
  if(!startTime)startTime=findTime(draft,'check_in_time','arrival_time','check_in_window','arrival_window');
  if(!endTime)endTime=findTime(draft,'check_out_time','departure_time','check_out_window','departure_window');
  if(startDate)proposed.startAt=dateTime(startDate,startTime);
  if(endDate)proposed.endAt=dateTime(endDate,endTime);
  const propertyAddress=(draft.fields||[]).find(field=>['property_address','hotel_address','location'].includes(canonicalFieldKey(field.key)));
  if(propertyAddress)proposed.details.sourcePropertyAddress=String(propertyAddress.normalizedValue||propertyAddress.rawValue||'').trim();
  if(draft.propertyName)proposed.location=String(draft.propertyName).trim();
  const place=result.placeValidation;
  if(place?.state==='validated')proposed.details.canonicalPlace=place.acceptedPlace;
  const noteLines=[...(draft.importantNotes||[]).map(note=>`${note.title}: ${note.text}`),...otherFields.map(field=>`${field.label}: ${field.rawValue}`)];
  proposed.notes=noteLines.join('\n');
  proposed.details.smartImportFields=draft.fields||[];
  if(needsReviewFields.length)proposed.details.needsReviewFields=needsReviewFields;
  const needsReviewWarnings=needsReviewFields.map(field=>`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`);
  const proposalStateWarning=draft.proposalState==='needs_review'?['ההצעה כוללת מידע שדורש בדיקה לפני אישור.']:[];
  proposed.warnings=[...(draft.warnings||[]),...(draft.unresolved||[]).map(value=>`דורש בדיקה: ${value}`),...proposalStateWarning,...needsReviewWarnings,...(place&&place.state!=='validated'?['המיקום נשמר כשם המלון בלבד; לא אומתו קואורדינטות.']:[])];
  return {id:id('suggestion'),sourceId:source.id,sourceIds:[source.id],status:'pending',proposed,confidence:draft.proposalState==='proposed'?'high':'medium',warnings:proposed.warnings,extractionEngine:'familytrips-smart-import-0.6',sourceFingerprint:source.fingerprint||'',createdAt:now.toISOString(),updatedAt:now.toISOString(),requiresReview:true,smartImport:{attemptId:result.attemptId,usage:result.usage,costUsd:result.estimatedVariableCostUsd,latencyMs:result.latencyMs}};
}

export function saveOnlySource(source){return {...source,status:'נשמר ללא ניתוח',processingState:'saved_only',experimental:false}}

// Preserves an existing item's trusted (non-empty) fields when a companion attach-and-extract
// suggestion targets it: a blank new value never overwrites a trusted value, and a differing
// non-blank new value is kept as a reviewable candidate instead of silently replacing it.
export function preserveTrustedFieldsOnMerge(suggestion,targetItem){
  if(!targetItem)return suggestion;
  const proposed={...suggestion.proposed,details:{...suggestion.proposed.details}};
  const candidates={};
  for(const key of MERGE_FIELDS){
    const trusted=targetItem[key];
    if(isBlank(trusted))continue;
    const candidate=proposed[key];
    if(isBlank(candidate)){proposed[key]=clone(trusted);continue}
    if(normalizedEqual(candidate,trusted))continue;
    candidates[key]=clone(candidate);
    proposed[key]=clone(trusted);
  }
  const warnings=[...proposed.warnings];
  const candidateKeys=Object.keys(candidates);
  if(candidateKeys.length){
    proposed.details.mergeCandidates=candidates;
    for(const key of candidateKeys)warnings.push(`ערך חדש התגלה עבור ${key}: ${candidates[key]} — הערך השמור נשמר; יש לבדוק ולעדכן ידנית במידת הצורך.`);
  }
  return {...suggestion,proposed:{...proposed,warnings},warnings};
}

function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function classifyFieldKey(key){
  if(/website|\burl\b|\bsite\b|\bweb\b/.test(key))return 'website';
  if(/phone|\btel\b|telephone|contact_number/.test(key))return 'phone';
  if(/supplier|provider|operator|chain|platform|booked_via|booked_through/.test(key))return 'provider';
  if(/(booking|confirmation|reservation|itinerary|room)[a-z_]*(number|id|code|ref)/.test(key))return 'confirmationNumber';
  if(/(check[_ ]?in|arrival)[a-z_]*date/.test(key))return 'startDate';
  if(/(check[_ ]?out|departure)[a-z_]*date/.test(key))return 'endDate';
  if(/(check[_ ]?in|arrival)[a-z_]*(time|window)/.test(key))return 'startTime';
  if(/(check[_ ]?out|departure)[a-z_]*(time|window)/.test(key))return 'endTime';
  return null;
}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function findTime(draft,...keys){for(const field of draft.fields||[])if(keys.includes(canonicalFieldKey(field.key)))return parseTimeValue(String(field.normalizedValue||field.rawValue||'').trim());return ''}
function parseTimeValue(raw){
  const value=String(raw||'');
  let match=value.match(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*([AaPp])\.?[Mm]\.?/);
  if(match){let hour=Number(match[1])%12;if(/p/i.test(match[3]))hour+=12;return `${String(hour).padStart(2,'0')}:${match[2]}`}
  match=value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(match)return `${match[1].padStart(2,'0')}:${match[2]}`;
  return '';
}
function dateTime(date,time){const clean=String(date).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(clean))return '';const clock=parseTimeValue(time)||'12:00';return `${clean}T${clock}`}
function normalizedEqual(left,right){return String(left||'').trim().toLowerCase()===String(right||'').trim().toLowerCase()}
function isBlank(value){return value==null||value===''||(Array.isArray(value)&&!value.length)}
function clone(value){return Array.isArray(value)||typeof value==='object'?JSON.parse(JSON.stringify(value)):value}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
