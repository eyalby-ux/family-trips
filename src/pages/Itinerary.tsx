import { tripDays } from "../data/tripData";

function Itinerary() {
  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>מסלול יומי</h2>
        <span>טיוטה שימושית ראשונה</span>
      </div>

      <div className="timeline">
        {tripDays.map((day) => (
          <article key={day.id} className="dayCard">
            <div className="dayHeader">
              <span className="dateBadge">{day.date}</span>
              <h3>{day.title}</h3>
            </div>

            <div className="dayContent">
              <p><strong>🚗 נסיעה:</strong> {day.driving}</p>
              <p><strong>🥾 טיול:</strong> {day.hiking}</p>
              <p><strong>🏨 לינה:</strong> {day.lodging}</p>
              <p><strong>🍝 אוכל:</strong> {day.food.join(" · ")}</p>
            </div>

            <div className="linksRow">
              {day.links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Itinerary;