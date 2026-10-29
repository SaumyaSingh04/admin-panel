"use client";

import { ResourcePage, type Row } from "@/components/resource-page";
import { Badge, FormatValue } from "@/components/ui";
import { api } from "@/lib/api";

import { ROLES } from "@/lib/constants";

export default function UsersPage() {
  return (
    <ResourcePage
      title="Users"
      description="Search, inspect and moderate accounts."
      endpoint="/admin-panel/users"
      filters={[
        { key: "search", label: "Search email, name or handle", type: "search" },
        { key: "role", label: "Role", type: "select", options: ROLES.map((r) => ({ value: r, label: r })) },
        { key: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Banned" }] },
      ]}
      columns={[
        {
          key: "email",
          label: "User",
          render: (r) => (
            <div>
              <div className="font-medium text-slate-900">{String(r.name || r.email)}</div>
              {r.name ? <div className="text-xs text-slate-500">{String(r.email)}</div> : null}
            </div>
          ),
        },
        { key: "role", render: (r) => <Badge tone={r.role === "USER" ? "gray" : "indigo"}>{String(r.role)}</Badge> },
        { key: "plan", render: (r) => <FormatValue value={(r.plan as Row | null)?.name ?? r.plan ?? "Free"} /> },
        { key: "isActive", label: "Status", render: (r) => <Badge tone={r.isActive ? "green" : "red"}>{r.isActive ? "Active" : "Banned"}</Badge> },
        { key: "isEmailVerified", label: "Verified" },
        { key: "jobs", label: "Jobs", render: (r) => <>{String((r._count as Row | undefined)?.imageGenJobs ?? 0)}</> },
        { key: "createdAt", label: "Joined" },
      ]}
      detailHref={(r) => `/users/${r.id}`}
      actions={[
        { label: "Ban", variant: "danger", show: (r) => r.isActive === true, confirm: (r) => `Ban ${r.email}? They will be signed out of the app.`, run: (r) => api(`/admin-panel/users/${r.id}/ban`, { method: "POST", body: {} }) },
        { label: "Unban", show: (r) => r.isActive !== true, run: (r) => api(`/admin-panel/users/${r.id}/unban`, { method: "POST", body: {} }) },
      ]}
    />
  );
}
