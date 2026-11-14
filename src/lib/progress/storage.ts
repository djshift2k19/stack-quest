/**
 * Saving and loading your progress in the browser's built-in database,
 * IndexedDB.
 *
 * We keep one record, called "progress", in a store called "kv"
 * ("key-value": a name and the thing stored under that name).
 *
 * If IndexedDB isn't available (some private-browsing modes block it),
 * progress is kept in memory instead: everything still works, it just
 * isn't remembered after the tab closes.
 */

import { openDB, type IDBPDatabase } from "idb";
import { initialProgress, normaliseProgress, type ProgressState } from "@/lib/gamification/progress";

const DB_NAME = "stack-quest";
const STORE = "kv";
const KEY = "progress";

let dbPromise: Promise<IDBPDatabase> | null = null;
let memoryFallback: ProgressState = initialProgress;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

export async function loadProgress(): Promise<{ state: ProgressState; persistent: boolean }> {
  try {
    const raw = await (await getDb()).get(STORE, KEY);
    return { state: normaliseProgress(raw), persistent: true };
  } catch {
    return { state: memoryFallback, persistent: false };
  }
}

export async function saveProgress(state: ProgressState): Promise<boolean> {
  memoryFallback = state;
  try {
    await (await getDb()).put(STORE, state, KEY);
    return true;
  } catch {
    return false;
  }
}

export async function clearProgress(): Promise<void> {
  memoryFallback = initialProgress;
  try {
    await (await getDb()).delete(STORE, KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
}
