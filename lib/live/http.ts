import "server-only";
import { LiveError } from "./config";
// Never propagate provider response bodies, URLs with credentials, or raw exceptions.
export async function providerFetch(
  provider: string,
  url: URL | string,
  init: RequestInit = {},
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new LiveError(
      502,
      "PROVIDER_UNREACHABLE",
      `${provider} request failed or timed out. A write may have succeeded upstream; refresh allocations before retrying.`,
    );
  }
  if (!response.ok)
    throw new LiveError(
      response.status === 429 ? 429 : 502,
      "PROVIDER_REJECTED",
      `${provider} returned HTTP ${response.status}. Check the account, permissions, inventory, billing and regulatory requirements in the provider console.`,
    );
  if (response.status === 204) return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new LiveError(
      502,
      "PROVIDER_RESPONSE",
      `${provider} returned an invalid response.`,
    );
  }
}
export async function limitedBody(req: Request, max = 65536) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new LiveError(413, "PAYLOAD_TOO_LARGE", "Request body too large.");
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > max) {
        await reader.cancel();
        throw new LiveError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Request body too large.",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
