"use client";

import { useState } from "react";

export default function BrandMenuSettingsEditor({
  brandId,
  initialShowInBrandsMenu,
  initialBrandsMenuOrder,
}: {
  brandId: string;
  initialShowInBrandsMenu: boolean;
  initialBrandsMenuOrder: number | null;
}) {
  const [showInBrandsMenu, setShowInBrandsMenu] = useState(
    initialShowInBrandsMenu
  );

  const [brandsMenuOrder, setBrandsMenuOrder] = useState(
    initialBrandsMenuOrder?.toString() ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);

    const parsedOrder =
      brandsMenuOrder.trim() === ""
        ? null
        : Number(brandsMenuOrder.trim());

    if (
      showInBrandsMenu &&
      parsedOrder !== null &&
      (Number.isNaN(parsedOrder) ||
        parsedOrder < 1 ||
        parsedOrder > 12)
    ) {
      setMessage("Brands menu order must be between 1 and 12.");
      setSaving(false);
      return;
    }

    const res = await fetch(
      `/api/admin/brands/${brandId}/brands-menu`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          showInBrandsMenu,
          brandsMenuOrder:
            !showInBrandsMenu
              ? null
              : parsedOrder === null || Number.isNaN(parsedOrder)
              ? null
              : parsedOrder,
        }),
      }
    );

    const j = await res.json();

    if (j.ok) {
      setMessage("Brands menu settings saved.");
    } else {
      setMessage(j.error ?? "Something went wrong.");
    }

    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold">
        Brands Menu Settings
      </h2>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showInBrandsMenu}
            onChange={(e) =>
              setShowInBrandsMenu(e.target.checked)
            }
            className="h-4 w-4"
          />

          <span className="text-sm">
            Show this brand in Brands menu
          </span>
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Brands menu order
          </label>

          <input
            type="number"
            min={1}
            max={12}
            value={brandsMenuOrder}
            onChange={(e) =>
              setBrandsMenuOrder(e.target.value)
            }
            disabled={!showInBrandsMenu}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
            placeholder="e.g. 1"
          />

          <p className="mt-1 text-xs text-black/50">
            Lower numbers appear first. Up to 12 brands are
            displayed in the navigation.
          </p>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-xl bg-[#7B2D3E] px-4 py-2 text-sm text-white transition hover:bg-[#6a2435] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>

        {message ? (
          <div className="text-sm text-black/60">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}