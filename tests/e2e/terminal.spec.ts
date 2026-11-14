import { expect, test } from "@playwright/test";

test.describe("practice terminal", () => {
  test("commands run, tasks tick off, errors are explained and the unit completes", async ({ page }) => {
    await page.goto("/trails/your-toolbox/the-terminal/where-am-i");
    const input = page.getByLabel(/Type a command and press Enter/);
    const output = page.getByTestId("terminal-output");

    await input.fill("pwd");
    await input.press("Enter");
    await expect(output).toContainText("/Users/learner");
    await expect(page.getByTestId("task-done")).toContainText("home folder");

    // A typo shows the real error and a plain-English explanation.
    await input.fill("lss");
    await input.press("Enter");
    await expect(output).toContainText("zsh: command not found: lss");
    await expect(page.getByTestId("error-explanation")).toContainText(`doesn't know a command called "lss"`);

    await input.fill("ls");
    await input.press("Enter");
    await expect(output).toContainText("Documents/");

    // Up arrow brings back the last command.
    await input.press("ArrowUp");
    await expect(input).toHaveValue("ls");

    await input.fill("ls Documents");
    await input.press("Enter");
    await input.fill("cat Desktop/todo.txt");
    await input.press("Enter");
    await expect(output).toContainText("Call Gogo");
    await expect(page.getByTestId("terminal-finished")).toBeVisible();
    await expect(page.getByTestId("celebrations")).toContainText("+23 XP (includes a no-hint bonus!)");
  });

  test("git works in the practice terminal", async ({ page }) => {
    await page.goto("/trails/your-toolbox/git/add-and-commit");
    const input = page.getByLabel(/Type a command and press Enter/);
    for (const cmd of ["git status", "git add pap.txt", 'git commit -m "Add pap recipe"']) {
      await input.fill(cmd);
      await input.press("Enter");
    }
    await expect(page.getByTestId("terminal-output")).toContainText("[main (root-commit)");
    await expect(page.getByTestId("terminal-output")).toContainText("Add pap recipe");
  });

  test("coming-soon trails show their outlines", async ({ page }) => {
    await page.goto("/trails/react");
    await expect(page.getByText("Coming soon.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thinking in Components" })).toBeVisible();
  });
});
