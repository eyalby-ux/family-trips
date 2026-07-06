import { useEffect, useMemo, useState } from "react";
import { participants } from "../../data/tripData";
import { listenToChecklistItems } from "../../services/checklistService";
import { listenToPersonalPackingItems } from "../../services/personalPackingService";
import type { Screen, SharedChecklistItem, PersonalPackingItem } from "../../types";

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

  return (
    <button className="dashboardMetric" onClick={onClick}>
      <div className="metricTop">
        <span className="metricIcon">{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{done} מתוך {total}</small>
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
  const [personalPacking, setPersonalPacking] = useState<PersonalPackingItem[]>([]);

  useEffect(() => {
    const unsubscribers = [
      listenToChecklistItems("packing", setPacking, () => undefined),
      listenToChecklistItems("shopping", setShopping, () => undefined),
      ...participants.map((person) =>
        listenToPersonalPackingItems(
          person.id,
          (items) => {
            setPersonalPacking((current) => {
              const withoutPerson = current.filter(
                (item) => !item.id.startsWith(`${person.id}::`)
              );

              const withPerson = items.map((item) => ({
                ...item,
                id: `${person.id}::${item.id}`,
              }));

              return [...withoutPerson, ...withPerson];
            });
          },
          () => undefined
        )
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const packingDone = packing.filter((item) => item.done).length;
  const shoppingDone = shopping.filter((item) => item.done).length;
  const personalDone = personalPacking.filter((item) => item.packed).length;

  const totalDone = packingDone + shoppingDone + personalDone;
  const totalItems = packing.length + shopping.length + personalPacking.length;

  const daysUntilTrip = useMemo(() => getDaysUntilTrip(), []);
  const totalProgress = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100);

  return (
    <section className="mobileDashboard">
      <div className="tripHero">
        <div>
          <span className="heroEyebrow">Dolomites 2026</span>
          <h2>סטטוס הכנות</h2>
        </div>

        <div className="countdownPill">
          <strong>{daysUntilTrip}</strong>
          <span>ימים</span>
        </div>
      </div>

      <div className="overallCard">
        <div>
          <strong>{totalProgress}% מוכנים</strong>
          <span>{totalDone} מתוך {totalItems} משימות</span>
        </div>

        <div className="metricProgressTrack">
          <div className="metricProgressFill" style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      <div className="metricGrid">
        <MetricCard
          icon="🎒"
          title="ציוד קבוצתי"
          done={packingDone}
          total={packing.length}
          actionLabel="פתח ציוד"
          onClick={() => onNavigate("packing")}
        />

        <MetricCard
          icon="👤"
          title="ציוד אישי"
          done={personalDone}
          total={personalPacking.length}
          actionLabel="פתח אישי"
          onClick={() => onNavigate("personalPacking")}
        />

        <MetricCard
          icon="🛒"
          title="קניות"
          done={shoppingDone}
          total={shopping.length}
          actionLabel="פתח קניות"
          onClick={() => onNavigate("shopping")}
        />
      </div>

      <button className="continueButton" onClick={() => onNavigate("itinerary")}>
        <span>📅</span>
        <strong>פתח את מסלול הטיול</strong>
      </button>
    </section>
  );
}

export default MobileDashboard;
