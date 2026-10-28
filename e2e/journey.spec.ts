import { test, expect } from "@playwright/test";
test("complete zero-cost rental, sample inbox and ledger journey", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One workspace. More possibilities." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore the demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: "Rent a number", exact: true })
    .click();
  await page.getByLabel("Country", { exact: true }).selectOption("Kenya");
  await page.getByLabel("Search numbers").fill("DEMO-102");
  await page.getByRole("button", { name: "Rent number", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("+254 DEMO-102")).toBeVisible();
  await dialog.getByLabel("Rental duration").selectOption("7");
  await dialog.getByRole("button", { name: "Confirm demo rental" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/dashboard/rentals");
  const rental = page.getByRole("row").filter({ hasText: "+254 DEMO-102" });
  await expect(rental).toContainText("active");
  await rental.getByRole("link", { name: "Inbox", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate sample", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Message type")
    .selectOption("code");
  await page
    .getByRole("button", { name: "Generate sample message", exact: true })
    .click();
  await page.locator(".inbox-item").filter({ hasText: "Numora Test" }).click();
  await expect(page.locator(".message-detail")).toContainText("123456");
  await expect(page.locator(".message-detail")).toContainText(
    "not received over a telecom network",
  );
  await page.reload();
  await expect(
    page.locator(".inbox-item").filter({ hasText: "Numora Test" }),
  ).toBeVisible();
  await page.goto("/dashboard/wallet");
  await expect(
    page.getByRole("row").filter({ hasText: "Kenya · 7-day demo rental" }),
  ).toHaveCount(2);
  await expect(page.locator(".wallet-hero")).toContainText("74.00");
  await page.goto("/dashboard/rentals");
  await page
    .getByRole("row")
    .filter({ hasText: "+254 DEMO-102" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel rental", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "+254 DEMO-102" }),
  ).toContainText("cancelled");
  await page.goto("/dashboard/wallet");
  await expect(page.locator(".wallet-hero")).toContainText("85.20");
  await expect(
    page.getByRole("row").filter({ hasText: "Simulated cancellation refund" }),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("local admin gate, inventory editing and safe removal", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Local demo access only" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter local admin demo" }).click();
  await page
    .getByRole("button", { name: "Add demo number", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save demo number" })
    .click();
  const row = page.getByRole("row").filter({ hasText: "+254 DEMO-103" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Disable", exact: true }).click();
  await expect(row).toContainText("Disabled");
  await row
    .getByRole("button", { name: "Remove +254 DEMO-103", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove number", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Exit local admin" }).click();
  await expect(
    page.getByRole("heading", { name: "Local demo access only" }),
  ).toBeVisible();
});
test("public pages render and mobile layout does not overflow", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/pricing",
    "/docs",
    "/terms",
    "/privacy",
    "/acceptable-use",
    "/dashboard",
    "/dashboard/numbers",
    "/dashboard/settings",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
});
test("live endpoints fail closed and reject cross-origin writes", async ({
  request,
}) => {
  const denied = await request.post("/api/integrations/webhook", {
    data: { event: "forged" },
  });
  expect(denied.status()).toBe(503);
  const cross = await request.post("/api/integrations/admin", {
    headers: { origin: "https://untrusted.example" },
    data: { role: "admin" },
  });
  expect(cross.status()).toBe(403);
  const health = await request.get("/api/integrations/status");
  expect(await health.json()).toMatchObject({
    mode: "demo",
    sms: "not configured",
  });
});
