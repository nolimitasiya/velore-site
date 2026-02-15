"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm border transition-colors ${
        active ? "bg-black text-white border-black" : "hover:bg-black/5 border-black/10"
      }`}
    >
      {label}
    </Link>
  );
}
export function BrandHeader({ brandName }: { brandName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/brand/auth/logout", { method: "POST" });
      router.push("/brand/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
function refreshNow() {
    const url = new URL(window.location.href);
    url.searchParams.set("r", String(Date.now()));
    window.location.assign(url.toString());
  }
  return (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
    {/* left: title */}
    <div className="flex items-center gap-2">
      <div className="font-semibold">Brand Portal</div>
      <div className="hidden sm:block text-xs text-black/50" />
      <div className="hidden sm:block text-xs text-black/50">{brandName}</div>

    </div>

    {/* center: tabs */}
    <div className="flex flex-wrap justify-start sm:justify-center gap-2">
      <NavLink href="/brand/revenue" label="Analytics" />
      <NavLink href="/brand/products" label="Products" />
      <NavLink href="/brand/import" label="Import" />
      <NavLink href="/brand/billing" label="Billing" />
      <NavLink href="/brand/features" label="Features" />


      <button
          type="button"
          onClick={refreshNow}
          className="rounded-lg px-3 py-2 text-sm border border-black/10 hover:bg-black/5"
        >
          Refresh
        </button>
    </div>

    {/* right: logout */}
    <div className="flex sm:justify-end">
      <button
        onClick={logout}
        disabled={busy}
        className="rounded-lg px-3 py-2 text-sm border border-black/10 hover:bg-black/5 disabled:opacity-50"

      >
        {busy ? "..." : "Logout"}
      </button>
    </div>
  </div>
);
}