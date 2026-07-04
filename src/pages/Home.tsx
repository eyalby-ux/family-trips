import Header from "../components/layout/Header";
import { participants, tripDays } from "../data/tripData";
import type { Screen } from "../types";

type HomeProps = {
  onNavigate: (screen: Screen) => void;
};

function Home({ onNavigate }: HomeProps) {
  const nextDay = tripDays[0];

  return (
    <>
      <Header />

      <section className="section">
        <div className="sectionTitle">
          <h2>פעולות מהירות</h2>
          <span>גרסה שימושית לטיול הקרוב</span>
        </div>

        <div className="cardsGrid">
          <button className="actionCard" onClick={() => onNavigate("itinerary")}>
            <span className="cardIcon">📅</span>
            <strong>מסלול יומי</strong>
            <small>ימים, נסיעות, טיולים, לינה וקישורים</small>
          </button>

          <button className="actionCard" onClick={() => onNavigate("packing")}>
            <span className="cardIcon">🎒</span>
            <strong>ציוד קבוצתי</strong>
            <small>מי אחראי ומה כבר נארז</small>
          </button>

          <button className="actionCard" onClick={() => onNavigate("shopping")}>
            <span className="cardIcon">🛒</span>
            <strong>קניות</strong>
            <small>סופר, מים, חטיפים ופק״ל</small>
          </button>

          <button className="actionCard" onClick={() => onNavigate("games")}>
            <span className="cardIcon">🎮</span>
            <strong>משחקים</strong>
            <small>טריוויה ואתגרים לנסיעה</small>
          </button>
        </div>
      </section>

      <section className="section highlight">
        <div className="sectionTitle">
          <h2>היום הראשון</h2>
          <span>{nextDay.date}</span>
        </div>
        <h3>{nextDay.title}</h3>
        <p><strong>🚗 נסיעה:</strong> {nextDay.driving}</p>
        <p><strong>🥾 טיול:</strong> {nextDay.hiking}</p>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>משתתפים</h2>
          <span>{participants.length} אנשים</span>
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
    </>
  );
}

export default Home;
