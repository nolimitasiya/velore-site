"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all",
        active
          ? "bg-[#f2ece4] font-medium text-[#7B2D3E]"
          : "text-[#9a7e6f] hover:bg-[#f2ece4] hover:text-[#1a0a0e]",
      ].join(" ")}
    >
      <i
        className={`ti ${icon} text-[15px] ${active ? "text-[#7B2D3E]" : "text-[#c4a898] group-hover:text-[#7B2D3E]"}`}
        aria-hidden="true"
      />
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
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />
      <aside className="sticky top-[57px] flex h-[calc(100vh-57px)] w-60 shrink-0 flex-col border-r border-[#e8ddd4] bg-[#faf8f4]">
        

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c4a898]">
            Overview
          </div>
          <NavLink href="/brand/revenue" label="Analytics" icon="ti-chart-bar" />

          <div className="mb-1 mt-4 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c4a898]">
            Catalogue
          </div>
          <NavLink href="/brand/products" label="Products" icon="ti-shirt" />
          <NavLink href="/brand/import" label="Import" icon="ti-upload" />

          <div className="mb-1 mt-4 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c4a898]">
            Account
          </div>
          <NavLink href="/brand/profile" label="Profile" icon="ti-user" />

          <button
            type="button"
            onClick={refreshNow}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#9a7e6f] transition-all hover:bg-[#f2ece4] hover:text-[#1a0a0e]"
          >
            <i className="ti ti-refresh text-[15px] text-[#c4a898]" aria-hidden="true" />
            Refresh
          </button>
        </nav>

        {/* Logout */}
        <div className="border-t border-[#e8ddd4] p-3">
          <button
            onClick={logout}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-lg border border-[#e8ddd4] bg-white px-3 py-2.5 text-left text-[13px] text-[#a89280] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
          >
            <i className="ti ti-logout text-[15px]" aria-hidden="true" />
            {busy ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}