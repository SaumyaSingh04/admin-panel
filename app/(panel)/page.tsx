"use client";

import { useCallback } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { api, toRows } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { Button, Card, Empty, ErrorBox, FormatValue, PageHeader, Spinner, Stat, StatusBadge, formatNumber } from "@/components/ui";

type Overview = {
  totalUsers: number; activeUsers: number; totalGenerations: number; completedGenerations: number; failedGenerations: number;
  totalActiveModels: number; totalInactiveModels: number; generationsToday: number; generationsThisMonth: number; creditsConsumed: number;
};
type Job = { id: string; type: string; status: string; creditCost: number | null; userId: string | null; createdAt: string; prompt: string | null; errorMessage: string | null };

export default function DashboardPage() {
  const fetchAll = useCallback(async () => {
    const [overview, jobs, models] = await Promise.all([
      api<Overview>("/admin-panel/dashboard/overview"),
      api<unknown>("/admin-panel/dashboard/recent-jobs", { query: { limit: 15 } }),
      api<unknown>("/admin-panel/dashboard/models", { query: { period: "7d" } }).catch(() => []),
    ]);
    return { overview, jobs: toRows(jobs) as Job[], models: toRows(models).slice(0, 8) };
  }, []);
  const { data, error, loading, reload: load } = useLoader(fetchAll);
  const overview = data?.overview;
  const jobs = data?.jobs ?? [];
  const models = data?.models ?? [];

  const successRate = overview && overview.totalGenerations
    ? `${((overview.completedGenerations / overview.totalGenerations) * 100).toFixed(1)}% success`
    : undefined;

  return (
    <>
      <PageHeader title="Dashboard" description="Platform health at a glance." actions={<Button onClick={load} loading={loading}><RefreshCw className="size-4" /> Refresh</Button>} />
      {error ? <ErrorBox error={error} onRetry={load} /> : !overview ? <Spinner /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total users" value={formatNumber(overview.totalUsers)} hint={`${formatNumber(overview.activeUsers)} active recently`} />
            <Stat label="Generations today" value={formatNumber(overview.generationsToday)} hint={`${formatNumber(overview.generationsThisMonth)} this month`} />
            <Stat label="All-time generations" value={formatNumber(overview.totalGenerations)} hint={successRate} />
            <Stat label="Failed generations" value={formatNumber(overview.failedGenerations)} />
            <Stat label="Credits consumed" value={formatNumber(Math.abs(overview.creditsConsumed))} />
            <Stat label="Active models" value={formatNumber(overview.totalActiveModels)} hint={`${formatNumber(overview.totalInactiveModels)} inactive`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Recent jobs" className="xl:col-span-2" actions={<Link href="/jobs" className="text-xs text-indigo-600 hover:underline">All jobs</Link>}>
              {!jobs.length ? <Empty>No jobs yet.</Empty> : (
                <div className="-m-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Prompt</th><th className="px-4 py-2">Credits</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Created</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((j) => (
                        <tr key={j.id}>
                          <td className="px-4 py-2 text-slate-700">{j.type}</td>
                          <td className="px-4 py-2"><StatusBadge value={j.status} /></td>
                          <td className="max-w-xs truncate px-4 py-2 text-slate-500" title={j.errorMessage ?? j.prompt ?? ""}>{j.prompt ?? "—"}</td>
                          <td className="px-4 py-2">{j.creditCost ?? "—"}</td>
                          <td className="px-4 py-2">{j.userId ? <Link className="text-indigo-600 hover:underline" href={`/users/${j.userId}`}>View</Link> : <span className="text-slate-400">Guest</span>}</td>
                          <td className="px-4 py-2"><FormatValue value={j.createdAt} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Top models · 7 days">
              {!models.length ? <Empty>No usage data.</Empty> : (
                <ul className="space-y-2 text-sm">
                  {models.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <span className="truncate text-slate-700">{String((m.model as { name?: string } | undefined)?.name ?? "Unknown")}</span>
                      <span className="font-medium text-slate-900">{formatNumber(m.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
