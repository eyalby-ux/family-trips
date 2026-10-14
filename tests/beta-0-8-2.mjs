// Beta 0.8.2 (PO, 2026-10-14, after the 0.8.1 promotion): a Failed document on an item page keeps "נסה שוב" / "מחק" in its "⋯" menu, like the Documents list.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/v5-app.js',import.meta.url),'utf8');
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};

test('an item page\'s Failed document: the pill carries no buttons; "נסה שוב" is the first menu entry and "מחק" is in the menu',()=>{
  const row=fn('otherDocRow');
  assert(row.includes('importStatusPill(stateName)')&&!row.includes('failedActions')&&!row.includes('{actions:'),'no inline buttons beside the pill');
  assert(row.includes("const menu=[canRetry&&stateName==='failed'?menuButton('analyze-source',source,'נסה שוב'):''"),'retry first in the menu');
  assert(row.includes("canDeleteSource(source,'')?menuButton('source-delete',source,'מחק')"),'delete offered for a Failed row too');
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,6).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.8.2 tests passed`);
