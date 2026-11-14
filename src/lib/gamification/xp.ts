/**
 * XP (experience points) and levels.
 *
 * Every unit is worth some XP. Finishing a challenge without using any
 * hints earns a 50% bonus. (Readings have no hints, so `hintsUsed` is left
 * out for them and there's no bonus.) Redoing a unit never takes XP away: if you do better the
 * second time (for example, no hints), you get the difference.
 */

/** Extra XP, as a fraction of the unit's XP, for using no hints. */
export const NO_HINT_BONUS = 0.5;

export function xpForCompletion(baseXp: number, hintsUsed?: number): number {
  const bonus = hintsUsed === 0 ? Math.round(baseXp * NO_HINT_BONUS) : 0;
  return baseXp + bonus;
}

/**
 * Total XP needed to reach a level.
 * Level 1 = 0, Level 2 = 100, Level 3 = 300, Level 4 = 600, ...
 * Each level needs 100 XP more than the one before, so they grow gently.
 */
export function xpRequiredForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  title: string;
  /** XP earned since the start of the current level. */
  intoLevel: number;
  /** XP the current level spans, from its start to the next level. */
  levelSize: number;
  /** 0 to 1: how far through the current level you are. */
  fraction: number;
}

const LEVEL_TITLES = [
  "Curious Beginner", // level 1
  "Button Presser",
  "File Finder",
  "Tag Writer",
  "Bug Spotter",
  "Function Crafter",
  "Data Wrangler",
  "API Builder",
  "Stack Explorer",
  "Full-Stack Adventurer", // level 10 and beyond
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const start = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const intoLevel = xp - start;
  const levelSize = next - start;
  return {
    level,
    title: levelTitle(level),
    intoLevel,
    levelSize,
    fraction: intoLevel / levelSize,
  };
}
