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

export function AdminHeader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Admin</div>
        <div className="hidden sm:block text-xs text-black/50">Veilora Club</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NavLink href="/admin/products" label="Products" />
        <NavLink href="/admin/import" label="Imports" />
        <NavLink href="/admin/brand-invites" label="Brand Invites" />
        <NavLink href="/admin/newsletter" label= "Newsletter"/>


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
