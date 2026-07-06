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
import type { InitialChecklistItem, SharedChecklistItem } from "../types";

const tripId = "dolomites-2026";
const memoryCache: Record<string, SharedChecklistItem[]> = {};
const activeListeners: Record<string, number> = {};

function debugLog(...args: unknown[]) {
  console.log("[LISTS-DEBUG]", ...args);
}

function getCollectionPath(collectionName: string) {
  return `trips/${tripId}/${collectionName}`;
}

function getCacheKey(collectionName: string) {
  return `familyTrips:${tripId}:${collectionName}`;
}

function loadCachedItems(collectionName: string): SharedChecklistItem[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(collectionName));
    const items = raw ? (JSON.parse(raw) as SharedChecklistItem[]) : null;
    debugLog("load localStorage", {
      collectionName,
      count: items?.length ?? 0,
      key: getCacheKey(collectionName),
    });
    return items;
  } catch (error) {
    debugLog("load localStorage failed", { collectionName, error });
    return null;
  }
}

function saveCachedItems(collectionName: string, items: SharedChecklistItem[]) {
  try {
    localStorage.setItem(getCacheKey(collectionName), JSON.stringify(items));
    debugLog("save localStorage", {
      collectionName,
      count: items.length,
      key: getCacheKey(collectionName),
    });
  } catch (error) {
    debugLog("save localStorage failed", { collectionName, error });
  }
}

function normalizeItem(id: string, data: Record<string, unknown>): SharedChecklistItem {
  const legacyPacked = typeof data.packed === "boolean" ? data.packed : undefined;

  return {
    id,
    name: typeof data.name === "string" ? data.name : "פריט ללא שם",
    owner: typeof data.owner === "string" ? data.owner : "לא שובץ",
    done:
      typeof data.done === "boolean"
        ? data.done
        : legacyPacked !== undefined
          ? legacyPacked
          : false,
    details:
      typeof data.details === "string"
        ? data.details
        : typeof data.note === "string"
          ? data.note
          : typeof data.quantity === "string"
            ? data.quantity
            : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

function sortItems(items: SharedChecklistItem[]) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.name.localeCompare(b.name, "he");
  });
}

export function listenToChecklistItems(
  collectionName: string,
  onChange: (items: SharedChecklistItem[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  const path = getCollectionPath(collectionName);
  activeListeners[collectionName] = (activeListeners[collectionName] ?? 0) + 1;

  debugLog("listener start", {
    collectionName,
    path,
    activeListeners: activeListeners[collectionName],
  });

  const cachedItems = memoryCache[collectionName] ?? loadCachedItems(collectionName);

  if (cachedItems) {
    memoryCache[collectionName] = cachedItems;
    debugLog("emit cached items", {
      collectionName,
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
        collectionName,
        path,
        docs: snapshot.docs.length,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        ids: items.map((item) => item.id),
      });

      memoryCache[collectionName] = items;
      saveCachedItems(collectionName, items);
      onChange(items);
    },
    (error) => {
      debugLog("snapshot error", { collectionName, path, error });
      onError(error.message);
    }
  );

  return () => {
    activeListeners[collectionName] = Math.max((activeListeners[collectionName] ?? 1) - 1, 0);
    debugLog("listener stop", {
      collectionName,
      path,
      activeListeners: activeListeners[collectionName],
    });
    unsubscribe();
  };
}

export async function seedChecklistItems(
  collectionName: string,
  initialItems: InitialChecklistItem[]
): Promise<void> {
  const path = getCollectionPath(collectionName);

  debugLog("seed start", {
    collectionName,
    path,
    count: initialItems.length,
    ids: initialItems.map((item) => item.id),
  });

  await Promise.all(
    initialItems.map((item, index) =>
      setDoc(doc(db, path, item.id), {
        name: item.name,
        owner: item.owner,
        done: item.done,
        details: item.details ?? "",
        createdAt: Date.now() + index,
      })
    )
  );

  debugLog("seed done", { collectionName, path });
}

export async function addChecklistItem(
  collectionName: string,
  item: Omit<SharedChecklistItem, "id">
): Promise<void> {
  const path = getCollectionPath(collectionName);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  debugLog("add item start", {
    collectionName,
    path,
    id,
    item,
  });

  await setDoc(doc(db, path, id), {
    name: item.name,
    owner: item.owner,
    done: item.done,
    details: item.details ?? "",
    createdAt: Date.now(),
  });

  debugLog("add item done", {
    collectionName,
    path,
    id,
  });
}

export async function updateChecklistItem(
  collectionName: string,
  id: string,
  updates: Partial<Omit<SharedChecklistItem, "id">>
): Promise<void> {
  const path = getCollectionPath(collectionName);

  debugLog("update item start", {
    collectionName,
    path,
    id,
    updates,
  });

  await updateDoc(doc(db, path, id), updates);

  debugLog("update item done", {
    collectionName,
    path,
    id,
  });
}

export async function deleteChecklistItem(
  collectionName: string,
  id: string
): Promise<void> {
  const path = getCollectionPath(collectionName);

  debugLog("delete item start", {
    collectionName,
    path,
    id,
  });

  await deleteDoc(doc(db, path, id));

  debugLog("delete item done", {
    collectionName,
    path,
    id,
  });
}
