import { describe, it, expect, vi, afterEach } from "vitest";
import {
  available,
  balance,
  cancel,
  expire,
  filterNumbers,
  inventorySchema,
  readMessage,
  reconcile,
  rent,
  saveNumber,
  removeNumber,
  seed,
  simulate,
  transaction,
} from "../lib/demo";
import { customer } from "../lib/types";
import { validateEnvironment } from "../lib/config";
import {
  DemoMessagingProvider,
  DemoNumberProvider,
  UnconfiguredPaymentProvider,
  demoAuth,
} from "../lib/providers";
const now = 1793196000000;
afterEach(() => vi.useRealTimers());
describe("number discovery", () => {
  it("filters country, query, availability, price and duration", () => {
    const s = seed(now);
    expect(
      filterNumbers(s, "DEMO-102", "Kenya", 200, 1, true).map((n) => n.id),
    ).toEqual(["n6"]);
    expect(filterNumbers(s, "", "Kenya", 100, 1)).toEqual([]);
    expect(filterNumbers(s, "", "", 100000, 3)).toEqual([]);
  });
  it("only allows masked demo numbers", () =>
    expect(() =>
      inventorySchema.parse({
        ...seed(now).numbers[0],
        number: "+254712345678",
      }),
    ).toThrow());
});
describe("rental lifecycle", () => {
  it("creates rental and correct integer debit", () => {
    const s = seed(now),
      n = rent(s, customer, "n6", 7, now);
    expect(n.rentals[0].expires).toBe(now + 7 * 86400000);
    expect(balance(n)).toBe(balance(s) - 1120);
    expect(available(n, "n6")).toBe(false);
  });
  it("prevents duplicate reservations", () => {
    const s = rent(seed(now), customer, "n6", 1, now);
    expect(() => rent(s, customer, "n6", 1, now)).toThrow("unavailable");
  });
  it("rejects invalid duration and missing/disabled numbers", () => {
    const s = seed(now);
    expect(() => rent(s, customer, "n6", 2, now)).toThrow();
    expect(() => rent(s, customer, "missing", 1, now)).toThrow();
    s.numbers[6].enabled = false;
    expect(() => rent(s, customer, "n6", 1, now)).toThrow();
  });
  it("expires by timestamps without browser timer", () => {
    const s = rent(seed(now), customer, "n6", 1, now);
    const later = reconcile(s, now + 86400001);
    expect(later.rentals[0].status).toBe("expired");
    expect(available(later, "n6")).toBe(true);
  });
  it("cancels and refunds exactly once", () => {
    const s = rent(seed(now), customer, "n6", 1, now),
      id = s.rentals[0].id,
      n = cancel(s, customer, id, now);
    expect(n.rentals[0].status).toBe("cancelled");
    expect(balance(n)).toBe(balance(seed(now)));
    expect(() => cancel(n, customer, id, now)).toThrow();
    expect(n.transactions.filter((t) => t.key === `refund:${id}`)).toHaveLength(
      1,
    );
  });
  it("does not refund already expired rentals", () => {
    const s = rent(seed(now), customer, "n6", 1, now);
    expect(() =>
      cancel(s, customer, s.rentals[0].id, now + 86400001),
    ).toThrow();
  });
  it("supports simulated expiry", () =>
    expect(expire(seed(now), customer, "r1").rentals[0].status).toBe(
      "expired",
    ));
});
describe("messages and ownership", () => {
  it("creates clearly labelled samples of every type", () => {
    vi.setSystemTime(now);
    for (const kind of ["text", "delivery", "code"] as const) {
      const s = simulate(seed(now), customer, "r1", kind);
      expect(s.messages[0].body).toContain("SIMULATED:");
      expect(s.messages[0].kind).toBe(kind);
    }
  });
  it("marks a message read and preserves display body", () => {
    const s = seed(now),
      n = readMessage(s, customer, "m1");
    expect(n.messages[0].read).toBe(true);
    expect(n.messages[0].body).toBe(s.messages[0].body);
  });
  it("blocks other customer rentals and messages", () => {
    const a = { id: "other", localAdmin: false },
      s = seed(now);
    expect(() => cancel(s, a, "r1", now)).toThrow("access denied");
    expect(() => readMessage(s, a, "m1")).toThrow("access denied");
    expect(() => simulate(s, a, "r1", "text")).toThrow("access denied");
  });
  it("rejects samples for inactive rentals and rate limits", () => {
    vi.setSystemTime(now);
    let s = seed(now);
    for (let i = 0; i < 5; i++) s = simulate(s, customer, "r1", "text");
    expect(() => simulate(s, customer, "r1", "text")).toThrow("five");
    s = expire(s, customer, "r1");
    expect(() => simulate(s, customer, "r1", "text")).toThrow("active");
  });
  it("purges expired sample content", () =>
    expect(reconcile(seed(now), now + 31 * 86400000).messages).toHaveLength(0));
});
describe("wallet", () => {
  it("calculates balance from signed integer ledger", () =>
    expect(balance(seed(now))).toBe(8520));
  it("is idempotent for duplicate transaction key", () => {
    const s = transaction(
      seed(now),
      customer,
      "credit1",
      100,
      "credit",
      "test",
    );
    expect(transaction(s, customer, "credit1", 100, "credit", "test")).toBe(s);
  });
  it("rejects zero, unsafe integers, negative refunds and overdrafts", () => {
    for (const amount of [0, 1.1, NaN, -10, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        transaction(seed(now), customer, "x", amount, "refund", "bad"),
      ).toThrow();
    expect(() =>
      transaction(seed(now), customer, "x", -999999, "rental", "bad"),
    ).toThrow("Not enough");
  });
});
describe("local admin controls", () => {
  it("rejects unauthorized inventory changes", () =>
    expect(() =>
      saveNumber(seed(now), customer, seed(now).numbers[0], "n0"),
    ).toThrow("admin"));
  it("adds, edits and removes unused demo inventory with content-free audit", () => {
    const admin = { ...customer, localAdmin: true };
    let s = saveNumber(seed(now), admin, {
      ...seed(now).numbers[0],
      number: "+254 DEMO-999",
    });
    const n = s.numbers.at(-1)!;
    s = saveNumber(s, admin, { ...n, enabled: false }, n.id);
    expect(s.numbers.at(-1)?.enabled).toBe(false);
    s = removeNumber(s, admin, n.id);
    expect(s.numbers).toHaveLength(12);
    expect(s.audit).toHaveLength(3);
  });
  it("preserves inventory with rental history", () =>
    expect(() =>
      removeNumber(seed(now), { ...customer, localAdmin: true }, "n0"),
    ).toThrow("history"));
});
describe("fail-closed integrations and environment", () => {
  it("defaults to demo and refuses all live modes", () => {
    expect(validateEnvironment({})).toEqual({ mode: "demo" });
    expect(() => validateEnvironment({ APP_MODE: "production" })).toThrow(
      "not implemented",
    );
  });
  it("rejects every webhook signature, including forged or missing signatures", async () => {
    const p = new DemoMessagingProvider(() => seed(now), customer);
    for (const signature of ["", "forged"])
      expect(await p.validateWebhook("payload", signature)).toBe(false);
    await expect(p.processIncomingMessage("payload")).rejects.toThrow(
      "not configured",
    );
  });
  it("never claims a real payment or production authorization", async () => {
    const p = new UnconfiguredPaymentProvider();
    await expect(p.createCheckoutSession()).rejects.toThrow("not configured");
    await expect(p.issueRefund()).rejects.toThrow();
    await expect(p.processVerifiedPaymentWebhook()).rejects.toThrow();
    await expect(demoAuth.requireProductionRole("admin")).rejects.toThrow();
  });
  it("lists owner messages only", async () => {
    expect(
      await new DemoMessagingProvider(() => seed(now), {
        id: "other",
        localAdmin: false,
      }).getMessages("r1"),
    ).toEqual([]);
  });
  it("demo number adapter reserves and releases using services", async () => {
    vi.setSystemTime(now);
    let s = seed(now);
    const p = new DemoNumberProvider(
      () => s,
      (n) => {
        s = n;
      },
      customer,
    );
    await p.reserveNumber("n6", 1);
    expect(s.rentals[0].numberId).toBe("n6");
    await p.releaseNumber(s.rentals[0].id);
    expect(s.rentals[0].status).toBe("cancelled");
  });
});
