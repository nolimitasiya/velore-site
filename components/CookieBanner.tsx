"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "dalra_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) setVisible(true);
  }, []);

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
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(95%,720px)] -translate-x-1/2 rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-black/70">
        Vélore uses essential cookies to ensure the website functions correctly. 
        You may accept or reject optional cookies.
      </p>

      <div className="mt-4 flex gap-3">
        <button
          onClick={accept}
          className="rounded-full bg-black px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
        >
          Accept
        </button>

        <button
          onClick={reject}
          className="rounded-full border px-4 py-2 text-sm text-black/70 transition-colors hover:text-black"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
