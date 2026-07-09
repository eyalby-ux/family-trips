import { useEffect, useMemo, useState } from "react";
import { listenToChecklistItems } from "../../services/checklistService";
import { listenToPreparationTask } from "../../services/preparationService";
import { preparationParticipants, preparationTasks } from "../../data/preparationData";
import { tripDays } from "../../data/tripData";
import { getPreviewDayIndex } from "../../utils/devPreview";
import type { AppDeepLink } from "../../data/navigationTargets";
import type {
  PreparationTaskDefinition,
  PreparationTaskState,
  Screen,
  SharedChecklistItem,
} from "../../types";

type MobileDashboardProps = {
  onNavigate: (screen: Screen) => void;
  onDeepLink?: (link: AppDeepLink) => void;
};

const tripStartDate = new Date("2026-07-12T00:00:00");
const tripEndDate = new Date("2026-07-19T23:59:59");

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(from: Date, to: Date) {
  return Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24));
}

function getTripPhase() {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const previewDay = Number(params.get("previewDay"));
    if (Number.isFinite(previewDay) && previewDay >= 1) return "during";
  }

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

function getLinearProgress(task: PreparationTaskDefinition, state: PreparationTaskState) {
  if (task.mode === "group") return state.groupDone ? 1 : 0;
  const doneCount = preparationParticipants.filter((person) => state.participants?.[person.id]).length;
  return doneCount / preparationParticipants.length;
}

function getProgressTone(progress: number) {
  if (progress >= 1) return "ready";
  if (progress > 0) return "progress";
  return "pending";
}

function VisualProgress({ progress }: { progress: number }) {
  return (
    <div className={`homeVisualProgress ${getProgressTone(progress)}`}>
      <span style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}

function PreparationCard({
  onNavigate,
  preparationStates,
}: {
  onNavigate: (screen: Screen) => void;
  preparationStates: Record<string, PreparationTaskState>;
}) {
  const taskProgress = preparationTasks.map((task) =>
    getLinearProgress(task, preparationStates[task.id] ?? { taskId: task.id })
  );
  const overallProgress = taskProgress.reduce((sum, value) => sum + value, 0) / preparationTasks.length;

  return (
    <section className="homeCard">
      <button className="homeCardTitleButton" onClick={() => onNavigate("preparations")}>
        <div>
          <h3>מצב ההכנות</h3>
          <small>ביטוח, eSIM והגעה לשדה</small>
        </div>
        <span className={`statusBadge ${getProgressTone(overallProgress)}`}>
          {overallProgress >= 1 ? "מוכן" : overallProgress > 0 ? "בתהליך" : "להתחיל"}
        </span>
      </button>

      <VisualProgress progress={overallProgress} />

      <div className="homePrepRows">
        {preparationTasks.map((task) => {
          const progress = getLinearProgress(task, preparationStates[task.id] ?? { taskId: task.id });
          return (
            <button key={task.id} className="homePrepRow" onClick={() => onNavigate("preparations")}>
              <span className="rowIcon">{task.icon}</span>
              <strong>{task.title}</strong>
              <VisualProgress progress={progress} />
              <span className="compactArrow">›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MiniStatusCard({
  title,
  icon,
  items,
  onClick,
}: {
  title: string;
  icon: string;
  items: SharedChecklistItem[];
  onClick: () => void;
}) {
  const progress = items.length ? items.filter((item) => item.done).length / items.length : 0;
  return (
    <button className="miniStatusCard" onClick={onClick}>
      <span className="miniStatusIcon">{icon}</span>
      <strong>{title}</strong>
      <VisualProgress progress={progress} />
    </button>
  );
}

function UpcomingEventButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button className="upcomingEventButton" onClick={onClick}>
      <span className="rowIcon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <span className="compactArrow">›</span>
    </button>
  );
}

function MobileDashboard({ onNavigate, onDeepLink }: MobileDashboardProps) {
  const [packing, setPacking] = useState<SharedChecklistItem[]>([]);
  const [shopping, setShopping] = useState<SharedChecklistItem[]>([]);
  const [preparationStates, setPreparationStates] = useState<Record<string, PreparationTaskState>>({});

  useEffect(() => {
    const unsubscribers = [
      listenToChecklistItems("packing", setPacking, () => undefined),
      listenToChecklistItems("shopping", setShopping, () => undefined),
      ...preparationTasks.map((task) =>
        listenToPreparationTask(
          task.id,
          (state) => setPreparationStates((current) => ({ ...current, [task.id]: state })),
          () => undefined
        )
      ),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const phase = getTripPhase();
  const daysUntilTrip = Math.max(diffDays(new Date(), tripStartDate), 0);
  const currentDay = useMemo(() => {
    if (phase !== "during") return null;
    const dayIndex = getPreviewDayIndex(getCurrentTripDayIndex(), tripDays.length);
    return tripDays[dayIndex] ?? null;
  }, [phase]);

  function openTravelHubSection(section: "flights" | "hotels" | "car", entityId?: string) {
    onDeepLink?.({ screen: "useful", travelHub: { section, entityId: entityId as never } });
  }

  return (
    <section className="homeShell">
      {phase === "before" && (
        <>
          <section className="homeHeroMountain">
            <div className="mountainIcon" aria-hidden="true">🏔️</div>
            <div className="homeHeroText">
              <span className="heroEyebrow">Dolomites 2026</span>
              <h2>מתכוננים לטיול</h2>
              <p>עוד {daysUntilTrip} ימים יוצאים לדולומיטים</p>
            </div>
            <div className="countdownPill">
              <strong>{daysUntilTrip}</strong>
              <span>ימים</span>
            </div>
          </section>

          <PreparationCard onNavigate={onNavigate} preparationStates={preparationStates} />

          <section className="homeCard">
            <div className="homeCardTitle">
              <h3>רשימות</h3>
              <small>תמונת מצב בלבד</small>
            </div>
            <div className="miniStatusGrid">
              <MiniStatusCard title="ציוד קבוצתי" icon="🎒" items={packing} onClick={() => onNavigate("packing")} />
              <MiniStatusCard title="קניות" icon="🛒" items={shopping} onClick={() => onNavigate("shopping")} />
            </div>
          </section>

          <section className="homeCard">
            <div className="homeCardTitle">
              <h3>האירועים הקרובים</h3>
              <small>לחיצה פותחת את הפרטים</small>
            </div>
            <div className="upcomingEvents">
              <UpcomingEventButton icon="✈️" title="12.7 · טיסה למילאנו" subtitle="LY387 · TLV → MXP" onClick={() => openTravelHubSection("flights", "outbound-flight")} />
              <UpcomingEventButton icon="🏨" title="12.7 · Hotel La Nuova Rotaia" subtitle="לילה ראשון · Gallarate" onClick={() => openTravelHubSection("hotels", "la-nuova-rotaia")} />
              <UpcomingEventButton icon="🚗" title="13.7 · איסוף רכב במלפנסה" subtitle="Differental · 08:00" onClick={() => openTravelHubSection("car", "car-rental")} />
            </div>
          </section>
        </>
      )}

      {phase === "during" && currentDay && (
        <>
          <section className="homeHeroMountain">
            <div className="mountainIcon">🏔️</div>
            <div>
              <span className="heroEyebrow">היום</span>
              <h2>{currentDay.title}</h2>
              <p>{currentDay.weekday} · {currentDay.date}</p>
            </div>
          </section>

          <section className="homeCard">
            <h3>מה צפוי היום?</h3>
            <div className="todaySummary">
              <span>🥾 {currentDay.hiking}</span>
              <span>🚗 {currentDay.driving}</span>
              <span>🏨 הלילה: {currentDay.lodging}</span>
            </div>
          </section>
        </>
      )}

      {phase === "after" && (
        <section className="homeHeroMountain">
          <div className="mountainIcon">🏔️</div>
          <div>
            <span className="heroEyebrow">Dolomites 2026</span>
            <h2>הטיול הסתיים</h2>
            <p>אפשר להתחיל לאסוף זיכרונות ותובנות לטיול הבא.</p>
          </div>
        </section>
      )}
    </section>
  );
}

export default MobileDashboard;
