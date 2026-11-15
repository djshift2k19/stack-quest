import { describe, expect, it } from "vitest";
import { initialProgress, type ProgressState } from "@/lib/gamification/progress";
import { mergeProgress, sameProgress } from "./merge";

const unit = (xpEarned: number, fewestHints = 0, at = "2026-11-10T08:00:00.000Z") => ({
  firstCompletedAt: at,
  lastCompletedAt: at,
  completions: 1,
  fewestHints,
  xpEarned,
});

const phone: ProgressState = {
  ...initialProgress,
  xp: 25,
  units: { "t/m/u1": unit(15), "t/m/u2": unit(10, 2) },
  badges: { "milestone:first-step": "2026-11-10T08:00:00.000Z" },
  streak: { current: 3, longest: 3, lastActiveDay: "2026-11-12", freezes: 1, lastFreezeGrantWeek: "2026-W46" },
};

const laptop: ProgressState = {
  ...initialProgress,
  xp: 30,
  units: { "t/m/u2": unit(15, 0, "2026-11-13T08:00:00.000Z"), "t/m/u3": unit(15) },
  badges: { "milestone:first-step": "2026-11-11T08:00:00.000Z", "module:t/m": "2026-11-13T08:00:00.000Z" },
  streak: { current: 4, longest: 4, lastActiveDay: "2026-11-13", freezes: 0, lastFreezeGrantWeek: "2026-W46" },
};

describe("merging progress from two devices", () => {
  const merged = mergeProgress(phone, laptop);

  it("keeps every unit from both devices, with the best result for each", () => {
    expect(Object.keys(merged.units).sort()).toEqual(["t/m/u1", "t/m/u2", "t/m/u3"]);
    expect(merged.units["t/m/u2"]).toMatchObject({ xpEarned: 15, fewestHints: 0, firstCompletedAt: "2026-11-10T08:00:00.000Z" });
  });

  it("works XP out again from the units, so nothing is counted twice", () => {
    expect(merged.xp).toBe(15 + 15 + 15);
  });

  it("keeps every badge, with the earliest date", () => {
    expect(merged.badges["milestone:first-step"]).toBe("2026-11-10T08:00:00.000Z");
    expect(merged.badges["module:t/m"]).toBeDefined();
  });

  it("takes the streak from the device that learned most recently", () => {
    expect(merged.streak).toMatchObject({ current: 4, longest: 4, lastActiveDay: "2026-11-13" });
  });

  it("gives the same answer in either order, and merging twice changes nothing", () => {
    expect(sameProgress(mergeProgress(laptop, phone), merged)).toBe(true);
    expect(sameProgress(mergeProgress(merged, laptop), merged)).toBe(true);
    expect(sameProgress(mergeProgress(merged, merged), merged)).toBe(true);
  });

  it("merging with an empty device keeps everything", () => {
    expect(mergeProgress(initialProgress, phone).units).toEqual(phone.units);
  });
});
