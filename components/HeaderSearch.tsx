"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";


export default function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  function onDocMouseDown(e: MouseEvent) {
    if (!brandRef.current) return;
    if (!brandRef.current.contains(e.target as Node)) {
      setBrandOpen(false);
    }
  }
  document.addEventListener("mousedown", onDocMouseDown);
  return () => document.removeEventListener("mousedown", onDocMouseDown);
}, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setQ("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative">
        {/* icon */}
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
          className="w-64 rounded-full border border-white/15 bg-white/10 pl-9 pr-4 py-2 text-sm
                     text-white placeholder:text-white/50 outline-none
                     focus:border-white/25 focus:ring-2 focus:ring-[var(--accent)]/35"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-white
                   transition-opacity hover:opacity-90"
      >
        Search
      </button>

      {/* Brand portal dropdown */}
      <div ref={brandRef} className="relative">
  <button
    type="button"
    onClick={() => setBrandOpen((v) => !v)}
    className="rounded-full bg-[#6B1F2B] px-4 py-2 text-sm text-white
               transition-opacity hover:opacity-90"
    aria-controls="brand-portal-menu"
  >
    Brand Portal
  </button>

  {brandOpen && (
    <div
      id="brand-portal-menu"
      className="absolute right-0 z-50 mt-2 w-44 rounded-xl bg-black shadow-lg overflow-hidden"
    >
      <Link
        href="/brand/login"
        className="block px-4 py-3 text-sm text-white hover:bg-white/10"
        onClick={() => setBrandOpen(false)}
      >
        Login
      </Link>

      <Link
        href="/brands/apply"
        className="block px-4 py-3 text-sm text-white hover:bg-white/10"
        onClick={() => setBrandOpen(false)}
      >
        Apply / Join
      </Link>
    </div>
  )}
</div>

    </form>
  );
}
