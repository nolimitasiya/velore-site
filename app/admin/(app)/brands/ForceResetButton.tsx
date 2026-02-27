"use client";

import { useState } from "react";

export default function ForceResetButton({ brandId }: { brandId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Send a password reset link to the brand owner/admin email?")) return;

    setBusy(true);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/force-reset`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed");

      setDone("Sent");
      setTimeout(() => setDone(null), 2000);
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-black/10 px-3 py-2 text-xs hover:bg-black/5 disabled:opacity-50"
      type="button"
    >
      {busy ? "Sending..." : done ? "Sent ✓" : "Force reset"}
    </button>
  );
}
