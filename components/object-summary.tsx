"use client";

import { FormatValue, JsonView } from "./ui";

const humanize = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Renders an arbitrary stats object: scalars as a key/value grid, nested values as JSON. */
export function ObjectSummary({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-sm text-slate-400">No data.</span>;
  if (typeof value !== "object" || Array.isArray(value)) return <JsonView value={value} />;
  const entries = Object.entries(value as Record<string, unknown>);
  const scalars = entries.filter(([, v]) => v === null || typeof v !== "object");
  const nested = entries.filter(([, v]) => v !== null && typeof v === "object");
  return (
    <div className="space-y-4">
      {!!scalars.length && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {scalars.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{humanize(k)}</dt>
              <dd className="text-sm font-medium text-slate-900"><FormatValue value={v} field={k} /></dd>
            </div>
          ))}
        </dl>
      )}
      {nested.map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 text-xs font-medium text-slate-500">{humanize(k)}</div>
          <JsonView value={v} />
        </div>
      ))}
    </div>
  );
}
