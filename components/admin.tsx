"use client";
import { useState } from "react";
import {
  Plus,
  ShieldCheck,
  Pencil,
  Trash2,
  Check,
  Activity,
} from "lucide-react";
import { useStore } from "./store";
import { Badge, DemoNotice, Modal, SectionHead, date } from "./ui";
import { adminGuard, money, removeNumber, saveNumber } from "@/lib/demo";
import { customer, DemoNumber } from "@/lib/types";
export function Admin() {
  const { state, admin, setAdmin, apply } = useStore();
  const [tab, setTab] = useState("Inventory");
  const [edit, setEdit] = useState<Partial<DemoNumber> | null>(null);
  const [pending, setPending] = useState<DemoNumber | null>(null);
  const actor = { ...customer, localAdmin: admin };
  if (!admin)
    return (
      <>
        <SectionHead
          title="Demo administration"
          description="A local sandbox for exploring inventory operations."
        />
        <div className="card admin-gate">
          <ShieldCheck size={44} />
          <h2>Local demo access only</h2>
          <p>
            This is an opt-in preview, not an authentication boundary. Access
            applies only to this browser’s simulated data. Anyone can opt in; no
            production records exist.
          </p>
          <p>
            Live admin operations are disabled on the server. Production
            requires server-verified sessions, role-based authorization and
            audit review.
          </p>
          <button className="btn" onClick={() => setAdmin(true)}>
            Enter local admin demo <ShieldCheck size={17} />
          </button>
        </div>
      </>
    );
  return (
    <>
      <SectionHead
        eyebrow="LOCAL ADMINISTRATION"
        title="Demo control center"
        description="Manage this browser’s simulated inventory and activity."
        action={
          <button className="btn secondary" onClick={() => setAdmin(false)}>
            Exit local admin
          </button>
        }
      />
      <DemoNotice compact />
      <div className="stats-grid">
        {[
          ["Inventory", state.numbers.length],
          [
            "Active rentals",
            state.rentals.filter((r) => r.status === "active").length,
          ],
          ["Sample messages", state.messages.length],
          ["Demo customers", 1],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              {label}
              <Activity size={18} />
            </div>
            <div className="stat-value">{value}</div>
            <small className="muted">Local demo records</small>
          </div>
        ))}
      </div>
      <div className="tabs admin-tabs">
        {[
          "Inventory",
          "Rentals",
          "Messages",
          "Customers",
          "Transactions",
          "System",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Inventory" && (
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Number inventory</h2>
              <p>
                Countries, masked placeholders and illustrative daily prices.
              </p>
            </div>
            <button
              className="btn"
              onClick={() =>
                setEdit({
                  number: "+254 DEMO-103",
                  country: "Kenya",
                  code: "+254",
                  flag: "🇰🇪",
                  price: 180,
                  enabled: true,
                  durations: [1, 7, 30],
                })
              }
            >
              <Plus size={16} /> Add demo number
            </button>
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
                  <th>DEMO NUMBER</th>
                  <th>COUNTRY</th>
                  <th>DAILY CREDITS</th>
                  <th>STATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {state.numbers.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.number}</strong>
                    </td>
                    <td>
                      {n.flag} {n.country}
                    </td>
                    <td>{money(n.price)}</td>
                    <td>
                      <Badge tone={n.enabled ? "green" : "gray"}>
                        {n.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-buttons">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${n.number}`}
                          onClick={() => setEdit(n)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="plain-btn"
                          onClick={() =>
                            apply(
                              (s) =>
                                saveNumber(
                                  s,
                                  actor,
                                  { ...n, enabled: !n.enabled },
                                  n.id,
                                ),
                              "Inventory availability updated",
                            )
                          }
                        >
                          {n.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          className="icon-btn danger"
                          aria-label={`Remove ${n.number}`}
                          onClick={() => setPending(n)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "Rentals" && (
        <section className="card">
          <div className="card-heading">
            <h2>Rental management</h2>
            <p>Demo owner: {customer.id}</p>
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
                  <th>OWNER</th>
                  <th>EXPIRES</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {state.rentals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {state.numbers.find((n) => n.id === r.numberId)?.number}
                    </td>
                    <td>{r.ownerId}</td>
                    <td>{date(r.expires)}</td>
                    <td>
                      <Badge tone={r.status === "active" ? "green" : "gray"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="plain-btn"
                        disabled={r.status !== "active"}
                        onClick={() =>
                          apply((s) => {
                            adminGuard(actor);
                            return {
                              ...s,
                              rentals: s.rentals.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      status: "expired",
                                      expires: Date.now() - 1,
                                    }
                                  : x,
                              ),
                              audit: [
                                {
                                  id: crypto.randomUUID(),
                                  action: "Admin simulated rental expiry",
                                  at: Date.now(),
                                },
                                ...s.audit,
                              ],
                            };
                          }, "Rental expired (no simulated refund)")
                        }
                      >
                        Simulate expiry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "Messages" && (
        <section className="card">
          <div className="card-heading">
            <h2>Demo message management</h2>
            <span className="sample-label">NO TELECOM CONNECTION</span>
          </div>
          {state.messages.map((m) => (
            <div className="admin-message" key={m.id}>
              <div>
                <strong>{m.sender}</strong>
                <p>{m.body}</p>
                <small>{date(m.received)}</small>
              </div>
              <button
                className="icon-btn danger"
                aria-label={`Delete sample from ${m.sender}`}
                onClick={() => {
                  if (confirm("Delete this local sample?"))
                    apply((s) => {
                      adminGuard(actor);
                      return {
                        ...s,
                        messages: s.messages.filter((x) => x.id !== m.id),
                        audit: [
                          {
                            id: crypto.randomUUID(),
                            action: "Admin deleted sample message",
                            at: Date.now(),
                          },
                          ...s.audit,
                        ],
                      };
                    }, "Sample deleted");
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </section>
      )}
      {tab === "Customers" && (
        <section className="card">
          <div className="card-heading">
            <h2>Demo customer records</h2>
            <Badge tone="gray">Not real accounts</Badge>
          </div>
          <div className="settings-form">
            <h3>{state.profile.name}</h3>
            <p>{state.profile.email}</p>
            <code>{customer.id}</code>
            <p className="muted">
              Single local persona. No sign-in, identity verification or
              multi-user security is provided.
            </p>
          </div>
        </section>
      )}
      {tab === "Transactions" && (
        <section className="card">
          <div className="card-heading">
            <h2>Simulated ledger</h2>
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
                  <th>DESCRIPTION</th>
                  <th>IDEMPOTENCY KEY</th>
                  <th>OWNER</th>
                  <th>CREDITS</th>
                </tr>
              </thead>
              <tbody>
                {state.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.description}</td>
                    <td className="mono">{t.key}</td>
                    <td>{t.ownerId}</td>
                    <td>{money(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "System" && (
        <>
          <section className="card">
            <div className="card-heading">
              <h2>System & integration health</h2>
              <Badge>Local demo ready</Badge>
            </div>
            <div className="health-grid">
              {[
                ["SMS provider", "Not configured"],
                ["Real payments", "Disabled"],
                ["Authentication", "Demo persona only"],
                ["Database", "Browser local storage"],
                ["Mode", "Demo — live mode fails closed"],
                ["Message retention", `${state.retentionDays} days`],
              ].map(([a, b]) => (
                <div key={a}>
                  <span>{a}</span>
                  <strong>{b}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="card settings-card">
            <div className="card-heading">
              <h2>Privileged action audit</h2>
            </div>
            <div className="settings-form">
              {state.audit.length ? (
                state.audit.map((a) => (
                  <p key={a.id}>
                    {date(a.at)} — {a.action}
                  </p>
                ))
              ) : (
                <p className="muted">
                  No privileged actions yet. Contents and secrets are never
                  added to audit entries.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Edit demo number" : "Add demo number"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                apply(
                  (s) => saveNumber(s, actor, edit, edit.id),
                  "Demo inventory saved",
                )
              )
                setEdit(null);
            }}
          >
            <div className="modal-body">
              <label className="field">
                Masked number
                <input
                  required
                  pattern="\+\d{1,3} DEMO-\d{3,6}"
                  value={edit.number}
                  onChange={(e) => setEdit({ ...edit, number: e.target.value })}
                />
                <small>Only +[code] DEMO-[digits] is allowed.</small>
              </label>
              <div className="form-grid">
                <label className="field">
                  Country
                  <input
                    required
                    value={edit.country}
                    onChange={(e) =>
                      setEdit({ ...edit, country: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Calling code
                  <input
                    required
                    value={edit.code}
                    onChange={(e) => setEdit({ ...edit, code: e.target.value })}
                  />
                </label>
                <label className="field">
                  Flag emoji
                  <input
                    required
                    value={edit.flag}
                    onChange={(e) => setEdit({ ...edit, flag: e.target.value })}
                  />
                </label>
                <label className="field">
                  Daily price (integer minor units)
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    value={edit.price}
                    onChange={(e) =>
                      setEdit({ ...edit, price: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <p className="muted">
                100 minor units = 1 demo credit. All numbers support sample SMS
                only.
              </p>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={edit.enabled}
                  onChange={(e) =>
                    setEdit({ ...edit, enabled: e.target.checked })
                  }
                />{" "}
                Enabled in catalog
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEdit(null)}
              >
                Close
              </button>
              <button className="btn" type="submit">
                Save demo number <Check size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {pending && (
        <Modal title="Remove demo number?" onClose={() => setPending(null)}>
          <div className="modal-body">
            <p>
              Remove {pending.number} from local inventory? Numbers with rental
              history must be disabled instead.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setPending(null)}>
              Keep number
            </button>
            <button
              className="btn danger-btn"
              onClick={() => {
                if (
                  apply(
                    (s) => removeNumber(s, actor, pending.id),
                    "Demo number removed",
                  )
                )
                  setPending(null);
              }}
            >
              Remove number
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
