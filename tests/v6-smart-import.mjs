import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartImportResultToSuggestion,saveOnlySource} from '../src/smart-import-adapter.js';

const source={id:'source-1',name:'hotel.pdf',fingerprint:'abc'};
const result={attemptId:'attempt-1',estimatedVariableCostUsd:0.003,latencyMs:12000,usage:{inputTokens:100},draft:{proposalState:'proposed',meaningfulTitle:'Panvaree Resort',propertyName:'Panvaree Resort',fields:[
  {key:'property_address',label:'Property address',rawValue:'Ratchaprapha Dam, Ban Ta Khun',normalizedValue:'Ratchaprapha Dam, Ban Ta Khun, Thailand',evidence:'Page 1',certainty:'exact'},
  {key:'booking_number_primary',label:'Booking number',rawValue:'ABC123',normalizedValue:'ABC123',evidence:'Page 1',certainty:'exact'},
  {key:'arrival_date',label:'Arrival',rawValue:'2027-01-17',normalizedValue:'2027-01-17',evidence:'Page 1',certainty:'exact'},
  {key:'departure_date',label:'Departure',rawValue:'2027-01-18',normalizedValue:'2027-01-18',evidence:'Page 1',certainty:'exact'},
  {key:'property_phone_1',label:'Phone',rawValue:'+66 99 915 995',normalizedValue:'+66 99 915 995',evidence:'Page 1',certainty:'exact'},
  {key:'meal_plan',label:'Meal plan',rawValue:'Breakfast',normalizedValue:'Breakfast',evidence:'Page 2',certainty:'exact'}
],importantNotes:[{category:'arrival',title:'Arrival instruction',text:'Call before arrival',evidence:'Page 2',certainty:'exact'}],warnings:[],unresolved:[],explicitlyAbsent:[]},placeValidation:{state:'validated',locationDisplayValue:'Panvaree Resort',acceptedPlace:{placeId:'place-1',latitude:9.02,longitude:98.69,formattedAddress:'Ban Ta Khun'}}};

const suggestion=smartImportResultToSuggestion(result,source,new Date('2026-08-14T12:00:00Z'));
assert.equal(suggestion.proposed.type,'hotel');
assert.equal(suggestion.proposed.title,'Panvaree Resort');
assert.equal(suggestion.proposed.confirmationNumber,'ABC123');
assert.equal(suggestion.proposed.location,'Panvaree Resort');
assert.equal(suggestion.proposed.details.sourcePropertyAddress,'Ratchaprapha Dam, Ban Ta Khun, Thailand');
assert.equal(suggestion.proposed.phone,'+66 99 915 995');
assert.equal(suggestion.proposed.startAt,'2027-01-17T12:00');
assert.equal(suggestion.proposed.endAt,'2027-01-18T12:00');
assert.equal(suggestion.proposed.details.canonicalPlace.placeId,'place-1');
assert.match(suggestion.proposed.notes,/Breakfast/);
assert.match(suggestion.proposed.notes,/Call before arrival/);
assert.equal(saveOnlySource(source).processingState,'saved_only');

const server=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-auth.mjs',import.meta.url),'utf8');
const quota=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-quota.mjs',import.meta.url),'utf8');
assert.match(server,/store:false/);
assert.match(server,/MAX_BINARY_BYTES=4\*1024\*1024/);
assert.match(server,/assertPublicHost/);
assert.doesNotMatch(quota,/dataBase64|output_text|full extracted/i);
assert.match(auth,/email_verified/);
assert.match(auth,/FAMILYTRIPS_ALLOWED_EMAILS/);
assert.match(quota,/trip_not_owned/);
assert.match(quota,/daily_quota_exceeded/);

console.log('PASS: Alpha 0.6 Hotel Smart Import adapter, review-first mapping, server authorization, bounded acquisition and audit privacy');
