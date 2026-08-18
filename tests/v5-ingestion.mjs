import assert from 'node:assert/strict';
import {createSuggestions,extractConfirmationNumber,extractFlightSegments,extractPhone,suggestionToItem} from '../src/ingestion.js';
import {backfillTripDates} from '../src/operational-data.js';

assert.equal(extractConfirmationNumber('Passenger surname: YITZHAK'),'');
assert.equal(extractConfirmationNumber('EL AL flight LY087 SCREENSHOT'),'');
assert.equal(extractConfirmationNumber('Booking ID: 1736468481'),'1736468481');
assert.equal(extractPhone('Booking ID: 1736468481'),'');
assert.equal(extractPhone('Phone: +66 76 123 456'),'+66 76 123 456');

const multi='EL AL Flight LY087 TLV → HKT Departure 07/01/2026 22:00. EL AL Flight LY088 HKT → TLV Departure 25/01/2026 12:30';
assert.equal(extractFlightSegments(multi).length,2);
const suggestions=createSuggestions({id:'src-1',name:'ELAL itinerary.pdf',text:multi,tripStartDate:'2026-01-07'},new Date('2026-08-03T00:00:00Z'));
assert.equal(suggestions.length,2);
assert.equal(suggestions[0].proposed.details.flightNumber,'LY087');
assert.equal(suggestions[1].proposed.location,'HKT → TLV');

const imported={sourceId:'src-new',sourceIds:['src-new'],proposed:{type:'hotel',title:'Updated hotel',provider:'',confirmationNumber:'',participants:[],location:'',website:'',phone:'',schedule:'range',startAt:'',endAt:'',notes:'',details:{room:'Family'},dateMeta:{},fieldConfidence:{},warnings:[]}};
const merged=suggestionToItem(imported,{id:'item-1',type:'hotel',title:'Old',provider:'Agoda',confirmationNumber:'ABC123',participants:['Eyal'],location:'Krabi',website:'https://hotel.test',phone:'+66123',schedule:'range',startAt:'2026-01-10T12:00',endAt:'2026-01-12T12:00',notes:'keep',sourceIds:['src-old']});
assert.equal(merged.provider,'Agoda');
assert.equal(merged.confirmationNumber,'ABC123');
assert.deepEqual(merged.sourceIds,['src-old','src-new']);

const items=[{type:'hotel',schedule:'range',startAt:'',endAt:''},{type:'flight',schedule:'single',startAt:'2026-01-09T10:00',endAt:''},{type:'contact',schedule:'none',startAt:'',endAt:''}];
assert.equal(backfillTripDates(items,'2026-01-07'),1);
assert.equal(items[0].startAt,'2026-01-07T12:00');
assert.equal(items[1].startAt,'2026-01-09T10:00');
assert.equal(items[2].startAt,'');
const sharedLink=createSuggestions({id:'src-link',kind:'link',name:'https://share.google/AbCflightToken',url:'https://share.google/AbCflightToken'},new Date('2026-08-06T00:00:00Z'));
assert.deepEqual(sharedLink,[]);
const titledLink=createSuggestions({id:'src-title',kind:'link',name:'https://share.google/xyz',url:'https://share.google/xyz',pageTitle:'Panan Krabi Resort'},new Date('2026-08-06T00:00:00Z'))[0];
assert.equal(titledLink.proposed.title,'Panan Krabi Resort');
assert.equal(titledLink.proposed.type,'hotel');
console.log('V5 extraction, merge and date-default tests passed.');
