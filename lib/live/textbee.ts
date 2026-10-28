import "server-only";
import { z } from "zod";
import { need } from "./config";
import { providerFetch } from "./http";
import type { MessagePage } from "./types";
export class TextBeeGateway {
  private key: string;
  private device: string;
  constructor() {
    this.key = need("TEXTBEE_API_KEY");
    this.device = need("TEXTBEE_DEVICE_ID");
  }
  async messages(cursor?: string): Promise<MessagePage> {
    const url = new URL("https://api.textbee.dev/api/v1/gateway/messages");
    url.search = new URLSearchParams({
      direction: "received",
      deviceIds: this.device,
      order: "desc",
      limit: "50",
      ...(cursor ? { cursor } : {}),
    }).toString();
    const data = z
      .object({
        data: z.array(
          z.object({
            _id: z.string(),
            message: z.string(),
            direction: z.string(),
            sender: z.string(),
            receivedAt: z.string(),
            device: z.object({ _id: z.string() }),
          }),
        ),
        meta: z.object({
          nextCursor: z.string().nullable(),
          hasMore: z.boolean(),
        }),
      })
      .parse(
        await providerFetch("TextBee", url, {
          headers: { "x-api-key": this.key },
        }),
      );
    return {
      messages: data.data
        .filter(
          (m) => m.direction === "received" && m.device._id === this.device,
        )
        .map((m) => ({
          id: m._id,
          sender: m.sender,
          body: m.message,
          received: m.receivedAt,
          number: "Configured Android SIM",
          source: "textbee",
        })),
      next: data.meta.hasMore ? data.meta.nextCursor : null,
    };
  }
}
