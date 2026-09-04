import {isValidCalendarDate,normalizedGenericLabel,parseTimeValue,stripDuplicateLabelPrefix} from './operational-data.js';
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
    // V6-F56: ticketHolderSchema previously had no field for a per-passenger national ID/DNI at
    // all (name/ticketNumber/seatOrSection/evidence/certainty only, additionalProperties:false),
    // so AE-001's frozen two-DNI ground truth could never be captured regardless of extraction
    // quality -- dni is now a real schema property (see smart-import-schema.mjs), mapped through
    // here the same way every other per-holder field already is.
    dni:String(holder.dni||'').trim(),
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

  let activityName=String(draft.activityName||'').trim();
  let provider=String(draft.provider||'').trim();
  // V6-F65 (extension): activityName/provider were bare top-level strings with no paired
  // certainty concept at all -- unlike fields[]/ticketHolderSchema entries, which both have a
  // certainty enum -- so the model had no structural way to say "this is visible but illegible"
  // (e.g. a small stylized logo) and, per Eyal's direct source check, instead guessed a plausible
  // real organization name and falsely claimed it was "identified from the logo."
  // activityNameCertainty/providerCertainty (smart-import-schema.mjs) give it that structural
  // option; this block is defense in depth -- even if the model doesn't fully comply with the
  // prompt's instruction to leave the value empty when unreadable, a value is never trusted here
  // once its own paired certainty says it genuinely couldn't be read. 'needs_review' keeps the
  // value (it WAS legible, just not fully certain) but still flags it; 'unreadable' blanks the
  // value outright (defaults to 'exact' when absent, so fixtures/older callers with no certainty
  // field at all keep working unchanged).
  const activityNameCertainty=draft.activityNameCertainty||'exact';
  const providerCertainty=draft.providerCertainty||'exact';
  if(activityNameCertainty==='unreadable'){
    needsReviewFields.push({key:'activityName',label:'שם האטרקציה',value:'לא ניתן לזהות בבירור מהמקור',evidence:activityName?`המודל דיווח ערך למרות חוסר קריאות מוצהר: "${activityName}"`:'האלמנט במקור (למשל לוגו) אינו קריא בבירור בגודל/באיכות הזמינים'});
    activityName='';
  }else if(activityNameCertainty==='needs_review'&&activityName){
    needsReviewFields.push({key:'activityName',label:'שם האטרקציה',value:activityName,evidence:'ביטחון הזיהוי מוגבל — דורש אימות מול המקור'});
  }
  if(providerCertainty==='unreadable'){
    needsReviewFields.push({key:'provider',label:'ספק',value:'לא ניתן לזהות בבירור מהמקור',evidence:provider?`המודל דיווח ערך למרות חוסר קריאות מוצהר: "${provider}"`:'האלמנט במקור (למשל לוגו) אינו קריא בבירור בגודל/באיכות הזמינים'});
    provider='';
  }else if(providerCertainty==='needs_review'&&provider){
    needsReviewFields.push({key:'provider',label:'ספק',value:provider,evidence:'ביטחון הזיהוי מוגבל — דורש אימות מול המקור'});
  }
  fieldConfidence.activityName={confidence:certainty(activityNameCertainty),evidence:'',method:'ai_source_extraction'};
  fieldConfidence.provider={confidence:certainty(providerCertainty),evidence:'',method:'ai_source_extraction'};
  const place=result.placeValidation;
  if(place?.state==='validated')values.location=values.location||place.locationDisplayValue;

  const noteLines=[...(draft.importantNotes||[]).map(note=>`${normalizedGenericLabel(note.title)}: ${stripDuplicateLabelPrefix(note.title,note.text)}`),...otherFields.map(field=>`${normalizedGenericLabel(field.label)}: ${stripDuplicateLabelPrefix(field.label,field.rawValue)}`)];
  const needsReviewWarnings=needsReviewFields.map(field=>({message:`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`,needsReviewRef:{key:field.key,value:field.value}}));
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
    provider,
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

// V6-F61: a field concept with no canonical FIELD_TARGETS mapping (e.g. "purchaser"/orderer,
// distinct from ticketHolders' per-ticket names, which has no slot in the schema's fixed `fields`
// key vocabulary either) falls through to the generic otherFields->notes dump above using
// whatever label/rawValue the model itself chose. Two real, observed problems with that: (1) if
// the model's own rawValue already includes the printed label text verbatim (AE-002's source
// literally shows "Purchaser: <name>"), pairing it with field.label a second time produces a
// doubled line ("Purchaser: Purchaser: <name>"); (2) nothing enforces a Hebrew label for this
// fallback path the way every canonically-mapped field already has, so an English label leaks
// straight into the UI unfiltered next to otherwise all-Hebrew field labels.
// V6-F61 correction pass: normalizedGenericLabel/stripDuplicateLabelPrefix now live in
// operational-data.js (imported above) as the ONE shared implementation for both adapters and
// all four note-line generation sites -- the previous fix only ever closed this one site.
function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function dateTime(date,time){const clean=String(date).slice(0,10);if(!isValidCalendarDate(clean))return '';const clock=parseTimeValue(time)||'12:00';return `${clean}T${clock}`}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}

// V6-F66: Activity's ticketHolders array (and top-level participants, handled in ingestion.js's
// suggestionToItem) was silently wholesale-REPLACED on merge instead of combined -- suggestionToItem
// only had a field-aware details merge for type==='flight', so every other type fell through to a
// plain object spread, letting a second suggestion's ticketHolders array overwrite the first's
// entirely. Root-caused against Eyal's own wild-card repro: his own seat/row entry and a
// companion's, both for the same match, arriving as two separate attach passes. Mirrors Flight's
// own already-solved version of this exact problem (mergeFlightPassengers/mergeFlightDetails,
// flight-import-adapter.js) applied to the Activity per-ticket-holder shape: match by
// ticketNumber when present (most reliable, mirrors Flight's e-ticket-number priority), else
// normalized name; union all entries from both sides, never drop one; per matched entry, existing
// non-blank field wins, blank fields fill from the incoming entry.
export function mergeActivityTicketHolders(existingHolders,newHolders){
  const existing=Array.isArray(existingHolders)?existingHolders:[];
  const incoming=Array.isArray(newHolders)?newHolders:[];
  const merged=new Map(existing.map(holder=>[ticketHolderKey(holder),{...holder}]));
  for(const holder of incoming){
    const key=ticketHolderKey(holder);
    const current=merged.get(key);
    if(!current){merged.set(key,{...holder});continue}
    merged.set(key,{
      name:current.name||holder.name,
      dni:current.dni||holder.dni,
      ticketNumber:current.ticketNumber||holder.ticketNumber,
      seatOrSection:current.seatOrSection||holder.seatOrSection,
      evidence:current.evidence||holder.evidence,
      certainty:current.certainty||holder.certainty,
    });
  }
  return [...merged.values()];
}
function ticketHolderKey(holder){
  const ticket=String(holder?.ticketNumber||'').replace(/\s+/g,'');
  return ticket?`ticket:${ticket}`:`name:${normalizedHolderName(holder?.name)}`;
}
function normalizedHolderName(value=''){return String(value).trim().toLowerCase().replace(/\s+/g,' ')}

// Mirrors mergeFlightDetails' own "existing wins unless genuinely blank" scalar-merge rule,
// applied to the small set of Activity detail scalars, plus a deduped union of ticketNumbers and
// the ticketHolders merge above.
const ACTIVITY_DETAIL_SCALAR_KEYS=['activityName','meetingPoint','duration','ageRestrictions','included','notIncluded','amount','currency','ticketQuantity'];
export function mergeActivityDetails(existingDetails,newDetails){
  const existing=existingDetails||{},incoming=newDetails||{};
  const merged={...existing,...incoming};
  for(const key of ACTIVITY_DETAIL_SCALAR_KEYS){
    if(!String(incoming[key]||'').trim()&&String(existing[key]||'').trim())merged[key]=existing[key];
  }
  merged.ticketNumbers=[...new Set([...(existing.ticketNumbers||[]),...(incoming.ticketNumbers||[])])];
  merged.ticketHolders=mergeActivityTicketHolders(existing.ticketHolders,incoming.ticketHolders);
  return merged;
}
