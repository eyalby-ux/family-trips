import Header from "../components/layout/Header";
import DayCarousel from "../components/trip/DayCarousel";
import type { Screen } from "../types";

type HomeProps = { onNavigate: (screen: Screen) => void; };

function Home({ onNavigate }: HomeProps) {
  return (
    <>
      <Header />
      <DayCarousel onOpenItinerary={onNavigate} />
    </>
  );
}

export default Home;