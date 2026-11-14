/**
 * Date helpers for streaks.
 *
 * A "day" in Stack Quest is a calendar day in South Africa (SAST, UTC+2),
 * so a streak day ends at midnight Johannesburg time, wherever the server
 * or browser clock thinks it is.
 *
 * Days are stored as text like "2026-11-14" (called a "day key"), which is
 * easy to compare and easy for humans to read.
 */

export const STREAK_TIME_ZONE = "Africa/Johannesburg";

/** Turn a moment in time into a day key such as "2026-11-14". */
export function dayKey(date: Date, timeZone: string = STREAK_TIME_ZONE): string {
  // The "en-CA" locale happens to format dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayKeyToUtcMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from day key `a` to day key `b` (b later = positive). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayKeyToUtcMs(b) - dayKeyToUtcMs(a)) / 86_400_000);
}

/**
 * The ISO week a day belongs to, e.g. "2026-W46". Weeks start on Monday.
 * Used to hand out one free streak freeze per week.
 */
export function weekKey(key: string): string {
  const date = new Date(dayKeyToUtcMs(key));
  const dayOfWeek = date.getUTCDay() || 7; // Sunday counts as day 7
  // Move to the Thursday of this week: its year is the ISO week's year.
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
