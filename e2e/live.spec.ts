import { expect, test } from "@playwright/test";
const live = "http://127.0.0.1:3001";
test.describe("live mode without provider credentials", () => {
  test("public pages never show demo inventory or simulated credits", async ({
    page,
  }) => {
    await page.goto(live + "/docs");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Connect real SMS resources",
    );
    await expect(page.getByText("LIVE PROVIDER MODE")).toBeVisible();
    await page.goto(live + "/pricing");
    await expect(
      page.getByText(/sample inventory, messages, credits/i).first(),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("DEMO-");
  });
  test("dashboard requires a signed operator session and shows setup errors, not fake numbers", async ({
    page,
  }) => {
    await page.goto(live + "/dashboard/numbers");
    await expect(
      page.getByRole("heading", { name: "Operator sign-in" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("DEMO-");
  });
  test("unconfigured providers fail closed on every live endpoint", async ({
    request,
  }) => {
    const status = await request.get(live + "/api/live/status");
    expect(status.status()).toBe(200);
    expect(await status.json()).toMatchObject({
      mode: "live",
      authenticated: false,
      twilio: false,
      textbee: false,
      purchaseEnabled: false,
    });
    for (const path of [
      "countries",
      "numbers?country=US&type=Local",
      "rentals",
      "messages?source=twilio&rental=PN" + "0".repeat(32),
    ]) {
      const response = await request.get(live + "/api/live/" + path);
      expect(response.status()).toBe(401);
    }
    const release = await request.post(live + "/api/live/release", {
      headers: { Origin: live },
      data: { id: "PN" + "0".repeat(32), confirmPermanentRelease: true },
    });
    expect(release.status()).toBe(401);
    const unsigned = await request.post(live + "/api/webhooks/textbee", {
      data: {},
    });
    expect([401, 503]).toContain(unsigned.status());
  });
  test("wrong and cross-origin sign-in attempts are rejected without a session", async ({
    request,
  }) => {
    const forged = await request.post(live + "/api/live/session", {
      headers: { Origin: live },
      data: { password: "definitely-not-the-password" },
    });
    expect(forged.status()).toBe(401);
    const crossOrigin = await request.post(live + "/api/live/session", {
      headers: { Origin: "https://attacker.example" },
      data: { password: "numora-e2e-operator-password" },
    });
    expect(crossOrigin.status()).toBe(403);
    expect(crossOrigin.headers()["set-cookie"]).toBeUndefined();
  });
  test("operator signs in, sees explicit setup errors, and signs out", async ({
    page,
  }) => {
    await page.goto(live + "/dashboard/numbers");
    await page
      .getByLabel("Operator password")
      .fill("numora-e2e-operator-password");
    await page.getByRole("button", { name: /Sign in securely/ }).click();
    await expect(
      page.getByRole("heading", { name: "Browse numbers" }),
    ).toBeVisible();
    await expect(
      page.getByText(/configure TWILIO_ACCOUNT_SID/).first(),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("DEMO-");
    const inbox = await page.request.get(
      live + "/api/live/messages?source=twilio&rental=PN" + "0".repeat(32),
    );
    expect(inbox.status()).toBe(503);
    expect((await inbox.json()).code).toBe("SETUP_REQUIRED");
    await page.getByRole("button", { name: /Sign out/ }).click();
    await expect(
      page.getByRole("heading", { name: "Operator sign-in" }),
    ).toBeVisible();
  });
});
