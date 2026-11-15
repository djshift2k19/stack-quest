"use client";

/**
 * Shares your progress with every screen.
 *
 * A React "context" is like the building's noticeboard: the provider pins
 * the latest progress up once, and any component can read it with
 * `useProgress()` instead of each one fetching it separately.
 *
 * Progress is always saved on this device first (so it works offline).
 * If you're signed in, it's also synced online: when the app opens, a
 * moment after you finish a unit, and when your connection comes back.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Catalog } from "@/lib/content/catalog";
import {
  completeUnit as applyCompletion,
  initialProgress,
  type Celebration,
  type CompletionInput,
  type ProgressState,
} from "@/lib/gamification/progress";
import { mergeProgress, sameProgress } from "@/lib/sync/merge";
import { hasStoredSession, supabaseConfigured } from "@/lib/sync/supabase";
import { overwriteOnline, syncWithServer } from "@/lib/sync/syncEngine";
import { clearProgress, loadProgress, saveProgress } from "./storage";

export type SyncStatus =
  | { kind: "off" } // not signed in (or accounts not set up)
  | { kind: "syncing" }
  | { kind: "synced"; at: string }
  | { kind: "offline" }
  | { kind: "error"; message: string };

interface ProgressContextValue {
  catalog: Catalog;
  state: ProgressState;
  /** False until saved progress has been read from storage. */
  loaded: boolean;
  /** False if the browser won't let us save (e.g. some private modes). */
  persistent: boolean;
  completeUnit: (input: CompletionInput) => Promise<Celebration[]>;
  resetProgress: () => Promise<void>;
  /** The signed-in account, if any. */
  account: { email: string } | null;
  sync: SyncStatus;
  /** Sync now (also call after signing in or out). */
  syncNow: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);
const SYNC_DELAY_MS = 2000;

export function ProgressProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(initialProgress);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ kind: "off" });
  // Keep the newest state in a ref so two quick clicks never overwrite each other.
  const latest = useRef(state);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lets the timer below call the newest syncNow without the two depending on each other.
  const syncRef = useRef<() => Promise<void>>(async () => {});

  /** Sync a moment from now (so several quick changes become one sync). */
  const scheduleSync = useCallback(() => {
    if (!supabaseConfigured || !hasStoredSession()) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void syncRef.current(), SYNC_DELAY_MS);
  }, []);

  const syncNow = useCallback(async () => {
    if (!supabaseConfigured || !hasStoredSession()) {
      setAccount(null);
      setSync({ kind: "off" });
      return;
    }
    if (!navigator.onLine) {
      setSync({ kind: "offline" });
      return;
    }
    setSync({ kind: "syncing" });
    try {
      const result = await syncWithServer(latest.current);
      if (!result) {
        setAccount(null);
        setSync({ kind: "off" });
        return;
      }
      setAccount({ email: result.email });
      // Something may have been completed while we were syncing: keep that too.
      const final = mergeProgress(latest.current, result.merged);
      if (!sameProgress(final, latest.current)) {
        latest.current = final;
        setState(final);
        await saveProgress(final);
      }
      setSync({ kind: "synced", at: new Date().toISOString() });
      if (!sameProgress(final, result.merged)) scheduleSync();
    } catch (err) {
      setSync({ kind: "error", message: (err as Error).message });
    }
  }, [scheduleSync]);

  useEffect(() => {
    syncRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((result) => {
      if (cancelled) return;
      latest.current = result.state;
      setState(result.state);
      setPersistent(result.persistent);
      setLoaded(true);
      void syncNow();
    });
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [syncNow]);

  const completeUnit = useCallback(
    async (input: CompletionInput) => {
      const result = applyCompletion(latest.current, input, catalog, new Date());
      latest.current = result.state;
      setState(result.state);
      setPersistent(await saveProgress(result.state));
      scheduleSync();
      return result.celebrations;
    },
    [catalog, scheduleSync],
  );

  const resetProgress = useCallback(async () => {
    await clearProgress();
    latest.current = initialProgress;
    setState(initialProgress);
    // Signed in? Reset the online copy too, or the next sync would bring everything back.
    if (account && navigator.onLine) {
      try {
        await overwriteOnline(initialProgress);
      } catch (err) {
        setSync({ kind: "error", message: (err as Error).message });
      }
    }
  }, [account]);

  const value = useMemo(
    () => ({ catalog, state, loaded, persistent, completeUnit, resetProgress, account, sync, syncNow }),
    [catalog, state, loaded, persistent, completeUnit, resetProgress, account, sync, syncNow],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside <ProgressProvider>");
  return value;
}
