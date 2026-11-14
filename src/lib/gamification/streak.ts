/**
 * Daily streaks with a gentle "streak freeze".
 *
 * - Learn something on a day and that day counts towards your streak.
 * - Miss a day and a streak freeze (if you have one) covers it, so the
 *   streak survives.
 * - You get one free freeze each week, and earn one for finishing a module.
 *   You can hold at most MAX_FREEZES.
 * - If a streak does break, nothing is lost except the counter. Your XP,
 *   badges and longest streak stay.
 */

import { daysBetween, dayKey, weekKey } from "./dates";

export const MAX_FREEZES = 3;

export interface StreakState {
  current: number;
  longest: number;
  /** Day key of the last day you learned something, or null if never. */
  lastActiveDay: string | null;
  freezes: number;
  /** The week in which the weekly free freeze was last handed out. */
  lastFreezeGrantWeek: string | null;
}

export const initialStreak: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDay: null,
  freezes: 0,
  lastFreezeGrantWeek: null,
};

export type StreakEvent =
  | { kind: "streak-extended"; current: number }
  | { kind: "streak-started" }
  | { kind: "freeze-used"; count: number }
  | { kind: "freeze-granted" };

/** Call when the learner completes something. Returns the new streak. */
export function recordActivity(
  streak: StreakState,
  now: Date,
): { streak: StreakState; events: StreakEvent[] } {
  const today = dayKey(now);
  const events: StreakEvent[] = [];
  let next = { ...streak };

  // Weekly free freeze.
  const week = weekKey(today);
  if (next.lastFreezeGrantWeek !== week) {
    if (next.freezes < MAX_FREEZES) {
      next.freezes += 1;
      events.push({ kind: "freeze-granted" });
    }
    next.lastFreezeGrantWeek = week;
  }

  if (next.lastActiveDay === today) {
    return { streak: next, events }; // already counted today
  }

  if (next.lastActiveDay === null) {
    next.current = 1;
    events.push({ kind: "streak-started" });
  } else {
    const missedDays = daysBetween(next.lastActiveDay, today) - 1;
    if (missedDays <= 0) {
      next.current += 1;
      events.push({ kind: "streak-extended", current: next.current });
    } else if (missedDays <= next.freezes) {
      next.freezes -= missedDays;
      next.current += 1;
      events.push({ kind: "freeze-used", count: missedDays });
      events.push({ kind: "streak-extended", current: next.current });
    } else {
      next.current = 1;
      events.push({ kind: "streak-started" });
    }
  }

  next.lastActiveDay = today;
  next.longest = Math.max(next.longest, next.current);
  return { streak: next, events };
}

/** Earn a bonus freeze (for example, for finishing a module). */
export function earnFreeze(streak: StreakState): StreakState {
  return { ...streak, freezes: Math.min(MAX_FREEZES, streak.freezes + 1) };
}

/**
 * The streak to show right now. If too many days have been missed to be
 * covered by freezes, the streak is shown as 0 (ready to start again).
 */
export function displayedStreak(streak: StreakState, now: Date): number {
  if (!streak.lastActiveDay) return 0;
  const missedDays = daysBetween(streak.lastActiveDay, dayKey(now)) - 1;
  return missedDays <= streak.freezes ? streak.current : 0;
}
