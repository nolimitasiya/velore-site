"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    const ok = window.confirm(
      "This will generate a brand invite, email the onboarding link, and mark the application as ONBOARDED.\n\nContinue?"
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/brand-applications/${applicationId}/invite`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j?.error || `Failed (${res.status})`);

      // optional: show link so you can copy it too
      if (j.onboardingUrl) {
        window.prompt("Onboarding link (copy):", j.onboardingUrl);
      }

      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed to onboard.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
    >
      {busy ? "Onboarding…" : "Onboard"}
    </button>
  );
}
