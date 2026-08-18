import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isItemOutsideTrip} from '../src/operational-data.js';

const trip={startDate:'2027-01-07',endDate:'2027-01-26'};

assert.equal(isItemOutsideTrip({schedule:'range',startAt:'2027-01-10T10:00',endAt:'2027-01-20T10:00'},trip),false);
assert.equal(isItemOutsideTrip({schedule:'range',startAt:'2027-01-10T10:00',endAt:'2027-01-27T10:00'},trip),true);
assert.equal(isItemOutsideTrip({schedule:'range',startAt:'2027-01-06T10:00',endAt:'2027-01-20T10:00'},trip),true);
assert.equal(isItemOutsideTrip({schedule:'single',startAt:'2027-01-27T10:00',endAt:''},trip),true);
assert.equal(isItemOutsideTrip({schedule:'entire',startAt:'2027-01-01T10:00',endAt:'2027-02-01T10:00'},trip),false);
assert.equal(isItemOutsideTrip({schedule:'range',startAt:'2027-01-10T10:00',endAt:'2027-01-27T10:00'},null),false);

const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
assert(app.includes('function conflict(item){return isItemOutsideTrip(item,state.trip)}'));
assert(app.includes('function requiresOutOfRangeConfirmation(values){return isItemOutsideTrip(values,state.trip)}'));

console.log('V5 Alpha 0.5.6 range-boundary correction tests passed.');
