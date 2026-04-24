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
      className={[
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all",
        active
          ? "border border-black bg-black text-white shadow-[0_6px_18px_rgba(0,0,0,0.12)]"
          : "border border-black/10 bg-white text-neutral-700 hover:border-black/15 hover:bg-neutral-50 hover:text-neutral-950",
      ].join(" ")}
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
    <div className="rounded-[28px] border border-black/8 bg-white/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* left: brand identity */}
        

        {/* center: nav */}
        <div className="flex flex-1 flex-wrap items-center justify-start gap-2 lg:justify-center">
          <NavLink href="/brand/revenue" label="Analytics" />
          <NavLink href="/brand/products" label="Products" />
          <NavLink href="/brand/import" label="Import" />
          <NavLink href="/brand/profile" label="Profile" />

          <button
            type="button"
            onClick={refreshNow}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-black/15 hover:bg-neutral-50 hover:text-neutral-950"
          >
            Refresh
          </button>
        </div>

        {/* right: logout */}
        <div className="flex justify-start lg:justify-end">
          <button
            onClick={logout}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-black/15 hover:bg-neutral-50 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}