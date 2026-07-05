import type { MapPoint } from "../types";

export const mapPointsByDay: Record<string, MapPoint[]> = {
  "day-1": [
    { id: "gallarate", label: "גלרטה — אזור לינה", type: "sleep", url: "https://www.google.com/maps/search/Gallarate" },
    { id: "braies-backup", label: "Braies lake — חלופה", type: "backup", url: "https://www.google.com/maps/search/Braies+lake" }
  ],
  "day-2": [
    { id: "car-rental", label: "השכרת רכב", type: "route", url: "https://www.google.com/maps/search/car+rental+dolomites" },
    { id: "seceda", label: "Seceda", type: "hike", url: "https://www.google.com/maps/search/Seceda" },
    { id: "ortisei", label: "רכבל Seceda / Ortisei", type: "parking", url: "https://www.google.com/maps/search/Seceda+cable+car+Ortisei" },
    { id: "fedaia", label: "Rifugio Fedaia", type: "sleep", url: "https://www.google.com/maps/search/Rifugio+Fedaia" },
    { id: "tre-cime", label: "Tre Cime — חלופה", type: "backup", url: "https://www.google.com/maps/search/Tre+Cime+di+Lavaredo" }
  ],
  "day-3": [
    { id: "trincee", label: "Via Ferrata delle Trincee", type: "hike", url: "https://www.google.com/maps/search/Via+Ferrata+delle+Trincee" },
    { id: "fedaia-2", label: "Rifugio Fedaia", type: "sleep", url: "https://www.google.com/maps/search/Rifugio+Fedaia" },
    { id: "sorapis", label: "Lago di Sorapis — חלופה", type: "backup", url: "https://www.google.com/maps/search/Lago+di+Sorapis" }
  ],
  "day-4": [
    { id: "passo-pordoi", label: "Passo Pordoi", type: "parking", url: "https://www.google.com/maps/search/Passo+Pordoi" },
    { id: "sass-pordoi", label: "Sass Pordoi", type: "hike", url: "https://www.google.com/maps/search/Sass+Pordoi" },
    { id: "piz-boe", label: "Piz Boè", type: "hike", url: "https://www.google.com/maps/search/Piz+Bo%C3%A8" },
    { id: "laguscei", label: "Laguscei Dolomites Mountain Hotel", type: "sleep", url: "https://www.google.com/maps/search/Laguscei+Dolomites+Mountain+Hotel" },
    { id: "canazei-rent", label: "Canazei Bike Rent", type: "backup", url: "https://www.canazeibikerent.com/en/rent-cube-bikes" }
  ],
  "day-5": [
    { id: "passo-gardena", label: "Passo Gardena", type: "parking", url: "https://www.google.com/maps/search/Passo+Gardena" },
    { id: "pisciadu", label: "Pisciadù Hütte", type: "sleep", url: "https://www.google.com/maps/search/Pisciad%C3%B9+H%C3%BCtte" },
    { id: "sport-bruno", label: "Sport Bruno — השכרת ציוד", type: "backup", url: "https://www.sportbruno.com/en/rental-summer.asp" }
  ],
  "day-6": [
    { id: "passo-gardena-return", label: "Passo Gardena", type: "hike", url: "https://www.google.com/maps/search/Passo+Gardena" },
    { id: "milan", label: "מילאנו", type: "sleep", url: "https://www.google.com/maps/search/Milan" },
    { id: "airbnb-milan", label: "Airbnb Milan", type: "sleep", url: "https://www.airbnb.com/l/gzfgJ0xL?s=67&unique_share_id=85fdc80e-4978-4266-947c-e962b8e29ad5" }
  ],
  "day-7": [
    { id: "milan-center", label: "מרכז מילאנו", type: "route", url: "https://www.google.com/maps/search/Milan+city+center" },
    { id: "duomo", label: "Duomo di Milano", type: "hike", url: "https://www.google.com/maps/search/Duomo+di+Milano" },
    { id: "milan-restaurants", label: "מסעדות במילאנו", type: "food", url: "https://www.google.com/maps/search/restaurants+Milan" },
    { id: "airbnb-milan-2", label: "Airbnb Milan", type: "sleep", url: "https://www.airbnb.com/l/gzfgJ0xL?s=67&unique_share_id=85fdc80e-4978-4266-947c-e962b8e29ad5" }
  ],
  "day-8": [
    { id: "milan-airport", label: "שדה תעופה מילאנו", type: "route", url: "https://www.google.com/maps/search/Milan+airport" }
  ]
};

export function getMapPointIcon(type: MapPoint["type"]) {
  switch (type) {
    case "route": return "🧭";
    case "sleep": return "🏨";
    case "hike": return "🥾";
    case "food": return "🍝";
    case "parking": return "🅿️";
    case "backup": return "🔁";
    default: return "📍";
  }
}
