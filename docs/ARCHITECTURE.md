# Architecture and threat model

## Layers
- `components/ui.tsx`: accessible native dialogs, badges and shared UI helpers.
- `components/customer.tsx`, `admin.tsx`, `public.tsx`: views and form inputs; React Hook Form + Zod for profile validation.
- `components/store.tsx`: hydration, local-demo access opt-in, persistence coordination, safe error/status display.
- `lib/demo.ts`: pure state transitions, inventory validation, duration validation, ownership checks, expiration, retention, idempotent transaction service.
- `lib/storage.ts`: versioned, runtime-validated browser demo data adapter. No backend dependency.
- `lib/types.ts`: shared domain types; actor ID is just a local demo persona.
- `lib/providers.ts`: number/messaging/payment/authentication contracts and demo/unconfigured adapters.
- `lib/config.ts`: configuration validation; absent credentials => demo; every non-demo mode fails closed.
- `app/api/integrations/[...path]/route.ts`: disabled live integration boundary; no parsing/logging of message content or secrets.
- `supabase/migrations`: optional future schema, tenant RLS, limited column grants and service-only wallet ledger RPC.
- `tests`: business rules and a local PostgreSQL-compatible schema check with mock auth.
- `e2e`: desktop/mobile journey, public pages, admin gate, endpoint failures and axe checks.

## Deliberate demo limitations

All records are browser-local, unencrypted, mutable, single-persona and non-authoritative. Admin opt-in is reset on reload; it only gates local demo service calls and UI. It is not real authentication or server RBAC. No production operation can be enabled just by supplying credentials. POST integration endpoints always refuse requests (503 or cross-origin 403).

The central transaction service rejects invalid signs, zero/non-integer amounts, insufficient balances and conflicting duplicate keys. Cancellation keys are tied to rental IDs. This prevents duplicate actions in the normal single-tab workflow; it is NOT an atomic multi-client ledger. Multiple tabs/devices are not synchronized and can overwrite browser-local history. Use one tab for the demo.

React encodes interpolated content; no raw HTML is rendered. No message content is sent to a provider or added to audit logs. Zod validates forms and restored storage. A corrupted local record seeds a fresh demo with a visible warning. Browser storage failure gives a visible warning and an in-memory-only session.

Sample generation has a five-per-rental/minute local throttle. This is not an internet-facing rate limiter. There are no enabled sensitive server operations to rate-limit in this release; real endpoints require distributed rate limiting and payload caps before implementation. All webhook signatures are rejected; a successful real signature verifier has intentionally NOT been invented.

Expiration uses epoch timestamps (not timer counters), reconciled on hydration, focus, actions and every 15 seconds. Device clock tampering is possible. Retention applies during app activity/next visit, not while the browser is closed. Reset and deletion affect only this browser.

## Future provider event flow

Authenticate raw signed webhook => enforce replay window => insert unique `(provider,event_id)` plus digest => lookup provider number and active server-owned rental => write owned message idempotently => mark event processed => return success. Do not retain raw payloads beyond the minimum operational need. All retries must be idempotent; invalid signatures never change state. This flow is a design, not a claimed integration.

## SQL scope

All 12 requested tables have UUID keys, appropriate ownership references, enums/checks, indexes and RLS. Direct customer writes to roles, inventory, rentals, wallets, transactions, events and audit are denied. Customer profile/preferences updates and message read/deletion are column-restricted. No blanket browser-admin bypass exists: privileged operations go through an authorized server. The service-only ledger function locks a wallet row and makes postings idempotent. Complete atomic provider reservation/cancellation, verified payment/refund business rules and server retention jobs remain future work.
