"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";


const RECENTS_KEY = "dalra_recent_searches";
const MAX_RECENTS = 6;


type MobileSearchProps = {
  // Called right before navigating to the results page — lets a parent
  // that renders this inside its own overlay (MobileMenu's drawer) close
  // itself too. Unused by the standalone header instance.
  onNavigate?: () => void;
};

export default function MobileSearch({ onNavigate }: MobileSearchProps = {}) {
   
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Portaled to document.body (same reasoning as MobileMenu) so this
  // full-screen overlay always covers the true viewport rather than being
  // clipped/positioned relative to the header, which has a CSS transform
  // (StickyHeader's translate-y show/hide animation) and therefore becomes
  // the containing block for any `position: fixed` descendant. Portals
  // only work client-side, hence the mounted flag.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Belt-and-suspenders: close this overlay the moment the route actually
  // changes, regardless of which trigger (this component's own submit
  // handler, or a different component navigating away) caused it — so a
  // search never lingers open on top of the results it just navigated to.
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);


  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches when the panel opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      setRecentSearches(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentSearches([]);
    }
  }, [open]);

  // Scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Autofocus the input once the panel is mounted in the DOM
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  function saveRecents(list: string[]) {
    setRecentSearches(list);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }

  function addRecent(term: string) {
    const next = [term, ...recentSearches.filter((t) => t !== term)].slice(
      0,
      MAX_RECENTS
    );
    saveRecents(next);
  }

  function clearRecents() {
    saveRecents([]);
  }

  function closeSearch() {
    setOpen(false);
    setQuery("");
  }

  // Navigating to a result (a typed query or a recent-search chip) both
  // records the term AND closes the panel as part of the same click/submit
  // handler, so results are reachable in one tap — the panel no longer has
  // to be closed via the X first before a link underneath becomes clickable.
  function goSearch(term: string) {
    const t = term.trim();
    if (!t) return;
    addRecent(t);
    closeSearch();
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    goSearch(query);
  }

  return (
    <>
      {/* Dedicated search button — separate from the hamburger menu */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center text-black/70 transition hover:text-[#7B2D3E]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          <path d="M16.3 16.3 21 21" strokeLinecap="round" />
        </svg>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex flex-col bg-black/50 backdrop-blur-[2px]">
            {/* Top bar: input + close (X). This panel is dismissed ONLY via
                the X button — tapping the dimmed area below intentionally
                does nothing, matching the reference behaviour. */}
            <div className="flex items-center gap-3 border-b border-black/10 bg-[#fcfbf8] px-5 py-4">
              <form onSubmit={onSearchSubmit} className="flex-1">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/40">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m16 16 5 5" strokeLinecap="round" />
                    </svg>
                  </span>

                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products and brands"
                    className="
                      w-full rounded-full border border-black/10 bg-white
                      py-3 pl-11 pr-4
                      font-body text-sm text-black
                      placeholder:text-black/35
                      outline-none transition
                      hover:border-black/20
                      focus:border-[#7B2D3E]/40
                      focus:ring-2 focus:ring-[#7B2D3E]/10
                    "
                  />
                </div>
              </form>

              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                  text-black/45 transition
                  hover:bg-black/[0.04] hover:text-black
                "
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Dimmed content area */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              {recentSearches.length > 0 ? (
                <div className="rounded-2xl bg-white/95 p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-black/40">
                      Recent searches
                    </span>

                    <button
                      type="button"
                      onClick={clearRecents}
                      className="font-body text-xs text-black/45 transition hover:text-[#7B2D3E]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => goSearch(term)}
                        className="
                          rounded-full border border-black/10 bg-white
                          px-3 py-1.5 font-body text-xs text-black/65
                          transition
                          hover:border-[#7B2D3E]/20
                          hover:bg-[#7B2D3E]/5
                          hover:text-[#7B2D3E]
                        "
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-10 text-center font-body text-sm text-white/75">
                  Start typing to search products and brands
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}