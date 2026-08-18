import assert from 'node:assert/strict';
import {
  TYPE_FIELDS,
  createSuggestion,
  extractDates,
  extractLocation,
  findPossibleDuplicates,
  mapsUrl,
} from '../src/ingestion.js';

assert(TYPE_FIELDS.hotel.includes('website'));
assert(TYPE_FIELDS.contact.includes('phone'));
assert(!TYPE_FIELDS.participant.includes('location'));

assert.deepEqual(extractDates('Check-in 14 July 2026, check-out 17 July 2026'), ['2026-07-14','2026-07-17']);
assert.equal(extractLocation('Address: 123 Beach Road, Phuket'), '123 Beach Road, Phuket');
assert(mapsUrl('Panvasree Resort').includes('google.com/maps/search'));

const source = {
  id: 'src-new',
  name: 'booking.png',
  text: 'Hotel booking confirmation ABC123. Address: 1 Lake Road. Check-in 14/07/2026 Check-out 17/07/2026',
  fingerprint: 'same-hash',
  tripStartDate: '2026-07-01',
};
const suggestion = createSuggestion(source, new Date('2026-07-01T00:00:00Z'));
assert.equal(suggestion.proposed.type, 'hotel');
assert.equal(suggestion.proposed.confirmationNumber, 'ABC123');
assert.equal(suggestion.proposed.location, '1 Lake Road.');
assert.equal(suggestion.proposed.startAt, '2026-07-14T12:00');
assert.equal(suggestion.proposed.endAt, '2026-07-17T12:00');

const duplicates = findPossibleDuplicates(
  suggestion,
  [{ id:'item-1', type:'hotel', title:'Existing', sourceIds:['src-old'] }],
  [{ id:'src-old', fingerprint:'same-hash' }, { id:'src-new', fingerprint:'same-hash' }]
);
assert.equal(duplicates[0].id, 'item-1');

console.log('V4 correction tests passed.');
