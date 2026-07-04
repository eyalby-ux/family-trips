import { useState } from "react";
import { initialShopping } from "../data/tripData";

function Shopping() {
  const [items, setItems] = useState(initialShopping);

  function toggleItem(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  }

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>קניות לסופר</h2>
        <span>מי קונה ומה כבר נקנה</span>
      </div>

      <div className="list">
        {items.map((item) => (
          <label key={item.id} className="listItem">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
            />
            <div>
              <strong>{item.name}</strong>
              <small>{item.quantity} · אחראי: {item.owner}</small>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

export default Shopping;