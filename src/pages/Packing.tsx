import { useState } from "react";
import { initialPacking } from "../data/tripData";

function Packing() {
  const [items, setItems] = useState(initialPacking);

  function toggleItem(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, packed: !item.packed } : item
      )
    );
  }

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>ציוד משותף</h2>
        <span>בשלב הבא נחבר ל־Firebase</span>
      </div>

      <div className="list">
        {items.map((item) => (
          <label key={item.id} className="listItem">
            <input
              type="checkbox"
              checked={item.packed}
              onChange={() => toggleItem(item.id)}
            />
            <div>
              <strong>{item.name}</strong>
              <small>אחראי: {item.owner}</small>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

export default Packing;