import assert from 'node:assert/strict';
import {MultipartQrCollector,createQrPayload,decodeExternalText,importBatchToApp,validateImportBatch} from '../src/external-import.js';

const source={sourceId:'src-001',originalFileName:'flight.png',mediaType:'image/png',sizeBytes:100,sha256:'a'.repeat(64),pageCount:1,status:'processed',extractionMethod:'external',languages:['en'],linkedItemIds:['item-001'],warnings:[]};
const item={externalId:'item-001',type:'flight',title:'EL AL LY087',provider:'EL AL',confirmationNumber:'',participants:['Eyal'],location:'TLV → HKT',website:'',phone:'',schedule:'single',startAt:'2026-01-07T22:00',endAt:'',dateMeta:{startPrecision:'minute',endPrecision:'unknown',startTimeZone:'Asia/Jerusalem',endTimeZone:''},notes:'',sourceRefs:['src-001'],details:{flightNumber:'LY087'},fieldConfidence:{flightNumber:{confidence:'high'}},warnings:[],requiresReview:true};
const batch={schema:'familytrips.import',schemaVersion:'1.0',createdAt:'2026-08-03T00:00:00Z',generator:{kind:'external-language-model',name:'test'},tripContext:{name:'Thailand',startDate:'2026-01-07',endDate:'2026-01-26',defaultTimeZone:'Asia/Jerusalem'},sources:[source],items:[item],duplicateCandidates:[],unresolved:[],batchWarnings:[]};
assert.equal(validateImportBatch(batch).items.length,1);
assert.throws(()=>validateImportBatch({...batch,schemaVersion:'2.0'}),/לא נתמכת/);
assert.throws(()=>validateImportBatch({...batch,items:[{...item,type:'link'}]}),/לא נתמך/);
const app=importBatchToApp(batch,{idFactory:(prefix)=>prefix+'-local',now:new Date('2026-08-03T00:00:00Z')});
assert.equal(app.suggestions.length,1);
assert.equal(app.suggestions[0].status,'pending');
assert.equal(app.suggestions[0].requiresReview,true);
assert.equal(app.suggestions[0].proposed.details.flightNumber,'LY087');
assert.equal(app.sources[0].binaryIncluded,false);

const envelope={schema:'familytrips.qr.item',schemaVersion:'1.0',item,sources:[source]};
const single=await createQrPayload(envelope);
assert.equal(single.kind,'single');
const decoded=await decodeExternalText(single.payloads[0]);
assert.equal(decoded.batch.items[0].externalId,'item-001');

const large={...envelope,item:{...item,notes:'x'.repeat(5000)}};
const multipart=await createQrPayload(large);
assert.equal(multipart.kind,'multipart');
const collector=new MultipartQrCollector();
for(const payload of [...multipart.payloads].reverse()){const result=await decodeExternalText(payload);collector.add(result.chunk)}
collector.add((await decodeExternalText(multipart.payloads[0])).chunk);
const rebuilt=await collector.finish();
assert.equal(rebuilt.items[0].notes.length,5000);
const bad=multipart.payloads.at(-1).replace(/.$/,value=>value==='A'?'B':'A');
const badCollector=new MultipartQrCollector();
for(const payload of [...multipart.payloads.slice(0,-1),bad])badCollector.add((await decodeExternalText(payload)).chunk);
await assert.rejects(()=>badCollector.finish(),/checksum/);
console.log('V5 external import and QR tests passed.');
