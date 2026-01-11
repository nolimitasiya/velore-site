"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { label: string; href: string };

const occasionLinks: NavItem[] = [
  { label: "Wedding", href: "/categories/occasion/wedding" },
  { label: "Eid", href: "/categories/occasion/eid" },
  { label: "Evening", href: "/categories/occasion/evening" },
];

const navLink = (active: boolean) =>
  [
    "relative py-2 text-base md:text-[17px] tracking-[0.04em] transition-colors duration-200",
    active ? "text-white" : "text-white/70 hover:text-white",
    "after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px",
    "after:bg-[var(--accent)] after:origin-center after:transition-transform after:duration-200",
    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");

const dropdownItem =
  "block w-full px-4 py-2 text-sm text-black/75 transition-colors hover:text-black hover:bg-black/[0.03]";

export default function HeaderNav() {
  const pathname = usePathname();
  const [openOccasion, setOpenOccasion] = useState(false);

  const isActiveStartsWith = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const isOccasionActive = pathname.startsWith("/categories/occasion");

  return (
    <nav className="flex items-center justify-center gap-10">
      <Link href="/new-in" className={navLink(isActiveStartsWith("/new-in"))}>
        New In
      </Link>

      <Link
        href="/categories/clothing"
        className={navLink(isActiveStartsWith("/categories/clothing"))}
      >
        Clothing
      </Link>

      {/* Occasion dropdown */}
      <div
        className="relative"
        onMouseEnter={() => setOpenOccasion(true)}
        onMouseLeave={() => setOpenOccasion(false)}
      >
        <button
          type="button"
          className={navLink(isOccasionActive)}
          aria-haspopup="menu"
          aria-controls="occasion-menu"
        >
          <span className="inline-flex items-center gap-2">
            Occasion
            <span
              className={[
                "text-white/40 transition-transform duration-200",
                openOccasion ? "rotate-180" : "",
              ].join(" ")}
            >
              ▾
            </span>
          </span>
        </button>

        <div
          id="occasion-menu"
          role="menu"
          aria-label="Occasion"
          className={[
            "absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-2xl border bg-white shadow-sm",
            "transition-all duration-200",
            openOccasion
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none",
          ].join(" ")}
        >
          <div className="py-2">
            {occasionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                tabIndex={openOccasion ? 0 : -1}
                className={dropdownItem}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="h-px w-full bg-[var(--accent)]/20" role="separator" />
        </div>
      </div>

      <Link href="/brands" className={navLink(pathname === "/brands")}>
        Shop by Brands
      </Link>
    </nav>
  );
}
