import { useMemo, useState } from "react";
import { tripDays } from "../data/tripData";

function Itinerary() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeDay = tripDays[activeIndex];

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
    <section className="section itineraryMobile">
      <div className="sectionTitle">
        <h2>מסלול יומי</h2>
        <span>יום אחד בכל פעם</span>
      </div>

      <div className="dayStepper">
        <button onClick={goToPreviousDay} disabled={activeIndex === 0}>
          ▶
        </button>

        <div>
          <strong>{dayLabel}</strong>
          <span>{activeDay.weekday} · {activeDay.date}</span>
        </div>

        <button onClick={goToNextDay} disabled={activeIndex === tripDays.length - 1}>
          ◀
        </button>
      </div>

      <div className="dayTabs" aria-label="בחירת יום">
        {tripDays.map((day, index) => (
          <button
            key={day.id}
            className={index === activeIndex ? "active" : ""}
            onClick={() => setActiveIndex(index)}
          >
            יום {index + 1}
          </button>
        ))}
      </div>

      <article className="dayCard focusedDayCard">
        <div className="dayHeader">
          <span className="dateBadge">{activeDay.weekday} · {activeDay.date}</span>
          <h3>{activeDay.title}</h3>
        </div>

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

        {activeDay.food.length > 0 && (
          <div className="daySubSection">
            <h4>🍽️ אוכל</h4>
            <ul>
              {activeDay.food.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeDay.notes && activeDay.notes.length > 0 && (
          <div className="daySubSection">
            <h4>📝 הערות</h4>
            <ul>
              {activeDay.notes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeDay.alternatives && activeDay.alternatives.length > 0 && (
          <div className="daySubSection">
            <h4>🔁 חלופות</h4>
            <ul>
              {activeDay.alternatives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeDay.links.length > 0 && (
          <div className="linkGrid">
            {activeDay.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

export default Itinerary;
