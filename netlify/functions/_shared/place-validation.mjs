const LODGING=new Set(['bed_and_breakfast','budget_japanese_inn','camping_cabin','cottage','extended_stay_hotel','farmstay','guest_house','hostel','hotel','inn','japanese_inn','lodging','motel','private_guest_room','resort_hotel']);
// Attraction/Event (0.6.6): the same property-first accurate-location discipline Hotel already
// has, applied to Google's attraction/venue-shaped place types instead of lodging types. Kept as
// its own set rather than merged with LODGING -- a result strongly typed as a hotel should not
// silently satisfy an Attraction/Event lookup or vice versa.
const ATTRACTION=new Set(['tourist_attraction','museum','zoo','amusement_park','aquarium','art_gallery','stadium','park','national_park','water_park','historical_landmark','performing_arts_theater','event_venue','visitor_center','amphitheater','planetarium']);
const FIELD_MASK='places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location,places.primaryType,places.types,places.googleMapsUri';
export async function validateHotelPlace(draft){
  return validatePlace({draft,name:String(draft.propertyName||'').trim(),address:field(draft,'property_address','hotel_address','location'),typeSet:LODGING});
}
// Attraction/Event (0.6.6): draft.activityName is the meaningful title (mirrors draft.propertyName
// for Hotel); its own location comes from the generic `fields` array under the 'location' key,
// same as every other field the activity adapter reads.
export async function validateActivityPlace(draft){
  return validatePlace({draft,name:String(draft.activityName||'').trim(),address:field(draft,'location'),typeSet:ATTRACTION});
}
async function validatePlace({draft,name,address,typeSet}){
  if(!name)return null;
  const countryCode=country(draft,address);if(!countryCode)return pending(name,'country_not_evidence_grounded');
  const key=Netlify.env.get('FAMILYTRIPS_GOOGLE_PLACES_API_KEY');if(!key)return pending(name,'provider_not_configured');
  const query=[name,address].filter(Boolean).join(', ');const response=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key,'x-goog-fieldmask':FIELD_MASK},body:JSON.stringify({textQuery:query,languageCode:'en',regionCode:countryCode.toUpperCase(),pageSize:5}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)return pending(name,`provider_http_${response.status}`);const payload=await response.json();const strong=(payload.places||[]).map(candidate=>evaluate(name,countryCode,candidate,typeSet)).filter(Boolean);
  if(strong.length!==1)return pending(name,strong.length>1?'ambiguous_multiple_strong_matches':'no_strong_match');
  return {state:'validated',locationDisplayValue:name,query,lookupCount:1,acceptedPlace:strong[0]};
}
function evaluate(propertyName,countryCode,candidate,typeSet){const names=normalize(candidate?.displayName?.text),expected=normalize(propertyName),types=[candidate?.primaryType,...(candidate?.types||[])].map(normalize),countryValue=normalize((candidate?.addressComponents||[]).find(component=>component?.types?.includes('country'))?.shortText),lat=Number(candidate?.location?.latitude),lng=Number(candidate?.location?.longitude);if(!(names===expected||names.startsWith(`${expected} `))||!types.some(type=>typeSet.has(type))||countryValue!==normalize(countryCode)||!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat>90||lng < -180||lng>180)return null;return {placeId:String(candidate.id||''),name:String(candidate?.displayName?.text||propertyName),latitude:lat,longitude:lng,primaryType:normalize(candidate?.primaryType),types,countryCode:countryValue,formattedAddress:String(candidate?.formattedAddress||''),googleMapsUri:String(candidate?.googleMapsUri||'')}}
function pending(name,reason){return {state:'pending_place_validation',locationDisplayValue:name,lookupCount:reason==='provider_not_configured'||reason==='country_not_evidence_grounded'?0:1,acceptedPlace:null,reason}}
function field(draft,...keys){for(const item of draft.fields||[])if(keys.includes(normalizeKey(item.key)))return String(item.normalizedValue||item.rawValue||'').trim();return ''}
export function country(draft,address){
  const explicit=field(draft,'country_code','property_country_code','country');
  if(/^[a-z]{2}$/i.test(explicit))return explicit.toLowerCase();
  const explicitCode=countryNameToCode(explicit);if(explicitCode)return explicitCode;
  return countryNameToCode(`${explicit} ${address}`);
}
function countryNameToCode(text){
  const value=normalize(text);if(!value)return '';
  for(const [name,code] of COUNTRY_NAME_ENTRIES)if(value===name||value.includes(` ${name} `)||value.startsWith(`${name} `)||value.endsWith(` ${name}`))return code;
  return '';
}
const COUNTRY_NAMES={
  afghanistan:'af',albania:'al',algeria:'dz',andorra:'ad',angola:'ao',argentina:'ar',armenia:'am',australia:'au',austria:'at',azerbaijan:'az',
  bahamas:'bs',bahrain:'bh',bangladesh:'bd',barbados:'bb',belarus:'by',belgium:'be',belize:'bz',benin:'bj',bhutan:'bt',bolivia:'bo',
  'bosnia and herzegovina':'ba',botswana:'bw',brazil:'br',brunei:'bn',bulgaria:'bg','burkina faso':'bf',burundi:'bi',cambodia:'kh',cameroon:'cm',canada:'ca',
  chad:'td',chile:'cl',china:'cn',colombia:'co',congo:'cg','costa rica':'cr',croatia:'hr',cuba:'cu',cyprus:'cy',czechia:'cz','czech republic':'cz',
  denmark:'dk',djibouti:'dj','dominican republic':'do',ecuador:'ec',egypt:'eg','el salvador':'sv',estonia:'ee',eswatini:'sz',ethiopia:'et',fiji:'fj',
  finland:'fi',france:'fr',gabon:'ga',gambia:'gm',georgia:'ge',germany:'de',ghana:'gh',greece:'gr',greenland:'gl',guatemala:'gt',
  guinea:'gn',guyana:'gy',haiti:'ht',honduras:'hn',hungary:'hu',iceland:'is',india:'in',indonesia:'id',iran:'ir',iraq:'iq',
  ireland:'ie',israel:'il',italy:'it','ivory coast':'ci',jamaica:'jm',japan:'jp',jordan:'jo',kazakhstan:'kz',kenya:'ke',kuwait:'kw',
  kyrgyzstan:'kg',laos:'la',latvia:'lv',lebanon:'lb',lesotho:'ls',liberia:'lr',libya:'ly',liechtenstein:'li',lithuania:'lt',luxembourg:'lu',
  madagascar:'mg',malawi:'mw',malaysia:'my',maldives:'mv',mali:'ml',malta:'mt',mauritius:'mu',mexico:'mx',moldova:'md',monaco:'mc',
  mongolia:'mn',montenegro:'me',morocco:'ma',mozambique:'mz',myanmar:'mm',namibia:'na',nepal:'np',netherlands:'nl','new zealand':'nz',nicaragua:'ni',
  niger:'ne',nigeria:'ng','north korea':'kp','north macedonia':'mk',norway:'no',oman:'om',pakistan:'pk',panama:'pa','papua new guinea':'pg',paraguay:'py',
  peru:'pe',philippines:'ph',poland:'pl',portugal:'pt',qatar:'qa',romania:'ro',russia:'ru',rwanda:'rw','saudi arabia':'sa',senegal:'sn',
  serbia:'rs',seychelles:'sc',singapore:'sg',slovakia:'sk',slovenia:'si','south africa':'za','south korea':'kr',korea:'kr','south sudan':'ss',spain:'es',
  'sri lanka':'lk',sudan:'sd',suriname:'sr',sweden:'se',switzerland:'ch',syria:'sy',taiwan:'tw',tajikistan:'tj',tanzania:'tz',thailand:'th',
  togo:'tg','trinidad and tobago':'tt',tunisia:'tn',turkey:'tr',turkmenistan:'tm',uganda:'ug',ukraine:'ua','united arab emirates':'ae','emirates':'ae',
  'united kingdom':'gb',uk:'gb','great britain':'gb',england:'gb',scotland:'gb',wales:'gb','united states':'us','united states of america':'us',usa:'us',america:'us',
  uruguay:'uy',uzbekistan:'uz',venezuela:'ve',vietnam:'vn',yemen:'ye',zambia:'zm',zimbabwe:'zw',
  'costa del sol':'es',barcelona:'es',madrid:'es',bangkok:'th',phuket:'th','ban ta khun':'th','khao sok':'th',eilat:'il','tel aviv':'il',jerusalem:'il',
  'ประเทศไทย':'th','ישראל':'il','ספרד':'es','תאילנד':'th',
};
const COUNTRY_NAME_ENTRIES=Object.entries(COUNTRY_NAMES).sort((a,b)=>b[0].length-a[0].length).map(([name,code])=>[normalize(name),code]);
function normalize(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
function normalizeKey(value){return String(value||'').toLowerCase().replace(/[\s-]+/g,'_').replace(/_\d+$/,'')}

