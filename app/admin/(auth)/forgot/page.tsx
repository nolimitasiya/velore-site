"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function AdminForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password."
      subtitle="Enter your email and we'll send you a reset link."
      variant="admin"
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Email address
            </label>
            <input
              type="email"
              required
              placeholder="admin@veiloraclub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link →"}
          </button>
          <div className="text-center">
            <a href="/admin/login" className="text-xs text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E] transition-colors">
              Back to login
            </a>
          </div>
        </form>
      ) : (
        <div className="space-y-6 text-center">
          <div className="rounded border border-[#d8c9b5] bg-[#faf8f4] px-6 py-5">
            <p className="text-sm text-[#6b5c4e] leading-relaxed">
              If that email is registered, a reset link has been sent. Check your inbox.
            </p>
          </div>
          <button type="button" onClick={() => router.push("/admin/login")}
            className="text-xs text-[#7B2D3E] underline underline-offset-4 hover:opacity-70 transition-opacity">
            Back to login
          </button>
        </div>
      )}
    </AuthShell>
  );
}