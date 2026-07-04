import type { ActionCard, Participant, TripDay } from "../types";

export const participants: Participant[] = [
  { id: "eyal", name: "אייל", role: "מנהל הטיול" },
  { id: "daniel", name: "דניאל" },
  { id: "guy", name: "גיא", role: "41" },
  { id: "neta", name: "נטע", role: "37" },
  { id: "gal", name: "גל", role: "27" },
  { id: "omri", name: "עומרי" },
];

export const actionCards: ActionCard[] = [
  { id: "itinerary", title: "מסלול", icon: "📅", description: "ימים, נסיעות, טיולים ולינות" },
  { id: "packing", title: "ציוד", icon: "🎒", description: "מי מביא מה ומה כבר נארז" },
  { id: "shopping", title: "קניות", icon: "🛒", description: "סופר, פק״ל, מים וחטיפים" },
  { id: "games", title: "משחקים", icon: "🎮", description: "טריוויה ואתגרי דרך" },
  { id: "expenses", title: "הוצאות", icon: "💶", description: "מעקב תשלומים וחלוקה" },
  { id: "documents", title: "מסמכים", icon: "📄", description: "הזמנות, ביטוח וקישורים חשובים" },
];

export const tripDays: TripDay[] = [
  {
    id: "day-1",
    date: "12.07",
    title: "יום 1 — הגעה והתמקמות",
    driving: "הגעה לאזור הלינה הראשון. ללא השכרת רכב ביום זה.",
    hiking: "יום קל: התארגנות, סיבוב קצר באזור, מנוחה.",
    lodging: "לינה ראשונה לפי המסלול.",
    food: ["ארוחה קלה ליד הלינה", "בדיקת סופר קרוב", "קפה/גלידה בערב"],
    links: [
      { label: "Google Maps — חיפוש המלון", url: "https://www.google.com/maps/search/hotel+dolomites" },
      { label: "Waze — ניווט כללי", url: "https://waze.com/ul" },
    ],
  },
  {
    id: "day-2",
    date: "13.07",
    title: "יום 2 — איסוף רכב ותחילת המסלול",
    driving: "איסוף הרכב בתחילת היום, בדיקת שריטות, צילום הרכב ויציאה למסלול.",
    hiking: "טיול ראשון קל/בינוני לפי מזג האוויר.",
    lodging: "לינה לפי המסלול.",
    food: ["סופר ראשון להצטיידות", "מסעדה מקומית", "הכנת פק״ל קפה"],
    links: [
      { label: "Google Maps — השכרת רכב", url: "https://www.google.com/maps/search/car+rental+dolomites" },
      { label: "Google Maps — סופר באזור", url: "https://www.google.com/maps/search/supermarket+near+dolomites" },
    ],
  },
  {
    id: "day-3",
    date: "14.07",
    title: "יום 3 — יום הרים ואגמים",
    driving: "נסיעה לנקודת התחלה, חניה ויציאה למסלול.",
    hiking: "מסלול טבע מרכזי עם עצירות צילום.",
    lodging: "לינה לפי המסלול.",
    food: ["מסעדה ליד האגם/הרכבל", "פיקניק", "ארוחת ערב באזור הלינה"],
    links: [
      { label: "Google Maps — Lago di Braies", url: "https://www.google.com/maps/search/Lago+di+Braies" },
      { label: "Google Maps — Tre Cime", url: "https://www.google.com/maps/search/Tre+Cime+di+Lavaredo" },
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
      { label: "Google Maps — Seceda", url: "https://www.google.com/maps/search/Seceda" },
      { label: "Google Maps — Ortisei", url: "https://www.google.com/maps/search/Ortisei" },
    ],
  },
  {
    id: "day-5",
    date: "16.07",
    title: "יום 5 — יום גמיש לפי מזג אוויר",
    driving: "תכנון נסיעה לפי תחזית ועומסים.",
    hiking: "מסלול חלופי / יום קל / עיירות.",
    lodging: "לינה לפי המסלול.",
    food: ["מסעדה בעיירה", "סופר להשלמות", "גלידה"],
    links: [
      { label: "Google Maps — Cortina d'Ampezzo", url: "https://www.google.com/maps/search/Cortina+d'Ampezzo" },
    ],
  },
  {
    id: "day-6",
    date: "17.07",
    title: "יום 6 — יום טיול מרכזי",
    driving: "נסיעה מוקדמת לנקודת התחלה.",
    hiking: "מסלול משמעותי יותר, בהתאם לכושר ולמזג האוויר.",
    lodging: "לינה לפי המסלול.",
    food: ["פיקניק", "מסעדה מומלצת", "קפה בסיום"],
    links: [
      { label: "Google Maps — Dolomites hikes", url: "https://www.google.com/maps/search/dolomites+hikes" },
    ],
  },
  {
    id: "day-7",
    date: "18.07",
    title: "יום 7 — סיכום ואטרקציות אחרונות",
    driving: "נסיעות קצרות והשלמות.",
    hiking: "מסלול קצר / תצפית / עיירה.",
    lodging: "לינה אחרונה.",
    food: ["ארוחת סיום", "קניות אחרונות", "קינוח"],
    links: [
      { label: "Google Maps — restaurants Dolomites", url: "https://www.google.com/maps/search/restaurants+dolomites" },
    ],
  },
  {
    id: "day-8",
    date: "19.07",
    title: "יום 8 — חזרה",
    driving: "התארגנות, החזרת רכב ונסיעה לשדה/יעד הבא.",
    hiking: "אין מסלול משמעותי, רק עצירה קצרה אם יש זמן.",
    lodging: "סיום הטיול.",
    food: ["קפה בדרך", "אוכל לשדה/נסיעה", "בדיקת סופר אם צריך"],
    links: [
      { label: "Google Maps — airport", url: "https://www.google.com/maps/search/airport+near+dolomites" },
    ],
  },
];