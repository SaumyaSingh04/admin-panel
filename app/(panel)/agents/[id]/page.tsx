"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { Badge, Button, Card, ErrorBox, JsonView, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { AGENT_NAMES } from "@/lib/constants";

type StepEvent = { at: string; status: string; attempt: number; errorCode: string | null };
type Step = {
  id: string; position: number; agentKey: string; tool: string; label: string; status: string;
  input: unknown; resolvedInput: unknown; result: unknown; receipt: unknown; resultUrl: string | null;
  scheduledAt: string | null; nextAttemptAt: string | null; approvedAt: string | null; approvedBy: string | null;
  attempts: number; error: string | null; errorCode: string | null; events: StepEvent[]; createdAt: string; updatedAt: string;
};
type Execution = {
  id: string; agentKey: string; request: string; timezone: string; status: string; question: string | null; error: string | null;
  sessionId: string; leaseUntil: string | null; createdAt: string; updatedAt: string;
  user: { id: string; email: string; name: string | null }; steps: Step[];
};

const ACTIVE = new Set(["queued", "planning", "running", "verifying", "awaiting_approval", "scheduled"]);
const when = (v: string | null, tz?: string) => (v ? new Date(v).toLocaleString(undefined, tz ? { timeZone: tz } : undefined) : null);

function StepCard({ step, timezone }: { step: Step; timezone: string }) {
  const failed = ["failed", "verification_failed", "unknown", "blocked"].includes(step.status);
  return (
    <li className="relative pl-8">
      <span className={`absolute left-0 top-1.5 size-3 rounded-full ${step.status === "completed" ? "bg-emerald-500" : failed ? "bg-rose-500" : "bg-indigo-400"}`} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-slate-800">{step.position + 1}. {step.label}</b>
          <StatusBadge value={step.status} />
          <Badge>{AGENT_NAMES[step.agentKey] ?? step.agentKey}</Badge>
          <code className="text-xs text-slate-500">{step.tool}</code>
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
          {step.scheduledAt && <div><dt className="inline font-medium">Scheduled: </dt><dd className="inline">{when(step.scheduledAt, timezone)} ({timezone})</dd></div>}
          {step.approvedAt && <div><dt className="inline font-medium">Approved: </dt><dd className="inline">{when(step.approvedAt)}</dd></div>}
          <div><dt className="inline font-medium">Attempts: </dt><dd className="inline">{step.attempts}</dd></div>
          {step.nextAttemptAt && <div><dt className="inline font-medium">Next attempt: </dt><dd className="inline">{when(step.nextAttemptAt)}</dd></div>}
        </dl>
        {step.error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{step.errorCode}: {step.error}</p>}
        {step.resultUrl && <a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline" href={step.resultUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> {step.resultUrl}</a>}
        {step.events.length > 0 && (
          <ol className="mt-3 space-y-0.5 border-l border-slate-200 pl-3 text-xs text-slate-500">
            {step.events.map((e, i) => <li key={i}>{when(e.at)} — <b>{e.status.replaceAll("_", " ")}</b>{e.attempt ? ` · attempt ${e.attempt}` : ""}{e.errorCode ? ` · ${e.errorCode}` : ""}</li>)}
          </ol>
        )}
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-slate-500">Inputs, provider receipt and result</summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold text-slate-500">Approved input</p><JsonView value={step.resolvedInput ?? step.input} /></div>
            <div><p className="mb-1 text-xs font-semibold text-slate-500">Receipt / result</p><JsonView value={{ receipt: step.receipt, result: step.result }} /></div>
          </div>
        </details>
      </div>
    </li>
  );
}

export default function AgentExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const fetcher = useCallback(() => api<Execution>(`/admin-panel/marketing/executions/${id}`), [id]);
  const { data: run, error, reload } = useLoader(fetcher);
  const live = run ? ACTIVE.has(run.status) : false;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(reload, 10_000);
    return () => clearInterval(t);
  }, [live, reload]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!run) return <Spinner />;
  const done = run.steps.filter((s) => s.status === "completed").length;
  return (
    <>
      <Link href="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" /> All executions</Link>
      <PageHeader
        title={AGENT_NAMES[run.agentKey] ?? run.agentKey}
        description={`Run ${run.id}`}
        actions={<Button size="sm" onClick={reload}>Refresh</Button>}
      />
      <Card className="mb-6">
        <p className="whitespace-pre-wrap text-slate-800">{run.request}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <StatusBadge value={run.status} />
          <span>{done}/{run.steps.length} steps complete</span>
          <span>· {run.user.email}</span>
          <span>· started {when(run.createdAt)}</span>
          <span>· timezone {run.timezone}</span>
          {live && <Badge tone="blue">live — refreshing every 10s</Badge>}
        </div>
        {run.question && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"><b>Asked the user:</b> {run.question}</p>}
        {run.error && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{run.error}</p>}
      </Card>
      <Card title="Execution timeline">
        {run.steps.length === 0
          ? <p className="text-sm text-slate-500">{["queued", "planning"].includes(run.status) ? "Planning has not produced steps yet." : "No steps were planned."}</p>
          : <ol className="space-y-4">{run.steps.map((s) => <StepCard key={s.id} step={s} timezone={run.timezone} />)}</ol>}
      </Card>
    </>
  );
}
