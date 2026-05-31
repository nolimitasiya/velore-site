"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

function ResetForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/account/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/account/login"), 2500);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link." variant="shopper">
        <div className="text-center space-y-4">
          <p className="text-sm text-[#6b5c4e]">
            This reset link is missing or invalid.
          </p>
          <a
            href="/account/forgot"
            className="inline-block text-xs text-[#7B2D3E] underline underline-offset-4 hover:opacity-70"
          >
            Request a new reset link
          </a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password."
      subtitle="Choose a strong password for your Veilora Club account."
      variant="shopper"
    >
      {!done ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Confirm password
            </label>
            <input
              type="password"
              required
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save new password →"}
          </button>

          {err && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border border-[#e8ddd4] bg-[#faf8f4] px-6 py-6">
            <div className="text-3xl mb-3">✦</div>
            <p className="text-sm text-[#6b5c4e] leading-relaxed">
              Password updated! Redirecting you to login...
            </p>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default function ShopperResetPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6" />}>
      <ResetForm />
    </Suspense>
  );
}
