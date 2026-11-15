/**
 * Merging progress from two devices.
 *
 * Say you finish units 1-3 on your phone (offline) and units 4-5 on your
 * laptop. When both sync, you should have all five, not whichever device
 * synced last. So instead of "last save wins", we combine the two:
 *
 *   - units: keep every unit done on either device, and the best result for each
 *   - XP: worked out again from the units (so it can never double-count)
 *   - badges: keep all of them, with the earliest date
 *   - streak: take the device that learned most recently, and the longest streak ever
 *
 * Merging is "order doesn't matter": merge(a, b) gives the same result as
 * merge(b, a), and merging the same data twice changes nothing. That makes
 * syncing safe to repeat, which matters on unreliable connections.
 */

import { PROGRESS_VERSION, type ProgressState, type UnitRecord } from "@/lib/gamification/progress";
import type { StreakState } from "@/lib/gamification/streak";

const earlier = (a: string, b: string) => (a <= b ? a : b);
const later = (a: string, b: string) => (a >= b ? a : b);

function mergeUnit(a: UnitRecord | undefined, b: UnitRecord | undefined): UnitRecord {
  if (!a) return b!;
  if (!b) return a;
  return {
    firstCompletedAt: earlier(a.firstCompletedAt, b.firstCompletedAt),
    lastCompletedAt: later(a.lastCompletedAt, b.lastCompletedAt),
    completions: Math.max(a.completions, b.completions),
    fewestHints: Math.min(a.fewestHints, b.fewestHints),
    xpEarned: Math.max(a.xpEarned, b.xpEarned),
  };
}

function mergeStreak(a: StreakState, b: StreakState): StreakState {
  const aDay = a.lastActiveDay ?? "";
  const bDay = b.lastActiveDay ?? "";
  // The device that learned most recently knows the current streak.
  let newest = aDay > bDay ? a : bDay > aDay ? b : a.current >= b.current ? a : b;
  // Same day on both devices: keep the bigger numbers.
  if (aDay === bDay) newest = { ...newest, current: Math.max(a.current, b.current), freezes: Math.min(a.freezes, b.freezes) };
  return {
    ...newest,
    longest: Math.max(a.longest, b.longest, newest.current),
    lastFreezeGrantWeek: later(a.lastFreezeGrantWeek ?? "", b.lastFreezeGrantWeek ?? "") || null,
  };
}

export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const units: Record<string, UnitRecord> = {};
  for (const key of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    units[key] = mergeUnit(a.units[key], b.units[key]);
  }

  const badges: Record<string, string> = {};
  for (const id of new Set([...Object.keys(a.badges), ...Object.keys(b.badges)])) {
    badges[id] = a.badges[id] && b.badges[id] ? earlier(a.badges[id], b.badges[id]) : (a.badges[id] ?? b.badges[id]);
  }

  return {
    version: PROGRESS_VERSION,
    xp: Object.values(units).reduce((sum, u) => sum + u.xpEarned, 0),
    units,
    badges,
    streak: mergeStreak(a.streak, b.streak),
  };
}

/** True if two progress states hold the same information. */
export function sameProgress(a: ProgressState, b: ProgressState): boolean {
  const canonical = (p: ProgressState) =>
    JSON.stringify(p, (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)))
        : value,
    );
  return canonical(a) === canonical(b);
}
