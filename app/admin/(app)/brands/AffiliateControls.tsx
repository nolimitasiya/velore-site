"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  brandId: string;
  initialStatus: "PENDING" | "ACTIVE" | "PAUSED" | null;
  initialProvider: string | null;
  initialBaseUrl: string | null;
};

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "PAUSED"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const PROVIDER_OPTIONS = ["SHOPIFY_COLLABS", "OTHER"] as const;
type Provider = (typeof PROVIDER_OPTIONS)[number];

export default function AffiliateControls({
  brandId,
  initialStatus,
  initialProvider,
  initialBaseUrl,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<Status>(
    (initialStatus ?? "PENDING") as Status
  );
  const [provider, setProvider] = useState<Provider>(
    (initialProvider ?? "SHOPIFY_COLLABS") as Provider
  );
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
      if (!res.ok || !j.ok) {
        throw new Error(j?.error || `Failed (${res.status})`);
      }

      setSaved("Saved ✓");
      router.refresh();
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
        className="h-10 rounded-2xl border border-black/10 bg-white px-3 text-xs font-medium text-neutral-800 outline-none transition hover:border-black/20 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
        value={status}
        onChange={(e) => setStatus(e.target.value as Status)}
        disabled={saving}
        aria-label="Affiliate status"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className="h-10 rounded-2xl border border-black/10 bg-white px-3 text-xs font-medium text-neutral-800 outline-none transition hover:border-black/20 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
        value={provider}
        onChange={(e) => setProvider(e.target.value as Provider)}
        disabled={saving}
        aria-label="Affiliate provider"
      >
        {PROVIDER_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <input
        className="h-10 w-[260px] rounded-2xl border border-black/10 bg-white px-4 text-xs text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="Affiliate base URL (store-wide)"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        disabled={saving}
        aria-label="Affiliate base URL"
      />

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex h-10 items-center rounded-2xl border border-black bg-black px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      {saved ? (
        <span className="inline-flex items-center rounded-full border border-black/10 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
          {saved}
        </span>
      ) : null}
    </div>
  );
}