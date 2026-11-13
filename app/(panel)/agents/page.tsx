"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { ResourcePage, type Row } from "@/components/resource-page";
import { Card, ErrorBox, Spinner, Stat } from "@/components/ui";
import { AGENT_NAMES } from "@/lib/constants";
const RUN_STATUSES = ["queued", "planning", "running", "needs_input", "awaiting_approval", "scheduled", "verifying", "completed", "failed", "blocked", "needs_reconciliation", "cancelled"];
const POST_STATUSES = ["scheduled", "publishing", "published", "failed", "cancelled"];

type Stats = { runs: Record<string, number>; steps: { scheduled: number; awaitingApproval: number; needsAttention: number }; socialPosts: Record<string, number> };

const email = (r: Row) => String((r.user as { email?: string } | undefined)?.email ?? "—");
const when = (value: unknown) => (value ? new Date(String(value)).toLocaleString() : "—");
const links = (urls: unknown) => Array.isArray(urls) && urls.length
  ? <span className="flex flex-col">{urls.map((u) => <a key={String(u)} className="text-indigo-600 hover:underline" href={String(u)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Open result</a>)}</span>
  : <span className="text-slate-300">—</span>;

function StatsRow() {
  const fetcher = useCallback(() => api<Stats>("/admin-panel/marketing/stats"), []);
  const { data, error } = useLoader(fetcher);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  const runs = (s: string) => data.runs[s] ?? 0;
  return <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <Stat label="Executions" value={Object.values(data.runs).reduce((a, b) => a + b, 0)} hint={`${runs("completed")} completed`} />
    <Stat label="In progress" value={runs("queued") + runs("planning") + runs("running") + runs("verifying")} />
    <Stat label="Scheduled steps" value={data.steps.scheduled} />
    <Stat label="Awaiting approval" value={data.steps.awaitingApproval} />
    <Stat label="Need attention" value={data.steps.needsAttention} hint="failed, blocked, unverified or unknown outcome" />
  </div>;
}

export default function AgentExecutionsPage() {
  return <>
    <StatsRow />
    <ResourcePage
      title="Agent executions"
      description="Every Marketing Agent run: what was asked, how far it got, errors, and the provider URLs it verified. Click a run for its full timeline."
      endpoint="/admin-panel/marketing/executions"
      detailHref={(r) => `/agents/${r.id}`}
      filters={[
        { key: "search", label: "Search request, email or run id", type: "search" },
        { key: "status", label: "Status", type: "select", options: RUN_STATUSES.map((s) => ({ value: s, label: s.replaceAll("_", " ") })) },
        { key: "agentKey", label: "Agent", type: "select", options: Object.entries(AGENT_NAMES).map(([value, label]) => ({ value, label })) },
      ]}
      columns={[
        { key: "createdAt", label: "Started" },
        { key: "agentKey", label: "Agent", render: (r) => AGENT_NAMES[String(r.agentKey)] ?? String(r.agentKey) },
        { key: "request", render: (r) => <span className="line-clamp-2 max-w-md" title={String(r.request)}>{String(r.request)}</span> },
        { key: "status" },
        { key: "progress", label: "Steps", render: (r) => `${r.stepsCompleted}/${r.stepsTotal}` },
        { key: "nextScheduledAt", label: "Next scheduled", render: (r) => when(r.nextScheduledAt) },
        { key: "error", render: (r) => r.error || (r.errorCodes as string[])?.length ? <span className="line-clamp-2 max-w-xs text-rose-600" title={String(r.error ?? "")}>{String(r.error ?? (r.errorCodes as string[]).join(", "))}</span> : <span className="text-slate-300">—</span> },
        { key: "resultUrls", label: "Results", render: (r) => links(r.resultUrls) },
        { key: "user", label: "User", render: email },
      ]}
    />

    <div className="mt-10" />
    <ResourcePage
      title="Scheduled & awaiting approval"
      description="Actions waiting for their time or for the owner's approval. Only the owner can approve; the worker runs approved steps at the scheduled time."
      endpoint="/admin-panel/marketing/scheduled"
      detailHref={(r) => `/agents/${(r.run as { id: string }).id}`}
      filters={[{ key: "status", label: "Status", type: "select", options: [{ value: "scheduled", label: "Scheduled" }, { value: "awaiting_approval", label: "Awaiting approval" }] }]}
      columns={[
        { key: "scheduledAt", label: "Runs at", render: (r) => when(r.scheduledAt) },
        { key: "status" },
        { key: "label", label: "Action" },
        { key: "tool" },
        { key: "agentKey", label: "Agent", render: (r) => AGENT_NAMES[String(r.agentKey)] ?? String(r.agentKey) },
        { key: "run", label: "User", render: (r) => email(r.run as Row) },
      ]}
    />

    <div className="mt-10" />
    <ResourcePage
      title="Social Publisher posts"
      description="Posts queued from the Social Publisher studio tool, with per-channel publish results."
      endpoint="/admin-panel/marketing/social-posts"
      filters={[{ key: "status", label: "Status", type: "select", options: POST_STATUSES.map((s) => ({ value: s, label: s })) }]}
      columns={[
        { key: "scheduledAt", label: "Scheduled for", render: (r) => when(r.scheduledAt) },
        { key: "status" },
        { key: "caption", render: (r) => <span className="line-clamp-2 max-w-md" title={String(r.caption)}>{String(r.caption)}</span> },
        { key: "channels", render: (r) => (r.channels as { provider: string }[] ?? []).map((c) => c.provider).join(", ") || "—" },
        { key: "error", render: (r) => r.error ? <span className="line-clamp-2 max-w-xs text-rose-600" title={String(r.error)}>{String(r.error)}</span> : <span className="text-slate-300">—</span> },
        { key: "user", label: "User", render: email },
      ]}
    />
    <Card className="mt-6"><p className="text-sm text-slate-500">Admins can monitor every run here. Approving, retrying and cancelling stay with the user who started the run, so an approval always comes from the account owner.</p></Card>
  </>;
}
