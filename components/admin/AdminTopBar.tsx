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
    <div className="flex items-center justify-between gap-4">
      <AdminHeader
        unseenWaitlistCount={unseenWaitlistCount}
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <button
        onClick={logout}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
      >
        Logout
      </button>
    </div>
  );
}