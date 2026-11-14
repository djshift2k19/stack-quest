/**
 * The rules every lesson file must follow (its "schema").
 *
 * Zod checks each file as it's loaded. If a lesson has a typo, such as a
 * missing title or an unknown unit type, the app stops with a clear message
 * naming the file, instead of showing a broken page.
 *
 * CONTENT_GUIDE.md explains these fields for lesson writers.
 */

import { z } from "zod";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, numbers and dashes, e.g. what-is-a-file");

export const badgeSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1),
});

export const plannedModuleSchema = z.object({
  title: z.string().min(1),
  goals: z.array(z.string()).default([]),
  units: z.array(z.string()).default([]),
});

export const trailSchema = z.object({
  id: slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["available", "coming-soon"]).default("available"),
  badge: badgeSchema,
  /** For "coming-soon" trails: the outline of what will be taught. */
  plannedModules: z.array(plannedModuleSchema).default([]),
});

export const moduleSchema = z.object({
  id: slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  goals: z.array(z.string()).min(1),
  badge: badgeSchema,
});

/** Every kind of unit. Only "reading" is interactive in Phase 1. */
export const UNIT_TYPES = [
  "reading",
  "quiz",
  "predict-output",
  "fix-the-bug",
  "type-the-code",
  "build-it",
  "boss",
] as const;

export const unitFrontmatterSchema = z.object({
  id: slug,
  title: z.string().min(1),
  type: z.enum(UNIT_TYPES),
  minutes: z.number().int().min(1).max(10, "units must take 10 minutes or less"),
  xp: z.number().int().min(1).default(10),
  goals: z.array(z.string()).min(1),
});

export type TrailMeta = z.infer<typeof trailSchema>;
export type ModuleMeta = z.infer<typeof moduleSchema>;
export type UnitFrontmatter = z.infer<typeof unitFrontmatterSchema>;
