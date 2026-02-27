"use client";

import { useRouter } from "next/navigation";

export default function BrandSwitcher({
  currentId,
  brands,
}: {
  currentId: string;
  brands: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="brandSwitch" className="text-xs text-black/60">
        Quick switch
      </label>
      <select
        id="brandSwitch"
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
        value={currentId}
        onChange={(e) => router.push(`/admin/brands/${e.target.value}`)}
        aria-label="Switch brand"
      >
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}