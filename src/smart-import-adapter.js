import {isValidCalendarDate,normalizeFlightDateString,normalizedGenericLabel,parseTimeValue,stripDuplicateLabelPrefix} from './operational-data.js';

const FIELD_MAP={
  property_name:'title',hotel_name:'title',booking_number:'confirmationNumber',booking_number_primary:'confirmationNumber',confirmation_number:'confirmationNumber',
  official_website:'website',website:'website',property_phone:'phone',property_phone_1:'phone',phone:'phone',
  supplier:'provider',provider:'provider',operator:'provider',booking_source:'provider',booking_platform:'provider',
  // V6-F55 correction pass: property_address/hotel_address/location/address are the exact key
  // names place-validation.mjs's validateHotelPlace() already recognizes for address evidence --
  // without a target mapping here, a needs-review conflict on one of these landed under whatever
  // raw key the model used, which NEEDS_REVIEW_FIELD_MAP (ingestion.js) has no entry for at all,
  // so it could never clear on any edit. Mapping them to 'location' lets a location-shaped
  // conflict resolve the same way every other mapped field already does.
  property_address:'location',hotel_address:'location',location:'location',address:'location',
};
const MERGE_FIELDS=['title','provider','confirmationNumber','location','website','phone','startAt','endAt'];
// V6-F55 correction pass: shared with ingestion.js's resolveMergeCandidate() and v5-app.js's
// rendering, so the exact prefix used to generate a merge-conflict warning, filter it out of the
// generic warning list (replaced by an explicit keep/accept picker), and clear it once resolved
// all stay in lockstep -- previously this string was only ever inline here, with no way for any
// other module to reliably recognize "this warning is a merge-conflict notice" without duplicating
// the literal text.
export const MERGE_CONFLICT_WARNING_PREFIX='ערך חדש התגלה עבור ';

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
    // V6-F49: key this by the RESOLVED proposed-field name (target) when one is known, not the
    // raw model-authored canonical key -- NEEDS_REVIEW_FIELD_MAP (ingestion.js) maps against
    // exactly this small, controlled vocabulary (startDate/endDate/title/... -> startAt/endAt/
    // title/...), so a manual edit of the mapped form field can actually find and clear this
    // entry. Previously this was always the raw canonical key, which the map had no entries for
    // at all, so a Hotel needs-review warning could never clear no matter what was edited.
    const target=FIELD_MAP[canonical]||classifyFieldKey(canonical);
    if(field.certainty==='needs_review'&&value)needsReviewFields.push({key:target||canonical,label:field.label||canonical,value,evidence:field.evidence||''});
    if(!value)continue;
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
  // V6-F50: a date the model resolves correctly but states only in free text (draft.unresolved /
  // draft.importantNotes) instead of a structured `fields` entry must still reach startAt/endAt
  // -- leaving it silently blank is a real omission (this project's standing no-omission
  // severity), not cosmetic. The durable fix is the tightened systemPrompt (see
  // smart-import-schema.mjs), which now tells the model to always pair a resolved conflict with
  // a needs_review-marked field. This is the lower-confidence backstop for when it doesn't
  // anyway: confirmed on the real Hyatt Regency case, whose free text read exactly
  // "Check-in date: 18 Jan 2027 (...)" / "Check-out date: 23 Jan 2027 (...)". Only fires when the
  // fields-based extraction above found nothing at all for that side, and always marks the
  // result needs_review -- this is a fallback guess at intent, not a confirmed field.
  const fallbackEvidenceFields=[];
  if(!startDate){
    const fallback=scanFreeTextForDate(draft,'start');
    if(fallback){
      startDate=fallback;
      needsReviewFields.push({key:'startDate',label:'תאריך התחלה',value:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes), לא בשדה מובנה — דורש אימות מול המקור'});
      fallbackEvidenceFields.push({key:'startDate',label:'תאריך התחלה (מטקסט חופשי)',rawValue:fallback,normalizedValue:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)',certainty:'needs_review'});
    }
  }
  if(!endDate){
    const fallback=scanFreeTextForDate(draft,'end');
    if(fallback){
      endDate=fallback;
      needsReviewFields.push({key:'endDate',label:'תאריך סיום',value:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes), לא בשדה מובנה — דורש אימות מול המקור'});
      fallbackEvidenceFields.push({key:'endDate',label:'תאריך סיום (מטקסט חופשי)',rawValue:fallback,normalizedValue:fallback,evidence:'זוהה בטקסט חופשי (unresolved/importantNotes)',certainty:'needs_review'});
    }
  }
  if(startDate)proposed.startAt=dateTime(startDate,startTime);
  if(endDate)proposed.endAt=dateTime(endDate,endTime);
  const propertyAddress=(draft.fields||[]).find(field=>['property_address','hotel_address','location'].includes(canonicalFieldKey(field.key)));
  if(propertyAddress)proposed.details.sourcePropertyAddress=String(propertyAddress.normalizedValue||propertyAddress.rawValue||'').trim();
  if(draft.propertyName)proposed.location=String(draft.propertyName).trim();
  const place=result.placeValidation;
  if(place?.state==='validated')proposed.details.canonicalPlace=place.acceptedPlace;
  // V6-F61 correction pass: both note-line sites (previously plain template literals) now
  // apply the same shared normalizedGenericLabel/stripDuplicateLabelPrefix helpers Activity's
  // otherFields site already used -- Hotel had this exact byte-identical doubling bug in its own
  // otherFields mapping, and BOTH adapters' importantNotes mapping was never touched at all.
  const noteLines=[...(draft.importantNotes||[]).map(note=>`${normalizedGenericLabel(note.title)}: ${stripDuplicateLabelPrefix(note.title,note.text)}`),...otherFields.map(field=>`${normalizedGenericLabel(field.label)}: ${stripDuplicateLabelPrefix(field.label,field.rawValue)}`)];
  proposed.notes=noteLines.join('\n');
  proposed.details.smartImportFields=[...(draft.fields||[]),...fallbackEvidenceFields];
  if(needsReviewFields.length)proposed.details.needsReviewFields=needsReviewFields;
  const needsReviewWarnings=needsReviewFields.map(field=>({message:`דורש בדיקה — ${field.label}: ${field.value} (${field.evidence||'ללא הפניה למקור'})`,needsReviewRef:{key:field.key,value:field.value}}));
  const proposalStateWarning=draft.proposalState==='needs_review'?['ההצעה כוללת מידע שדורש בדיקה לפני אישור.']:[];
  // V6-F49: an unresolved-sourced warning carries no field key at all, so reconcileStaleNeedsReview
  // (ingestion.js) can never match it to an edited field and clear it automatically -- there is
  // nothing to map FROM, unlike a needsReviewFields-sourced warning. Wrapping it as
  // {message,dismissible:true} instead of a plain string lets the review screen offer a manual
  // dismiss action specifically for this otherwise-unclearable kind (see v5-app.js's
  // isDismissibleWarning/dismiss-warning), without changing how any other warning renders --
  // warningText() already unwraps a {message} object exactly like this.
  const unresolvedWarnings=(draft.unresolved||[]).map(value=>({message:`דורש בדיקה: ${value}`,dismissible:true,source:'unresolved'}));
  proposed.warnings=[...(draft.warnings||[]),...unresolvedWarnings,...proposalStateWarning,...needsReviewWarnings,...(place&&place.state!=='validated'?['המיקום נשמר כשם המלון בלבד; לא אומתו קואורדינטות.']:[])];
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
    for(const key of candidateKeys)warnings.push(`${MERGE_CONFLICT_WARNING_PREFIX}${key}: ${candidates[key]} — הערך השמור נשמר; יש לבדוק ולעדכן ידנית במידת הצורך.`);
  }
  return {...suggestion,proposed:{...proposed,warnings},warnings};
}

function canonicalFieldKey(value){return String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}
function classifyFieldKey(key){
  if(/website|\burl\b|\bsite\b|\bweb\b/.test(key))return 'website';
  if(/phone|\btel\b|telephone|contact_number/.test(key))return 'phone';
  if(/supplier|provider|operator|chain|platform|booked_via|booked_through/.test(key))return 'provider';
  if(/(booking|confirmation|reservation|itinerary|room)[a-z_]*(number|id|code|ref)/.test(key))return 'confirmationNumber';
  const start=dateTimeKind(key,/check[_ ]?in|arrival/);
  if(start)return start==='time'?'startTime':'startDate';
  const end=dateTimeKind(key,/check[_ ]?out|departure/);
  if(end)return end==='time'?'endTime':'endDate';
  return null;
}
// Matches a check-in/check-out (or arrival/departure) root only when what follows it is empty
// (a bare "check_in"/"check_out" key, as real sources commonly label these columns — V6-F21)
// or itself looks like a date/day/time/window suffix. Matching "the root appears anywhere in
// the key" would misclassify an unrelated field like "check_in_instructions" or
// "check_out_policy" as the check-in/check-out date.
function dateTimeKind(key,rootPattern){
  const match=new RegExp(rootPattern).exec(key);
  if(!match)return null;
  const rest=key.slice(match.index+match[0].length).replace(/^[_ ]+/,'');
  if(rest===''||/^(date|day)(?:[_ ]|$)/.test(rest))return 'date';
  if(/^(time|window)(?:[_ ]|$)/.test(rest))return 'time';
  return null;
}
function certainty(value){return value==='exact'?'high':value==='needs_review'?'medium':'low'}
function findTime(draft,...keys){for(const field of draft.fields||[])if(keys.includes(canonicalFieldKey(field.key)))return parseTimeValue(String(field.normalizedValue||field.rawValue||'').trim());return ''}
// A shape match (\d{4}-\d{2}-\d{2}) is not enough: <input type="datetime-local"> silently
// sanitizes an unparseable-or-nonexistent date (e.g. 2027-02-30) to an EMPTY field with no
// warning, which would look exactly like V6-F04's original "date not persisted" bug through a
// different mechanism. Reject anything that isn't a real calendar date before it ever reaches
// the field, so a bad extraction surfaces as blank-and-reviewable rather than silently vanishing.
function dateTime(date,time){const clean=String(date).slice(0,10);if(!isValidCalendarDate(clean))return '';const clock=parseTimeValue(time)||'12:00';return `${clean}T${clock}`}
// V6-F50 backstop: looks for a labelled date inside the model's own free-text explanation
// (draft.unresolved entries, or draft.importantNotes' title+text) when the structured `fields`
// loop above found nothing for that side at all. Matches the exact real-world shape this
// project's own Hyatt Regency case produced ("Check-in date: 18 Jan 2027 (...)" / "Check-out
// date: 23 Jan 2027 (...)") plus the equivalent arrival/departure/start/end wording. Deliberately
// narrow and low-confidence -- this is a fallback for a gap the tightened systemPrompt is meant
// to close at the source, not a general-purpose date parser.
const FREE_TEXT_DATE_PATTERNS={
  start:/(?:check[- ]?in|arrival|start|event)\s*date[^\n]{0,40}?:\s*([0-9]{1,2}[\s/.-][A-Za-z]{3,9}[\s/.-][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
  end:/(?:check[- ]?out|departure|end)\s*date[^\n]{0,40}?:\s*([0-9]{1,2}[\s/.-][A-Za-z]{3,9}[\s/.-][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
};
export function scanFreeTextForDate(draft,kind){
  const texts=[...(draft.unresolved||[]),...(draft.importantNotes||[]).map(note=>`${note.title||''}: ${note.text||''}`)];
  for(const text of texts){
    const match=FREE_TEXT_DATE_PATTERNS[kind].exec(String(text||''));
    if(!match)continue;
    const raw=match[1];
    const clean=isValidCalendarDate(raw)?raw:normalizeFlightDateString(raw);
    if(isValidCalendarDate(clean))return clean;
  }
  return '';
}
function normalizedEqual(left,right){return String(left||'').trim().toLowerCase()===String(right||'').trim().toLowerCase()}
function isBlank(value){return value==null||value===''||(Array.isArray(value)&&!value.length)}
function clone(value){return Array.isArray(value)||typeof value==='object'?JSON.parse(JSON.stringify(value)):value}
function id(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
