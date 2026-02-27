"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function BrandLoginClient() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/brand";

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/brand/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // ✅
        body: JSON.stringify({ email, password }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? `Login failed (${r.status})`);
        return;
      }

      window.location.assign(next);
    } finally {
      setBusy(false);
    }
  }

  return (
  <AuthShell title="Sign in" variant="brand">
    <form onSubmit={onLogin} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm text-black/70">Email</label>
        <input
          type="email"
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-black"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-black/70">Password</label>
        <input
          type="password"
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-black"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={busy || !email || !password}
        className="w-full rounded-md bg-black text-white py-3 text-sm disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>

      <div className="text-sm">
        <a href="/brand/forgot" className="underline text-black/70 hover:text-black">
          Forgot your password?
        </a>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
    </form>
  </AuthShell>
);
}
