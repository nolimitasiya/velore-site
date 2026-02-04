"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function refreshNow() {
  const url = new URL(window.location.href);
  url.searchParams.set("r", String(Date.now())); // cache-buster param
  window.location.assign(url.toString()); // full reload, always works
}


  return (
    <div className="flex items-center gap-6">
      {/* Left label */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className="font-semibold">Admin</div>
        <div className="hidden sm:block text-xs text-black/50">Veilora Club</div>
      </div>

      {/* Nav pills */}
      <nav className="flex flex-wrap items-center gap-2">
        <NavLink href="/admin/products" label="Products" />
        <NavLink href="/admin/import" label="Import" />
        <NavLink href="/admin/brand-invites" label="Brand Invites" />
        <NavLink href="/admin/brands/applications" label="Applications" />
        <NavLink href="/admin/newsletter" label="Newsletter" />

        <button
          type="button"
          onClick={refreshNow}
          className="rounded-lg px-3 py-2 text-sm border border-black/10 hover:bg-black/5"
          aria-label="Refresh"
          title="Refresh"
        >
          Refresh
        </button>
      </nav>
    </div>
  );
}
