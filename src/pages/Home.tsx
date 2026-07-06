import Header from "../components/layout/Header";
import MobileDashboard from "../components/dashboard/MobileDashboard";
import type { Screen } from "../types";

type HomeProps = {
  onNavigate: (screen: Screen) => void;
};

function Home({ onNavigate }: HomeProps) {
  return (
    <>
      <Header />
      <MobileDashboard onNavigate={onNavigate} />
    </>
  );
}

export default Home;
