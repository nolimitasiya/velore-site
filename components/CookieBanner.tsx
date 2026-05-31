"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "vc_cookie_consent";
const PREFS_HANDLED_KEY = "vc_prefs_modal_handled";
const NEWSLETTER_HANDLED_KEY = "vc_newsletter_modal_handled";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

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

    // Check real cookie first, fall back to localStorage for existing users
    const cookieVal = getCookie(COOKIE_KEY);
    if (cookieVal) return; // already consented via cookie

    const stored = localStorage.getItem(COOKIE_KEY);
    if (stored) {
      // Migrate existing localStorage consent to a real cookie
      setCookie(COOKIE_KEY, stored);
      return;
    }

    const t = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(t);
  }, [prefsHandled, newsletterHandled]);

  function accept() {
    setCookie(COOKIE_KEY, "accepted");
    localStorage.setItem(COOKIE_KEY, "accepted"); // keep in sync
    setVisible(false);
  }

  function reject() {
    setCookie(COOKIE_KEY, "rejected");
    localStorage.setItem(COOKIE_KEY, "rejected"); // keep in sync
    setVisible(false);
  }

  if (!visible) return null;



  return (
  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-[60] sm:w-[min(94%,420px)]">
    <div className="rounded-[24px] border border-[#e8ddd4] bg-[#fdf7f4] px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#7B2D3E]/8 text-lg">
          🍪
        </div>
        <div>
          <div className="font-heading text-[15px] text-[#1a0a0e]">Your privacy</div>
          <p className="mt-1 text-xs leading-relaxed text-[#6b5c4e]">
            We use cookies to keep things running and understand what you love. Accept to help us improve your experience.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={reject}
          className="rounded-full border border-black/12 bg-white px-4 py-2 text-xs font-medium text-black/60 transition hover:bg-black/[0.03] hover:text-black"
        >
          Reject optional
        </button>
        <button
          onClick={accept}
          className="rounded-full bg-[#7B2D3E] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
        >
          Accept cookies
        </button>
      </div>
    </div>
  </div>
  );
}