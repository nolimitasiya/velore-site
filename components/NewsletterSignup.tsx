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
        <div className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white">
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
              className="flex-1 rounded-xl border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-white/60 outline-none focus:border-white"
            />
            <button
              onClick={submit}
              disabled={loading || !email}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {loading ? "..." : "Join"}
            </button>
          </div>

          {error && <div className="mt-2 text-xs text-red-300">{error}</div>}

          <p className="mt-2 text-xs text-white/60">
            No spam. Unsubscribe anytime.
          </p>
        </>
      )}
    </div>
  );
}
