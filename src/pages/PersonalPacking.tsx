import { useEffect, useMemo, useState } from "react";
import { participants } from "../data/tripData";
import { initialPersonalPacking } from "../data/personalPackingData";
import {
  addPersonalPackingItem,
  deletePersonalPackingItem,
  listenToPersonalPackingItems,
  seedPersonalPackingItems,
  updatePersonalPackingItem,
} from "../services/personalPackingService";
import type { PersonalPackingItem } from "../types";

function PersonalPacking() {
  const [selectedParticipantId, setSelectedParticipantId] = useState(participants[0].id);
  const [items, setItems] = useState<PersonalPackingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("כללי");
  const [isRequired, setIsRequired] = useState(true);

  const selectedParticipant = participants.find((person) => person.id === selectedParticipantId);
  const packedCount = items.filter((item) => item.packed).length;
  const progress = items.length === 0 ? 0 : Math.round((packedCount / items.length) * 100);

  const itemsByCategory = useMemo(() => {
    return items.reduce<Record<string, PersonalPackingItem[]>>((groups, item) => {
      const category = item.category || "כללי";
      groups[category] = groups[category] ?? [];
      groups[category].push(item);
      return groups;
    }, {});
  }, [items]);

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = listenToPersonalPackingItems(
      selectedParticipantId,
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
  }, [selectedParticipantId]);

  async function handleSeed() {
    setIsSeeding(true);
    setError("");

    try {
      await seedPersonalPackingItems(selectedParticipantId, initialPersonalPacking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה באתחול ציוד אישי");
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleAddItem() {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    const optimisticItem: PersonalPackingItem = {
      id: `optimistic-${Date.now()}`,
      name: trimmedName,
      packed: false,
      category: newItemCategory.trim() || "כללי",
      required: isRequired,
      createdAt: Date.now(),
    };

    setItems((current) => [optimisticItem, ...current]);

    try {
      await addPersonalPackingItem(selectedParticipantId, {
        name: trimmedName,
        packed: false,
        category: newItemCategory.trim() || "כללי",
        required: isRequired,
        createdAt: Date.now(),
      });

      setNewItemName("");
      setNewItemCategory("כללי");
      setIsRequired(true);
    } catch (err) {
      setItems((current) => current.filter((item) => item.id !== optimisticItem.id));
      setError(err instanceof Error ? err.message : "שגיאה בהוספת פריט אישי");
    }
  }

  async function togglePacked(item: PersonalPackingItem) {
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, packed: !currentItem.packed }
          : currentItem
      )
    );

    try {
      await updatePersonalPackingItem(selectedParticipantId, item.id, {
        packed: !item.packed,
      });
    } catch (err) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, packed: item.packed }
            : currentItem
        )
      );
      setError(err instanceof Error ? err.message : "שגיאה בסימון פריט");
    }
  }

  async function removeItem(item: PersonalPackingItem) {
    const confirmed = window.confirm(`למחוק את "${item.name}" מהרשימה של ${selectedParticipant?.name}?`);
    if (!confirmed) return;

    const previousItems = items;
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));

    try {
      await deletePersonalPackingItem(selectedParticipantId, item.id);
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "שגיאה במחיקת פריט אישי");
    }
  }

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>ציוד אישי</h2>
        <span>כל משתתף מסמן לעצמו מה כבר נארז</span>
      </div>

      <div className="personalPackingHeader">
        <label>
          <span>בחר משתתף</span>
          <select value={selectedParticipantId} onChange={(event) => setSelectedParticipantId(event.target.value)}>
            {participants.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>

        <div className="progressCard">
          <strong>{progress}%</strong>
          <span>{packedCount} מתוך {items.length} נארזו</span>
          <div className="progressTrack">
            <div className="progressFill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="notice errorNotice">
          <strong>שגיאת Firebase:</strong>
          <span>{error}</span>
        </div>
      )}

      {isLoading && <div className="notice">טוען ציוד אישי...</div>}

      {!isLoading && items.length === 0 && (
        <div className="emptyState">
          <h3>אין עדיין רשימת ציוד אישית עבור {selectedParticipant?.name}</h3>
          <p>לחיצה אחת תיצור את רשימת הבסיס האישית בענן.</p>
          <button className="primaryButton" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? "מאתחל..." : "🚀 אתחל ציוד אישי"}
          </button>
        </div>
      )}

      <div className="addItemCard">
        <h3>הוסף פריט אישי</h3>
        <div className="addItemGrid personalAddGrid">
          <input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder="שם הפריט, למשל כפפות" />
          <input value={newItemCategory} onChange={(event) => setNewItemCategory(event.target.value)} placeholder="קטגוריה, למשל לבוש" />
          <label className="requiredToggle">
            <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
            חובה
          </label>
          <button className="primaryButton" onClick={handleAddItem}>הוסף</button>
        </div>
      </div>

      <div className="personalPackingGroups">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <div key={category} className="personalCategory">
            <h3>{category}</h3>
            <div className="list">
              {categoryItems.map((item) => (
                <div key={item.id} className="listItem editableListItem">
                  <label className="checkboxLine">
                    <input type="checkbox" checked={item.packed} onChange={() => togglePacked(item)} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.packed ? "נארז" : "עדיין לא נארז"} · {item.required ? "חובה" : "אופציונלי"}</small>
                    </div>
                  </label>
                  <button className="deleteButton" onClick={() => removeItem(item)}>מחק</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PersonalPacking;
