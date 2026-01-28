"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BrandHome() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/brand/login");
    router.refresh();
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brand Portal</h1>
        <button
          onClick={logout}
          disabled={busy}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          Logout
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <p className="text-sm text-black/70">
          Next: we’ll show “Your brands”, “Your products”, and your import history here (scoped to your company).
        </p>
      </div>
    </main>
  );
}
