"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomepageOrderControls({
  brandId,
  disabled = false,
}: {
  brandId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"up" | "down" | null>(null);

  async function move(direction: "up" | "down") {
    if (disabled) return;

    setLoading(direction);

    const res = await fetch(`/api/admin/brands/${brandId}/homepage/reorder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    const j = await res.json();

    setLoading(null);

    if (j.ok) {
      router.refresh();
    } else {
      alert(j.error ?? "Could not reorder brand.");
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={disabled || loading !== null}
        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
        title="Move up"
      >
        {loading === "up" ? "..." : "↑"}
      </button>

      <button
        type="button"
        onClick={() => move("down")}
        disabled={disabled || loading !== null}
        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
        title="Move down"
      >
        {loading === "down" ? "..." : "↓"}
      </button>
    </div>
  );
}