import { tripDays } from "../../data/tripData";
import type { Screen } from "../../types";

type DayCarouselProps = {
  onOpenItinerary: (screen: Screen) => void;
};

function DayCarousel({ onOpenItinerary }: DayCarouselProps) {
  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>ימי הטיול</h2>
        <span>גלילה לצדדים לתקציר מהיר</span>
      </div>

      <div className="dayCarousel" aria-label="תקציר ימי הטיול">
        {tripDays.map((day) => (
          <article key={day.id} className="daySummaryCard">
            <div className="daySummaryTop">
              <span className="dateBadge">{day.weekday} · {day.date}</span>
            </div>

            <h3>{day.title}</h3>
            <p><strong>🚗</strong> {day.driving}</p>
            <p><strong>🥾</strong> {day.hiking}</p>
            <p><strong>🏨</strong> {day.lodging}</p>

            <button className="smallPrimaryButton" onClick={() => onOpenItinerary("itinerary")}>
              פתח מסלול מלא
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DayCarousel;
