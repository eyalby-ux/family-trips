import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { InitialPersonalPackingItem, PersonalPackingItem } from "../types";

const tripId = "dolomites-2026";
const memoryCache: Record<string, PersonalPackingItem[]> = {};

function getPersonalPackingPath(participantId: string) {
  return `trips/${tripId}/personalPacking/${participantId}/items`;
}

function getCacheKey(participantId: string) {
  return `familyTrips:${tripId}:personalPacking:${participantId}`;
}

function loadCachedItems(participantId: string): PersonalPackingItem[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(participantId));
    return raw ? (JSON.parse(raw) as PersonalPackingItem[]) : null;
  } catch {
    return null;
  }
}

function saveCachedItems(participantId: string, items: PersonalPackingItem[]) {
  try {
    localStorage.setItem(getCacheKey(participantId), JSON.stringify(items));
  } catch {
    // Firebase remains the source of truth.
  }
}

function normalizeItem(id: string, data: Record<string, unknown>): PersonalPackingItem {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "פריט ללא שם",
    packed: typeof data.packed === "boolean" ? data.packed : false,
    category: typeof data.category === "string" ? data.category : "כללי",
    required: typeof data.required === "boolean" ? data.required : true,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

function sortItems(items: PersonalPackingItem[]) {
  return [...items].sort((a, b) => {
    if (a.packed !== b.packed) return a.packed ? 1 : -1;
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.category.localeCompare(b.category, "he") || a.name.localeCompare(b.name, "he");
  });
}

export function listenToPersonalPackingItems(
  participantId: string,
  onChange: (items: PersonalPackingItem[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const cachedItems = memoryCache[participantId] ?? loadCachedItems(participantId);

  if (cachedItems) {
    memoryCache[participantId] = cachedItems;
    onChange(cachedItems);
  }

  return onSnapshot(
    collection(db, getPersonalPackingPath(participantId)),
    (snapshot) => {
      const items = sortItems(
        snapshot.docs.map((document) => normalizeItem(document.id, document.data()))
      );

      memoryCache[participantId] = items;
      saveCachedItems(participantId, items);
      onChange(items);
    },
    (error) => onError(error.message)
  );
}

export async function seedPersonalPackingItems(
  participantId: string,
  initialItems: InitialPersonalPackingItem[]
): Promise<void> {
  await Promise.all(
    initialItems.map((item, index) =>
      setDoc(doc(db, getPersonalPackingPath(participantId), item.id), {
        name: item.name,
        packed: false,
        category: item.category,
        required: item.required,
        createdAt: Date.now() + index,
      })
    )
  );
}

export async function addPersonalPackingItem(
  participantId: string,
  item: Omit<PersonalPackingItem, "id">
): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await setDoc(doc(db, getPersonalPackingPath(participantId), id), {
    name: item.name,
    packed: item.packed,
    category: item.category,
    required: item.required,
    createdAt: Date.now(),
  });
}

export async function updatePersonalPackingItem(
  participantId: string,
  id: string,
  updates: Partial<Omit<PersonalPackingItem, "id">>
): Promise<void> {
  await updateDoc(doc(db, getPersonalPackingPath(participantId), id), updates);
}

export async function deletePersonalPackingItem(
  participantId: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, getPersonalPackingPath(participantId), id));
}
