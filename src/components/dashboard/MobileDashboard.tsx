import { useEffect, useMemo, useState } from "react";
import { listenToChecklistItems } from "../../services/checklistService";
import type { Screen, SharedChecklistItem } from "../../types";

type MobileDashboardProps = {
  onNavigate: (screen: Screen) => void;
};

type MetricCardProps = {
  icon: string;
  title: string;
  done: number;
  total: number;
  actionLabel: string;
  onClick: () => void;
};

const tripStartDate = new Date("2026-01-01T00:00:00");

function getDaysUntilTrip() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTrip = new Date(
    tripStartDate.getFullYear(),
    tripStartDate.getMonth(),
    tripStartDate.getDate()
  );

  const diffMs = startOfTrip.getTime() - startOfToday.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function MetricCard({ icon, title, done, total, actionLabel, onClick }: MetricCardProps) {
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const openItems = Math.max(total - done, 0);

  return (
    <button className="dashboardMetric compactMetric" onClick={onClick}>
      <div className="metricTop">
        <span className="metricIcon">{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{openItems === 0 ? "הכל סגור" : `נשארו ${openItems}`}</small>
        </div>
      </div>

      <div className="metricProgressTrack">
        <div className="metricProgressFill" style={{ width: `${progress}%` }} />
      </div>

      <span className="metricAction">{actionLabel}</span>
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

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const packingDone = packing.filter((item) => item.done).length;
  const shoppingDone = shopping.filter((item) => item.done).length;
  const daysUntilTrip = useMemo(() => getDaysUntilTrip(), []);

  return (
    <section className="mobileDashboard simplifiedDashboard">
      <div className="tripHero simplifiedHero">
        <div>
          <span className="heroEyebrow">Dolomites 2026</span>
          <h2>מוכנים לטיול?</h2>
        </div>

        <div className="countdownPill">
          <strong>{daysUntilTrip}</strong>
          <span>ימים</span>
        </div>
      </div>

      <div className="metricGrid simplifiedMetricGrid">
        <MetricCard
          icon="🎒"
          title="ציוד קבוצתי"
          done={packingDone}
          total={packing.length}
          actionLabel="פתח"
          onClick={() => onNavigate("packing")}
        />

        <MetricCard
          icon="🛒"
          title="קניות"
          done={shoppingDone}
          total={shopping.length}
          actionLabel="פתח"
          onClick={() => onNavigate("shopping")}
        />
      </div>
    </section>
  );
}

export default MobileDashboard;
