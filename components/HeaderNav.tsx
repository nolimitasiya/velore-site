"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

const occasionLinks: NavItem[] = [
  { label: "Wedding", href: "/categories/occasion/wedding" },
  { label: "Eid", href: "/categories/occasion/eid" },
  { label: "Evening", href: "/categories/occasion/evening" },
];

const clothingLinks: NavItem[] = [
  { label: "Abayas", href: "/categories/clothing?type=abaya" },
  { label: "Dresses", href: "/categories/clothing?type=dress" },
  { label: "Skirts", href: "/categories/clothing?type=skirt" },
  { label: "Tops", href: "/categories/clothing?type=top" },
  { label: "Hijabs", href: "/categories/clothing?type=hijab" },
];

// ✅ Apply the SAME vertical hit-area to all nav items
const navItemWrapper = "flex items-center h-[48px] pb-3";

const navLink = (active: boolean) =>
  [
    "relative py-2 text-base md:text-[17px] tracking-[0.04em] transition-colors duration-200 leading-none",
    active ? "text-white" : "text-white/70 hover:text-white",
    "after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px",
    "after:bg-[var(--accent)] after:origin-center after:transition-transform after:duration-200",
    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");

const dropdownItem =
  "block w-full px-4 py-2 text-sm text-black/75 transition-colors hover:text-black hover:bg-black/[0.03]";

const dropdownPanel = [
  "absolute left-1/2 top-full -translate-x-1/2",
  "w-56 rounded-2xl border bg-white shadow-sm",
  // hidden until hover/focus
  "opacity-0 pointer-events-none translate-y-1",
  "transition-all duration-200",
  "group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0",
  "group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0",
].join(" ");

export default function HeaderNav() {
  const pathname = usePathname();

  const isActiveStartsWith = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const isClothingActive = pathname.startsWith("/categories/clothing");
  const isOccasionActive = pathname.startsWith("/categories/occasion");
  const isNextDayActive = pathname.startsWith("/next-day-delivery");

  return (
    <nav className="flex items-center justify-center gap-10">
      {/* New In */}
      <div className={navItemWrapper}>
        <Link href="/new-in" className={navLink(isActiveStartsWith("/new-in"))}>
          New In
        </Link>
      </div>

      {/* Clothing dropdown */}
      <div className={`${navItemWrapper} group relative`}>
        <Link
          href="/categories/clothing"
          className={navLink(isClothingActive)}
          aria-haspopup="menu"
          aria-controls="clothing-menu"
        >
          <span className="inline-flex items-center gap-1">
            Clothing
            <span className="text-white/40 text-xs transition-transform duration-200 group-hover:rotate-180">
              ▾
            </span>
          </span>
        </Link>

        <div id="clothing-menu" role="menu" aria-label="Clothing" className={dropdownPanel}>
          <div className="py-2">
            {clothingLinks.map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" className={dropdownItem}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="h-px w-full bg-[var(--accent)]/20" role="separator" />
        </div>
      </div>

      {/* Occasion dropdown */}
      <div className={`${navItemWrapper} group relative`}>
        <button
          type="button"
          className={navLink(isOccasionActive)}
          aria-haspopup="menu"
          aria-controls="occasion-menu"
        >
          <span className="inline-flex items-center gap-1">
            Occasion
            <span className="text-white/40 text-xs transition-transform duration-200 group-hover:rotate-180">
              ▾
            </span>
          </span>
        </button>

        <div id="occasion-menu" role="menu" aria-label="Occasion" className={dropdownPanel}>
          <div className="py-2">
            {occasionLinks.map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" className={dropdownItem}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="h-px w-full bg-[var(--accent)]/20" role="separator" />
        </div>
      </div>

      {/* Shop by Brands */}
      <div className={navItemWrapper}>
        <Link href="/brands" className={navLink(pathname === "/brands")}>
          Shop by Brands
        </Link>
      </div>

      {/* Next day delivery */}
      <div className={navItemWrapper}>
        <Link href="/next-day-delivery" className={navLink(isNextDayActive)}>
          Next day delivery
        </Link>
      </div>
    </nav>
  );
}
