"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe2,
  MessagesSquare,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { brand } from "@/lib/config";
import { useStore } from "./store";
import { money } from "@/lib/demo";
import { Logo } from "./app";
import { Badge, DemoNotice } from "./ui";
export function PublicPage({ path }: { path: string }) {
  const { state } = useStore();
  const isHome = path === "/";
  return (
    <div className="public-shell">
      <header className="public-nav">
        <Logo />
        <nav>
          <Link href="/pricing" className={path === "/pricing" ? "active" : ""}>
            Pricing
          </Link>
          <Link href="/docs" className={path === "/docs" ? "active" : ""}>
            Documentation
          </Link>
          <Link href="/dashboard" className="btn secondary">
            Open demo <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        {isHome ? (
          <>
            <section className="hero">
              <Badge>THE VIRTUAL NUMBER SANDBOX</Badge>
              <h1>
                One workspace.
                <br />
                <span>More possibilities.</span>
              </h1>
              <p>
                Explore virtual numbers. Try a rental. See your inbox come to
                life.
                <br />A thoughtful SMS experience, without the real-world costs.
              </p>
              <div className="hero-actions">
                <Link href="/dashboard" className="btn large-btn">
                  Explore the demo <ArrowRight size={18} />
                </Link>
                <Link href="/docs" className="btn secondary large-btn">
                  See how it works
                </Link>
              </div>
              <div className="hero-trust">
                <span>
                  <Check size={14} /> No credit card
                </span>
                <span>
                  <Check size={14} /> No provider keys
                </span>
                <span>
                  <Check size={14} /> 100% simulated
                </span>
              </div>
              <div className="hero-product">
                <div className="preview-top">
                  <span className="window-dots">● ● ●</span>
                  <span>NUMORA WORKSPACE</span>
                  <Badge>Demo mode</Badge>
                </div>
                <div className="preview-content">
                  <div className="preview-intro">
                    <div className="eyebrow">YOUR NEXT CONNECTION</div>
                    <h2>
                      Global numbers.
                      <br />A simpler experience.
                    </h2>
                    <p>
                      A single home for your demo rentals,
                      <br />
                      sample messages and credit history.
                    </p>
                    <Link href="/dashboard/numbers" className="text-link">
                      Find a demo number <ArrowUpRight size={17} />
                    </Link>
                  </div>
                  <div className="preview-numbers">
                    {state.numbers.slice(0, 3).map((n) => (
                      <div className="preview-number" key={n.id}>
                        <span className="flag">{n.flag}</span>
                        <div>
                          <strong>{n.number}</strong>
                          <small>{n.country} · Demo number</small>
                        </div>
                        <Badge>SMS</Badge>
                      </div>
                    ))}
                    <div className="preview-sms">
                      <span>
                        <MessagesSquare size={18} /> NUMORA SAMPLE
                      </span>
                      <p>Hello from your new demo inbox. 👋</p>
                      <small>Simulated message · just now</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <div className="public-container">
              <DemoNotice />
              <section className="public-section">
                <div className="center-heading">
                  <span className="eyebrow">SIMPLE BY DESIGN</span>
                  <h2>From discovery to your first sample SMS.</h2>
                  <p>No setup detours. Just a little room to explore.</p>
                </div>
                <div className="feature-grid">
                  {[
                    [
                      Globe2,
                      "01",
                      "Find your number",
                      "Browse masked demo numbers across countries. Filter by price, availability and duration.",
                    ],
                    [
                      Smartphone,
                      "02",
                      "Make it yours",
                      "Simulate a rental using non-redeemable credits. Cancel or expire it whenever you like.",
                    ],
                    [
                      MessagesSquare,
                      "03",
                      "Meet your inbox",
                      "Generate sample texts, fictional delivery notices and test codes. No telecom network involved.",
                    ],
                  ].map(([Icon, no, title, desc]) => {
                    const I = Icon as typeof Globe2;
                    return (
                      <article className="card feature-card" key={String(no)}>
                        <div>
                          <I size={23} />
                          <span>{String(no)}</span>
                        </div>
                        <h3>{String(title)}</h3>
                        <p>{String(desc)}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section className="public-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">EXPLORE THE CATALOG</span>
                    <h2>Different countries. One calm workspace.</h2>
                  </div>
                  <Link className="text-link" href="/dashboard/numbers">
                    View availability <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="country-grid public-countries">
                  {state.numbers.slice(0, 6).map((n) => (
                    <Link
                      href="/dashboard/numbers"
                      className="country-tile"
                      key={n.id}
                    >
                      <span className="flag">{n.flag}</span>
                      <div>
                        <strong>{n.country}</strong>
                        <small>{n.number}</small>
                        <small>From {money(n.price)} demo credits / day</small>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="faq-section">
                <div>
                  <span className="eyebrow">A LITTLE CLARITY</span>
                  <h2>
                    Good questions.
                    <br />
                    Honest answers.
                  </h2>
                  <p>
                    Built to demonstrate a product,
                    <br />
                    not pretend to be a telecom provider.
                  </p>
                </div>
                <div>
                  {[
                    [
                      "What is a virtual SMS number?",
                      "A real virtual number is a provider-managed telephone number that can receive SMS digitally. This app uses visibly masked placeholders to demonstrate that workflow only.",
                    ],
                    [
                      "Can I receive real SMS or verification codes?",
                      "No. Every number and message in this demo is simulated. Test codes do not work on external platforms. Future live service must respect provider terms and third-party anti-abuse rules.",
                    ],
                    [
                      "Are the prices real?",
                      "No. Prices are illustrative, configurable demo credits. Credits have no monetary value and cannot be purchased, withdrawn or redeemed.",
                    ],
                    [
                      "Where is my data stored?",
                      "In your browser’s local storage. It is not encrypted, securely authenticated, shared across devices or suitable for production finances. Reset it in Settings.",
                    ],
                    [
                      "Do I need to sign in?",
                      "No. Open the demo with a local sample persona. There is no real authentication until a reviewed backend is configured.",
                    ],
                  ].map(([q, a]) => (
                    <details key={q}>
                      <summary>{q}</summary>
                      <p>{a}</p>
                    </details>
                  ))}
                </div>
              </section>
              <section className="public-cta">
                <Sparkles size={26} />
                <h2>A little curiosity goes a long way.</h2>
                <p>Your demo workspace is ready. No commitments required.</p>
                <Link href="/dashboard" className="btn">
                  Step inside <ArrowRight size={17} />
                </Link>
              </section>
            </div>
          </>
        ) : path === "/pricing" ? (
          <div className="public-container public-document">
            <Badge tone="amber">ILLUSTRATIVE PRICING</Badge>
            <h1>
              Simple credits.
              <br />
              Zero real charges.
            </h1>
            <p className="lead">
              Explore flexible demo rentals. No deposits, payments or
              subscription.
            </p>
            <DemoNotice />
            <div className="pricing-grid">
              {[1, 7, 30].map((days) => (
                <section className="card pricing-card" key={days}>
                  <span className="eyebrow">
                    {days === 1
                      ? "QUICK EXPLORATION"
                      : days === 7
                        ? "ROOM TO EXPLORE"
                        : "A LONGER LOOK"}
                  </span>
                  <h2>{days}-day demo rental</h2>
                  <div className="pricing-value">
                    {money(
                      Math.min(...state.numbers.map((n) => n.price)) * days,
                    )}
                    <span> credits from</span>
                  </div>
                  <p>
                    Per masked demo number for {days} day{days > 1 ? "s" : ""}.
                  </p>
                  <ul>
                    <li>
                      <Check size={16} /> Sample SMS inbox
                    </li>
                    <li>
                      <Check size={16} /> Full simulated cancellation refund
                    </li>
                    <li>
                      <Check size={16} /> No real SMS or payments
                    </li>
                  </ul>
                  <Link href="/dashboard/numbers" className="btn secondary">
                    Browse numbers <ArrowRight size={16} />
                  </Link>
                </section>
              ))}
            </div>
            <p className="fine-print">
              Example prices are calculated from configurable inventory daily
              prices × duration. They do not represent wholesale telecom costs.
              Live pricing requires verified inventory, provider permissions,
              tax and legal review.
            </p>
          </div>
        ) : (
          <Document path={path} />
        )}
      </main>
      <footer className="public-footer">
        <div>
          <Logo />
          <p>
            A simpler space to explore virtual SMS.
            <br />
            Demonstration only. Not a telecom service.
          </p>
        </div>
        <div>
          <strong>PRODUCT</strong>
          <Link href="/dashboard">Demo dashboard</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Documentation</Link>
        </div>
        <div>
          <strong>TRUST & CLARITY</strong>
          <Link href="/terms">Terms template</Link>
          <Link href="/privacy">Privacy template</Link>
          <Link href="/acceptable-use">Acceptable use</Link>
        </div>
        <div className="footer-note">
          © 2026 {brand}
          <br />
          <span>Made for exploration, not evasion.</span>
        </div>
      </footer>
    </div>
  );
}
function Document({ path }: { path: string }) {
  const docs = path === "/docs";
  const title = docs
    ? "A clear view of the demo."
    : path === "/terms"
      ? "Terms of service template"
      : path === "/privacy"
        ? "Privacy policy template"
        : path === "/acceptable-use"
          ? "Acceptable-use policy template"
          : "Page not found";
  return (
    <article className="public-container public-document prose">
      <Badge tone={docs ? "green" : "amber"}>
        {docs ? "DOCUMENTATION" : "REQUIRES LEGAL REVIEW"}
      </Badge>
      <h1>{title}</h1>
      {docs ? (
        <>
          <p className="lead">
            Everything you need to know before you explore—or build on—Numora
            SMS.
          </p>
          <DemoNotice />
          <h2>Demo versus live operation</h2>
          <p>
            The demo runs locally with no credentials, database or provider
            account. Your browser holds a single sample persona, masked number
            inventory, rentals, messages and an integer-credit ledger. This is
            not authentication. Local admin is an explicitly opt-in interface,
            not a security boundary.
          </p>
          <h2>Rental lifecycle</h2>
          <p>
            Available numbers can become active rentals for 1, 7 or 30 days. An
            active rental blocks duplicate reservations in this browser. Stored
            expiration timestamps are reconciled on page load, focus, actions
            and periodic refresh. Cancelling produces one full simulated refund;
            expiry does not refund credits. Cancelled and expired rentals retain
            historical sample messages until deletion or retention.
          </p>
          <h2>Messages & retention</h2>
          <p>
            Only active rentals can generate samples. Read states, search and
            per-rental filtering work locally. The sample limit is five messages
            per rental per minute. Settings allow retention from 1 to 90 days,
            deletion and full reset. Retention is applied on next app
            activity—not as a background server job.
          </p>
          <h2>Provider integration contract</h2>
          <p>
            The source defines NumberProvider, MessagingProvider,
            PaymentProvider and AuthenticationAdapter interfaces. Demo adapters
            do not contact telecom networks. Webhook validation rejects every
            request. Live API POST routes fail closed with 503; they never
            fabricate successful payments or messages.
          </p>
          <h2>Before connecting a real provider</h2>
          <ul>
            <li>
              Verify official API documentation and rental/resale permissions.
            </li>
            <li>
              Verify inbound SMS capabilities, supported countries and sender
              types, inventory and prices.
            </li>
            <li>
              Implement and test the provider’s exact signature verification
              scheme, replay protection, event idempotency and distributed rate
              limits.
            </li>
            <li>
              Require server-verified authentication, ownership checks and roles
              for every protected operation.
            </li>
            <li>
              Review retention, privacy, country regulations and platform
              restrictions. Never promise universal verification-code delivery.
            </li>
          </ul>
          <h2>Configuration</h2>
          <pre>
            APP_MODE=demo{`\n`}NEXT_PUBLIC_BRAND_NAME=Numora SMS{`\n`}
            SMS_PROVIDER={cmdGap()}
            {`\n`}SMS_API_KEY={cmdGap()}
            {`\n`}SMS_API_SECRET={cmdGap()}
            {`\n`}SMS_WEBHOOK_SECRET={cmdGap()}
          </pre>
          <p>
            Provider variables are server-side placeholders only. Never prefix
            secrets with NEXT_PUBLIC. APP_MODE values other than demo
            deliberately fail validation, even if credentials exist. Supabase is
            optional future infrastructure, not a requirement for this demo.
          </p>
          <h2>Run locally & deploy</h2>
          <pre>
            npm ci{`\n`}npm run dev{`\n\n`}npm run lint{`\n`}npm run typecheck
            {`\n`}npm test{`\n`}npm run build
          </pre>
          <p>
            See README.md for Playwright installation, Vercel import steps,
            free-tier caveats and the production-readiness checklist. No site is
            live merely because the source is deployment-ready.
          </p>
        </>
      ) : (
        <>
          <p className="lead">
            Draft template · Updated 28 October 2026 · Not legal advice.
          </p>
          <div className="demo-notice">
            Requires qualified legal review and an identified operator before
            any commercial launch.
          </div>
          {path === "/privacy" ? (
            <>
              <h2>Data in this demonstration</h2>
              <p>
                Demo profile preferences, rentals, sample message contents and
                simulated transactions are stored in your browser. There is no
                application database, real sign-in, SMS provider or payment
                processor. Do not enter sensitive or third-party personal
                information.
              </p>
              <h2>Hosting & third parties</h2>
              <p>
                If hosted, the hosting provider may process request metadata
                such as IP addresses and operational logs under its own policy.
                The demo does not include advertising or analytics SDKs.
                Identify the actual operator, hosting region, lawful bases,
                subprocessors and privacy contact before launch.
              </p>
              <h2>Retention & deletion</h2>
              <p>
                Sample message retention defaults to 30 days and can be set to
                1, 7, 30 or 90 days. Cleanup happens on app use. Delete
                individual samples in the inbox or reset all local records in
                Settings. Other local records persist until reset or browser
                storage is cleared. Hosting log retention is controlled
                separately by the host.
              </p>
              <h2>Rights & security</h2>
              <p>
                Browser storage is unencrypted and editable. It is not secure
                multi-user storage. Production must implement verified access,
                data export/deletion, lawful retention and applicable rights
                under relevant privacy law, including Kenya’s Data Protection
                Act where applicable.
              </p>
            </>
          ) : path === "/acceptable-use" ? (
            <>
              <h2>Authorized exploration only</h2>
              <p>
                Use this simulator for lawful product evaluation and testing
                with fictional content.
              </p>
              <h2>Prohibited activity</h2>
              <ul>
                <li>
                  Intercepting messages or accessing numbers, rentals or
                  accounts without authorization.
                </li>
                <li>
                  Fraud, impersonation, harassment, spam or unlawful
                  surveillance.
                </li>
                <li>
                  Evading third-party anti-abuse controls or platform
                  verification restrictions.
                </li>
                <li>
                  Uploading real credentials, sensitive messages or other
                  people’s personal information.
                </li>
              </ul>
              <h2>Future live use</h2>
              <p>
                A real service must verify provider terms and resale
                permissions, respect country-specific obligations and support a
                documented abuse-reporting process. Add an operator identity and
                monitored contact before commercial launch.
              </p>
            </>
          ) : (
            <>
              <h2>Nature of the service</h2>
              <p>
                Numora SMS is a demonstration, not a telecommunications or
                financial service. Numbers are visibly masked, messages are
                generated locally and credits are fictional and non-redeemable.
              </p>
              <h2>No purchases or guarantees</h2>
              <p>
                No real number is rented, no money is charged and no real SMS is
                delivered. Illustrative prices do not guarantee future pricing
                or availability. Universal verification-code compatibility is
                neither offered nor implied.
              </p>
              <h2>Data & availability</h2>
              <p>
                Local records can be changed, cleared or lost. There is no
                service-level agreement or production security claim. Do not
                rely on the demo for operational communications or financial
                records.
              </p>
              <h2>Commercial launch review</h2>
              <p>
                Before launch, identify the operator and governing law, support
                and abuse contacts, consumer rights, lawful liability
                limitations, refund terms, dispute procedures and applicable
                regulatory requirements. This template is incomplete without
                that review.
              </p>
            </>
          )}
          <h2>Questions or requests</h2>
          <p>
            No production support or privacy contact is configured. The operator
            must supply valid contact details before handling real customer
            data.
          </p>
        </>
      )}
    </article>
  );
}
function cmdGap() {
  return "";
}
