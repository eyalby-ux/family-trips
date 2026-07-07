export type Screen =
  | "home"
  | "itinerary"
  | "map"
  | "packing"
  | "personalPacking"
  | "shopping"
  | "useful"
  | "games";

export type Participant = { id: string; name: string; role?: string };
export type LinkItem = { label: string; url: string };

export type TripDay = {
  id: string;
  date: string;
  weekday: string;
  title: string;
  driving: string;
  hiking: string;
  lodging: string;
  food: string[];
  notes?: string[];
  alternatives?: string[];
  links: LinkItem[];
};

export type PackingItem = { id: string; name: string; owner: string; packed: boolean; note?: string };
export type ShoppingItem = { id: string; name: string; owner: string; done: boolean; quantity?: string };
export type SharedChecklistItem = { id: string; name: string; owner: string; done: boolean; details?: string; createdAt?: number };
export type InitialChecklistItem = { id: string; name: string; owner: string; done: boolean; details?: string };
export type PersonalPackingItem = { id: string; name: string; packed: boolean; category: string; required: boolean; createdAt?: number };
export type InitialPersonalPackingItem = { id: string; name: string; category: string; required: boolean };
export type MapPoint = { id: string; label: string; type: "route" | "sleep" | "hike" | "food" | "parking" | "backup"; url: string };

export type TravelHubHotel = {
  id: string;
  name: string;
  area: string;
  dates: string;
  address: string;
  phone?: string;
  websiteUrl?: string;
  bookingUrl?: string;
  mapsUrl: string;
  checkIn?: string;
  checkOut?: string;
  highlight: string;
  notes?: string[];
};

export type TravelHubFlight = {
  id: string;
  title: string;
  date: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  bookingReference: string;
  airportNavigationUrl: string;
  notes?: string[];
};

export type TravelHubCar = {
  supplier: string;
  bookingNumber: string;
  confirmationNumber: string;
  mainDriver: string;
  carType: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  pickupAddress: string;
  pickupPhone: string;
  pickupMapsUrl: string;
  shuttleInstructions: string;
  dropoffDate: string;
  dropoffTime: string;
  dropoffLocation: string;
  fuelPolicy: string;
  mileage: string;
  deposit: string;
  insuranceSummary: string[];
  pickupChecklist: string[];
  dropoffChecklist: string[];
  importantReminders: string[];
};

export type TravelHubEmergencyContact = { id: string; label: string; value: string; type: "phone" | "link" | "text"; note?: string };
export type TravelHubInfoItem = { id: string; title: string; body: string };
export type LiveNotes = Record<string, string>;

export type TriviaQuestion = { id: string; question: string; answers: string[]; correctIndex: number; explanation: string };
