import {isValidCalendarDate,parseTimeValue} from './operational-data.js';
import {scanFreeTextForDate} from './smart-import-adapter.js';

// Attraction/Event Smart Import (0.6.6). Unlike Flight, a single source describes ONE bookable
// event/attraction visit -- AE-001's two tickets, AE-003/AE-006's three-or-four tickets are all
// the SAME event, just multiple physical tickets/holders within it -- so this returns ONE
// suggestion, not an array. Unlike Hotel, that one suggestion may carry several named (or
// unnamed) ticket holders, each with their own seat/section/ticket-number, so it borrows Flight's
// per-person evidence discipline for that one part instead.

const FIELD_TARGETS={
  location:'location',venue:'location',
  meeting_point:'meetingPoint',
  duration:'duration',
  age_restrictions:'ageRestrictions',
  included:'included',
  not_included:'notIncluded',
  amount:'amount',price:'amount',
  currency:'currency',
  confirmation_number:'confirmationNumber',order_number:'confirmationNumber',booking_reference:'confirmationNumber',
  website:'website',
  start_date:'startDate',event_date:'startDate',entry_date:'startDate',
  start_time:'startTime',event_time:'startTime',
};
// AE-005's frozen precision case: the order number and ticket number are near-identical strings
// (2ZTN-G53R-GJ8 vs 2ZTN-G53R-GJ81P) -- FIELD_TARGETS above routes each canonical key to its own
// distinct target field (confirmationNumber vs a ticketHolders[].ticketNumber, handled entirely
// separately below), so the two are never conflated by this mapping regardless of how similar
// the printed strings look.

// AE-006's frozen decision (four single-use tickets, no per-person names in the source): rather
// than either fabricating four distinct names or collapsing the four physical tickets into one
// opaque entry, `details.ticketNumbers` holds the flat, source-anticipated list (matches
// FAMILYTRIPS_EXTERNAL_INGESTION_MODEL_INSTRUCTIONS_V5.md's own `details.ticketNumbers` field
// name exactly) while `details.ticketHolders` keeps one entry per physical ticket -- each with
// its own evidence/certainty/seatOrSection even when its name is empty -- mirroring the exact
// precedent Flight already established for a seat/baggage row with no legible passenger name
// (flightSystemPrompt: "still report a passengerDetails entry... with passengerName left empty").
// `participants` (the plain-string array every other type uses) is populated ONLY from ticket
// holders the source actually names, per AE-001 (2 named) / AE-007 (1 named booker for a party of
// 3) / AE-006 (0 named) -- never padded to match ticketQuantity or ticketHolders.length.
export function smartImportActivityResultToSuggestion(result,source,now=new Date()){
  const draft=result?.draft||{};
  const ticketHolders=(Array.isArray(draft.ticketHolders)?draft.ticketHolders:[]).map(holder=>({
    name:String(holder.name||'').trim(),
    ticketNumber:String(holder.ticketNumber||'').trim(),
    seatOrSection:String(holder.seatOrSection||'').trim(),
    evidence:String(holder.evidence||'').trim(),
    certainty:holder.certainty||'exact',
  }));
  const participants=[...new Set(ticketHolders.map(holder=>holder.name).filter(Boolean))];
  const ticketNumbers=ticketHolders.map(holder=>holder.ticketNumber).filter(Boolean);

  const fieldConfidence={};
  const otherFields=[];
  const needsReviewFields=[];
  let startDate='',startTime='';
  const values={location:'',meetingPoint:'',duration:'',ageRestrictions:'',included:'',notIncluded:'',amount:'',currency:'',confirmationNumber:'',website:''};
  for(const field of draft.fields||[]){
    const value=String(field.normalizedValue||field.rawValue||'').trim();
    const canonical=canonicalFieldKey(field.key);
    const target=FIELD_TARGETS[canonical];
    if(field.certainty==='needs_review'&&value)needsReviewFields.push({key:target||canonical,label:field.label||canonical,value,evidence:field.evidence||''});
    if(!value)continue;
    if(target==='startDate')startDate=startDate||value;
    else if(target==='startTime')startTime=startTime||value;
    else if(target&&target in values){if(!values[target])values[target]=value}
    else otherFields.push(field);
    fieldConfidence[target||canonical]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};
  }
  // V6-F50-style backstop, applied here from the start rather than shipped with the same gap
  // Hotel had: a resolved-but-only-explained-in-free-text date must still reach startAt.
  const fallbackFields=[];
  if(!startDate){
    const fallback=scanFreeTextForDate(draft,'start');
    if(fallback){
      startDate=fallback;
      needsReviewFields.push({key:'startDate',label:'תאריך',value:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes), לא בשדה מובנה — דורש אימות מול המקור'});
      fallbackFields.push({key:'startDate',label:'תאריך (מטקסט חופשי)',rawValue:fallback,normalizedValue:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)',certainty:'needs_review'});
    }
  }

  const activityName=String(draft.activityName||'').trim();
  const place=result.placeValidation;
  if(place?.state==='validated')values.location=values.location||place.locationDisplayValue;

  const noteLines=[...(draft.importantNotes||[]).map(note=>`${note.title}: ${note.text}`),...otherFields.map(field=>`${field.label}: ${field.rawValue}`)];
  const needsReviewWarnings=needsReviewFields.map(field=>`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`);
  const proposalStateWarning=draft.proposalState==='needs_review'?['ההצעה כוללת מידע שדורש בדיקה לפני אישור.']:[];
  // V6-F49, applied here from the start: an unresolved-sourced warning has no field key at all,
  // so it can never be auto-matched to an edited field -- wrapped as a dismissible object exactly
  // like the Hotel adapter's own fix, so the review screen can offer a manual dismiss action.
  const unresolvedWarnings=(draft.unresolved||[]).map(value=>({message:`דורש בדיקה: ${value}`,dismissible:true,source:'unresolved'}));
  const missingTitleWarning=activityName?[]:['לא זוהתה כותרת משמעותית (שם אטרקציה/אירוע) — נדרשת בדיקה לפני אישור.'];
  const notValidatedWarning=place&&place.state!=='validated'?['המיקום נשמר כפי שהופיע במקור בלבד; לא אומת מול Google Places.']:[];
  const warnings=[...(draft.warnings||[]),...unresolvedWarnings,...proposalStateWarning,...needsReviewWarnings,...missingTitleWarning,...notValidatedWarning];

  const smartImportFields=[...(draft.fields||[]),...fallbackFields];
  const proposed={
    type:'activity',
    title:activityName,
    provider:String(draft.provider||'').trim(),
    confirmationNumber:values.confirmationNumber,
    location:values.location,
    website:values.website,
    startAt:dateTime(startDate,startTime),
    participants,
    notes:noteLines.join('\n'),
    schedule:'single',
    details:{
      activityName,
      meetingPoint:values.meetingPoint,
      duration:values.duration,
      ticketNumbers,
      ticketHolders,
      ticketQuantity:String(draft.ticketQuantity||'').trim(),
      ageRestrictions:values.ageRestrictions,
      included:values.included,
      notIncluded:values.notIncluded,
      amount:values.amount,
      currency:values.currency,
      smartImportFields,
      importantNotes:draft.importantNotes||[],
      placeValidation:place||null,
    },
    dateMeta:{startPrecision:startTime?'minute':startDate?'date':'unknown',endPrecision:'unknown',startTimeZone:'',endTimeZone:''},
    fieldConfidence,
    warnings,
  };
  if(needsReviewFields.length)proposed.details.needsReviewFields=needsReviewFields;
  if(place?.state==='validated')proposed.details.canonicalPlace=place.acceptedPlace;

  return {
    id:id('suggestion'),
    sourceId:source.id,
    sourceIds:[source.id],
    status:'pending',
    proposed,
    confidence:draft.proposalState==='proposed'&&activityName?'high':'medium',
    warnings:proposed.warnings,
    extractionEngine:'familytrips-smart-import-0.6',
    sourceFingerprint:source.fingerprint||'',
    createdAt:now.toISOString(),
    updatedAt:now.toISOString(),
    requiresReview:true,
    smartImport:{attemptId:result.attemptId,usage:result.usage,costUsd:result.estimatedVariableCostUsd,latencyMs:result.latencyMs},
  };
}

function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function dateTime(date,time){const clean=String(date).slice(0,10);if(!isValidCalendarDate(clean))return '';const clock=parseTimeValue(time)||'12:00';return `${clean}T${clock}`}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
