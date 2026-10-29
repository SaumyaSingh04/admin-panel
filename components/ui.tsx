"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ─── Buttons & inputs ────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-400",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-400",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

const fieldCls = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, "h-9 py-0", props.className)} />;
}
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldCls, "h-9 py-0", props.className)}>{children}</select>;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, props.className)} />;
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

// ─── Display ─────────────────────────────────────────────────────────────────

type Tone = "gray" | "green" | "red" | "amber" | "blue" | "indigo";
const TONES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-slate-500/10", TONES[tone])}>{children}</span>;
}

const STATUS_TONES: Record<string, Tone> = {
  completed: "green", success: "green", succeeded: "green", active: "green", paid: "green", published: "green", resolved: "green", closed: "gray", healthy: "green",
  failed: "red", error: "red", cancelled: "red", canceled: "red", banned: "red", refunded: "amber", expired: "amber", inactive: "gray",
  pending: "amber", queued: "amber", processing: "blue", running: "blue", open: "blue", in_progress: "blue", draft: "gray", trialing: "indigo",
};
export function StatusBadge({ value }: { value: unknown }) {
  const s = String(value ?? "—");
  return <Badge tone={STATUS_TONES[s.toLowerCase()] ?? "gray"}>{s}</Badge>;
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />{label}</div>;
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{msg}</div>
      {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Empty({ children = "Nothing here yet." }: { children?: ReactNode }) {
  return <div className="py-10 text-center text-sm text-slate-400">{children}</div>;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx("w-full rounded-lg bg-white shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X className="size-4" /></button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

// ─── Toasts & confirm ────────────────────────────────────────────────────────

type Toast = { id: number; kind: "success" | "error"; text: string };
type Ctx = { notify: (text: string, kind?: Toast["kind"]) => void; confirm: (text: string) => Promise<boolean> };
const UiContext = createContext<Ctx>({ notify: () => undefined, confirm: async () => false });
export const useUi = () => useContext(UiContext);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);

  const notify = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => setPending({ text, resolve })), []);
  const settle = (v: boolean) => { pending?.resolve(v); setPending(null); };

  return (
    <UiContext.Provider value={{ notify, confirm }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={cx("flex max-w-sm items-start gap-2 rounded-md px-4 py-3 text-sm shadow-lg", t.kind === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white")}>
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
      <Modal open={!!pending} title="Please confirm" onClose={() => settle(false)}
        footer={<><Button onClick={() => settle(false)}>Cancel</Button><Button variant="danger" onClick={() => settle(true)}>Confirm</Button></>}>
        <p className="text-sm text-slate-600">{pending?.text}</p>
      </Modal>
    </UiContext.Provider>
  );
}

// ─── Value formatting ────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function formatDate(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

export function FormatValue({ value, field }: { value: unknown; field?: string }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-300">—</span>;
  if (typeof value === "boolean") return <Badge tone={value ? "green" : "gray"}>{value ? "Yes" : "No"}</Badge>;
  if (typeof value === "number") return <>{value.toLocaleString()}</>;
  if (typeof value === "string") {
    if (field && /status|state/i.test(field)) return <StatusBadge value={value} />;
    if (ISO_DATE.test(value)) return <span className="whitespace-nowrap">{formatDate(value)}</span>;
    if (/^https?:\/\/\S+\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(value)) return <img src={value} alt="" className="size-8 rounded object-cover" />;
    return <span title={value.length > 60 ? value : undefined}>{value.length > 60 ? `${value.slice(0, 60)}…` : value}</span>;
  }
  if (Array.isArray(value)) return <span className="text-slate-500">{value.length} item{value.length === 1 ? "" : "s"}</span>;
  const obj = value as Record<string, unknown>;
  const label = obj.email ?? obj.name ?? obj.displayName ?? obj.title ?? obj.slug ?? obj.key;
  if (label !== undefined) return <>{String(label)}</>;
  const s = JSON.stringify(value);
  return <code className="text-xs text-slate-500">{s.length > 50 ? `${s.slice(0, 50)}…` : s}</code>;
}

export function JsonView({ value }: { value: unknown }) {
  return <pre className="max-h-[60vh] overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">{JSON.stringify(value, null, 2)}</pre>;
}
