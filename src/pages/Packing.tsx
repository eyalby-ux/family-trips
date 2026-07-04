import { useEffect, useState } from "react";
import { participants } from "../data/tripData";
import {
  listenToPackingItems,
  seedPackingItems,
  updatePackingItem,
} from "../services/packingService";
import type { PackingItem } from "../types";

function Packing() {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = listenToPackingItems(
      (nextItems) => {
        setItems(nextItems);
        setIsLoading(false);
        setError("");
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function handleSeed() {
    setIsSeeding(true);
    setError("");

    try {
      await seedPackingItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה באתחול הציוד");
    } finally {
      setIsSeeding(false);
    }
  }

  async function togglePacked(item: PackingItem) {
    await updatePackingItem(item.id, { packed: !item.packed });
  }

  async function changeOwner(item: PackingItem, owner: string) {
    await updatePackingItem(item.id, { owner });
  }

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>ציוד קבוצתי</h2>
        <span>מסונכרן בזמן אמת דרך Firebase</span>
      </div>

      {error && (
        <div className="notice errorNotice">
          <strong>שגיאת Firebase:</strong>
          <span>{error}</span>
        </div>
      )}

      {isLoading && <div className="notice">טוען ציוד...</div>}

      {!isLoading && items.length === 0 && (
        <div className="emptyState">
          <h3>עדיין אין ציוד ב־Firebase</h3>
          <p>לחיצה אחת תיצור את רשימת הציוד הקבוצתי בענן.</p>
          <button className="primaryButton" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? "מאתחל..." : "🚀 אתחל ציוד קבוצתי"}
          </button>
        </div>
      )}

      <div className="list">
        {items.map((item) => (
          <div key={item.id} className="listItem editableListItem">
            <label className="checkboxLine">
              <input
                type="checkbox"
                checked={item.packed}
                onChange={() => togglePacked(item)}
              />
              <div>
                <strong>{item.name}</strong>
                <small>{item.packed ? "נארז" : "עדיין לא נארז"}</small>
              </div>
            </label>

            <select
              value={item.owner}
              onChange={(event) => changeOwner(item, event.target.value)}
              aria-label={`אחראי על ${item.name}`}
            >
              <option value="לא שובץ">לא שובץ</option>
              {participants.map((person) => (
                <option key={person.id} value={person.name}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Packing;
