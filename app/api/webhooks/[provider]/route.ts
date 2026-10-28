import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin, liveOnly, LiveError, need } from "@/lib/live/config";
import { limitedBody } from "@/lib/live/http";
import { textbeeSignature, twilioSignature } from "@/lib/live/signatures";
import { recordReceipt } from "@/lib/live/events";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    liveOnly();
    if (process.env.LIVE_WEBHOOKS_ENABLED !== "true")
      throw new LiveError(
        503,
        "SETUP_REQUIRED",
        "Webhooks are disabled. Provider API polling remains available.",
      );
    const { provider } = await params;
    const raw = await limitedBody(req);
    let id: string;
    if (provider === "textbee") {
      if (
        !textbeeSignature(
          raw,
          req.headers.get("x-signature") || "",
          need("TEXTBEE_WEBHOOK_SECRET"),
        )
      )
        throw new LiveError(
          401,
          "INVALID_SIGNATURE",
          "Webhook signature rejected.",
        );
      const event = z
        .object({
          smsId: z.string().min(1).max(100),
          deviceId: z.string(),
          idempotencyKey: z.string().min(1).max(200),
          webhookEvent: z.literal("MESSAGE_RECEIVED"),
          sender: z.string().max(100),
          message: z.string().max(10000),
          receivedAt: z.iso.datetime({ offset: true }),
        })
        .parse(JSON.parse(raw));
      if (event.deviceId !== need("TEXTBEE_DEVICE_ID"))
        throw new LiveError(403, "DEVICE_DENIED", "Unrecognized device.");
      id = event.deviceId + ":" + event.idempotencyKey;
    } else if (provider === "twilio") {
      if (
        !req.headers
          .get("content-type")
          ?.startsWith("application/x-www-form-urlencoded")
      )
        throw new LiveError(
          415,
          "CONTENT_TYPE",
          "Expected form-encoded webhook.",
        );
      const form = new URLSearchParams(raw);
      if ([...form.keys()].length !== new Set(form.keys()).size)
        throw new LiveError(
          400,
          "INVALID_PAYLOAD",
          "Duplicate parameters are not supported.",
        );
      const fields = Object.fromEntries(form);
      const url =
        appOrigin() + "/api/webhooks/twilio" + new URL(req.url).search;
      if (
        !twilioSignature(
          url,
          fields,
          req.headers.get("x-twilio-signature") || "",
          need("TWILIO_AUTH_TOKEN"),
        )
      )
        throw new LiveError(
          401,
          "INVALID_SIGNATURE",
          "Webhook signature rejected.",
        );
      const event = z
        .object({
          AccountSid: z.string(),
          MessageSid: z.string().regex(/^SM[0-9a-fA-F]{32}$/),
          From: z.string(),
          To: z.string(),
          Body: z.string().max(10000),
        })
        .parse(fields);
      if (event.AccountSid !== need("TWILIO_ACCOUNT_SID"))
        throw new LiveError(403, "ACCOUNT_DENIED", "Unrecognized account.");
      id = event.AccountSid + ":" + event.MessageSid;
    } else
      throw new LiveError(404, "NOT_FOUND", "Webhook provider not supported.");
    const first = await recordReceipt(provider, id, raw);
    // Do not send an automatic reply. SMS contents stay with the provider; the
    // authenticated inbox pulls current provider history, so no lossy local cache.
    if (provider === "twilio")
      return new NextResponse("<Response/>", {
        status: 200,
        headers: { "Content-Type": "text/xml", "Cache-Control": "no-store" },
      });
    return NextResponse.json(
      { accepted: true, duplicate: !first },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LiveError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Webhook processing unavailable. Retry later." },
      { status: 503 },
    );
  }
}
