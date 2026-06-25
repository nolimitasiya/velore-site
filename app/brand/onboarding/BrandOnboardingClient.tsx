"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function BrandOnboardingClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = sp.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setLoadingInvite(false);
        return;
      }

      try {
        const r = await fetch(`/api/brand/onboarding?token=${token}`);
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          setErr(j?.error ?? "Invalid or expired invite link");
          return;
        }

        setEmail(j.email ?? "");
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load invite");
      } finally {
        setLoadingInvite(false);
      }
    }

    loadInvite();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/brand/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email, password }),
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
      <AuthShell
        title="Invalid link."
        subtitle="This onboarding link is missing a token. Please request a new invite."
        variant="brand"
      >
        <a
          href="/brand/login"
          className="block w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-center text-sm tracking-wide text-white transition hover:bg-[#6a2535]"
        >
          Back to sign in →
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome to Veilora Club."
      subtitle="Set your password to activate your brand portal."
      variant="brand"
    >
      {loadingInvite ? (
        <p className="text-sm text-[#6b5c4e]">Loading invite...</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Email address
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="name@brand.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-[#a89280]">
              This has been prefilled from your invite. You can change it if needed.
            </p>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Create a password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1.5 text-xs text-[#a89280]">
              Use at least 8 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Setting up..." : "Create account →"}
          </button>

          <div className="text-center text-xs text-[#6b5c4e]">
            Already have an account?{" "}
            <a
              href="/brand/login"
              className="text-[#7B2D3E] underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Sign in
            </a>
          </div>

          {err && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
        </form>
      )}
    </AuthShell>
  );
}