"use client";

import { useRouter } from "next/navigation";
import { useState, useId } from "react";

const OPTIONS = ["new", "contacted", "invited", "onboarded", "rejected"] as const;

export default function StatusSelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const labelId = useId();

  async function onChange(next: string) {
    setLoading(true);
    try {
      let schedulerUrl: string | undefined;
      let inviteLink: string | undefined;

      if (next === "invited") {
        schedulerUrl =
          window
            .prompt("Optional: paste your booking link (Calendly/Cal.com). Leave blank to send a reply-based email.")?.trim() || "";
        schedulerUrl = schedulerUrl || undefined;
      }

      if (next === "onboarded") {
        inviteLink =
          window
            .prompt("Paste the brand invite/onboarding link to include in the email (required):")?.trim() || "";

        if (!inviteLink) {
          // don’t change status if link not provided
          return;
        }
      }

      const res = await fetch(`/api/admin/brand-applications/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next, schedulerUrl, inviteLink }),
      });

      if (!res.ok) {
        console.error("Failed to update status", res.status, await res.text());
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="sr-only">Application stage</span>

      <select
        aria-labelledby={labelId}
        className="rounded-xl border px-2 py-1 text-sm bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.toUpperCase()}
          </option>
        ))}
      </select>

      {loading && <span className="text-xs text-neutral-500">Saving…</span>}
    </div>
  );
}
