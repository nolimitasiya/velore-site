"use client";

import { useEffect, useMemo, useState } from "react";

const LS_KEY = "velore_newsletter_dismissed_v1";

export function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dismissed = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(LS_KEY) === "1";
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const t = window.setTimeout(() => setOpen(true), 4500);
    return () => window.clearTimeout(t);
  }, [dismissed]);

  function close() {
    setOpen(false);
    try {
      window.localStorage.setItem(LS_KEY, "1");
    } catch {}
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "popup", tags: ["site"] }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setDone(true);
      window.setTimeout(close, 1200);
    } catch {
      setError("Couldn’t subscribe. Check the email and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        aria-label="Close newsletter modal"
        onClick={close}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-black">Join the edit</h3>
            <p className="mt-1 text-sm text-black/70">
              Early access to drops + modest styling picks.
            </p>
          </div>
          <button
            onClick={close}
            className="rounded-full px-3 py-1 text-sm text-black/70 hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-4 rounded-xl bg-black/5 p-3 text-sm">
            You’re subscribed 💌
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                inputMode="email"
                className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:border-black/30"
              />
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
            </div>

            <button
              onClick={submit}
              disabled={loading || email.trim().length === 0}
              className="mt-4 w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Joining..." : "Join newsletter"}
            </button>

            <p className="mt-3 text-xs text-black/60">
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
