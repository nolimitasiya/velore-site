"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sp = useSearchParams();
  const next = sp.get("next") || "/admin/import";

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
      try {
        json = JSON.parse(text);
      } catch {}

      if (!r.ok) {
        setErr(json?.error ?? "Login failed");
        return;
      }

      window.location.assign(next);
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Admin Login</h1>

      <form onSubmit={onLogin} className="mt-4 space-y-3">
        <input
          type="email"
          className="w-full rounded-lg border p-2"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          type="password"
          className="w-full rounded-lg border p-2"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-sm text-center">
          <a
            href="/admin/forgot"
            className="underline text-black/80 hover:text-black"
          >
            Forgot password?
          </a>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
      </form>
    </div>
  );
}
