"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { api, toRows } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { Button, Card, Empty, ErrorBox, Field, Input, Modal, PageHeader, Spinner, cx, useUi } from "@/components/ui";

type Flag = { id: string; key: string; enabled: boolean; description: string | null; updatedAt: string };

export default function FeatureFlagsPage() {
  const { notify, confirm } = useUi();
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ key: string; description: string } | null>(null);

  const fetchFlags = useCallback(async () => toRows(await api("/admin-panel/feature-flags")) as Flag[], []);
  const { data: flags, error, reload: load } = useLoader(fetchFlags);

  const upsert = async (key: string, body: Partial<Flag>, done: string) => {
    setBusy(key);
    try { await api(`/admin-panel/feature-flags/${encodeURIComponent(key)}`, { method: "PUT", body }); notify(done); load(); return true; }
    catch (e) { notify(e instanceof Error ? e.message : String(e), "error"); return false; }
    finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Feature flags" description="Toggle platform features without a deploy."
        actions={<Button variant="primary" onClick={() => setDraft({ key: "", description: "" })}><Plus className="size-4" /> New flag</Button>} />
      <Card className="[&>div]:p-0">
        {error ? <div className="p-4"><ErrorBox error={error} onRetry={load} /></div> : !flags ? <div className="px-4"><Spinner /></div> : !flags.length ? <Empty>No flags defined.</Empty> : (
          <ul className="divide-y divide-slate-100">
            {flags.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <code className="text-sm font-medium text-slate-900">{f.key}</code>
                  {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    role="switch"
                    aria-checked={f.enabled}
                    aria-label={`Toggle ${f.key}`}
                    disabled={busy === f.key}
                    onClick={() => upsert(f.key, { enabled: !f.enabled }, `${f.key} ${f.enabled ? "disabled" : "enabled"}`)}
                    className={cx("relative h-6 w-11 rounded-full transition-colors disabled:opacity-50", f.enabled ? "bg-indigo-600" : "bg-slate-300")}
                  >
                    <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", f.enabled ? "left-5.5" : "left-0.5")} />
                  </button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                    if (!(await confirm(`Delete flag "${f.key}"?`))) return;
                    try { await api(`/admin-panel/feature-flags/${f.id}`, { method: "DELETE" }); notify("Flag deleted"); load(); }
                    catch (e) { notify(e instanceof Error ? e.message : String(e), "error"); }
                  }}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!draft} title="New feature flag" onClose={() => setDraft(null)}
        footer={<>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="primary" loading={!!draft && busy === draft.key} disabled={!draft?.key.trim()} onClick={async () => {
            if (draft && await upsert(draft.key.trim(), { enabled: false, description: draft.description.trim() || null }, "Flag created")) setDraft(null);
          }}>Create (disabled)</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Key" hint="e.g. consumer_social_routes"><Input value={draft?.key ?? ""} onChange={(e) => setDraft((d) => d && { ...d, key: e.target.value })} /></Field>
          <Field label="Description"><Input value={draft?.description ?? ""} onChange={(e) => setDraft((d) => d && { ...d, description: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}
