"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardButton({
  applicationId,
}: {
  applicationId: string;
}) {
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
      const res = await fetch(
        `/api/admin/brand-applications/${applicationId}/invite`,
        {
          method: "POST",
        }
      );

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        throw new Error(j?.error || `Failed (${res.status})`);
      }

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
      className="inline-flex h-10 items-center rounded-2xl border border-black bg-black px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Onboarding…" : "Onboard"}
    </button>
  );
}