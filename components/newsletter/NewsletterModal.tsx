// C:\Users\Asiya\projects\dalra\components\newsletter\NewsletterModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const LS_KEY = "velore_newsletter_dismissed_v1";
const PREFS_HANDLED_KEY = "vc_prefs_modal_handled";

export function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefsHandled, setPrefsHandled] = useState(false);

  const NEWSLETTER_HANDLED_KEY = "vc_newsletter_modal_handled";

  const dismissed = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(LS_KEY) === "1";
  }, []);

  useEffect(() => {
    try {
      setPrefsHandled(window.localStorage.getItem(PREFS_HANDLED_KEY) === "1");
    } catch {
      setPrefsHandled(false);
    }

    const onPrefsClosed = () => setPrefsHandled(true);
    window.addEventListener("vc_preferences_modal_closed", onPrefsClosed);

    return () => {
      window.removeEventListener("vc_preferences_modal_closed", onPrefsClosed);
    };
  }, []);

  useEffect(() => {
    if (dismissed || !prefsHandled) return;

    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, [dismissed, prefsHandled]);

  function close() {
  setOpen(false);
  try {
    window.localStorage.setItem(LS_KEY, "1");
    window.localStorage.setItem(NEWSLETTER_HANDLED_KEY, "1");
  } catch {}

  window.dispatchEvent(new CustomEvent("vc_newsletter_modal_closed"));
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
  <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center pb-4 sm:pb-0">
    <button
      aria-label="Close newsletter modal"
      onClick={close}
      className="absolute inset-0 bg-black/40"
    />

    <div className="relative w-[92vw] max-w-md rounded-[24px] border border-[#e8ddd4] bg-[#fdf7f4] shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
      <div className="h-1 w-full bg-[#7B2D3E]" />
      <div className="p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60 mb-1">The edit</div>

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
            You're subscribed 💌
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                inputMode="email"
                className="w-full rounded-[14px] border border-[#e8ddd4] bg-white px-3 py-2 outline-none focus:border-[#7B2D3E]/40"
              />
              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}
            </div>

            <button
              onClick={submit}
              disabled={loading || email.trim().length === 0}
              className="mt-4 w-full rounded-[14px] bg-[#7B2D3E] px-4 py-2 text-white disabled:opacity-60"
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
  </div>
);
}