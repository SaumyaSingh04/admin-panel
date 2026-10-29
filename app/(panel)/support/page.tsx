"use client";

import { useCallback, useState } from "react";
import { api, unwrap } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { ResourcePage } from "@/components/resource-page";
import { Button, ErrorBox, FormatValue, Modal, Select, Spinner, StatusBadge, Textarea, useUi } from "@/components/ui";

type Message = { id: string; authorId: string; message: string; createdAt: string };
type Ticket = {
  id: string; userId: string; subject: string; description: string; category: string; priority: string; status: string; createdAt: string;
  messages?: Message[];
};
const STATUSES = ["open", "in_progress", "resolved", "closed"];

function TicketDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { notify } = useUi();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => unwrap<Ticket>(await api(`/admin-panel/tickets/${id}`), "ticket"), [id]);
  const { data: ticket, error, reload: load } = useLoader(fetchTicket);

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await fn(); notify(done); load(); onChanged(); return true; }
    catch (e) { notify(e instanceof Error ? e.message : String(e), "error"); return false; }
    finally { setBusy(null); }
  };

  return (
    <Modal
      open
      wide
      title={ticket?.subject ?? "Ticket"}
      onClose={onClose}
      footer={ticket && (
        <>
          <Select className="mr-auto w-40" value={ticket.status} disabled={busy === "status"}
            onChange={(e) => act("status", () => api(`/admin-panel/tickets/${id}`, { method: "PATCH", body: { status: e.target.value } }), "Status updated")}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {ticket.status !== "closed" && (
            <Button loading={busy === "close"} onClick={() => act("close", () => api(`/admin-panel/tickets/${id}/close`, { method: "POST", body: {} }), "Ticket closed")}>Close ticket</Button>
          )}
          <Button variant="primary" disabled={!reply.trim()} loading={busy === "reply"} onClick={async () => {
            if (await act("reply", () => api(`/admin-panel/tickets/${id}/response`, { method: "POST", body: { message: reply.trim() } }), "Reply sent")) setReply("");
          }}>Send reply</Button>
        </>
      )}
    >
      {error ? <ErrorBox error={error} /> : !ticket ? <Spinner /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <StatusBadge value={ticket.status} /> <span>{ticket.category}</span> · <span>priority {ticket.priority}</span> · <FormatValue value={ticket.createdAt} />
          </div>
          <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-slate-800">{ticket.description}</div>
          {(ticket.messages ?? []).map((m) => {
            const fromCustomer = m.authorId === ticket.userId;
            return (
              <div key={m.id} className={fromCustomer ? "rounded-md border border-slate-200 p-3" : "ml-8 rounded-md bg-indigo-50 p-3"}>
                <div className="mb-1 text-xs text-slate-500">{fromCustomer ? "Customer" : "Staff"} · <FormatValue value={m.createdAt} /></div>
                <div className="whitespace-pre-wrap text-slate-800">{m.message}</div>
              </div>
            );
          })}
          <Textarea rows={4} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

export default function SupportPage() {
  const [open, setOpen] = useState<string | null>(null);
  // Bumped after a change so the list reloads with the new status.
  const [version, setVersion] = useState(0);
  return (
    <>
      <ResourcePage
        key={version}
        title="Support tickets"
        description="Customer tickets and replies."
        endpoint="/admin-panel/tickets"
        pagination="offset"
        filters={[{ key: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) }]}
        columns={[{ key: "subject" }, { key: "category" }, { key: "priority" }, { key: "status" }, { key: "createdAt" }]}
        onRowClick={(r) => setOpen(String(r.id))}
      />
      {open && <TicketDialog id={open} onClose={() => setOpen(null)} onChanged={() => setVersion((v) => v + 1)} />}
    </>
  );
}
