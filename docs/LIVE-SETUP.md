# Live mode: real numbers and real SMS

This document describes the live integration implemented in this repository, what
has actually been verified, and exactly which accounts and credentials you must
supply. Read the honesty section first: **no live allocation and no real SMS has
been received or verified yet**, because no provider account, API key or SIM was
available while this was built.

## 1. What is implemented

| Area                       | Implementation                                                                                                                                                          | File                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Mode switch                | `APP_MODE=demo\|live`; unset defaults to `live` on Vercel production, otherwise `demo`                                                                                  | `lib/config.ts`                                                               |
| Operator authentication    | Server-only scrypt password hash + HMAC-signed, 12-hour, HttpOnly/SameSite=strict session cookie                                                                        | `lib/live/auth.ts`                                                            |
| Provider HTTP              | Timeouts, no redirects, no raw provider error bodies, typed response validation                                                                                         | `lib/live/http.ts`                                                            |
| Twilio number provisioning | Country list, SMS-capable inventory search, account-specific monthly price, allocation, release                                                                         | `lib/live/twilio.ts`                                                          |
| Twilio inbound SMS         | `GET /Messages.json` filtered to an owned Numora number, paginated                                                                                                      | `lib/live/twilio.ts`                                                          |
| TextBee inbound SMS        | `GET /api/v1/gateway/messages` with `direction=received` for one configured device, cursor pagination                                                                   | `lib/live/textbee.ts`                                                         |
| Signed webhooks            | Twilio signature (official SDK) and TextBee raw-body HMAC-SHA256                                                                                                        | `lib/live/signatures.ts`                                                      |
| Webhook receipts           | Optional durable deduplication, no message bodies stored                                                                                                                | `lib/live/events.ts`, `supabase/migrations/202610280002_webhook_receipts.sql` |
| Server API                 | `/api/live/status`, `/api/live/session`, `/api/live/countries`, `/api/live/numbers`, `/api/live/rentals`, `/api/live/messages`, `/api/live/release`, `/api/live/logout` | `app/api/live/[...path]/route.ts`                                             |
| Webhook endpoints          | `/api/webhooks/twilio`, `/api/webhooks/textbee`                                                                                                                         | `app/api/webhooks/[provider]/route.ts`                                        |
| Existing UI                | Country selector, number list, reservation dialog, rentals, inbox and Refresh now call provider APIs in live mode                                                       | `components/live.tsx`                                                         |
| Fail-closed UI             | Setup errors replace inventory/messages; demo data is never rendered in live mode                                                                                       | `components/live.tsx`, `components/public.tsx`                                |

The demo experience (`APP_MODE=demo`) is unchanged.

## 2. Honesty: what is verified and what is not

Verified here (no provider account needed):

- 58 unit/integration tests, including 28 live-integration tests against mocked
  transport using the documented Twilio and TextBee request/response shapes.
- 22 browser tests: the original demo/accessibility suite plus live-mode tests
  that prove no demo data appears in live mode, unauthenticated and cross-origin
  requests are rejected, and missing credentials produce setup errors.
- Twilio's REST host is reachable from the build environment and answers
  unauthenticated `GET /AvailablePhoneNumbers/US/Local.json` with **HTTP 401**
  (`WWW-Authenticate: Basic realm="Twilio API"`), which confirms the endpoint path.
- TextBee's host answered **HTTP 403 `error code: 1010`** (a Cloudflare edge
  response) from this sandbox, not an API response. TextBee connectivity must
  therefore be verified from your own network or deployment; the adapter follows
  the published request contract but has not been exercised against the live API.

**Not verified — and therefore not claimed:** any real number search result, any
real allocation, any real charge, any real inbound SMS, any webhook delivery, and
any current stock/pricing at VirtualSMS.

## 3. Providers: verified facts, cost, and role

### Twilio — paid number provisioning + inbound SMS (implemented)

- Search: `GET https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/AvailablePhoneNumbers/{Country}/{Local|Mobile|TollFree}.json`
  with `SmsEnabled=true`. Buy: `POST .../IncomingPhoneNumbers.json`. Release:
  `DELETE .../IncomingPhoneNumbers/{Sid}.json`. Inbound history: `GET .../Messages.json`.
- Pricing: `GET https://pricing.twilio.com/v1/PhoneNumbers/Countries/{Country}`.
  The app refuses to allocate if the price cannot be read or has changed since
  the quote, and shows the account-specific monthly price in the UI.
- **Cost: paid.** Numbers carry a recurring monthly fee per country/number type,
  plus inbound/outbound message usage, possible setup fees, taxes, and
  country-specific regulatory requirements (address bundles). A trial account has
  its own restrictions; review them in the Twilio Console before testing inbound SMS.
- **Terms constraint (important).** Twilio's Terms of Service prohibit reselling
  or making the service available to third parties, _except_ to your own End Users
  as part of an application you offer. Some countries also require regulatory
  bundles, and some ask whether you are an ISV assigning numbers to end customers.
  The integration implemented here is therefore a **single-operator workspace**,
  not a public number-rental marketplace. Operating a public rental site on one
  Twilio account without the appropriate agreement/approval is out of scope and
  may breach provider terms.

### TextBee — optional, uses your own phone and SIM (implemented)

- Docs: `POST`/`GET https://api.textbee.dev/api/v1/gateway/messages` with
  `x-api-key`, `direction=received`, `deviceIds`, `cursor`; signed webhooks with
  `X-Signature` (HMAC-SHA256 of the raw body).
- Source: <https://github.com/textbee/textbee> (MIT, actively maintained,
  self-hostable).
- **What it is:** a gateway for SMS on the SIM in your own Android phone
  (Android 7+). It does **not** rent or provision numbers and provides no
  multi-country inventory. It is free to start: 1 device, 50 messages/day,
  300/month on the Free plan; Pro is $14.99/month (or $99.99/year) for 5 devices.
  Carrier fair-use rules still apply to your SIM.

### VirtualSMS — investigated, **not integrated**

- Official docs exist (rentals API with `x-api-key`: availability, price,
  create/extend/cancel/swap, and reading SMS; prepaid USD balance; rentals from
  about $0.25/day; x402 stablecoin top-up or ordinary top-up). GitHub org:
  `virtualsms-io` (`api-docs`, `mcp-server`, `examples`).
- Its documented public catalogue endpoints (`/api/v1/rentals/available`,
  `/api/v1/rentals/pricing`) returned **HTTP 403** from the build environment, so
  its live coverage, stock and prices could not be confirmed here. It is a paid
  prepaid service. I did not add an adapter for an API I could not observe.
- Even if added later, this is a _verification-number_ service. Using it to run a
  public rental product may conflict with its terms; check them before building on it.

### Why there is no free multi-country provisioning

Real SMS-capable numbers have per-number recurring carrier costs and regulatory
obligations in most countries. No legitimate provider gives them away, and none
of the ones checked offers a free multi-country rental API. Free-real-SMS in this
project therefore means **TextBee on a SIM you already own** (single number,
your country), not rented foreign numbers. Anything advertising free global
number rentals with inbound SMS should be treated as suspicious.

## 4. Credentials you must supply

Set these as **server-side** environment variables (Vercel → Project → Settings →
Environment Variables, or `.env.local` for local runs). Never use `NEXT_PUBLIC_`
for any secret, and never commit them.

Required for live mode at all:

| Variable                 | Meaning                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `APP_MODE`               | `live` (Vercel production already defaults to `live`)             |
| `APP_URL`                | Canonical HTTPS origin, e.g. `https://numora-sms-demo.vercel.app` |
| `AUTH_SECRET`            | Random ≥32 characters (e.g. `openssl rand -hex 32`)               |
| `OPERATOR_PASSWORD_HASH` | scrypt hash produced by `scripts/operator-password.mjs`           |

Twilio (paid numbers and inbound SMS):

| Variable                              | Where to get it                                                         |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`                  | Twilio Console. Prefer a **dedicated subaccount** for Numora            |
| `TWILIO_API_KEY`, `TWILIO_API_SECRET` | Console → API keys and tokens (standard key)                            |
| `TWILIO_AUTH_TOKEN`                   | Auth token of that account/subaccount — only needed for signed webhooks |
| `LIVE_PURCHASE_ENABLED`               | `true` only when you intend real charges; default `false`               |

TextBee (your own phone/SIM):

| Variable                 | Where to get it                                              |
| ------------------------ | ------------------------------------------------------------ |
| `TEXTBEE_API_KEY`        | TextBee dashboard → API key                                  |
| `TEXTBEE_DEVICE_ID`      | TextBee dashboard → Devices                                  |
| `TEXTBEE_WEBHOOK_SECRET` | The ≥20-character signing secret you set on the subscription |

Optional webhooks (polling works without any database):

| Variable                                    | Meaning                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `LIVE_WEBHOOKS_ENABLED`                     | `true` to accept deliveries                                                |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-only; apply `supabase/migrations/202610280002_webhook_receipts.sql` |

Generate the operator hash locally (the password is read from stdin and never
printed):

```bash
node scripts/operator-password.mjs
# type the password, press Enter, copy the scrypt$… output to OPERATOR_PASSWORD_HASH
```

## 5. Deploy and configure (Vercel)

1. In Vercel, keep the GitHub integration on `laiss3r/numora-sms-demo` so pushes deploy.
2. Add the environment variables above for **Production** (and Preview if needed).
3. Redeploy after changing variables — Next.js reads them at runtime, but the
   deployment must be rebuilt/restarted after edits.
4. Confirm `/api/integrations/health` reports `"mode": "live"`.
5. Open `/dashboard`, sign in with the operator password.
6. Do **not** set `LIVE_PURCHASE_ENABLED=true` until you accept recurring charges.

## 6. Real-SMS acceptance test (do this once you have an account/SIM)

TextBee path, needs only a phone you own:

1. Install the TextBee app, sign in, enable receiving, note the device ID.
2. Send an SMS from another phone to your SIM.
3. In this app: `/dashboard/inbox` → source “TextBee” → **Refresh**. The message
   must appear with the real sender and text.
4. Optional: add a webhook subscription to `https://<your-domain>/api/webhooks/textbee`
   with `MESSAGE_RECEIVED` and your signing secret, set `LIVE_WEBHOOKS_ENABLED=true`,
   send another SMS, and confirm a 200 in the TextBee delivery log.

Twilio path, needs a funded account:

1. Configure Twilio credentials; open `/dashboard/numbers`.
2. Pick a country and number type, search. Only provider results are listed.
3. Confirm one number with the recurring-charge checkbox.
4. In the Twilio Console, confirm the number exists with `Numora:` in its friendly name.
5. Send an SMS from your phone to that number, then **Refresh** `/dashboard/inbox`
   with source “Twilio”.
6. For webhooks, set `TWILIO_AUTH_TOKEN`, `LIVE_WEBHOOKS_ENABLED=true`, Supabase
   receipts, then point the number’s SMS URL at `/api/webhooks/twilio` (the app sets
   this automatically on purchase when webhooks are enabled and Supabase is configured).

Record the result — including failures — in `docs/VERIFICATION.md`. Until a real
message appears, this project must not be described as “receiving real SMS”.

## 7. Security and scope of this integration

- Single trusted operator; there is no public sign-up, no per-customer ownership
  model, no customer deposits and no simulated ledger in live mode.
- Provider credentials never reach the browser; all provider calls happen in
  server routes. Responses are validated with Zod and never echo provider bodies.
- Purchase, release and webhook writes require same-origin, an authenticated
  session, and explicit flags; purchases also confirm the live price.
- Rate limiting is per server instance (memory), so serverless deployments get
  best-effort protection only; add a shared store before public exposure.
- Inbound message bodies are not persisted by this app; webhook receipts store a
  SHA-256 digest and event IDs only. The inbox fetches current provider history.
- Refund/expiry semantics differ from the demo: provider allocations bill until
  released; Twilio does not refund a number because you changed your mind.
- Not included: multi-tenant auth, payments, invoicing, per-user isolation, abuse
  prevention, 10DLC/sender registration, or approval to resell numbers.
