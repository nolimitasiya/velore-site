"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function AdminResetPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error || "Something went wrong"); return; }
    setDone(true);
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  return (
    <AuthShell
      title="Set a new password."
      subtitle="Choose a strong password for your admin account."
      variant="admin"
    >
      {done ? (
        <div className="rounded border border-[#d8c9b5] bg-[#faf8f4] px-6 py-5 text-center">
          <p className="text-sm text-[#6b5c4e]">
            Password updated successfully. Redirecting you to login…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              New password
            </label>
            <input
              type="password"
              required
              minLength={10}
              placeholder="Minimum 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            />
            <p className="mt-1 text-[11px] text-[#a89280]">Minimum 10 characters</p>
          </div>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password || password.length < 10}
            className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Updating..." : "Set new password →"}
          </button>
          <div className="text-center">
            <a href="/admin/login" className="text-xs text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E] transition-colors">
              Back to login
            </a>
          </div>
        </form>
      )}
    </AuthShell>
  );
}