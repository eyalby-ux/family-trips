import { useEffect, useState } from "react";
import {
  emergencyContacts,
  travelHubCar,
  travelHubFlights,
  travelHubHotels,
  usefulInfoItems,
} from "../data/travelHubData";
import { listenToLiveNotes, saveLiveNote } from "../services/travelHubService";
import type { TravelHubDeepLink } from "../data/navigationTargets";
import type { LiveNotes, TravelHubFlight, TravelHubHotel } from "../types";

type HubSection = "home" | "hotels" | "car" | "flights" | "emergency" | "info";
type NoteField = { key: string; label: string; placeholder: string; secret?: boolean };

type TravelHubProps = {
  initialTarget?: TravelHubDeepLink;
  forceHomeToken?: number;
};

function copyToClipboard(value: string) {
  if (!value) return;
  navigator.clipboard?.writeText(value);
}

function ActionLink({ href, children }: { href: string; children: string }) {
  return <a className="hubAction" href={href} target="_blank" rel="noreferrer">{children}</a>;
}

function LiveField({ entityId, notes, field, onSaved }: { entityId: string; notes: LiveNotes; field: NoteField; onSaved: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(notes[field.key] ?? "");
  const displayValue = notes[field.key] ?? "";

  useEffect(() => setValue(notes[field.key] ?? ""), [field.key, notes]);

  async function handleSave() {
    await saveLiveNote(entityId, field.key, value.trim());
    setIsEditing(false);
    onSaved();
  }

  return (
    <div className="liveField">
      <div><strong>{field.label}</strong><span>{displayValue ? (field.secret ? "••••••••" : displayValue) : "אפשר לעדכן כשתדעו"}</span></div>
      <div className="liveFieldActions">
        {field.secret && displayValue && <button onClick={() => copyToClipboard(displayValue)}>העתק</button>}
        <button onClick={() => setIsEditing((current) => !current)}>{isEditing ? "סגור" : "עדכן"}</button>
      </div>
      {isEditing && <div className="liveEdit"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={field.placeholder} /><button className="primaryButton" onClick={handleSave}>שמור לכולם</button></div>}
    </div>
  );
}

function useLiveNotes(entityId: string) {
  const [notes, setNotes] = useState<LiveNotes>({});
  const [error, setError] = useState("");
  useEffect(() => listenToLiveNotes(entityId, setNotes, setError), [entityId]);
  return { notes, error };
}

function HotelDetails({ hotel, onBack }: { hotel: TravelHubHotel; onBack: () => void }) {
  const { notes, error } = useLiveNotes(`hotel-${hotel.id}`);
  const [savedMessage, setSavedMessage] = useState("");

  function handleSaved() {
    setSavedMessage("נשמר");
    window.setTimeout(() => setSavedMessage(""), 1200);
  }

  return (
    <div className="hubStack">
      <button className="backHubButton" onClick={onBack}>חזרה למלונות</button>
      <article className="hubDetailCard">
        <div className="hubDetailHeader"><span className="hubIcon">🏨</span><div><h3>{hotel.name}</h3><span>{hotel.dates} · {hotel.area}</span></div></div>
        <p className="hubHighlight">{hotel.highlight}</p>
        <div className="primaryActionRow">
          <ActionLink href={hotel.mapsUrl}>🧭 נווט</ActionLink>
          {hotel.phone && <a className="hubAction" href={`tel:${hotel.phone}`}>☎️ התקשר</a>}
          {hotel.websiteUrl && <ActionLink href={hotel.websiteUrl}>🌐 אתר</ActionLink>}
        </div>
        <div className="hubInfoGrid"><div><strong>כתובת</strong><span>{hotel.address}</span></div><div><strong>צ׳ק-אין</strong><span>{hotel.checkIn ?? "לעדכן"}</span></div><div><strong>צ׳ק-אאוט</strong><span>{hotel.checkOut ?? "לעדכן"}</span></div></div>
        <div className="liveNotesBox">
          <h4>מידע מהשטח</h4>
          <LiveField entityId={`hotel-${hotel.id}`} notes={notes} field={{ key: "wifiName", label: "שם רשת Wi‑Fi", placeholder: "לדוגמה: Hotel_Guest" }} onSaved={handleSaved} />
          <LiveField entityId={`hotel-${hotel.id}`} notes={notes} field={{ key: "wifiPassword", label: "סיסמת Wi‑Fi", placeholder: "סיסמה", secret: true }} onSaved={handleSaved} />
          <LiveField entityId={`hotel-${hotel.id}`} notes={notes} field={{ key: "accessCode", label: "קוד כניסה / מפתח", placeholder: "קוד כניסה, תיבה, דלת..." }} onSaved={handleSaved} />
          <LiveField entityId={`hotel-${hotel.id}`} notes={notes} field={{ key: "parking", label: "חניה", placeholder: "לדוגמה: חניה מאחור / קומה B2" }} onSaved={handleSaved} />
          <LiveField entityId={`hotel-${hotel.id}`} notes={notes} field={{ key: "note", label: "הערה", placeholder: "משהו שחשוב לזכור" }} onSaved={handleSaved} />
          {savedMessage && <span className="savedMessage">{savedMessage}</span>}{error && <span className="errorInline">{error}</span>}
        </div>
        {hotel.notes && <details className="hubDetails"><summary>הערות מתוכננות</summary><ul>{hotel.notes.map((note) => <li key={note}>{note}</li>)}</ul></details>}
      </article>
      <button className="backHubButton bottomBackButton" onClick={onBack}>חזרה למלונות</button>
    </div>
  );
}

function HotelsSection({ initialHotelId }: { initialHotelId?: string }) {
  const [selectedHotelId, setSelectedHotelId] = useState(initialHotelId ?? "");
  useEffect(() => setSelectedHotelId(initialHotelId ?? ""), [initialHotelId]);
  const selectedHotel = travelHubHotels.find((hotel) => hotel.id === selectedHotelId);
  if (selectedHotel) return <HotelDetails hotel={selectedHotel} onBack={() => setSelectedHotelId("")} />;
  return (
    <div className="hubStack"><h3>🏨 מלונות</h3><div className="compactList">
      {travelHubHotels.map((hotel) => <button key={hotel.id} className="compactHotelCard" onClick={() => setSelectedHotelId(hotel.id)}><span className="compactDate">{hotel.dates}</span><div><strong>{hotel.name}</strong><small>{hotel.area}</small></div><span className="compactArrow">›</span></button>)}
    </div></div>
  );
}

function CarSection() {
  const { notes, error } = useLiveNotes("car-rental");
  const [savedMessage, setSavedMessage] = useState("");
  function handleSaved() { setSavedMessage("נשמר"); window.setTimeout(() => setSavedMessage(""), 1200); }

  return (
    <div className="hubStack"><article className="hubDetailCard">
      <div className="hubDetailHeader"><span className="hubIcon">🚗</span><div><h3>{travelHubCar.supplier}</h3><span>{travelHubCar.carType}</span></div></div>
      <div className="primaryActionRow"><ActionLink href={travelHubCar.pickupMapsUrl}>🧭 נווט לסוכנות</ActionLink><a className="hubAction" href={`tel:${travelHubCar.pickupPhone}`}>☎️ התקשר</a></div>
      <div className="hubInfoGrid"><div><strong>הזמנה</strong><span>{travelHubCar.bookingNumber}</span></div><div><strong>אישור</strong><span>{travelHubCar.confirmationNumber}</span></div><div><strong>נהג ראשי</strong><span>{travelHubCar.mainDriver}</span></div><div><strong>איסוף</strong><span>{travelHubCar.pickupDate} · {travelHubCar.pickupTime}</span></div><div><strong>החזרה</strong><span>{travelHubCar.dropoffDate} · {travelHubCar.dropoffTime}</span></div><div><strong>פיקדון</strong><span>{travelHubCar.deposit}</span></div></div>
      <div className="notice softNotice">{travelHubCar.shuttleInstructions}</div>
      <div className="liveNotesBox"><h4>מידע מהשטח</h4><LiveField entityId="car-rental" notes={notes} field={{ key: "parkingSpot", label: "מקום חניה", placeholder: "לדוגמה: P3 שורה 18" }} onSaved={handleSaved} /><LiveField entityId="car-rental" notes={notes} field={{ key: "carNotes", label: "הערות רכב", placeholder: "שריטות, ציוד, דלק..." }} onSaved={handleSaved} />{savedMessage && <span className="savedMessage">{savedMessage}</span>}{error && <span className="errorInline">{error}</span>}</div>
      <details className="hubDetails"><summary>ביטוח</summary><ul>{travelHubCar.insuranceSummary.map((item) => <li key={item}>{item}</li>)}</ul></details>
      <details className="hubDetails"><summary>צ׳קליסט איסוף</summary><ul>{travelHubCar.pickupChecklist.map((item) => <li key={item}>{item}</li>)}</ul></details>
      <details className="hubDetails"><summary>צ׳קליסט החזרה</summary><ul>{travelHubCar.dropoffChecklist.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </article></div>
  );
}

function FlightCard({ flight }: { flight: TravelHubFlight }) {
  const { notes, error } = useLiveNotes(`flight-${flight.id}`);
  const [savedMessage, setSavedMessage] = useState("");
  function handleSaved() { setSavedMessage("נשמר"); window.setTimeout(() => setSavedMessage(""), 1200); }

  return (
    <article className="hubDetailCard">
      <div className="hubDetailHeader"><span className="hubIcon">✈️</span><div><h3>{flight.title} · {flight.flightNumber}</h3><span>{flight.date}</span></div></div>
      <div className="flightRoute"><strong>{flight.from}</strong><span>→</span><strong>{flight.to}</strong></div>
      <div className="hubInfoGrid"><div><strong>המראה</strong><span>{flight.departureTime}</span></div><div><strong>נחיתה</strong><span>{flight.arrivalTime}</span></div><div><strong>חברה</strong><span>{flight.airline}</span></div><div><strong>Reference</strong><span>{flight.bookingReference}</span></div></div>
      <div className="primaryActionRow"><ActionLink href={flight.airportNavigationUrl}>🧭 נווט לשדה</ActionLink></div>
      <div className="liveNotesBox"><h4>מידע מהשטח</h4><LiveField entityId={`flight-${flight.id}`} notes={notes} field={{ key: "flightNotes", label: "הערות", placeholder: "חניה, טרמינל, מושבים..." }} onSaved={handleSaved} /><LiveField entityId={`flight-${flight.id}`} notes={notes} field={{ key: "parking", label: "חניה בשדה", placeholder: "לדוגמה: חניון 15, שורה..." }} onSaved={handleSaved} />{savedMessage && <span className="savedMessage">{savedMessage}</span>}{error && <span className="errorInline">{error}</span>}</div>
    </article>
  );
}

function FlightsSection({ initialFlightId }: { initialFlightId?: string }) {
  const flights = initialFlightId ? travelHubFlights.filter((flight) => flight.id === initialFlightId) : travelHubFlights;
  return <div className="hubStack"><h3>✈️ טיסות</h3>{flights.map((flight) => <FlightCard key={flight.id} flight={flight} />)}</div>;
}

function TravelHub({ initialTarget, forceHomeToken = 0 }: TravelHubProps) {
  const [section, setSection] = useState<HubSection>((initialTarget?.section as HubSection) ?? "home");

  useEffect(() => {
    if (initialTarget?.section) setSection(initialTarget.section as HubSection);
  }, [initialTarget]);

  useEffect(() => {
    if (initialTarget?.section === "home") setSection("home");
  }, [forceHomeToken, initialTarget]);

  const moduleCards = [
    { id: "hotels" as HubSection, icon: "🏨", title: "מלונות", subtitle: "Wi‑Fi, ניווט, טלפונים והערות" },
    { id: "car" as HubSection, icon: "🚗", title: "רכב", subtitle: "השכרה, ביטוח וצ׳קליסטים" },
    { id: "flights" as HubSection, icon: "✈️", title: "טיסות", subtitle: "הלוך, חזור ושדות תעופה" },
    { id: "emergency" as HubSection, icon: "☎️", title: "חירום", subtitle: "מספרים חשובים" },
    { id: "info" as HubSection, icon: "ℹ️", title: "מידע", subtitle: "טיפים שימושיים" },
  ];

  return (
    <section className="section travelHub">
      <div className="sectionTitle travelHubTitle"><h2>מסביב</h2><span>כל המידע שצריך בזמן הטיול</span></div>
      {section === "home" && <div className="hubModuleGrid">{moduleCards.map((card) => <button key={card.id} className="hubModuleCard" onClick={() => setSection(card.id)}><span>{card.icon}</span><strong>{card.title}</strong><small>{card.subtitle}</small></button>)}</div>}
      {section === "hotels" && <HotelsSection initialHotelId={initialTarget?.section === "hotels" ? initialTarget.entityId : undefined} />}
      {section === "car" && <CarSection />}
      {section === "flights" && <FlightsSection initialFlightId={initialTarget?.section === "flights" ? initialTarget.entityId : undefined} />}
      {section === "emergency" && <div className="hubStack"><h3>☎️ חירום</h3>{emergencyContacts.map((contact) => <article key={contact.id} className="hubDetailCard compactEmergencyCard"><strong>{contact.label}</strong><span>{contact.value}</span>{contact.type === "phone" && <a className="hubAction" href={`tel:${contact.value}`}>חייג</a>}{contact.note && <small>{contact.note}</small>}</article>)}</div>}
      {section === "info" && <div className="hubStack"><h3>ℹ️ מידע שימושי</h3>{usefulInfoItems.map((item) => <article key={item.id} className="hubDetailCard"><strong>{item.title}</strong><p>{item.body}</p></article>)}</div>}
    </section>
  );
}

export default TravelHub;
