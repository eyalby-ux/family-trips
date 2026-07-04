import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { initialPacking } from "../data/tripData";
import type { PackingItem } from "../types";

const packingCollectionPath = "trips/dolomites-2026/packing";

export function listenToPackingItems(
  onChange: (items: PackingItem[]) => void,
  onError: (message: string) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, packingCollectionPath),
    (snapshot) => {
      const items = snapshot.docs
        .map((document) => ({
          id: document.id,
          ...(document.data() as Omit<PackingItem, "id">),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "he"));

      onChange(items);
    },
    (error) => {
      onError(error.message);
    }
  );
}

export async function seedPackingItems(): Promise<void> {
  await Promise.all(
    initialPacking.map((item) =>
      setDoc(doc(db, packingCollectionPath, item.id), {
        name: item.name,
        owner: item.owner,
        packed: item.packed,
        note: item.note ?? "",
      })
    )
  );
}

export async function updatePackingItem(
  id: string,
  updates: Partial<Omit<PackingItem, "id">>
): Promise<void> {
  await updateDoc(doc(db, packingCollectionPath, id), updates);
}
