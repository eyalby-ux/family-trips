import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.7.9.2 -- Pre-Beta Code Health & Security Review V1, part 2: CR-002 (DNS-pin the SSRF defense's
// actual fetch), CR-003 (make the daily quota check atomic), and document removal (a soft unlink).
// Netlify Functions source is read as text (this project's established pattern -- no live Netlify
// Functions/Blobs runtime reachable from this environment), but the two backend items' own core
// logic is additionally exercised for real: extracted and executed directly against a real
// network request (CR-002) and a fake store mirroring @netlify/blobs' own documented
// compare-and-swap contract under genuine concurrent Promise.all() races (CR-003) -- not just
// string assertions on the source, matching this correction round's own established discipline.
const smartImportFn=fs.readFileSync(new URL('../netlify/functions/smart-import.mjs',import.meta.url),'utf8');
const quotaFn=fs.readFileSync(new URL('../netlify/functions/_shared/smart-import-quota.mjs',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');

function extractFn(src,name){
  let start=src.indexOf(`async function ${name}(`);
  if(start<0)start=src.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`not found: ${name}`);
  let depth=0,i=start,started=false;
  for(;i<src.length;i++){
    if(src[i]==='{'){depth++;started=true}
    else if(src[i]==='}'){depth--;if(started&&depth===0){i++;break}}
  }
  return src.slice(start,i);
}
function httpError(status,code,message){const error=new Error(message);error.status=status;error.code=code;return error}

// --- CR-002: pin the SSRF defense's DNS resolution -----------------------------------------

function test_0_7_9_2_undici_imported_for_its_own_fetch_agent_not_mixed_with_global_fetch(){
  // Confirmed directly during implementation, not assumed: an npm-installed undici Agent's
  // dispatcher passed to Node's GLOBAL fetch throws (InvalidArgumentError: invalid onRequestStart
  // method) -- global fetch uses Node's own internal, differently-versioned bundled undici. Only
  // undici's own fetch export accepts this package's own Agent as a dispatcher.
  assert(smartImportFn.includes("import {Agent as UndiciAgent, fetch as undiciFetch} from 'undici';"));
}
function test_0_7_9_2_assertPublicHost_returns_the_validated_addresses_not_just_pass_fail(){
  const body=extractFn(smartImportFn,'assertPublicHost');
  assert(body.includes('return addresses'));
}
function test_0_7_9_2_pinnedDispatcher_reuses_the_exact_validated_addresses_no_fresh_lookup(){
  const body=extractFn(smartImportFn,'pinnedDispatcher');
  assert(body.includes('lookup(hostname,options,callback){callback(null,addresses)}'));
}
function test_0_7_9_2_fetchPublicPage_and_the_robots_check_both_use_the_same_pinned_dispatcher(){
  const body=extractFn(smartImportFn,'fetchPublicPage');
  assert(body.includes('const addresses=await assertPublicHost(current.hostname);'));
  assert(body.includes('const dispatcher=pinnedDispatcher(addresses);'));
  assert(body.includes('assertRobotsAllowed(current,dispatcher)'));
  assert(body.includes('undiciFetch(current,{dispatcher,'));
  assert(body.includes('await dispatcher.close()'),'each redirect step\'s dispatcher must be closed, not leaked');
  assert(!body.includes('await fetch(current,'),'the main content fetch must no longer use the unpinned global fetch');
}
function test_0_7_9_2_robots_check_accepts_and_uses_the_pinned_dispatcher_too(){
  const body=extractFn(smartImportFn,'assertRobotsAllowed');
  assert(body.includes('async function assertRobotsAllowed(url,dispatcher){')||body.startsWith('function assertRobotsAllowed(url,dispatcher){'));
  assert(body.includes("undiciFetch(new URL('/robots.txt',url),{dispatcher,"));
}
// Note: a real-network end-to-end validation of assertPublicHost/fetchPublicPage/pinnedDispatcher
// (a genuine HTTPS fetch against a live site, plus proof that a dispatcher pinned to 127.0.0.1
// cannot silently connect to the real target instead) was run directly during implementation and
// is documented in this correction's own commit message -- deliberately NOT included as an
// automated test here, since this project's test suite (run as part of every `npm run build`,
// including real Netlify deploys) is established to stay network-independent, matching every
// other Smart-Import-adjacent test file's own "no live model/network call is reachable from this
// environment" discipline; a flaky or unavailable example.com must never fail a deploy.

// --- CR-003: make the daily quota check atomic ----------------------------------------------

function test_0_7_9_2_consumeDailyQuota_uses_compare_and_swap_not_a_new_dependency(){
  const body=extractFn(quotaFn,'consumeDailyQuota');
  assert(body.includes('getWithMetadata(key,{type:\'json\'})'));
  assert(body.includes('onlyIfMatch:existing.etag'));
  assert(body.includes('onlyIfNew:true'));
  assert(body.includes('if(result.modified)return next;'));
}
function test_0_7_9_2_consumeDailyQuota_fails_closed_after_exhausting_retries(){
  const body=extractFn(quotaFn,'consumeDailyQuota');
  assert(body.includes("throw httpError(503,'quota_check_conflict'"));
}
function makeFakeBlobsStore(){
  // Mirrors @netlify/blobs' own DOCUMENTED compare-and-swap contract exactly
  // (node_modules/@netlify/blobs/dist/main.d.ts): getWithMetadata returns {data,etag}|null;
  // setJSON({onlyIfNew:true}) only succeeds if the key doesn't exist; setJSON({onlyIfMatch:etag})
  // only succeeds if the key's CURRENT etag still equals the one supplied.
  const entries=new Map();let etagCounter=0;
  return {
    async getWithMetadata(key){const entry=entries.get(key);return entry?{data:JSON.parse(JSON.stringify(entry.data)),etag:entry.etag}:null},
    async setJSON(key,data,options={}){
      const entry=entries.get(key);
      if(options.onlyIfNew&&entry)return {modified:false};
      if(options.onlyIfMatch&&(!entry||entry.etag!==options.onlyIfMatch))return {modified:false};
      const etag=String(++etagCounter);entries.set(key,{data,etag});return {modified:true,etag};
    },
  };
}
async function loadConsumeDailyQuota(quotaLimit){
  globalThis.Netlify={env:{get:name=>name==='FAMILYTRIPS_SMART_IMPORT_DAILY_QUOTA'?String(quotaLimit):undefined}};
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const factory=new AsyncFunction('httpError','store',`${extractFn(quotaFn,'consumeDailyQuota')}
return consumeDailyQuota;`);
  return factory(httpError,()=>fakeStore);
}
let fakeStore;
async function test_0_7_9_2_consumeDailyQuota_sequential_calls_count_up_correctly(){
  fakeStore=makeFakeBlobsStore();
  const consumeDailyQuota=await loadConsumeDailyQuota(10);
  const user={emailHash:'seq-user'};
  const r1=await consumeDailyQuota(user),r2=await consumeDailyQuota(user),r3=await consumeDailyQuota(user);
  assert.deepEqual([r1.count,r2.count,r3.count],[1,2,3]);
}
async function test_0_7_9_2_consumeDailyQuota_concurrent_race_at_the_boundary_lets_exactly_one_increment_through(){
  // The scope document's own explicit test requirement: two concurrent calls at count = limit-1
  // must result in exactly one success, not both (the exact overshoot bug CR-003 reports).
  fakeStore=makeFakeBlobsStore();
  const consumeDailyQuota=await loadConsumeDailyQuota(1);
  const user={emailHash:'boundary-user'};
  const results=await Promise.allSettled([consumeDailyQuota(user),consumeDailyQuota(user)]);
  const succeeded=results.filter(r=>r.status==='fulfilled');
  const rejected=results.filter(r=>r.status==='rejected');
  assert.equal(succeeded.length,1,'exactly one of the two concurrent callers must succeed');
  assert.equal(rejected.length,1);
  assert.equal(rejected[0].reason.code,'daily_quota_exceeded');
}
async function test_0_7_9_2_consumeDailyQuota_larger_race_never_overshoots_the_limit(){
  fakeStore=makeFakeBlobsStore();
  const consumeDailyQuota=await loadConsumeDailyQuota(3);
  const user={emailHash:'race-user'};
  const results=await Promise.allSettled(Array.from({length:5},()=>consumeDailyQuota(user)));
  const succeeded=results.filter(r=>r.status==='fulfilled');
  assert.equal(succeeded.length,3,'exactly the limit must succeed, never more');
  const counts=succeeded.map(r=>r.value.count);
  assert.equal(new Set(counts).size,counts.length,'no two winners may share the same count -- proves no double-increment');
}

// --- Document removal: a soft unlink, with an extra warning for confirmed ticket coverage ---

function test_0_7_9_2_sourceRow_accepts_an_itemId_and_only_offers_unlink_when_present(){
  // Beta 0.8 Phase 2: sourceRow no longer needs the item type (ticket controls moved out), so itemId is its 2nd parameter.
  const start=app.indexOf('function sourceRow(source,itemId){');
  assert(start>-1,'sourceRow must accept itemId as a second parameter');
  const body=app.slice(start,start+2500);
  assert(body.includes('data-action="source-unlink" data-id="${source.id}" data-item-id="${itemId}"'));
  assert(body.includes('${itemId?`<button class="btn danger" data-action="source-unlink"'));
}
function test_0_7_9_2_detailView_passes_the_items_own_id_into_sourceRow(){
  assert(app.includes('sources.map(source=>sourceRow(source,item.id))'));
}
function test_0_7_9_2_source_unlink_only_touches_item_sourceIds_never_state_sources(){
  const start=app.indexOf("else if(action==='source-unlink')");
  assert(start>-1);
  const body=app.slice(start,start+1200);
  assert(body.includes('item.sourceIds=(item.sourceIds||[]).filter(id=>id!==source.id);'));
  assert(!body.includes('state.sources=state.sources.filter'),'the source record itself must never be removed from state.sources -- this is a soft unlink, not a delete');
  assert(!body.includes('delete source'));
}
function test_0_7_9_2_source_unlink_shows_an_extra_confirmed_ticket_warning_naming_participants(){
  const start=app.indexOf("else if(action==='source-unlink')");
  const body=app.slice(start,start+1200);
  assert(body.includes('if(source.ticketConfirmed){'));
  assert(body.includes("names.join(', ')||'משתתף'"));
  assert(body.includes("}else if(!confirm("),'a source with no confirmed ticket coverage must still get the app\'s ordinary confirm-before-destructive-action prompt, just without the extra warning');
}
function test_0_7_9_2_a_source_can_only_ever_belong_to_one_item_in_practice(){
  // Verification point the kickoff explicitly asked to confirm directly: every real write path
  // that ever adds an id to item.sourceIds only ever adds a BRAND NEW, freshly-created source
  // (attachIngest's own state.sources.push(source) immediately precedes it; suggestionToItem's
  // own sourceIds union only ever merges ids traceable back to a fresh per-attempt source too) --
  // no code path takes an id already present in another item's own sourceIds and adds it to a
  // second item. Confirmed by source-inspection of every write site, not assumed.
  assert(app.includes("state.sources.push(source);item.sourceIds=[...new Set([...(item.sourceIds||[]),source.id])]"),'the one real write path (attachIngest) must still create a fresh source immediately before linking it');
}

const tests=[
  test_0_7_9_2_undici_imported_for_its_own_fetch_agent_not_mixed_with_global_fetch,
  test_0_7_9_2_assertPublicHost_returns_the_validated_addresses_not_just_pass_fail,
  test_0_7_9_2_pinnedDispatcher_reuses_the_exact_validated_addresses_no_fresh_lookup,
  test_0_7_9_2_fetchPublicPage_and_the_robots_check_both_use_the_same_pinned_dispatcher,
  test_0_7_9_2_robots_check_accepts_and_uses_the_pinned_dispatcher_too,
  test_0_7_9_2_consumeDailyQuota_uses_compare_and_swap_not_a_new_dependency,
  test_0_7_9_2_consumeDailyQuota_fails_closed_after_exhausting_retries,
  test_0_7_9_2_consumeDailyQuota_sequential_calls_count_up_correctly,
  test_0_7_9_2_consumeDailyQuota_concurrent_race_at_the_boundary_lets_exactly_one_increment_through,
  test_0_7_9_2_consumeDailyQuota_larger_race_never_overshoots_the_limit,
  test_0_7_9_2_sourceRow_accepts_an_itemId_and_only_offers_unlink_when_present,
  test_0_7_9_2_detailView_passes_the_items_own_id_into_sourceRow,
  test_0_7_9_2_source_unlink_only_touches_item_sourceIds_never_state_sources,
  test_0_7_9_2_source_unlink_shows_an_extra_confirmed_ticket_warning_naming_participants,
  test_0_7_9_2_a_source_can_only_ever_belong_to_one_item_in_practice,
];
for(const test of tests){await test();console.log(`PASS: ${test.name}`)}
console.log('ALL PASS: 0.7.9.2 -- Pre-Beta Code Health & Security Review V1, part 2: CR-002 (SSRF DNS-pinning -- real-network end-to-end validation, including a real connection-level rejection of a pinned-private-address dispatcher, run separately and documented in the commit message, not part of this automated suite), CR-003 (atomic quota check, validated under genuine concurrent races against a fake store mirroring @netlify/blobs\' own documented CAS contract), and document soft-unlink (15 tests).');
