"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BadgePercent, Bell, Bot, Boxes, CreditCard, Crown, FileText, Flag, Gauge, HardDrive, HelpCircle, Image as ImageIcon, Layers,
  LifeBuoy, LogOut, Megaphone, Menu, Mic, Navigation, Package, Palette, Plug, Receipt, ScrollText, Shield, Sparkles, Users, Wallet, Wrench, X,
} from "lucide-react";
import { ApiError, api, getSession, signOut } from "@/lib/api";
import { Button, Spinner, cx } from "./ui";

export type AdminUser = { id: string; email: string; name?: string | null; role: "ADMIN" | "SUPER_ADMIN" };

const AdminContext = createContext<AdminUser | null>(null);
export const useAdmin = () => useContext(AdminContext);

type NavItem = { href: string; label: string; icon: typeof Users };
type NavGroup = { group: string; items: NavItem[]; superOnly?: boolean };
const NAV: NavGroup[] = [
  { group: "Overview", items: [{ href: "/", label: "Dashboard", icon: Gauge }] },
  {
    group: "Users",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/support", label: "Support tickets", icon: LifeBuoy },
    ],
  },
  {
    group: "Generation",
    items: [
      { href: "/generations", label: "Generations", icon: ImageIcon },
      { href: "/jobs", label: "Jobs & queues", icon: Activity },
    ],
  },
  {
    group: "AI",
    items: [
      { href: "/manage/ai-providers", label: "Providers", icon: Plug },
      { href: "/manage/ai-models", label: "Models", icon: Bot },
      { href: "/manage/ai-endpoints", label: "Endpoints", icon: Layers },
      { href: "/manage/tool-registry", label: "Tool registry", icon: Wrench },
      { href: "/manage/ai-apps", label: "AI apps", icon: Sparkles },
      { href: "/manage/styles", label: "Styles", icon: Palette },
      { href: "/manage/voices", label: "Voices", icon: Mic },
    ],
  },
  {
    group: "Billing",
    items: [
      { href: "/manage/plans", label: "Plans", icon: Boxes },
      { href: "/manage/coupons", label: "Coupons", icon: BadgePercent },
      { href: "/manage/credit-transactions", label: "Credit ledger", icon: Wallet },
    ],
  },
  {
    // Every route here is SUPER_ADMIN-only on the backend, reads included.
    group: "Super admin",
    superOnly: true,
    items: [
      { href: "/admins", label: "Admins & roles", icon: Crown },
      { href: "/manage/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/manage/payments", label: "Payments", icon: Receipt },
      { href: "/manage/topup-packages", label: "Top-up packs", icon: Package },
      { href: "/manage/topup-orders", label: "Top-up orders", icon: Receipt },
      { href: "/manage/guest-credits", label: "Guest credits", icon: Wallet },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/manage/blogs", label: "Blogs", icon: FileText },
      { href: "/manage/announcements", label: "Announcements", icon: Megaphone },
      { href: "/manage/banners", label: "Banners", icon: Bell },
      { href: "/manage/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/manage/homepage-items", label: "Homepage items", icon: Layers },
      { href: "/manage/showcase", label: "Showcase", icon: ImageIcon },
      { href: "/manage/navigation", label: "Navigation", icon: Navigation },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/feature-flags", label: "Feature flags", icon: Flag },
      { href: "/manage/audit-logs", label: "Audit logs", icon: ScrollText },
      { href: "/system", label: "Cache & health", icon: HardDrive },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await getSession();
        if (!user) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        // The users row is the source of truth for role (and the call itself
        // 403s for a non-admin session).
        const row = await api<{ role: string; name?: string | null }>(`/admin-panel/users/${user.id}`);
        setAdmin({ id: user.id, email: user.email, name: row.name ?? user.name, role: row.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN" });
        setState("ready");
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) setState("forbidden");
        else { setError(e instanceof Error ? e.message : String(e)); setState("error"); }
      }
    })();
  }, []);

  const logout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center"><Spinner label="Checking session…" /></div>;
  if (state !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <Shield className="mx-auto size-10 text-slate-300" />
          <h1 className="text-lg font-semibold">{state === "forbidden" ? "Admin access required" : "Could not load the panel"}</h1>
          <p className="text-sm text-slate-500">{state === "forbidden" ? "You are signed in, but this account is not an ADMIN or SUPER_ADMIN." : error}</p>
          <Button onClick={logout}>Sign in with another account</Button>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={admin}>
      <div className="flex min-h-screen">
        <aside className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-950 text-slate-300 transition-transform lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <span className="flex size-7 items-center justify-center rounded-md bg-indigo-600"><Shield className="size-4" /></span>
              Admin
            </Link>
            <button className="lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2">
            {NAV.filter((g) => !g.superOnly || admin?.role === "SUPER_ADMIN").map((g) => (
              <div key={g.group}>
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</div>
                {g.items.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={() => setNavOpen(false)} className={cx(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                    isActive(pathname, href) ? "bg-slate-800 text-white" : "hover:bg-slate-900 hover:text-white",
                  )}>
                    <Icon className="size-4 shrink-0" />{label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="border-t border-slate-800 p-3">
            <div className="truncate px-1 text-sm text-white">{admin?.name || admin?.email}</div>
            <div className="mb-2 px-1 text-xs text-slate-500">{admin?.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}</div>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-900 hover:text-white">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>
        {navOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setNavOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
            <button onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
