import { describe, expect, it } from "vitest";
import type { Catalog } from "@/lib/content/catalog";
import { allBadges, qualifiedBadgeIds } from "./badges";
import { dayKey, daysBetween, weekKey } from "./dates";
import { completeUnit, initialProgress, normaliseProgress } from "./progress";
import { displayedStreak, initialStreak, MAX_FREEZES, recordActivity } from "./streak";
import { levelFromXp, levelProgress, xpForCompletion, xpRequiredForLevel } from "./xp";

describe("dates", () => {
  it("uses South African time, so 23:30 UTC is already the next day", () => {
    // 22:30 UTC = 00:30 SAST on the 15th
    expect(dayKey(new Date("2026-11-14T22:30:00Z"))).toBe("2026-11-15");
    expect(dayKey(new Date("2026-11-14T21:59:00Z"))).toBe("2026-11-14");
  });

  it("counts days between day keys, across month ends", () => {
    expect(daysBetween("2026-11-30", "2026-12-02")).toBe(2);
    expect(daysBetween("2026-11-14", "2026-11-14")).toBe(0);
  });

  it("gives ISO week keys (weeks start on Monday)", () => {
    expect(weekKey("2026-11-15")).toBe("2026-W46"); // Sunday
    expect(weekKey("2026-11-16")).toBe("2026-W47"); // Monday
    expect(weekKey("2027-01-01")).toBe("2026-W53");
  });
});

describe("xp and levels", () => {
  it("adds a 50% bonus when no hints are used", () => {
    expect(xpForCompletion(10, 0)).toBe(15);
    expect(xpForCompletion(10, 2)).toBe(10);
  });

  it("has gently growing level thresholds", () => {
    expect([1, 2, 3, 4].map(xpRequiredForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(650)).toBe(4);
  });

  it("reports progress through the current level", () => {
    const p = levelProgress(150);
    expect(p).toMatchObject({ level: 2, intoLevel: 50, levelSize: 200, fraction: 0.25 });
  });
});

describe("streaks", () => {
  const at = (iso: string) => new Date(iso);

  it("starts, extends and ignores repeat activity on the same day", () => {
    let s = recordActivity(initialStreak, at("2026-11-14T08:00:00Z")).streak;
    expect(s.current).toBe(1);
    s = recordActivity(s, at("2026-11-14T15:00:00Z")).streak;
    expect(s.current).toBe(1);
    s = recordActivity(s, at("2026-11-15T08:00:00Z")).streak;
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it("uses a freeze to cover one missed day", () => {
    // First activity grants the weekly freeze.
    let s = recordActivity(initialStreak, at("2026-11-16T08:00:00Z")).streak; // Mon
    expect(s.freezes).toBe(1);
    const result = recordActivity(s, at("2026-11-18T08:00:00Z")); // Wed, missed Tue
    s = result.streak;
    expect(s.current).toBe(2);
    expect(s.freezes).toBe(0);
    expect(result.events).toContainEqual({ kind: "freeze-used", count: 1 });
  });

  it("restarts at 1 when too many days are missed, but keeps the longest streak", () => {
    let s = { ...initialStreak, current: 5, longest: 5, lastActiveDay: "2026-11-01", freezes: 1, lastFreezeGrantWeek: "2026-W46" };
    s = recordActivity(s, at("2026-11-14T08:00:00Z")).streak;
    expect(s.current).toBe(1);
    expect(s.longest).toBe(5);
  });

  it("never holds more than the maximum number of freezes", () => {
    const s = recordActivity({ ...initialStreak, freezes: MAX_FREEZES }, at("2026-11-14T08:00:00Z")).streak;
    expect(s.freezes).toBe(MAX_FREEZES);
  });

  it("shows 0 once a streak can no longer be saved", () => {
    const s = { ...initialStreak, current: 4, longest: 4, lastActiveDay: "2026-11-10", freezes: 1 };
    expect(displayedStreak(s, at("2026-11-12T08:00:00Z"))).toBe(4); // 1 missed day, 1 freeze
    expect(displayedStreak(s, at("2026-11-14T08:00:00Z"))).toBe(0); // 3 missed days
  });
});

const catalog: Catalog = {
  trails: [
    {
      id: "t1",
      title: "Trail One",
      summary: "",
      status: "available",
      badge: { name: "Trail Badge", emoji: "🏆" },
      plannedModules: [],
      modules: [
        {
          key: "t1/m1",
          id: "m1",
          title: "Module One",
          summary: "",
          badge: { name: "Module Badge", emoji: "🎖️" },
          units: [
            { key: "t1/m1/u1", id: "u1", title: "U1", type: "reading", minutes: 5, xp: 10 },
            { key: "t1/m1/u2", id: "u2", title: "U2", type: "reading", minutes: 5, xp: 10 },
          ],
        },
      ],
    },
  ],
};

describe("badges", () => {
  it("lists milestone, module and trail badges", () => {
    const ids = allBadges(catalog).map((b) => b.id);
    expect(ids).toContain("milestone:first-step");
    expect(ids).toContain("module:t1/m1");
    expect(ids).toContain("trail:t1");
  });

  it("awards module and trail badges only when everything is done", () => {
    const some = qualifiedBadgeIds(catalog, { completedUnitKeys: new Set(["t1/m1/u1"]), level: 1, streak: 1 });
    expect(some).not.toContain("module:t1/m1");
    const all = qualifiedBadgeIds(catalog, { completedUnitKeys: new Set(["t1/m1/u1", "t1/m1/u2"]), level: 1, streak: 1 });
    expect(all).toEqual(expect.arrayContaining(["module:t1/m1", "trail:t1"]));
  });
});

describe("completeUnit", () => {
  const now = new Date("2026-11-14T08:00:00Z");

  it("awards XP, the first badge and a streak on the first unit", () => {
    const { state, celebrations } = completeUnit(initialProgress, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 0 }, catalog, now);
    expect(state.xp).toBe(15);
    expect(state.badges["milestone:first-step"]).toBeDefined();
    expect(state.streak.current).toBe(1);
    expect(celebrations).toContainEqual({ kind: "xp", amount: 15, noHintBonus: true });
  });

  it("never takes XP away on a retry, and tops up when you do better", () => {
    let { state } = completeUnit(initialProgress, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 2 }, catalog, now);
    expect(state.xp).toBe(10);
    ({ state } = completeUnit(state, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 3 }, catalog, now));
    expect(state.xp).toBe(10);
    ({ state } = completeUnit(state, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 0 }, catalog, now));
    expect(state.xp).toBe(15);
    expect(state.units["t1/m1/u1"]).toMatchObject({ completions: 3, fewestHints: 0, xpEarned: 15 });
  });

  it("earns module + trail badges and a bonus freeze when a module is finished", () => {
    let { state } = completeUnit(initialProgress, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 0 }, catalog, now);
    const freezesBefore = state.streak.freezes;
    const result = completeUnit(state, { unitKey: "t1/m1/u2", baseXp: 10, hintsUsed: 0 }, catalog, now);
    state = result.state;
    expect(state.badges["module:t1/m1"]).toBeDefined();
    expect(state.badges["trail:t1"]).toBeDefined();
    expect(state.streak.freezes).toBe(freezesBefore + 1);
    expect(result.celebrations).toContainEqual({ kind: "freeze-earned" });
  });

  it("celebrates a level up", () => {
    const start = { ...initialProgress, xp: 95 };
    const { celebrations } = completeUnit(start, { unitKey: "t1/m1/u1", baseXp: 10, hintsUsed: 0 }, catalog, now);
    expect(celebrations).toContainEqual({ kind: "level-up", level: 2 });
  });
});

describe("normaliseProgress", () => {
  it("falls back to a fresh start for missing or damaged data", () => {
    expect(normaliseProgress(undefined)).toEqual(initialProgress);
    expect(normaliseProgress("nonsense")).toEqual(initialProgress);
    expect(normaliseProgress({ version: 1, xp: "lots" }).xp).toBe(0);
  });
});
