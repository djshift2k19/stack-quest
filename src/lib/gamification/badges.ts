/**
 * Badges: small trophies for milestones.
 *
 * Module and trail badges come from the lesson files (each module.yaml and
 * trail.yaml names its badge). Milestone badges are defined here.
 */

import type { Catalog } from "@/lib/content/catalog";

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  /** How to earn it, shown on the profile page. */
  howToEarn: string;
}

export interface BadgeCheckInput {
  completedUnitKeys: Set<string>;
  level: number;
  streak: number;
}

interface MilestoneBadge extends BadgeDefinition {
  earned: (input: BadgeCheckInput) => boolean;
}

const MILESTONES: MilestoneBadge[] = [
  {
    id: "milestone:first-step",
    name: "First Step",
    emoji: "👣",
    howToEarn: "Finish your first unit.",
    earned: (i) => i.completedUnitKeys.size >= 1,
  },
  {
    id: "milestone:streak-3",
    name: "Three in a Row",
    emoji: "🔥",
    howToEarn: "Learn on 3 days in a row.",
    earned: (i) => i.streak >= 3,
  },
  {
    id: "milestone:streak-7",
    name: "Week Warrior",
    emoji: "📅",
    howToEarn: "Learn on 7 days in a row.",
    earned: (i) => i.streak >= 7,
  },
  {
    id: "milestone:streak-30",
    name: "Habit Builder",
    emoji: "🌱",
    howToEarn: "Learn on 30 days in a row.",
    earned: (i) => i.streak >= 30,
  },
  {
    id: "milestone:level-5",
    name: "Level 5",
    emoji: "⭐",
    howToEarn: "Reach level 5.",
    earned: (i) => i.level >= 5,
  },
];

export const moduleBadgeId = (moduleKey: string) => `module:${moduleKey}`;
export const trailBadgeId = (trailId: string) => `trail:${trailId}`;

/** Every badge that exists, earned or not, in display order. */
export function allBadges(catalog: Catalog): BadgeDefinition[] {
  const fromContent: BadgeDefinition[] = [];
  for (const trail of catalog.trails) {
    if (trail.status !== "available" || trail.modules.length === 0) continue;
    for (const mod of trail.modules) {
      fromContent.push({
        id: moduleBadgeId(mod.key),
        name: mod.badge.name,
        emoji: mod.badge.emoji,
        howToEarn: `Finish every unit in "${mod.title}".`,
      });
    }
    fromContent.push({
      id: trailBadgeId(trail.id),
      name: trail.badge.name,
      emoji: trail.badge.emoji,
      howToEarn: `Finish every module in the "${trail.title}" trail.`,
    });
  }
  const milestones = MILESTONES.map(({ id, name, emoji, howToEarn }) => ({ id, name, emoji, howToEarn }));
  return [...milestones, ...fromContent];
}

/** The ids of every badge the learner has qualified for. */
export function qualifiedBadgeIds(catalog: Catalog, input: BadgeCheckInput): string[] {
  const ids = MILESTONES.filter((b) => b.earned(input)).map((b) => b.id);
  const done = (key: string) => input.completedUnitKeys.has(key);

  for (const trail of catalog.trails) {
    if (trail.status !== "available" || trail.modules.length === 0) continue;
    let trailDone = true;
    for (const mod of trail.modules) {
      const moduleDone = mod.units.length > 0 && mod.units.every((u) => done(u.key));
      if (moduleDone) ids.push(moduleBadgeId(mod.key));
      else trailDone = false;
    }
    if (trailDone) ids.push(trailBadgeId(trail.id));
  }
  return ids;
}
