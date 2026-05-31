"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setQ("");
  }

  return (
    <div className="flex items-center gap-3">

      {/* Search form */}
      <form onSubmit={submit} className="flex items-center">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M16.3 16.3 21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-56 rounded-full border border-white/15 bg-white/10 pl-9 pr-4 py-2 text-sm
                       text-white placeholder:text-white/50 outline-none
                       focus:border-white/25 focus:ring-2 focus:ring-white/20"
          />
        </div>
      </form>

      {/* Divider */}
      <div className="h-5 w-px bg-white/20" />

      {/* Wishlist icon */}
      <Link
        href="/account/wishlist"
        aria-label="Wishlist"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </Link>

      {/* Account icon */}
      <Link
        href="/account"
        aria-label="My account"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
        </svg>
      </Link>

      

    </div>
  );
}
