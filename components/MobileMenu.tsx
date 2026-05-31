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

  const [brands, setBrands] = useState<LinkItem[]>([]);
  const [brandsLoaded, setBrandsLoaded] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

useEffect(() => {
  const match = document.cookie.match(/(?:^|; )shopper_authed=([^;]*)/);
  setIsLoggedIn(!!match?.[1]);
}, []);

  // --- Menu structure (root + nested groups)
  const rootLinks = useMemo<LinkItem[]>(
  () => [
    { label: "New In", href: "/new-in" },
    { label: "Shop by Brands", href: "/brands" },
    { label: "Editorial", href: "/diary" },
    { label: "Sale", href: "/sale" },
  ],
  []
);


  const groups = useMemo<Record<string, LinkItem[]>>(
  () => ({
    Clothing: [
      { label: "All Clothing", href: "/categories/clothing" },
      { label: "Abayas", href: "/categories/clothing?type=ABAYA" },
      { label: "Dresses", href: "/categories/clothing?type=DRESS" },
      { label: "Hijabs", href: "/categories/clothing?type=HIJAB" },
      { label: "Tops", href: "/categories/clothing?type=TOP" },
      { label: "Skirts", href: "/categories/clothing?type=SKIRT" },
      { label: "Co-ords & Sets", href: "/categories/clothing?type=SETS" },
      { label: "Khimars", href: "/categories/clothing?type=KHIMAR" },
      { label: "Jilbabs", href: "/categories/clothing?type=JILBAB" },
      { label: "Activewear", href: "/categories/clothing?type=ACTIVEWEAR" },
      { label: "Coats & Jackets", href: "/categories/clothing?type=COATS_JACKETS" },
    ],
    Accessories: [
      { label: "All Accessories", href: "/categories/accessories" },
      { label: "Rings", href: "/categories/accessories?category=rings" },
      { label: "Necklaces", href: "/categories/accessories?category=necklaces" },
      { label: "Bracelets", href: "/categories/accessories?category=bracelets" },
      { label: "Earrings", href: "/categories/accessories?category=earrings" },
      { label: "Watches", href: "/categories/accessories?category=watches" },
    ],
    Occasion: [
      { label: "All Occasions", href: "/categories/occasion" },
      { label: "Wedding", href: "/categories/occasion/wedding" },
      { label: "Eid", href: "/categories/occasion/eid" },
      { label: "Workwear", href: "/categories/occasion/workwear" },
      { label: "Graduation", href: "/categories/occasion/graduation" },
      { label: "Party", href: "/categories/occasion/party" },
      { label: "Everyday", href: "/categories/occasion/everyday" },
    ],
     "Shop by Brands": brands, 
  }),
  [brands]
);

  function closeMenu() {
    setOpen(false);
    setScreen({ type: "root" });
  }

  // --- Scroll lock when menu open
  // Scroll lock
useEffect(() => {
  if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = prev; };
}, [open]);

// Brands fetch
useEffect(() => {
  if (!open || brandsLoaded) return;
  fetch("/api/storefront/brands")
    .then((r) => r.json())
    .then((j) => {
      if (j.brands) {
        setBrands([
  { label: "Shop All Brands", href: "/brands" },
  ...j.brands.map((b: any) => ({
    label: b.name,
    href: `/brands/${b.slug}`,
  }))
]);
        setBrandsLoaded(true);
      }
    })
    .catch(() => {});
}, [open, brandsLoaded]);

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
        className={`fixed left-0 top-0 z-50 h-full w-[85vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-black/8 p-4 bg-white">
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

            <span className="font-heading text-lg tracking-[0.02em] text-black">{title}</span>
          </div>

          <button
            onClick={closeMenu}
            aria-label="Close menu"
            className="text-xl text-black/60 transition-colors hover:text-black"
          >
            ✕
          </button>
        </div>

        {/* Search inside menu (root only) */}
        {isRoot && (
          <div className="border-b border-black/8 p-4 bg-white">
            <form onSubmit={onSearchSubmit} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands…"
                className="w-full rounded-xl border border-black/15 bg-black/[0.03] px-3 py-2 text-sm text-black outline-none placeholder:text-black/40 focus:border-black/30"
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
        <nav className="flex flex-col bg-white flex-1">


          {/* Root screen */}
          {isRoot && (
  <>
    {/* New In */}
    <Link href="/new-in" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className={isActive("/new-in") ? "font-medium text-black" : "text-black"}>New In</span>
      <span className="text-black/30">›</span>
    </Link>

    {/* Clothing group */}
    <button onClick={() => setScreen({ type: "group", title: "Clothing", items: groups["Clothing"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="text-black">Clothing</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Accessories group */}
    <button onClick={() => setScreen({ type: "group", title: "Accessories", items: groups["Accessories"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="text-black">Accessories</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Occasion group */}
    <button onClick={() => setScreen({ type: "group", title: "Occasion", items: groups["Occasion"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="text-black">Occasion</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Shop by Brands */}
    <button onClick={() => setScreen({ type: "group", title: "Shop by Brands", items: brands })}
  className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
  <span className="text-black">Shop by Brands</span>
  <span className="text-black/30">›</span>
</button>

    {/* Editorial */}
    <Link href="/diary" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className={isActive("/diary") ? "font-medium text-black" : "text-black"}>Editorial</span>
      <span className="text-black/30">›</span>
    </Link>

    {/* Sale */}
    <Link href="/sale" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className="text-[#7B2D3E]">Sale</span>
      <span className="text-[#7B2D3E]/40">›</span>
    </Link>
  </>
)}

          {/* Nested group screen */}
          {!isRoot && title === "Shop by Brands" && !brandsLoaded ? (
  <div className="px-5 py-8 text-sm text-black/40 text-center">
    Loading brands…
  </div>
) : 
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
                  <span className={active ? "font-medium text-black" : "text-black"}>
                
                    {item.label}
                  </span>
                  <span
                    className={[
                      "text-black/30 transition-colors duration-200",
                      active ? "text-[var(--accent)]" : "group-hover:text-black/50",
                    ].join(" ")}>
                    ›
                  </span>
                </Link>
              );
            })}
        {/* Account section — always visible at bottom */}
        {isRoot && (
  <div className="mt-auto border-t border-black/8 p-4 space-y-2">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/40 px-1 mb-3">
      My account
    </p>

    {isLoggedIn ? (
      <>
        <Link
          href="/account"
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-black/[0.03] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span className="text-sm text-black">My account</span>
        </Link>
        <Link
          href="/account/logout"
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-black/[0.03] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="text-sm text-black">Sign out</span>
        </Link>
      </>
    ) : (
      <>
        <Link
          href="/account/login"
          onClick={closeMenu}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-black/[0.03] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span className="text-sm text-black">Sign in</span>
        </Link>
        <Link
          href="/account/register"
          onClick={closeMenu}
          className="flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435]"
        >
          Create account
        </Link>
      </>
    )}
  </div>
)}
        </nav>
      </div>
    </>
  );
}
