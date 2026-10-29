"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase/client";
import { countryFlag } from "@/lib/countries";
import { googleEnabled, siteConfig } from "@/config/site";

type Tab = "live" | "users" | "reports";

interface Stats {
  users_total: number;
  users_today: number;
  active_today: number;
  banned: number;
  matches_today: number;
  matches_total: number;
  live_matches: number;
  waiting: number;
  open_reports: number;
}

interface OnlineUser {
  id: string;
  display_name: string;
  email: string | null;
  country: string | null;
  avatar_url: string | null;
  status: "idle" | "searching" | "chatting";
  partner_name: string | null;
  match_id: string | null;
  since: string | null;
  last_seen_at: string;
  banned: boolean;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string | null;
  country: string | null;
  avatar_url: string | null;
  role: string;
  banned: boolean;
  ban_reason: string | null;
  total_matches: number;
  created_at: string;
  last_seen_at: string;
}

interface ReportRow {
  id: string;
  match_id: string | null;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

const LIVE_REFRESH_MS = 5000;

export function AdminApp() {
  const { status, session, profile, signInWithGoogle, signInWithPassword, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("live");

  if (status === "loading") return <Shell>Loading…</Shell>;
  if (status === "unconfigured") return <Shell>Supabase isn&apos;t configured yet.</Shell>;
  const isGuest = Boolean(session?.user.is_anonymous);
  if (status === "signed-out" || isGuest)
    return <AdminLogin onPassword={signInWithPassword} onGoogle={googleEnabled ? () => signInWithGoogle("/admin") : undefined} />;
  if (profile?.role !== "admin")
    return (
      <Shell>
        <div>
          <p>This account isn&apos;t an admin.</p>
          <button onClick={signOut} className="mt-4 rounded-full bg-dusk px-4 py-2 text-mist">
            Sign out
          </button>
        </div>
      </Shell>
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-2xl font-extrabold">
            {siteConfig.name}
          </Link>
          <span className="text-haze">Admin</span>
        </div>
        <Link href="/chat" className="text-sm text-haze hover:text-mist">
          Open chat
        </Link>
      </header>

      <StatsBar />

      <nav className="mt-8 flex gap-1 border-b border-white/10" role="tablist">
        {(["live", "users", "reports"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 font-semibold capitalize ${
              tab === t ? "border-coral text-mist" : "border-transparent text-haze hover:text-mist"
            }`}
          >
            {t === "live" ? "Online now" : t}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "live" && <LiveTab />}
        {tab === "users" && <UsersTab />}
        {tab === "reports" && <ReportsTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = async () => {
      const { data } = await getSupabase().rpc("admin_stats");
      if (data) setStats(data as Stats);
    };
    void load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  const items: [string, number | undefined][] = [
    ["Open chats", stats?.live_matches],
    ["Searching", stats?.waiting],
    ["Active today", stats?.active_today],
    ["New users today", stats?.users_today],
    ["Chats today", stats?.matches_today],
    ["Total users", stats?.users_total],
    ["Open reports", stats?.open_reports],
    ["Banned", stats?.banned],
  ];

  return (
    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-haze">{label}</dt>
          <dd className={`font-display text-3xl font-bold tabular-nums ${label === "Open reports" && value ? "text-coral" : ""}`}>
            {value ?? "–"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LiveTab() {
  const [rows, setRows] = useState<OnlineUser[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await getSupabase().rpc("admin_online");
    setRows((data as OnlineUser[]) ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, state is set after the await
    void load();
    const t = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (!rows) return <p className="text-haze">Loading…</p>;
  if (rows.length === 0) return <p className="py-10 text-center text-haze">Nobody is online right now. This list refreshes every 5 seconds.</p>;

  return (
    <Table head={["User", "Status", "With", "For", ""]}>
      {rows.map((u) => (
        <tr key={u.id} className="border-t border-white/5">
          <td className="py-2.5 pr-4">
            <UserCell name={u.display_name} email={u.email} country={u.country} avatar={u.avatar_url} />
          </td>
          <td className="pr-4">
            <StatusPill status={u.status} />
          </td>
          <td className="pr-4 text-haze">{u.partner_name ?? "—"}</td>
          <td className="pr-4 tabular-nums text-haze">{u.since ? ago(u.since) : "—"}</td>
          <td className="text-right">
            <BanButton userId={u.id} banned={u.banned} onDone={load} />
          </td>
        </tr>
      ))}
    </Table>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const load = useCallback(async () => {
    let q = getSupabase()
      .from("profiles")
      .select("id, display_name, email, country, avatar_url, role, banned, ban_reason, total_matches, created_at, last_seen_at")
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    const term = query.trim().replace(/[%,()]/g, "");
    if (term) q = q.or(`email.ilike.%${term}%,display_name.ilike.%${term}%`);
    const { data } = await q;
    setRows((data as UserRow[]) ?? []);
  }, [page, query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        placeholder="Search by name or email"
        className="mb-4 w-full max-w-sm rounded-full bg-dusk px-4 py-2.5 placeholder:text-haze/70"
      />
      {!rows ? (
        <p className="text-haze">Loading…</p>
      ) : (
        <>
          <Table head={["User", "Joined", "Last seen", "Chats", ""]}>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="py-2.5 pr-4">
                  <UserCell name={u.display_name} email={u.email} country={u.country} avatar={u.avatar_url} />
                  {u.banned && <p className="mt-1 text-xs text-coral">Banned{u.ban_reason ? `: ${u.ban_reason}` : ""}</p>}
                </td>
                <td className="pr-4 text-haze">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="pr-4 text-haze">{ago(u.last_seen_at)} ago</td>
                <td className="pr-4 tabular-nums">{u.total_matches}</td>
                <td className="text-right">
                  {u.role === "admin" ? <span className="text-sm text-signal">Admin</span> : <BanButton userId={u.id} banned={u.banned} onDone={load} />}
                </td>
              </tr>
            ))}
          </Table>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-dusk px-4 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <span className="text-haze">Page {page + 1}</span>
            <button disabled={rows.length < pageSize} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-dusk px-4 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReportsTab() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [names, setNames] = useState<Record<string, UserRow>>({});
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    const sb = getSupabase();
    let q = sb.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter === "open") q = q.eq("status", "open");
    const { data } = await q;
    const reports = (data as ReportRow[]) ?? [];
    setRows(reports);
    const ids = [...new Set(reports.flatMap((r) => [r.reporter_id, r.reported_id]))];
    if (ids.length) {
      const { data: people } = await sb.from("profiles").select("id, display_name, email, country, avatar_url, banned").in("id", ids);
      setNames(Object.fromEntries(((people as UserRow[]) ?? []).map((p) => [p.id, p])));
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, state is set after the await
    void load();
  }, [load]);

  const resolve = async (id: string, status: "dismissed" | "actioned") => {
    await getSupabase().rpc("admin_resolve_report", { p_report: id, p_status: status });
    void load();
  };

  if (!rows) return <p className="text-haze">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex gap-2 text-sm">
        {(["open", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 capitalize ${filter === f ? "bg-dusk-2" : "text-haze"}`}>
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-haze">No {filter === "open" ? "open " : ""}reports. Nice.</p>
      ) : (
        <Table head={["Reported user", "Reason", "By", "When", ""]}>
          {rows.map((r) => {
            const target = names[r.reported_id];
            return (
              <tr key={r.id} className="border-t border-white/5 align-top">
                <td className="py-2.5 pr-4">
                  {target ? <UserCell name={target.display_name} email={target.email} country={target.country} avatar={target.avatar_url} /> : r.reported_id.slice(0, 8)}
                </td>
                <td className="pr-4">
                  <span className={r.reason === "minor" || r.reason === "nudity" ? "font-semibold text-coral" : ""}>{r.reason}</span>
                  {r.details && <p className="mt-1 max-w-xs text-sm text-haze">{r.details}</p>}
                </td>
                <td className="pr-4 text-sm text-haze">{names[r.reporter_id]?.email ?? "—"}</td>
                <td className="pr-4 text-sm text-haze">{ago(r.created_at)} ago</td>
                <td className="whitespace-nowrap text-right">
                  {r.status === "open" ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resolve(r.id, "dismissed")} className="rounded-full px-3 py-1 text-sm text-haze hover:bg-dusk-2">
                        Dismiss
                      </button>
                      {target && !target.banned && <BanButton userId={r.reported_id} banned={false} onDone={load} reason={`report: ${r.reason}`} />}
                    </div>
                  ) : (
                    <span className="text-sm text-haze">{r.status}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BanButton({ userId, banned, onDone, reason }: { userId: string; banned: boolean; onDone: () => void; reason?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!banned && !window.confirm("Ban this user? They'll be disconnected immediately.")) return;
        setBusy(true);
        await getSupabase().rpc("admin_set_ban", { p_user: userId, p_banned: !banned, p_reason: reason ?? "manual" });
        setBusy(false);
        onDone();
      }}
      className={`rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-50 ${
        banned ? "bg-dusk-2 text-mist hover:bg-dusk-2/70" : "bg-coral/15 text-coral hover:bg-coral hover:text-plum-deep"
      }`}
    >
      {banned ? "Unban" : "Ban"}
    </button>
  );
}

function UserCell({ name, email, country, avatar }: { name: string; email: string | null; country: string | null; avatar: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" width={32} height={32} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <div className="grid h-8 w-8 place-items-center rounded-full bg-dusk-2 text-sm">{name.slice(0, 1)}</div>
      )}
      <div className="min-w-0">
        <p className="font-semibold">
          {name} <span className="font-normal">{countryFlag(country)}</span>
        </p>
        <p className="truncate text-xs text-haze">{email ?? "Guest"}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: OnlineUser["status"] }) {
  const styles = {
    chatting: "bg-signal/15 text-signal",
    searching: "bg-coral/15 text-coral",
    idle: "bg-dusk-2 text-haze",
  } as const;
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${styles[status]}`}>{status}</span>;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="text-sm text-haze">
            {head.map((h, i) => (
              <th key={i} className="pb-2 pr-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function AdminLogin({
  onPassword,
  onGoogle,
}: {
  onPassword: (email: string, password: string) => Promise<string | null>;
  onGoogle?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <form
        className="w-full max-w-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(await onPassword(email, password));
          setBusy(false);
        }}
      >
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          className="mt-6 w-full rounded-xl bg-dusk px-4 py-3 placeholder:text-haze/70"
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="mt-2 w-full rounded-xl bg-dusk px-4 py-3 placeholder:text-haze/70"
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-coral">
            {error}
          </p>
        )}
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-mist py-3 font-semibold text-plum-deep disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {onGoogle && (
          <button type="button" onClick={onGoogle} className="mt-3 w-full text-sm text-haze underline">
            Sign in with Google
          </button>
        )}
      </form>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center p-6 text-center text-haze">{children}</div>;
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
