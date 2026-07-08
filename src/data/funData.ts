import type {
  CharadePrompt,
  DailyPhotoChallenge,
  RoadBingoItem,
  SongGuessItem,
  TrueFalseQuestion,
  TriviaQuestion,
} from "../types";

export const dailyPhotoChallenges: DailyPhotoChallenge[] = [
  { dayId: "day-1", title: "יום הטיסה", items: ["מזוודה הכי צבעונית", "מטוס של אל על", "סלפי ראשון בטיול"] },
  { dayId: "day-2", title: "איסוף רכב והרים", items: ["שלט באיטלקית", "מנהרה", "פסגה מושלגת"] },
  { dayId: "day-3", title: "דולומיטים", items: ["פרה עם פעמון", "רכבל", "פרח מיוחד"] },
];

export const roadBingoItems: RoadBingoItem[] = [
  { id: "cow", label: "פרה" },
  { id: "tunnel", label: "מנהרה" },
  { id: "lake", label: "אגם" },
  { id: "motorcycle", label: "אופנוע" },
  { id: "cable-car", label: "רכבל" },
  { id: "waterfall", label: "מפל" },
  { id: "tractor", label: "טרקטור" },
  { id: "red-car", label: "רכב אדום" },
];

export const trueFalseQuestions: TrueFalseQuestion[] = [
  { id: "tf1", statement: "הדולומיטים נמצאים בצפון איטליה.", answer: true, explanation: "נכון, הם נמצאים בצפון-מזרח איטליה." },
  { id: "tf2", statement: "באזור הדולומיטים מדברים לפעמים גם גרמנית.", answer: true, explanation: "נכון. בחלקים מדרום טירול מדברים גם גרמנית." },
  { id: "tf3", statement: "מילאנו היא עיר הבירה של איטליה.", answer: false, explanation: "לא נכון. עיר הבירה היא רומא." },
];

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: "trivia1",
    question: "באיזו מדינה נמצאים הדולומיטים?",
    answers: ["שוויץ", "איטליה", "אוסטריה", "צרפת"],
    correctIndex: 1,
    explanation: "הדולומיטים נמצאים בצפון איטליה.",
  },
  {
    id: "trivia2",
    question: "איזו עיר נחשבת לבירת האופנה של איטליה?",
    answers: ["רומא", "ונציה", "מילאנו", "נאפולי"],
    correctIndex: 2,
    explanation: "מילאנו ידועה כבירת אופנה ועיצוב.",
  },
];

export const songGuessItems: SongGuessItem[] = [
  { id: "disney-let-it-go", title: "Let It Go", category: "דיסני", youtubeUrl: "https://www.youtube.com/watch?v=L0MK7qz13bU" },
  { id: "disney-hakuna", title: "Hakuna Matata", category: "דיסני", youtubeUrl: "https://www.youtube.com/watch?v=nbY_aP-alkw" },
  { id: "disney-under-sea", title: "Under the Sea", category: "דיסני", youtubeUrl: "https://www.youtube.com/watch?v=GC_mV1IpjWA" },
  { id: "disney-friend-in-me", title: "You've Got a Friend in Me", category: "דיסני", youtubeUrl: "https://www.youtube.com/watch?v=0hG-2tQtdlE" },
  { id: "italian-volare", title: "Nel blu dipinto di blu (Volare)", category: "איטלקי", youtubeUrl: "https://www.youtube.com/watch?v=t4IjJav7xbg" },
  { id: "classic-here-comes", title: "Here Comes The Sun", category: "קלאסי", youtubeUrl: "https://www.youtube.com/watch?v=KQetemT1sWc" },
  { id: "road-wake-me-up", title: "Wake Me Up", category: "דרך", youtubeUrl: "https://www.youtube.com/watch?v=IcrbM1l_BoI" },
];

export const charadePrompts: CharadePrompt[] = [
  { id: "ch1", text: "GPS שמנסה לבטא שם איטלקי" },
  { id: "ch2", text: "נהג שמחפש חניה במילאנו" },
  { id: "ch3", text: "מישהו שטועם אספרסו בפעם הראשונה" },
  { id: "ch4", text: "ילד שמנסה לא להירדם ברכב" },
  { id: "ch5", text: "אבא מחפש את המשקפיים כשהם על הראש" },
  { id: "ch6", text: "מישהו מנסה להצטלם סלפי ברוח" },
  { id: "ch7", text: "פרה שחוסמת את הכביש" },
  { id: "ch8", text: "נוסע שמנסה לחבר Bluetooth ברכב" },
  { id: "ch9", text: "ילד שמגלה שיש עוד שעה נסיעה" },
  { id: "ch10", text: "מישהו שמנסה להסביר באיטלקית איפה השירותים" },
];
