import {isValidCalendarDate} from './operational-data.js';

// Flight Smart Import (0.6.5). Mirrors the Hotel Smart Import architecture (immutable source
// identity, processing attempts, field evidence, review-before-apply, explicit approval) but a
// single source may describe more than one real flight segment, so this module returns an
// ARRAY of suggestions -- one per usable segment -- instead of a single suggestion.

// Fields that must never be silently dropped when present in the source. A segment that has
// NONE of these is not a real, usable segment (see isFlightSegmentUsable).
const NO_OMISSION_BLOCKERS=['flightNumber','departureAirportCode','arrivalAirportCode','departureDate','arrivalDate'];

export function smartImportFlightResultToSuggestions(result,source,now=new Date()){
  const draft=result?.draft||{};
  const passengerRoster=Array.isArray(draft.passengers)?draft.passengers:[];
  const participantNames=passengerRoster.map(p=>String(p.name||'').trim()).filter(Boolean);
  const segments=Array.isArray(draft.segments)?draft.segments:[];
  const usable=segments.filter(isFlightSegmentUsable);
  const skippedCount=segments.length-usable.length;

  return usable.map((segment,index)=>{
    const passengers=buildSegmentPassengers(passengerRoster,segment);
    const smartImportFields=buildEvidenceFields(segment,passengers,draft.bookingReference);
    const needsReviewFields=smartImportFields.filter(field=>field.certainty!=='exact').map(field=>({key:field.key,label:field.label,value:field.rawValue,evidence:field.evidence}));

    const fieldConfidence={};
    for(const field of smartImportFields)fieldConfidence[field.key]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};

    const departureCode=String(segment.departureAirportCode||segment.departureAirportName||'').trim();
    const arrivalCode=String(segment.arrivalAirportCode||segment.arrivalAirportName||'').trim();
    const flightNumber=String(segment.flightNumber||'').trim();
    const route=[departureCode,arrivalCode].filter(Boolean).join(' → ');
    const title=[flightNumber,route].filter(Boolean).join(' ')||route||'טיסה';
    const provider=String(segment.marketingCarrier||segment.operatingCarrier||'').trim();

    const missingBlockers=NO_OMISSION_BLOCKERS.filter(key=>!String(segment[key]||'').trim());
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
// skipped, so the skip is visible rather than a silent gap).
export function isFlightSegmentUsable(segment){
  if(!segment||segment.status==='void')return false;
  return NO_OMISSION_BLOCKERS.some(key=>String(segment[key]||'').trim());
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

function buildSegmentPassengers(passengerRoster,segment){
  const details=Array.isArray(segment.passengerDetails)?segment.passengerDetails:[];
  const byName=new Map(details.map(detail=>[normalized(detail.passengerName),detail]));
  const roster=passengerRoster.length?passengerRoster:details.map(detail=>({name:detail.passengerName,eTicketNumber:'',certainty:detail.certainty}));
  return roster.map(passenger=>{
    const detail=byName.get(normalized(passenger.name))||{};
    return {
      name:String(passenger.name||'').trim(),
      eTicketNumber:String(passenger.eTicketNumber||'').trim(),
      seat:String(detail.seat||'').trim(),
      mealRequest:String(detail.mealRequest||'').trim(),
      baggage:(Array.isArray(detail.baggage)?detail.baggage:[]).map(bag=>({bagType:String(bag.bagType||'').trim(),weight:String(bag.weight||'').trim(),included:String(bag.included||'unknown').trim()})),
    };
  });
}

function buildEvidenceFields(segment,passengers,bookingReference){
  const fields=[];
  const push=(key,label,rawValue,certainty)=>{if(String(rawValue||'').trim())fields.push({key,label,rawValue:String(rawValue).trim(),evidence:segment.evidence||'',certainty:certainty||segment.certainty||'exact'})};
  push('bookingReference','אסמכתא/PNR',bookingReference,'exact');
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
function dateOnly(value){return String(value||'').slice(0,10)}
function passengerKey(passenger){const ticket=String(passenger?.eTicketNumber||'').replace(/\s+/g,'');return ticket?`ticket:${ticket}`:`name:${normalized(passenger?.name)}`}
function dateTime(date,time){
  const clean=String(date||'').slice(0,10);
  if(!isValidCalendarDate(clean))return '';
  const clock=/^([01]\d|2[0-3]):([0-5]\d)/.test(String(time||''))?String(time).slice(0,5):'';
  return clock?`${clean}T${clock}`:'';
}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
