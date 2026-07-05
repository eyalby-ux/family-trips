import { tripDays } from "../data/tripData";
import { getMapPointIcon, mapPointsByDay } from "../data/mapData";

function TripMap() {
  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>מפת הטיול וניווט</h2>
        <span>קישורי ניווט חשובים לפי יום</span>
      </div>

      <div className="mapIntro">
        <strong>טיפ שימוש:</strong>
        <span>בזמן הטיול פותחים את היום הרלוונטי ולוחצים על היעד — Google Maps ייפתח ישירות.</span>
      </div>

      <div className="timeline">
        {tripDays.map((day) => {
          const points = mapPointsByDay[day.id] ?? [];

          return (
            <article key={day.id} className="dayCard mapDayCard">
              <div className="dayHeader">
                <span className="dateBadge">{day.weekday} · {day.date}</span>
                <h3>{day.title}</h3>
              </div>

              <p className="mapDrivingText"><strong>🚗 נסיעה:</strong> {day.driving}</p>

              <div className="mapPointGrid">
                {points.map((point) => (
                  <a key={point.id} className={`mapPoint mapPoint-${point.type}`} href={point.url} target="_blank" rel="noreferrer">
                    <span className="mapPointIcon">{getMapPointIcon(point.type)}</span>
                    <span>{point.label}</span>
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default TripMap;
