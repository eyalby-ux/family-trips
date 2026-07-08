import type { CharadePrompt, DailyPhotoChallenge, RoadBingoItem, SongGuessItem, TrueFalseQuestion, TriviaQuestion } from "../types";
export const dailyPhotoChallenges: DailyPhotoChallenge[] = [
  { dayId: "day-1", title: "יום הטיסה", items: ["מזוודה הכי צבעונית", "מטוס של אל על", "סלפי ראשון בטיול"] },
  { dayId: "day-2", title: "איסוף רכב והרים", items: ["שלט באיטלקית", "מנהרה", "פסגה מושלגת"] },
  { dayId: "day-3", title: "דולומיטים", items: ["פרה עם פעמון", "רכבל", "פרח מיוחד"] },
];
export const roadBingoItems: RoadBingoItem[] = ["פרה","מנהרה","אגם","אופנוע","רכבל","מפל","טירה","טרקטור","שלט בגרמנית","רכב אדום"].map((label, i) => ({ id: `b${i}`, label }));
export const trueFalseQuestions: TrueFalseQuestion[] = [
  { id: "tf1", statement: "הדולומיטים נמצאים בצפון איטליה.", answer: true, explanation: "נכון, הם נמצאים בצפון-מזרח איטליה." },
  { id: "tf2", statement: "בכל איטליה מדברים רק איטלקית.", answer: false, explanation: "לא נכון. באזורים מסוימים בדולומיטים מדברים גם גרמנית ולדינית." },
  { id: "tf3", statement: "במילאנו אין רכבות תחתיות.", answer: false, explanation: "לא נכון. במילאנו יש מטרו." },
];
export const triviaQuestions: TriviaQuestion[] = [
  { id: "t1", question: "באיזו מדינה נמצאים הדולומיטים?", answers: ["שוויץ","איטליה","אוסטריה","צרפת"], correctIndex: 1, explanation: "הדולומיטים נמצאים בצפון איטליה." },
  { id: "t2", question: "איזו עיר נחשבת לבירת האופנה של איטליה?", answers: ["רומא","ונציה","מילאנו","נאפולי"], correctIndex: 2, explanation: "מילאנו ידועה כבירת אופנה ועיצוב." },
];
export const songGuessItems: SongGuessItem[] = [
  { id: "s1", title: "Disney Classic", category: "דיסני", youtubeUrl: "https://www.youtube.com/results?search_query=disney+classic+song" },
  { id: "s2", title: "Israeli road trip", category: "ישראלי", youtubeUrl: "https://www.youtube.com/results?search_query=%D7%A9%D7%99%D7%A8%D7%99+%D7%93%D7%A8%D7%9A+%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%99%D7%9D" },
  { id: "s3", title: "Italian hit", category: "איטלקי", youtubeUrl: "https://www.youtube.com/results?search_query=italian+famous+song" },
];
export const charadePrompts: CharadePrompt[] = ["פרה שרוקדת בלט","נהג שלא מוצא את הרכב בחניון","מטייל שמגלה שנגמרה לו הסוללה","טבח איטלקי שמכין פיצה ענקית","מטוס שמנסה לחנות בין שתי מכוניות"].map((text, i) => ({ id: `c${i}`, text }));
