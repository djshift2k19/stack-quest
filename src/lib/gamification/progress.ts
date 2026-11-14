/**
 * The progress engine.
 *
 * `ProgressState` is everything Stack Quest remembers about you. The
 * function `completeUnit` takes the old state plus "you just finished this
 * unit" and returns the new state plus a list of things to celebrate.
 *
 * It's a "pure function": the same inputs always give the same outputs,
 * and it changes nothing else. That makes it easy to test, and it means
 * saving to storage can live somewhere else (see src/lib/progress/).
 */

import type { Catalog } from "@/lib/content/catalog";
import { findModuleForUnit } from "@/lib/content/catalog";
import { qualifiedBadgeIds } from "./badges";
import { displayedStreak, earnFreeze, initialStreak, recordActivity, type StreakState } from "./streak";
import { levelFromXp, xpForCompletion } from "./xp";

export const PROGRESS_VERSION = 1;

export interface UnitRecord {
  firstCompletedAt: string;
  lastCompletedAt: string;
  /** How many times the unit has been completed. */
  completions: number;
  /** The fewest hints used in any completion. */
  fewestHints: number;
  /** The most XP earned from this unit (only the best attempt counts). */
  xpEarned: number;
}

export interface ProgressState {
  version: typeof PROGRESS_VERSION;
  xp: number;
  units: Record<string, UnitRecord>;
  /** badge id -> when it was earned (ISO date text) */
  badges: Record<string, string>;
  streak: StreakState;
}

export const initialProgress: ProgressState = {
  version: PROGRESS_VERSION,
  xp: 0,
  units: {},
  badges: {},
  streak: initialStreak,
};

export interface CompletionInput {
  unitKey: string;
  baseXp: number;
  /** Hints used on a challenge. Leave out for units with no hints (readings). */
  hintsUsed?: number;
}

export type Celebration =
  | { kind: "xp"; amount: number; noHintBonus: boolean }
  | { kind: "level-up"; level: number }
  | { kind: "badge"; badgeId: string }
  | { kind: "streak"; current: number }
  | { kind: "freeze-used"; count: number }
  | { kind: "freeze-earned" };

export function completeUnit(
  state: ProgressState,
  input: CompletionInput,
  catalog: Catalog,
  now: Date,
): { state: ProgressState; celebrations: Celebration[] } {
  const celebrations: Celebration[] = [];
  const nowIso = now.toISOString();
  const previous = state.units[input.unitKey];

  // 1. XP: only the best attempt counts, so a retry can add XP but never removes it.
  const earned = xpForCompletion(input.baseXp, input.hintsUsed);
  const xpGain = Math.max(0, earned - (previous?.xpEarned ?? 0));
  if (xpGain > 0) {
    celebrations.push({ kind: "xp", amount: xpGain, noHintBonus: input.hintsUsed === 0 });
  }

  const units = {
    ...state.units,
    [input.unitKey]: {
      firstCompletedAt: previous?.firstCompletedAt ?? nowIso,
      lastCompletedAt: nowIso,
      completions: (previous?.completions ?? 0) + 1,
      fewestHints: Math.min(previous?.fewestHints ?? Infinity, input.hintsUsed ?? 0),
      xpEarned: Math.max(previous?.xpEarned ?? 0, earned),
    },
  };

  const xp = state.xp + xpGain;
  const oldLevel = levelFromXp(state.xp);
  const newLevel = levelFromXp(xp);
  if (newLevel > oldLevel) celebrations.push({ kind: "level-up", level: newLevel });

  // 2. Streak.
  const streakResult = recordActivity(state.streak, now);
  let streak = streakResult.streak;
  for (const e of streakResult.events) {
    if (e.kind === "freeze-used") celebrations.push({ kind: "freeze-used", count: e.count });
    if (e.kind === "streak-extended" || e.kind === "streak-started") {
      celebrations.push({ kind: "streak", current: streak.current });
    }
  }

  // 3. Badges: award any newly qualified ones.
  const badges = { ...state.badges };
  const qualified = qualifiedBadgeIds(catalog, {
    completedUnitKeys: new Set(Object.keys(units)),
    level: newLevel,
    streak: displayedStreak(streak, now),
  });
  for (const id of qualified) {
    if (!badges[id]) {
      badges[id] = nowIso;
      celebrations.push({ kind: "badge", badgeId: id });
    }
  }

  // 4. Finishing a module for the first time earns a bonus streak freeze.
  const location = findModuleForUnit(catalog, input.unitKey);
  if (location && qualified.includes(`module:${location.module.key}`) && !state.badges[`module:${location.module.key}`]) {
    const before = streak.freezes;
    streak = earnFreeze(streak);
    if (streak.freezes > before) celebrations.push({ kind: "freeze-earned" });
  }

  return {
    state: { version: PROGRESS_VERSION, xp, units, badges, streak },
    celebrations,
  };
}

/**
 * Make sure data loaded from storage has the shape we expect. Old or damaged
 * data falls back to safe defaults instead of crashing the app.
 */
export function normaliseProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== "object") return initialProgress;
  const r = raw as Partial<ProgressState>;
  if (r.version !== PROGRESS_VERSION) return initialProgress;
  return {
    version: PROGRESS_VERSION,
    xp: typeof r.xp === "number" ? r.xp : 0,
    units: r.units && typeof r.units === "object" ? r.units : {},
    badges: r.badges && typeof r.badges === "object" ? r.badges : {},
    streak: { ...initialStreak, ...(r.streak ?? {}) },
  };
}
