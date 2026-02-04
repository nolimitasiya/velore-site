"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    // Hard redirect so cookies + UI reset immediately
    window.location.assign("/admin/login");
  }

  const hideChrome = pathname === "/admin/login";

  return (
    <div className="min-h-screen bg-white">
      {!hideChrome && (
        <header className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <AdminHeader />

              <button
                onClick={logout}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
