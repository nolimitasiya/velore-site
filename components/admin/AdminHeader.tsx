"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const showBadge = Boolean(badge && badge > 0 && !active);

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
        active
          ? "border border-black bg-black text-white shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
          : "border border-black/10 bg-white text-neutral-700 hover:border-black/15 hover:bg-neutral-50 hover:text-neutral-950",
      ].join(" ")}
    >
      <span>{label}</span>

      {showBadge && (
        <span
          className={[
            "inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
            active
              ? "bg-white/15 text-white"
              : "bg-neutral-950 text-white",
          ].join(" ")}
        >
          +{badge}
        </span>
      )}
    </Link>
  );
}

export function AdminHeader({
  unseenWaitlistCount = 0,
  unseenApplicationsCount = 0,
}: {
  unseenWaitlistCount?: number;
  unseenApplicationsCount?: number;
}) {
  function refreshNow() {
  window.location.reload();
}

  return (
    <div className="rounded-[28px] border border-black/8 bg-white/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {/* left: identity */}
        <div className="min-w-0">
        
        </div>

        {/* center: nav */}
        <nav className="flex flex-1 flex-wrap items-center gap-2 xl:justify-center">
          <NavLink href="/admin/analytics" label="Analytics" />
          <NavLink href="/admin/products" label="Products" />
          <NavLink href="/admin/import" label="Import" />
          <NavLink href="/admin/brands" label="Brands" />
          <NavLink href="/admin/brand-invites" label="Brand Invites" />
          <NavLink
            href="/admin/brands/applications"
            label="Applications"
            badge={unseenApplicationsCount}
          />
          <NavLink href="/admin/newsletter" label="Newsletter" />
          <NavLink
            href="/admin/waitlist"
            label="Waitlist"
            badge={unseenWaitlistCount}
          />
          <NavLink href="/admin/taxonomy/requests" label="Requests" />
<NavLink href="/admin/storefront" label="Features" />
<NavLink href="/admin/navigation" label="Navigation Promos" />
<NavLink href="/admin/continents" label="Continents" />
<NavLink href="/admin/diary" label="Diary" />
<NavLink href="/admin/storefront" label="Storefront" />
<NavLink href="/admin/merchandising" label="Merchandising" />

          <button
            type="button"
            onClick={refreshNow}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-black/15 hover:bg-neutral-50 hover:text-neutral-950"
          >
            Refresh
          </button>
        </nav>
      </div>
    </div>
  );
}