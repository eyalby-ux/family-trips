// Beta 0.9.1: asks the server to build a game's content for the trip (Trivia now; Pantomime joins in 0.9.3). Same endpoint
// family, auth token and daily Smart Import quota as the document import -- one build tap is one of the day's calls.
import {auth} from './firebase.js';
import {resolveSmartImportErrorMessage} from './operational-data.js';

const ENDPOINT='/api/familytrips-game-content';
// Only title + location of hotels / activities leave the device -- never confirmation numbers, phones, participants or notes.
export const tripContextForGames=(trip,items)=>({destinations:(trip?.destinationCountries||[]).map(String),items:(items||[]).filter(item=>['hotel','activity'].includes(item.type)).map(item=>({title:item.title||'',location:item.location||''}))});

export async function generateTrivia({trip,items,history}){
  const user=auth.currentUser;
  if(!user)throw new Error('נדרשת התחברות פעילה כדי לבנות טריוויה.');
  if(!navigator.onLine)throw new Error('בניית טריוויה דורשת חיבור לאינטרנט. אפשר לשחק בטריוויה שכבר נבנתה גם בלי חיבור.');
  const tripId=String(trip?.id||'').trim();if(!tripId)throw new Error('לא נמצא טיול פעיל.');
  const token=await user.getIdToken();
  const response=await fetch(ENDPOINT,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({operation:'generate_trivia',tripId,...tripContextForGames(trip,items),history:history||[]})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error==='no_destination'?'הוסיפו יעד לטיול כדי לבנות טריוויה.':resolveSmartImportErrorMessage(payload.error,response.status,'בניית הטריוויה נכשלה. נסו שוב בעוד רגע.'));
  return payload;
}
