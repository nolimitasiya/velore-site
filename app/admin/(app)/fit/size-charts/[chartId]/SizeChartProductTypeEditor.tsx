"use client";

import { ProductType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PRODUCT_TYPES: Array<{
  value: ProductType;
  label: string;
}> = [
  { value: ProductType.ABAYA, label: "Abaya" },
  { value: ProductType.DRESS, label: "Dress" },
  { value: ProductType.SKIRT, label: "Skirt" },
  { value: ProductType.TOP, label: "Top" },
  { value: ProductType.HIJAB, label: "Hijab" },
  { value: ProductType.ACTIVEWEAR, label: "Activewear" },
  { value: ProductType.SETS, label: "Sets" },
  { value: ProductType.MATERNITY, label: "Maternity" },
  { value: ProductType.KHIMAR, label: "Khimar" },
  { value: ProductType.JILBAB, label: "Jilbab" },
  {
    value: ProductType.COATS_JACKETS,
    label: "Coats & Jackets",
  },
  {
    value: ProductType.HOODIE_SWEATSHIRT,
    label: "Hoodie & Sweatshirt",
  },
  { value: ProductType.PANTS, label: "Pants" },
  { value: ProductType.BLAZER, label: "Blazer" },
  { value: ProductType.T_SHIRT, label: "T-Shirt" },
  { value: ProductType.ACCESSORIES, label: "Accessories" },
];

type Props = {
  chartId: string;
  initialProductTypes: ProductType[];
};

export default function SizeChartProductTypeEditor({
  chartId,
  initialProductTypes,
}: Props) {
  const router = useRouter();

  const [selected, setSelected] = useState<ProductType[]>(
    initialProductTypes
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function toggle(productType: ProductType) {
    setSaved(false);
    setError("");

    setSelected((current) =>
      current.includes(productType)
        ? current.filter((item) => item !== productType)
        : [...current, productType]
    );
  }

  async function save() {
    if (selected.length === 0) {
      setError("Select at least one product type.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(
        `/api/admin/fit/size-charts/${chartId}/context`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productTypes: selected,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ?? "Unable to update product types."
        );
      }

      setSaved(true);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update product types."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">
        Product types
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRODUCT_TYPES.map((item) => {
          const active = selected.includes(item.value);

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => toggle(item.value)}
              disabled={saving}
              aria-pressed={active}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-[#7B2D3E] bg-[#7B2D3E] text-white"
                  : "border-black/10 bg-neutral-50 text-neutral-600 hover:border-[#7B2D3E]/40",
                saving ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || selected.length === 0}
          className="rounded-xl bg-[#7B2D3E] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#692535] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save product types"}
        </button>

        {saved ? (
          <span className="text-xs font-medium text-emerald-700">
            Saved
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 text-xs font-medium text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
}