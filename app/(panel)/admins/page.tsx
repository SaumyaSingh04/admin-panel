"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { api, toRows } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { useAdmin } from "@/components/admin-shell";
import { Badge, Button, Card, Empty, ErrorBox, Field, FormatValue, Input, Modal, PageHeader, Select, Spinner, useUi } from "@/components/ui";

type Member = { id: string; email: string; name: string | null; role: string; isActive: boolean; createdAt: string };
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export default function AdminsPage() {
  const me = useAdmin();
  const { notify, confirm } = useUi();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "ADMIN", note: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    const lists = await Promise.all(ADMIN_ROLES.map((role) => api(`/admin-panel/users`, { query: { role, limit: 100 } })));
    return lists.flatMap((l) => toRows(l) as Member[]);
  }, []);
  const { data: team, error, reload } = useLoader(fetchTeam);

  const setRole = async (user: { id: string; email: string }, role: string, note?: string) => {
    setBusy(user.id);
    try {
      await api(`/admin-panel/users/${user.id}`, { method: "PATCH", body: { role, ...(note && { note }) } });
      notify(`${user.email} is now ${role}`);
      reload();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), "error");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const promote = async (e: FormEvent) => {
    e.preventDefault();
    const email = invite.email.trim().toLowerCase();
    setBusy("invite");
    try {
      // The user must already have an account; search is a substring match, so pick the exact email.
      const found = (toRows(await api("/admin-panel/users", { query: { search: email, limit: 20 } })) as Member[])
        .find((u) => u.email.toLowerCase() === email);
      if (!found) throw new Error("No account with that email. Ask them to sign up first, or create one with `npm run seed:superadmin`.");
      setBusy(null);
      if (await setRole(found, invite.role, invite.note.trim() || undefined)) {
        setInviteOpen(false);
        setInvite({ email: "", role: "ADMIN", note: "" });
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), "error");
      setBusy(null);
    }
  };

  if (me?.role !== "SUPER_ADMIN") {
    return <><PageHeader title="Admins & roles" /><Card><Empty>Only a SUPER_ADMIN can manage admin access.</Empty></Card></>;
  }

  return (
    <>
      <PageHeader
        title="Admins & roles"
        description="Who can open this panel. SUPER_ADMIN has every permission; ADMIN cannot touch billing, credits, roles or AI configuration."
        actions={<Button variant="primary" onClick={() => setInviteOpen(true)}><UserPlus className="size-4" /> Add admin</Button>}
      />
      <Card className="[&>div]:p-0">
        {error ? <div className="p-4"><ErrorBox error={error} onRetry={reload} /></div> : !team ? <div className="px-4"><Spinner /></div> : !team.length ? <Empty /> : (
          <ul className="divide-y divide-slate-100">
            {team.map((u) => {
              const self = u.id === me.id;
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/users/${u.id}`} className="font-medium text-slate-900 hover:underline">{u.name || u.email}</Link>
                    {self && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    <div className="text-xs text-slate-500">{u.email} · since <FormatValue value={u.createdAt} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!u.isActive && <Badge tone="red">Banned</Badge>}
                    <Badge tone={u.role === "SUPER_ADMIN" ? "indigo" : "blue"}>{u.role}</Badge>
                    {!self && (
                      <>
                        <Button size="sm" loading={busy === u.id}
                          onClick={() => setRole(u, u.role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN")}>
                          {u.role === "SUPER_ADMIN" ? "Make ADMIN" : "Make SUPER_ADMIN"}
                        </Button>
                        <Button size="sm" variant="danger" disabled={busy === u.id} onClick={async () => {
                          if (await confirm(`Remove admin access from ${u.email}? They become a regular USER.`)) await setRole(u, "USER");
                        }}>Remove access</Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={inviteOpen} title="Add admin" onClose={() => setInviteOpen(false)}
        footer={<>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="invite-form" loading={busy === "invite"} disabled={!invite.email.trim()}>Grant access</Button>
        </>}>
        <form id="invite-form" onSubmit={promote} className="space-y-4">
          <Field label="Email of an existing account"><Input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Note" hint="Optional, recorded in the audit log."><Input value={invite.note} onChange={(e) => setInvite({ ...invite, note: e.target.value })} /></Field>
        </form>
      </Modal>
    </>
  );
}
