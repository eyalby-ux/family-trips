import {isValidCalendarDate,normalizedGenericLabel,stripDuplicateLabelPrefix} from './operational-data.js';
import {scanFreeTextForDate} from './smart-import-adapter.js';

// Insurance Smart Import (0.6.7). INSURANCE_SMART_IMPORT_DISCOVERY_V1.md (V3, Frozen), Section 3/4.
// Field shape is a hybrid: mostly flat scalar fields exactly like Hotel (provider/confirmationNumber/
// phone/coverage dates, read through the same canonical fields[]->target mapping pattern), plus one
// structured per-person array (details.insuredPersons: name/idNumber/dob) mirroring Activity's own
// ticketHolders for the one genuinely multi-entry part of this type. relatedItemIds is deliberately
// NOT handled here at all -- see src/ingestion.js's own comment -- it is never extracted, only set
// manually by the user after the item exists.

const FIELD_TARGETS={
  provider:'provider',insurer:'provider',
  policy_number:'confirmationNumber',confirmation_number:'confirmationNumber',
  phone:'phone',emergency_phone:'phone',hotline:'phone',
  start_date:'startDate',coverage_start:'startDate',coverage_start_date:'startDate',
  end_date:'endDate',coverage_end:'endDate',coverage_end_date:'endDate',
  // V6-F76/V6-F77: website was deliberately left unmapped at first launch (the original Section 1
  // data-model check called the location/website omission "reasonable, an insurance policy has no
  // venue" -- true for location, but the 0.6.7 acceptance session confirmed real insurer websites
  // ARE commonly present and worth a structured field, same as Hotel/Activity/Restaurant already
  // have). Mapping it here is the single fix for both findings: it also puts 'website' into
  // TYPE_FIELDS.insurance (src/ingestion.js), which is what makes proposalFields() render the
  // field on the FIRST suggestion-review screen too, not only in the edit-item form's own
  // alwaysWebsite:true special case (which is why the field previously appeared only after
  // save+reopen, never on initial review).
  website:'website',
};
// sum_insured and broker (and any other free-form key the model chooses, e.g. "claims_phone" for a
// secondary non-emergency number) are deliberately NOT mapped to a target above -- per Decision 4,
// both are informational and land in notes via the otherFields fallback below, exactly like Hotel's
// own unmapped-field handling. This is a plain omission from FIELD_TARGETS, not a separate code path.

export function smartImportInsuranceResultToSuggestion(result,source,now=new Date()){
  const draft=result?.draft||{};
  const insuredPersons=(Array.isArray(draft.insuredPersons)?draft.insuredPersons:[]).map(person=>({
    name:String(person.name||'').trim(),
    idNumber:String(person.idNumber||'').trim(),
    dob:String(person.dob||'').trim(),
    evidence:String(person.evidence||'').trim(),
    certainty:person.certainty||'exact',
  }));
  const participants=[...new Set(insuredPersons.map(person=>person.name).filter(Boolean))];

  const fieldConfidence={};
  const otherFields=[];
  const needsReviewFields=[];
  let startDate='',endDate='';
  const values={provider:'',confirmationNumber:'',phone:'',website:''};
  for(const field of draft.fields||[]){
    const value=String(field.normalizedValue||field.rawValue||'').trim();
    const canonical=canonicalFieldKey(field.key);
    const target=FIELD_TARGETS[canonical];
    if(field.certainty==='needs_review'&&value)needsReviewFields.push({key:target||canonical,label:field.label||canonical,value,evidence:field.evidence||''});
    if(!value)continue;
    if(target==='startDate')startDate=startDate||value;
    else if(target==='endDate')endDate=endDate||value;
    else if(target&&target in values){if(!values[target])values[target]=value}
    else otherFields.push(field);
    fieldConfidence[target||canonical]={confidence:certainty(field.certainty),evidence:field.evidence||'',method:'ai_source_extraction'};
  }
  // Same V6-F50-style backstop every other adapter carries: a date the model resolved correctly
  // but only explained in free text (unresolved/importantNotes) must still reach a structured
  // field rather than silently vanishing from the review form.
  const fallbackFields=[];
  if(!startDate){
    const fallback=scanFreeTextForDate(draft,'start');
    if(fallback){
      startDate=fallback;
      needsReviewFields.push({key:'startDate',label:'תאריך תחילת כיסוי',value:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes), לא בשדה מובנה — דורש אימות מול המקור'});
      fallbackFields.push({key:'startDate',label:'תאריך תחילת כיסוי (מטקסט חופשי)',rawValue:fallback,normalizedValue:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)',certainty:'needs_review'});
    }
  }
  if(!endDate){
    const fallback=scanFreeTextForDate(draft,'end');
    if(fallback){
      endDate=fallback;
      needsReviewFields.push({key:'endDate',label:'תאריך סיום כיסוי',value:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes), לא בשדה מובנה — דורש אימות מול המקור'});
      fallbackFields.push({key:'endDate',label:'תאריך סיום כיסוי (מטקסט חופשי)',rawValue:fallback,normalizedValue:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)',certainty:'needs_review'});
    }
  }

  const title=values.provider||(insuredPersons[0]?.name?`ביטוח — ${insuredPersons[0].name}`:'');
  const noteLines=[...(draft.importantNotes||[]).map(note=>`${normalizedGenericLabel(note.title)}: ${stripDuplicateLabelPrefix(note.title,note.text)}`),...otherFields.map(field=>`${normalizedGenericLabel(field.label)}: ${stripDuplicateLabelPrefix(field.label,field.rawValue)}`)];
  const needsReviewWarnings=needsReviewFields.map(field=>({message:`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`,needsReviewRef:{key:field.key,value:field.value}}));
  const proposalStateWarning=draft.proposalState==='needs_review'?['ההצעה כוללת מידע שדורש בדיקה לפני אישור.']:[];
  const unresolvedWarnings=(draft.unresolved||[]).map(value=>({message:`דורש בדיקה: ${value}`,dismissible:true,source:'unresolved'}));
  const missingTitleWarning=title?[]:['לא זוהה שם מבטח — נדרשת בדיקה לפני אישור.'];
  const warnings=[...(draft.warnings||[]),...unresolvedWarnings,...proposalStateWarning,...needsReviewWarnings,...missingTitleWarning];

  const smartImportFields=[...(draft.fields||[]),...fallbackFields];
  const proposed={
    type:'insurance',
    title,
    provider:values.provider,
    confirmationNumber:values.confirmationNumber,
    phone:values.phone,
    website:values.website,
    startAt:dateTime(startDate),
    endAt:dateTime(endDate),
    participants,
    notes:noteLines.join('\n'),
    schedule:'entire',
    details:{
      insuredPersons,
      smartImportFields,
      importantNotes:draft.importantNotes||[],
    },
    dateMeta:{startPrecision:startDate?'date':'unknown',endPrecision:endDate?'date':'unknown',startTimeZone:'',endTimeZone:''},
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
    confidence:draft.proposalState==='proposed'&&title?'high':'medium',
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
// Insurance coverage dates have no meaningful time-of-day component in any real benchmark
// document (a policy runs by calendar day) -- defaults to noon, the same "date-only precision"
// convention every other adapter already uses (dateMeta.start/endPrecision:'date').
function dateTime(date){const clean=String(date).slice(0,10);return isValidCalendarDate(clean)?`${clean}T12:00`:''}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}

// Mirrors mergeActivityTicketHolders' exact logic (activity-import-adapter.js), applied to
// insuredPersons: match by idNumber when present (most reliable), else normalized name; union all
// entries from both sides, never drop one; per matched entry, existing non-blank field wins, blank
// fields fill from the incoming entry. Needed for the same reason V6-F66 fixed Activity's
// ticketHolders -- attaching a second insurance document (e.g. a companion confirmation letter) to
// an existing item must never silently replace the first document's insuredPersons wholesale.
export function mergeInsuredPersons(existingPersons,newPersons){
  const existing=Array.isArray(existingPersons)?existingPersons:[];
  const incoming=Array.isArray(newPersons)?newPersons:[];
  const merged=new Map(existing.map(person=>[insuredPersonKey(person),{...person}]));
  for(const person of incoming){
    const key=insuredPersonKey(person);
    const current=merged.get(key);
    if(!current){merged.set(key,{...person});continue}
    merged.set(key,{
      name:current.name||person.name,
      idNumber:current.idNumber||person.idNumber,
      dob:current.dob||person.dob,
      evidence:current.evidence||person.evidence,
      certainty:current.certainty||person.certainty,
    });
  }
  return [...merged.values()];
}
function insuredPersonKey(person){
  const idNumber=String(person?.idNumber||'').replace(/\s+/g,'');
  return idNumber?`id:${idNumber}`:`name:${normalizedPersonName(person?.name)}`;
}
function normalizedPersonName(value=''){return String(value).trim().toLowerCase().replace(/\s+/g,' ')}

// Mirrors mergeActivityDetails' own "existing wins unless genuinely blank" rule -- Insurance has
// no other detail scalars worth merging (sum insured/broker land in notes, not details), so this
// is just the insuredPersons merge above, kept as its own exported function for the same reason
// mergeActivityDetails is: so suggestionToItem (src/ingestion.js) can call one function per type
// rather than inlining the merge logic there.
export function mergeInsuranceDetails(existingDetails,newDetails){
  const existing=existingDetails||{},incoming=newDetails||{};
  return {...existing,...incoming,insuredPersons:mergeInsuredPersons(existing.insuredPersons,incoming.insuredPersons)};
}
