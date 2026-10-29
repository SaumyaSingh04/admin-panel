"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { ObjectSummary } from "@/components/object-summary";
import { Badge, Button, Card, ErrorBox, FormatValue, PageHeader, Spinner, useUi } from "@/components/ui";

type Scope = { scope: string; label: string; keyCount: number | null };
type CacheStatus = {
  redisAvailable: boolean;
  totalKeys: number | null;
  scopes: Scope[];
  lastCleared: { action: string; scope: string | null; at: string; byAdminEmail: string | null } | null;
};
// Scopes the backend's clear-scope validator accepts.
const CLEARABLE = new Set(["user", "model", "api", "session"]);

export default function SystemPage() {
  const { notify, confirm } = useUi();
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [cache, health] = await Promise.all([
      api<CacheStatus>("/admin-panel/cache/status"),
      api<unknown>("/ai/ai-providers/health").catch((e) => ({ error: e instanceof Error ? e.message : String(e) })),
    ]);
    return { cache, health };
  }, []);
  const { data, error, reload: load } = useLoader(fetchAll);
  const cache = data?.cache;
  const health = data?.health;

  const run = async (key: string, path: string, body: unknown, text: string) => {
    if (!(await confirm(text))) return;
    setBusy(key);
    try { await api(path, { method: "POST", body }); notify("Cache cleared"); load(); }
    catch (e) { notify(e instanceof Error ? e.message : String(e), "error"); }
    finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Cache & health" description="Redis cache scopes and upstream provider health." actions={<Button onClick={load}>Refresh</Button>} />
      {error ? <div className="mb-4"><ErrorBox error={error} onRetry={load} /></div> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Cache" actions={cache && <Badge tone={cache.redisAvailable ? "green" : "red"}>{cache.redisAvailable ? "Redis connected" : "Redis unavailable"}</Badge>}>
          {!cache ? <Spinner /> : (
            <div className="space-y-4 text-sm">
              <div className="text-slate-500">Total keys in database: <span className="font-medium text-slate-900"><FormatValue value={cache.totalKeys} /></span></div>
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {cache.scopes.map((s) => (
                  <li key={s.scope} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="text-slate-800">{s.label}</div>
                      <div className="text-xs text-slate-400">{s.keyCount ?? "?"} keys</div>
                    </div>
                    {CLEARABLE.has(s.scope) && (
                      <Button size="sm" loading={busy === s.scope} onClick={() => run(s.scope, "/admin-panel/cache/clear-scope", { scope: s.scope }, `Clear the "${s.label}" cache scope?`)}>Clear</Button>
                    )}
                  </li>
                ))}
              </ul>
              {cache.lastCleared && (
                <p className="text-xs text-slate-500">
                  Last cleared: {cache.lastCleared.scope ?? cache.lastCleared.action} by {cache.lastCleared.byAdminEmail ?? "admin"} · <FormatValue value={cache.lastCleared.at} />
                </p>
              )}
              <Button variant="danger" loading={busy === "all"} onClick={() => run("all", "/admin-panel/cache/clear-all", {}, "Clear ALL application caches? Responses may be slower while caches warm up.")}>
                Clear all caches
              </Button>
            </div>
          )}
        </Card>
        <Card title="Provider health">
          {health === undefined ? <Spinner /> : <ObjectSummary value={health} />}
        </Card>
      </div>
    </>
  );
}
