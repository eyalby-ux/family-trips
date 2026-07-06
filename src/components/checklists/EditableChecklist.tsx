import { useEffect, useState } from "react";
import { participants } from "../../data/tripData";
import {
  addChecklistItem,
  deleteChecklistItem,
  listenToChecklistItems,
  seedChecklistItems,
  updateChecklistItem,
} from "../../services/checklistService";
import type { InitialChecklistItem, SharedChecklistItem } from "../../types";

type EditableChecklistProps = {
  title: string;
  subtitle: string;
  collectionName: string;
  initialItems: InitialChecklistItem[];
  addButtonLabel: string;
  itemNamePlaceholder: string;
  detailsPlaceholder: string;
  seedButtonLabel: string;
};

function EditableChecklist({
  title,
  subtitle,
  collectionName,
  initialItems,
  addButtonLabel,
  itemNamePlaceholder,
  detailsPlaceholder,
  seedButtonLabel,
}: EditableChecklistProps) {
  const [items, setItems] = useState<SharedChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemOwner, setNewItemOwner] = useState("לא שובץ");
  const [newItemDetails, setNewItemDetails] = useState("");

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = listenToChecklistItems(
      collectionName,
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
  }, [collectionName]);

  async function handleSeed() {
    setIsSeeding(true);
    setError("");

    try {
      await seedChecklistItems(collectionName, initialItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה באתחול הרשימה");
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleAddItem() {
    const trimmedName = newItemName.trim();

    if (!trimmedName) return;

    const optimisticItem: SharedChecklistItem = {
      id: `optimistic-${Date.now()}`,
      name: trimmedName,
      owner: newItemOwner,
      done: false,
      details: newItemDetails.trim(),
      createdAt: Date.now(),
    };

    setItems((current) => [optimisticItem, ...current]);

    try {
      await addChecklistItem(collectionName, {
        name: trimmedName,
        owner: newItemOwner,
        done: false,
        details: newItemDetails.trim(),
        createdAt: Date.now(),
      });

      setNewItemName("");
      setNewItemOwner("לא שובץ");
      setNewItemDetails("");
    } catch (err) {
      setItems((current) => current.filter((item) => item.id !== optimisticItem.id));
      setError(err instanceof Error ? err.message : "שגיאה בהוספת פריט");
    }
  }

  async function toggleDone(item: SharedChecklistItem) {
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, done: !currentItem.done } : currentItem
      )
    );

    try {
      await updateChecklistItem(collectionName, item.id, { done: !item.done });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון פריט");
    }
  }

  async function changeOwner(item: SharedChecklistItem, owner: string) {
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, owner } : currentItem
      )
    );

    try {
      await updateChecklistItem(collectionName, item.id, { owner });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בעדכון אחראי");
    }
  }

  async function removeItem(item: SharedChecklistItem) {
    const confirmed = window.confirm(`למחוק את "${item.name}"?`);

    if (!confirmed) return;

    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));

    try {
      await deleteChecklistItem(collectionName, item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת פריט");
    }
  }

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>

      {error && (
        <div className="notice errorNotice">
          <strong>שגיאת Firebase:</strong>
          <span>{error}</span>
        </div>
      )}

      {isLoading && <div className="notice">טוען רשימה...</div>}

      {!isLoading && items.length === 0 && (
        <div className="emptyState">
          <h3>הרשימה עדיין ריקה</h3>
          <p>לחיצה אחת תיצור את רשימת הבסיס בענן.</p>
          <button className="primaryButton" onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? "מאתחל..." : seedButtonLabel}
          </button>
        </div>
      )}

      <div className="addItemCard">
        <h3>{addButtonLabel}</h3>

        <div className="addItemGrid">
          <input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder={itemNamePlaceholder} />
          <input value={newItemDetails} onChange={(event) => setNewItemDetails(event.target.value)} placeholder={detailsPlaceholder} />

          <select value={newItemOwner} onChange={(event) => setNewItemOwner(event.target.value)}>
            <option value="לא שובץ">לא שובץ</option>
            {participants.map((person) => (
              <option key={person.id} value={person.name}>{person.name}</option>
            ))}
          </select>

          <button className="primaryButton" onClick={handleAddItem}>הוסף</button>
        </div>
      </div>

      <div className="list">
        {items.map((item) => (
          <div key={item.id} className="listItem editableListItem">
            <label className="checkboxLine">
              <input type="checkbox" checked={item.done} onChange={() => toggleDone(item)} />
              <div>
                <strong>{item.name}</strong>
                <small>{item.done ? "בוצע" : "פתוח"}{item.details ? ` · ${item.details}` : ""}</small>
              </div>
            </label>

            <div className="itemActions">
              <select value={item.owner} onChange={(event) => changeOwner(item, event.target.value)} aria-label={`אחראי על ${item.name}`}>
                <option value="לא שובץ">לא שובץ</option>
                {participants.map((person) => (
                  <option key={person.id} value={person.name}>{person.name}</option>
                ))}
              </select>

              <button className="deleteButton" onClick={() => removeItem(item)}>מחק</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EditableChecklist;
