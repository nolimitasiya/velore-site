// C:\Users\Asiya\projects\dalra\app\admin\(auth)\login\AdminLoginClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sp = useSearchParams();
  const next = sp.get("next") || "/admin/personal/calendar";

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const text = await r.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch {}
      if (!r.ok) { setErr(json?.error ?? "Login failed"); return; }
      window.location.assign(next);
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to manage Veilora Club."
      variant="admin"
    >
      <form onSubmit={onLogin} className="space-y-5">
        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Email address
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="name@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Password
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in →"}
        </button>

       <div className="flex items-center justify-between text-xs">
                 <a
                   href="/admin/forgot"
                   className="text-[#7B2D3E] underline underline-offset-4 hover:opacity-70 transition-opacity"
                 >
                   Forgot your password?
                 </a>
               </div>
       
               {err && (
                 <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                   {err}
                 </div>
               )}
             </form>
           </AuthShell>
         );
       }
       