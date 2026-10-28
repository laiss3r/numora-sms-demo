"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Search,
  Plus,
  Smartphone,
  MessagesSquare,
  Wallet,
  Globe2,
  Clock,
  Check,
  RefreshCw,
  ShieldCheck,
  MoreHorizontal,
  Sparkles,
  Send,
  Trash2,
} from "lucide-react";
import { useStore } from "./store";
import { Badge, DemoNotice, Empty, Modal, SectionHead, date } from "./ui";
import {
  available,
  balance,
  cancel,
  expire,
  filterNumbers,
  money,
  profileSchema,
  readMessage,
  rent,
  simulate,
} from "@/lib/demo";
import { customer, DemoNumber, Message, Rental } from "@/lib/types";
function NumberText({ n }: { n?: DemoNumber }) {
  return (
    <div className="number-cell">
      <span className="flag">{n?.flag}</span>
      <div>
        <strong>{n?.number || "Archived number"}</strong>
        <small>
          {n?.country} <span>· SMS only · simulated</span>
        </small>
      </div>
    </div>
  );
}
function RentalDialog({
  number,
  onClose,
}: {
  number: DemoNumber;
  onClose: () => void;
}) {
  const { apply } = useStore();
  const [days, setDays] = useState(1);
  return (
    <Modal title="Confirm demo rental" onClose={onClose}>
      <div className="modal-body">
        <NumberText n={number} />
        <label className="field">
          Rental duration
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {number.durations.map((d) => (
              <option key={d} value={d}>
                {d} day{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="price-summary">
          <span>Illustrative cost</span>
          <strong>{money(number.price * days)} demo credits</strong>
        </div>
        <DemoNotice compact />
        <p className="muted">
          No real number is reserved. No payment is taken. Cancelling refunds
          the full simulated cost.
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn secondary" onClick={onClose}>
          Not now
        </button>
        <button
          className="btn"
          onClick={() => {
            if (
              apply(
                (s) => rent(s, customer, number.id, days),
                "Demo rental created. Open My rentals to view your inbox.",
              )
            )
              onClose();
          }}
        >
          Confirm demo rental <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
export function Dashboard() {
  const { state, now } = useStore();
  const [selected, setSelected] = useState<DemoNumber | null>(null);
  const active = state.rentals.filter((r) => r.status === "active");
  const availableCount = state.numbers.filter(
    (n) => n.enabled && available(state, n.id),
  ).length;
  const stats = [
    {
      label: "Active rentals",
      value: active.length,
      icon: Smartphone,
      detail: "Your virtual workspace",
      tone: "green",
    },
    {
      label: "Available numbers",
      value: availableCount,
      icon: Globe2,
      detail: `Across ${new Set(state.numbers.filter((n) => n.enabled).map((n) => n.country)).size} countries`,
      tone: "blue",
    },
    {
      label: "Messages received",
      value: state.messages.length,
      icon: MessagesSquare,
      detail: `${state.messages.filter((m) => !m.read).length} unread messages`,
      tone: "purple",
    },
    {
      label: "Demo balance",
      value: money(balance(state)),
      icon: Wallet,
      detail: "Non-redeemable demo credits",
      tone: "amber",
    },
  ];
  return (
    <>
      <SectionHead
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title={`Welcome back, ${state.profile.name.split(" ")[0]} 👋`}
        description="Here’s what’s happening with your numbers today."
        action={
          <Link className="btn" href="/dashboard/numbers">
            <Plus size={17} /> Rent a number
          </Link>
        }
      />
      <DemoNotice />
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, detail, tone }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <div className="stat-value">
              {value}
              {label === "Demo balance" && <span>credits</span>}
            </div>
            <div className="stat-detail">
              <span className="mini-dot" />
              {detail}
            </div>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="card rental-overview">
          <div className="card-heading">
            <div>
              <h2>
                Active rentals <span className="count">{active.length}</span>
              </h2>
              <p>Your numbers, ready for the next message.</p>
            </div>
            <Link className="text-link" href="/dashboard/rentals">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable data table"
          >
            <table>
              <thead>
                <tr>
                  <th>NUMBER</th>
                  <th>STATUS</th>
                  <th>EXPIRES</th>
                  <th>
                    <span className="sr-only">Inbox</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.slice(0, 4).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <NumberText
                        n={state.numbers.find((n) => n.id === r.numberId)}
                      />
                    </td>
                    <td>
                      <Badge>Active</Badge>
                    </td>
                    <td>
                      <span className="expiry">
                        <Clock size={13} />
                        {Math.max(
                          1,
                          Math.ceil((r.expires - now) / 86400000),
                        )}{" "}
                        days left
                      </span>
                    </td>
                    <td>
                      <Link
                        className="row-action"
                        aria-label={`Open inbox for ${r.id}`}
                        href={`/dashboard/inbox?rental=${r.id}`}
                      >
                        <MessagesSquare size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!active.length && (
              <Empty title="No active rentals">
                Browse the catalog to create your first demo rental.
              </Empty>
            )}
          </div>
          <div className="card-bottom">
            <ShieldCheck size={14} />
            <span>These are masked demo numbers, not active phone lines.</span>
          </div>
        </section>
        <section className="quick-card">
          <div className="quick-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-message">
              <MessagesSquare size={26} />
              <span />
              <span />
            </div>
            <div className="floating-check">
              <Check size={15} />
            </div>
            <span className="art-dot dot-one" />
            <span className="art-dot dot-two" />
          </div>
          <span className="eyebrow">A LITTLE MORE POSSIBLE</span>
          <h2>
            A new number.
            <br />A world of possibilities.
          </h2>
          <p>
            Explore countries and find a demo number that fits your next idea.
          </p>
          <Link className="btn" href="/dashboard/numbers">
            Explore numbers <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="card messages-overview">
          <div className="card-heading">
            <div>
              <h2>Recent messages</h2>
              <p>A little activity from your demo inbox.</p>
            </div>
            <Link className="text-link" href="/dashboard/inbox">
              Open inbox <ArrowUpRight size={15} />
            </Link>
          </div>
          {state.messages.slice(0, 3).map((m) => (
            <Link
              href={`/dashboard/inbox?rental=${m.rentalId}`}
              key={m.id}
              className="recent-message"
            >
              <span className={`message-avatar ${m.kind}`}>
                <MessagesSquare size={18} />
              </span>
              <div>
                <strong>
                  {m.sender}
                  <span className="sample-label">SAMPLE</span>
                </strong>
                <p>{m.body}</p>
                <small>
                  {
                    state.numbers.find(
                      (n) =>
                        n.id ===
                        state.rentals.find((r) => r.id === m.rentalId)
                          ?.numberId,
                    )?.number
                  }
                </small>
              </div>
              <span className="message-time">
                {date(m.received).split(",")[0]}
                {!m.read && <i />}
              </span>
            </Link>
          ))}
          {!state.messages.length && <Empty title="Your inbox is clear" />}
        </section>
        <section className="card activity-card">
          <div className="card-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Your workspace in motion.</p>
            </div>
            <MoreHorizontal size={18} />
          </div>
          <div className="activity-list">
            {state.transactions.slice(0, 4).map((t) => (
              <div className="activity-row" key={t.id}>
                <span
                  className={`activity-dot ${t.type === "rental" ? "green" : "blue"}`}
                >
                  {t.type === "rental" ? (
                    <Smartphone size={15} />
                  ) : (
                    <Wallet size={15} />
                  )}
                </span>
                <div>
                  <strong>{t.description}</strong>
                  <small>{date(t.at)}</small>
                </div>
                <span className={t.amount > 0 ? "positive" : "muted"}>
                  {t.amount > 0 ? "+" : ""}
                  {money(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card country-preview">
        <div className="card-heading">
          <div>
            <h2>Your next number is one click away</h2>
            <p>Global inspiration. Local simulation.</p>
          </div>
          <Link className="text-link" href="/dashboard/numbers">
            Browse all countries <ArrowRight size={16} />
          </Link>
        </div>
        <div className="country-grid">
          {["Kenya", "United States", "United Kingdom", "Canada"].map(
            (country) => {
              const n = state.numbers.find(
                (n) =>
                  n.country === country && n.enabled && available(state, n.id),
              );
              return (
                <button
                  className="country-tile"
                  key={country}
                  disabled={!n}
                  onClick={() => n && setSelected(n)}
                >
                  <span className="flag">
                    {state.numbers.find((n) => n.country === country)?.flag}
                  </span>
                  <div>
                    <strong>{country}</strong>
                    <small>
                      {n
                        ? `From ${money(n.price)} credits / day`
                        : "No available demo numbers"}
                    </small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              );
            },
          )}
        </div>
      </section>
      {selected && (
        <RentalDialog number={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
export function Browse() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [days, setDays] = useState(1);
  const [max, setMax] = useState(100000);
  const [only, setOnly] = useState(false);
  const [selected, setSelected] = useState<DemoNumber | null>(null);
  const numbers = filterNumbers(state, q, country, max, days, only);
  return (
    <>
      <SectionHead
        eyebrow="FIND YOUR NEXT CONNECTION"
        title="Browse numbers"
        description="A world of demo numbers. Choose a country and make it yours."
      />
      <DemoNotice />
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search numbers"
            placeholder="Search country or demo number…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          aria-label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">All countries</option>
          {[...new Set(state.numbers.map((n) => n.country))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Rental duration"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>1 day rental</option>
          <option value={7}>7 day rental</option>
          <option value={30}>30 day rental</option>
        </select>
        <select
          aria-label="Maximum price"
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        >
          <option value={100000}>Any demo price</option>
          <option value={200}>Up to 2 credits</option>
          <option value={500}>Up to 5 credits</option>
          <option value={2000}>Up to 20 credits</option>
        </select>
      </div>
      <div className="results-heading">
        <span>
          <strong>{numbers.length}</strong> demo numbers{" "}
          <span className="muted">
            · Prices for {days} day{days > 1 ? "s" : ""}
          </span>
        </span>
        <label className="check-label">
          <input
            type="checkbox"
            checked={only}
            onChange={(e) => setOnly(e.target.checked)}
          />{" "}
          Available only
        </label>
      </div>
      <div className="number-grid">
        {numbers.map((n) => (
          <article className="card number-card" key={n.id}>
            <div className="number-card-top">
              <span className="flag large">{n.flag}</span>
              <Badge tone={available(state, n.id) ? "green" : "gray"}>
                {available(state, n.id) ? "Available" : "Rented"}
              </Badge>
            </div>
            <h2>
              {n.country}
              <span>{n.code}</span>
            </h2>
            <div className="catalog-number">{n.number}</div>
            <div className="capabilities">
              <span>
                <MessagesSquare size={12} />
                SMS inbox
              </span>
              <span>DEMO ONLY</span>
            </div>
            <div className="number-price">
              <div>
                <strong>{money(n.price * days)}</strong>
                <span>
                  {" "}
                  credits / {days} day{days > 1 ? "s" : ""}
                </span>
              </div>
              <button
                className="btn secondary"
                disabled={!available(state, n.id)}
                onClick={() => setSelected(n)}
              >
                Rent number <Plus size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!numbers.length && <Empty title="No matching demo numbers" />}
      <p className="fine-print">
        Masked placeholders are not dialable. Prices are illustrative credits,
        not actual wholesale costs. No verification-code compatibility is
        promised.
      </p>
      {selected && (
        <RentalDialog number={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
export function Rentals() {
  const { state, apply } = useStore();
  const [status, setStatus] = useState("all");
  const [pending, setPending] = useState<Rental | null>(null);
  const rows = state.rentals.filter(
    (r) =>
      r.ownerId === customer.id && (status === "all" || status === r.status),
  );
  return (
    <>
      <SectionHead
        title="My rentals"
        description="Every demo number, from first message to last day."
        action={
          <Link className="btn" href="/dashboard/numbers">
            <Plus size={17} /> Rent a number
          </Link>
        }
      />
      <DemoNotice compact />
      <div className="tabs">
        {["all", "active", "expired", "cancelled"].map((x) => (
          <button
            className={status === x ? "active" : ""}
            onClick={() => setStatus(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <section className="card">
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Scrollable data table"
        >
          <table>
            <thead>
              <tr>
                <th>NUMBER</th>
                <th>STARTED / EXPIRES</th>
                <th>STATUS</th>
                <th>COST</th>
                <th>MESSAGES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <NumberText
                      n={state.numbers.find((n) => n.id === r.numberId)}
                    />
                  </td>
                  <td>
                    <div>{date(r.start)}</div>
                    <small className="muted">{date(r.expires)}</small>
                  </td>
                  <td>
                    <Badge tone={r.status === "active" ? "green" : "gray"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td>
                    {money(r.cost)} <small>credits</small>
                  </td>
                  <td>
                    {state.messages.filter((m) => m.rentalId === r.id).length}
                  </td>
                  <td>
                    <div className="row-buttons">
                      <Link
                        className="btn secondary small-btn"
                        href={`/dashboard/inbox?rental=${r.id}`}
                      >
                        Inbox
                      </Link>
                      {r.status === "active" && (
                        <>
                          <button
                            className="plain-btn danger"
                            onClick={() => setPending(r)}
                          >
                            Cancel
                          </button>
                          <button
                            className="plain-btn"
                            onClick={() =>
                              apply(
                                (s) => expire(s, customer, r.id),
                                "Rental marked expired; no refund on expiration.",
                              )
                            }
                          >
                            Simulate expiry
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="No rentals here yet" />}
      </section>
      <p className="fine-print">
        Expiry is derived from stored timestamps on load, focus, actions and
        periodic refresh, not just a countdown. Your device clock and editable
        browser data are not production authority.
      </p>
      {pending && (
        <Modal
          title="Cancel this demo rental?"
          onClose={() => setPending(null)}
        >
          <div className="modal-body">
            <p>
              This will release the masked number and refund{" "}
              {money(pending.cost)} non-redeemable demo credits. Existing sample
              messages remain until deleted or retention expires.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setPending(null)}>
              Keep rental
            </button>
            <button
              className="btn danger-btn"
              onClick={() => {
                if (
                  apply(
                    (s) => cancel(s, customer, pending.id),
                    "Rental cancelled. Demo credits refunded.",
                  )
                )
                  setPending(null);
              }}
            >
              Cancel rental
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Inbox() {
  const { state, apply } = useStore();
  const params = useSearchParams();
  const [filter, setFilter] = useState(params.get("rental") || "");
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sim, setSim] = useState(false);
  const [kind, setKind] = useState<Message["kind"]>("text");
  const [target, setTarget] = useState("");
  const active = state.rentals.filter(
    (r) => r.status === "active" && r.ownerId === customer.id,
  );
  const messages = state.messages.filter(
    (m) =>
      m.ownerId === customer.id &&
      (!filter || m.rentalId === filter) &&
      (!unread || !m.read) &&
      `${m.sender} ${m.body}`.toLowerCase().includes(q.toLowerCase()),
  );
  const current = state.messages.find((m) => m.id === selected);
  return (
    <>
      <SectionHead
        title="SMS inbox"
        description="Your messages, all in one calm place. Every message here is a sample."
        action={
          <>
            <button
              className="btn secondary"
              onClick={() =>
                apply(
                  (s) => ({ ...s }),
                  "Local inbox refreshed. No network SMS queried.",
                )
              }
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              className="btn"
              disabled={!active.length}
              onClick={() => {
                setTarget(
                  active.find((r) => r.id === filter)?.id ||
                    active[0]?.id ||
                    "",
                );
                setSim(true);
              }}
            >
              <Sparkles size={16} /> Generate sample
            </button>
          </>
        }
      />
      <DemoNotice compact />
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search messages"
            placeholder="Search messages or senders…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          value={filter}
          aria-label="Filter by rental"
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All rentals</option>
          {state.rentals.map((r) => (
            <option key={r.id} value={r.id}>
              {state.numbers.find((n) => n.id === r.numberId)?.number} (
              {r.status})
            </option>
          ))}
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => setUnread(e.target.checked)}
          />{" "}
          Unread only
        </label>
      </div>
      <div className="inbox-layout">
        <section className="card inbox-list">
          <div className="card-heading">
            <h2>
              Messages <span className="count">{messages.length}</span>
            </h2>
            <span className="sample-label">SIMULATED</span>
          </div>
          {messages.map((m) => (
            <button
              className={`inbox-item ${m.read ? "" : "unread"} ${selected === m.id ? "selected" : ""}`}
              key={m.id}
              onClick={() => {
                setSelected(m.id);
                apply(
                  (s) => readMessage(s, customer, m.id),
                  "Sample message opened",
                );
              }}
            >
              <span className="message-avatar">
                <MessagesSquare size={18} />
              </span>
              <div>
                <div className="inbox-item-title">
                  <strong>{m.sender}</strong>
                  <time>{date(m.received)}</time>
                </div>
                <p>{m.body}</p>
                <small>
                  {
                    state.numbers.find(
                      (n) =>
                        n.id ===
                        state.rentals.find((r) => r.id === m.rentalId)
                          ?.numberId,
                    )?.number
                  }
                </small>
              </div>
              {!m.read && <i className="unread-dot" />}
            </button>
          ))}
          {!messages.length && (
            <Empty title="No messages to show">
              Rent a demo number, then generate a sample message.
            </Empty>
          )}
        </section>
        <section className="card message-detail">
          {current ? (
            <>
              <div className="card-heading">
                <div>
                  <h2>{current.sender}</h2>
                  <p>{date(current.received)}</p>
                </div>
                <Badge tone="purple">Sample</Badge>
              </div>
              <div className="message-content">
                <span className="eyebrow">SIMULATED INCOMING SMS</span>
                <p>{current.body}</p>
                <div className="message-meta">
                  Rental:{" "}
                  {
                    state.numbers.find(
                      (n) =>
                        n.id ===
                        state.rentals.find((r) => r.id === current.rentalId)
                          ?.numberId,
                    )?.number
                  }
                  <br />
                  This message was created locally, not received over a telecom
                  network.
                </div>
                <button
                  className="btn secondary"
                  onClick={() => {
                    apply(
                      (s) => ({
                        ...s,
                        messages: s.messages.filter(
                          (m) =>
                            m.id !== current.id || m.ownerId !== customer.id,
                        ),
                      }),
                      "Sample message deleted",
                    );
                    setSelected(null);
                  }}
                >
                  <Trash2 size={15} /> Delete sample
                </button>
              </div>
            </>
          ) : (
            <Empty title="A space for your messages">
              Select a message to read the full sample.
            </Empty>
          )}
        </section>
      </div>
      {sim && (
        <Modal title="Generate a sample message" onClose={() => setSim(false)}>
          <div className="modal-body">
            <label className="field">
              Active demo rental
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {active.map((r) => (
                  <option key={r.id} value={r.id}>
                    {state.numbers.find((n) => n.id === r.numberId)?.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Message type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Message["kind"])}
              >
                <option value="text">Ordinary sample text</option>
                <option value="delivery">
                  Fictional delivery notification
                </option>
                <option value="code">Fictional test code</option>
              </select>
            </label>
            <p className="muted">
              Generated in this browser only. No SMS is sent or received. Test
              codes do not work on external platforms.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setSim(false)}>
              Close
            </button>
            <button
              className="btn"
              onClick={() => {
                if (
                  apply(
                    (s) => simulate(s, customer, target, kind),
                    "Sample message added to your inbox.",
                  )
                ) {
                  setFilter(target);
                  setUnread(false);
                  setSim(false);
                }
              }}
            >
              <Send size={16} /> Generate sample message
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function WalletPage() {
  const { state } = useStore();
  return (
    <>
      <SectionHead
        title="Your demo wallet"
        description="A simple ledger for exploring rentals. Never real money."
      />
      <DemoNotice compact />
      <div className="wallet-hero">
        <div>
          <span className="eyebrow">AVAILABLE DEMO CREDITS</span>
          <h2>
            {money(balance(state))}
            <span> credits</span>
          </h2>
          <p>Non-redeemable. No deposits, checkout or withdrawals.</p>
        </div>
        <Wallet size={64} />
      </div>
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>Transaction history</h2>
            <p>
              All amounts are simulated credits, calculated from this ledger.
            </p>
          </div>
          <Badge tone="amber">DEMO CREDITS</Badge>
        </div>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Scrollable data table"
        >
          <table>
            <thead>
              <tr>
                <th>TRANSACTION</th>
                <th>DATE</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {state.transactions
                .filter((t) => t.ownerId === customer.id)
                .map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="transaction-desc">
                        {t.amount > 0 ? (
                          <ArrowDownLeft size={19} />
                        ) : (
                          <ArrowUpRight size={19} />
                        )}
                        <strong>{t.description}</strong>
                      </div>
                    </td>
                    <td>{date(t.at)}</td>
                    <td className="capitalize">{t.type}</td>
                    <td className={t.amount > 0 ? "positive" : ""}>
                      {t.amount > 0 ? "+" : ""}
                      {money(t.amount)}
                    </td>
                    <td>
                      <Badge tone="gray">Simulated</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
type Profile = z.infer<typeof profileSchema>;
export function SettingsPage() {
  const { state, apply, reset } = useStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: state.profile,
  });
  return (
    <>
      <SectionHead
        title="Account settings"
        description="Make this demo workspace feel like your own."
      />
      <DemoNotice compact />
      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <h2>Demo profile</h2>
            <p>
              No authentication provider is connected. This is not a real
              account.
            </p>
          </div>
        </div>
        <form
          className="settings-form"
          onSubmit={handleSubmit((p) =>
            apply((s) => ({ ...s, profile: p }), "Demo preferences saved"),
          )}
        >
          <label className="field">
            Display name
            <input {...register("name")} />
            {errors.name && (
              <small className="danger">{errors.name.message}</small>
            )}
          </label>
          <label className="field">
            Email placeholder
            <input {...register("email")} type="email" />
            {errors.email && (
              <small className="danger">{errors.email.message}</small>
            )}
            <small>No verification or email will be sent.</small>
          </label>
          <label className="check-label">
            <input {...register("dark")} type="checkbox" /> Dark appearance
          </label>
          <label className="check-label">
            <input {...register("notifications")} type="checkbox" /> Show in-app
            demo notifications preference (no email or push)
          </label>
          <button className="btn" type="submit">
            Save preferences <Check size={16} />
          </button>
        </form>
      </section>
      <section className="card settings-card">
        <div className="card-heading">
          <div>
            <h2>Local data & retention</h2>
            <p>
              Browser data is editable and unencrypted. Do not enter sensitive
              information.
            </p>
          </div>
        </div>
        <div className="settings-form">
          <label className="field">
            Sample message retention
            <select
              value={state.retentionDays}
              onChange={(e) =>
                apply(
                  (s) => ({ ...s, retentionDays: Number(e.target.value) }),
                  "Retention updated; old samples will be removed on reconciliation.",
                )
              }
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <div className="row-buttons">
            <button
              className="btn secondary"
              onClick={() => {
                if (confirm("Delete all local sample messages?"))
                  apply(
                    (s) => ({ ...s, messages: [] }),
                    "All sample messages deleted",
                  );
              }}
            >
              Delete all messages
            </button>
            <button className="btn danger-btn" onClick={reset}>
              Reset entire demo
            </button>
          </div>
          <div className="row-buttons">
            <Link className="text-link" href="/admin">
              Open local admin demo <ArrowUpRight size={14} />
            </Link>
            <Link className="text-link" href="/docs">
              Documentation <ArrowUpRight size={14} />
            </Link>
          </div>
          <p className="muted">
            Reset removes local demo history and seeds a new workspace. Data is
            not synchronized across devices. Retention runs while the app is
            open or on next visit.
          </p>
        </div>
      </section>
    </>
  );
}
