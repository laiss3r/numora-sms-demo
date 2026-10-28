import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac, scryptSync } from "node:crypto";
import { NextRequest } from "next/server";
import twilio from "twilio";
vi.mock("server-only", () => ({}));
import { TwilioNumbers } from "../lib/live/twilio";
import { TextBeeGateway } from "../lib/live/textbee";
import {
  createSession,
  passwordMatches,
  validSession,
  requireOperator,
  rateLimit,
} from "../lib/live/auth";
import { textbeeSignature, twilioSignature } from "../lib/live/signatures";
import { recordReceipt } from "../lib/live/events";
import { limitedBody } from "../lib/live/http";
import { validateEnvironment } from "../lib/config";
import { GET, POST } from "../app/api/live/[...path]/route";
import { POST as webhook } from "../app/api/webhooks/[provider]/route";
const account = "AC" + "a".repeat(32),
  pn = "PN" + "b".repeat(32),
  sms = "SM" + "c".repeat(32);
const number = "+12025550123"; // reserved fictional test fixture, never live inventory
const operatorPassword = "test-only-password-at-least-sixteen";
const salt = "test-only-salt";
const hash =
  "scrypt$" +
  salt +
  "$" +
  scryptSync(operatorPassword, salt, 64).toString("hex");
const owned = {
  sid: pn,
  phone_number: number,
  friendly_name: "Numora:" + number,
  date_created: "Wed, 28 Oct 2026 10:00:00 +0000",
  capabilities: { sms: true },
};
const available = {
  available_phone_numbers: [
    {
      phone_number: number,
      iso_country: "US",
      address_requirements: "none",
      capabilities: { SMS: true },
    },
  ],
};
const pricing = {
  price_unit: "usd",
  phone_number_prices: [{ number_type: "local", current_price: "1.15" }],
};
const fetcher = vi.fn();
function response(data: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function mock(...data: unknown[]) {
  for (const d of data) fetcher.mockResolvedValueOnce(response(d));
}
function request(path: string, body?: unknown, authenticated = true) {
  return new NextRequest("https://numora.example/api/live/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(authenticated
        ? { Cookie: "numora_operator=" + createSession() }
        : {}),
      Origin: "https://numora.example",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset();
  vi.stubEnv("APP_MODE", "live");
  vi.stubEnv("APP_URL", "https://numora.example");
  vi.stubEnv(
    "AUTH_SECRET",
    "test-only-session-secret-at-least-thirty-two-characters",
  );
  vi.stubEnv("OPERATOR_PASSWORD_HASH", hash);
  vi.stubEnv("TWILIO_ACCOUNT_SID", account);
  vi.stubEnv("TWILIO_API_KEY", "SK-test-fixture-not-a-real-key");
  vi.stubEnv("TWILIO_API_SECRET", "test-only-api-secret");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test-only-auth-token");
  vi.stubEnv("TEXTBEE_API_KEY", "test-only-textbee-key");
  vi.stubEnv("TEXTBEE_DEVICE_ID", "device-fixture");
  vi.stubEnv("TEXTBEE_WEBHOOK_SECRET", "test-only-webhook-secret-long-enough");
  vi.stubEnv("LIVE_PURCHASE_ENABLED", "true");
  vi.stubEnv("LIVE_WEBHOOKS_ENABLED", "false");
  vi.stubEnv("SUPABASE_URL", "https://database.example");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-service-role");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("live mode authentication and safe boundaries", () => {
  it("defaults Vercel production to live, never demo", () => {
    expect(validateEnvironment({ VERCEL_ENV: "production" }).mode).toBe("live");
    expect(validateEnvironment({}).mode).toBe("demo");
    expect(validateEnvironment({ APP_MODE: "live" }).mode).toBe("live");
  });
  it("uses signed expiring operator sessions and rejects tampering", () => {
    const session = createSession();
    expect(validSession(session)).toBe(true);
    expect(validSession(session + "x")).toBe(false);
    expect(validSession(session, Date.now() + 13 * 3600000)).toBe(false);
    expect(passwordMatches(operatorPassword, hash)).toBe(true);
    expect(passwordMatches("wrong", hash)).toBe(false);
  });
  it("rejects unauthenticated inventory before any provider call", async () => {
    const r = await GET(request("countries", undefined, false));
    expect(r.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects forged browser roles and unsigned cookies", () => {
    const req = new NextRequest("https://numora.example", {
      headers: { Cookie: "numora_operator=admin", role: "admin" },
    });
    expect(() => requireOperator(req)).toThrow("Sign in");
  });
  it("shows missing provider setup errors without any fake inventory", async () => {
    vi.stubEnv("TWILIO_API_KEY", "");
    const r = await GET(request("countries"));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ code: "SETUP_REQUIRED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sets HttpOnly SameSite secure session and exposes no password", async () => {
    const r = await POST(
      request("session", { password: operatorPassword }, false),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
    expect(r.headers.get("set-cookie")).toContain("Secure");
    expect(r.headers.get("set-cookie")).toContain("SameSite=strict");
    expect(JSON.stringify(await r.json())).not.toContain(operatorPassword);
  });
  it("rejects cross-origin paid operations before provider requests", async () => {
    const req = new NextRequest("https://numora.example/api/live/rentals", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
      body: "{}",
    });
    expect((await POST(req)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("enforces bounded request bodies", async () => {
    await expect(
      limitedBody(
        new Request("https://numora.example", {
          method: "POST",
          body: "x".repeat(100),
        }),
        20,
      ),
    ).rejects.toThrow("too large");
  });
  it("rate limits excessive attempts", () => {
    const key = "test-bucket";
    rateLimit(key, 1, 1);
    expect(() => rateLimit(key, 1, 2)).toThrow("Too many");
    rateLimit(key, 1, 60002);
  });
  it("refuses live endpoints in demo mode", async () => {
    vi.stubEnv("APP_MODE", "demo");
    expect((await GET(request("status"))).status).toBe(503);
  });
});
describe("Twilio adapter: documented REST contract, mocked transport", () => {
  it("loads actual country response and available number types", async () => {
    mock({
      countries: [
        {
          country_code: "US",
          country: "United States",
          subresource_uris: { local: "/local", toll_free: "/tollfree" },
        },
        { country_code: "KE", country: "Kenya", subresource_uris: {} },
      ],
    });
    expect(await new TwilioNumbers().countries()).toEqual([
      { code: "US", name: "United States", types: ["Local", "TollFree"] },
    ]);
  });
  it("requests SMS-enabled country inventory and account-specific monthly pricing", async () => {
    mock(available, pricing);
    const n = await new TwilioNumbers().search("US", "Local");
    expect(n[0]).toMatchObject({
      number,
      monthlyPrice: "1.15",
      currency: "USD",
    });
    expect(String(fetcher.mock.calls[0][0])).toContain(
      "/AvailablePhoneNumbers/US/Local.json?",
    );
    expect(String(fetcher.mock.calls[0][0])).toContain("SmsEnabled=true");
    expect(String(fetcher.mock.calls[1][0])).toBe(
      "https://pricing.twilio.com/v1/PhoneNumbers/Countries/US",
    );
  });
  it("returns empty inventory instead of fictional substitutes", async () => {
    mock({ available_phone_numbers: [] });
    expect(await new TwilioNumbers().search("KE", "Mobile")).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("never forwards provider error bodies or credentials", async () => {
    fetcher.mockResolvedValueOnce(
      response({ message: "secret-provider-details" }, 401),
    );
    await expect(new TwilioNumbers().countries()).rejects.toThrow("HTTP 401");
  });
  it("disables paid writes unless explicitly enabled", async () => {
    vi.stubEnv("LIVE_PURCHASE_ENABLED", "false");
    await expect(
      new TwilioNumbers().reserve({
        number,
        country: "US",
        type: "Local",
        quotedPrice: "1.15",
        quotedCurrency: "USD",
      }),
    ).rejects.toThrow("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("verifies inventory and current price before allocating with the real API", async () => {
    mock({ incoming_phone_numbers: [] }, available, pricing, owned);
    const r = await new TwilioNumbers().reserve({
      number,
      country: "US",
      type: "Local",
      quotedPrice: "1.15",
      quotedCurrency: "USD",
    });
    expect(r.id).toBe(pn);
    expect(fetcher.mock.calls[3][1].method).toBe("POST");
    expect(fetcher.mock.calls[3][1].body.get("PhoneNumber")).toBe(number);
    expect(fetcher.mock.calls[3][1].body.get("FriendlyName")).toBe(
      "Numora:" + number,
    );
  });
  it("recognizes already-allocated number without charging twice", async () => {
    mock({ incoming_phone_numbers: [owned] });
    expect(
      (
        await new TwilioNumbers().reserve({
          number,
          country: "US",
          type: "Local",
          quotedPrice: "1.15",
          quotedCurrency: "USD",
        })
      ).id,
    ).toBe(pn);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("blocks a changed provider price", async () => {
    mock({ incoming_phone_numbers: [] }, available, pricing);
    await expect(
      new TwilioNumbers().reserve({
        number,
        country: "US",
        type: "Local",
        quotedPrice: "0.01",
        quotedCurrency: "USD",
      }),
    ).rejects.toThrow("price changed");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("blocks unmet regulatory requirements without a purchase", async () => {
    mock(
      { incoming_phone_numbers: [] },
      {
        available_phone_numbers: [
          {
            ...available.available_phone_numbers[0],
            address_requirements: "local",
          },
        ],
      },
      pricing,
    );
    await expect(
      new TwilioNumbers().reserve({
        number,
        country: "US",
        type: "Local",
        quotedPrice: "1.15",
        quotedCurrency: "USD",
      }),
    ).rejects.toThrow("address/bundle");
  });
  it("protects messages and release against unrelated allocations", async () => {
    mock({ ...owned, friendly_name: "Another application" });
    await expect(new TwilioNumbers().messages(pn)).rejects.toThrow(
      "not managed",
    );
    mock({ ...owned, friendly_name: "Another application" });
    await expect(new TwilioNumbers().release(pn)).rejects.toThrow(
      "not managed",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("releases only a verified managed allocation via DELETE", async () => {
    mock(owned);
    fetcher.mockResolvedValueOnce(response(null, 204));
    await new TwilioNumbers().release(pn);
    expect(fetcher.mock.calls[1][1].method).toBe("DELETE");
  });
  it("retrieves inbound messages for an owned number and exposes pagination", async () => {
    mock(owned, {
      messages: [
        {
          sid: sms,
          from: "+12025550124",
          to: number,
          body: "fixture SMS",
          direction: "inbound",
          date_sent: "2026-10-28T12:00:00Z",
          date_created: "2026-10-28T12:00:00Z",
        },
        {
          sid: "outgoing",
          from: number,
          to: "+12025550124",
          body: "not inbound",
          direction: "outbound-api",
          date_sent: null,
          date_created: "2026-10-28T12:00:00Z",
        },
      ],
      next_page_uri: "/page2",
    });
    const r = await new TwilioNumbers().messages(pn);
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]).toMatchObject({
      id: sms,
      source: "twilio",
      body: "fixture SMS",
    });
    expect(r.next).toBe("1");
  });
});
describe("TextBee authenticated retrieval and signed webhooks (mocked transport)", () => {
  it("requests the documented account history filtered to configured receiving device", async () => {
    mock({
      data: [
        {
          _id: "a",
          message: "fixture incoming",
          direction: "received",
          sender: "Fixture sender",
          receivedAt: "2026-10-28T12:00:00Z",
          device: { _id: "device-fixture" },
        },
        {
          _id: "b",
          message: "other device private",
          direction: "received",
          sender: "Other",
          receivedAt: "2026-10-28T12:00:00Z",
          device: { _id: "other" },
        },
      ],
      meta: { nextCursor: "opaque", hasMore: true },
    });
    const r = await new TextBeeGateway().messages();
    expect(r.messages).toHaveLength(1);
    expect(r.next).toBe("opaque");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/gateway/messages");
    expect(url.searchParams.get("deviceIds")).toBe("device-fixture");
    expect(url.searchParams.get("direction")).toBe("received");
  });
  it("validates exact raw-body HMAC and rejects altered messages", () => {
    const raw = '{"fixture":true}',
      secret = "test-only-signing-secret-long-enough";
    const signature = createHmac("sha256", secret).update(raw).digest("hex");
    expect(textbeeSignature(raw, signature, secret)).toBe(true);
    expect(textbeeSignature(raw + " ", signature, secret)).toBe(false);
    expect(textbeeSignature(raw, "forged", secret)).toBe(false);
  });
  it("uses official Twilio signature verification and canonical URL", () => {
    const url = "https://numora.example/api/webhooks/twilio",
      params = { MessageSid: sms, Body: "fixture" };
    const signature = twilio.getExpectedTwilioSignature(
      "test-only-auth-token",
      url,
      params,
    );
    expect(
      twilioSignature(url, params, signature, "test-only-auth-token"),
    ).toBe(true);
    expect(
      twilioSignature(
        url + "/changed",
        params,
        signature,
        "test-only-auth-token",
      ),
    ).toBe(false);
  });
  it("rejects unsigned deliveries before any durable write", async () => {
    vi.stubEnv("LIVE_WEBHOOKS_ENABLED", "true");
    const r = await webhook(
      new NextRequest("https://numora.example/api/webhooks/textbee", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ provider: "textbee" }) },
    );
    expect(r.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts signed device-owned events and durably deduplicates receipts without storing SMS content", async () => {
    vi.stubEnv("LIVE_WEBHOOKS_ENABLED", "true");
    const raw = JSON.stringify({
      smsId: "fixture-sms-id",
      deviceId: "device-fixture",
      idempotencyKey: "unique-fixture-event",
      webhookEvent: "MESSAGE_RECEIVED",
      sender: "Fixture sender",
      message: "sensitive-fixture-content",
      receivedAt: "2026-10-28T12:00:00Z",
    });
    const signature = createHmac("sha256", process.env.TEXTBEE_WEBHOOK_SECRET!)
      .update(raw)
      .digest("hex");
    mock([{ id: "receipt-id" }], []);
    const req = () =>
      new NextRequest("https://numora.example/api/webhooks/textbee", {
        method: "POST",
        headers: {
          "x-signature": signature,
          "content-type": "application/json",
        },
        body: raw,
      });
    const first = await webhook(req(), {
      params: Promise.resolve({ provider: "textbee" }),
    });
    expect(first.status).toBe(200);
    const repeated = await webhook(req(), {
      params: Promise.resolve({ provider: "textbee" }),
    });
    expect(await repeated.json()).toMatchObject({ duplicate: true });
    expect(fetcher.mock.calls[0][1].body).not.toContain(
      "sensitive-fixture-content",
    );
    expect(fetcher.mock.calls[0][1].body).not.toContain("Fixture sender");
  });
  it("does not accept webhook storage failures as success", async () => {
    fetcher.mockResolvedValueOnce(response({ message: "failure" }, 503));
    await expect(
      recordReceipt("textbee", "fixture-event", "{}"),
    ).rejects.toThrow("HTTP 503");
  });
});
