import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { LiveNotes } from "../types";

const tripId = "dolomites-2026";

function getLiveNotesPath(entityId: string) {
  return `trips/${tripId}/liveNotes/${entityId}`;
}

function getCacheKey(entityId: string) {
  return `familyTrips:${tripId}:liveNotes:${entityId}`;
}

function loadCachedNotes(entityId: string): LiveNotes {
  try {
    const raw = localStorage.getItem(getCacheKey(entityId));
    return raw ? (JSON.parse(raw) as LiveNotes) : {};
  } catch {
    return {};
  }
}

function saveCachedNotes(entityId: string, notes: LiveNotes) {
  try {
    localStorage.setItem(getCacheKey(entityId), JSON.stringify(notes));
  } catch {
    // Firebase remains the source of truth.
  }
}

export function listenToLiveNotes(entityId: string, onChange: (notes: LiveNotes) => void, onError: (message: string) => void): Unsubscribe {
  const cached = loadCachedNotes(entityId);
  onChange(cached);

  return onSnapshot(
    doc(db, getLiveNotesPath(entityId)),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(cached);
        return;
      }
      const data = snapshot.data() as LiveNotes;
      saveCachedNotes(entityId, data);
      onChange(data);
    },
    (error) => onError(error.message)
  );
}

export async function saveLiveNote(entityId: string, key: string, value: string) {
  const current = loadCachedNotes(entityId);
  const next = { ...current, [key]: value, updatedAt: String(Date.now()) };
  saveCachedNotes(entityId, next);
  await setDoc(doc(db, getLiveNotesPath(entityId)), next, { merge: true });
}
