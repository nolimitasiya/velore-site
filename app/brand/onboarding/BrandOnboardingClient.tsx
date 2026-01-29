"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function BrandOnboardingClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = sp.get("token") || "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/brand/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? `Failed (${r.status})`);
        return;
      }

      router.push("/brand");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to complete onboarding");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-black/70">
          This onboarding link is missing a token. Please request a new invite.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Brand Onboarding</h1>
      <p className="mt-1 text-sm text-black/70">
        Set your password to access your brand portal.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          className="w-full rounded-lg border p-2"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="password"
          className="w-full rounded-lg border p-2"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={busy || !password}
          className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
        >
          {busy ? "Setting up..." : "Create account"}
        </button>

        {err && <div className="text-sm text-red-600">{err}</div>}
      </form>
    </div>
  );
}
