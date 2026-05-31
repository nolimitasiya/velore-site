"use client";

import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function RegisterClient() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/account/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? `Registration failed (${r.status})`);
        return;
      }
      window.location.assign("/account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Join Veilora Club to save favourites and track your style."
      variant="shopper"
    >
      <form onSubmit={onRegister} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              First name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="Doha"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Last name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="Nuur"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Email address
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Password
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={busy || !email || !password}
          className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create account →"}
        </button>

        <div className="text-center text-xs">
          <a
            href="/account/login"
            className="text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E]"
          >
            Already have an account? Sign in
          </a>
        </div>

        {err && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-[#a89280]">
          By creating an account you agree to our{" "}
          <a href="/terms" className="underline underline-offset-4 hover:text-[#7B2D3E]">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="underline underline-offset-4 hover:text-[#7B2D3E]">
            privacy policy
          </a>.
        </p>
      </form>
    </AuthShell>
  );
}
