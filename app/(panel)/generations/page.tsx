"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResourcePage, type Row } from "@/components/resource-page";
import { FormatValue, Spinner } from "@/components/ui";

const STATUSES = ["PENDING", "PROCESSING", "PROVIDER_SUBMITTED", "COMPLETED", "FAILED", "CANCELLED"];

function Generations() {
  const userId = useSearchParams().get("userId") ?? undefined;
  return (
    <ResourcePage
      title="Generations"
      description={userId ? "Filtered to one user." : "Every generation request across the platform."}
      endpoint="/admin-panel/generations"
      baseQuery={{ userId }}
      filters={[
        { key: "search", label: "Search prompts", type: "search" },
        { key: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) },
      ]}
      columns={[
        { key: "prompt", render: (r) => <span className="line-clamp-2 max-w-md">{String(r.prompt ?? "—")}</span> },
        { key: "status" },
        { key: "model", render: (r) => <FormatValue value={(r.model as Row | undefined)?.name ?? r.modelId} /> },
        { key: "user", render: (r) => r.userId ? <Link className="text-indigo-600 hover:underline" href={`/users/${r.userId}`} onClick={(e) => e.stopPropagation()}>{String((r.user as Row | undefined)?.email ?? "View")}</Link> : <span className="text-slate-400">Guest</span> },
        { key: "creditCost", label: "Credits" },
        { key: "createdAt" },
      ]}
    />
  );
}

export default function GenerationsPage() {
  return <Suspense fallback={<Spinner />}><Generations /></Suspense>;
}
