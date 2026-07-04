import type { Participant, PackingItem, ShoppingItem, TriviaQuestion, TripDay } from "../types";

export const participants: Participant[] = [
  { id: "eyal", name: "אייל", role: "מנהל הטיול" },
  { id: "daniel", name: "דניאל" },
  { id: "guy", name: "גיא", role: "41" },
  { id: "neta", name: "נטע", role: "37" },
  { id: "gal", name: "גל", role: "27" },
  { id: "omri", name: "עומרי" },
];

export const tripDays: TripDay[] = [
  {
    id: "day-1",
    date: "12.07",
    title: "יום 1 — הגעה והתמקמות",
    driving: "הגעה לאזור הלינה הראשון. ללא השכרת רכב ביום זה.",
    hiking: "התארגנות, סיבוב קצר באזור ומנוחה.",
    lodging: "לינה ראשונה לפי המסלול.",
    food: ["ארוחה קלה ליד הלינה", "בדיקת סופר קרוב", "קפה/גלידה בערב"],
    links: [
      { label: "Google Maps — מלונות בדולומיטים", url: "https://www.google.com/maps/search/hotel+dolomites" },
      { label: "Waze", url: "https://waze.com/ul" },
    ],
  },
  {
    id: "day-2",
    date: "13.07",
    title: "יום 2 — איסוף רכב ותחילת המסלול",
    driving: "איסוף הרכב בתחילת היום. לצלם את הרכב, לבדוק שריטות ודלק, ולצאת למסלול.",
    hiking: "טיול ראשון קל/בינוני לפי מזג האוויר.",
    lodging: "לינה לפי המסלול.",
    food: ["סופר ראשון להצטיידות", "מסעדה מקומית", "הכנת פק״ל קפה"],
    links: [
      { label: "Google Maps — השכרת רכב", url: "https://www.google.com/maps/search/car+rental+dolomites" },
      { label: "Google Maps — סופר", url: "https://www.google.com/maps/search/supermarket+near+dolomites" },
    ],
  },
  {
    id: "day-3",
    date: "14.07",
    title: "יום 3 — הרים ואגמים",
    driving: "נסיעה לנקודת התחלה, חניה ויציאה למסלול.",
    hiking: "מסלול טבע מרכזי עם עצירות צילום.",
    lodging: "לינה לפי המסלול.",
    food: ["מסעדה ליד האגם/הרכבל", "פיקניק", "ארוחת ערב באזור הלינה"],
    links: [
      { label: "Lago di Braies", url: "https://www.google.com/maps/search/Lago+di+Braies" },
      { label: "Tre Cime", url: "https://www.google.com/maps/search/Tre+Cime+di+Lavaredo" },
    ],
  },
  {
    id: "day-4",
    date: "15.07",
    title: "יום 4 — רכבלים ותצפיות",
    driving: "נסיעה לרכבל/חניה מרכזית.",
    hiking: "תצפית גבוהה ומסלול קצר עד בינוני.",
    lodging: "לינה לפי המסלול.",
    food: ["מסעדת הרים", "קפה בדרך", "ארוחת ערב"],
    links: [
      { label: "Seceda", url: "https://www.google.com/maps/search/Seceda" },
      { label: "Ortisei", url: "https://www.google.com/maps/search/Ortisei" },
    ],
  },
  {
    id: "day-5",
    date: "16.07",
    title: "יום 5 — יום גמיש לפי מזג אוויר",
    driving: "תכנון נסיעה לפי תחזית, עומסים וזמינות רכבלים.",
    hiking: "מסלול חלופי / יום קל / עיירות.",
    lodging: "לינה לפי המסלול.",
    food: ["מסעדה בעיירה", "סופר להשלמות", "גלידה"],
    links: [{ label: "Cortina d'Ampezzo", url: "https://www.google.com/maps/search/Cortina+d'Ampezzo" }],
  },
  {
    id: "day-6",
    date: "17.07",
    title: "יום 6 — יום טיול מרכזי",
    driving: "נסיעה מוקדמת לנקודת התחלה.",
    hiking: "מסלול משמעותי יותר, בהתאם לכושר ולמזג האוויר.",
    lodging: "לינה לפי המסלול.",
    food: ["פיקניק", "מסעדה מומלצת", "קפה בסיום"],
    links: [{ label: "Dolomites hikes", url: "https://www.google.com/maps/search/dolomites+hikes" }],
  },
  {
    id: "day-7",
    date: "18.07",
    title: "יום 7 — סיכום ואטרקציות אחרונות",
    driving: "נסיעות קצרות והשלמות.",
    hiking: "מסלול קצר / תצפית / עיירה.",
    lodging: "לינה אחרונה.",
    food: ["ארוחת סיום", "קניות אחרונות", "קינוח"],
    links: [{ label: "Restaurants Dolomites", url: "https://www.google.com/maps/search/restaurants+dolomites" }],
  },
  {
    id: "day-8",
    date: "19.07",
    title: "יום 8 — חזרה",
    driving: "התארגנות, החזרת רכב ונסיעה לשדה/יעד הבא.",
    hiking: "אין מסלול משמעותי, רק עצירה קצרה אם יש זמן.",
    lodging: "סיום הטיול.",
    food: ["קפה בדרך", "אוכל לנסיעה", "בדיקת ציוד לפני החזרה"],
    links: [{ label: "Airport near Dolomites", url: "https://www.google.com/maps/search/airport+near+dolomites" }],
  },
];

export const initialPacking: PackingItem[] = [
  { id: "first-aid", name: "ערכת עזרה ראשונה", owner: "גיא", packed: false },
  { id: "coffee-kit", name: "פק״ל קפה", owner: "אייל", packed: false },
  { id: "power-bank", name: "מטענים ניידים", owner: "גל", packed: false },
  { id: "cards", name: "קלפים / משחקי דרך", owner: "דניאל", packed: false },
  { id: "rain", name: "מעילי גשם", owner: "כל אחד", packed: false },
  { id: "hiking", name: "נעלי הליכה", owner: "כל אחד", packed: false },
];

export const initialShopping: ShoppingItem[] = [
  { id: "water", name: "מים", quantity: "12 בקבוקים", owner: "נטע", done: false },
  { id: "snacks", name: "חטיפים לנסיעות", quantity: "כמה סוגים", owner: "גל", done: false },
  { id: "bread", name: "לחם / לחמניות", quantity: "לפיקניק", owner: "אייל", done: false },
  { id: "fruit", name: "פירות", quantity: "לכולם", owner: "עומרי", done: false },
  { id: "coffee", name: "קפה וחלב", quantity: "לפק״ל", owner: "גיא", done: false },
];

export const trivia: TriviaQuestion[] = [
  {
    id: "q1",
    question: "באיזו מדינה נמצאים הדולומיטים?",
    answers: ["שוויץ", "איטליה", "אוסטריה", "סלובניה"],
    correctIndex: 1,
    explanation: "הדולומיטים נמצאים בצפון איטליה, באזור הרי האלפים.",
  },
  {
    id: "q2",
    question: "מה כדאי לבדוק לפני יציאה למסלול הררי?",
    answers: ["רק איפה המסעדה", "תחזית מזג אוויר וזמינות רכבלים", "צבע האוטו", "כמה תמונות נצלם"],
    correctIndex: 1,
    explanation: "בהרים מזג האוויר משתנה מהר, ורכבלים/מסלולים עשויים להיסגר.",
  },
  {
    id: "q3",
    question: "מה כדאי לצלם בעת קבלת רכב שכור?",
    answers: ["רק את לוחית הרישוי", "שריטות, מצב כללי ומד דלק", "רק את ההגה", "אין צורך לצלם"],
    correctIndex: 1,
    explanation: "צילום מצב הרכב לפני היציאה עוזר למנוע ויכוחים בהחזרה.",
  },
];