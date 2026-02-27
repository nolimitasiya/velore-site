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

  // Hide badge when you're already on that page (so it "clears" instantly)
  const showBadge = Boolean(badge && badge > 0 && !active);

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm border transition-colors inline-flex items-center gap-2 ${
        active
          ? "bg-black text-white border-black"
          : "hover:bg-black/5 border-black/10"
      }`}
    >
      <span>{label}</span>

      {showBadge && (
        <span
          className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-[11px] leading-none ${
            active ? "bg-white/20 text-white" : "bg-black text-white"
          }`}
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
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(Date.now()));
    window.location.assign(url.toString());
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 whitespace-nowrap"></div>

      <nav className="flex flex-wrap items-center gap-2">
        <NavLink href="/admin/revenue" label="Analytics" />
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

        <button
          type="button"
          onClick={refreshNow}
          className="rounded-lg px-3 py-2 text-sm border border-black/10 hover:bg-black/5"
        >
          Refresh
        </button>
      </nav>
    </div>
  );
}