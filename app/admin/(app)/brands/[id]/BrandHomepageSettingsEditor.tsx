"use client";

import { useState } from "react";

export default function BrandHomepageSettingsEditor({
  brandId,
  initialShowOnHomepage,
  initialHomepageOrder,
}: {
  brandId: string;
  initialShowOnHomepage: boolean;
  initialHomepageOrder: number | null;
}) {
  const [showOnHomepage, setShowOnHomepage] = useState(initialShowOnHomepage);
  const [homepageOrder, setHomepageOrder] = useState(
    initialHomepageOrder?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);

    const parsedOrder =
      homepageOrder.trim() === "" ? null : Number(homepageOrder.trim());

    const res = await fetch(`/api/admin/brands/${brandId}/homepage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        showOnHomepage,
        homepageOrder:
          parsedOrder === null || Number.isNaN(parsedOrder) ? null : parsedOrder,
      }),
    });

    const j = await res.json();

    if (j.ok) {
      setMessage("Homepage settings saved.");
    } else {
      setMessage(j.error ?? "Something went wrong.");
    }

    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold">Homepage Settings</h2>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showOnHomepage}
            onChange={(e) => setShowOnHomepage(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">Show this brand on homepage</span>
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Homepage order
          </label>
          <input
            type="number"
            min={1}
            value={homepageOrder}
            onChange={(e) => setHomepageOrder(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="e.g. 1"
          />
          <p className="mt-1 text-xs text-black/50">
            Lower numbers appear first. Leave blank if not needed.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>

        {message ? <div className="text-sm text-black/60">{message}</div> : null}
      </div>
    </div>
  );
}