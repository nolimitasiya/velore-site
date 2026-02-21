"use client";

import { useState } from "react";

type Props = {
  brandId: string;
  initialStatus: "PENDING" | "ACTIVE" | "PAUSED" | null;
  initialProvider: string | null;
  initialBaseUrl: string | null;
};

const STATUS_OPTIONS: Array<Props["initialStatus"] extends null ? never : "PENDING" | "ACTIVE" | "PAUSED"> = [
  "PENDING",
  "ACTIVE",
  "PAUSED",
];

export default function AffiliateControls({
  brandId,
  initialStatus,
  initialProvider,
  initialBaseUrl,
}: Props) {
  const [status, setStatus] = useState<"PENDING" | "ACTIVE" | "PAUSED">((initialStatus ?? "PENDING") as any);
  const [provider, setProvider] = useState(initialProvider ?? "SHOPIFY_COLLABS");
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/affiliate`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          affiliateStatus: status,
          affiliateProvider: provider,
          affiliateBaseUrl: baseUrl.trim() || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j?.error || `Failed (${res.status})`);

      setSaved("Saved ✓");
      setTimeout(() => setSaved(null), 1500);
    } catch (e: any) {
      alert(e?.message || "Failed to save affiliate settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
        value={status}
        onChange={(e) => setStatus(e.target.value as any)}
        disabled={saving}
        aria-label="Affiliate status"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        className="w-[240px] rounded-lg border border-black/10 bg-white px-2 py-1 text-xs"
        placeholder="affiliateBaseUrl (store-wide)"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        disabled={saving}
        aria-label="Affiliate base URL"
      />

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-black px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      {saved && <span className="text-xs text-neutral-600">{saved}</span>}
    </div>
  );
}
