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

function getCollectionPath(collectionName: string) {
  return `trips/${tripId}/${collectionName}`;
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
  const cachedItems = memoryCache[collectionName];

  if (cachedItems) {
    onChange(cachedItems);
  }

  return onSnapshot(
    collection(db, getCollectionPath(collectionName)),
    (snapshot) => {
      const items = sortItems(
        snapshot.docs.map((document) =>
          normalizeItem(document.id, document.data())
        )
      );

      memoryCache[collectionName] = items;
      onChange(items);
    },
    (error) => {
      console.error("[Firebase Error]", error);
      onError(error.message);
    }
  );
}

export async function seedChecklistItems(
  collectionName: string,
  initialItems: InitialChecklistItem[]
): Promise<void> {
  await Promise.all(
    initialItems.map((item, index) =>
      setDoc(doc(db, getCollectionPath(collectionName), item.id), {
        name: item.name,
        owner: item.owner,
        done: item.done,
        details: item.details ?? "",
        createdAt: Date.now() + index,
      })
    )
  );
}

export async function addChecklistItem(
  collectionName: string,
  item: Omit<SharedChecklistItem, "id">
): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await setDoc(doc(db, getCollectionPath(collectionName), id), {
    name: item.name,
    owner: item.owner,
    done: item.done,
    details: item.details ?? "",
    createdAt: Date.now(),
  });
}

export async function updateChecklistItem(
  collectionName: string,
  id: string,
  updates: Partial<Omit<SharedChecklistItem, "id">>
): Promise<void> {
  await updateDoc(doc(db, getCollectionPath(collectionName), id), updates);
}

export async function deleteChecklistItem(
  collectionName: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, getCollectionPath(collectionName), id));
}