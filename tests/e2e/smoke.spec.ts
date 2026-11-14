import { expect, test } from "@playwright/test";

/**
 * "Smoke tests": quick checks that the most important journeys work,
 * like switching on a new appliance to check nothing smokes.
 */

test("the dashboard shows trails and a place to start", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome to Stack Quest");
  await expect(page.getByRole("link", { name: /How Computers and the Internet Work/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your first unit" })).toBeVisible();
});

test("finishing a unit earns XP, a badge and a streak, and survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start your first unit" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is a computer, really?");

  await page.getByRole("button", { name: "Mark as complete" }).click();
  const celebrations = page.getByTestId("celebrations");
  await expect(celebrations).toContainText("+10 XP");
  await expect(celebrations).toContainText("Badge earned: First Step");
  await expect(celebrations).toContainText("Streak: 1 day");

  // Progress is stored in IndexedDB, so it should still be there after a reload.
  await page.goto("/");
  await expect(page.getByTestId("xp-total")).toHaveText("10 XP");
  await expect(page.getByTestId("streak")).toHaveText("1 day");
  await expect(page.getByRole("heading", { name: "Pick up where you left off" })).toBeVisible();
  await expect(page.getByText("Files and folders")).toBeVisible();
});

test("the profile lists badges and progress can be reset", async ({ page }) => {
  await page.goto("/trails/how-computers-work/your-computer/what-is-a-computer");
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByTestId("celebrations")).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("Earned", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset my progress…" }).click();
  await page.getByRole("button", { name: "Yes, erase everything" }).click();
  await expect(page.getByTestId("xp-total")).toHaveText("0 XP");
});

test("coming-soon trails show their outline", async ({ page }) => {
  await page.goto("/trails/your-toolbox");
  await expect(page.getByText("Coming soon.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Git and GitHub" })).toBeVisible();
});

test("the theme switch changes and remembers dark mode", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Colour theme/ });
  await toggle.click(); // Auto -> Light
  await toggle.click(); // Light -> Dark
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("an unknown address shows a friendly 404 page", async ({ page }) => {
  const response = await page.goto("/trails/not-a-real-trail");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
});

test("page weight: the dashboard's JavaScript stays small", async ({ page }, testInfo) => {
  let jsBytes = 0;
  page.on("requestfinished", async (request) => {
    if (request.resourceType() === "script") {
      const sizes = await request.sizes();
      jsBytes += sizes.responseBodySize; // compressed bytes actually sent
    }
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const kb = Math.round(jsBytes / 1024);
  testInfo.annotations.push({ type: "dashboard JS (compressed)", description: `${kb} KB` });
  console.log(`[page weight] ${testInfo.project.name}: dashboard JavaScript = ${kb} KB compressed`);
  expect(kb).toBeLessThan(250);
});

test("no page scrolls sideways (important on phones)", async ({ page }, testInfo) => {
  const pages = [
    "/",
    "/profile",
    "/glossary",
    "/trails/how-computers-work/your-computer/files-and-folders",
    "/trails/how-this-app-works/the-lesson-engine/fix-the-bonus",
    "/trails/how-this-app-works/the-lesson-engine/build-a-badge-card",
  ];
  for (const path of pages) {
    await page.goto(path, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${testInfo.project.name}${path.replaceAll("/", "_") || "_home"}.png`, fullPage: false });
    }
  }
});
