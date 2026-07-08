import MobileDashboard from "../components/dashboard/MobileDashboard";
import type { AppDeepLink } from "../data/navigationTargets";
import type { Screen } from "../types";

type HomeProps = {
  onNavigate: (screen: Screen) => void;
  onDeepLink?: (link: AppDeepLink) => void;
};

function Home({ onNavigate, onDeepLink }: HomeProps) {
  return <MobileDashboard onNavigate={onNavigate} onDeepLink={onDeepLink} />;
}

export default Home;
