"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function BrandLoginClient() {
"use client";

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
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Brand Login</h1>

      <form onSubmit={onLogin} className="mt-4 space-y-3">
        <input
          type="email"
          className="w-full rounded-lg border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full rounded-lg border p-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={busy || !email || !password}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        {err && <div className="text-sm text-red-600">{err}</div>}
      </form>
    </div>
  );
}
