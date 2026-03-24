// C:\Users\Asiya\projects\dalra\components\CookieBanner.tsx
"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "dalra_cookie_consent";
const PREFS_HANDLED_KEY = "vc_prefs_modal_handled";
const NEWSLETTER_HANDLED_KEY = "vc_newsletter_modal_handled";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsHandled, setPrefsHandled] = useState(false);
  const [newsletterHandled, setNewsletterHandled] = useState(false);

  useEffect(() => {
    try {
      setPrefsHandled(localStorage.getItem(PREFS_HANDLED_KEY) === "1");
      setNewsletterHandled(localStorage.getItem(NEWSLETTER_HANDLED_KEY) === "1");
    } catch {
      setPrefsHandled(false);
      setNewsletterHandled(false);
    }

    const onPrefsClosed = () => setPrefsHandled(true);
    const onNewsletterClosed = () => setNewsletterHandled(true);

    window.addEventListener("vc_preferences_modal_closed", onPrefsClosed);
    window.addEventListener("vc_newsletter_modal_closed", onNewsletterClosed);

    return () => {
      window.removeEventListener("vc_preferences_modal_closed", onPrefsClosed);
      window.removeEventListener("vc_newsletter_modal_closed", onNewsletterClosed);
    };
  }, []);

  useEffect(() => {
    if (!prefsHandled || !newsletterHandled) return;

    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      const t = window.setTimeout(() => setVisible(true), 900);
      return () => window.clearTimeout(t);
    }
  }, [prefsHandled, newsletterHandled]);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(94%,760px)] -translate-x-1/2">
      <div className="rounded-[28px] border border-black/10 bg-white/95 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.10)] backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[560px]">
            <div className="font-heading text-lg tracking-[0.04em] text-black">
              Your privacy
            </div>

            <p className="mt-2 text-sm leading-6 text-black/65">
              Veilora Club uses essential cookies to keep the website working
              smoothly. You can also choose whether to allow optional cookies to
              help us improve the experience.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              onClick={reject}
              className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/[0.03] hover:text-black"
            >
              Reject optional
            </button>

            <button
              onClick={accept}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Accept cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}