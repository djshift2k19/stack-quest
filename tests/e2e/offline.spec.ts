import { expect, test, type Page } from "@playwright/test";

/** Wait until the service worker is installed and in control of the page. */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
  });
}

test.describe("offline", () => {
  test("pages you've visited work offline; others show the offline page", async ({ page, context }) => {
    await page.goto("/");
    await waitForServiceWorker(page);
    await page.goto("/trails/how-computers-work/your-computer/files-and-folders");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Files and folders");

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Files and folders");
    await expect(page.getByTestId("offline-banner")).toBeVisible();

    // Clicking a link inside the app (a "soft" navigation) to a saved page.
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Stack Quest");

    // A page never visited: the friendly offline page.
    await page.goto("/trails/your-toolbox/git/github");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't saved for offline yet");

    // Progress still saves offline (it's on this device).
    await page.goto("/trails/how-computers-work/your-computer/files-and-folders");
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByTestId("celebrations")).toContainText("+10 XP");
    await context.setOffline(false);
  });

  test("'Save all lessons' makes unvisited lessons and exercises work offline", async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/profile");
    await waitForServiceWorker(page);
    // Measure the data the service worker really downloads (compressed).
    let transferred = 0;
    context.on("requestfinished", async (request) => {
      if (request.serviceWorker()) transferred += (await request.sizes()).responseBodySize;
    });
    await page.getByRole("button", { name: "Save all lessons for offline" }).click();
    const saved = page.getByTestId("offline-saved");
    await expect(saved).toBeVisible({ timeout: 90_000 });
    console.log(`[offline] ${testInfo.project.name}: ${await saved.textContent()}`);
    console.log(`[page weight] ${testInfo.project.name}: "Save all lessons" downloaded ${(transferred / 1_000_000).toFixed(1)} MB (compressed)`);

    await context.setOffline(true);
    // A practice terminal unit never opened before: its code must come from the cache.
    await page.goto("/trails/your-toolbox/the-terminal/where-am-i");
    const input = page.getByLabel(/Type a command and press Enter/);
    await input.fill("pwd");
    await input.press("Enter");
    await expect(page.getByTestId("terminal-output")).toContainText("/Users/learner");

    // A code challenge: the editor and the sandbox work offline too.
    await page.goto("/trails/how-this-app-works/the-lesson-engine/fix-the-bonus");
    await page.getByRole("button", { name: "▶ Run & check" }).click();
    await expect(page.getByTestId("test-results")).toContainText("1 of 3 passing");
    await context.setOffline(false);
  });
});
