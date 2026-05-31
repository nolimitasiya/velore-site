"use client";

import { useState } from "react";
import Image from "next/image";

type ContinentItem = {
  id: string;
  name: string;
  slug: string;
  region: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export default function ContinentsAdminClient({
  continents,
}: {
  continents: ContinentItem[];
}) {
  const [items, setItems] = useState(continents);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  function updateItem(
    id: string,
    patch: Partial<ContinentItem>
  ) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setMessageById((current) => ({ ...current, [id]: "" }));
  }

  async function saveItem(item: ContinentItem) {
    setSavingId(item.id);
    setMessageById((current) => ({ ...current, [item.id]: "" }));

    try {
      const res = await fetch(`/api/admin/continents/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: item.name,
          imageUrl: item.imageUrl,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save continent.");
      }

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                name: data.continent.name,
                imageUrl: data.continent.imageUrl,
                sortOrder: data.continent.sortOrder,
                isActive: data.continent.isActive,
              }
            : entry
        )
      );

      setMessageById((current) => ({
        ...current,
        [item.id]: "Saved successfully.",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      setMessageById((current) => ({
        ...current,
        [item.id]: message,
      }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {items.map((item) => {
        const isSaving = savingId === item.id;
        const hasImage = item.imageUrl.trim().length > 0;

        return (
          <section
  key={item.id}
  className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
>
            <div className="relative aspect-[3/2] w-full bg-neutral-100">
              {hasImage ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  No image
                </div>
              )}
            </div>

            <div className="space-y-5 p-5">
              <div>
  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
    {item.region}
  </div>
  <h2 className="mt-0.5 text-lg font-semibold text-neutral-950">
    {item.name}
  </h2>
  <div className="mt-1 text-xs text-neutral-400">
    {item.slug}
  </div>
</div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`name-${item.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Name
                  </label>
                  <input
                    id={`name-${item.id}`}
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, { name: e.target.value })
                    }
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`imageUrl-${item.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-800"
                  >
                    Image URL
                  </label>
                  <input
                    id={`imageUrl-${item.id}`}
                    type="text"
                    value={item.imageUrl}
                    onChange={(e) =>
                      updateItem(item.id, { imageUrl: e.target.value })
                    }
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`sortOrder-${item.id}`}
                      className="mb-1.5 block text-sm font-medium text-neutral-800"
                    >
                      Sort order
                    </label>
                    <input
                      id={`sortOrder-${item.id}`}
                      type="number"
                      value={item.sortOrder}
                      onChange={(e) =>
                        updateItem(item.id, {
                          sortOrder: Number(e.target.value || 0),
                        })
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50/80 px-4 py-3 text-sm font-medium text-neutral-800">
  <input
    type="checkbox"
    checked={item.isActive}
    onChange={(e) => updateItem(item.id, { isActive: e.target.checked })}
    className="h-4 w-4 accent-[#7B2D3E]"
  />
  Active
</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-500">
                  {messageById[item.id] || " "}
                </p>

                <button
                  type="button"
                  onClick={() => saveItem(item)}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}