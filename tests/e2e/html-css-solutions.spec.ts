/**
 * Checks every HTML and CSS exercise in content/ really works, in a real
 * browser (the JavaScript and SQL ones are checked by
 * tests/content-solutions.test.ts):
 *   - each challenge's solution passes all its own tests
 *   - each starter does NOT already pass (otherwise there's nothing to do)
 *
 * It builds the same sealed preview page the app uses (buildPreviewDocument)
 * and loads it in an 800 x 600 iframe, just like runHtml.ts does.
 */

import { expect, test, type Page } from "@playwright/test";
import { getCatalog, getUnit } from "@/lib/content/loader";
import type { Challenge, UnitFrontmatter } from "@/lib/content/schema";
import { buildPreviewDocument } from "@/sandboxes/html/document";

function challengeOf(meta: UnitFrontmatter): Challenge | undefined {
  if (meta.type === "fix-the-bug" || meta.type === "build-it" || meta.type === "boss") return meta.challenge;
  return undefined;
}

async function loadHtmlCssChallenges(): Promise<{ key: string; c: Challenge }[]> {
  const catalog = await getCatalog();
  const out = [];
  for (const t of catalog.trails)
    for (const m of t.modules)
      for (const u of m.units) {
        const loaded = await getUnit(t.id, m.id, u.id);
        const c = loaded && challengeOf(loaded.meta);
        if (loaded && c && (c.language === "html" || c.language === "css")) out.push({ key: loaded.key, c });
      }
  return out;
}

interface Outcome {
  error: unknown;
  results: { name: string; passed: boolean; message?: string }[];
}

async function run(page: Page, c: Challenge, code: string): Promise<Outcome> {
  const doc = buildPreviewDocument({
    language: c.language as "html" | "css",
    code,
    fixture: c.fixture,
    tests: c.tests,
    runId: 1,
  });
  return page.evaluate(
    (srcdoc) =>
      new Promise<Outcome>((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("sandbox", "allow-scripts");
        iframe.style.cssText = "position:fixed;left:0;top:0;width:800px;height:600px;border:0;";
        const timer = setTimeout(() => resolve({ error: "timeout", results: [] }), 8000);
        window.addEventListener("message", function onMessage(e) {
          if (e.source !== iframe.contentWindow || e.data?.kind !== "html-result") return;
          window.removeEventListener("message", onMessage);
          clearTimeout(timer);
          iframe.remove();
          resolve(e.data.result);
        });
        // Same order as runHtml.ts: attach and size the frame, then load the page.
        document.body.appendChild(iframe);
        void iframe.offsetWidth;
        iframe.srcdoc = srcdoc;
      }),
    doc,
  );
}

const allPass = (o: Outcome) => !o.error && o.results.length > 0 && o.results.every((r) => r.passed);

test.describe("every HTML and CSS exercise is solvable", () => {
  // Pure logic: run once (desktop), not again on the phone.
  test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

  test("solutions pass and starters don't", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setContent("<!doctype html><html><body></body></html>");
    const challenges = await loadHtmlCssChallenges();
    expect(challenges.length).toBeGreaterThan(0);
    console.log(`Checking ${challenges.length} HTML and CSS exercises`);
    const problems: string[] = [];
    for (const { key, c } of challenges) {
      const solved = await run(page, c, c.solution);
      if (!allPass(solved)) {
        const failed = solved.results.filter((r) => !r.passed).map((r) => `"${r.name}" (${r.message ?? "failed"})`);
        problems.push(`${key}: the solution fails ${failed.join(", ") || JSON.stringify(solved.error)}`);
      }
      const starter = await run(page, c, c.starter);
      if (allPass(starter)) problems.push(`${key}: the starter already passes`);
    }
    expect(problems).toEqual([]);
  });
});
