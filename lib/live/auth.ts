import "server-only";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest } from "next/server";
import { appOrigin, LiveError, need } from "./config";
export const cookieName = "numora_operator";
function secret() {
  const v = need("AUTH_SECRET");
  if (v.length < 32)
    throw new LiveError(
      503,
      "SETUP_REQUIRED",
      "AUTH_SECRET must contain at least 32 characters.",
    );
  return v;
}
export function passwordMatches(password: string, hash: string) {
  const [kind, salt, hex] = hash.split("$");
  if (kind !== "scrypt" || !salt || !hex || !/^[a-f0-9]{128}$/.test(hex))
    return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
export function createSession(now = Date.now()) {
  const body = Buffer.from(
    JSON.stringify({
      sub: "operator",
      exp: now + 12 * 3600000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return (
    body + "." + createHmac("sha256", secret()).update(body).digest("base64url")
  );
}
export function validSession(value: string, now = Date.now()) {
  try {
    const [body, mac, ...rest] = value.split(".");
    if (rest.length || !body || !mac) return false;
    const expected = createHmac("sha256", secret())
      .update(body)
      .digest("base64url");
    if (
      mac.length !== expected.length ||
      !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
    )
      return false;
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return (
      p.sub === "operator" &&
      Number.isSafeInteger(p.exp) &&
      p.exp > now &&
      p.exp <= now + 12 * 3600000
    );
  } catch {
    return false;
  }
}
export function requireOperator(req: NextRequest) {
  need("OPERATOR_PASSWORD_HASH");
  secret();
  appOrigin();
  if (!validSession(req.cookies.get(cookieName)?.value || ""))
    throw new LiveError(
      401,
      "AUTH_REQUIRED",
      "Sign in as the account operator to access real numbers and private SMS.",
    );
}
export function requireOrigin(req: Request) {
  if (req.headers.get("origin") !== appOrigin())
    throw new LiveError(
      403,
      "ORIGIN_DENIED",
      "Request origin is not permitted.",
    );
}
// Bounded per-instance guard, not a distributed/serverless-wide quota.
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 30, now = Date.now()) {
  for (const [k, v] of attempts) if (v.reset <= now) attempts.delete(k);
  if (attempts.size >= 5000 && !attempts.has(key))
    throw new LiveError(429, "RATE_LIMIT", "Too many requests. Try later.");
  const entry = attempts.get(key) || { count: 0, reset: now + 60000 };
  entry.count++;
  attempts.set(key, entry);
  if (entry.count > max)
    throw new LiveError(
      429,
      "RATE_LIMIT",
      "Too many requests. Wait one minute.",
    );
}
