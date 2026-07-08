import { useState } from "react";
import BottomNav from "./components/layout/BottomNav";
import Games from "./pages/Games";
import Home from "./pages/Home";
import Itinerary from "./pages/Itinerary";
import Packing from "./pages/Packing";
import PersonalPacking from "./pages/PersonalPacking";
import Preparations from "./pages/Preparations";
import Shopping from "./pages/Shopping";
import TravelHub from "./pages/TravelHub";
import type { AppDeepLink, TravelHubDeepLink } from "./data/navigationTargets";
import type { Screen } from "./types";
import "./styles/global.css";
import "./styles/firebase-packing-additions.css";
import "./styles/itinerary-additions.css";
import "./styles/editable-checklist-additions.css";
import "./styles/personal-packing-additions.css";
import "./styles/day-carousel-additions.css";
import "./styles/trip-map-additions.css";
import "./styles/mobile-ux-additions.css";
import "./styles/travel-hub-additions.css";
import "./styles/preparations-additions.css";
import "./styles/games-additions.css";

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [travelHubTarget, setTravelHubTarget] = useState<TravelHubDeepLink>({ section: "home" });
  const [forceHomeToken, setForceHomeToken] = useState(0);

  function handleNavChange(nextScreen: Screen) {
    if (nextScreen === "useful") {
      setTravelHubTarget({ section: "home" });
      setForceHomeToken((current) => current + 1);
    }
    setActiveScreen(nextScreen);
  }

  function handleDeepLink(link: AppDeepLink) {
    if (link.screen === "useful") {
      setTravelHubTarget(link.travelHub ?? { section: "home" });
      setForceHomeToken((current) => current + 1);
    }
    setActiveScreen(link.screen);
  }

  return (
    <main className="app" dir="rtl">
      {activeScreen === "home" && <Home onNavigate={handleNavChange} onDeepLink={handleDeepLink} />}
      {(activeScreen === "itinerary" || activeScreen === "map") && <Itinerary />}
      {activeScreen === "packing" && <Packing />}
      {activeScreen === "personalPacking" && <PersonalPacking />}
      {activeScreen === "shopping" && <Shopping />}
      {activeScreen === "preparations" && <Preparations />}
      {activeScreen === "useful" && (
        <TravelHub initialTarget={travelHubTarget} forceHomeToken={forceHomeToken} />
      )}
      {activeScreen === "games" && <Games />}
      <BottomNav activeScreen={activeScreen} onChange={handleNavChange} />
    </main>
  );
}

export default App;
