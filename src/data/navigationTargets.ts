export type TravelHubDeepLink =
  | { section: "home" }
  | { section: "flights"; entityId?: "outbound-flight" | "return-flight" }
  | { section: "hotels"; entityId?: string }
  | { section: "car"; entityId?: "car-rental" };

export type AppDeepLink = {
  screen: "useful" | "preparations" | "itinerary";
  travelHub?: TravelHubDeepLink;
};
