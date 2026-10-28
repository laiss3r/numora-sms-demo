import { z } from "zod";
import { reconcile, seed, inventorySchema, profileSchema } from "./demo";
import { State } from "./types";
const key = "numora-demo-v1";
const schema = z.object({
  version: z.literal(1),
  numbers: z.array(inventorySchema.extend({ id: z.string() })).max(500),
  rentals: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      numberId: z.string(),
      start: z.number(),
      expires: z.number(),
      status: z.enum(["active", "expired", "cancelled"]),
      cost: z.number().int().nonnegative(),
    }),
  ),
  messages: z.array(
    z.object({
      id: z.string(),
      rentalId: z.string(),
      ownerId: z.string(),
      sender: z.string().max(100),
      body: z.string().max(2000),
      received: z.number(),
      read: z.boolean(),
      kind: z.enum(["text", "delivery", "code"]),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      ownerId: z.string(),
      key: z.string(),
      amount: z.number().int(),
      type: z.enum(["credit", "rental", "refund"]),
      description: z.string(),
      at: z.number(),
    }),
  ),
  profile: profileSchema,
  retentionDays: z.number().int().min(1).max(90),
  audit: z.array(
    z.object({ id: z.string(), action: z.string(), at: z.number() }),
  ),
});
export const demoStorage = {
  load(): State {
    const raw = localStorage.getItem(key);
    return raw ? reconcile(schema.parse(JSON.parse(raw))) : seed();
  },
  save(s: State) {
    localStorage.setItem(key, JSON.stringify(s));
  },
  reset() {
    localStorage.removeItem(key);
    return seed();
  },
};
