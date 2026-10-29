"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, apiRaw, toRows } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { useAdmin } from "@/components/admin-shell";
import { Badge, Button, Card, Empty, ErrorBox, Field, FormatValue, Input, JsonView, Modal, PageHeader, Select, Spinner, Stat, StatusBadge, formatNumber, useUi } from "@/components/ui";
import { ROLES } from "@/lib/constants";

type User = { id: string; email: string; name: string | null; handle: string | null; role: string; isActive: boolean; avatarUrl: string | null; createdAt: string; _count?: { imageGenJobs: number } };
type Row = Record<string, unknown>;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const admin = useAdmin();
  const isSuper = admin?.role === "SUPER_ADMIN";
  const { notify, confirm } = useUi();

  const [creditsOpen, setCreditsOpen] = useState(false);
  const [credit, setCredit] = useState({ type: "ADD", amount: "", reason: "" });
  const [roleOpen, setRoleOpen] = useState(false);
  const [role, setRole] = useState({ role: "USER", note: "" });
  const [rawOpen, setRawOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    const user = await api<User>(`/admin-panel/users/${id}`);
    // Secondary panels degrade independently: a user without a wallet or
    // subscription is normal, not an error.
    const [b, s, i, t, g] = await Promise.allSettled([
      api<{ balance: string; currency: string }>(`/admin-panel/credits/${id}/balance`),
      api<unknown>(`/admin-panel/billing/subscriptions/${id}`),
      api<Row>(`/admin-panel/users/${id}/intelligence`),
      apiRaw(`/admin-panel/credits/${id}/transactions`, { query: { limit: 10 } }),
      apiRaw(`/admin-panel/users/${id}/generations`, { query: { limit: 10 } }),
    ]);
    return {
      user,
      balance: b.status === "fulfilled" ? b.value : null,
      subscription: s.status === "fulfilled" ? s.value : null,
      intel: i.status === "fulfilled" ? i.value : null,
      transactions: t.status === "fulfilled" ? toRows(t.value.data) : [],
      generations: g.status === "fulfilled" ? toRows(g.value.data) : [],
    };
  }, [id]);
  const { data, error, reload: load } = useLoader(fetchUser);

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await fn(); notify(done); load(); return true; }
    catch (e) { notify(e instanceof Error ? e.message : String(e), "error"); return false; }
    finally { setBusy(null); }
  };

  if (error) return <ErrorBox error={error} onRetry={load} />;
  if (!data) return <Spinner />;
  const { user, balance, subscription, intel, transactions, generations } = data;

  const intelStats = intel ? Object.entries(intel).filter(([, v]) => typeof v === "number").slice(0, 8) : [];

  return (
    <>
      <Link href="/users" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" /> Users</Link>
      <PageHeader
        title={user.name || user.email}
        description={`${user.email}${user.handle ? ` · @${user.handle}` : ""} · joined ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <>
            <Button onClick={() => setRawOpen(true)}>Raw data</Button>
            <Button loading={busy === "cache"} onClick={() => act("cache", () => api("/admin-panel/cache/clear-user", { method: "POST", body: { userId: user.id } }), "User cache cleared")}>Clear cache</Button>
            {isSuper && <Button onClick={() => { setRole({ role: user.role, note: "" }); setRoleOpen(true); }}>Change role</Button>}
            {isSuper && <Button variant="primary" onClick={() => setCreditsOpen(true)}>Adjust credits</Button>}
            {user.isActive ? (
              <Button variant="danger" loading={busy === "ban"} onClick={async () => {
                if (await confirm(`Ban ${user.email}?`)) await act("ban", () => api(`/admin-panel/users/${user.id}/ban`, { method: "POST", body: {} }), "User banned");
              }}>Ban</Button>
            ) : (
              <Button loading={busy === "ban"} onClick={() => act("ban", () => api(`/admin-panel/users/${user.id}/unban`, { method: "POST", body: {} }), "User unbanned")}>Unban</Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="indigo">{user.role}</Badge>
        <Badge tone={user.isActive ? "green" : "red"}>{user.isActive ? "Active" : "Banned"}</Badge>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Wallet balance" value={balance ? formatNumber(balance.balance) : "—"} hint={balance?.currency} />
        <Stat label="Generation jobs" value={formatNumber(user._count?.imageGenJobs ?? 0)} />
        {intelStats.map(([k, v]) => <Stat key={k} label={k.replace(/([a-z])([A-Z])/g, "$1 $2")} value={formatNumber(v)} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Subscription">
          {subscription ? <JsonView value={subscription} /> : <Empty>No subscription.</Empty>}
        </Card>
        <Card title="Recent credit transactions">
          {!transactions.length ? <Empty>No transactions.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {transactions.map((t, i) => (
                <li key={String(t.id ?? i)} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-slate-700">{String(t.description ?? t.type ?? "Transaction")}</div>
                    <div className="text-xs text-slate-400"><FormatValue value={t.createdAt} /></div>
                  </div>
                  <span className={Number(t.amount) < 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{Number(t.amount) > 0 ? "+" : ""}{formatNumber(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent generations" className="xl:col-span-2" actions={<Link href={`/generations?userId=${user.id}`} className="text-xs text-indigo-600 hover:underline">All</Link>}>
          {!generations.length ? <Empty>No generations.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {generations.map((g, i) => (
                <li key={String(g.id ?? i)} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-slate-700">{String(g.prompt ?? g.type ?? g.id)}</div>
                    <div className="text-xs text-slate-400">{String(g.type ?? "")} · <FormatValue value={g.createdAt} /></div>
                  </div>
                  <StatusBadge value={g.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={creditsOpen} title="Adjust wallet credits" onClose={() => setCreditsOpen(false)}
        footer={<>
          <Button onClick={() => setCreditsOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={busy === "credits"} disabled={!Number(credit.amount) || !credit.reason.trim()} onClick={async () => {
            const ok = await act("credits", () => api(`/admin-panel/credits/${user.id}/adjust`, { method: "POST", body: { type: credit.type, amount: Number(credit.amount), reason: credit.reason.trim() } }), "Credits updated");
            if (ok) { setCreditsOpen(false); setCredit({ type: "ADD", amount: "", reason: "" }); }
          }}>Apply</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Operation">
            <Select value={credit.type} onChange={(e) => setCredit({ ...credit, type: e.target.value })}>
              <option value="ADD">Add credits</option>
              <option value="REMOVE">Remove credits</option>
            </Select>
          </Field>
          <Field label="Amount"><Input type="number" min={1} value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} /></Field>
          <Field label="Reason" hint="Recorded in the audit log."><Input value={credit.reason} onChange={(e) => setCredit({ ...credit, reason: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={roleOpen} title="Change role" onClose={() => setRoleOpen(false)}
        footer={<>
          <Button onClick={() => setRoleOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={busy === "role"} onClick={async () => {
            const ok = await act("role", () => api(`/admin-panel/users/${user.id}`, { method: "PATCH", body: { role: role.role, ...(role.note.trim() && { note: role.note.trim() }) } }), "Role updated");
            if (ok) setRoleOpen(false);
          }}>Save</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Role">
            <Select value={role.role} onChange={(e) => setRole({ ...role, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Note" hint="Optional, recorded in the audit log."><Input value={role.note} onChange={(e) => setRole({ ...role, note: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={rawOpen} title="Raw user data" wide onClose={() => setRawOpen(false)}>
        <JsonView value={{ user, balance, subscription, intelligence: intel }} />
      </Modal>
    </>
  );
}
