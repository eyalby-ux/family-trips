const FIELD_MAP={
  property_name:'title',hotel_name:'title',booking_number:'confirmationNumber',booking_number_primary:'confirmationNumber',confirmation_number:'confirmationNumber',
  official_website:'website',website:'website',property_phone:'phone',property_phone_1:'phone',phone:'phone'
};

export function smartImportResultToSuggestion(result,source,now=new Date()){
  const draft=result?.draft||{};
  const fieldConfidence={};
  const otherFields=[];
  const proposed={type:'hotel',title:String(draft.propertyName||draft.meaningfulTitle||'').trim(),provider:'',confirmationNumber:'',location:'',website:'',phone:'',startAt:'',endAt:'',participants:[],notes:'',schedule:'range',details:{smartImportFields:[],importantNotes:draft.importantNotes||[],placeValidation:result.placeValidation||null},dateMeta:{startPrecision:'unknown',endPrecision:'unknown',startTimeZone:'',endTimeZone:''},fieldConfidence:{},warnings:[]};
  for(const field of draft.fields||[]){
    const value=String(field.normalizedValue||field.rawValue||'').trim();
    if(!value)continue;
    const canonical=canonicalFieldKey(field.key);
    const target=FIELD_MAP[canonical];
    if(target&&!proposed[target])proposed[target]=value;
    else if(canonical==='arrival_date'||canonical==='check_in_date')proposed.startAt=dateTime(value,findTime(draft,'check_in_time','arrival_time'));
    else if(canonical==='departure_date'||canonical==='check_out_date')proposed.endAt=dateTime(value,findTime(draft,'check_out_time','departure_time'));
    else otherFields.push(field);
    fieldConfidence[target||canonical]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};
  }
  const propertyAddress=(draft.fields||[]).find(field=>['property_address','hotel_address','location'].includes(canonicalFieldKey(field.key)));
  if(propertyAddress)proposed.details.sourcePropertyAddress=String(propertyAddress.normalizedValue||propertyAddress.rawValue||'').trim();
  if(draft.propertyName)proposed.location=String(draft.propertyName).trim();
  const place=result.placeValidation;
  if(place?.state==='validated')proposed.details.canonicalPlace=place.acceptedPlace;
  const noteLines=[...(draft.importantNotes||[]).map(note=>`${note.title}: ${note.text}`),...otherFields.map(field=>`${field.label}: ${field.rawValue}`)];
  proposed.notes=noteLines.join('\n');
  proposed.details.smartImportFields=draft.fields||[];
  proposed.warnings=[...(draft.warnings||[]),...(draft.unresolved||[]).map(value=>`דורש בדיקה: ${value}`),...(place&&place.state!=='validated'?['המיקום נשמר כשם המלון בלבד; לא אומתו קואורדינטות.']:[])];
  return {id:id('suggestion'),sourceId:source.id,sourceIds:[source.id],status:'pending',proposed,confidence:draft.proposalState==='proposed'?'high':'medium',warnings:proposed.warnings,extractionEngine:'familytrips-smart-import-0.6',sourceFingerprint:source.fingerprint||'',createdAt:now.toISOString(),updatedAt:now.toISOString(),requiresReview:true,smartImport:{attemptId:result.attemptId,usage:result.usage,costUsd:result.estimatedVariableCostUsd,latencyMs:result.latencyMs}};
}

export function saveOnlySource(source){return {...source,status:'נשמר ללא ניתוח',processingState:'saved_only',experimental:false}}
function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function findTime(draft,...keys){for(const field of draft.fields||[])if(keys.includes(canonicalFieldKey(field.key)))return String(field.normalizedValue||field.rawValue||'').trim();return ''}
function dateTime(date,time){const clean=String(date).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(clean))return '';const clock=/^(?:[01]\d|2[0-3]):[0-5]\d/.test(time)?time.slice(0,5):'12:00';return `${clean}T${clock}`}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
