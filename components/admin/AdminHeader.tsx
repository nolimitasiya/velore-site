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

  return (
    <Link
      href={href}
      className={[
        "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.14)]"
          : "text-neutral-600 hover:bg-[#f4efe8] hover:text-black",
      ].join(" ")}
    >
      <span>{label}</span>

      {badge && badge > 0 && !active ? (
        <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
          +{badge}
        </span>
      ) : null}
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
    <div className="flex h-full flex-col">
      <nav className="flex flex-col gap-1">
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
        <NavLink href="/admin/navigation" label="Navigation Promos" />
        <NavLink href="/admin/continents" label="Continents" />
        <NavLink href="/admin/diary" label="Diary" />
        <NavLink href="/admin/storefront" label="Storefront" />
        <NavLink href="/admin/merchandising" label="Merchandising" />
      </nav>

      <div className="mt-auto border-t border-black/10 pt-5">
        <button
          type="button"
          onClick={refreshNow}
          className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-neutral-600 transition hover:bg-[#f4efe8] hover:text-black"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}