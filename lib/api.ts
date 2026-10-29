// Client for the backend's admin API. Requests go to this host's /api/v1/*,
// which next.config.ts proxies to the backend. Auth is the Better Auth session
// cookie, so there is no token handling here — `credentials: "same-origin"` is
// all the backend's `authenticateAdmin` needs.

export const API_BASE = "/api/v1";
export const AUTH_BASE = `${API_BASE}/better-auth`;

export type Meta = { total: number; page: number; limit: number; totalPages: number };
export type Query = Record<string, string | number | boolean | undefined | null>;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; query?: Query };

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `${path.startsWith("/api/") ? path : API_BASE + path}${qs ? `?${qs}` : ""}`;
}

function errorMessage(json: Record<string, unknown>, status: number) {
  const errs = json.errors;
  const detail = Array.isArray(errs)
    ? errs.map((e: { message?: string }) => e?.message).filter(Boolean).join("; ")
    : errs && typeof errs === "object"
      ? Object.values(errs as Record<string, unknown>).flat().filter((m): m is string => typeof m === "string").join("; ")
      : "";
  return detail || (typeof json.message === "string" && json.message) || `Request failed (${status})`;
}

/** Full envelope: `{ data, meta }` for paginated endpoints. */
export async function apiRaw<T>(path: string, opts: Options = {}): Promise<{ data: T; meta?: Meta; message?: string }> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      credentials: "same-origin",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }

  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(errorMessage(json, res.status), res.status, typeof json.code === "string" ? json.code : undefined);
  }
  return { data: json.data as T, meta: json.meta as Meta | undefined, message: json.message as string | undefined };
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  return (await apiRaw<T>(path, opts)).data;
}

// ─── Better Auth (raw responses, no envelope) ────────────────────────────────

export type SessionUser = { id: string; email: string; name?: string | null; image?: string | null };

async function authFetch(path: string, body?: unknown) {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    credentials: "same-origin",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => { throw new ApiError("Cannot reach the server. Is the backend running?", 0); });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = (json && typeof json.message === "string" && json.message) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, json && typeof json.code === "string" ? json.code : undefined);
  }
  return json;
}

export async function signIn(email: string, password: string) {
  await authFetch("/sign-in/email", { email, password, rememberMe: true });
}

export async function signOut() {
  await authFetch("/sign-out", {}).catch(() => undefined);
}

export async function getSession(): Promise<SessionUser | null> {
  const json = (await authFetch("/get-session")) as { user?: SessionUser } | null;
  return json?.user ?? null;
}

// ─── Helpers for loosely shaped list responses ───────────────────────────────

/** Admin list endpoints return a bare array, `{ items }`, `{ data }` or `{ <name>: [] }`. */
export function toRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "data", "rows", "results"]) if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    const firstArray = Object.values(obj).find(Array.isArray);
    if (firstArray) return firstArray as Record<string, unknown>[];
  }
  return [];
}

/** Single-record endpoints sometimes wrap the record (`{ ticket }`, `{ user }`). */
export function unwrap<T = Record<string, unknown>>(data: unknown, key?: string): T {
  if (data && typeof data === "object" && key && key in (data as object)) return (data as Record<string, T>)[key];
  return data as T;
}
