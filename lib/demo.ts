import { z } from "zod";
import { Actor, customer, Message, Rental, State } from "./types";
export const durationSchema = z.coerce
  .number()
  .int()
  .refine((n) => [1, 7, 30].includes(n), "Choose 1, 7 or 30 days");
export const inventorySchema = z.object({
  number: z
    .string()
    .regex(
      /^\+\d{1,3} DEMO-\d{3,6}$/,
      "Use a masked number like +254 DEMO-103",
    ),
  country: z.string().trim().min(2).max(50),
  code: z.string().regex(/^\+\d{1,3}$/),
  flag: z.string().min(1).max(12),
  price: z.coerce.number().int().min(1).max(100000),
  enabled: z.boolean(),
  durations: z
    .array(z.number().int())
    .min(1)
    .refine((a) => a.every((x) => [1, 7, 30].includes(x))),
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().max(120),
  notifications: z.boolean(),
  dark: z.boolean(),
});
export function uid() {
  return crypto.randomUUID();
}
export const money = (n: number) => (n / 100).toFixed(2);
export function seed(now = Date.now()): State {
  const rows: [string, string, string, string, number][] = [
    ["Kenya", "+254", "🇰🇪", "101", 180],
    ["United States", "+1", "🇺🇸", "201", 250],
    ["United Kingdom", "+44", "🇬🇧", "301", 220],
    ["Canada", "+1", "🇨🇦", "401", 200],
    ["Germany", "+49", "🇩🇪", "501", 280],
    ["Netherlands", "+31", "🇳🇱", "601", 240],
    ["Kenya", "+254", "🇰🇪", "102", 160],
    ["United States", "+1", "🇺🇸", "202", 250],
    ["United Kingdom", "+44", "🇬🇧", "302", 220],
    ["France", "+33", "🇫🇷", "701", 260],
    ["Australia", "+61", "🇦🇺", "801", 300],
    ["South Africa", "+27", "🇿🇦", "901", 190],
  ];
  const numbers = rows.map(([country, code, flag, num, price], i) => ({
    id: `n${i}`,
    country,
    code,
    flag,
    number: `${code} DEMO-${num}`,
    price,
    enabled: true,
    durations: [1, 7, 30],
  }));
  const rentals: Rental[] = [
    {
      id: "r1",
      ownerId: customer.id,
      numberId: "n0",
      start: now - 3600000,
      expires: now + 6 * 86400000,
      status: "active",
      cost: 1260,
    },
    {
      id: "r2",
      ownerId: customer.id,
      numberId: "n2",
      start: now - 7200000,
      expires: now + 86400000,
      status: "active",
      cost: 220,
    },
  ];
  return {
    version: 1,
    numbers,
    rentals,
    messages: [
      {
        id: "m1",
        rentalId: "r1",
        ownerId: customer.id,
        sender: "Demo Courier",
        body: "SIMULATED: Your sample parcel is out for delivery. No real delivery is scheduled.",
        received: now - 1200000,
        read: false,
        kind: "delivery",
      },
      {
        id: "m2",
        rentalId: "r2",
        ownerId: customer.id,
        sender: "Numora Test",
        body: "SIMULATED: Your fictional test code is 123456. This does not verify any external account.",
        received: now - 2400000,
        read: false,
        kind: "code",
      },
    ],
    transactions: [
      {
        id: "t0",
        ownerId: customer.id,
        key: "opening",
        amount: 10000,
        type: "credit",
        description: "Welcome demo credits",
        at: now - 86400000,
      },
      {
        id: "t1",
        ownerId: customer.id,
        key: "rent:r1",
        amount: -1260,
        type: "rental",
        description: "Kenya · 7-day demo rental",
        at: now - 3600000,
      },
      {
        id: "t2",
        ownerId: customer.id,
        key: "rent:r2",
        amount: -220,
        type: "rental",
        description: "United Kingdom · 1-day demo rental",
        at: now - 7200000,
      },
    ],
    profile: {
      name: "Alex Morgan",
      email: "alex@example.com",
      notifications: true,
      dark: false,
    },
    retentionDays: 30,
    audit: [],
  };
}
export function balance(s: State, actor = customer) {
  return s.transactions
    .filter((t) => t.ownerId === actor.id)
    .reduce((n, t) => n + t.amount, 0);
}
export function reconcile(s: State, now = Date.now()): State {
  return {
    ...s,
    rentals: s.rentals.map((r) =>
      r.status === "active" && r.expires <= now
        ? { ...r, status: "expired" }
        : r,
    ),
    messages: s.messages.filter(
      (m) => m.received > now - s.retentionDays * 86400000,
    ),
  };
}
export function available(s: State, id: string) {
  return !s.rentals.some((r) => r.numberId === id && r.status === "active");
}
export function filterNumbers(
  s: State,
  q = "",
  country = "",
  max = 100000,
  duration = 1,
  onlyAvailable = false,
) {
  return s.numbers.filter(
    (n) =>
      n.enabled &&
      `${n.country} ${n.number}`.toLowerCase().includes(q.toLowerCase()) &&
      (!country || n.country === country) &&
      n.price * duration <= max &&
      n.durations.includes(duration) &&
      (!onlyAvailable || available(s, n.id)),
  );
}
export function transaction(
  s: State,
  actor: Actor,
  key: string,
  amount: number,
  type: "credit" | "rental" | "refund",
  description: string,
): State {
  if (
    !Number.isSafeInteger(amount) ||
    amount === 0 ||
    (type === "rental" ? amount >= 0 : amount <= 0)
  )
    throw Error("Invalid transaction amount");
  const existing = s.transactions.find((t) => t.key === key);
  if (existing) {
    if (
      existing.ownerId !== actor.id ||
      existing.amount !== amount ||
      existing.type !== type
    )
      throw Error("Idempotency conflict");
    return s;
  }
  if (balance(s, actor) + amount < 0) throw Error("Not enough demo credits");
  return {
    ...s,
    transactions: [
      {
        id: uid(),
        ownerId: actor.id,
        key,
        amount,
        type,
        description,
        at: Date.now(),
      },
      ...s.transactions,
    ],
  };
}
export function rent(
  input: State,
  actor: Actor,
  numberId: string,
  days: unknown,
  now = Date.now(),
): State {
  const duration = durationSchema.parse(days);
  const s = reconcile(input, now);
  const n = s.numbers.find((x) => x.id === numberId);
  if (!n || !n.enabled || !available(s, n.id))
    throw Error("This demo number is unavailable");
  if (!n.durations.includes(duration)) throw Error("Duration not supported");
  const id = uid();
  const cost = n.price * duration;
  const next = transaction(
    s,
    actor,
    `rent:${id}`,
    -cost,
    "rental",
    `${n.country} · ${duration}-day demo rental`,
  );
  return {
    ...next,
    rentals: [
      {
        id,
        ownerId: actor.id,
        numberId,
        start: now,
        expires: now + duration * 86400000,
        status: "active",
        cost,
      },
      ...next.rentals,
    ],
  };
}
export function ownRental(s: State, actor: Actor, id: string) {
  const r = s.rentals.find((x) => x.id === id);
  if (!r || r.ownerId !== actor.id)
    throw Error("Rental not found or access denied");
  return r;
}
export function cancel(
  input: State,
  actor: Actor,
  id: string,
  now = Date.now(),
): State {
  const s = reconcile(input, now),
    r = ownRental(s, actor, id);
  if (r.status !== "active")
    throw Error("Only active rentals can be cancelled");
  const next = transaction(
    s,
    actor,
    `refund:${id}`,
    r.cost,
    "refund",
    "Simulated cancellation refund",
  );
  return {
    ...next,
    rentals: next.rentals.map((x) =>
      x.id === id ? { ...x, status: "cancelled" } : x,
    ),
  };
}
export function expire(s: State, actor: Actor, id: string): State {
  const r = ownRental(s, actor, id);
  if (r.status !== "active") throw Error("Rental is not active");
  return {
    ...s,
    rentals: s.rentals.map((x) =>
      x.id === id ? { ...x, expires: Date.now() - 1, status: "expired" } : x,
    ),
  };
}
export function simulate(
  input: State,
  actor: Actor,
  id: string,
  kind: Message["kind"],
): State {
  const s = reconcile(input),
    r = ownRental(s, actor, id);
  if (r.status !== "active") throw Error("Choose an active rental");
  if (!["text", "delivery", "code"].includes(kind))
    throw Error("Invalid sample type");
  if (
    s.messages.filter(
      (m) => m.rentalId === id && m.received > Date.now() - 60000,
    ).length >= 5
  )
    throw Error("Demo limit: five samples per rental per minute");
  const samples = {
    text: [
      "Demo Friend",
      "SIMULATED: Hello from your Numora demo inbox. Have a great day!",
    ],
    delivery: [
      "Demo Courier",
      "SIMULATED: Your fictional delivery has arrived. No parcel was sent.",
    ],
    code: [
      "Numora Test",
      "SIMULATED: Your fictional test code is 123456. Not valid for any external service.",
    ],
  };
  const [sender, body] = samples[kind];
  return {
    ...s,
    messages: [
      {
        id: uid(),
        ownerId: actor.id,
        rentalId: id,
        kind,
        sender,
        body,
        received: Date.now(),
        read: false,
      },
      ...s.messages,
    ],
  };
}
export function readMessage(s: State, actor: Actor, id: string): State {
  const m = s.messages.find((x) => x.id === id);
  if (!m || m.ownerId !== actor.id)
    throw Error("Message not found or access denied");
  return {
    ...s,
    messages: s.messages.map((x) => (x.id === id ? { ...x, read: true } : x)),
  };
}
export function adminGuard(a: Actor) {
  if (!a.localAdmin) throw Error("Local demo admin access required");
}
export function saveNumber(
  s: State,
  a: Actor,
  raw: unknown,
  id?: string,
): State {
  adminGuard(a);
  const data = inventorySchema.parse(raw);
  if (s.numbers.some((n) => n.number === data.number && n.id !== id))
    throw Error("Demo number already exists");
  if (id && !s.numbers.some((n) => n.id === id))
    throw Error("Number not found");
  return {
    ...s,
    numbers: id
      ? s.numbers.map((n) => (n.id === id ? { ...n, ...data } : n))
      : [...s.numbers, { id: uid(), ...data }],
    audit: [
      {
        id: uid(),
        action: id ? "Inventory updated" : "Inventory added",
        at: Date.now(),
      },
      ...s.audit,
    ],
  };
}
export function removeNumber(s: State, a: Actor, id: string): State {
  adminGuard(a);
  if (s.rentals.some((r) => r.numberId === id))
    throw Error(
      "Number has rental history. Disable it instead to preserve records.",
    );
  return {
    ...s,
    numbers: s.numbers.filter((n) => n.id !== id),
    audit: [
      { id: uid(), action: "Inventory removed", at: Date.now() },
      ...s.audit,
    ],
  };
}
