// Beta 0.9.2 (P91-F3): the winner animation every game shares -- Trivia / Pantomime per scored round, Bingo per completed line or board.
// Four approved directions, picked at random each time it fires (so repeated rounds don't always look the same); the winner's name sits in
// the middle of every one. Pure and DOM-free: this module only builds the markup, v5-app.js mounts it and the CSS animates it.
// prefers-reduced-motion hides the moving layer (styles.css) and leaves just the named card.
export const WINNER_ANIMATIONS=['confetti','stars','medal','burst'];
export const WINNER_MS={normal:2400,big:3800};
export const pickWinnerAnimation=(random=Math.random)=>WINNER_ANIMATIONS[Math.min(WINNER_ANIMATIONS.length-1,Math.floor(random()*WINNER_ANIMATIONS.length))];

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const COLOURS=['#C86442','#123F42','#E8B04A','#5FA8A0','#A4442A'];
const STAR='<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>';
const MEDAL='<circle cx="12" cy="9" r="6" fill="#E8B04A" stroke="#123F42" stroke-width="1.4"/><path d="M9 14.5l-2 6.5l5 -2.5l5 2.5l-2 -6.5" fill="#C86442" stroke="#123F42" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 5.8l.9 1.9l2.1 .3l-1.5 1.5l.35 2.1l-1.85 -1l-1.85 1l.35 -2.1l-1.5 -1.5l2.1 -.3z" fill="#FCFAF7"/>';

function particles(animation,big,random){
  const count=big?1.7:1,at=(from,to)=>from+random()*(to-from),colour=()=>COLOURS[Math.floor(random()*COLOURS.length)];
  if(animation==='confetti')return Array.from({length:Math.round(30*count)},()=>`<i style="--x:${at(2,98).toFixed(1)}%;--c:${colour()};--r:${Math.round(at(0,180))}deg;--d:${at(1.6,2.6).toFixed(2)}s;--delay:${at(0,.6).toFixed(2)}s"></i>`).join('');
  if(animation==='stars')return Array.from({length:Math.round(16*count)},()=>`<svg class="star" viewBox="0 0 24 24" style="--x:${at(2,94).toFixed(1)}%;--c:${colour()};--d:${at(1.8,2.8).toFixed(2)}s;--delay:${at(0,.8).toFixed(2)}s" aria-hidden="true">${STAR}</svg>`).join('');
  if(animation==='medal')return `<svg class="medal" viewBox="0 0 24 24" aria-hidden="true">${MEDAL}</svg>`;
  return Array.from({length:Math.round(14*count)},(_,index)=>`<i class="ray" style="--a:${Math.round(index*360/Math.round(14*count))}deg;--c:${COLOURS[index%COLOURS.length]}"></i>`).join('');
}
// {animation} is injectable so a test can pin each direction; without it one is picked at random.
export function winnerHtml({name,caption='',big=false,animation},random=Math.random){
  const kind=WINNER_ANIMATIONS.includes(animation)?animation:pickWinnerAnimation(random);
  const total=(big?WINNER_MS.big:WINNER_MS.normal)/1000;
  return `<div class="winner-overlay ${kind}${big?' big':''}" style="--total:${total}s" role="status" aria-live="polite" data-animation="${kind}"><div class="winner-fx" aria-hidden="true">${particles(kind,big,random)}</div><div class="winner-card"><b class="winner-name"><bdi>${esc(name)}</bdi></b>${caption?`<span class="winner-caption">${esc(caption)}</span>`:''}</div></div>`;
}

// ---- 0.9.3: the end-of-round celebration plays TWICE (PO: a longer moment). Each pass picks its own direction at random. ----
// A round-ending win (Trivia, Pantomime) asks for WINNER_REPEATS passes; Bingo's line/board celebrations stay a single pass.
export const WINNER_REPEATS=2;
// The browser supplies mount / clear / schedule / cancel; a test supplies fakes. Starting a new celebration cancels the one still running.
export function createWinnerPlayer({mount,clear,schedule,cancel,random=Math.random}){
  let timer=null;
  const pass=(spec,left)=>{
    mount(winnerHtml(spec,random));
    timer=schedule(()=>{if(left>1)pass(spec,left-1);else{clear();timer=null}},spec.big?WINNER_MS.big:WINNER_MS.normal);
  };
  return {play(spec){if(timer!==null)cancel(timer);pass(spec,Math.max(1,Number(spec.times)||1))}};
}
