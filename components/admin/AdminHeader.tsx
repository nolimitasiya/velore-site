"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm border transition-colors ${
        active
          ? "bg-black text-white border-black"
          : "hover:bg-black/5 border-black/10"
      }`}
    >
      {label}
    </Link>
  );
}

export function AdminHeader() {
  const pathname = usePathname();

  function refreshNow() {
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(Date.now()));
    window.location.assign(url.toString());
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className="font-semibold">Admin</div>
        <div className="hidden sm:block text-xs text-black/50">
          Veilora Club
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-2">
        <NavLink href="/admin/revenue" label="Revenue" />
        <NavLink href="/admin/products" label="Products" />
        <NavLink href="/admin/import" label="Import" />
        <NavLink href="/admin/brand-invites" label="Brand Invites" />
        <NavLink href="/admin/brands/applications" label="Applications" />
        <NavLink href="/admin/newsletter" label="Newsletter" />

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
