import { useState } from "react";
import BottomNav from "./components/layout/BottomNav";
import Games from "./pages/Games";
import Home from "./pages/Home";
import Itinerary from "./pages/Itinerary";
import Packing from "./pages/Packing";
import PersonalPacking from "./pages/PersonalPacking";
import Shopping from "./pages/Shopping";
import TripMap from "./pages/TripMap";
import type { Screen } from "./types";
import "./styles/global.css";
import "./styles/firebase-packing-additions.css";
import "./styles/itinerary-additions.css";
import "./styles/editable-checklist-additions.css";
import "./styles/personal-packing-additions.css";
import "./styles/day-carousel-additions.css";
import "./styles/trip-map-additions.css";
import "./styles/mobile-ux-additions.css";

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  return (
    <main className="app" dir="rtl">
      {activeScreen === "home" && <Home onNavigate={setActiveScreen} />}
      {activeScreen === "itinerary" && <Itinerary />}
      {activeScreen === "map" && <TripMap />}
      {activeScreen === "packing" && <Packing />}
      {activeScreen === "personalPacking" && <PersonalPacking />}
      {activeScreen === "shopping" && <Shopping />}
      {activeScreen === "games" && <Games />}
      <BottomNav activeScreen={activeScreen} onChange={setActiveScreen} />
    </main>
  );
}

export default App;
