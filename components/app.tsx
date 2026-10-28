"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Smartphone,
  MessagesSquare,
  Wallet,
  Settings,
  ShieldCheck,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  ChevronsUpDown,
  Bell,
  X,
  PanelLeftClose,
  Radio,
  ExternalLink,
} from "lucide-react";
import { brand } from "@/lib/config";
import { useStore } from "./store";
import {
  Dashboard,
  Browse,
  Rentals,
  Inbox,
  WalletPage,
  SettingsPage,
} from "./customer";
import { PublicPage } from "./public";
import { Admin } from "./admin";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/dashboard/numbers", "Browse numbers", Search],
  ["/dashboard/rentals", "My rentals", Smartphone],
  ["/dashboard/inbox", "SMS inbox", MessagesSquare],
  ["/dashboard/wallet", "Wallet", Wallet],
] as const;
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span className="logo-icon">
        <MessagesSquare size={23} />
      </span>
      <span>
        {brand.split(" ")[0]}
        <small>SMS</small>
      </span>
    </Link>
  );
}
export function App() {
  const path = usePathname();
  const s = useStore();
  const [collapsed, setCollapsed] = useState(false);
  if (!path.startsWith("/dashboard") && !path.startsWith("/admin"))
    return <PublicPage path={path} />;
  const title = path.startsWith("/admin")
    ? "Administration"
    : links.find((l) => l[0] === path)?.[1] || "Settings";
  const unread = s.state.messages.filter((m) => !m.read).length;
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="side-logo">
          <Logo />
          <button
            className="icon-btn collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">N</span>
          <div>
            <strong>Personal workspace</strong>
            <small>Demo account</small>
          </div>
          <ChevronsUpDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Workspace navigation">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={path === href ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {href.endsWith("inbox") && unread > 0 && <b>{unread}</b>}
              {path === href && (
                <ChevronRight className="nav-chevron" size={16} />
              )}
            </Link>
          ))}
        </nav>
        <div className="nav-label lower-label">MANAGE</div>
        <nav className="main-nav" aria-label="Management navigation">
          <Link
            href="/dashboard/settings"
            className={path.endsWith("settings") ? "active" : ""}
          >
            <Settings size={19} />
            <span>Settings</span>
          </Link>
          <Link
            href="/admin"
            className={path.startsWith("/admin") ? "active" : ""}
          >
            <ShieldCheck size={19} />
            <span>Demo admin</span>
            <span className="tiny-tag">LOCAL</span>
          </Link>
          <Link href="/docs">
            <BookOpen size={19} />
            <span>Documentation</span>
            <ArrowUpRight size={15} />
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-card">
            <span className="sandbox-icon">
              <Radio size={19} />
            </span>
            <strong>Your sandbox. Your rules.</strong>
            <p>
              Try the full experience.
              <br />
              No real numbers or charges.
            </p>
            <Link href="/docs">
              About demo mode <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="side-profile">
            <span className="avatar">
              {s.state.profile.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{s.state.profile.name}</strong>
              <small>Personal account</small>
            </div>
            <Link href="/dashboard/settings" aria-label="Account settings">
              <Settings size={17} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            {collapsed && (
              <button
                className="icon-btn"
                aria-label="Expand sidebar"
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftClose size={17} />
              </button>
            )}
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <Link href="/docs" className="help-link">
              Help & documentation <ExternalLink size={13} />
            </Link>
            <span className="top-demo">
              <i /> Demo workspace
            </span>
            <Link
              href="/dashboard/inbox"
              aria-label="Notifications"
              className="bell"
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </Link>
            <Link href="/dashboard/settings" className="avatar small">
              {s.state.profile.name[0]}
            </Link>
          </div>
        </header>
        <main className="dashboard-main">
          {!s.ready ? (
            <div className="loading" aria-label="Loading demo">
              <div />
              <div />
              <div />
            </div>
          ) : path === "/dashboard" ? (
            <Dashboard />
          ) : path === "/dashboard/numbers" ? (
            <Browse />
          ) : path === "/dashboard/rentals" ? (
            <Rentals />
          ) : path === "/dashboard/inbox" ? (
            <Inbox />
          ) : path === "/dashboard/wallet" ? (
            <WalletPage />
          ) : path === "/dashboard/settings" ? (
            <SettingsPage />
          ) : path.startsWith("/admin") ? (
            <Admin />
          ) : (
            <div className="empty">
              <h1>Page not found</h1>
              <Link href="/dashboard">Return to overview</Link>
            </div>
          )}
          <footer className="dashboard-footer">
            <span>© 2026 {brand}. Built for exploration.</span>
            <span>
              <i /> Demo systems operational{" "}
              <span className="footer-divider">|</span>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={path === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>
              {label === "Browse numbers"
                ? "Browse"
                : label === "My rentals"
                  ? "Rentals"
                  : label === "SMS inbox"
                    ? "Inbox"
                    : label}
            </span>
          </Link>
        ))}
        <Link href="/dashboard/settings">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
      {(s.error || s.notice) && (
        <div
          className={`toast ${s.error ? "error" : ""}`}
          role={s.error ? "alert" : "status"}
        >
          <span>{s.error || s.notice}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={s.clear}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
