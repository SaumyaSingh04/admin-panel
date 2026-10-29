"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { apiRaw, toRows, type Meta, type Query } from "@/lib/api";
import { useLoader } from "@/lib/use-loader";
import { useAdmin } from "./admin-shell";
import { Button, Card, Empty, ErrorBox, FormatValue, Input, JsonView, Modal, PageHeader, Select, Spinner, Textarea, cx, useUi } from "./ui";

export type Row = Record<string, unknown>;

export type Column = { key: string; label?: string; render?: (row: Row) => ReactNode; className?: string };
export type Filter = { key: string; label: string; type: "search" | "select"; options?: { value: string; label: string }[] };
export type RowAction = {
  label: string;
  run: (row: Row) => Promise<unknown>;
  confirm?: (row: Row) => string;
  show?: (row: Row) => boolean;
  variant?: "danger" | "secondary";
};

export type ResourceConfig = {
  title: string;
  description?: string;
  /** Path under /api/v1, e.g. "/admin-panel/coupons". */
  endpoint: string;
  columns?: Column[];
  filters?: Filter[];
  pageSize?: number;
  /** "page" (default) sends page/limit, "offset" sends offset/limit, false sends nothing. */
  pagination?: "page" | "offset" | false;
  baseQuery?: Query;
  rowKey?: string;
  detailHref?: (row: Row) => string;
  /** Overrides the default row click (JSON details dialog). */
  onRowClick?: (row: Row) => void;
  /** Enables "New" with a JSON body seeded from this template. */
  create?: { template: Row; endpoint?: string };
  /** Enables row editing with a JSON body. */
  edit?: { method?: "PATCH" | "PUT"; path?: (row: Row) => string; omit?: string[] };
  /** Enables row deletion. */
  remove?: { path?: (row: Row) => string };
  actions?: RowAction[];
  headerActions?: ReactNode;
  /** The whole section (including reads) is SUPER_ADMIN-only on the backend. */
  superOnly?: boolean;
  /** Create/edit/delete/actions are SUPER_ADMIN-only on the backend; ADMIN gets a read-only view. */
  superWrites?: boolean;
};

// Fields the backend owns; sending them back in an edit body trips strict validators.
const READONLY = new Set(["id", "createdAt", "updatedAt", "deletedAt", "_count", "createdBy", "updatedBy"]);

function editableBody(row: Row, omit: string[] = []) {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (READONLY.has(k) || omit.includes(k)) continue;
    // Drop included relations (objects/arrays of objects carrying their own id).
    if (v && typeof v === "object" && !Array.isArray(v) && "id" in (v as Row)) continue;
    if (Array.isArray(v) && v.some((x) => x && typeof x === "object" && "id" in x)) continue;
    out[k] = v;
  }
  return out;
}

function autoColumns(rows: Row[]): Column[] {
  const first = rows[0];
  if (!first) return [];
  const preferred = ["name", "title", "displayName", "key", "slug", "code", "email", "status", "isActive", "enabled", "isPublished", "type", "price", "amount", "createdAt"];
  const keys = Object.keys(first).filter((k) => {
    const v = first[k];
    return k !== "id" && (v === null || typeof v !== "object");
  });
  const ordered = [...preferred.filter((k) => keys.includes(k)), ...keys.filter((k) => !preferred.includes(k))];
  return ordered.slice(0, 7).map((key) => ({ key }));
}

const humanize = (k: string) => k.replace(/^is([A-Z])/, "$1").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

export function ResourcePage(props: ResourceConfig) {
  const isSuper = useAdmin()?.role === "SUPER_ADMIN";
  if (props.superOnly && !isSuper) {
    return (
      <>
        <PageHeader title={props.title} description={props.description} />
        <Card><Empty>Only a SUPER_ADMIN can open this section.</Empty></Card>
      </>
    );
  }
  // ADMIN sees a read-only view where the backend reserves writes for SUPER_ADMIN.
  const cfg = props.superWrites && !isSuper ? { ...props, create: undefined, edit: undefined, remove: undefined, actions: undefined } : props;
  return <ResourceTable {...cfg} />;
}

function ResourceTable(cfg: ResourceConfig) {
  const router = useRouter();
  const { notify, confirm } = useUi();
  const limit = cfg.pageSize ?? 20;
  const rowKey = cfg.rowKey ?? "id";

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchDraft, setSearchDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const [viewing, setViewing] = useState<Row | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; row?: Row; text: string } | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Keyed on the serialized value: callers pass baseQuery as an inline literal.
  const baseQueryKey = JSON.stringify(cfg.baseQuery ?? {});
  const query = useMemo(() => {
    const q: Query = { ...JSON.parse(baseQueryKey), ...filters };
    if (cfg.pagination === "offset") Object.assign(q, { offset: (page - 1) * limit, limit });
    else if (cfg.pagination !== false) Object.assign(q, { page, limit });
    return q;
  }, [baseQueryKey, cfg.pagination, filters, page, limit]);

  const fetchPage = useCallback(async () => {
    const res = await apiRaw<unknown>(cfg.endpoint, { query });
    return { rows: toRows(res.data), meta: res.meta as Meta | undefined };
  }, [cfg.endpoint, query]);
  const { data, error, loading, reload: load } = useLoader(fetchPage);
  const rows = data?.rows ?? [];
  const meta = data?.meta;

  const columns = cfg.columns ?? autoColumns(rows);
  const rowPath = (row: Row) => `${cfg.endpoint}/${row[rowKey]}`;

  const runAction = async (label: string, row: Row, fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !(await confirm(confirmText))) return;
    setBusy(`${label}:${String(row[rowKey])}`);
    try {
      await fn();
      notify(`${label} — done`);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!editor) return;
    let body: unknown;
    try { body = JSON.parse(editor.text); } catch { setEditorError("Body is not valid JSON."); return; }
    setSaving(true);
    setEditorError(null);
    try {
      if (editor.mode === "create") {
        await apiRaw(cfg.create?.endpoint ?? cfg.endpoint, { method: "POST", body });
      } else if (editor.row) {
        await apiRaw(cfg.edit?.path?.(editor.row) ?? rowPath(editor.row), { method: cfg.edit?.method ?? "PATCH", body });
      }
      notify(editor.mode === "create" ? "Created" : "Saved");
      setEditor(null);
      load();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const hasRowControls = !!(cfg.edit || cfg.remove || cfg.actions?.length);
  const totalPages = meta?.totalPages ?? (rows.length < limit ? page : page + 1);

  return (
    <>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        actions={
          <>
            {cfg.headerActions}
            <Button onClick={load} aria-label="Refresh"><RefreshCw className="size-4" /></Button>
            {cfg.create && (
              <Button variant="primary" onClick={() => { setEditorError(null); setEditor({ mode: "create", text: JSON.stringify(cfg.create!.template, null, 2) }); }}>
                <Plus className="size-4" /> New
              </Button>
            )}
          </>
        }
      />

      {!!cfg.filters?.length && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {cfg.filters.map((f) =>
            f.type === "search" ? (
              <form key={f.key} className="relative" onSubmit={(e) => { e.preventDefault(); setPage(1); setFilters((p) => ({ ...p, [f.key]: searchDraft[f.key] ?? "" })); }}>
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
                <Input className="w-72 pl-8" placeholder={f.label} value={searchDraft[f.key] ?? ""} onChange={(e) => setSearchDraft((p) => ({ ...p, [f.key]: e.target.value }))} />
              </form>
            ) : (
              <Select key={f.key} className="w-auto min-w-36" value={filters[f.key] ?? ""} onChange={(e) => { setPage(1); setFilters((p) => ({ ...p, [f.key]: e.target.value })); }}>
                <option value="">{f.label}: all</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ),
          )}
        </div>
      )}

      <Card className="overflow-hidden [&>div]:p-0">
        {error ? (
          <div className="p-4"><ErrorBox error={error} onRetry={load} /></div>
        ) : loading && !rows.length ? (
          <div className="px-4"><Spinner /></div>
        ) : !rows.length ? (
          <Empty />
        ) : (
          <div className={cx("overflow-x-auto", loading && "opacity-60")}>
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label ?? humanize(c.key)}</th>)}
                  {hasRowControls && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr key={String(row[rowKey] ?? i)} className="cursor-pointer hover:bg-slate-50" onClick={() => (cfg.onRowClick ? cfg.onRowClick(row) : cfg.detailHref ? router.push(cfg.detailHref(row)) : setViewing(row))}>
                    {columns.map((c) => <td key={c.key} className={cx("px-4 py-2.5 text-slate-700", c.className)}>{c.render ? c.render(row) : <FormatValue value={row[c.key]} field={c.key} />}</td>)}
                    {hasRowControls && (
                      <td className="whitespace-nowrap px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {cfg.actions?.filter((a) => !a.show || a.show(row)).map((a) => (
                            <Button key={a.label} size="sm" variant={a.variant ?? "secondary"} loading={busy === `${a.label}:${String(row[rowKey])}`}
                              onClick={() => runAction(a.label, row, () => a.run(row), a.confirm?.(row))}>{a.label}</Button>
                          ))}
                          {cfg.edit && (
                            <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => { setEditorError(null); setEditor({ mode: "edit", row, text: JSON.stringify(editableBody(row, cfg.edit!.omit), null, 2) }); }}>
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {cfg.remove && (
                            <Button size="sm" variant="ghost" aria-label="Delete" className="text-red-600 hover:bg-red-50" loading={busy === `Delete:${String(row[rowKey])}`}
                              onClick={() => runAction("Delete", row, () => apiRaw(cfg.remove!.path?.(row) ?? rowPath(row), { method: "DELETE" }), "Delete this record? This cannot be undone.")}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cfg.pagination !== false && (rows.length > 0 || page > 1) && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <span>{meta ? `${meta.total.toLocaleString()} total` : `${rows.length} shown`}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-3.5" /></Button>
              <span>Page {page}{meta ? ` of ${Math.max(1, totalPages)}` : ""}</span>
              <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-3.5" /></Button>
            </div>
          </footer>
        )}
      </Card>

      <Modal open={!!viewing} title="Record details" wide onClose={() => setViewing(null)}>
        {viewing && <JsonView value={viewing} />}
      </Modal>

      <Modal
        open={!!editor}
        wide
        title={editor?.mode === "create" ? `New — ${cfg.title}` : `Edit — ${cfg.title}`}
        onClose={() => setEditor(null)}
        footer={<><Button onClick={() => setEditor(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}
      >
        <p className="mb-2 text-xs text-slate-500">Request body (JSON). The backend validates it and reports any invalid field below.</p>
        <Textarea className="h-80 font-mono text-xs" spellCheck={false} value={editor?.text ?? ""} onChange={(e) => setEditor((ed) => ed && { ...ed, text: e.target.value })} />
        {editorError && <div className="mt-3"><ErrorBox error={editorError} /></div>}
      </Modal>
    </>
  );
}
