import { expect, test, type Page } from "@playwright/test";

const ENGINE = "/trails/how-this-app-works/the-lesson-engine";

/** Replace everything in the code editor with `text`. */
async function setEditor(page: Page, text: string) {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(text);
}

async function revealSolutionIntoEditor(page: Page) {
  await page.getByRole("button", { name: "Stuck? Show a hint" }).click();
  await page.getByRole("button", { name: "Show bigger hint" }).click();
  await page.getByRole("button", { name: "Show nearly there" }).click();
  await page.getByRole("button", { name: "Show the full solution" }).click();
  await page.getByRole("button", { name: "Put the solution in the editor" }).click();
}

test.describe("lesson engine", () => {
  test("quiz: wrong answers explain why, right answers finish the unit", async ({ page }) => {
    await page.goto("/trails/how-computers-work/your-computer/check-your-understanding");
    await page.getByLabel("The message appearing on your friend's phone").check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByTestId("quiz-feedback")).toContainText("Not quite");
    await expect(page.getByTestId("quiz-feedback")).toContainText("That's output");

    await page.getByLabel("Your finger tapping the screen and typing the words").check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByTestId("quiz-feedback")).toContainText("Correct");
    await page.getByRole("button", { name: "Next question" }).click();

    await page.getByLabel(/Nothing changes inside/).check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: "Next question" }).click();
    await page.getByLabel("Safari").check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByRole("button", { name: "Finish" }).click();

    // No hints used: 15 XP + 50% bonus = 23 (rounded)
    await expect(page.getByTestId("celebrations")).toContainText("+23 XP (includes a no-hint bonus!)");
  });

  test("predict the output: check a prediction, then run the code", async ({ page }) => {
    await page.goto(`${ENGINE}/predict-the-level`);
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "Check my prediction" }).click();
    await expect(page.getByTestId("predict-feedback")).toContainText("Correct");
    await page.getByRole("button", { name: /Run it to see for yourself/ }).click();
    await expect(page.getByTestId("console")).toHaveText(/100\s*300/);
  });

  test("type the code: hints point at the exact character", async ({ page }) => {
    await page.goto(`${ENGINE}/type-a-console-log`);
    await setEditor(page, 'console.log("Stack Quest started!")');
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByTestId("type-feedback")).toContainText("line 1");
    await page.getByRole("button", { name: "Stuck? Show a hint" }).click();
    await page.getByRole("button", { name: "Show bigger hint" }).click();
    await expect(page.getByText('the example has ";"')).toBeVisible();

    await setEditor(page, 'console.log("Stack Quest started!");');
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByTestId("type-feedback")).toContainText("matches exactly");
    await expect(page.getByTestId("celebrations")).toContainText("+10 XP");
  });

  test("fix the bug: failing checks, the hint ladder, then a pass", async ({ page }) => {
    await page.goto(`${ENGINE}/fix-the-bonus`);
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("test-results")).toContainText("1 of 3 passing");
    await expect(page.getByTestId("test-results")).toContainText("Expected 15 but got 10");

    await revealSolutionIntoEditor(page);
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("challenge-passed")).toBeVisible();
    await expect(page.getByTestId("test-results")).toContainText("3 of 3 passing");
    // Solution was viewed, so no bonus: exactly the unit's 20 XP.
    await expect(page.getByTestId("celebrations")).toContainText("+20 XP");
    await expect(page.getByTestId("celebrations")).not.toContainText("bonus");
  });

  test("error translator explains a crash in plain English", async ({ page }) => {
    await page.goto(`${ENGINE}/read-the-error`);
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    const alert = page.getByTestId("error-explanation");
    await expect(alert).toContainText(`JavaScript doesn't know the name "learnername"`);
    await expect(alert).toContainText("line 4");
    await alert.getByText("The real error message").click();
    await expect(alert).toContainText("ReferenceError: learnername is not defined");
  });

  test("syntax errors are found with a line number", async ({ page }) => {
    await page.goto(`${ENGINE}/fix-the-bonus`);
    await setEditor(page, 'const a = 1;\nconsole.log("oops);');
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("error-explanation")).toContainText("line 2");
  });

  test("an endless loop is stopped and explained", async ({ page }) => {
    await page.goto(`${ENGINE}/fix-the-bonus`);
    await setEditor(page, "while (true) {}");
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("error-explanation")).toContainText("took too long", { timeout: 10_000 });
    // The page itself is still responsive.
    await expect(page.getByRole("button", { name: "▶ Run & check" })).toBeEnabled();
  });

  test("sandboxed code cannot reach the internet or Stack Quest's storage", async ({ page }) => {
    await page.goto(`${ENGINE}/fix-the-bonus`);
    await setEditor(
      page,
      [
        "try { await globalThis.fetch('https://example.com'); console.log('network: OPEN'); } catch (e) { console.log('network: blocked'); }",
        "try { indexedDB.open('stack-quest'); console.log('storage: OPEN'); } catch (e) { console.log('storage: blocked'); }",
        "console.log('page: ' + (typeof document === 'undefined' ? 'unreachable' : 'REACHABLE'));",
      ].join("\n"),
    );
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    const output = page.getByTestId("console");
    await expect(output).toContainText("network: blocked");
    await expect(output).toContainText("storage: blocked");
    await expect(output).toContainText("page: unreachable");
  });

  test("HTML: live preview and automatic checks", async ({ page }) => {
    await page.goto(`${ENGINE}/build-a-badge-card`);
    await setEditor(page, "<h1>First Step</h1>");
    await expect(page.frameLocator('iframe[title="Live preview of your page"]').locator("h1")).toHaveText("First Step");
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("test-results")).toContainText("2 of 3 passing");
    await setEditor(page, "<h1>First Step</h1>\n<p>Finish your first unit.</p>");
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("challenge-passed")).toBeVisible();
  });

  test("CSS: styles are measured in the real page", async ({ page }) => {
    await page.goto(`${ENGINE}/style-the-badge`);
    await setEditor(page, ".badge {\n  background-color: gold;\n  padding: 16px;\n}");
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("challenge-passed")).toBeVisible();
  });

  test("SQL: the engine downloads only when asked, then queries real Postgres", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    let engineBytes = 0;
    page.on("requestfinished", async (request) => {
      if (/\.(wasm|data|gz)(\?|$)/.test(request.url())) engineBytes += (await request.sizes()).responseBodySize;
    });
    await page.goto(`${ENGINE}/query-the-leaderboard`);
    expect(engineBytes).toBe(0); // nothing downloaded until the button is pressed
    const download = page.getByRole("button", { name: /Download the SQL engine/ });
    await expect(download).toBeVisible();
    await download.click();
    await page.getByRole("button", { name: "▶ Run query & check" }).click({ timeout: 60_000 });
    await expect(page.getByTestId("sql-result")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Result: 5 rows")).toBeVisible();
    console.log(`[page weight] ${testInfo.project.name}: SQL engine download = ${(engineBytes / 1024 / 1024).toFixed(1)} MB`);

    await setEditor(page, "SELECT name, xp\nFROM learners\nWHERE xp > 200\nORDER BY xp DESC;");
    await page.getByRole("button", { name: "▶ Run query & check" }).click();
    await expect(page.getByTestId("challenge-passed")).toBeVisible();

    await setEditor(page, "SELECT name FROM learner;");
    await page.getByRole("button", { name: "▶ Run query & check" }).click();
    await expect(page.getByTestId("error-explanation")).toContainText(`There's no table called "learner"`);
  });

  test("boss: a pretend API answers requests and shows status codes", async ({ page }) => {
    await page.goto(`${ENGINE}/boss-xp-api`);
    await revealSolutionIntoEditor(page);
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("challenge-passed")).toBeVisible();
    await expect(page.getByText("GET /api/learners/nobody → 404")).toBeVisible();
  });
});

test.describe("glossary", () => {
  test("tapping a term shows its definition, and Escape closes it", async ({ page }) => {
    await page.goto("/trails/how-computers-work/your-computer/files-and-folders");
    await page.getByRole("button", { name: "file path: show definition" }).click();
    const card = page.getByRole("dialog", { name: "Definition of File path" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("The full address of a file");
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
  });

  test("the glossary page lists every term", async ({ page }) => {
    await page.goto("/glossary");
    await expect(page.getByRole("heading", { name: "Glossary" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Sandbox" })).toBeVisible();
  });
});

test("page weight: reading pages stay light; heavy parts load only when needed", async ({ page }, testInfo) => {
  let jsBytes = 0;
  const track = async (request: import("@playwright/test").Request) => {
    if (request.resourceType() === "script") jsBytes += (await request.sizes()).responseBodySize;
  };
  page.on("requestfinished", track);

  await page.goto("/trails/how-computers-work/your-computer/files-and-folders", { waitUntil: "networkidle" });
  const reading = Math.round(jsBytes / 1024);
  jsBytes = 0;
  await page.goto(`${ENGINE}/fix-the-bonus`, { waitUntil: "networkidle" });
  await expect(page.locator(".cm-content")).toBeVisible();
  const challenge = Math.round(jsBytes / 1024);

  console.log(`[page weight] ${testInfo.project.name}: reading unit = ${reading} KB, code challenge (incl. editor) = ${challenge} KB (compressed JS)`);
  expect(reading).toBeLessThan(250);
});
