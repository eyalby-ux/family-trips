import {isValidCalendarDate,normalizeFlightDateString,normalizedGenericLabel,parseTimeValue,stripDuplicateLabelPrefix} from './operational-data.js';
import {TRANSPORT_MODES} from './ingestion.js';

// Transport Smart Import (0.7.8). TRANSPORT_SMART_IMPORT_DISCOVERY.md (V6, Frozen), Sections 3/4.
// Field shape is a hybrid, same reasoning as Insurance: mostly flat scalar fields read through the
// generic evidence-linked fields[] vocabulary, no new structured per-person array ("driver
// name(s)" is one free-text fields entry, not a Flight/Activity/Insurance-style per-person array --
// the frozen contract never asked for per-driver identity/evidence).
//
// Only origin_location maps to the item's own real `location` field, and only origin_date/
// origin_time -> startAt, destination_date/destination_time -> endAt (schedule stays fixed
// 'range', like every Transport sub-type since 0.7.4). destination_location has nowhere
// structured to go -- TYPE_FIELDS.car has one location field, not two, and this candidate's own
// scope document does not add a second one -- so it lands in notes via the otherFields fallback
// below, exactly like every other unmapped field (vehicle_class, driver_names, rental_terms,
// train_number, platform, seat_class, vessel_name, vehicle_carriage, amount, currency). This is
// still "no-omission" in the sense the discovery document means it: never silently dropped from
// the review draft, just not promoted to its own item column.
const FIELD_TARGETS={
  provider:'provider',
  confirmation_number:'confirmationNumber',
  origin_location:'location',
  phone:'phone',
  website:'website',
  email:'email',
};
// transfer/other are recognition-only outputs from the model (see transportSystemPrompt) --
// rejected here rather than silently building a low-quality proposal, mirroring exactly how
// analyzeSource's own 'unrecognized' category already throws in runSmartAnalysis (v5-app.js).
const IN_SCOPE_MODES=new Set(['car','rail','ferry']);

export function smartImportTransportResultToSuggestion(result,source,now=new Date()){
  const draft=result?.draft||{};
  const mode=String(draft.transportMode||'').trim();
  if(!IN_SCOPE_MODES.has(mode)){
    throw new Error(mode==='transfer'
      ?'זיהוי הסעה (Transfer) אינו נתמך לחילוץ אוטומטי בגרסה זו. ניתן ליצור פריט תחבורה ידנית.'
      :'לא זוהה מסמך השכרת רכב, רכבת או מעבורת במקור. לא נוצרה הצעה.');
  }

  const fieldConfidence={};
  const otherFields=[];
  const needsReviewFields=[];
  let originDate='',originTime='',destinationDate='',destinationTime='';
  const values={provider:'',confirmationNumber:'',location:'',phone:'',website:'',email:''};
  for(const field of draft.fields||[]){
    const value=String(field.normalizedValue||field.rawValue||'').trim();
    const canonical=canonicalFieldKey(field.key);
    const target=FIELD_TARGETS[canonical];
    if(field.certainty==='needs_review'&&value)needsReviewFields.push({key:target||canonical,label:field.label||canonical,value,evidence:field.evidence||''});
    if(!value)continue;
    if(canonical==='origin_date')originDate=originDate||value;
    else if(canonical==='origin_time')originTime=originTime||value;
    else if(canonical==='destination_date')destinationDate=destinationDate||value;
    else if(canonical==='destination_time')destinationTime=destinationTime||value;
    else if(target&&target in values){if(!values[target])values[target]=value}
    else otherFields.push(field);
    fieldConfidence[target||canonical]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};
  }

  const title=values.provider?`${values.provider} — ${TRANSPORT_MODES[mode]||mode}`:(TRANSPORT_MODES[mode]||'');
  const noteLines=[...(draft.importantNotes||[]).map(note=>`${normalizedGenericLabel(note.title)}: ${stripDuplicateLabelPrefix(note.title,note.text)}`),...otherFields.map(field=>`${normalizedGenericLabel(field.label)}: ${stripDuplicateLabelPrefix(field.label,field.rawValue)}`)];
  const needsReviewWarnings=needsReviewFields.map(field=>({message:`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`,needsReviewRef:{key:field.key,value:field.value}}));
  const proposalStateWarning=draft.proposalState==='needs_review'?['ההצעה כוללת מידע שדורש בדיקה לפני אישור.']:[];
  const unresolvedWarnings=(draft.unresolved||[]).map(value=>({message:`דורש בדיקה: ${value}`,dismissible:true,source:'unresolved'}));
  const missingProviderWarning=values.provider?[]:['לא זוהה ספק — נדרשת בדיקה לפני אישור.'];
  const warnings=[...(draft.warnings||[]),...unresolvedWarnings,...proposalStateWarning,...needsReviewWarnings,...missingProviderWarning];

  const proposed={
    type:'car',
    title,
    transportMode:mode,
    provider:values.provider,
    confirmationNumber:values.confirmationNumber,
    location:values.location,
    phone:values.phone,
    website:values.website,
    email:values.email,
    startAt:dateTime(originDate,originTime),
    endAt:dateTime(destinationDate,destinationTime),
    notes:noteLines.join('\n'),
    schedule:'range',
    details:{
      smartImportFields:draft.fields||[],
      importantNotes:draft.importantNotes||[],
    },
    dateMeta:{startPrecision:originDate?'date':'unknown',endPrecision:destinationDate?'date':'unknown',startTimeZone:'',endTimeZone:''},
    fieldConfidence,
    warnings,
  };
  if(needsReviewFields.length)proposed.details.needsReviewFields=needsReviewFields;

  return {
    id:id('suggestion'),
    sourceId:source.id,
    sourceIds:[source.id],
    status:'pending',
    proposed,
    confidence:draft.proposalState==='proposed'&&values.provider?'high':'medium',
    warnings:proposed.warnings,
    extractionEngine:'familytrips-smart-import-0.7',
    sourceFingerprint:source.fingerprint||'',
    createdAt:now.toISOString(),
    updatedAt:now.toISOString(),
    requiresReview:true,
    smartImport:{attemptId:result.attemptId,usage:result.usage,costUsd:result.estimatedVariableCostUsd,latencyMs:result.latencyMs},
  };
}

function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
// Mirrors flight-import-adapter.js's own dateTime() exactly -- a date with no valid time returns
// '' (never defaults to noon the way Insurance's date-only dateTime() does), since Transport's own
// origin/destination times are real, benchmarked-present values on every in-scope real document
// (TR-001-TR-006), not a date-only concept like an insurance policy's coverage period.
function dateTime(date,time){
  const clean=isValidCalendarDate(String(date||'').slice(0,10))?String(date).slice(0,10):normalizeFlightDateString(date);
  if(!isValidCalendarDate(clean))return '';
  const clock=parseTimeValue(time);
  return clock?`${clean}T${clock}`:'';
}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
