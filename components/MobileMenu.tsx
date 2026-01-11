"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type LinkItem = { label: string; href: string };

type Screen =
  | { type: "root" }
  | { type: "group"; title: string; items: LinkItem[] };

const RECENTS_KEY = "dalra_recent_searches";
const MAX_RECENTS = 6;

export default function MobileMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ type: "root" });

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // --- Menu structure (root + nested groups)
  const rootLinks = useMemo<LinkItem[]>(
  () => [
    { label: "New In", href: "/new-in" },
    { label: "Clothing", href: "/categories/clothing" },
    { label: "Shop by Brands", href: "/brands" },
  ],
  []
);


  const groups = useMemo<Record<string, LinkItem[]>>(
    () => ({
      Occasion: [
        { label: "Wedding", href: "/categories/occasion/wedding" },
        { label: "Eid", href: "/categories/occasion/eid" },
        { label: "Evening", href: "/categories/occasion/evening" },
      ],
    }),
    []
  );

  function closeMenu() {
    setOpen(false);
    setScreen({ type: "root" });
  }

  // --- Scroll lock when menu open
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // --- Load recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  function saveRecents(next: string[]) {
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function addRecent(term: string) {
    const cleaned = term.trim();
    if (!cleaned) return;

    const next = [cleaned, ...recentSearches.filter((x) => x !== cleaned)].slice(
      0,
      MAX_RECENTS
    );
    saveRecents(next);
  }

  function clearRecents() {
    saveRecents([]);
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {
      // ignore
    }
  }

  function goSearch(term: string) {
    const q = term.trim();
    if (!q) return;
    addRecent(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    closeMenu();
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    goSearch(query);
  }

  // --- Render helpers
  const isRoot = screen.type === "root";
  const title = screen.type === "group" ? screen.title : "Menu";
  const currentItems: LinkItem[] = screen.type === "group" ? screen.items : [];

  // Active detection (exact match is fine for now; can be made "startsWith" later)
  const isActive = (href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

  // Shared row styling
  const rowBase =
    "group flex items-center justify-between border-b p-4 text-lg transition-colors duration-200";
  const rowHover = "hover:bg-black/[0.03]";
  const activeRow = "bg-black/[0.02]";

  const leftAccent =
    "relative before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-[var(--accent)]";

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex flex-col gap-1"
      >
        <span className="h-0.5 w-6 bg-white" />
        <span className="h-0.5 w-6 bg-white" />
        <span className="h-0.5 w-6 bg-white" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={closeMenu} />
      )}

      {/* Slide-out menu */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-80 transform bg-black transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            {!isRoot && (
              <button
                onClick={() => setScreen({ type: "root" })}
                aria-label="Back"
                className="rounded-lg px-2 py-1 text-lg transition-colors hover:bg-black/[0.04]"
              >
                ←
              </button>
            )}

            <span className="font-heading text-lg tracking-[0.02em]">{title}</span>
          </div>

          <button
            onClick={closeMenu}
            aria-label="Close menu"
            className="text-xl transition-colors hover:text-[var(--accent)]"
          >
            ✕
          </button>
        </div>

        {/* Search inside menu (root only) */}
        {isRoot && (
          <div className="border-b p-4">
            <form onSubmit={onSearchSubmit} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands…"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
              <button
                type="submit"
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              >
                Search
              </button>
            </form>

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-black/60">
                    Recent searches
                  </span>
                  <button
                    type="button"
                    onClick={clearRecents}
                    className="text-xs text-black/60 underline transition-colors hover:text-[var(--accent)]"
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
                      className="rounded-full bg-black/[0.04] px-3 py-1 text-xs text-black/80 transition-colors hover:bg-black/[0.07]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <nav className="flex flex-col">
          {/* Root screen */}
          {isRoot && (
            <>
              {rootLinks.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      rowBase,
                      rowHover,
                      active ? `${activeRow} ${leftAccent}` : "",
                    ].join(" ")}
                    onClick={closeMenu}
                  >
                    <span className={active ? "text-[var(--accent)]" : ""}>
                      {item.label}
                    </span>
                    <span
                      className={[
                        "text-black/30 transition-colors duration-200",
                        active ? "text-[var(--accent)]" : "group-hover:text-black/50",
                      ].join(" ")}
                    >
                      ›
                    </span>
                  </Link>
                );
              })}

              {/* Group entry buttons */}
              {Object.entries(groups).map(([groupTitle, items]) => (
                <button
                  key={groupTitle}
                  onClick={() => setScreen({ type: "group", title: groupTitle, items })}
                  className={[rowBase, rowHover].join(" ")}
                >
                  <span>{groupTitle}</span>
                  <span className="text-black/30 transition-colors group-hover:text-black/50">
                    ›
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Nested group screen */}
          {!isRoot &&
            currentItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    rowBase,
                    rowHover,
                    active ? `${activeRow} ${leftAccent}` : "",
                  ].join(" ")}
                  onClick={closeMenu}
                >
                  <span className={active ? "text-[var(--accent)]" : ""}>
                    {item.label}
                  </span>
                  <span
                    className={[
                      "text-black/30 transition-colors duration-200",
                      active ? "text-[var(--accent)]" : "group-hover:text-black/50",
                    ].join(" ")}
                  >
                    ›
                  </span>
                </Link>
              );
            })}
        </nav>
      </div>
    </>
  );
}
