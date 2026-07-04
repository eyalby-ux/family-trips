export type Participant = {
  id: string;
  name: string;
  role?: string;
};

export type ActionCard = {
  id: string;
  title: string;
  icon: string;
  description: string;
};

export type TripDay = {
  id: string;
  date: string;
  title: string;
  driving: string;
  hiking: string;
  lodging: string;
  food: string[];
  links: { label: string; url: string }[];
};