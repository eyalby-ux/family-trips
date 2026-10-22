// Beta 0.9.2 -- Games Interactive: the shared winner animation (P91-F3, also patched into the live 0.9.1 Trivia) and Bingo (six themes,
// per-participant 4x4 photo boards, per-board reset, ציד תמונות folded in). Browser-only wiring is asserted from source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WINNER_ANIMATIONS,WINNER_MS,pickWinnerAnimation,winnerHtml} from '../src/winner-animation.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/v5-app.js'),css=read('../src/styles.css'),pkg=JSON.parse(read('../package.json'));
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const fn=name=>{const start=app.indexOf(`function ${name}(`);assert(start>-1,name);const end=app.indexOf('\n}\n',start);return app.slice(start,end>start?end:start+4000)};
const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647};

test('winner animation: four directions, picked at random -- every direction can come up and none is hard-wired',()=>{
  assert.deepEqual(WINNER_ANIMATIONS,['confetti','stars','medal','burst']);
  assert.equal(pickWinnerAnimation(()=>0),'confetti');assert.equal(pickWinnerAnimation(()=>0.3),'stars');assert.equal(pickWinnerAnimation(()=>0.6),'medal');assert.equal(pickWinnerAnimation(()=>0.99),'burst');assert.equal(pickWinnerAnimation(()=>1),'burst','never out of range');
  const random=seeded(11),seen=new Set();for(let i=0;i<200;i++)seen.add(pickWinnerAnimation(random));
  assert.equal(seen.size,4,'a run of rounds shows all four');
  const kinds=new Set(Array.from({length:40},(_,i)=>winnerHtml({name:'אייל'},seeded(i*104729+17)).match(/data-animation="(\w+)"/)[1]));
  assert(kinds.size>=3,'winnerHtml itself picks at random when no direction is forced');
});

test('winner animation: the winner\'s NAME is in the middle of every direction, escaped, in its own isolate; the caption is optional; a bigger one lasts longer',()=>{
  for(const animation of WINNER_ANIMATIONS){
    const html=winnerHtml({name:'פאולה כהן',caption:'שורה הושלמה!',animation});
    assert(html.includes(`class="winner-overlay ${animation}"`)&&html.includes(`data-animation="${animation}"`),animation);
    assert(html.includes('<b class="winner-name"><bdi>פאולה כהן</bdi></b>')&&html.includes('<span class="winner-caption">שורה הושלמה!</span>'),'the name and the caption are in the card');
    assert(html.indexOf('winner-fx')<html.indexOf('winner-card'),'the moving layer sits behind the named card');
    assert(html.includes('role="status"')&&html.includes('aria-live="polite"'),'announced to screen readers');
    assert(html.includes('class="winner-fx" aria-hidden="true"'),'decoration hidden from them');
  }
  assert(!winnerHtml({name:'x',animation:'medal'}).includes('winner-caption'),'no caption, no empty span');
  const evil=winnerHtml({name:'<img src=x onerror=alert(1)>',animation:'stars'});
  assert(!evil.includes('<img')&&evil.includes('&lt;img'),'a name can never inject markup');
  assert(winnerHtml({name:'a',animation:'confetti',big:true}).includes('winner-overlay confetti big')&&winnerHtml({name:'a',animation:'confetti',big:true}).includes(`--total:${WINNER_MS.big/1000}s`));
  assert(WINNER_MS.big>WINNER_MS.normal);assert(winnerHtml({name:'a',animation:'burst'}).includes(`--total:${WINNER_MS.normal/1000}s`));
  // each direction draws its own thing, and a bigger one draws more
  assert((winnerHtml({name:'a',animation:'confetti'},seeded(1)).match(/<i /g)||[]).length>=20);
  assert((winnerHtml({name:'a',animation:'stars'},seeded(1)).match(/class="star"/g)||[]).length>=10);
  assert(winnerHtml({name:'a',animation:'medal'}).includes('class="medal"'));
  assert((winnerHtml({name:'a',animation:'burst'}).match(/class="ray"/g)||[]).length>=10);
  assert((winnerHtml({name:'a',animation:'confetti',big:true},seeded(1)).match(/<i /g)||[]).length>(winnerHtml({name:'a',animation:'confetti'},seeded(1)).match(/<i /g)||[]).length);
});

test('winner animation: reduced motion keeps only the card; it never blocks a tap; it is mounted outside #app so render() cannot wipe it; it removes itself',()=>{
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.winner-fx\{display:none\}\.winner-overlay\{animation:none\}\}/);
  assert.match(css,/#winner-host\{position:fixed;inset:0;[^}]*pointer-events:none\}/);
  const fire=fn('fireWinner');
  assert(fire.includes("document.querySelector('#winner-host')")&&fire.includes('document.body.append(host)'),'a host on <body>, not inside #app');
  assert(fire.includes('winnerHtml({name,caption,big},random)')&&fire.includes('clearTimeout(winnerTimer)')&&fire.includes("host.innerHTML=''"),'one at a time, and it clears itself');
  assert(fire.includes('big?WINNER_MS.big:WINNER_MS.normal'));
  for(const kind of ['fall','drop','pulse','ray'])assert(css.includes(`@keyframes winner-${kind}`),kind);
});

test('P91-F3 patch to the live 0.9.1 Trivia: scoring a point fires the shared animation naming that participant; taking the point back does not; scoring logic is untouched',()=>{
  const handler=app.slice(app.indexOf("else if(action==='trivia-score')"),app.indexOf("else if(action==='trivia-next')"));
  assert(handler.includes('wasMarked=triviaMarked.includes(button.dataset.participant)')&&handler.includes('if(!wasMarked)'),'only a newly given point celebrates');
  assert(handler.includes('fireWinner({name:winner.name})'),'the participant\'s own name');
  assert(handler.includes('toggleCorrect(game.triviaState,triviaMarked,button.dataset.participant)')&&handler.includes('game.triviaState={...game.triviaState,scores:result.scores};save();render();'),'the 0.9.1 scoring lines are unchanged');
  assert(handler.indexOf('save();render();')<handler.indexOf('fireWinner('),'drawn after the re-render, so it is not wiped');
  assert(app.includes("import {WINNER_MS,winnerHtml} from './winner-animation.js';"));
});

let failed=0;
for(const [name,body] of tests){
  try{await body();console.log(`PASS: ${name}`)}
  catch(error){failed++;console.error(`FAIL: ${name}\n  ${String(error.message).split('\n').slice(0,8).join('\n  ')}`)}
}
if(failed){console.error(`${failed} of ${tests.length} failed`);process.exit(1)}
console.log(`All ${tests.length} Beta 0.9.2 tests passed`);
