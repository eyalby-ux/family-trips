// Beta 0.9.3 -- (A) Pantomime, (B) מזכיר לי, (C) new-user onboarding, (D) the end-of-round winner animation plays twice (carried from 0.9.2).
// The AI call is always mocked. Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,WINNER_REPEATS,createWinnerPlayer,winnerHtml} from '../src/winner-animation.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),pkg=JSON.parse(read('../package.json'));
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647};

// ---------------------------------------------------------------- (D) the animation plays twice

test('(D) the end-of-round winner animation plays TWICE in succession, each pass with its own random direction; a new celebration cancels a running one',()=>{
  assert.equal(WINNER_REPEATS,2);
  const log=[];let clock=0;const queue=[];let id=0;
  const player=createWinnerPlayer({mount:html=>log.push({at:clock,html}),clear:()=>log.push({at:clock,cleared:true}),schedule:(fn,ms)=>{queue.push({id:++id,at:clock+ms,fn});return id},cancel:handle=>{const i=queue.findIndex(item=>item.id===handle);if(i>=0)queue.splice(i,1);log.push({at:clock,cancelled:handle})},random:seeded(7)});
  const advance=()=>{queue.sort((a,b)=>a.at-b.at);const next=queue.shift();clock=next.at;next.fn()};
  player.play({name:'דנה',caption:'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS});
  assert.equal(log.filter(entry=>entry.html).length,1,'the first pass starts at once');
  advance();
  assert.equal(log.filter(entry=>entry.html).length,2,'a second pass follows when the first one ends');assert.equal(log.at(-1).at,WINNER_MS.big,'right after the first (big) pass');
  assert(!log.some(entry=>entry.cleared),'the card does not blink off in between');
  advance();
  assert(log.at(-1).cleared&&log.at(-1).at===WINNER_MS.big*2,'cleared once, after the second pass: twice as long in total');
  const passes=log.filter(entry=>entry.html);
  assert(passes.every(entry=>entry.html.includes('<bdi>דנה</bdi>')&&entry.html.includes('ניצחון בסיבוב!')),'the winner is named in both passes');
  assert.equal(queue.length,0);
  // each pass picks its own direction: over many celebrations every direction shows up in both slots, and the pair is not always identical
  const seenFirst=new Set(),seenSecond=new Set();let differing=0;
  for(let seed=1;seed<=60;seed++){
    const got=[];const q=[];const p=createWinnerPlayer({mount:html=>got.push(html.match(/data-animation="(\w+)"/)[1]),clear:()=>{},schedule:fn=>{q.push(fn);return q.length},cancel:()=>{},random:seeded(seed*104729+13)});
    p.play({name:'x',times:2});q.shift()();seenFirst.add(got[0]);seenSecond.add(got[1]);if(got[0]!==got[1])differing++;
  }
  assert.equal(seenFirst.size,4);assert.equal(seenSecond.size,4);assert(differing>10,'two independent random picks');
  // a single pass stays a single pass (Bingo lines / board)
  const one=[];const q1=[];createWinnerPlayer({mount:html=>one.push(html),clear:()=>one.push('cleared'),schedule:fn=>{q1.push(fn);return 1},cancel:()=>{}}).play({name:'y'});q1.shift()();
  assert.equal(one.length,2,'one pass, then cleared');
  // starting a new celebration while one is running cancels it (no stacked timers)
  const cancelled=[];const q2=[];const p2=createWinnerPlayer({mount:()=>{},clear:()=>{},schedule:fn=>{q2.push(fn);return q2.length},cancel:h=>cancelled.push(h)});
  p2.play({name:'a',times:2});p2.play({name:'b',times:2});assert.deepEqual(cancelled,[1]);
});

test('(D) wiring: Trivia\'s end-of-round celebration asks for the two passes; Bingo\'s lines and board stay a single pass; the old per-answer behaviour stays gone',()=>{
  const next=app.slice(app.indexOf("else if(action==='trivia-next')"),app.indexOf("else if(action==='trivia-replay')"));
  assert(next.includes("caption:winners.length>1?'ניצחון משותף בסיבוב!':'ניצחון בסיבוב!',big:true,times:WINNER_REPEATS"),'Trivia: the winner(s), the big version, twice');
  const choose=fn('bingoStorePhoto');assert(!choose.includes('WINNER_REPEATS')&&!choose.includes('times:'),'Bingo completions: one pass');
  const score=app.slice(app.indexOf("else if(action==='trivia-score')"),app.indexOf("else if(action==='trivia-next')"));assert(!score.includes('fireWinner'),'not per answer');
  assert(app.includes("import {WINNER_REPEATS,createWinnerPlayer} from './winner-animation.js';"));
  assert(app.includes('const winnerPlayer=createWinnerPlayer({mount:')&&app.includes('function fireWinner(spec){winnerPlayer.play(spec)}'));
  assert.deepEqual(WINNER_ANIMATIONS,['confetti','stars','medal','burst']);
  assert(winnerHtml({name:'a',animation:'burst'}).includes('data-animation="burst"'));
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.3 tests passed`);
