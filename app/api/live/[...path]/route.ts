import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  appOrigin,
  liveOnly,
  LiveError,
  need,
  setupIssues,
} from "@/lib/live/config";
import {
  cookieName,
  createSession,
  passwordMatches,
  rateLimit,
  requireOperator,
  requireOrigin,
  validSession,
} from "@/lib/live/auth";
import { limitedBody } from "@/lib/live/http";
import { TwilioNumbers } from "@/lib/live/twilio";
import { TextBeeGateway } from "@/lib/live/textbee";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
function failure(error: unknown) {
  if (error instanceof LiveError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof SyntaxError)
    return json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  if (error instanceof z.ZodError)
    return json(
      {
        error:
          "Invalid request or unexpected provider response. Check field formats and provider API compatibility.",
        code: "VALIDATION_ERROR",
      },
      400,
    );
  return json(
    {
      error:
        "Operation failed safely. Check provider configuration; no internal details were exposed.",
      code: "INTERNAL_ERROR",
    },
    500,
  );
}
export async function GET(req: NextRequest) {
  try {
    liveOnly();
    const path = new URL(req.url).pathname.split("/api/live/")[1];
    const q = req.nextUrl.searchParams;
    if (path === "status")
      return json({
        mode: "live",
        authenticated: validSession(req.cookies.get(cookieName)?.value || ""),
        twilio: !!(
          process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_API_KEY &&
          process.env.TWILIO_API_SECRET
        ),
        textbee: !!(
          process.env.TEXTBEE_API_KEY && process.env.TEXTBEE_DEVICE_ID
        ),
        purchaseEnabled: process.env.LIVE_PURCHASE_ENABLED === "true",
        webhooks: process.env.LIVE_WEBHOOKS_ENABLED === "true",
        issues: setupIssues(),
      });
    requireOperator(req);
    rateLimit("operator:read", 120);
    if (path === "countries")
      return json({ countries: await new TwilioNumbers().countries() });
    if (path === "numbers") {
      const input = z
        .object({
          country: z.string().regex(/^[A-Z]{2}$/),
          type: z.enum(["Local", "Mobile", "TollFree"]).default("Local"),
          search: z.string().max(30).default(""),
        })
        .parse(Object.fromEntries(q));
      return json({
        numbers: await new TwilioNumbers().search(
          input.country,
          input.type,
          input.search,
        ),
      });
    }
    if (path === "rentals")
      return json({ rentals: await new TwilioNumbers().allocations() });
    if (path === "messages") {
      const source = z.enum(["twilio", "textbee"]).parse(q.get("source"));
      if (source === "textbee") {
        const cursor = z
          .string()
          .max(2048)
          .optional()
          .parse(q.get("cursor") || undefined);
        return json(await new TextBeeGateway().messages(cursor));
      }
      const id = z
        .string()
        .regex(/^PN[0-9a-fA-F]{32}$/)
        .parse(q.get("rental"));
      const page = z.coerce
        .number()
        .int()
        .min(0)
        .max(1000)
        .parse(q.get("page") || 0);
      return json(await new TwilioNumbers().messages(id, page));
    }
    return json({ error: "Route not found" }, 404);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    liveOnly();
    requireOrigin(req);
    const path = new URL(req.url).pathname.split("/api/live/")[1];
    if (path === "session") {
      // Global per-instance bucket cannot be bypassed by a spoofed forwarding header.
      rateLimit(
        "login",
        Math.min(
          100,
          Math.max(5, Number(process.env.AUTH_MAX_ATTEMPTS || 5) || 5),
        ),
      );
      const input = z
        .object({ password: z.string().min(16).max(256) })
        .strict()
        .parse(JSON.parse(await limitedBody(req, 2048)));
      const hash = need("OPERATOR_PASSWORD_HASH");
      if (!passwordMatches(input.password, hash))
        throw new LiveError(
          401,
          "AUTH_FAILED",
          "Invalid operator credentials.",
        );
      const response = json({ authenticated: true });
      response.cookies.set(cookieName, createSession(), {
        httpOnly: true,
        secure: new URL(appOrigin()).protocol === "https:",
        sameSite: "strict",
        maxAge: 12 * 3600,
        path: "/",
      });
      return response;
    }
    requireOperator(req);
    rateLimit("operator:write", 10);
    if (path === "logout") {
      const response = json({ ok: true });
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: new URL(appOrigin()).protocol === "https:",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      });
      return response;
    }
    if (path === "rentals") {
      const input = z
        .object({
          number: z.string().regex(/^\+[1-9]\d{6,14}$/),
          country: z.string().regex(/^[A-Z]{2}$/),
          type: z.enum(["Local", "Mobile", "TollFree"]),
          quotedPrice: z.string().regex(/^\d+(\.\d+)?$/),
          quotedCurrency: z.string().regex(/^[A-Z]{3}$/),
          acceptRecurringCharges: z.literal(true),
        })
        .strict()
        .parse(JSON.parse(await limitedBody(req, 4096)));
      return json({ rental: await new TwilioNumbers().reserve(input) }, 201);
    }
    if (path === "release") {
      const input = z
        .object({
          id: z.string().regex(/^PN[0-9a-fA-F]{32}$/),
          confirmPermanentRelease: z.literal(true),
        })
        .strict()
        .parse(JSON.parse(await limitedBody(req, 2048)));
      await new TwilioNumbers().release(input.id);
      return json({ released: true });
    }
    return json({ error: "Route not found" }, 404);
  } catch (error) {
    return failure(error);
  }
}
