// Beta 0.9.2: Bingo ("בינגו לפי מקום") -- pure logic and the static content. One game, six location themes; every participant gets their own
// shuffled 4x4 board per theme and finds a spot by photographing it. Content is hand-authored and shipped with the app (no AI, no quota).
// The DOM wiring lives in v5-app.js.
export const BINGO_ID='game-airport-bingo';
export const BINGO_SIZE=4;
const pool=(key,labels)=>labels.map((label,index)=>({id:`${key}-${index+1}`,label}));
// `icon` names an icon of the app's own set (v5-app.js TABLER); `inLabel` is the theme as used after "ב" in sentences.
export const BINGO_THEMES={
  airport:{label:'שדה תעופה',inLabel:'בשדה התעופה',icon:'plane',spots:pool('airport',['מזוודה אדומה','מטוס','מדים של אנשי צוות','מסוע מזוודות','לוח המראות','שער עלייה','עגלת מזוודות','דוכן ביקורת דרכונים','חנות פטורה ממכס','שלט לשירותים','כרטיס עלייה למטוס','חלון עם תצפית למסלול','שעון בשדה התעופה','עגלת תינוק בשדה התעופה','שלט של חברת תעופה','ברזיית מים לשתייה'])},
  beach:{label:'חוף',inLabel:'בחוף',icon:'beach',spots:pool('beach',['ארמון חול','שמשיית חוף','קונכייה','עץ דקל','מגדל מציל','דוכן גלידה','רשת כדורעף חוף','סירה באופק','מגבת חוף','כפכפים','מצוף בים','גלי קצף','שחף','טביעות רגליים בחול','שקיעה או זריחה מעל הים','דגל חוף'])},
  city:{label:'עיר',inLabel:'בעיר',icon:'city',spots:pool('city',['תחנת רכבת או רכבת תחתית','פסל או אנדרטה','שלט רחוב בשפה מקומית','אוטובוס מקומי','שוק רחוב','גרפיטי או אמנות רחוב','מוזיקאי רחוב','בית קפה עם שולחנות בחוץ','בניין היסטורי','רוכב אופניים','קיוסק או חנות ממתקים','פנס רחוב ישן','כיכר עיר','שלט תמרורים מיוחד','יונה או חתול רחוב','עגלת אוכל רחוב'])},
  hotel:{label:'מלון',inLabel:'במלון',icon:'bed',spots:pool('hotel',['בריכה','שלט "אל תפריעו"','מגבת מקופלת בצורת חיה','מיני-בר','מעלית','עגלת שירות חדרים','כרטיס מפתח לחדר','שלט מספר החדר','ארוחת בוקר בופה','כיסא שיזוף לבריכה','חלוק מלון','שלט יציאת חירום','לובי המלון','שלט קבלה','מכונת קפה בחדר','נוף מהחלון'])},
  // folded in from the old "ציד תמונות" game (P91-P1)
  onTheRoad:{label:'בדרכים',inLabel:'בדרכים',icon:'car',spots:pool('onTheRoad',['שלט דרך מצחיק','משאית משא גדולה','תחנת דלק','מכונית בצבע נדיר (לדוגמה סגול או תכלת)','גשר','טחנת רוח או פאנל סולארי','עדר בהמות בשטח','רכבת חוצה כביש','שלט כיוון למקום מרוחק','פינת חי בצד הדרך','שלט מגבלת מהירות יצירתי','ענן בצורה מיוחדת','שלט תחנת מנוחה','גרר או משאית תקלות','מחסום או תחנת אגרה','שלט כפר או עיר עם שם מעניין'])},
  restaurant:{label:'מסעדות',inLabel:'במסעדות',icon:'utensils',spots:pool('restaurant',['תפריט בשפה מקומית','מנה שלא ניסיתם קודם','קינוח מיוחד','שולחן מעוצב או מקושט','מטבח פתוח או שף בעבודה','כלי הגשה מיוחד (לדוגמה קערת חרס, מחבת חמה)','שלט שם המסעדה','תבלינים או רטבים על השולחן','חדר אוכל עם נוף','מנה ששותפים כולם מהצלחת אחת','כוס שתייה מעוצבת','קישוט על הקיר (לדוגמה ציור, תמונה, תעודה)','שלט "ללא גלוטן"/"טבעוני" או דומה','שולחן מוגבה או ישיבה על הרצפה','חשבון או קבלה מעוצבת','קינוח שמגיע עם אש או עשן'])},
};
export const BINGO_THEME_KEYS=Object.keys(BINGO_THEMES);

export function shuffled(list,random=Math.random){
  const copy=[...list];
  for(let index=copy.length-1;index>0;index-=1){const other=Math.floor(random()*(index+1));[copy[index],copy[other]]=[copy[other],copy[index]]}
  return copy;
}
// A participant's own arrangement of the theme's 16 spots.
export const newBoardLayout=(theme,random=Math.random)=>shuffled((BINGO_THEMES[theme]?.spots||[]).map(spot=>spot.id),random);

// The board of one participant in one theme, created the first time it is opened (never pre-generated for every theme x participant).
export function ensureBoard(game,theme,participantId,random=Math.random){
  game.boards=game.boards&&typeof game.boards==='object'?game.boards:{};
  game.boards[theme]=game.boards[theme]&&typeof game.boards[theme]==='object'?game.boards[theme]:{};
  const existing=game.boards[theme][participantId];
  if(existing&&Array.isArray(existing.layout)&&existing.layout.length===BINGO_SIZE*BINGO_SIZE){existing.found=existing.found&&typeof existing.found==='object'?existing.found:{};return existing}
  return game.boards[theme][participantId]={layout:newBoardLayout(theme,random),found:{}};
}

// Rows and columns only (no diagonals) plus the whole board. Cell indexes are positions in `layout`.
export const LINE_CELLS=(()=>{
  const lines={};
  for(let row=0;row<BINGO_SIZE;row+=1)lines[`row-${row}`]=Array.from({length:BINGO_SIZE},(_,col)=>row*BINGO_SIZE+col);
  for(let col=0;col<BINGO_SIZE;col+=1)lines[`col-${col}`]=Array.from({length:BINGO_SIZE},(_,row)=>row*BINGO_SIZE+col);
  lines.board=Array.from({length:BINGO_SIZE*BINGO_SIZE},(_,index)=>index);
  return lines;
})();
export function completedLines(board){
  const found=board?.found||{},layout=board?.layout||[];
  return Object.entries(LINE_CELLS).filter(([,cells])=>cells.every(index=>layout[index]&&found[layout[index]])).map(([key])=>key);
}
export const foundCount=board=>Object.keys(board?.found||{}).length;
// Completions that have not celebrated yet, and the one caption to show (a photo can finish a row AND a column at once).
export function freshCompletions(board,celebrated=[]){
  const fresh=completedLines(board).filter(key=>!celebrated.includes(key));
  if(!fresh.length)return {keys:[],caption:'',big:false};
  if(fresh.includes('board'))return {keys:fresh,caption:'הלוח הושלם!',big:true};
  const rows=fresh.filter(key=>key.startsWith('row-')).length,cols=fresh.filter(key=>key.startsWith('col-')).length;
  return {keys:fresh,caption:rows&&cols?'שורה ועמודה הושלמו!':rows>1?'כמה שורות הושלמו!':cols>1?'כמה עמודות הושלמו!':rows?'שורה הושלמה!':'עמודה הושלמה!',big:false};
}
// Photos live inside the Storage layout the security rules already allow: trips/{tripId}/sources/{sourceId}/{file}.
export const bingoPhotoLocation=(theme,participantId,spotId)=>({sourceId:`bingo_${theme}_${participantId}`,filename:`${spotId}.jpg`});
export const boardPhotoPaths=board=>Object.values(board?.found||{}).map(entry=>entry?.photoPath).filter(Boolean);
// Reset = delete the board and its celebrations outright; the next render recreates it fresh (newly shuffled) through ensureBoard.
export function dropBoard(game,theme,participantId){
  if(game.boards?.[theme])delete game.boards[theme][participantId];
  if(game.celebratedLines?.[theme])delete game.celebratedLines[theme][participantId];
}
