"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer", tags: ["site"] }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setDone(true);
    } catch {
      setError("Couldn’t subscribe. Try again.");
    } finally {
      setLoading(false);
    }
  }

return (
  <div className="w-full">
    {done ? (
      <div className="rounded-xl border border-[#7B2D3E]/15 bg-[#7B2D3E]/5 px-4 py-3 font-body text-sm text-[#7B2D3E]">
        Check your inbox to confirm 💌
      </div>
    ) : (
      <>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            inputMode="email"
            className="
              min-w-0 flex-1 rounded-xl
              border border-black/15 bg-white
              px-4 py-3
              font-body text-sm text-black
              placeholder:text-black/35
              caret-[#7B2D3E]
              outline-none transition
              hover:border-black/25
              focus:border-[#7B2D3E]/45
              focus:ring-2 focus:ring-[#7B2D3E]/10
            "
          />

          <button
            type="button"
            onClick={submit}
            disabled={loading || !email}
            className="
              rounded-xl bg-[#7B2D3E]
              px-5 py-3
              font-body text-sm font-medium text-white
              transition
              hover:bg-[#692536]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? "..." : "Join"}
          </button>
        </div>

        {error && (
          <div className="mt-2 font-body text-xs text-red-700">
            {error}
          </div>
        )}

        <p className="mt-3 font-body text-xs text-black/50">
          No spam. Unsubscribe anytime.
        </p>
      </>
    )}
  </div>
);
}
