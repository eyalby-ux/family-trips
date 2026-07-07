import type { TravelHubCar, TravelHubEmergencyContact, TravelHubFlight, TravelHubHotel, TravelHubInfoItem } from "../types";

export const tripTravelers = ["אייל", "דניאל", "גיא", "נטע", "עומרי", "גל"];

export const travelHubHotels: TravelHubHotel[] = [
  { id: "la-nuova-rotaia", name: "Hotel La Nuova Rotaia", area: "Gallarate", dates: "12.7", address: "Via Cesare Beccaria 6, 21013 Gallarate VA, Italy", phone: "+39 0331 796180", websiteUrl: "https://lanuovarotaia.it/", bookingUrl: "https://www.booking.com/Share-iMuNtaq", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hotel+La+Nuova+Rotaia+Via+Cesare+Beccaria+6+Gallarate", checkIn: "לעדכן לפי ההזמנה", checkOut: "לעדכן לפי ההזמנה", highlight: "מלון ללילה הראשון, קרוב למלפנסה ולתחנת הרכבת.", notes: ["מתאים לעצירה רגועה לאחר הנחיתה."] },
  { id: "rifugio-fedaia", name: "Rifugio Fedaia", area: "Marmolada / Lago di Fedaia", dates: "13.7–14.7", address: "Lago di Fedaia, Dolomites, Italy", websiteUrl: "https://www.rifugiofedaia.com/", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rifugio+Fedaia", checkIn: "לעדכן", checkOut: "לעדכן", highlight: "שני לילות באזור פדאיה ומרמולדה.", notes: ["לוודא זמני ארוחת ערב והגעה."] },
  { id: "laguscei", name: "Laguscei Dolomites Mountain Hotel", area: "Passo Campolongo / Arabba", dates: "15.7", address: "Passo Campolongo 22, 32020 Arabba BL, Italy", phone: "+39 0436 79353", websiteUrl: "https://www.laguscei.com/it/", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Laguscei+Dolomites+Mountain+Hotel", checkIn: "לעדכן", checkOut: "לעדכן", highlight: "לילה במלון הררי באזור Arabba.", notes: ["טלפון קבלה: +39 0436 79353."] },
  { id: "pisciadu", name: "Rifugio Pisciadù", area: "Alta Badia / Gruppo di Sella", dates: "16.7", address: "Boscdaplan 66, 39036 La Villa BZ, Italy", phone: "+39 0471 836292", websiteUrl: "https://www.rifugiopisciadu.it/it/impressum-rifugio-franco-cavazza-al-pisciadu-nel-gruppo-di-sella.html", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rifugio+Pisciadu", checkIn: "לעדכן", checkOut: "לעדכן", highlight: "לילה בבקתה באזור Pisciadù.", notes: ["לבדוק מזג אוויר ותנאי הגעה לפני העלייה."] },
  { id: "milan-airbnb", name: "Airbnb Milan", area: "Milan", dates: "17.7–18.7", address: "Milan, Italy", websiteUrl: "https://www.airbnb.com/l/J1ecHwLd", bookingUrl: "https://www.airbnb.com/l/J1ecHwLd", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Milan+Italy", checkIn: "לעדכן לאחר קבלת הוראות הצ׳ק-אין", checkOut: "לעדכן", highlight: "דירה לשני הלילות האחרונים במילאנו.", notes: ["לעדכן כתובת מדויקת, קוד כניסה, Wi‑Fi והוראות הגעה לאחר שהפרטים זמינים."] },
];

export const travelHubFlights: TravelHubFlight[] = [
  { id: "outbound-flight", title: "הלוך", date: "12.7.2026", airline: "EL AL", flightNumber: "LY387", from: "TLV", to: "MXP", departureTime: "18:35", arrivalTime: "21:45", bookingReference: "CY4SYP", airportNavigationUrl: "https://www.google.com/maps/search/?api=1&query=Ben+Gurion+Airport+Terminal+3", notes: ["הטיסה עודכנה ל-18:35."] },
  { id: "return-flight", title: "חזור", date: "19.7.2026", airline: "EL AL", flightNumber: "LY382", from: "MXP", to: "TLV", departureTime: "11:55", arrivalTime: "16:40", bookingReference: "CY4SYP", airportNavigationUrl: "https://www.google.com/maps/search/?api=1&query=Milan+Malpensa+Airport", notes: ["להחזיר את הרכב לפני הטיסה."] },
];

export const travelHubCar: TravelHubCar = {
  supplier: "Differental", bookingNumber: "D014289678", confirmationNumber: "Z7DUG-JTY1Z", mainDriver: "Guy Ben Yitzchak", carType: "Citroën SpaceTourer or similar · 9 seats · Automatic · A/C", pickupDate: "13.7.2026", pickupTime: "08:00", pickupLocation: "Milan Airport Malpensa (MXP)", pickupAddress: "Via Giuseppe Giusti 68, 21019 Somma Lombardo VA, Italy", pickupPhone: "+39 02 66665556", pickupMapsUrl: "https://www.google.com/maps/search/?api=1&query=Via+Giuseppe+Giusti+68+Somma+Lombardo", shuttleInstructions: "להתקשר בהגעה. נקודות מפגש: Terminal 1 Arrivals Exit 5 או Terminal 2 Exit 5. שאטל Differental למשרד, כ-7 דקות.", dropoffDate: "19.7.2026", dropoffTime: "08:00", dropoffLocation: "Milan Airport Malpensa (MXP)", fuelPolicy: "Same to Same", mileage: "Unlimited mileage", deposit: "€1800", insuranceSummary: ["Full Coverage limit 3500 USD", "Collision Damage Waiver", "Theft Protection", "Third Party Liability"], pickupChecklist: ["להביא שובר השכרה", "רישיון נהיגה פיזי", "דרכון / תעודת זהות", "כרטיס אשראי פיזי על שם הנהג הראשי", "לצלם את הרכב מכל הכיוונים", "לצלם מד דלק וקילומטראז׳", "לבדוק שריטות ונזקים לפני יציאה"], dropoffChecklist: ["לוודא שלא נשאר ציוד ברכב", "לצלם את הרכב לפני החזרה", "לשמור קבלה / אישור החזרה", "לוודא מצב דלק לפי Same to Same", "לברר מתי משתחרר הפיקדון"], importantReminders: ["הרכב נשמר עד 60 דקות משעת האיסוף כל עוד זה בתוך שעות הפעילות.", "כרטיס אשראי חייב להיות פיזי ולא דיגיטלי.", "כרטיס חיוב / Debit לא מתקבל לפיקדון."]
};

export const emergencyContacts: TravelHubEmergencyContact[] = [
  { id: "eu-emergency", label: "חירום באירופה", value: "112", type: "phone", note: "מוקד חירום כללי." },
  { id: "insurance", label: "ביטוח נסיעות", value: "לעדכן", type: "text", note: "לעדכן טלפון, מספר פוליסה וקישור." },
  { id: "family-contact", label: "איש קשר בארץ", value: "לעדכן", type: "text", note: "איש קשר למקרה חירום." },
];

export const usefulInfoItems: TravelHubInfoItem[] = [
  { id: "tolls", title: "כבישי אגרה", body: "באיטליה יש כבישי אגרה. כדאי לשמור קבלה ולוודא מסלול לפני נסיעות ארוכות." },
  { id: "parking", title: "חניה", body: "במלונות הרריים כדאי לבדוק מראש אם החניה במקום או במרחק הליכה." },
  { id: "fuel", title: "דלק", body: "לפני החזרת הרכב לבדוק מדיניות Same to Same ולצלם את מד הדלק." },
  { id: "pharmacy", title: "בתי מרקחת", body: "חיפוש מהיר: Farmacia near me." },
];
