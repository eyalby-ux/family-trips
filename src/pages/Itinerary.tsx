import { useMemo, useState } from "react";
import { tripDays } from "../data/tripData";
import { getMapPointIcon, mapPointsByDay } from "../data/mapData";

type DayTab = "route" | "navigation";

function Itinerary() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<DayTab>("route");
  const activeDay = tripDays[activeIndex];
  const mapPoints = mapPointsByDay[activeDay.id] ?? [];

  const dayLabel = useMemo(() => {
    return `יום ${activeIndex + 1} מתוך ${tripDays.length}`;
  }, [activeIndex]);

  function goToPreviousDay() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function goToNextDay() {
    setActiveIndex((current) => Math.min(current + 1, tripDays.length - 1));
  }

  return (
    <section className="section itineraryMobile combinedItinerary">
      <div className="sectionTitle compactSectionTitle">
        <h2>מסלול וניווט</h2>
        <span>{dayLabel}</span>
      </div>

      <div className="dayStepper compactDayStepper">
        <button onClick={goToPreviousDay} disabled={activeIndex === 0}>
          ▶
        </button>

        <div>
          <strong>{activeDay.title}</strong>
          <span>{activeDay.weekday} · {activeDay.date}</span>
        </div>

        <button onClick={goToNextDay} disabled={activeIndex === tripDays.length - 1}>
          ◀
        </button>
      </div>

      <div className="routeTabs" role="tablist" aria-label="מסלול או ניווט">
        <button className={activeTab === "route" ? "active" : ""} onClick={() => setActiveTab("route")}>
          מסלול
        </button>
        <button className={activeTab === "navigation" ? "active" : ""} onClick={() => setActiveTab("navigation")}>
          ניווט
        </button>
      </div>

      <article className="dayCard focusedDayCard compactDayCard">
        {activeTab === "route" && (
          <>
            <div className="mobileInfoStack">
              <div className="infoPanel">
                <strong>🚗 נסיעה</strong>
                <p>{activeDay.driving}</p>
              </div>

              <div className="infoPanel">
                <strong>🥾 טיול</strong>
                <p>{activeDay.hiking}</p>
              </div>

              <div className="infoPanel">
                <strong>🏨 לינה</strong>
                <p>{activeDay.lodging}</p>
              </div>
            </div>

            {activeDay.notes && activeDay.notes.length > 0 && (
              <details className="dayDetails">
                <summary>📝 הערות</summary>
                <ul>
                  {activeDay.notes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            )}

            {activeDay.alternatives && activeDay.alternatives.length > 0 && (
              <details className="dayDetails">
                <summary>🔁 חלופות</summary>
                <ul>
                  {activeDay.alternatives.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {activeTab === "navigation" && (
          <>
            <div className="mapPointGrid compactMapPointGrid">
              {mapPoints.map((point) => (
                <a
                  key={point.id}
                  className={`mapPoint mapPoint-${point.type}`}
                  href={point.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="mapPointIcon">{getMapPointIcon(point.type)}</span>
                  <span>{point.label}</span>
                </a>
              ))}
            </div>

            {activeDay.links.length > 0 && (
              <details className="dayDetails">
                <summary>🔗 קישורים נוספים</summary>
                <div className="linkGrid compactLinkGrid">
                  {activeDay.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
              </details>
            )}

            {mapPoints.length === 0 && activeDay.links.length === 0 && (
              <div className="notice">אין קישורי ניווט ליום הזה עדיין.</div>
            )}
          </>
        )}
      </article>
    </section>
  );
}

export default Itinerary;
