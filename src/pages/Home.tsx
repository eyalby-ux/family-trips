import Header from "../components/layout/Header";
import MobileDashboard from "../components/dashboard/MobileDashboard";
import DayCarousel from "../components/trip/DayCarousel";
import type { Screen } from "../types";

type HomeProps = {
  onNavigate: (screen: Screen) => void;
};

function Home({ onNavigate }: HomeProps) {
  return (
    <>
      <Header />
      <MobileDashboard onNavigate={onNavigate} />
      <DayCarousel onOpenItinerary={onNavigate} />
    </>
  );
}

export default Home;
