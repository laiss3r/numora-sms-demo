import "server-only";
import { z } from "zod";
import { validateEnvironment } from "../config";
export class LiveError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function need(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = env[name];
  if (!value)
    throw new LiveError(
      503,
      "SETUP_REQUIRED",
      `Setup required: ${name} is not configured on the server.`,
    );
  return value;
}
export function liveOnly() {
  if (validateEnvironment(process.env).mode !== "live")
    throw new LiveError(
      503,
      "LIVE_DISABLED",
      "Live integration is disabled in demo mode.",
    );
}
export function appOrigin() {
  const value = need("APP_URL");
  const url = z.url().parse(value);
  const parsed = new URL(url);
  if (
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  )
    throw new LiveError(
      503,
      "SETUP_REQUIRED",
      "APP_URL must be the canonical origin without a path or credentials.",
    );
  // Production deployments must be HTTPS; loopback origins are allowed only so an
  // isolated local production build can be tested without a certificate.
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
    parsed.hostname,
  );
  if (
    process.env.NODE_ENV === "production" &&
    parsed.protocol !== "https:" &&
    !loopback
  )
    throw new LiveError(
      503,
      "SETUP_REQUIRED",
      "APP_URL must use HTTPS in production.",
    );
  return parsed.origin;
}
export function setupIssues() {
  const names = ["APP_URL", "AUTH_SECRET", "OPERATOR_PASSWORD_HASH"];
  return names
    .filter((n) => !process.env[n])
    .map((n) => `${n} is not configured`);
}
