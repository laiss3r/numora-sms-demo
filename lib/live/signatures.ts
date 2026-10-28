import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import twilio from "twilio";
export function textbeeSignature(
  raw: string,
  signature: string,
  secret: string,
) {
  if (secret.length < 20 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(
    createHmac("sha256", secret).update(raw, "utf8").digest(),
    Buffer.from(signature, "hex"),
  );
}
export function twilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
) {
  if (!signature || !authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}
