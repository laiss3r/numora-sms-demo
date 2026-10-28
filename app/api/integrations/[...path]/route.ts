import { validateEnvironment } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";
// Fail closed: no live adapter, sessions or webhook verifier is installed.
// Never parse, retain or log message bodies or credentials here.
export async function POST(request: NextRequest) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return NextResponse.json({ error: "Origin denied" }, { status: 403 });
  return NextResponse.json(
    {
      error:
        "Live integrations are not configured. Webhooks, payments and privileged server operations are disabled.",
    },
    { status: 503 },
  );
}
export async function GET() {
  return NextResponse.json({
    mode: validateEnvironment(process.env).mode,
    database:
      validateEnvironment(process.env).mode === "demo"
        ? "browser-local"
        : "provider-authoritative",
    sms: "not configured",
    payments: "disabled",
    authentication: "not configured",
  });
}
