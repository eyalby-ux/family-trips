import type { Screen } from "../../types";

type BottomNavProps = {
  activeScreen: Screen;
  onChange: (screen: Screen) => void;
};

const navItems: { id: Screen; label: string; icon: string }[] = [
  { id: "home", label: "בית", icon: "🏠" },
  { id: "itinerary", label: "מסלול", icon: "📅" },
  { id: "packing", label: "קבוצתי", icon: "🎒" },
  { id: "personalPacking", label: "אישי", icon: "👤" },
  { id: "shopping", label: "קניות", icon: "🛒" },
  { id: "games", label: "משחקים", icon: "🎮" },
];

function BottomNav({ activeScreen, onChange }: BottomNavProps) {
  return (
    <nav className="bottomNav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={activeScreen === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
        >
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
