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

/** Every kind of unit. */
export const UNIT_TYPES = [
  "reading",
  "quiz",
  "predict-output",
  "fix-the-bug",
  "type-the-code",
  "build-it",
  "boss",
] as const;

export const LANGUAGES = ["javascript", "html", "css", "sql"] as const;
const language = z.enum(LANGUAGES);

/* ---------- Pieces shared by several unit types ---------- */

export const optionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean().default(false),
  /** Shown after this option is picked: why it is right or wrong. */
  why: z.string().optional(),
});

export const questionSchema = z
  .object({
    prompt: z.string().min(1),
    /** Optional code shown with the question. */
    code: z.string().optional(),
    language: language.default("javascript"),
    options: z.array(optionSchema).min(2, "a question needs at least 2 options"),
    hint: z.string().optional(),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: "exactly one option must have correct: true",
    path: ["options"],
  });

/** The three-step hint ladder: a nudge, a bigger hint, then a near-solution. */
const hintLadder = z
  .array(z.string().min(1))
  .length(3, "give exactly 3 hints: a nudge, a bigger hint and a near-solution");

export const testSchema = z.object({
  /** Shown to the learner, e.g. "add(2, 3) gives 5". Write it as a fact. */
  name: z.string().min(1),
  /** JavaScript/HTML/CSS: code using expect(...), e.g. expect(add(2, 3)).toBe(5) */
  code: z.string().optional(),
  /** SQL: the learner's result must match this query's result. */
  sameResultAs: z.string().optional(),
  orderMatters: z.boolean().default(false),
  /** SQL: run this query after the learner's SQL... */
  check: z.string().optional(),
  /** ...and expect these rows (a list of rows, each a list of values). */
  expect: z.array(z.array(z.unknown())).optional(),
});

export const apiRouteSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  path: z.string().startsWith("/"),
  status: z.number().int().min(100).max(599).default(200),
  body: z.unknown().optional(),
});

export const challengeSchema = z
  .object({
    language,
    starter: z.string().default(""),
    solution: z.string().min(1),
    hints: hintLadder,
    tests: z.array(testSchema).min(1, "a challenge needs at least one test"),
    /** CSS challenges: the HTML that the learner's CSS styles. */
    fixture: z.string().optional(),
    /** SQL challenges: statements that create and fill the tables first. */
    setup: z.string().optional(),
    /** JavaScript challenges: pretend API answers for fetch(...). */
    api: z.array(apiRouteSchema).default([]),
  })
  .superRefine((c, ctx) => {
    c.tests.forEach((t, i) => {
      if (c.language === "sql") {
        if (!t.sameResultAs && !(t.check && t.expect)) {
          ctx.addIssue({ code: "custom", path: ["tests", i], message: "SQL tests need sameResultAs, or check + expect" });
        }
      } else if (!t.code) {
        ctx.addIssue({ code: "custom", path: ["tests", i, "code"], message: "this test needs some code using expect(...)" });
      }
    });
    if (c.language === "css" && !c.fixture) {
      ctx.addIssue({ code: "custom", path: ["fixture"], message: "CSS challenges need a fixture (the HTML to style)" });
    }
  });

/* ---------- The unit types ---------- */

const base = {
  id: slug,
  title: z.string().min(1),
  minutes: z.number().int().min(1).max(10, "units must take 10 minutes or less"),
  xp: z.number().int().min(1).default(10),
  goals: z.array(z.string()).min(1),
};

const readingUnit = z.object({ ...base, type: z.literal("reading") });

const quizUnit = z.object({
  ...base,
  type: z.literal("quiz"),
  questions: z.array(questionSchema).min(1),
});

const predictUnit = z
  .object({
    ...base,
    type: z.literal("predict-output"),
    language: language.default("javascript"),
    code: z.string().min(1),
    /** Either multiple-choice options... */
    options: z.array(optionSchema).optional(),
    /** ...or the exact text the code prints. */
    answer: z.string().optional(),
    explanation: z.string().min(1),
    hints: hintLadder,
  })
  .refine((u) => Boolean(u.options) !== Boolean(u.answer), {
    message: "give either options or answer, not both",
    path: ["options"],
  });

const codeUnit = (type: "fix-the-bug" | "build-it") =>
  z.object({ ...base, type: z.literal(type), challenge: challengeSchema });

const typeTheCodeUnit = z.object({
  ...base,
  type: z.literal("type-the-code"),
  language: language.default("javascript"),
  target: z.string().min(1),
});

const bossUnit = z
  .object({
    ...base,
    type: z.literal("boss"),
    xp: z.number().int().min(1).default(50),
    /** A boss is either a code challenge... */
    challenge: challengeSchema.optional(),
    /** ...or (for no-code trails) a set of scenario questions. */
    questions: z.array(questionSchema).optional(),
  })
  .refine((u) => Boolean(u.challenge) !== Boolean(u.questions), {
    message: "a boss needs either a challenge or questions, not both",
    path: ["challenge"],
  });

export const unitFrontmatterSchema = z.discriminatedUnion("type", [
  readingUnit,
  quizUnit,
  predictUnit,
  codeUnit("fix-the-bug"),
  codeUnit("build-it"),
  typeTheCodeUnit,
  bossUnit,
]);

/* ---------- Glossary ---------- */

export const glossaryEntrySchema = z.object({
  id: slug,
  term: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().optional(),
});
export const glossarySchema = z.array(glossaryEntrySchema);

export type Question = z.infer<typeof questionSchema>;
export type QuizOption = z.infer<typeof optionSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type ChallengeTest = z.infer<typeof testSchema>;
export type ApiRoute = z.infer<typeof apiRouteSchema>;
export type Language = (typeof LANGUAGES)[number];
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;

export type TrailMeta = z.infer<typeof trailSchema>;
export type ModuleMeta = z.infer<typeof moduleSchema>;
export type UnitFrontmatter = z.infer<typeof unitFrontmatterSchema>;
