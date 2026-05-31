// C:\Users\Asiya\projects\dalra\components\admin\AdminTopBar.tsx
"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import Link from "next/link";

export default function AdminTopBar({
  unseenWaitlistCount,
  unseenApplicationsCount,
}: {
  unseenWaitlistCount: number;
  unseenApplicationsCount: number;
}) {
  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <>
      {/* Tabler icons font */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />

      <aside className="sticky top-[57px] flex h-[calc(100vh-57px)] w-60 shrink-0 flex-col border-r border-[#e8ddd4] bg-[#faf8f4]">
        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4">
          <AdminHeader
            unseenWaitlistCount={unseenWaitlistCount}
            unseenApplicationsCount={unseenApplicationsCount}
          />
        </div>

        {/* Logout */}
        <div className="border-t border-[#e8ddd4] p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg border border-[#e8ddd4] bg-white px-3 py-2.5 text-left text-[13px] text-[#a89280] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
          >
            <i className="ti ti-logout text-[15px]" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}