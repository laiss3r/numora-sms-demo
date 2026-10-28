# Production readiness: NOT production-ready

This version is a functional simulator. Do not remove the demo labels and sell service.

## Security boundary
- [ ] Deploy and test real authentication: verified sessions, secure HttpOnly/SameSite cookies, logout, session rotation and recovery.
- [ ] Server-side authorization for every read/write. Fetch roles from trusted database records, never request bodies or client flags.
- [ ] Validate each input on the server; allowlist writable fields; test ownership/IDOR and mass assignment.
- [ ] Establish origin/CSRF defenses appropriate to the real auth flow, strict CSP with Next.js nonces and monitoring; review security headers.
- [ ] Distributed rate limiting, trusted proxy/client IP handling, payload limits, abuse reporting and audit collection.
- [ ] Live admin inaccessible without server-verified admin authorization. The local demo opt-in is NOT protection for real data.

## Telecom integration
- [ ] Official API reviewed and rental/resale permission explicitly confirmed.
- [ ] Country legality, supported sender types, inbound SMS capability, inventory, availability and actual prices verified.
- [ ] Implement real adapters only after that review, with sandbox/integration tests and failure recovery.
- [ ] Exact provider signature algorithm over raw bytes; timestamp/replay window and event-ID uniqueness; reject all invalid/unsigned events.
- [ ] Never label messages as telecom-delivered without authenticated webhook confirmation. No universal verification-code guarantees.
- [ ] Respect third-party platform restrictions; no account verification evasion or unauthorized interception.

## Data & money
- [ ] Run migration against a disposable actual Supabase project and test two actual authenticated users and an administrator.
- [ ] Local PGlite tests cover syntax, basic RLS and ledger safety with mocked auth only. They do not certify real Supabase configuration or concurrency.
- [ ] Server reservation transaction locks number + wallet, reconciles overdue rows, verifies currency/price/duration, atomically writes rental + debit.
- [ ] Verified payment webhooks only; immutable integer ledger; refunds bounded by original debit; matching currency; provider reconciliation.
- [ ] Do not expose service role credentials. Server endpoint must authorize before every service-role operation (RLS bypasses otherwise).
- [ ] Scheduled retention, encrypted database/backups, recovery exercises, secret rotation and least privilege.
- [ ] Server-authoritative clocks and expiration workers. No browser-local financial balances.

## Operations & legal
- [ ] Operator identity, monitored support/privacy/abuse contacts and qualified review of all legal templates.
- [ ] Jurisdiction, telecom permissions, consumer protection, tax and privacy review (including Kenyan obligations when applicable).
- [ ] Document data locations, subprocessors, retention and subject-access/export/deletion workflow.
- [ ] Monitor quotas, failure alerts, uptime and costs. Verify hosting commercial-use permissions.
- [ ] Real-device and manual keyboard/screen-reader testing. Automated axe scans are not accessibility certification.
- [ ] Review dependency advisories and test backup/recovery and incident response before launch.
