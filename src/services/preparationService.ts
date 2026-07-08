import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { PreparationTaskState } from "../types";
const tripId = "dolomites-2026";
function getDocPath(taskId: string) { return `trips/${tripId}/preparations/${taskId}`; }
function getCacheKey(taskId: string) { return `familyTrips:${tripId}:preparations:${taskId}`; }
function loadCachedState(taskId: string): PreparationTaskState { try { const raw = localStorage.getItem(getCacheKey(taskId)); return raw ? JSON.parse(raw) as PreparationTaskState : { taskId }; } catch { return { taskId }; } }
function saveCachedState(taskId: string, state: PreparationTaskState) { try { localStorage.setItem(getCacheKey(taskId), JSON.stringify(state)); } catch {} }
export function listenToPreparationTask(taskId: string, onChange: (state: PreparationTaskState) => void, onError: (message: string) => void): Unsubscribe {
  const cached = loadCachedState(taskId); onChange(cached);
  return onSnapshot(doc(db, getDocPath(taskId)), (snapshot) => { if (!snapshot.exists()) { onChange(cached); return; } const state = { taskId, ...(snapshot.data() as Omit<PreparationTaskState, "taskId">) }; saveCachedState(taskId, state); onChange(state); }, (error) => onError(error.message));
}
export async function savePreparationTaskState(taskId: string, updates: Partial<PreparationTaskState>) {
  const current = loadCachedState(taskId);
  const next: PreparationTaskState = { ...current, ...updates, taskId, fields: { ...(current.fields ?? {}), ...(updates.fields ?? {}) }, participants: { ...(current.participants ?? {}), ...(updates.participants ?? {}) }, updatedAt: Date.now() };
  saveCachedState(taskId, next); await setDoc(doc(db, getDocPath(taskId)), next, { merge: true });
}
