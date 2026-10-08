// Beta 0.8 Phase 3 (design spec V7 S7): the wording of the quiet offline / sync strip. Pure; the strip itself is built in
// v5-app.js. Returns null when there is nothing to say -- the strip disappears the moment sync succeeds.
const plural=(count,one,many)=>count===1?one:many;

export function syncStripText({online=true,pending=0}={}){
  if(!online){
    const text=pending>0?`אופליין — ${plural(pending,'שינוי אחד ימתין לסנכרון',`${pending} שינויים ימתינו לסנכרון`)}`:'אופליין — המידע המקומי זמין';
    return {icon:'wifioff',text};
  }
  if(pending>0)return {icon:'refresh',text:plural(pending,'שינוי אחד ממתין לסנכרון',`${pending} שינויים ממתינים לסנכרון`)};
  return null;
}
