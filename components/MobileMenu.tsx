"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import MobileSearch from "@/components/MobileSearch";

type LinkItem = { label: string; href: string };

type Screen =
  | { type: "root" }
  | { type: "group"; title: string; items: LinkItem[] };

export default function MobileMenu() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ type: "root" });

  // The slide-out menu and its backdrop are portaled to document.body (below)
  // so they always cover the true viewport rather than being clipped/positioned
  // relative to the header, which has a CSS transform (StickyHeader's
  // translate-y show/hide animation) and therefore becomes the containing
  // block for any `position: fixed` descendant. Portals only work client-side,
  // hence the mounted flag.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Belt-and-suspenders: close the drawer the moment the route actually
  // changes. Regular in-menu links already call closeMenu() on click, but
  // the search button embedded in the top bar navigates via its own
  // router.push and has no reference to this component's state — this
  // effect is what makes the drawer close in that case too.
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);


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

  // --- Render helpers
  const isRoot = screen.type === "root";
  const title = screen.type === "group" ? screen.title : "Menu";
  const currentItems: LinkItem[] = screen.type === "group" ? screen.items : [];

  // Active detection (exact match is fine for now; can be made "startsWith" later)
  const isActive = (href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

  // Shared row styling
  const rowBase =
  "group flex items-center justify-between border-b border-black/5 px-5 py-4 transition-all duration-200";

const rowHover =
  "hover:bg-[#7B2D3E]/[0.035]";

const activeRow =
  "bg-[#7B2D3E]/[0.05]";

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
        <span className="h-px w-6 bg-black" />
        <span className="h-px w-6 bg-black" />
        <span className="h-px w-6 bg-black" />
      </button>

      {mounted && createPortal(
        <>
      {/* Overlay */}
      {open && (
  <div
    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
    onClick={closeMenu}
  />
)}

      {/* Slide-out menu */}
      <div
  className={`fixed left-0 top-0 z-50 flex h-full w-[88vw] max-w-[390px] flex-col
    border-r border-black/10 bg-[#fcfbf8]
    shadow-[20px_0_70px_rgba(0,0,0,0.14)]
    transition-transform duration-300 ease-out ${
      open ? "translate-x-0" : "-translate-x-full"
    }`}
  role="dialog"
  aria-modal="true"
>
        {/* Top bar */}
<div className="flex min-h-[76px] items-center justify-between border-b border-black/10 px-5">
  <div className="flex items-center gap-3">
    {!isRoot && (
      <button
        type="button"
        onClick={() => setScreen({ type: "root" })}
        aria-label="Back"
        className="
          flex h-9 w-9 items-center justify-center rounded-full
          text-black/50 transition
          hover:bg-black/[0.04] hover:text-black
        "
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M19 12H5M11 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )}

    <span className="font-heading text-2xl tracking-[0.02em] text-[#7B2D3E]">
      {isRoot ? "Veilora Club" : title}
    </span>
  </div>

    <div className="flex items-center gap-1">
    {/* Lets a shopper search without having to close the menu first —
        this is a separate MobileSearch instance from the one in the
        collapsed header; its overlay portals at a higher z-index than
        this drawer, so it always renders on top of it. */}
    <MobileSearch onNavigate={closeMenu} />

    <button
      type="button"
      onClick={closeMenu}
      aria-label="Close menu"
      className="
        flex h-10 w-10 items-center justify-center rounded-full
        text-black/45 transition
        hover:bg-black/[0.04] hover:text-black
      "
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M6 6l12 12M18 6 6 18"
          strokeLinecap="round"
        />
      </svg>
    </button>
  </div>
</div>

        {/* Content */}
        <nav className="flex flex-col bg-white flex-1">


          {/* Root screen */}
          {isRoot && (
  <>
    {/* New In */}
    <Link href="/new-in" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className={isActive("/new-in") ? "font-display font-medium text-black" : "font-display text-black"}>New In</span>
      <span className="text-black/30">›</span>
    </Link>

    {/* Clothing group */}
    <button onClick={() => setScreen({ type: "group", title: "Clothing", items: groups["Clothing"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="font-display text-black">Clothing</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Accessories group */}
    <button onClick={() => setScreen({ type: "group", title: "Accessories", items: groups["Accessories"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="font-display text-black">Accessories</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Occasion group */}
    <button onClick={() => setScreen({ type: "group", title: "Occasion", items: groups["Occasion"] })}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
      <span className="font-display text-black">Occasion</span>
      <span className="text-black/30">›</span>
    </button>

    {/* Shop by Brands */}
    <button onClick={() => setScreen({ type: "group", title: "Shop by Brands", items: brands })}
  className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors w-full">
  <span className="font-display text-black">Shop by Brands</span>
  <span className="text-black/30">›</span>
</button>

    {/* Editorial */}
    <Link href="/diary" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className={isActive("/diary") ? "font-display font-medium text-black" : "font-display text-black"}>Editorial</span>
      <span className="text-black/30">›</span>
    </Link>

    {/* Sale */}
    <Link href="/sale" onClick={closeMenu}
      className="flex items-center justify-between px-5 py-4 border-b border-black/6 hover:bg-black/[0.02] transition-colors">
      <span className="font-display text-[#7B2D3E]">Sale</span>
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
  prefetch={false}
  className={[
                    rowBase,
                    rowHover,
                    active ? `${activeRow} ${leftAccent}` : "",
                  ].join(" ")}
                  onClick={closeMenu}
                >
                  <span
  className={[
    "font-display text-[15px] tracking-[0.02em] transition-colors",
    active
      ? "font-medium text-[#7B2D3E]"
      : "text-black/75 group-hover:text-[#7B2D3E]",
  ].join(" ")}
>
                
                    {item.label}
                  </span>
                  <span
                    className={[
  "text-lg transition-all duration-200",
  active
    ? "text-[#7B2D3E]"
    : "text-black/25 group-hover:translate-x-1 group-hover:text-[#7B2D3E]/50",
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
        </>,
        document.body
      )}
    </>
  );
}
