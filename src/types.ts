export type Screen =
  | "home"
  | "itinerary"
  | "map"
  | "packing"
  | "personalPacking"
  | "shopping"
  | "games";

export type Participant = { id: string; name: string; role?: string; };
export type LinkItem = { label: string; url: string; };

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

export type PackingItem = { id: string; name: string; owner: string; packed: boolean; note?: string; };
export type ShoppingItem = { id: string; name: string; owner: string; done: boolean; quantity?: string; };

export type SharedChecklistItem = { id: string; name: string; owner: string; done: boolean; details?: string; createdAt?: number; };
export type InitialChecklistItem = { id: string; name: string; owner: string; done: boolean; details?: string; };

export type PersonalPackingItem = { id: string; name: string; packed: boolean; category: string; required: boolean; createdAt?: number; };
export type InitialPersonalPackingItem = { id: string; name: string; category: string; required: boolean; };

export type MapPoint = {
  id: string;
  label: string;
  type: "route" | "sleep" | "hike" | "food" | "parking" | "backup";
  url: string;
};

export type TriviaQuestion = {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
};
