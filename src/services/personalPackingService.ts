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
const activeListeners: Record<string, number> = {};

function debugLog(...args: unknown[]) {
  console.log("[PERSONAL-PACKING-DEBUG]", ...args);
}

function getPersonalPackingPath(participantId: string) {
  return `trips/${tripId}/personalPacking/${participantId}/items`;
}

function getCacheKey(participantId: string) {
  return `familyTrips:${tripId}:personalPacking:${participantId}`;
}

function loadCachedItems(participantId: string): PersonalPackingItem[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(participantId));
    const items = raw ? (JSON.parse(raw) as PersonalPackingItem[]) : null;
    debugLog("load localStorage", {
      participantId,
      count: items?.length ?? 0,
      key: getCacheKey(participantId),
    });
    return items;
  } catch (error) {
    debugLog("load localStorage failed", { participantId, error });
    return null;
  }
}

function saveCachedItems(participantId: string, items: PersonalPackingItem[]) {
  try {
    localStorage.setItem(getCacheKey(participantId), JSON.stringify(items));
    debugLog("save localStorage", {
      participantId,
      count: items.length,
      key: getCacheKey(participantId),
    });
  } catch (error) {
    debugLog("save localStorage failed", { participantId, error });
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
  const path = getPersonalPackingPath(participantId);
  activeListeners[participantId] = (activeListeners[participantId] ?? 0) + 1;

  debugLog("listener start", {
    participantId,
    path,
    activeListeners: activeListeners[participantId],
  });

  const cachedItems = memoryCache[participantId] ?? loadCachedItems(participantId);

  if (cachedItems) {
    memoryCache[participantId] = cachedItems;
    debugLog("emit cached items", {
      participantId,
      count: cachedItems.length,
      ids: cachedItems.map((item) => item.id),
    });
    onChange(cachedItems);
  }

  const unsubscribe = onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = sortItems(
        snapshot.docs.map((document) => normalizeItem(document.id, document.data()))
      );

      debugLog("snapshot", {
        participantId,
        path,
        docs: snapshot.docs.length,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        ids: items.map((item) => item.id),
      });

      memoryCache[participantId] = items;
      saveCachedItems(participantId, items);
      onChange(items);
    },
    (error) => {
      debugLog("snapshot error", { participantId, path, error });
      onError(error.message);
    }
  );

  return () => {
    activeListeners[participantId] = Math.max((activeListeners[participantId] ?? 1) - 1, 0);
    debugLog("listener stop", {
      participantId,
      path,
      activeListeners: activeListeners[participantId],
    });
    unsubscribe();
  };
}

export async function seedPersonalPackingItems(
  participantId: string,
  initialItems: InitialPersonalPackingItem[]
): Promise<void> {
  const path = getPersonalPackingPath(participantId);

  debugLog("seed start", {
    participantId,
    path,
    count: initialItems.length,
    ids: initialItems.map((item) => item.id),
  });

  await Promise.all(
    initialItems.map((item, index) =>
      setDoc(doc(db, path, item.id), {
        name: item.name,
        packed: false,
        category: item.category,
        required: item.required,
        createdAt: Date.now() + index,
      })
    )
  );

  debugLog("seed done", { participantId, path });
}

export async function addPersonalPackingItem(
  participantId: string,
  item: Omit<PersonalPackingItem, "id">
): Promise<string> {
  const path = getPersonalPackingPath(participantId);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  debugLog("add item start", {
    participantId,
    path,
    id,
    item,
  });

  await setDoc(doc(db, path, id), {
    name: item.name,
    packed: item.packed,
    category: item.category,
    required: item.required,
    createdAt: Date.now(),
  });

  debugLog("add item done", {
    participantId,
    path,
    id,
  });

  return id;
}

export async function updatePersonalPackingItem(
  participantId: string,
  id: string,
  updates: Partial<Omit<PersonalPackingItem, "id">>
): Promise<void> {
  const path = getPersonalPackingPath(participantId);

  debugLog("update item start", {
    participantId,
    path,
    id,
    updates,
  });

  await updateDoc(doc(db, path, id), updates);

  debugLog("update item done", {
    participantId,
    path,
    id,
  });
}

export async function deletePersonalPackingItem(
  participantId: string,
  id: string
): Promise<void> {
  const path = getPersonalPackingPath(participantId);

  debugLog("delete item start", {
    participantId,
    path,
    id,
  });

  await deleteDoc(doc(db, path, id));

  debugLog("delete item done", {
    participantId,
    path,
    id,
  });
}
