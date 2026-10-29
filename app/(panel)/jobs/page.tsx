"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { useAdmin } from "@/components/admin-shell";
import { ObjectSummary } from "@/components/object-summary";
import { ResourcePage } from "@/components/resource-page";
import { Button, Card, ErrorBox, Spinner } from "@/components/ui";

const STATUSES = ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];

function LivePanel({ title, path }: { title: string; path: string }) {
  const fetcher = useCallback(() => api(path), [path]);
  const { data, error, reload: load } = useLoader(fetcher);
  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);
  return (
    <Card title={title} actions={<Button size="sm" onClick={load}>Refresh</Button>}>
      {error ? <ErrorBox error={error} /> : data === undefined ? <Spinner /> : <ObjectSummary value={data} />}
    </Card>
  );
}

export default function JobsPage() {
  const isSuper = useAdmin()?.role === "SUPER_ADMIN";
  return (
    <>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <LivePanel title="Queue stats" path="/admin-panel/queue/stats" />
        <LivePanel title="Workers" path="/admin-panel/workers/status" />
      </div>
      <ResourcePage
        title="Generation jobs"
        description="Jobs written by the unified dispatcher. Cancelling requires SUPER_ADMIN."
        endpoint="/admin-panel/jobs"
        filters={[
          { key: "search", label: "Search jobs", type: "search" },
          { key: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) },
        ]}
        columns={[
          { key: "type" },
          { key: "status" },
          { key: "prompt", render: (r) => <span className="line-clamp-1 max-w-sm" title={String(r.errorMessage ?? r.prompt ?? "")}>{String(r.prompt ?? "—")}</span> },
          { key: "creditCost", label: "Credits" },
          { key: "userId", label: "User", render: (r) => r.userId ? <Link className="text-indigo-600 hover:underline" href={`/users/${r.userId}`} onClick={(e) => e.stopPropagation()}>View</Link> : <span className="text-slate-400">Guest</span> },
          { key: "createdAt" },
        ]}
        actions={isSuper ? [{
          label: "Cancel",
          variant: "danger",
          show: (r) => r.status === "QUEUED" || r.status === "PROCESSING",
          confirm: () => "Cancel this job?",
          run: (r) => api(`/admin-panel/jobs/${r.id}/cancel`, { method: "POST", body: {} }),
        }] : undefined}
      />
    </>
  );
}
