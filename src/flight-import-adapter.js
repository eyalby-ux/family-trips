import {isValidCalendarDate,normalizeFlightDateString,parseTimeValue} from './operational-data.js';

// Flight Smart Import (0.6.5). Mirrors the Hotel Smart Import architecture (immutable source
// identity, processing attempts, field evidence, review-before-apply, explicit approval) but a
// single source may describe more than one real flight segment, so this module returns an
// ARRAY of suggestions -- one per usable segment -- instead of a single suggestion.

// Fields that must never be silently dropped when present in the source. A segment that has
// NONE of these is not a real, usable segment (see isFlightSegmentUsable).
const NO_OMISSION_BLOCKERS=['flightNumber','departureAirportCode','arrivalAirportCode','departureDate','arrivalDate'];
// The subset of the above that depends on knowing which airport is departure vs. arrival -- left
// blank on a directionAmbiguous segment (see buildDirectionCandidates) on purpose, so they must
// not also be reported as "missing from the source" (V6-F34/revised V6-F32, fix pass 3): the data
// is present, just not committed to a slot, and the directionAmbiguity evidence field already
// says so precisely.
const DIRECTION_DEPENDENT_BLOCKERS=['departureAirportCode','arrivalAirportCode','departureDate','arrivalDate'];

export function smartImportFlightResultToSuggestions(result,source,now=new Date()){
  const draft=result?.draft||{};
  const passengerRoster=Array.isArray(draft.passengers)?draft.passengers:[];
  const participantNames=passengerRoster.map(p=>String(p.name||'').trim()).filter(Boolean);
  const segments=Array.isArray(draft.segments)?draft.segments:[];
  const usable=segments.filter(isFlightSegmentUsable);
  const skippedCount=segments.length-usable.length;

  return usable.map((segment,index)=>{
    const passengers=buildSegmentPassengers(passengerRoster,segment);
    const directionAmbiguous=Boolean(segment.directionAmbiguous)&&Array.isArray(segment.directionCandidates)&&segment.directionCandidates.length>0;
    const directionCandidates=directionAmbiguous?buildDirectionCandidates(segment.directionCandidates):[];
    const smartImportFields=buildEvidenceFields(segment,passengers,draft.bookingReference,directionCandidates);
    const needsReviewFields=smartImportFields.filter(field=>field.certainty!=='exact').map(field=>({key:field.key,label:field.label,value:field.rawValue,evidence:field.evidence}));

    const fieldConfidence={};
    for(const field of smartImportFields)fieldConfidence[field.key]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};

    const departureCode=String(segment.departureAirportCode||segment.departureAirportName||'').trim();
    const arrivalCode=String(segment.arrivalAirportCode||segment.arrivalAirportName||'').trim();
    const flightNumber=String(segment.flightNumber||'').trim();
    const route=[departureCode,arrivalCode].filter(Boolean).join(' → ');
    const title=[flightNumber,route].filter(Boolean).join(' ')||route||'טיסה';
    const provider=String(segment.marketingCarrier||segment.operatingCarrier||'').trim();

    const missingBlockers=NO_OMISSION_BLOCKERS.filter(key=>!String(segment[key]||'').trim()&&!(directionAmbiguous&&DIRECTION_DEPENDENT_BLOCKERS.includes(key)));
    const needsReviewWarnings=needsReviewFields.map(field=>`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`);
    const skippedWarning=index===0&&skippedCount>0?[`מקור זה כלל ${skippedCount} מקטע/י טיסה שאינם תקינים (VOID או ללא נתונים); הם לא נוספו כפריטים.`]:[];
    const warnings=[...(draft.warnings||[]),...(draft.unresolved||[]).map(value=>`דורש בדיקה: ${value}`),...needsReviewWarnings,...skippedWarning];

    const proposed={
      type:'flight',
      title,
      provider,
      confirmationNumber:String(draft.bookingReference||'').trim(),
      location:route,
      website:'',
      phone:'',
      startAt:dateTime(segment.departureDate,segment.departureTime),
      endAt:dateTime(segment.arrivalDate,segment.arrivalTime),
      participants:participantNames,
      notes:'',
      schedule:'single',
      details:{
        flightNumber,
        operatingCarrier:String(segment.operatingCarrier||'').trim(),
        marketingCarrier:String(segment.marketingCarrier||'').trim(),
        departureAirport:{code:String(segment.departureAirportCode||'').trim(),name:String(segment.departureAirportName||'').trim(),terminal:String(segment.departureTerminal||'').trim()},
        arrivalAirport:{code:String(segment.arrivalAirportCode||'').trim(),name:String(segment.arrivalAirportName||'').trim(),terminal:String(segment.arrivalTerminal||'').trim()},
        aircraftType:String(segment.aircraftType||'').trim(),
        classOfService:String(segment.classOfService||'').trim(),
        fareBasis:String(segment.fareBasis||'').trim(),
        duration:String(segment.duration||'').trim(),
        gate:String(segment.gate||'').trim(),
        gateOpensAt:String(segment.gateOpensTime||'').trim(),
        gateClosesAt:String(segment.gateClosesTime||'').trim(),
        boardingSequenceNumber:String(segment.boardingSequenceNumber||'').trim(),
        passengers,
        smartImportFields,
        segmentIndex:index+1,
        segmentCount:usable.length,
      },
      dateMeta:{startPrecision:segment.departureDate?'minute':'unknown',endPrecision:segment.arrivalDate?'minute':'unknown',startTimeZone:'',endTimeZone:''},
      fieldConfidence,
      warnings,
    };
    if(needsReviewFields.length)proposed.details.needsReviewFields=needsReviewFields;
    if(directionCandidates.length)proposed.details.directionCandidates=directionCandidates;
    if(missingBlockers.length)proposed.warnings=[...proposed.warnings,`שדות חובה חסרים במקור: ${missingBlockers.join(', ')}`];

    return {
      id:id('suggestion'),
      sourceId:source.id,
      sourceIds:[source.id],
      status:'pending',
      proposed,
      confidence:segment.certainty==='exact'&&!needsReviewFields.length?'high':'medium',
      warnings:proposed.warnings,
      extractionEngine:'familytrips-smart-import-0.6',
      sourceFingerprint:source.fingerprint||'',
      segmentIndex:index+1,
      segmentCount:usable.length,
      createdAt:now.toISOString(),
      updatedAt:now.toISOString(),
      requiresReview:true,
      smartImport:{attemptId:result.attemptId,usage:result.usage,costUsd:result.estimatedVariableCostUsd,latencyMs:result.latencyMs},
    };
  });
}

// A segment that is explicitly VOID, or has none of the no-omission-blocker fields at all, is
// not a real flight and must never become an item -- it is silently excluded from the returned
// suggestions (a warning on the first real suggestion from the same source notes how many were
// skipped, so the skip is visible rather than a silent gap). A directionAmbiguous segment (fix
// pass 3) leaves the direction-dependent blockers blank ON PURPOSE -- the same data is present
// via directionCandidates instead, so it counts as usable even though those specific fields
// are empty on the segment itself.
export function isFlightSegmentUsable(segment){
  if(!segment||segment.status==='void')return false;
  if(segment.directionAmbiguous&&Array.isArray(segment.directionCandidates)&&segment.directionCandidates.length)return true;
  return NO_OMISSION_BLOCKERS.some(key=>String(segment[key]||'').trim());
}

// Builds the two full candidate readings for a directionAmbiguous segment, each with its own
// computed startAt/endAt (via the same dateTime() used for the primary fields) -- this is the
// data the Product Owner picks between in review, instead of the app (or the model) guessing one
// (revised V6-F32, fix pass 3: retesting showed the same unchanged source producing a different
// guess -- sometimes wrong, sometimes a refusal -- on separate attempts, so no guess is trustworthy).
function buildDirectionCandidates(rawCandidates){
  return rawCandidates.map(candidate=>{
    const departureCode=String(candidate.departureAirportCode||candidate.departureAirportName||'').trim();
    const arrivalCode=String(candidate.arrivalAirportCode||candidate.arrivalAirportName||'').trim();
    return {
      label:[departureCode,arrivalCode].filter(Boolean).join(' → ')||'טיסה',
      departureAirport:{code:String(candidate.departureAirportCode||'').trim(),name:String(candidate.departureAirportName||'').trim(),terminal:''},
      arrivalAirport:{code:String(candidate.arrivalAirportCode||'').trim(),name:String(candidate.arrivalAirportName||'').trim(),terminal:''},
      startAt:dateTime(candidate.departureDate,candidate.departureTime),
      endAt:dateTime(candidate.arrivalDate,candidate.arrivalTime),
    };
  });
}

// Enriches an existing item's per-passenger detail with a newer suggestion's passengers,
// matched by e-ticket number (most reliable) or normalized name, without ever losing a
// passenger present on either side. Existing non-blank fields win; blanks are filled from the
// new suggestion -- the same "preserve trusted, fill gaps" rule used for Hotel merges
// (preserveTrustedFieldsOnMerge), applied per array element instead of per top-level field.
export function mergeFlightPassengers(existingPassengers,newPassengers){
  const existing=Array.isArray(existingPassengers)?existingPassengers:[];
  const incoming=Array.isArray(newPassengers)?newPassengers:[];
  const merged=new Map(existing.map(passenger=>[passengerKey(passenger),{...passenger}]));
  for(const passenger of incoming){
    const key=passengerKey(passenger);
    const current=merged.get(key);
    if(!current){merged.set(key,{...passenger});continue}
    merged.set(key,{
      name:current.name||passenger.name,
      eTicketNumber:current.eTicketNumber||passenger.eTicketNumber,
      seat:current.seat||passenger.seat,
      mealRequest:current.mealRequest||passenger.mealRequest,
      baggage:current.baggage?.length?current.baggage:passenger.baggage,
    });
  }
  return [...merged.values()];
}

// V6-F39 (fix pass 4, remaining scope of V6-F33): a plain object spread in suggestionToItem let
// ANY nested flight detail -- departureAirport/arrivalAirport (a manually-resolved direction),
// aircraftType, classOfService, fareBasis, duration, gate/boarding fields -- from a newly
// attached companion source silently overwrite an existing, already-resolved value whenever the
// new source didn't also report it (a blank string, or a blank {code:'',name:'',terminal:''}
// object, still "wins" in a shallow spread, since the key IS present with a value, just an empty
// one). Confirmed live: attaching FL-003 (still direction-ambiguous on its own) to the already-
// resolved FL-001 item reverted its manually-picked direction straight back to blank. Passengers
// already had their own protected merge (mergeFlightPassengers); this extends the same
// "existing wins unless genuinely blank" rule to every other nested detail, mirroring what
// preserveTrustedFieldsOnMerge already does for the top-level scalar fields.
const FLIGHT_DETAIL_SCALAR_KEYS=['flightNumber','operatingCarrier','marketingCarrier','aircraftType','classOfService','fareBasis','duration','gate','gateOpensAt','gateClosesAt','boardingSequenceNumber'];
const FLIGHT_DETAIL_AIRPORT_KEYS=['departureAirport','arrivalAirport'];
export function mergeFlightDetails(existingDetails,newDetails){
  const existing=existingDetails||{},incoming=newDetails||{};
  const merged={...existing,...incoming};
  for(const key of FLIGHT_DETAIL_SCALAR_KEYS){
    if(!String(incoming[key]||'').trim()&&String(existing[key]||'').trim())merged[key]=existing[key];
  }
  for(const key of FLIGHT_DETAIL_AIRPORT_KEYS){
    const incomingAirport=incoming[key]||{},existingAirport=existing[key]||{};
    const incomingHasValue=String(incomingAirport.code||'').trim()||String(incomingAirport.name||'').trim();
    const existingHasValue=String(existingAirport.code||'').trim()||String(existingAirport.name||'').trim();
    merged[key]=!incomingHasValue&&existingHasValue?existingAirport:incomingAirport;
  }
  merged.passengers=mergeFlightPassengers(existing.passengers,incoming.passengers);
  return merged;
}

// Fix pass 4: once a flight suggestion's direction is resolved -- either by an explicit Product
// Owner pick (pickFlightDirection) or by inheriting an already-trusted item's direction during a
// merge (V6-F36/V6-F39) -- the "pick one" ambiguity warning from BEFORE it was resolved is stale
// and must not linger (V6-F35), whether on the suggestion itself or on the item it gets merged
// into. Matches both the app's own Hebrew label ("כיוון הטיסה") and a plain-English model-authored
// warning (e.g. "Direction ambiguity prevents assigning...") since draft.warnings/unresolved are
// free text the model can phrase either way.
export function clearResolvedDirectionWarning(warnings){
  return (warnings||[]).filter(warning=>!/כיוון|direction/i.test(String(warning||'')));
}

// V6-F36: an ambiguous flight suggestion has a blank primary startAt (see
// smartImportFlightResultToSuggestions), so the plain isSameFlightNumberAndDate() never fires for
// it even when it is genuinely the same real flight as an existing, already-resolved item -- this
// is the actual reason FL-003 wasn't offered as a duplicate/merge candidate against FL-001/FL-002
// until after a direction was manually picked. Matching flight number against EITHER of the two
// candidate readings' dates (both readings share the same two underlying date values, just with
// their start/end roles swapped) finds the match regardless of whether a pick has happened yet;
// preserveTrustedFieldsOnMerge + mergeFlightDetails then inherit the target's already-resolved
// direction automatically once merged, so no separate picker is needed on the duplicate screen.
export function isSameFlightAcrossDirectionCandidates(proposed,item){
  if(proposed.type!=='flight'||item.type!=='flight')return false;
  const flightA=normalizeFlightNumber(proposed.details?.flightNumber),flightB=normalizeFlightNumber(item.details?.flightNumber);
  if(!flightA||flightA!==flightB)return false;
  const candidates=proposed.details?.directionCandidates;
  if(!Array.isArray(candidates)||!candidates.length)return false;
  const itemDates=[dateOnly(item.startAt),dateOnly(item.endAt)].filter(Boolean);
  if(!itemDates.length)return false;
  return candidates.some(candidate=>[dateOnly(candidate.startAt),dateOnly(candidate.endAt)].filter(Boolean).some(date=>itemDates.includes(date)));
}

// Two suggestions describe the same flight only when they share both the booking reference AND
// the specific segment (flight number, or failing that the same date) -- a shared PNR alone is
// not enough, since one booking commonly covers multiple distinct flights (e.g. an outbound and
// a return) that must each remain their own item.
export function isSameFlightForDedup(proposed,item){
  if(proposed.type!=='flight'||item.type!=='flight')return proposed.type===item.type;
  const reference=normalized(proposed.confirmationNumber);
  if(!reference||reference!==normalized(item.confirmationNumber))return false;
  const sameFlightNumber=normalized(proposed.details?.flightNumber)&&normalized(proposed.details?.flightNumber)===normalized(item.details?.flightNumber);
  const sameDate=dateOnly(proposed.startAt)&&dateOnly(proposed.startAt)===dateOnly(item.startAt);
  return sameFlightNumber||sameDate;
}

// V6-F30: two sources describing the same real flight don't always share a booking reference at
// all (e.g. a personal itinerary screenshot with no PNR shown, versus a summary view of the same
// flight) -- reconciling them must not depend on one. Flight number, compared with airline-code
// formatting differences ignored (e.g. "LY084" vs "LY84"), plus the same calendar date is enough
// on its own; no PNR match is required for this fallback.
export function isSameFlightNumberAndDate(proposed,item){
  if(proposed.type!=='flight'||item.type!=='flight')return false;
  const flightA=normalizeFlightNumber(proposed.details?.flightNumber),flightB=normalizeFlightNumber(item.details?.flightNumber);
  if(!flightA||flightA!==flightB)return false;
  return Boolean(dateOnly(proposed.startAt)&&dateOnly(proposed.startAt)===dateOnly(item.startAt));
}
function normalizeFlightNumber(value){
  const raw=String(value||'').toUpperCase().replace(/\s+/g,'');
  const match=raw.match(/^([A-Z]{1,3})0*(\d+)$/);
  return match?`${match[1]}${match[2]}`:raw;
}

// V6-F25: matched purely on the exact normalized name, a passenger present in the top-level
// roster under one presentation ("Paola Kohan") but in this segment's passengerDetails under
// another (a source literally printed "KOHAN PAOLA MRS (ADT)", last-name-first with a title) was
// simply not found -- the seat/meal/baggage the source clearly showed silently never made it
// onto that passenger. Falls back to a sorted-word, title-stripped key when the exact name
// doesn't match.
function buildSegmentPassengers(passengerRoster,segment){
  const details=Array.isArray(segment.passengerDetails)?segment.passengerDetails:[];
  const byExactName=new Map(details.map(detail=>[normalized(detail.passengerName),detail]));
  const byMatchKey=new Map(details.map(detail=>[passengerMatchKey(detail.passengerName),detail]));
  const roster=passengerRoster.length?passengerRoster:details.map(detail=>({name:detail.passengerName,eTicketNumber:'',certainty:detail.certainty}));
  return roster.map(passenger=>{
    const detail=byExactName.get(normalized(passenger.name))||byMatchKey.get(passengerMatchKey(passenger.name))||{};
    return {
      name:String(passenger.name||'').trim(),
      eTicketNumber:String(passenger.eTicketNumber||'').trim(),
      seat:String(detail.seat||'').trim(),
      mealRequest:String(detail.mealRequest||'').trim(),
      baggage:(Array.isArray(detail.baggage)?detail.baggage:[]).map(bag=>({bagType:String(bag.bagType||'').trim(),weight:String(bag.weight||'').trim(),included:String(bag.included||'unknown').trim()})),
    };
  });
}

// V6-F34 (fix pass 3): these are the only fields whose read quality is genuinely tied to the
// segment's departure/arrival-geography-and-timing legibility (a blurry or overlay-obscured
// region, per FL-007's needs_review case) -- they legitimately inherit a certainty fallback
// instead of defaulting to 'exact'. Every other field (flightNumber, carriers, aircraft,
// fare/class, duration, gate/boarding, and every passenger's seat/meal/baggage) has no logical
// dependency on either side's read quality, or on direction ambiguity (its own separate
// directionAmbiguous flag) -- these default to 'exact' regardless.
// V6-F43 (fix pass 5): DEPARTURE_QUALITY_SENSITIVE_KEYS falls back to segment.certainty and
// ARRIVAL_QUALITY_SENSITIVE_KEYS falls back to the independent segment.arrivalCertainty -- a
// problem with only the arrival side (e.g. an invalid arrival minute value like "23:75") used to
// share ONE segment-wide certainty with the departure side, so it also downgraded (and, via the
// shared evidence text below, misattributed its explanation onto) departureDateTime and other
// departure fields that were perfectly fine on their own.
const DEPARTURE_QUALITY_SENSITIVE_KEYS=['departureAirport','departureTerminal','departureDateTime'];
const ARRIVAL_QUALITY_SENSITIVE_KEYS=['arrivalAirport','arrivalTerminal','arrivalDateTime'];

function buildEvidenceFields(segment,passengers,bookingReference,directionCandidates=[]){
  const fields=[];
  const push=(key,label,rawValue,certainty)=>{
    if(!String(rawValue||'').trim())return;
    const endpointCertainty=ARRIVAL_QUALITY_SENSITIVE_KEYS.includes(key)?(segment.arrivalCertainty||'exact'):DEPARTURE_QUALITY_SENSITIVE_KEYS.includes(key)?(segment.certainty||'exact'):null;
    const fallback=endpointCertainty||(segment.certainty==='unreadable'?segment.certainty:'exact');
    fields.push({key,label,rawValue:String(rawValue).trim(),evidence:segment.evidence||'',certainty:certainty||fallback});
  };
  push('bookingReference','אסמכתא/PNR',bookingReference,'exact');
  if(directionCandidates.length)push('directionAmbiguity','כיוון הטיסה (דורש בחירה)',directionCandidates.map(candidate=>candidate.label).join(' / '),'needs_review');
  push('flightNumber','מספר טיסה',segment.flightNumber);
  push('operatingCarrier','חברת תפעול',segment.operatingCarrier);
  if(normalized(segment.marketingCarrier)&&normalized(segment.marketingCarrier)!==normalized(segment.operatingCarrier))push('marketingCarrier','חברת שיווק',segment.marketingCarrier);
  push('departureAirport','שדה יציאה',[segment.departureAirportCode,segment.departureAirportName].filter(Boolean).join(' '));
  push('departureTerminal','טרמינל יציאה',segment.departureTerminal);
  push('arrivalAirport','שדה נחיתה',[segment.arrivalAirportCode,segment.arrivalAirportName].filter(Boolean).join(' '));
  push('arrivalTerminal','טרמינל נחיתה',segment.arrivalTerminal);
  push('departureDateTime','מועד יציאה',[segment.departureDate,segment.departureTime].filter(Boolean).join(' '));
  push('arrivalDateTime','מועד נחיתה',[segment.arrivalDate,segment.arrivalTime].filter(Boolean).join(' '));
  push('aircraftType','דגם מטוס',segment.aircraftType);
  push('classOfService','מחלקה',segment.classOfService);
  push('fareBasis','בסיס תעריף',segment.fareBasis);
  push('duration','משך טיסה',segment.duration);
  push('gate','שער עלייה',segment.gate);
  push('gateOpensTime','פתיחת שער',segment.gateOpensTime);
  push('gateClosesTime','סגירת שער',segment.gateClosesTime);
  push('boardingSequenceNumber','מספר רצף עלייה',segment.boardingSequenceNumber);
  for(const passenger of passengers){
    const prefix=`passenger:${normalized(passenger.name)}`;
    push(`${prefix}:seat`,`${passenger.name} · מושב`,passenger.seat);
    push(`${prefix}:meal`,`${passenger.name} · בקשת ארוחה`,passenger.mealRequest);
    for(const bag of passenger.baggage||[])push(`${prefix}:bag:${bag.bagType}`,`${passenger.name} · ${bagLabel(bag.bagType)}`,`${bag.weight||''} · ${bag.included==='included'?'כלול':bag.included==='not_included'?'לא כלול':'לא ידוע'}`.trim());
  }
  return fields;
}

function bagLabel(type){return {carry_on:'כבודת יד',checked:'מזוודה',trolley:'טרולי'}[type]||type||'כבודה'}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function normalized(value){return String(value||'').trim().toLowerCase().replace(/\s+/g,' ')}
function passengerMatchKey(name){return normalized(name).replace(/\b(mr|mrs|miss|ms|mstr|dr)\b/g,'').replace(/\(\s*(adt|chd|inf)\s*\)/g,'').split(/\s+/).filter(Boolean).sort().join(' ')}
function dateOnly(value){return String(value||'').slice(0,10)}
function passengerKey(passenger){const ticket=String(passenger?.eTicketNumber||'').replace(/\s+/g,'');return ticket?`ticket:${ticket}`:`name:${normalized(passenger?.name)}`}
// V6-F25/F27/F28: the model isn't forced to a wire date format, so a source's own display
// convention (spelled month, day-first numeric) can come back unconverted -- normalizeFlightDateString
// tries those before giving up, instead of requiring strict YYYY-MM-DD and silently going blank.
// Time reuses the same AM/PM-aware parser as Hotel (V6-F08/F21) instead of a bare 24-hour-only
// check, which would misread e.g. "10:45 PM" as 10:45 rather than rejecting or converting it.
function dateTime(date,time){
  const clean=isValidCalendarDate(String(date||'').slice(0,10))?String(date).slice(0,10):normalizeFlightDateString(date);
  if(!isValidCalendarDate(clean))return '';
  const clock=parseTimeValue(time);
  return clock?`${clean}T${clock}`:'';
}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
