import assert from 'node:assert/strict';
import { createSuggestion, extractConfirmationNumber, extractDates, findPossibleDuplicates, inferItemType, normalizeTitle, suggestionToItem, validateSource } from '../src/ingestion.js';

assert.equal(inferItemType('ELAL_flight_booking_screenshot.png').type, 'flight');
assert.notEqual(inferItemType('ELAL_flight_booking_screenshot.png').type, 'hotel');
assert.equal(inferItemType('hotel_room_booking.pdf').type, 'hotel');
assert.equal(inferItemType('booking_reference_only.png').type, 'document');
assert.equal(normalizeTitle('ELAL_flight_booking_screenshot.png'), 'ELAL flight');
assert.deepEqual(extractDates('flight_2026-08-14_return_25-08-2026.pdf'), ['2026-08-14','2026-08-25']);
assert.equal(extractConfirmationNumber('PNR: A1B2C3'), 'A1B2C3');

const source={id:'src-1',kind:'file',name:'ELAL_flight_PNR_A1B2C3_2026-08-14.png'};
const suggestion=createSuggestion(source,new Date('2026-07-31T16:00:00Z'));
assert.equal(suggestion.status,'pending');
assert.equal(suggestion.proposed.type,'flight');
assert.equal(suggestion.proposed.provider,'EL AL');
assert.equal(suggestion.sourceId,'src-1');
assert.equal(suggestion.proposed.confirmationNumber,'A1B2C3');

const item=suggestionToItem(suggestion);
assert.deepEqual(item.sourceIds,['src-1']);
assert.equal(item.type,'flight');

const duplicates=findPossibleDuplicates(suggestion,[{...item,id:'existing'}]);
assert.equal(duplicates.length,1);
assert.equal(validateSource({kind:'link',url:'https://example.com'}).ok,true);
assert.equal(validateSource({kind:'link',url:'javascript:alert(1)'}).ok,false);
assert.equal(validateSource({kind:'file',file:{type:'text/plain',size:10}}).ok,false);
assert.equal(validateSource({kind:'file',file:{type:'application/pdf',size:10}}).ok,true);

console.log('V4 ingestion tests passed.');
