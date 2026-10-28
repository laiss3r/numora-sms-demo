import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("essential pages have no automated WCAG A/AA violations", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/pricing",
    "/docs",
    "/dashboard",
    "/dashboard/numbers",
    "/dashboard/rentals",
    "/dashboard/inbox",
    "/dashboard/wallet",
    "/dashboard/settings",
    "/admin",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, `Accessibility on ${path}`).toEqual([]);
  }
});

test("dark appearance persists and essential pages remain accessible", async ({
  page,
}) => {
  await page.goto("/dashboard/settings");
  await page.getByLabel("Dark appearance").check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  for (const path of [
    "/dashboard",
    "/dashboard/numbers",
    "/dashboard/inbox",
    "/dashboard/settings",
    "/",
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations, `Dark accessibility on ${path}`).toEqual([]);
  }
});
