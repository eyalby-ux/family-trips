import type { InitialPersonalPackingItem } from "../types";

export const initialPersonalPacking: InitialPersonalPackingItem[] = [
  { id: "passport", name: "דרכון", category: "מסמכים", required: true },
  { id: "headlamp", name: "פנס ראש", category: "ציוד", required: true },
  { id: "sun-warm-hats", name: "כובע לשמש + כובע חם לערב", category: "לבוש", required: true },
  { id: "personal-medicine", name: "תרופות אישיות", category: "בריאות", required: true },
  { id: "hygiene", name: "היגיינה: מברשת שיניים, דאודורנט, סבון, שמפו", category: "היגיינה", required: true },
  { id: "sunglasses", name: "משקפי שמש", category: "בריאות", required: true },
  { id: "headphones", name: "אוזניות", category: "אלקטרוניקה", required: true },
  { id: "phone-charger", name: "מטען לפלאפון", category: "אלקטרוניקה", required: true },
  { id: "sunscreen", name: "קרם הגנה", category: "בריאות", required: true },
  { id: "earplugs", name: "אטמי אוזניים", category: "בריאות", required: true },
  { id: "lip-balm", name: "שפתון ללחות", category: "בריאות", required: true },
  { id: "microfiber-towel", name: "מגבת מיקרופייבר", category: "ציוד", required: true },
  { id: "trekking-poles", name: "מקלות הליכה", category: "ציוד", required: true },
  { id: "folding-blanket", name: "אופציונלי - שמיכה חמה מתקפלת", category: "אופציונלי", required: false },
];
