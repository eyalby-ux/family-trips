import Header from "../components/layout/Header";
import { actionCards, participants, tripDays } from "../data/trips";

function Home() {
  return (
    <main className="app" dir="rtl">
      <Header />

      <section className="section">
        <div className="sectionTitle">
          <h2>פעולות מהירות</h2>
          <span>גרסת MVP לטיול הקרוב</span>
        </div>

        <div className="cardsGrid">
          {actionCards.map((card) => (
            <button key={card.id} className="actionCard">
              <span className="cardIcon">{card.icon}</span>
              <strong>{card.title}</strong>
              <small>{card.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>משתתפים</h2>
          <span>טיול דולומיטים</span>
        </div>

        <div className="participants">
          {participants.map((person) => (
            <div key={person.id} className="participant">
              <div className="avatar">{person.name[0]}</div>
              <div>
                <strong>{person.name}</strong>
                {person.role && <small>{person.role}</small>}
              </div>
            </div>
          ))}
        </div>
      </section>

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
    </main>
  );
}

export default Home;