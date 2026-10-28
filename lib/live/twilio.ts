import "server-only";
import { z } from "zod";
import { need, LiveError, appOrigin } from "./config";
import { providerFetch } from "./http";
import type { Allocation, Country, LiveNumber, MessagePage } from "./types";
const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/);
const kind = z.enum(["Local", "Mobile", "TollFree"]);
const sid = z.string().regex(/^PN[0-9a-fA-F]{32}$/);
const ownedSchema = z.object({
  sid,
  phone_number: e164,
  friendly_name: z.string(),
  date_created: z.string(),
  status: z.string().optional(),
  capabilities: z.object({ sms: z.boolean() }),
});
const prefix = "Numora:";
export class TwilioNumbers {
  private account: string;
  private headers: Record<string, string>;
  private base: string;
  constructor() {
    this.account = need("TWILIO_ACCOUNT_SID");
    if (!/^AC[0-9a-fA-F]{32}$/.test(this.account))
      throw new LiveError(
        503,
        "SETUP_REQUIRED",
        "TWILIO_ACCOUNT_SID has an invalid format.",
      );
    const key = need("TWILIO_API_KEY");
    const secret = need("TWILIO_API_SECRET");
    this.headers = {
      Authorization:
        "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
    };
    this.base = `https://api.twilio.com/2010-04-01/Accounts/${this.account}`;
  }
  private async call(
    path: string,
    method = "GET",
    params?: Record<string, string>,
  ) {
    const url = new URL(this.base + path);
    const init: RequestInit = { method, headers: { ...this.headers } };
    if (params) {
      if (method === "GET") url.search = new URLSearchParams(params).toString();
      else {
        init.body = new URLSearchParams(params);
        init.headers = {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded",
        };
      }
    }
    return providerFetch("Twilio", url, init);
  }
  async countries(): Promise<Country[]> {
    const data = z
      .object({
        countries: z.array(
          z.object({
            country_code: z.string(),
            country: z.string(),
            subresource_uris: z.record(z.string(), z.string()),
          }),
        ),
      })
      .parse(
        await this.call("/AvailablePhoneNumbers.json", "GET", {
          PageSize: "1000",
        }),
      );
    return data.countries
      .map((c) => ({
        code: c.country_code,
        name: c.country,
        types: kind.options.filter((t) =>
          Object.keys(c.subresource_uris).some(
            (k) => k.toLowerCase().replaceAll("_", "") === t.toLowerCase(),
          ),
        ),
      }))
      .filter((c) => c.types.length > 0);
  }
  async search(
    country: string,
    type: LiveNumber["type"],
    contains = "",
  ): Promise<LiveNumber[]> {
    z.string()
      .regex(/^[A-Z]{2}$/)
      .parse(country);
    kind.parse(type);
    z.string()
      .max(30)
      .regex(/^[\d+*]*$/)
      .parse(contains);
    const data = z
      .object({
        available_phone_numbers: z.array(
          z.object({
            phone_number: e164,
            iso_country: z.string(),
            address_requirements: z.string().optional(),
            capabilities: z.object({
              SMS: z.boolean().optional(),
              sms: z.boolean().optional(),
            }),
          }),
        ),
      })
      .parse(
        await this.call(
          `/AvailablePhoneNumbers/${country}/${type}.json`,
          "GET",
          {
            SmsEnabled: "true",
            PageSize: "30",
            ...(contains ? { Contains: contains } : {}),
          },
        ),
      );
    if (!data.available_phone_numbers.length) return [];
    const pricing = z
      .object({
        price_unit: z.string(),
        phone_number_prices: z.array(
          z.object({
            number_type: z.string(),
            current_price: z.union([z.string(), z.number()]),
          }),
        ),
      })
      .parse(
        await providerFetch(
          "Twilio Pricing",
          `https://pricing.twilio.com/v1/PhoneNumbers/Countries/${country}`,
          { headers: this.headers },
        ),
      );
    const name = type === "TollFree" ? "toll free" : type.toLowerCase();
    const price = pricing.phone_number_prices.find(
      (p) => p.number_type === name,
    );
    if (!price || !/^\d+(\.\d+)?$/.test(String(price.current_price)))
      throw new LiveError(
        502,
        "PRICE_UNAVAILABLE",
        "Provider pricing could not be verified. Reservation is disabled.",
      );
    return data.available_phone_numbers
      .filter((n) => n.capabilities.SMS || n.capabilities.sms)
      .map((n) => ({
        number: n.phone_number,
        country: n.iso_country,
        type,
        monthlyPrice: String(price.current_price),
        currency: pricing.price_unit.toUpperCase(),
        addressRequired:
          !!n.address_requirements && n.address_requirements !== "none",
      }));
  }
  async allocations(): Promise<Allocation[]> {
    const data = z
      .object({
        incoming_phone_numbers: z.array(ownedSchema),
        next_page_uri: z.string().nullable().optional(),
      })
      .parse(
        await this.call("/IncomingPhoneNumbers.json", "GET", {
          PageSize: "1000",
        }),
      );
    if (data.next_page_uri)
      throw new LiveError(
        502,
        "PAGINATION_REQUIRED",
        "Account has more than 1,000 numbers. Use a dedicated subaccount for Numora.",
      );
    return data.incoming_phone_numbers
      .filter((n) => n.friendly_name.startsWith(prefix) && n.capabilities.sms)
      .map((n) => ({
        id: n.sid,
        number: n.phone_number,
        started: n.date_created,
        status: n.status || "in-use",
      }));
  }
  async allocation(id: string) {
    sid.parse(id);
    const n = ownedSchema.parse(
      await this.call(`/IncomingPhoneNumbers/${id}.json`),
    );
    if (!n.friendly_name.startsWith(prefix) || !n.capabilities.sms)
      throw new LiveError(
        404,
        "NOT_OWNED",
        "This number is not managed by Numora in the configured account.",
      );
    return {
      id: n.sid,
      number: n.phone_number,
      started: n.date_created,
      status: n.status || "in-use",
    };
  }
  async reserve(input: {
    number: string;
    country: string;
    type: LiveNumber["type"];
    quotedPrice: string;
    quotedCurrency: string;
  }) {
    if (process.env.LIVE_PURCHASE_ENABLED !== "true")
      throw new LiveError(
        403,
        "PURCHASE_DISABLED",
        "Real purchases are disabled. Review provider billing, terms and country regulations before enabling LIVE_PURCHASE_ENABLED.",
      );
    e164.parse(input.number);
    const existing = (await this.allocations()).find(
      (n) => n.number === input.number,
    );
    if (existing) return existing;
    const found = (
      await this.search(input.country, input.type, input.number)
    ).find((n) => n.number === input.number);
    if (!found)
      throw new LiveError(
        409,
        "UNAVAILABLE",
        "This number is no longer available. Refresh provider inventory.",
      );
    if (found.addressRequired)
      throw new LiveError(
        409,
        "REGULATORY_REQUIRED",
        "Complete this country’s address/bundle requirements in Twilio Console before using this app. No purchase was attempted.",
      );
    if (
      found.monthlyPrice !== input.quotedPrice ||
      found.currency !== input.quotedCurrency
    )
      throw new LiveError(
        409,
        "PRICE_CHANGED",
        "Provider price changed. Refresh inventory and reconfirm the recurring price.",
      );
    const params: Record<string, string> = {
      PhoneNumber: found.number,
      FriendlyName: `${prefix}${found.number}`,
    };
    if (process.env.LIVE_WEBHOOKS_ENABLED === "true") {
      need("TWILIO_AUTH_TOKEN");
      need("SUPABASE_URL");
      need("SUPABASE_SERVICE_ROLE_KEY");
      params.SmsUrl = appOrigin() + "/api/webhooks/twilio";
      params.SmsMethod = "POST";
    }
    const n = ownedSchema.parse(
      await this.call("/IncomingPhoneNumbers.json", "POST", params),
    );
    return {
      id: n.sid,
      number: n.phone_number,
      started: n.date_created,
      status: n.status || "in-use",
    };
  }
  async release(id: string) {
    await this.allocation(id);
    await this.call(`/IncomingPhoneNumbers/${id}.json`, "DELETE");
  }
  async messages(id: string, page = 0): Promise<MessagePage> {
    const n = await this.allocation(id);
    const data = z
      .object({
        messages: z.array(
          z.object({
            sid: z.string(),
            from: z.string(),
            to: z.string(),
            body: z.string(),
            direction: z.string(),
            date_sent: z.string().nullable(),
            date_created: z.string(),
          }),
        ),
        next_page_uri: z.string().nullable().optional(),
      })
      .parse(
        await this.call("/Messages.json", "GET", {
          To: n.number,
          PageSize: "50",
          Page: String(page),
        }),
      );
    return {
      messages: data.messages
        .filter((m) => m.direction === "inbound" && m.to === n.number)
        .map((m) => ({
          id: m.sid,
          sender: m.from,
          body: m.body,
          received: m.date_sent || m.date_created,
          number: n.number,
          source: "twilio",
        })),
      next: data.next_page_uri ? String(page + 1) : null,
    };
  }
}
