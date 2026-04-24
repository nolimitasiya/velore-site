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
  <div className="flex items-center justify-between">
    {/* LEFT spacer */}
    <div className="w-32" />

    {/* CENTER (tabs) */}
    <div className="flex flex-1 justify-center">
      <AdminHeader
        unseenWaitlistCount={unseenWaitlistCount}
        unseenApplicationsCount={unseenApplicationsCount}
      />
    </div>

    {/* RIGHT (logout) */}
    <div className="flex w-32 justify-end">
      <button
        onClick={logout}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
      >
        Logout
      </button>
    </div>
  </div>
);
}