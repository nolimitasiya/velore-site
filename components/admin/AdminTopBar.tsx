"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";

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
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-black/10 bg-white px-5 py-8">
      <AdminHeader
        unseenWaitlistCount={unseenWaitlistCount}
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <button
        onClick={logout}
        className="mt-6 rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-medium transition hover:bg-black hover:text-white"
      >
        Logout
      </button>
    </aside>
  );
}