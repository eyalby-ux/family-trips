import type { PreparationParticipant, PreparationTaskDefinition } from "../types";
export const preparationParticipants: PreparationParticipant[] = [
  { id: "eyal", name: "אייל" }, { id: "daniel", name: "דניאל" }, { id: "guy", name: "גיא" },
  { id: "neta", name: "נטע" }, { id: "omri", name: "עומרי" }, { id: "gal", name: "גל" },
];
export const preparationTasks: PreparationTaskDefinition[] = [
  { id: "travel-insurance", title: "ביטוח נסיעות", icon: "🩺", mode: "perParticipant", description: "לוודא שלכל משתתף יש ביטוח נסיעות תקף.", fields: [ { key: "provider", label: "חברת ביטוח", placeholder: "לדוגמה: הראל / פספורטכארד" }, { key: "policy", label: "מספר פוליסה", placeholder: "מספר פוליסה / קישור" }, { key: "phone", label: "טלפון חירום", placeholder: "מספר חירום" } ] },
  { id: "esim", title: "eSIM / חבילת גלישה", icon: "📱", mode: "perParticipant", description: "לוודא למי צריך חבילת גלישה או eSIM.", fields: [ { key: "provider", label: "ספק", placeholder: "לדוגמה: Airalo" }, { key: "notes", label: "הערות", placeholder: "למי הופעל ובאיזה מכשיר" } ] },
  { id: "airport-transfer", title: "הגעה לשדה", icon: "🚖", mode: "group", description: "איך מגיעים לנתב״ג ביום הטיסה.", fields: [ { key: "method", label: "אמצעי הגעה", placeholder: "רכב פרטי / מונית / רכבת" }, { key: "parking", label: "חניה", placeholder: "חניון, קומה, שורה" }, { key: "notes", label: "הערות", placeholder: "שעת יציאה, מי אוסף..." } ] },
];
