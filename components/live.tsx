"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  LogOut,
  MessagesSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Badge, Empty, Modal, SectionHead, date } from "./ui";
import type {
  Allocation,
  Country,
  IncomingSMS,
  LiveNumber,
  LiveStatus,
  MessagePage,
} from "@/lib/live/types";
export async function liveRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/live/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || `Request failed (HTTP ${response.status})`);
  return data as T;
}
function Problem({ error }: { error: string }) {
  return error ? (
    <div className="demo-notice" role="alert">
      <ShieldCheck size={18} />
      <span>{error}</span>
    </div>
  ) : null;
}
export function LiveWorkspace({ path }: { path: string }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    liveRequest<LiveStatus>("status")
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await liveRequest("session", { password });
      setPassword("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!status)
    return (
      <>
        <SectionHead
          title="Live workspace"
          description="Connecting to the server configuration…"
        />
        <Problem error={error} />
      </>
    );
  if (status.issues.length)
    return (
      <>
        <SectionHead
          title="Live setup required"
          description="Live mode never substitutes demo numbers, messages or credits."
        />
        <Problem error={status.issues.join(". ")} />
        <section className="card settings-form">
          <h2>Configure server authentication first</h2>
          <p>
            Set APP_URL, AUTH_SECRET and OPERATOR_PASSWORD_HASH in Vercel’s
            server environment variables, then redeploy. Provider keys belong on
            the server, never in this form.
          </p>
          <Link className="text-link" href="/docs">
            Open integration setup instructions <ArrowRight size={15} />
          </Link>
        </section>
      </>
    );
  if (!status.authenticated)
    return (
      <>
        <SectionHead
          title="Operator sign-in"
          description="Real SMS and paid number allocation are restricted to the account owner."
        />
        <section className="card settings-card">
          <form className="settings-form" onSubmit={login}>
            <h2>Private live workspace</h2>
            <p className="muted">
              This release supports one trusted operator—not public customer
              accounts or third-party number resale.
            </p>
            <Problem error={error} />
            <label className="field">
              Operator password
              <input
                autoComplete="current-password"
                type="password"
                minLength={16}
                maxLength={256}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Signing in…" : "Sign in securely"}{" "}
              <ShieldCheck size={16} />
            </button>
          </form>
        </section>
      </>
    );
  return (
    <>
      <div className="demo-notice">
        <ShieldCheck size={17} />
        <span>
          <strong>Live · private operator workspace.</strong> No demo data.
          Provider operations may incur real charges.
        </span>
        <button
          className="text-link"
          onClick={async () => {
            try {
              await liveRequest("logout", {});
              setStatus({ ...status, authenticated: false });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
      <Problem error={error} />
      {path === "/dashboard/numbers" ? (
        <LiveCatalog status={status} />
      ) : path === "/dashboard/rentals" ? (
        <LiveRentals status={status} />
      ) : path === "/dashboard/inbox" ? (
        <LiveInbox status={status} />
      ) : path === "/dashboard" ? (
        <LiveOverview status={status} />
      ) : (
        <>
          <SectionHead
            title={
              path.startsWith("/admin")
                ? "Live integration settings"
                : path.endsWith("wallet")
                  ? "Provider billing"
                  : "Account & integrations"
            }
            description="Real account configuration is managed on the server and in your provider console."
          />
          <IntegrationStatus status={status} />
          <section className="card settings-form">
            <h2>No simulated wallet or local admin in live mode</h2>
            <p>
              Twilio bills your provider account directly. This app does not
              accept deposits, charge customers, invent transactions or promise
              cancellation refunds. SMS data is fetched from authenticated
              provider APIs, not local storage.
            </p>
            <Link href="/docs" className="text-link">
              Live setup and limitations <ArrowRight size={15} />
            </Link>
          </section>
        </>
      )}
    </>
  );
}
function IntegrationStatus({ status }: { status: LiveStatus }) {
  return (
    <section className="card settings-card">
      <div className="card-heading">
        <h2>Integration status</h2>
        <Badge>Live mode</Badge>
      </div>
      <div className="health-grid">
        {[
          [
            "Twilio provisioning",
            status.twilio
              ? "Credentials configured; connectivity not yet verified"
              : "Setup required: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET",
          ],
          [
            "TextBee personal SIM",
            status.textbee
              ? "Credentials configured; device/API connectivity not yet verified"
              : "Setup required: TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID",
          ],
          [
            "Paid allocation",
            status.purchaseEnabled
              ? "Enabled — real recurring charges"
              : "Disabled by default",
          ],
          [
            "Webhooks",
            status.webhooks
              ? "Enabled; signatures and durable receipt storage required"
              : "Disabled — authenticated refresh/polling available",
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
function LiveOverview({ status }: { status: LiveStatus }) {
  return (
    <>
      <SectionHead
        title="Your live workspace"
        description="Connect your own SMS resources. Nothing here is generated or simulated."
        action={
          <Link className="btn" href="/dashboard/numbers">
            Browse provider inventory <ArrowRight size={16} />
          </Link>
        }
      />
      <IntegrationStatus status={status} />
      <section className="card settings-form">
        <h2>Start with the resources you control</h2>
        <p>
          TextBee reads incoming SMS from your configured Android device and
          SIM. It cannot rent numbers in other countries. Twilio provides paid
          number allocation where inbound SMS and regulatory requirements permit
          it. Use a dedicated Twilio subaccount for Numora.
        </p>
        <p className="muted">
          No account, SIM, API key, device connectivity or live SMS has been
          verified merely because this page loads. Refresh the inbox to make an
          authenticated provider request.
        </p>
      </section>
    </>
  );
}
function LiveCatalog({ status }: { status: LiveStatus }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [type, setType] = useState<LiveNumber["type"]>("Local");
  const [q, setQ] = useState("");
  const [numbers, setNumbers] = useState<LiveNumber[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<LiveNumber | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!status.twilio) return;
    let active = true;
    liveRequest<{ countries: Country[] }>("countries")
      .then((d) => {
        if (active) setCountries(d.countries);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [status.twilio]);
  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    setNumbers([]);
    setSearched(true);
    try {
      const d = await liveRequest<{ numbers: LiveNumber[] }>(
        "numbers?" + new URLSearchParams({ country, type, search: q }),
      );
      setNumbers(d.numbers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reserve() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const d = await liveRequest<{ rental: Allocation }>("rentals", {
        number: selected.number,
        country: selected.country,
        type: selected.type,
        quotedPrice: selected.monthlyPrice,
        quotedCurrency: selected.currency,
        acceptRecurringCharges: accepted,
      });
      setNumbers((n) => n.filter((x) => x.number !== selected.number));
      setSuccess(
        `Provider allocated ${d.rental.number}. Recurring provider billing continues until release.`,
      );
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHead
        title="Browse numbers"
        description="Authenticated Twilio inventory and current account-specific monthly prices."
      />
      <Problem error={error} />
      {success && (
        <div className="demo-notice" role="status">
          {success}{" "}
          <Link href="/dashboard/rentals" className="text-link">
            My rentals
          </Link>
        </div>
      )}
      {!status.twilio ? (
        <Problem error="Setup required: configure TWILIO_ACCOUNT_SID, TWILIO_API_KEY and TWILIO_API_SECRET in Vercel. No real inventory request can run without a provider account. TextBee does not supply rental numbers." />
      ) : (
        <form className="catalog-toolbar" onSubmit={search}>
          <label className="field">
            Country
            <select
              required
              aria-label="Country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setNumbers([]);
                setSearched(false);
                const kinds = countries.find(
                  (c) => c.code === e.target.value,
                )?.types;
                setType(kinds?.[0] || "Local");
              }}
            >
              <option value="">Choose provider country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Number type
            <select
              aria-label="Number type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as LiveNumber["type"]);
                setNumbers([]);
                setSearched(false);
              }}
            >
              {(
                countries.find((c) => c.code === country)?.types || ["Local"]
              ).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search numbers"
              pattern="[0-9+*]*"
              maxLength={30}
              placeholder="Number digits (optional)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <button className="btn" disabled={!country || busy} type="submit">
            {busy ? "Searching…" : "Search live inventory"}
          </button>
        </form>
      )}
      <div className="number-grid">
        {numbers.map((n) => (
          <article className="card number-card" key={n.number}>
            <div className="number-card-top">
              <Smartphone size={25} />
              <Badge>Provider inventory</Badge>
            </div>
            <h2>
              {countries.find((c) => c.code === n.country)?.name || n.country}
              <span>{n.type}</span>
            </h2>
            <div className="catalog-number">{n.number}</div>
            <div className="capabilities">
              <span>Incoming SMS</span>
              <span>TWILIO</span>
            </div>
            <div className="number-price">
              <div>
                <strong>
                  {n.monthlyPrice} {n.currency}
                </strong>
                <span> / month, plus usage & taxes</span>
              </div>
              <button
                className="btn secondary"
                disabled={busy || !status.purchaseEnabled || n.addressRequired}
                onClick={() => {
                  setAccepted(false);
                  setSelected(n);
                }}
              >
                Rent number
              </button>
            </div>
            {n.addressRequired && (
              <p className="fine-print">
                Regulatory address/bundle setup needed in Twilio Console.
              </p>
            )}
          </article>
        ))}
      </div>
      {searched && !busy && !numbers.length && !error && (
        <Empty title="No SMS-capable inventory returned">
          Availability varies by country, number type and account eligibility.
          No placeholders have been substituted.
        </Empty>
      )}
      <p className="fine-print">
        This is an ongoing provider allocation, not a 1/7/30-day demo rental.
        Country listings do not guarantee SMS inventory. Prices are fetched from
        Twilio; inbound usage, setup fees, taxes and regulatory costs may apply.
        No universal verification-code support is promised.{" "}
        {status.purchaseEnabled
          ? ""
          : "Real purchases remain disabled until LIVE_PURCHASE_ENABLED=true is explicitly set after review."}
      </p>
      {selected && (
        <Modal
          title="Confirm real provider allocation"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="modal-body">
            <h3>{selected.number}</h3>
            <div className="price-summary">
              <span>Recurring provider price</span>
              <strong>
                {selected.monthlyPrice} {selected.currency} / month
              </strong>
            </div>
            <p>
              Twilio will charge your provider account. Usage, taxes and
              country-specific fees may apply. This is not a free trial, a timed
              rental or a simulated debit. Billing continues until the number is
              released. Release is permanent and no refund is promised.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />{" "}
              I control this provider account and accept real recurring charges.
            </label>
            <Problem error={error} />
          </div>
          <div className="modal-footer">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Not now
            </button>
            <button
              className="btn"
              disabled={!accepted || busy}
              onClick={reserve}
            >
              {busy ? "Allocating…" : "Confirm paid allocation"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function LiveRentals({ status }: { status: LiveStatus }) {
  const [rentals, setRentals] = useState<Allocation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Allocation | null>(null);
  const load = useCallback(async () => {
    if (!status.twilio) return;
    setBusy(true);
    setError("");
    try {
      setRentals(
        (await liveRequest<{ rentals: Allocation[] }>("rentals")).rentals,
      );
    } catch (e) {
      setRentals([]);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [status.twilio]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <>
      <SectionHead
        title="My rentals"
        description="Numbers actually allocated in your Twilio account by Numora. Billing continues until release."
        action={
          <button className="btn secondary" disabled={busy} onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />
      <Problem error={error} />
      {!status.twilio ? (
        <Problem error="Twilio is not configured. No live allocations can be loaded." />
      ) : (
        <section className="card">
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Live allocations"
          >
            <table>
              <thead>
                <tr>
                  <th>NUMBER</th>
                  <th>ALLOCATED</th>
                  <th>STATE</th>
                  <th>BILLING</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.number}</strong>
                    </td>
                    <td>{date(new Date(n.started).getTime())}</td>
                    <td>
                      <Badge>{n.status}</Badge>
                    </td>
                    <td>Provider recurring; see Twilio Console</td>
                    <td>
                      <div className="row-buttons">
                        <Link
                          className="btn secondary small-btn"
                          href={`/dashboard/inbox?rental=${n.id}`}
                        >
                          Inbox
                        </Link>
                        <button
                          className="plain-btn danger"
                          onClick={() => setSelected(n)}
                        >
                          Release
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rentals.length && !busy && !error && (
            <Empty title="No Numora-managed allocations">
              Existing unrelated Twilio numbers are not exposed or modified by
              this app.
            </Empty>
          )}
        </section>
      )}
      {selected && (
        <Modal
          title="Permanently release real number?"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="modal-body">
            <p>
              Release {selected.number} back to Twilio inventory? You may lose
              this number permanently. No refund is promised and the current
              billing period may remain payable.
            </p>
            <Problem error={error} />
          </div>
          <div className="modal-footer">
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Keep number
            </button>
            <button
              className="btn danger-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await liveRequest("release", {
                    id: selected.id,
                    confirmPermanentRelease: true,
                  });
                  setSelected(null);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm permanent release
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function LiveInbox({ status }: { status: LiveStatus }) {
  const [source, setSource] = useState<"textbee" | "twilio">(
    status.textbee ? "textbee" : "twilio",
  );
  const [rentals, setRentals] = useState<Allocation[]>([]);
  const [rental, setRental] = useState("");
  const [messages, setMessages] = useState<IncomingSMS[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!status.twilio) return;
    let active = true;
    liveRequest<{ rentals: Allocation[] }>("rentals")
      .then((d) => {
        if (!active) return;
        setRentals(d.rentals);
        const requested = new URLSearchParams(window.location.search).get(
          "rental",
        );
        const id =
          d.rentals.find((n) => n.id === requested)?.id ||
          d.rentals[0]?.id ||
          "";
        setRental(id);
        if (requested) setSource("twilio");
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [status.twilio]);
  async function refresh(more = false) {
    setBusy(true);
    setError("");
    setSelected(null);
    if (!more) {
      setMessages([]);
      setNext(null);
    }
    try {
      const params = new URLSearchParams({ source });
      if (source === "twilio") {
        params.set("rental", rental);
        params.set("page", more && next ? next : "0");
      } else if (more && next) params.set("cursor", next);
      const d = await liveRequest<MessagePage>("messages?" + params);
      setMessages((old) =>
        more
          ? [
              ...new Map(
                [...old, ...d.messages].map((m) => [m.source + ":" + m.id, m]),
              ).values(),
            ]
          : d.messages,
      );
      setNext(d.next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const current = messages.find((m) => m.id === selected);
  const filtered = messages.filter((m) =>
    `${m.sender} ${m.body}`.toLowerCase().includes(q.toLowerCase()),
  );
  const enabled =
    (source === "textbee" && status.textbee) ||
    (source === "twilio" && status.twilio && !!rental);
  return (
    <>
      <SectionHead
        title="SMS inbox"
        description="Authenticated provider history only. Refresh queries the real provider; no samples are generated."
        action={
          <button
            className="btn secondary"
            disabled={busy || !enabled}
            onClick={() => refresh()}
          >
            <RefreshCw size={16} />
            {busy ? "Fetching…" : "Refresh"}
          </button>
        }
      />
      <Problem error={error} />
      {!status.twilio && !status.textbee && (
        <Problem error="No SMS provider is configured. Configure TextBee with your own Android SIM, or a Twilio account with an allocated SMS-capable number. No fake messages are shown." />
      )}
      <div className="catalog-toolbar">
        <label className="field">
          Inbox source
          <select
            aria-label="Inbox source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value as "twilio" | "textbee");
              setMessages([]);
              setNext(null);
              setSelected(null);
              setError("");
            }}
          >
            <option value="textbee">
              TextBee · my Android SIM{" "}
              {status.textbee ? "" : "(not configured)"}
            </option>
            <option value="twilio">
              Twilio · allocated number{" "}
              {status.twilio ? "" : "(not configured)"}
            </option>
          </select>
        </label>
        {source === "twilio" && (
          <label className="field">
            Allocated number
            <select
              aria-label="Allocated number"
              value={rental}
              onChange={(e) => {
                setRental(e.target.value);
                setMessages([]);
                setSelected(null);
                setNext(null);
              }}
            >
              <option value="">Select a Numora-managed number</option>
              {rentals.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.number}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search messages"
            placeholder="Search loaded provider messages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="inbox-layout">
        <section className="card inbox-list">
          <div className="card-heading">
            <h2>
              Provider messages <span className="count">{messages.length}</span>
            </h2>
            <Badge tone="blue">API history</Badge>
          </div>
          {filtered.map((m) => (
            <button
              className={`inbox-item ${selected === m.id ? "selected" : ""}`}
              key={m.source + ":" + m.id}
              onClick={() => setSelected(m.id)}
            >
              <span className="message-avatar">
                <MessagesSquare size={18} />
              </span>
              <div>
                <div className="inbox-item-title">
                  <strong>{m.sender}</strong>
                  <time>{date(new Date(m.received).getTime())}</time>
                </div>
                <p>{m.body}</p>
                <small>
                  {m.number} · {m.source}
                </small>
              </div>
            </button>
          ))}
          {!filtered.length && (
            <Empty
              title={
                busy
                  ? "Fetching provider history…"
                  : "No provider messages loaded"
              }
            >
              Choose a configured source and press Refresh. Empty results are
              never replaced with samples.
            </Empty>
          )}
          {next && (
            <div className="card-heading">
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => refresh(true)}
              >
                Load older messages
              </button>
            </div>
          )}
        </section>
        <section className="card message-detail">
          {current ? (
            <>
              <div className="card-heading">
                <div>
                  <h2>{current.sender}</h2>
                  <p>{date(new Date(current.received).getTime())}</p>
                </div>
                <Badge>Provider API</Badge>
              </div>
              <div className="message-content">
                <p>{current.body}</p>
                <div className="message-meta">
                  Source: {current.source} · {current.number}
                  <br />
                  Message ID: {current.id}
                  <br />
                  Fetched from the authenticated provider API. No message
                  content is persisted in this browser or Numora’s database.
                </div>
              </div>
            </>
          ) : (
            <Empty title="Select a provider message">
              Real SMS requires a provisioned number or your connected phone and
              SIM.
            </Empty>
          )}
        </section>
      </div>
      <p className="fine-print">
        Read selection lasts only in memory. Provider retention/quotas apply.
        TextBee requires receiving enabled on an online Android phone; sender
        and message data belong to the configured operator account. This app is
        not a public multi-user SMS resale service.
      </p>
    </>
  );
}
