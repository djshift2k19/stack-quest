"use client";

/**
 * Shares your progress with every screen.
 *
 * A React "context" is like the building's noticeboard: the provider pins
 * the latest progress up once, and any component can read it with
 * `useProgress()` instead of each one fetching it separately.
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
import { clearProgress, loadProgress, saveProgress } from "./storage";

interface ProgressContextValue {
  catalog: Catalog;
  state: ProgressState;
  /** False until saved progress has been read from storage. */
  loaded: boolean;
  /** False if the browser won't let us save (e.g. some private modes). */
  persistent: boolean;
  completeUnit: (input: CompletionInput) => Promise<Celebration[]>;
  resetProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(initialProgress);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(true);
  // Keep the newest state in a ref so two quick clicks never overwrite each other.
  const latest = useRef(state);

  useEffect(() => {
    let cancelled = false;
    loadProgress().then((result) => {
      if (cancelled) return;
      latest.current = result.state;
      setState(result.state);
      setPersistent(result.persistent);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeUnit = useCallback(
    async (input: CompletionInput) => {
      const result = applyCompletion(latest.current, input, catalog, new Date());
      latest.current = result.state;
      setState(result.state);
      setPersistent(await saveProgress(result.state));
      return result.celebrations;
    },
    [catalog],
  );

  const resetProgress = useCallback(async () => {
    await clearProgress();
    latest.current = initialProgress;
    setState(initialProgress);
  }, []);

  const value = useMemo(
    () => ({ catalog, state, loaded, persistent, completeUnit, resetProgress }),
    [catalog, state, loaded, persistent, completeUnit, resetProgress],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside <ProgressProvider>");
  return value;
}
