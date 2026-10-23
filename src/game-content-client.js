// Beta 0.9.1: asks the server to build a game's content for the trip (Trivia now; Pantomime joins in 0.9.3). Same endpoint
// family, auth token and daily Smart Import quota as the document import -- one build tap is one of the day's calls.
import {auth} from './firebase.js';
import {resolveSmartImportErrorMessage} from './operational-data.js';

const ENDPOINT='/api/familytrips-game-content';
// Only title + location of hotels / activities leave the device -- never confirmation numbers, phones, participants or notes.
export const tripContextForGames=(trip,items)=>({destinations:(trip?.destinationCountries||[]).map(String),items:(items||[]).filter(item=>['hotel','activity'].includes(item.type)).map(item=>({title:item.title||'',location:item.location||''}))});

export const generateTrivia=({trip,items,history})=>generateContent('generate_trivia',{trip,items,history});
// 0.9.3: Pantomime is destination-only -- the items are never even sent
export const generatePantomime=({trip,history})=>generateContent('generate_pantomime',{trip,items:[],history});
// 0.9.3: one suggestion for one mode (word | song); `history` is that mode's recent suggestions
export const generateRemindMeStart=({trip,mode,history})=>generateContent('generate_remind_me_start',{trip,items:[],history,mode});
async function generateContent(operation,{trip,items,history,mode}){
  const user=auth.currentUser;
  if(!user)throw new Error('נדרשת התחברות פעילה כדי לבנות תוכן למשחק.');
  if(!navigator.onLine)throw new Error('בניית תוכן למשחק דורשת חיבור לאינטרנט. אפשר לשחק במשחק שכבר נבנה גם בלי חיבור.');
  const tripId=String(trip?.id||'').trim();if(!tripId)throw new Error('לא נמצא טיול פעיל.');
  const token=await user.getIdToken();
  const response=await fetch(ENDPOINT,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({operation,tripId,...tripContextForGames(trip,items),history:history||[],...(mode?{mode}:{})})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error==='no_destination'?'הוסיפו יעד לטיול כדי לבנות את המשחק.':resolveSmartImportErrorMessage(payload.error,response.status,'הבנייה נכשלה. נסו שוב בעוד רגע.'));
  return payload;
}
