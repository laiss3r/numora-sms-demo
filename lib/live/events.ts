import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { need, LiveError } from "./config";
import { providerFetch } from "./http";
export async function recordReceipt(
  provider: "twilio" | "textbee",
  eventId: string,
  raw: string,
): Promise<boolean> {
  const origin = new URL(need("SUPABASE_URL"));
  if (origin.protocol !== "https:" || origin.username || origin.password)
    throw new LiveError(
      503,
      "SETUP_REQUIRED",
      "SUPABASE_URL must be an HTTPS project URL.",
    );
  const key = need("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL("/rest/v1/webhook_receipts", origin);
  url.searchParams.set("on_conflict", "provider,event_id");
  const value = await providerFetch("Webhook receipt storage", url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify({
      provider,
      event_id: eventId,
      payload_digest: createHash("sha256").update(raw).digest("hex"),
    }),
  });
  const data = z.array(z.object({ id: z.string() })).parse(value);
  return data.length > 0;
}
