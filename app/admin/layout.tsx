"use client";

import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Top admin bar */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto p-6 flex items-center justify-between">
          <div className="text-lg font-semibold">Admin</div>

          <button
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  );
}
