/**
 * Checks every exercise in content/ really works:
 *   - each challenge's solution passes all its own tests
 *   - each starter does NOT already pass (otherwise there's nothing to do)
 *   - "predict the output" answers match what the code really prints
 *
 * HTML/CSS challenges need a real browser, so they're checked by the
 * Playwright tests instead.
 */

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getCatalog, getUnit } from "@/lib/content/loader";
import type { Challenge, UnitFrontmatter } from "@/lib/content/schema";
import { sameOutput } from "@/lib/engine/sameOutput";
import { createJsRuntime } from "@/sandboxes/js/runtime";
import { runSqlJob } from "@/sandboxes/sql/sqlCore";

const rt = createJsRuntime();

async function loadAllUnits(): Promise<{ key: string; meta: UnitFrontmatter }[]> {
  const catalog = await getCatalog();
  const out = [];
  for (const t of catalog.trails)
    for (const m of t.modules)
      for (const u of m.units) {
        const loaded = await getUnit(t.id, m.id, u.id);
        if (loaded) out.push({ key: loaded.key, meta: loaded.meta });
      }
  return out;
}

function challengeOf(meta: UnitFrontmatter): Challenge | undefined {
  if (meta.type === "fix-the-bug" || meta.type === "build-it") return meta.challenge;
  if (meta.type === "boss") return meta.challenge;
  return undefined;
}

describe("every exercise in content/ is solvable", async () => {
  const units = await loadAllUnits();
  let db: PGlite;
  beforeAll(async () => {
    db = await PGlite.create();
  }, 30_000);
  afterAll(() => db.close());

  const passes = async (c: Challenge, code: string) => {
    const r =
      c.language === "sql"
        ? await runSqlJob(db, { setup: c.setup, code, tests: c.tests })
        : await rt.run({ code, tests: c.tests, api: c.api });
    return !r.error && r.results.every((t) => t.passed);
  };

  for (const { key, meta } of units) {
    const c = challengeOf(meta);
    if (c && (c.language === "javascript" || c.language === "sql")) {
      it(`${key}: the solution passes and the starter doesn't`, async () => {
        expect(await passes(c, c.solution)).toBe(true);
        expect(await passes(c, c.starter)).toBe(false);
      });
    }

    if (meta.type === "predict-output" && meta.language === "javascript") {
      it(`${key}: the correct prediction matches the real output`, async () => {
        const r = await rt.run({ code: meta.code, tests: [] });
        const printed = r.logs.map((l) => l.text).join("\n");
        const expected = meta.answer ?? meta.options!.find((o) => o.correct)!.text;
        expect(sameOutput(printed, expected)).toBe(true);
      });
    }

    if (meta.type === "type-the-code" && meta.language === "javascript") {
      it(`${key}: the code to type runs without errors`, async () => {
        expect((await rt.run({ code: meta.target, tests: [] })).error).toBeUndefined();
      });
    }
  }
});
