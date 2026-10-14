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

// Beta 0.8.1 (V7-F14): what a failed cloud read / write says. A revoked or quarantined account is refused by the server with `permission-denied`; that is not a
// connectivity problem the person can wait out, so it says plainly that the account was removed from the trip. Anything else keeps the generic wording.
export function cloudFailureMessage(error,kind='save',{online=true}={}){
  if(error?.code==='permission-denied')return kind==='load'
    ?'החשבון שלך הוסר מהטיול הזה, ולכן אין לו עוד גישה לנתוניו. אם זו טעות, פנו לבעל הטיול.'
    :'החשבון שלך הוסר מהטיול הזה, ולכן השינויים לא נשמרים. אם זו טעות, פנו לבעל הטיול.';
  if(kind==='load')return `טעינת נתוני הטיול נכשלה (${error?.code||'שגיאה'}). ${online?'נסו שוב.':'אין חיבור לאינטרנט וייתכן שהנתונים לא נשמרו במטמון המקומי.'}`;
  return 'שמירת השינויים בענן נכשלה. השינויים נשארים במסך זה בלבד עד לחיבור מחדש.';
}
