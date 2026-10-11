// Beta 0.8 Phase 3.1 (P3-F15): the pure logic behind the redesigned ציר הזמן -- the month grid, the bands that stays draw under their
// dates, a day's agenda, the ribbon of days, where you sleep tonight. Dates are 'YYYY-MM-DD' keys; an item's startAt/endAt is a key or
// 'YYYY-MM-DDTHH:MM'. The DOM lives in v5-app.js.
const pad=number=>String(number).padStart(2,'0');
const at=key=>new Date(`${key}T12:00:00`);
export const keyOf=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
export const addDays=(key,count)=>{const date=at(key);date.setDate(date.getDate()+count);return keyOf(date)};
export const daysBetween=(from,to)=>Math.round((at(to)-at(from))/86400000);
export const dayOf=value=>value?String(value).slice(0,10):'';
export const hasTime=value=>String(value||'').length>10;
// "15:00", read straight from the stored local value (a value with an explicit zone is converted to local time).
export function timeText(value){
  if(!hasTime(value))return '';
  const text=String(value);
  if(/[zZ]$|[+-]\d\d:?\d\d$/.test(text)){const date=new Date(text);return `${pad(date.getHours())}:${pad(date.getMinutes())}`}
  return text.slice(11,16);
}

// Weeks of one month, Sunday first; days outside the month are null.
export function monthWeeks(year,month){
  const first=new Date(year,month,1),last=new Date(year,month+1,0),weeks=[];
  let week=Array(first.getDay()).fill(null);
  for(let day=1;day<=last.getDate();day++){
    week.push(`${year}-${pad(month+1)}-${pad(day)}`);
    if(week.length===7){weeks.push(week);week=[]}
  }
  if(week.length){while(week.length<7)week.push(null);weeks.push(week)}
  return weeks;
}

// An event that runs over several days (a hotel, a rental, a ferry) -- drawn as a band / bar through every day it covers.
export const isStay=item=>item?.schedule==='range'&&Boolean(item.startAt)&&Boolean(item.endAt)&&dayOf(item.endAt)>dayOf(item.startAt);
export const stayList=items=>(items||[]).filter(isStay).sort((a,b)=>String(a.startAt).localeCompare(String(b.startAt)));
// Muted hues for stays (distinct from the colours the kinds use for their dots).
export const STAY_HUES=['#2F6B8F','#6E5A8C','#9C4F6E','#3E7D7A','#5B5F97','#7B6A45'];
export const stayHue=(stays,stay)=>STAY_HUES[Math.max(0,stays.findIndex(candidate=>candidate.id===stay.id))%STAY_HUES.length];
export const KIND_COLOURS={flight:'#123F42',car:'#5E7A3A',activity:'#C86442',restaurant:'#8A6A2F',shoppingPlace:'#1A7F8E',hotel:'#6E5A8C'};

// The bands one week row needs: grid columns 1..7 (Sunday = 1), and whether each end is the stay's real start / end (rounded) or the
// week simply continuing (square).
export function weekBands(stays,week){
  const days=week.filter(Boolean);
  if(!days.length)return [];
  const first=days[0],last=days[days.length-1],out=[];
  for(const stay of stays){
    const from=dayOf(stay.startAt),to=dayOf(stay.endAt);
    if(to<first||from>last)continue;
    out.push({stay,start:week.indexOf(from>first?from:first)+1,end:week.indexOf(to<last?to:last)+1,roundStart:from>=first,roundEnd:to<=last});
  }
  return out;
}

// What happens on one day: single events, and a stay's check-in / check-out. Sorted by time; an item with no time comes first.
export function dayEntries(items,key){
  const entries=[];
  for(const item of items||[]){
    if(['none','entire'].includes(item.schedule)||!item.startAt)continue;
    if(isStay(item)){
      if(dayOf(item.startAt)===key)entries.push({item,role:'in',time:timeText(item.startAt)});
      if(dayOf(item.endAt)===key)entries.push({item,role:'out',time:timeText(item.endAt)});
    }else if(dayOf(item.startAt)===key)entries.push({item,role:'item',time:timeText(item.startAt)});
  }
  return entries.map((entry,index)=>({entry,index})).sort((a,b)=>a.entry.time.localeCompare(b.entry.time)||a.index-b.index).map(row=>row.entry);
}

// Where you sleep on the night that starts on `key`: a stay you have checked into and not yet out of.
export function nightStay(stays,key){
  const found=stays.filter(stay=>dayOf(stay.startAt)<=key&&key<dayOf(stay.endAt));
  const stay=found.find(candidate=>candidate.type==='hotel')||found[0];
  return stay?{stay,night:daysBetween(dayOf(stay.startAt),key)+1,nights:daysBetween(dayOf(stay.startAt),dayOf(stay.endAt))}:null;
}

// The ribbon rows for [from, to]: each day with its entries and the stays covering it. Runs of empty, stay-less days collapse when asked.
export function ribbonRows(items,stays,from,to,{collapse=false,minRun=2}={}){
  const days=[];
  for(let key=from;key<=to;key=addDays(key,1)){
    const covering=stays.filter(stay=>dayOf(stay.startAt)<=key&&key<=dayOf(stay.endAt)).map(stay=>({stay,position:dayOf(stay.startAt)===key?'start':dayOf(stay.endAt)===key?'end':'mid'}));
    days.push({key,entries:dayEntries(items,key),covering});
  }
  if(!collapse)return days;
  const rows=[];
  for(let index=0;index<days.length;){
    const day=days[index],empty=day.entries.length===0&&day.covering.length===0;
    if(!empty){rows.push(day);index++;continue}
    let end=index;while(end+1<days.length&&days[end+1].entries.length===0&&days[end+1].covering.length===0)end++;
    const count=end-index+1;
    if(count>=minRun)rows.push({collapsed:true,from:days[index].key,to:days[end].key,count});else for(let k=index;k<=end;k++)rows.push(days[k]);
    index=end+1;
  }
  return rows;
}

// The range the ribbon covers, by mode. cursor: the day / week / month being looked at; trip: {startDate,endDate}.
export function ribbonRange(mode,cursor,trip,items){
  const base=at(cursor);
  if(mode==='week'){const start=addDays(cursor,-base.getDay());return [start,addDays(start,6)]}
  if(mode==='month')return [`${base.getFullYear()}-${pad(base.getMonth()+1)}-01`,keyOf(new Date(base.getFullYear(),base.getMonth()+1,0))];
  const dated=(items||[]).map(item=>dayOf(item.startAt)).filter(Boolean).sort();
  const from=trip?.startDate||dated[0]||cursor,to=trip?.endDate||dated[dated.length-1]||cursor;
  return [from,to<from?from:to];
}

// Arrows move by the mode's own unit: a day, a week, or a calendar month (month and the whole trip).
export function shiftTimeline(cursor,mode,direction){
  if(mode==='day')return addDays(cursor,direction);
  if(mode==='week')return addDays(cursor,7*direction);
  const base=at(cursor);
  return keyOf(new Date(base.getFullYear(),base.getMonth()+direction,1));
}
