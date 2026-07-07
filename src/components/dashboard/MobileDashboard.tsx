import { useEffect, useMemo, useState } from "react";
import { listenToChecklistItems } from "../../services/checklistService";
import { tripDays } from "../../data/tripData";
import type { Screen, SharedChecklistItem } from "../../types";

type MobileDashboardProps = {
  onNavigate: (screen: Screen) => void;
};

const tripStartDate = new Date("2026-07-12T00:00:00");
const tripEndDate = new Date("2026-07-19T23:59:59");

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(from: Date, to: Date) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / oneDay);
}

function getTripPhase() {
  const today = new Date();
  if (today < tripStartDate) return "before";
  if (today > tripEndDate) return "after";
  return "during";
}

function getCurrentTripDayIndex() {
  const today = new Date();
  const diff = Math.floor((startOfDay(today).getTime() - startOfDay(tripStartDate).getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff, 0), tripDays.length - 1);
}

function PrepCard({ label, done, onClick }: { label: string; done: boolean; onClick?: () => void }) {
  return (
    <button className="prepItem" onClick={onClick}>
      <span>{done ? "✅" : "⬜"}</span>
      <strong>{label}</strong>
    </button>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="quickAction" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}

function MobileDashboard({ onNavigate }: MobileDashboardProps) {
  const [packing, setPacking] = useState<SharedChecklistItem[]>([]);
  const [shopping, setShopping] = useState<SharedChecklistItem[]>([]);

  useEffect(() => {
    const unsubscribers = [
      listenToChecklistItems("packing", setPacking, () => undefined),
      listenToChecklistItems("shopping", setShopping, () => undefined),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const phase = getTripPhase();
  const daysUntilTrip = Math.max(diffDays(new Date(), tripStartDate), 0);
  const packingDone = packing.length > 0 && packing.every((item) => item.done);
  const shoppingDone = shopping.length > 0 && shopping.every((item) => item.done);

  const currentDay = useMemo(() => {
    if (phase !== "during") return null;
    return tripDays[getCurrentTripDayIndex()] ?? null;
  }, [phase]);

  return (
    <section className="mobileDashboard homeExperience">
      {phase === "before" && (
        <>
          <div className="tripHero countdownHero">
            <div>
              <span className="heroEyebrow">Dolomites 2026</span>
              <h2>מתכוננים לטיול</h2>
              <p>עוד {daysUntilTrip} ימים יוצאים לדולומיטים</p>
            </div>

            <div className="countdownPill">
              <strong>{daysUntilTrip}</strong>
              <span>ימים</span>
            </div>
          </div>

          <div className="homeCard">
            <h3>מה נשאר לסגור?</h3>
            <div className="prepList">
              <PrepCard label="ציוד קבוצתי" done={packingDone} onClick={() => onNavigate("packing")} />
              <PrepCard label="קניות" done={shoppingDone} onClick={() => onNavigate("shopping")} />
              <PrepCard label="ביטוח נסיעות" done={false} onClick={() => onNavigate("useful")} />
              <PrepCard label="eSIM / חבילת גלישה" done={false} onClick={() => onNavigate("useful")} />
              <PrepCard label="איך מגיעים לשדה" done={false} onClick={() => onNavigate("useful")} />
            </div>
          </div>

          <div className="homeCard">
            <h3>האירועים הקרובים</h3>
            <div className="nextEvents">
              <span>✈️ 12.7 · טיסה למילאנו</span>
              <span>🏨 12.7 · Hotel La Nuova Rotaia</span>
              <span>🚗 13.7 · איסוף רכב במלפנסה</span>
            </div>
          </div>
        </>
      )}

      {phase === "during" && currentDay && (
        <>
          <div className="tripHero todayHero">
            <div>
              <span className="heroEyebrow">היום</span>
              <h2>{currentDay.title}</h2>
              <p>{currentDay.weekday} · {currentDay.date}</p>
            </div>
          </div>

          <div className="homeCard">
            <h3>מה צפוי היום?</h3>
            <div className="todaySummary">
              <span>🥾 {currentDay.hiking}</span>
              <span>🚗 {currentDay.driving}</span>
              <span>🏨 הלילה: {currentDay.lodging}</span>
            </div>
          </div>
        </>
      )}

      {phase === "after" && (
        <div className="tripHero todayHero">
          <div>
            <span className="heroEyebrow">Dolomites 2026</span>
            <h2>הטיול הסתיים</h2>
            <p>אפשר להתחיל לאסוף זיכרונות ותובנות לטיול הבא.</p>
          </div>
        </div>
      )}

      <div className="quickActionsGrid">
        <QuickAction icon="📅" label="מסלול" onClick={() => onNavigate("itinerary")} />
        <QuickAction icon="🧭" label="מסביב" onClick={() => onNavigate("useful")} />
        <QuickAction icon="🎒" label="ציוד" onClick={() => onNavigate("packing")} />
        <QuickAction icon="🛒" label="קניות" onClick={() => onNavigate("shopping")} />
        <QuickAction icon="🎮" label="משחקים" onClick={() => onNavigate("games")} />
      </div>
    </section>
  );
}

export default MobileDashboard;
