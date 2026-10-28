# Verification and delivery status

Date: 28 October 2026. Execution environment: Linux, Node 20.20.2, npm 10.8.2.

## Actual executed checks

| Check                                             | Result                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Clean dependency install `npm ci`                 | PASS; lockfile works without legacy-peer flags                                                   |
| `npm run lint`                                    | PASS; no lint errors/warnings                                                                    |
| `npm run typecheck`                               | PASS; TypeScript strict                                                                          |
| `npm test`                                        | PASS: 58 tests across 3 files (25 domain, 5 SQL/RLS, 28 live-integration)                        |
| `npm run build`                                   | PASS: optimized Next.js 16.4.3 production build                                                  |
| `npm run test:e2e` against two production servers | PASS: 22 tests, desktop/mobile Chromium (16 demo/accessibility, 6 live-mode fail-closed/sign-in) |
| `npm audit --omit=dev`                            | 0 reported vulnerabilities at execution time                                                     |
| Responsive page checks                            | PASS: no document-level horizontal overflow on tested routes/viewports                           |
| Automated accessibility scans                     | PASS on tested essential light pages and selected dark pages; not manual certification           |
| Future SQL migration                              | Executed in local PGlite with mock Supabase auth/roles; 4 schema/RLS/ledger tests pass           |
| Real Supabase migration                           | NOT performed; no account/database connected                                                     |
| Git local history                                 | Created on main; see supplied Git bundle / local `git log`                                       |
| GitHub public repository + push                   | DONE: https://github.com/laiss3r/numora-sms-demo, commit 8336230 pushed and verified             |
| Vercel deployment                                 | NOT performed from this session (connector disconnected); existing deployment predates live mode |
| Real provider allocation / real inbound SMS       | NOT verified: no Twilio account, TextBee key or SIM was available                                |

The 25 domain tests cover filtering, masked-number validation, rental creation, duplicate reservations, invalid durations/unavailable numbers, timestamp expiry, cancellation/refund, inactive rental errors, sample creation/read/ownership/rate limits/retention, integer ledger arithmetic/idempotency/invalid amounts, inventory permissions/history/audit, environment fail-closed behavior, rejected webhook signatures, disabled real payments/auth and demo provider adapters.

The 4 SQL tests cover all 12 RLS-enabled tables, tenant profile/role/wallet reads, denied browser role escalation and ledger RPC, wallet postings/idempotency conflicts and insufficient balance. SQL syntax and basic grants are exercised locally, not in a real Supabase project. Real concurrent reservation and integration behavior still require implementation and real backend tests.

Browser tests run both desktop and an iPhone-sized Chromium viewport (not Safari): full home→browse→rental→sample code→read→reload→wallet→cancel→refund journey, local admin opt-in/inventory disable/removal, public/workspace routes, disabled server writes and origin rejection, light accessibility checks plus dark preference persistence/accessibility. No real SMS/payment tests are claimed.

## Issues found and resolved while building

- Initial npm dependency installation failed; retried and produced a reproducible lockfile.
- TypeScript 7 was incompatible with the ESLint ecosystem. Pinned TypeScript 5.9.3.
- ESLint 10 caused peer dependency/lockfile issues in Next's lint plugin ecosystem. Pinned peer-compatible ESLint 9.39.5, verified clean `npm ci`.
- **Known development-tool warning:** npm marks ESLint 9 as no longer supported. No audit vulnerability was reported. Upgrade the lint plugin ecosystem together before production; do not silently force incompatible peer versions.
- Browser tests initially could not launch because system libraries were absent. Installed Playwright Chromium and required Linux dependencies; reran successfully.
- Automated scans found light/dark low-contrast labels, duplicate navigation landmarks, an empty table heading and a mobile non-focusable scroll region. Fixed and reran the scans successfully.
- Future schema test initially expected 13 tables; the requested list contains 12. Corrected the test count; all required tables are present.

## Live integration verification (28 tests added)

Executed after the initial delivery. Live mode authenticates a single operator with a
server-only scrypt hash and a signed HttpOnly session cookie, then calls provider APIs
from server routes only.

Covered by mocked-transport tests against the documented provider contracts:
Twilio country/type discovery, SMS-enabled inventory search, account pricing lookup,
price-change refusal, regulatory-requirement refusal, allocation idempotency,
ownership checks before release/message reads, inbound filtering and pagination;
TextBee received-message retrieval scoped to the configured device and cursor
pagination; raw-body HMAC-SHA256 webhook verification; official Twilio signature
verification; durable webhook deduplication that stores a digest but no SMS content;
setup errors when credentials are absent; rejection of unauthenticated, forged-cookie
and cross-origin requests; bounded request bodies and rate limiting; and demo mode
disabling live endpoints.

Browser tests prove that a live-mode deployment shows setup errors instead of demo
numbers/messages, never renders `DEMO-` placeholders, refuses unauthenticated and
cross-origin writes, and completes operator sign-in/sign-out.

Live network spot checks from the build environment:

| Check                                                                 | Result                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Twilio `GET /AvailablePhoneNumbers/US/Local.json` without credentials | HTTP 401 with `WWW-Authenticate: Basic realm="Twilio API"` — endpoint reachable, authentication required                       |
| TextBee `GET /api/v1/gateway/messages`                                | HTTP 403 `error code: 1010` — Cloudflare edge block on this sandbox, not an API result; must be verified from your own network |
| VirtualSMS `/api/v1/rentals/available`, `/rentals/pricing`            | HTTP 403 from this environment; provider not integrated                                                                        |

Still unverified: any real allocation, charge, inbound SMS, webhook delivery, and
TextBee live API behavior. Live mode is single-operator only and is not a public
number-resale service; see `docs/LIVE-SETUP.md` for terms, costs and the acceptance test.

## External blockers — not completed

1. GitHub connector lookup returned `unsupported`. There was no GitHub CLI or privately supplied GitHub token environment in this execution environment. A leaked screenshot token was neither read into a credential store nor used. **Revoke it.**
2. No authorized GitHub identity is known; no real repository URL, remote default branch or pushed commit can be reported. README section 7 gives secure browser/device authorization steps on the user's computer.
3. The Vercel connector lookup returned `disconnected`. Connect Vercel in Arena’s connected-apps interface to authorize deployment; do not paste a token. No Vercel account is authorized. No Vercel project/deployment or public URL was created. The active Arena preview is only a sandbox preview, not a Vercel deployment.
4. No production SMS provider, payment provider, authentication service or real backend is configured. Live mode deliberately fails closed.

The user's full completion condition (source pushed to authorized GitHub) is therefore **not yet satisfied**, despite a working and tested demo. Local commits and downloadable source are supplied to avoid losing completed work.
