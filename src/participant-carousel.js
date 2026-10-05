// Beta 0.8 Phase 1.2 (P11-F14..F17): the participant selection control's pure rules, kept free of
// DOM and imports so they can be tested directly in plain Node. v5-app.js renders from these.

// P11-F16 breakpoint: a viewport at least this wide counts as "wide" (a computer, or a tablet held
// landscape / portrait >=768). Below it (phones) the control is always a carousel.
export const WIDE_FROM_PX=768;
// Layout geometry shared with styles.css (.p-carousel-item width / gap).
export const ITEM_WIDTH_PX=96;
export const GAP_PX=8;
// P11-F17: above this many options the dots become a "4 / 9" counter.
export const COUNTER_ABOVE=6;

// 'row' = everyone side by side (wide screen and they all fit the measured available width);
// 'carousel' = otherwise. "Fits" is a width question, not a participant-count threshold.
export function participantLayout({count,viewportWidth,availableWidth}){
  const needed=count*ITEM_WIDTH_PX+Math.max(0,count-1)*GAP_PX;
  return viewportWidth>=WIDE_FROM_PX&&needed<=availableWidth?'row':'carousel';
}

// Which options to mount, and where each sits relative to the selected one.
// carousel, 3+ options: five slots (two neighbours each side, wrapping) so a neighbour can slide in
// from off-screen; the outer two are clipped and hidden from assistive tech. 2 options: both, no
// loop and no repeats. row: every option in order; only the immediate neighbours get prev/next so
// the arrow keys can step through (no wrap).
export function carouselSlots(count,index,layout='carousel'){
  const at=position=>(position%count+count)%count;
  if(layout==='row'||count<3){
    return Array.from({length:count},(unused,i)=>({
      optionIndex:i,
      pos:i===index?'selected':i===index-1?'prev':i===index+1?'next':'far',
      hidden:false,
    }));
  }
  return [-2,-1,0,1,2].map(offset=>({
    optionIndex:at(index+offset),
    pos:({'-2':'far-prev','-1':'prev','0':'selected','1':'next','2':'far-next'})[offset],
    hidden:Math.abs(offset)===2,
  }));
}

// P11-F17: dots up to 6 options, a counter above that.
export function positionIndicator(count,index){
  return count>COUNTER_ABOVE?{kind:'counter',text:`${index+1} / ${count}`}:{kind:'dots',active:index,count};
}
