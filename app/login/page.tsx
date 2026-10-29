"use client";

import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { api, ApiError, signIn, signOut } from "@/lib/api";
import { Button, ErrorBox, Field, Input } from "@/components/ui";

function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  // Only same-site paths; never follow "//evil.com" or absolute URLs.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // A valid session is not enough: the account must be ADMIN/SUPER_ADMIN.
      try {
        await api("/admin-panel/feature-flags");
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          await signOut();
          throw new Error("This account does not have admin access.");
        }
        throw err;
      }
      window.location.href = safeNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600 text-white"><ShieldCheck className="size-5" /></div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Admin panel</h1>
            <p className="text-xs text-slate-500">Sign in with an admin account</p>
          </div>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorBox error={error} />}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>Sign in</Button>
      </form>
    </main>
  );
}
